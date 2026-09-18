import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * Mapa do território (painel do SYSTEM_ADMIN).
 *
 * São mais de 50 mil comunidades, então nada aqui devolve a base inteira: o
 * mapa pede por retângulo visível (bbox) com teto de linhas, e os painéis de
 * resumo vêm de agregações no banco.
 *
 * Classificação do pino, que é o que o painel existe para resolver:
 *   `ok`   — coordenada própria;
 *   `dup`  — coordenada IDÊNTICA à de outra comunidade. Quase sempre é o
 *            "centro da cidade" que o geocodificador devolve quando não acha o
 *            endereço: o pino existe, mas não aponta para a igreja;
 *   `sem`  — sem coordenada nenhuma.
 */
export type PinKind = 'ok' | 'dup' | 'sem';

export interface MapRow {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  city: string;
  state: string;
  address: string | null;
  parish: string;
  diocese: string;
  kind: PinKind;
}

interface MapQuery {
  uf?: string;
  dioceseId?: string;
  parishId?: string;
  pin?: PinKind | 'todos';
  q?: string;
  bbox?: string;
  limit?: number;
}

const LIMITE_PADRAO = 3000;
const LIMITE_MAXIMO = 10000;

@Injectable()
export class CommunitiesMapService {
  constructor(private prisma: PrismaService) {}

  /** Retângulo "sul,oeste,norte,leste" — devolve null quando ausente ou inválido. */
  private parseBbox(bbox?: string) {
    if (!bbox) return null;
    const p = bbox.split(',').map((n) => Number(n.trim()));
    if (p.length !== 4 || p.some((n) => !Number.isFinite(n))) return null;
    const [sul, oeste, norte, leste] = p;
    if (sul > norte || oeste > leste) return null;
    return { sul, oeste, norte, leste };
  }

  /**
   * Comunidades para desenhar no mapa. `sem` coordenada só aparece quando o
   * filtro pede — senão não haveria onde desenhá-las.
   */
  async list(query: MapQuery): Promise<{ rows: MapRow[]; truncated: boolean; limit: number }> {
    const limit = Math.min(Math.max(Number(query.limit) || LIMITE_PADRAO, 1), LIMITE_MAXIMO);
    const box = this.parseBbox(query.bbox);
    const pin = query.pin ?? 'todos';

    const where: string[] = ['c."deletedAt" IS NULL'];
    const params: any[] = [];
    const add = (sql: string, value: any) => { params.push(value); where.push(sql.replace('?', `$${params.length}`)); };

    if (query.uf) add('c.state = ?', query.uf.toUpperCase());
    if (query.dioceseId) add('d.id = ?', query.dioceseId);
    if (query.parishId) add('c."parishId" = ?', query.parishId);
    if (query.q?.trim()) {
      params.push(`%${query.q.trim()}%`);
      const i = params.length;
      where.push(`(c.name ILIKE $${i} OR c.city ILIKE $${i} OR p.name ILIKE $${i})`);
    }
    if (pin === 'sem') where.push('c.latitude IS NULL');
    else if (pin === 'ok' || pin === 'dup') where.push('c.latitude IS NOT NULL');
    else if (box) where.push('c.latitude IS NOT NULL');

    if (box && pin !== 'sem') {
      params.push(box.sul, box.norte, box.oeste, box.leste);
      const n = params.length;
      where.push(`c.latitude BETWEEN $${n - 3} AND $${n - 2} AND c.longitude BETWEEN $${n - 1} AND $${n}`);
    }

    params.push(limit + 1);
    const sql = `
      WITH dup AS (
        SELECT latitude, longitude FROM communities
        WHERE "deletedAt" IS NULL AND latitude IS NOT NULL
        GROUP BY latitude, longitude HAVING count(*) > 1
      )
      SELECT c.id, c.name, c.latitude AS lat, c.longitude AS lng, c.city, c.state, c.address,
             p.name AS parish, d.name AS diocese,
             CASE WHEN c.latitude IS NULL THEN 'sem'
                  WHEN dd.latitude IS NOT NULL THEN 'dup'
                  ELSE 'ok' END AS kind
      FROM communities c
      JOIN parishes p ON p.id = c."parishId"
      JOIN dioceses d ON d.id = p."dioceseId"
      LEFT JOIN dup dd ON dd.latitude = c.latitude AND dd.longitude = c.longitude
      WHERE ${where.join(' AND ')}
      ${pin === 'ok' ? 'AND dd.latitude IS NULL' : ''}
      ${pin === 'dup' ? 'AND dd.latitude IS NOT NULL' : ''}
      ORDER BY c.name
      LIMIT $${params.length}
    `;
    const rows = await this.prisma.$queryRawUnsafe<MapRow[]>(sql, ...params);
    const truncated = rows.length > limit;
    return { rows: truncated ? rows.slice(0, limit) : rows, truncated, limit };
  }

  /** Contadores do painel: total do país e por UF, com a fila de pinos a revisar. */
  async stats(uf?: string) {
    const [totais] = await this.prisma.$queryRawUnsafe<any[]>(`
      WITH dup AS (
        SELECT latitude, longitude FROM communities
        WHERE "deletedAt" IS NULL AND latitude IS NOT NULL
        GROUP BY latitude, longitude HAVING count(*) > 1
      )
      SELECT count(*)::int AS total,
             count(*) FILTER (WHERE c.latitude IS NULL)::int AS sem,
             count(*) FILTER (WHERE c.latitude IS NOT NULL AND dd.latitude IS NOT NULL)::int AS dup,
             count(*) FILTER (WHERE c.latitude IS NOT NULL AND dd.latitude IS NULL)::int AS ok
      FROM communities c
      LEFT JOIN dup dd ON dd.latitude = c.latitude AND dd.longitude = c.longitude
      WHERE c."deletedAt" IS NULL ${uf ? 'AND c.state = $1' : ''}
    `, ...(uf ? [uf.toUpperCase()] : []));

    const porUf = await this.prisma.$queryRawUnsafe<any[]>(`
      WITH dup AS (
        SELECT latitude, longitude FROM communities
        WHERE "deletedAt" IS NULL AND latitude IS NOT NULL
        GROUP BY latitude, longitude HAVING count(*) > 1
      )
      SELECT c.state AS uf, count(*)::int AS total,
             count(*) FILTER (WHERE c.latitude IS NULL)::int AS sem,
             count(*) FILTER (WHERE c.latitude IS NOT NULL AND dd.latitude IS NOT NULL)::int AS dup
      FROM communities c
      LEFT JOIN dup dd ON dd.latitude = c.latitude AND dd.longitude = c.longitude
      WHERE c."deletedAt" IS NULL
      GROUP BY c.state ORDER BY c.state
    `);

    const [paroquias, dioceses] = await Promise.all([
      this.prisma.parish.count(),
      this.prisma.diocese.count(),
    ]);

    return { ...totais, paroquias, dioceses, porUf };
  }

  /** Dioceses para o filtro (só as que têm comunidade), com a contagem de pendências. */
  async dioceses(uf?: string) {
    return this.prisma.$queryRawUnsafe<any[]>(`
      WITH dup AS (
        SELECT latitude, longitude FROM communities
        WHERE "deletedAt" IS NULL AND latitude IS NOT NULL
        GROUP BY latitude, longitude HAVING count(*) > 1
      )
      SELECT d.id, d.name, d.state AS uf, count(c.id)::int AS total,
             count(c.id) FILTER (WHERE c.latitude IS NULL)::int AS sem,
             count(c.id) FILTER (WHERE c.latitude IS NOT NULL AND dd.latitude IS NOT NULL)::int AS dup
      FROM dioceses d
      JOIN parishes p ON p."dioceseId" = d.id
      JOIN communities c ON c."parishId" = p.id
      LEFT JOIN dup dd ON dd.latitude = c.latitude AND dd.longitude = c.longitude
      WHERE c."deletedAt" IS NULL ${uf ? 'AND d.state = $1' : ''}
      GROUP BY d.id, d.name, d.state
      ORDER BY d.name
    `, ...(uf ? [uf.toUpperCase()] : []));
  }
}
