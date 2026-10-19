import { Injectable } from '@nestjs/common';
import { BillingCycle, CommunityPlanStatus, LeadStatus, ParishClaimStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { isPeriodOverdue, monthlyEquivalentCents } from '../plans/plan-rules';
import { tierPrice } from '../plans/plan-transitions';
import { ProductEventsService, saoPauloDay } from '../product-events/product-events.service';

const DAY_MS = 86_400_000;
/** Jobs sem execução nesta janela não aparecem (evita varrer o histórico inteiro de job_runs). */
export const JOBS_LOOKBACK_DAYS = 30;

export interface PlatformOverview {
  parishesManaged: number;
  claimsPending: number;
  leadsNew: number;
  plans: { trial: number; active: number; pastDue: number; suspended: number };
  mrrCents: number;
  trialsEndingIn7d: number;
  usage7d: { name: string; count: number; uniques: number }[];
  jobs: {
    name: string;
    lastStatus: string;
    lastStartedAt: Date;
    lastFinishedAt: Date | null;
    lastItems: number | null;
    lastError: string | null;
    errors24h: number;
  }[];
  enforcement30d: { total: number; byKind: { kind: string; mode: string; count: number }[] };
}

/**
 * Início do SYSTEM_ADMIN (ux-dashboards-24, saas-implantacao-16): números do
 * funil e da operação num só lugar. Nenhum dado pessoal.
 */
@Injectable()
export class PlatformOverviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productEvents: ProductEventsService,
  ) {}

  protected now(): Date {
    return new Date();
  }

  async overview(): Promise<PlatformOverview> {
    const now = this.now();
    const [parishesManaged, claimsPending, leadsNew, plans, mrrCents, trialsEndingIn7d, usage7d, jobs, enforcement30d] =
      await Promise.all([
        this.prisma.parish.count({ where: { managedAt: { not: null } } }),
        // PENDING e VERIFIED aguardam a aprovação do SYSTEM_ADMIN
        this.prisma.parishClaim.count({
          where: { status: { in: [ParishClaimStatus.PENDING, ParishClaimStatus.VERIFIED] } },
        }),
        this.prisma.lead.count({ where: { status: LeadStatus.NEW } }),
        this.planCounts(),
        this.mrr(now),
        this.prisma.communityPlan.count({
          where: { status: CommunityPlanStatus.TRIAL, trialEndsAt: { gt: now, lte: new Date(now.getTime() + 7 * DAY_MS) } },
        }),
        this.productEvents.totalsByName(7),
        this.jobs(now),
        this.enforcement(now),
      ]);
    return { parishesManaged, claimsPending, leadsNew, plans, mrrCents, trialsEndingIn7d, usage7d, jobs, enforcement30d };
  }

  private async planCounts() {
    const grouped = await this.prisma.communityPlan.groupBy({ by: ['status'], _count: { _all: true } });
    const by = new Map(grouped.map((g) => [g.status, g._count._all]));
    return {
      trial: by.get(CommunityPlanStatus.TRIAL) ?? 0,
      active: by.get(CommunityPlanStatus.ACTIVE) ?? 0,
      pastDue: by.get(CommunityPlanStatus.PAST_DUE) ?? 0,
      suspended: by.get(CommunityPlanStatus.SUSPENDED) ?? 0,
    };
  }

  /**
   * MRR = soma do equivalente mensal dos planos ACTIVE com o período em dia
   * (mesma regra do resumo de planos): `priceCents` combinado ou, sem ele, o
   * preço da faixa no ciclo; anual ÷ 12; piloto com priceCents 0 entra como 0.
   */
  private async mrr(now: Date): Promise<number> {
    const active = await this.prisma.communityPlan.findMany({
      where: { status: CommunityPlanStatus.ACTIVE },
      select: {
        status: true,
        priceCents: true,
        billingCycle: true,
        currentPeriodEnd: true,
        tier: { select: { monthlyPriceCents: true, yearlyPriceCents: true } },
      },
    });
    let total = 0;
    for (const plan of active) {
      if (isPeriodOverdue(plan, now)) continue;
      const cycle = plan.billingCycle ?? BillingCycle.MONTHLY;
      const price = plan.priceCents ?? (plan.tier ? tierPrice(plan.tier, cycle) : 0);
      total += monthlyEquivalentCents(price, cycle);
    }
    return total;
  }

  /** Última execução de cada job (JobRun gravado pelo runExclusiveJob) + erros nas últimas 24 h. */
  private async jobs(now: Date): Promise<PlatformOverview['jobs']> {
    const since = new Date(now.getTime() - JOBS_LOOKBACK_DAYS * DAY_MS);
    const [latest, errors] = await Promise.all([
      this.prisma.jobRun.groupBy({
        by: ['name'],
        // SKIPPED = outra réplica tinha a trava: não é o estado do job
        where: { startedAt: { gte: since }, status: { not: 'SKIPPED' } },
        _max: { startedAt: true },
      }),
      this.prisma.jobRun.groupBy({
        by: ['name'],
        where: { status: 'ERROR', startedAt: { gte: new Date(now.getTime() - DAY_MS) } },
        _count: { _all: true },
      }),
    ]);
    const pairs = latest
      .filter((l) => l._max.startedAt)
      .map((l) => ({ name: l.name, startedAt: l._max.startedAt as Date }));
    if (!pairs.length) return [];

    const runs = await this.prisma.jobRun.findMany({
      where: { OR: pairs },
      select: { name: true, status: true, startedAt: true, finishedAt: true, items: true, error: true },
      orderBy: { startedAt: 'desc' },
    });
    const errorsByName = new Map(errors.map((e) => [e.name, e._count._all]));
    const seen = new Set<string>();
    const result: PlatformOverview['jobs'] = [];
    for (const run of runs) {
      if (seen.has(run.name)) continue;
      seen.add(run.name);
      result.push({
        name: run.name,
        lastStatus: run.status,
        lastStartedAt: run.startedAt,
        lastFinishedAt: run.finishedAt ?? null,
        lastItems: run.items ?? null,
        lastError: run.error ? run.error.slice(0, 300) : null,
        errors24h: errorsByName.get(run.name) ?? 0,
      });
    }
    // Problemas primeiro, depois por nome
    return result.sort(
      (a, b) =>
        Number(b.lastStatus === 'ERROR') - Number(a.lastStatus === 'ERROR') ||
        b.errors24h - a.errors24h ||
        a.name.localeCompare(b.name),
    );
  }

  /**
   * O que os enforcements bloqueariam (log) ou bloquearam (on) em 30 dias —
   * mesma tabela e mesma janela (dia de São Paulo) do EnforcementReportService
   * (GET /platform/enforcement-hits traz o detalhe), aqui só o total por tipo.
   */
  private async enforcement(now: Date): Promise<PlatformOverview['enforcement30d']> {
    const since = new Date(`${saoPauloDay(now)}T00:00:00.000Z`);
    since.setUTCDate(since.getUTCDate() - 29);
    const grouped = await this.prisma.enforcementHit.groupBy({
      by: ['kind', 'mode'],
      where: { day: { gte: since } },
      _sum: { count: true },
    });
    const byKind = grouped
      .map((g) => ({ kind: g.kind, mode: g.mode, count: g._sum.count ?? 0 }))
      .sort((a, b) => b.count - a.count || a.kind.localeCompare(b.kind));
    return { total: byKind.reduce((sum, row) => sum + row.count, 0), byKind };
  }
}
