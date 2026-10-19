import { PlatformOverviewService } from './platform-overview.service';

describe('PlatformOverviewService — GET /platform/overview (contrato C4)', () => {
  const now = new Date('2026-10-19T15:00:00Z'); // 12h em São Paulo
  let prisma: any;
  let productEvents: any;
  let service: PlatformOverviewService;

  beforeEach(() => {
    prisma = {
      parish: { count: jest.fn().mockResolvedValue(3) },
      parishClaim: { count: jest.fn().mockResolvedValue(2) },
      lead: { count: jest.fn().mockResolvedValue(5) },
      communityPlan: {
        groupBy: jest.fn().mockResolvedValue([
          { status: 'TRIAL', _count: { _all: 4 } },
          { status: 'ACTIVE', _count: { _all: 6 } },
          { status: 'PAST_DUE', _count: { _all: 1 } },
          { status: 'FREE', _count: { _all: 9 } },
        ]),
        count: jest.fn().mockResolvedValue(2),
        findMany: jest.fn().mockResolvedValue([
          // mensal com preço combinado
          { status: 'ACTIVE', priceCents: 9900, billingCycle: 'MONTHLY', currentPeriodEnd: new Date('2026-11-01'), tier: { monthlyPriceCents: 4900, yearlyPriceCents: 49000 } },
          // anual pelo preço da faixa: 169000 / 12 = 14083
          { status: 'ACTIVE', priceCents: null, billingCycle: 'YEARLY', currentPeriodEnd: new Date('2027-06-01'), tier: { monthlyPriceCents: 16900, yearlyPriceCents: 169000 } },
          // piloto: ACTIVE sem prazo e preço 0
          { status: 'ACTIVE', priceCents: 0, billingCycle: null, currentPeriodEnd: null, tier: { monthlyPriceCents: 16900, yearlyPriceCents: 169000 } },
          // período vencido: fora do MRR
          { status: 'ACTIVE', priceCents: 4900, billingCycle: 'MONTHLY', currentPeriodEnd: new Date('2026-10-01'), tier: null },
          // sem ciclo e sem preço combinado: mensal da faixa
          { status: 'ACTIVE', priceCents: null, billingCycle: null, currentPeriodEnd: new Date('2026-11-10'), tier: { monthlyPriceCents: 4900, yearlyPriceCents: 49000 } },
        ]),
      },
      jobRun: {
        groupBy: jest.fn().mockImplementation(({ where }: any) =>
          where.status === 'ERROR'
            ? Promise.resolve([{ name: 'outbox', _count: { _all: 2 } }])
            : Promise.resolve([
                { name: 'plan-lifecycle', _max: { startedAt: new Date('2026-10-19T06:00:00Z') } },
                { name: 'outbox', _max: { startedAt: new Date('2026-10-19T14:59:45Z') } },
              ]),
        ),
        findMany: jest.fn().mockResolvedValue([
          { name: 'outbox', status: 'ERROR', startedAt: new Date('2026-10-19T14:59:45Z'), finishedAt: new Date('2026-10-19T14:59:46Z'), items: 0, error: 'Expo fora' },
          { name: 'plan-lifecycle', status: 'OK', startedAt: new Date('2026-10-19T06:00:00Z'), finishedAt: new Date('2026-10-19T06:00:03Z'), items: 12, error: null },
        ]),
      },
      enforcementHit: {
        groupBy: jest.fn().mockResolvedValue([
          { kind: 'PLAN_FEATURE', mode: 'log', _sum: { count: 7 } },
          { kind: 'TERMS', mode: 'log', _sum: { count: 3 } },
        ]),
      },
    };
    productEvents = { totalsByName: jest.fn().mockResolvedValue([{ name: 'app_open', count: 40, uniques: 12 }]) };
    service = new PlatformOverviewService(prisma, productEvents);
    jest.spyOn(service as any, 'now').mockReturnValue(now);
  });

  it('monta o contrato completo', async () => {
    const res = await service.overview();
    expect(res).toEqual({
      parishesManaged: 3,
      claimsPending: 2,
      leadsNew: 5,
      plans: { trial: 4, active: 6, pastDue: 1, suspended: 0 },
      mrrCents: 9900 + 14083 + 0 + 4900,
      trialsEndingIn7d: 2,
      usage7d: [{ name: 'app_open', count: 40, uniques: 12 }],
      jobs: [
        {
          name: 'outbox',
          lastStatus: 'ERROR',
          lastStartedAt: new Date('2026-10-19T14:59:45Z'),
          lastFinishedAt: new Date('2026-10-19T14:59:46Z'),
          lastItems: 0,
          lastError: 'Expo fora',
          errors24h: 2,
        },
        {
          name: 'plan-lifecycle',
          lastStatus: 'OK',
          lastStartedAt: new Date('2026-10-19T06:00:00Z'),
          lastFinishedAt: new Date('2026-10-19T06:00:03Z'),
          lastItems: 12,
          lastError: null,
          errors24h: 0,
        },
      ],
      enforcement30d: {
        total: 10,
        byKind: [
          { kind: 'PLAN_FEATURE', mode: 'log', count: 7 },
          { kind: 'TERMS', mode: 'log', count: 3 },
        ],
      },
    });
  });

  it('filtros: paróquias geridas, reivindicações aguardando, leads NEW, testes em 7 dias, uso 7 dias, enforcement 30 dias', async () => {
    await service.overview();
    expect(prisma.parish.count.mock.calls[0][0].where).toEqual({ managedAt: { not: null } });
    expect(prisma.parishClaim.count.mock.calls[0][0].where).toEqual({ status: { in: ['PENDING', 'VERIFIED'] } });
    expect(prisma.lead.count.mock.calls[0][0].where).toEqual({ status: 'NEW' });
    const trialWhere = prisma.communityPlan.count.mock.calls[0][0].where;
    expect(trialWhere.status).toBe('TRIAL');
    expect(trialWhere.trialEndsAt.lte.toISOString()).toBe('2026-10-26T15:00:00.000Z');
    expect(prisma.communityPlan.findMany.mock.calls[0][0].where).toEqual({ status: 'ACTIVE' });
    expect(productEvents.totalsByName).toHaveBeenCalledWith(7);
    expect(prisma.enforcementHit.groupBy.mock.calls[0][0].where.day.gte.toISOString()).toBe('2026-09-20T00:00:00.000Z');
    // Última execução de cada job pelo par (nome, início mais recente)
    expect(prisma.jobRun.findMany.mock.calls[0][0].where.OR).toHaveLength(2);
  });

  it('sem execuções de job: lista vazia sem segunda consulta', async () => {
    prisma.jobRun.groupBy.mockResolvedValue([]);
    const res = await service.overview();
    expect(res.jobs).toEqual([]);
    expect(prisma.jobRun.findMany).not.toHaveBeenCalled();
  });
});
