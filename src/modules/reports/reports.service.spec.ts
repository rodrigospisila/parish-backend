import { UserRole } from '@prisma/client';
import { ReportsService } from './reports.service';
import { HierarchyService } from '../../common/hierarchy.service';

/** Revisão da onda 1: sem escopo no cadastro, os agregados de pastorais caíam no país inteiro. */
describe('ReportsService.getPastoralOverview — escopo dos agregados', () => {
  let service: ReportsService;
  let prisma: any;

  const user = (role: UserRole, over: Record<string, unknown> = {}) => ({ id: `u-${role}`, role, ...over }) as any;

  beforeEach(() => {
    prisma = {
      member: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      communityPastoral: { findMany: jest.fn().mockResolvedValue([]) },
      scheduleAssignment: { groupBy: jest.fn().mockResolvedValue([]) },
    };
    service = new ReportsService(prisma, new HierarchyService(prisma), {} as any);
  });

  const pastoralWhere = () => prisma.communityPastoral.findMany.mock.calls[0][0].where;

  it('sem escopo (diocesano sem diocese, pároco sem paróquia, coordenador sem comunidade): nada de pastorais', async () => {
    for (const u of [
      user(UserRole.DIOCESAN_ADMIN),
      user(UserRole.PARISH_ADMIN),
      user(UserRole.COMMUNITY_COORDINATOR),
      user(UserRole.FAITHFUL, { parishId: 'p1' }),
    ]) {
      const res = await service.getPastoralOverview(u);
      expect(res.agentsByPastoral).toEqual([]);
    }
    expect(prisma.communityPastoral.findMany).not.toHaveBeenCalled();
  });

  it('pároco: pastorais da paróquia inteira (mesmo com comunidade de fé no cadastro)', async () => {
    await service.getPastoralOverview(user(UserRole.PARISH_ADMIN, { parishId: 'p1', communityId: 'c9' }));
    expect(pastoralWhere()).toEqual({ community: { parishId: 'p1' }, deletedAt: null });
  });

  it('diocese, coordenação e plataforma: cada uma no seu escopo', async () => {
    await service.getPastoralOverview(user(UserRole.DIOCESAN_ADMIN, { dioceseId: 'd1' }));
    expect(pastoralWhere()).toEqual({ community: { parish: { dioceseId: 'd1' } }, deletedAt: null });

    prisma.communityPastoral.findMany.mockClear();
    await service.getPastoralOverview(user(UserRole.COMMUNITY_COORDINATOR, { communityId: 'c1', parishId: 'p1' }));
    expect(pastoralWhere()).toEqual({ communityId: 'c1', deletedAt: null });

    prisma.communityPastoral.findMany.mockClear();
    await service.getPastoralOverview(user(UserRole.SYSTEM_ADMIN));
    expect(pastoralWhere()).toEqual({ deletedAt: null });
  });
});
