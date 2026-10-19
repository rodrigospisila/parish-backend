import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export const ENFORCEMENT_DAYS_DEFAULT = 30;
export const ENFORCEMENT_DAYS_MAX = 180;
/** Teto de linhas por dia/tipo/feature/comunidade devolvidas (os totais contam tudo). */
export const ENFORCEMENT_ROWS_MAX = 2000;

export interface EnforcementHitsReport {
  days: number;
  totals: { kind: string; feature: string; mode: string; count: number }[];
  rows: {
    day: string; // YYYY-MM-DD (America/Sao_Paulo)
    kind: string;
    feature: string;
    communityId: string | null;
    communityName: string | null;
    mode: string;
    count: number;
  }[];
}

/**
 * Leitura das contagens do EnforcementHitsService (`enforcement_hits`) para o
 * painel da Plataforma: o que PLAN/TERMS/PASSWORD_CHANGE bloqueariam (log) ou
 * bloquearam (on) — base para decidir ligar o `on`. Sem dado pessoal: só
 * contagem por dia, tipo, feature e comunidade.
 */
@Injectable()
export class EnforcementReportService {
  constructor(private readonly prisma: PrismaService) {}

  static clampDays(days?: number): number {
    const d = Number.isFinite(days as number) ? Math.trunc(days as number) : ENFORCEMENT_DAYS_DEFAULT;
    return Math.min(Math.max(d, 1), ENFORCEMENT_DAYS_MAX);
  }

  /** Hoje no fuso de São Paulo (mesmo dia gravado pelo EnforcementHitsService). */
  protected today(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  }

  async report(daysParam?: number): Promise<EnforcementHitsReport> {
    const days = EnforcementReportService.clampDays(daysParam);
    const since = new Date(`${this.today()}T00:00:00.000Z`);
    since.setUTCDate(since.getUTCDate() - (days - 1));
    const where = { day: { gte: since } };

    const [grouped, hits] = await Promise.all([
      this.prisma.enforcementHit.groupBy({
        by: ['kind', 'feature', 'mode'],
        where,
        _sum: { count: true },
      }),
      this.prisma.enforcementHit.findMany({
        where,
        select: { day: true, kind: true, feature: true, communityId: true, mode: true, count: true },
        orderBy: [{ day: 'desc' }, { count: 'desc' }],
        take: ENFORCEMENT_ROWS_MAX,
      }),
    ]);

    const communityIds = [...new Set(hits.map((h) => h.communityId).filter((id) => !!id))];
    const communities = communityIds.length
      ? await this.prisma.community.findMany({ where: { id: { in: communityIds } }, select: { id: true, name: true } })
      : [];
    const names = new Map(communities.map((c) => [c.id, c.name]));

    return {
      days,
      totals: grouped
        .map((g) => ({ kind: g.kind, feature: g.feature, mode: g.mode, count: g._sum.count ?? 0 }))
        .sort((a, b) => b.count - a.count || a.kind.localeCompare(b.kind) || a.feature.localeCompare(b.feature)),
      rows: hits.map((h) => ({
        day: h.day.toISOString().slice(0, 10),
        kind: h.kind,
        feature: h.feature,
        communityId: h.communityId || null,
        communityName: h.communityId ? names.get(h.communityId) ?? null : null,
        mode: h.mode,
        count: h.count,
      })),
    };
  }
}
