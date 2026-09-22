import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * Fila de revisão dos pinos (painel do SYSTEM_ADMIN).
 *
 * As cargas automáticas (prisma/geocode-fontes.ts, geocode-enderecos.ts) só gravam o
 * que passa nas regras. O resto — fontes em conflito, fonte única recusada, templo
 * disputado, endereço que desmente o pino atual — não é lixo: é uma coordenada
 * candidata que só precisa de um par de olhos e da imagem de satélite. Aqui ela vira
 * uma sugestão que a pessoa confirma ou descarta com um clique.
 *
 * Confirmar = o pino passa a ser MANUAL (conferido por gente), e as outras sugestões
 * da mesma comunidade se encerram. Descartar fica guardado, para a mesma sugestão não
 * voltar na próxima carga.
 */

export interface ReviewCandidate {
  id: string;
  lat: number;
  lng: number;
  source: string;
  reason: string;
  label: string | null;
  detail: string | null;
  /** Distância até o pino atual da comunidade, em km (nulo se ela não tem pino). */
  distanceKm: number | null;
}

export interface ReviewRow {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  city: string;
  state: string;
  address: string | null;
  parish: string;
  diocese: string;
  kind: 'ok' | 'local' | 'dup' | 'sem';
  source: string | null;
  hasMass: boolean;
  candidates: ReviewCandidate[];
}

interface QueueQuery {
  uf?: string;
  dioceseId?: string;
  onlyWithMass?: boolean;
  limit?: number;
  offset?: number;
}

const LIMITE_PADRAO = 100;
const LIMITE_MAXIMO = 500;

const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) =>
  Math.hypot((a.lat - b.lat) * 111.2, (a.lng - b.lng) * 111.2 * Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180));

@Injectable()
export class CommunitiesReviewService {
  constructor(private prisma: PrismaService) {}

  private toCandidate(c: any, pin: { lat: number | null; lng: number | null }): ReviewCandidate {
    return {
      id: c.id,
      lat: c.latitude,
      lng: c.longitude,
      source: c.source,
      reason: c.reason,
      label: c.label,
      detail: c.detail,
      distanceKm:
        pin.lat != null && pin.lng != null
          ? Number(km({ lat: pin.lat, lng: pin.lng }, { lat: c.latitude, lng: c.longitude }).toFixed(2))
          : null,
    };
  }

  /**
   * A fila, por IMPACTO: primeiro quem tem missa cadastrada (é quem aparece no
   * "missas por perto"), depois o resto; dentro de cada grupo, por estado e nome,
   * para a pessoa varrer uma região de cada vez.
   */
  async queue(query: QueueQuery): Promise<{ total: number; withMass: number; rows: ReviewRow[] }> {
    const limit = Math.min(Math.max(Number(query.limit) || LIMITE_PADRAO, 1), LIMITE_MAXIMO);
    const offset = Math.max(Number(query.offset) || 0, 0);

    const where: string[] = [
      'c."deletedAt" IS NULL',
      `EXISTS (SELECT 1 FROM community_geo_candidates g WHERE g."communityId" = c.id AND g.status = 'PENDING')`,
    ];
    const params: any[] = [];
    const add = (sql: string, value: any) => { params.push(value); where.push(sql.replace('?', `$${params.length}`)); };
    if (query.uf) add('c.state = ?', query.uf.toUpperCase());
    if (query.dioceseId) add('d.id = ?', query.dioceseId);
    const temMissa = 'EXISTS (SELECT 1 FROM mass_schedules m WHERE m."communityId" = c.id)';
    if (query.onlyWithMass) where.push(temMissa);

    const base = `
      FROM communities c
      JOIN parishes p ON p.id = c."parishId"
      JOIN dioceses d ON d.id = p."dioceseId"
      WHERE ${where.join(' AND ')}
    `;
    const [totais] = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT count(*)::int AS total, count(*) FILTER (WHERE ${temMissa})::int AS "withMass" ${base}`,
      ...params,
    );

    const linhas = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT c.id, c.name, c.latitude AS lat, c.longitude AS lng, c.city, c.state, c.address,
              p.name AS parish, d.name AS diocese, c."geoSource" AS source, c."geoPrecision" AS precision,
              ${temMissa} AS "hasMass"
       ${base}
       ORDER BY "hasMass" DESC, c.state, c.city, c.name
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      ...params,
      limit,
      offset,
    );
    if (!linhas.length) return { total: totais?.total ?? 0, withMass: totais?.withMass ?? 0, rows: [] };

    const candidatos = await this.prisma.communityGeoCandidate.findMany({
      where: { communityId: { in: linhas.map((l) => l.id) }, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });
    const porComunidade = new Map<string, any[]>();
    for (const c of candidatos) {
      if (!porComunidade.has(c.communityId)) porComunidade.set(c.communityId, []);
      porComunidade.get(c.communityId)!.push(c);
    }

    const rows: ReviewRow[] = linhas.map((l) => ({
      id: l.id,
      name: l.name,
      lat: l.lat,
      lng: l.lng,
      city: l.city,
      state: l.state,
      address: l.address,
      parish: l.parish,
      diocese: l.diocese,
      kind: l.lat == null ? 'sem' : l.precision === 'LOCALITY' ? 'local' : l.precision === 'CITY' ? 'dup' : 'ok',
      source: l.source,
      hasMass: l.hasMass,
      candidates: (porComunidade.get(l.id) ?? []).map((c) => this.toCandidate(c, l)),
    }));
    return { total: totais?.total ?? 0, withMass: totais?.withMass ?? 0, rows };
  }

  /** Sugestões pendentes de UMA comunidade — para o editor, quando ela é aberta pelo mapa. */
  async forCommunity(communityId: string): Promise<ReviewCandidate[]> {
    const comunidade = await this.prisma.community.findUnique({
      where: { id: communityId },
      select: { latitude: true, longitude: true },
    });
    if (!comunidade) throw new NotFoundException('Comunidade não encontrada');
    const candidatos = await this.prisma.communityGeoCandidate.findMany({
      where: { communityId, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });
    return candidatos.map((c) => this.toCandidate(c, { lat: comunidade.latitude, lng: comunidade.longitude }));
  }

  /** Quantas comunidades têm sugestão à espera (para o painel). */
  async pendingCount(): Promise<number> {
    const [r] = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT count(DISTINCT g."communityId")::int AS n
       FROM community_geo_candidates g JOIN communities c ON c.id = g."communityId"
       WHERE g.status = 'PENDING' AND c."deletedAt" IS NULL`,
    );
    return r?.n ?? 0;
  }

  /**
   * Confirma a sugestão: ela vira o pino da comunidade, agora MANUAL (conferido por
   * gente), e as outras pendentes da mesma comunidade se encerram. Tudo numa transação.
   */
  async accept(candidateId: string, userId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const candidato = await tx.communityGeoCandidate.findUnique({ where: { id: candidateId } });
      if (!candidato) throw new NotFoundException('Sugestão não encontrada');
      if (candidato.status !== 'PENDING') throw new ConflictException('Esta sugestão já foi resolvida');

      const agora = new Date();
      // updateMany com o status na condição: duas pessoas clicando juntas não confirmam duas vezes
      const marcou = await tx.communityGeoCandidate.updateMany({
        where: { id: candidateId, status: 'PENDING' },
        data: { status: 'ACCEPTED', resolvedAt: agora, resolvedByUserId: userId ?? null },
      });
      if (marcou.count !== 1) throw new ConflictException('Esta sugestão já foi resolvida');

      await tx.communityGeoCandidate.updateMany({
        where: { communityId: candidato.communityId, status: 'PENDING' },
        data: { status: 'SUPERSEDED', resolvedAt: agora, resolvedByUserId: userId ?? null },
      });
      const comunidade = await tx.community.update({
        where: { id: candidato.communityId },
        data: { latitude: candidato.latitude, longitude: candidato.longitude, geoPrecision: 'MANUAL', geoSource: 'manual', geoVerifiedAt: agora, geoVerifiedBy: userId ? `usuario:${userId}` : 'usuario' },
        select: { id: true, latitude: true, longitude: true, geoPrecision: true, geoSource: true },
      });
      return { community: comunidade, candidateId };
    });
  }

  /** Descarta a sugestão. Fica guardada como REJECTED, e a carga seguinte não a traz de volta. */
  async reject(candidateId: string, userId?: string) {
    const marcou = await this.prisma.communityGeoCandidate.updateMany({
      where: { id: candidateId, status: 'PENDING' },
      data: { status: 'REJECTED', resolvedAt: new Date(), resolvedByUserId: userId ?? null },
    });
    if (marcou.count !== 1) {
      const existe = await this.prisma.communityGeoCandidate.findUnique({ where: { id: candidateId }, select: { id: true } });
      if (!existe) throw new NotFoundException('Sugestão não encontrada');
      throw new ConflictException('Esta sugestão já foi resolvida');
    }
    return { candidateId, status: 'REJECTED' };
  }
}
