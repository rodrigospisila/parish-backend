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
 *   `ok`    — na porta: posto por gente, templo casado numa base aberta ou
 *             endereço com número no Censo;
 *   `rua`   — nível de RUA: veio do CEP ou do endereço no Nominatim, que devolvem o
 *             meio do logradouro. Certo na vizinhança, a quadras da porta. Vale para o
 *             "missas por perto", mas não se passa por conferido;
 *   `local` — centro do povoado, distrito ou bairro (precisão LOCALITY);
 *   `dup`   — aproximado: centro do município (CITY), ou pino LEGADO empilhado na
 *             mesma coordenada de outro (o "centro da cidade" de um geocodificador
 *             antigo). Pino novo repetido NÃO é aproximado: é a mesma igreja cadastrada
 *             duas vezes;
 *   `sem`   — sem coordenada nenhuma.
 */
export type PinKind = 'ok' | 'rua' | 'local' | 'dup' | 'sem';

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
  source: string | null;
  /** Tem sugestão de pino à espera na fila de revisão. */
  review: boolean;
  /** Quando e por quem/o quê o pino foi conferido (nulo = palpite de máquina). */
  verifiedAt: Date | null;
  verifiedBy: string | null;
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

// As mesmas condições servem à lista, aos totais, ao quadro por UF e ao das dioceses.
// (COALESCE porque `"geoPrecision" = 'CITY'` é NULL no pino legado, e NULL contamina o NOT.)
const LEGADO_EMPILHADO = `(c."geoPrecision" IS NULL AND dd.latitude IS NOT NULL)`;
const APROXIMADO = `(COALESCE(c."geoPrecision" = 'CITY', FALSE) OR ${LEGADO_EMPILHADO})`;
const NO_POVOADO = `COALESCE(c."geoPrecision" = 'LOCALITY', FALSE)`;
const PRECISO = `(c.latitude IS NOT NULL AND NOT ${NO_POVOADO} AND NOT ${APROXIMADO})`;
const DE_RUA = `COALESCE(c."geoSource" IN ('cep', 'osm-endereco'), FALSE)`;
const DUP_CTE = `
  WITH dup AS (
    SELECT latitude, longitude FROM communities
    WHERE "deletedAt" IS NULL AND latitude IS NOT NULL AND "geoPrecision" IS NULL
    GROUP BY latitude, longitude HAVING count(*) > 1
  )`;
const CONTADORES = `
  count(c.id) FILTER (WHERE c.latitude IS NULL)::int AS sem,
  count(c.id) FILTER (WHERE c.latitude IS NOT NULL AND ${NO_POVOADO})::int AS local,
  count(c.id) FILTER (WHERE c.latitude IS NOT NULL AND NOT ${NO_POVOADO} AND ${APROXIMADO})::int AS dup,
  count(c.id) FILTER (WHERE ${PRECISO} AND ${DE_RUA})::int AS rua,
  count(c.id) FILTER (WHERE ${PRECISO} AND NOT ${DE_RUA})::int AS ok`;

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
    else if (pin !== 'todos' || box) where.push('c.latitude IS NOT NULL');
    if (pin === 'ok') where.push(`${PRECISO} AND NOT ${DE_RUA}`);
    if (pin === 'rua') where.push(`${PRECISO} AND ${DE_RUA}`);
    if (pin === 'local') where.push(NO_POVOADO);
    if (pin === 'dup') where.push(`NOT ${NO_POVOADO} AND ${APROXIMADO}`);

    if (box && pin !== 'sem') {
      params.push(box.sul, box.norte, box.oeste, box.leste);
      const n = params.length;
      where.push(`c.latitude BETWEEN $${n - 3} AND $${n - 2} AND c.longitude BETWEEN $${n - 1} AND $${n}`);
    }

    params.push(limit + 1);
    const sql = `
      ${DUP_CTE}
      SELECT c.id, c.name, c.latitude AS lat, c.longitude AS lng, c.city, c.state, c.address,
             p.name AS parish, d.name AS diocese,
             c."geoSource" AS source, c."geoVerifiedAt" AS "verifiedAt", c."geoVerifiedBy" AS "verifiedBy",
             EXISTS (SELECT 1 FROM community_geo_candidates g WHERE g."communityId" = c.id AND g.status = 'PENDING') AS review,
             CASE WHEN c.latitude IS NULL THEN 'sem'
                  WHEN ${NO_POVOADO} THEN 'local'
                  WHEN ${APROXIMADO} THEN 'dup'
                  WHEN ${DE_RUA} THEN 'rua'
                  ELSE 'ok' END AS kind
      FROM communities c
      JOIN parishes p ON p.id = c."parishId"
      JOIN dioceses d ON d.id = p."dioceseId"
      LEFT JOIN dup dd ON dd.latitude = c.latitude AND dd.longitude = c.longitude
      WHERE ${where.join(' AND ')}
      ORDER BY c.name
      LIMIT $${params.length}
    `;
    const rows = await this.prisma.$queryRawUnsafe<MapRow[]>(sql, ...params);
    const truncated = rows.length > limit;
    return { rows: truncated ? rows.slice(0, limit) : rows, truncated, limit };
  }

  /** Contadores do painel: total do país e por UF. */
  async stats(uf?: string) {
    const [totais] = await this.prisma.$queryRawUnsafe<any[]>(`
      ${DUP_CTE}
      SELECT count(c.id)::int AS total, ${CONTADORES}
      FROM communities c
      LEFT JOIN dup dd ON dd.latitude = c.latitude AND dd.longitude = c.longitude
      WHERE c."deletedAt" IS NULL ${uf ? 'AND c.state = $1' : ''}
    `, ...(uf ? [uf.toUpperCase()] : []));

    const porUf = await this.prisma.$queryRawUnsafe<any[]>(`
      ${DUP_CTE}
      SELECT c.state AS uf, count(c.id)::int AS total, ${CONTADORES}
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
      ${DUP_CTE}
      SELECT d.id, d.name, d.state AS uf, count(c.id)::int AS total, ${CONTADORES}
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
