import { EnforcementReportService } from './enforcement-report.service';
import { PlatformController } from './plans.controller';

describe('EnforcementReportService — GET /platform/enforcement-hits (contrato 6)', () => {
  let prisma: any;
  let service: EnforcementReportService;

  beforeEach(() => {
    prisma = {
      enforcementHit: {
        groupBy: jest.fn().mockResolvedValue([
          { kind: 'PLAN_FEATURE', feature: 'catechesis', mode: 'log', _sum: { count: 7 } },
          { kind: 'PLAN_MEMBER_LIMIT', feature: '', mode: 'log', _sum: { count: 2 } },
        ]),
        findMany: jest.fn().mockResolvedValue([
          { day: new Date('2026-10-19T00:00:00Z'), kind: 'PLAN_FEATURE', feature: 'catechesis', communityId: 'c1', mode: 'log', count: 5 },
          { day: new Date('2026-10-18T00:00:00Z'), kind: 'PLAN_FEATURE', feature: 'catechesis', communityId: 'c1', mode: 'log', count: 2 },
          { day: new Date('2026-10-18T00:00:00Z'), kind: 'TERMS', feature: '', communityId: '', mode: 'log', count: 3 },
        ]),
      },
      community: { findMany: jest.fn().mockResolvedValue([{ id: 'c1', name: 'Capela São José' }]) },
    };
    service = new EnforcementReportService(prisma);
    jest.spyOn(service as any, 'today').mockReturnValue('2026-10-19');
  });

  it('formato do contrato: totais por tipo/feature/modo e linhas por dia (desc) com o nome da comunidade', async () => {
    const res = await service.report(30);
    expect(res).toEqual({
      days: 30,
      totals: [
        { kind: 'PLAN_FEATURE', feature: 'catechesis', mode: 'log', count: 7 },
        { kind: 'PLAN_MEMBER_LIMIT', feature: '', mode: 'log', count: 2 },
      ],
      rows: [
        { day: '2026-10-19', kind: 'PLAN_FEATURE', feature: 'catechesis', communityId: 'c1', communityName: 'Capela São José', mode: 'log', count: 5 },
        { day: '2026-10-18', kind: 'PLAN_FEATURE', feature: 'catechesis', communityId: 'c1', communityName: 'Capela São José', mode: 'log', count: 2 },
        { day: '2026-10-18', kind: 'TERMS', feature: '', communityId: null, communityName: null, mode: 'log', count: 3 },
      ],
    });
    // Janela de 30 dias contando hoje (fuso de São Paulo) e ordem por dia desc
    const where = prisma.enforcementHit.findMany.mock.calls[0][0].where;
    expect(where.day.gte.toISOString()).toBe('2026-09-20T00:00:00.000Z');
    expect(prisma.enforcementHit.findMany.mock.calls[0][0].orderBy[0]).toEqual({ day: 'desc' });
    expect(prisma.community.findMany.mock.calls[0][0].where).toEqual({ id: { in: ['c1'] } });
  });

  it('days: padrão 30, limitado a 1..180', () => {
    expect(EnforcementReportService.clampDays(undefined)).toBe(30);
    expect(EnforcementReportService.clampDays(0)).toBe(1);
    expect(EnforcementReportService.clampDays(9999)).toBe(180);
  });

  it('sem comunidade nas linhas: não consulta comunidades', async () => {
    prisma.enforcementHit.findMany.mockResolvedValue([]);
    prisma.enforcementHit.groupBy.mockResolvedValue([]);
    await expect(service.report(7)).resolves.toEqual({ days: 7, totals: [], rows: [] });
    expect(prisma.community.findMany).not.toHaveBeenCalled();
  });

  it('rota fica no PlatformController (SYSTEM_ADMIN, como as demais /platform)', async () => {
    const controller = new PlatformController({} as any, {} as any, service);
    const spy = jest.spyOn(service, 'report').mockResolvedValue({ days: 15, totals: [], rows: [] });
    await controller.enforcementHits('15');
    expect(spy).toHaveBeenCalledWith(15);
    await controller.enforcementHits(undefined);
    expect(spy).toHaveBeenLastCalledWith(undefined);
  });
});
