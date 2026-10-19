import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { HierarchyService } from '../../common/hierarchy.service';
import { PAID_FEATURES } from '../plans/plan-rules';

/**
 * Início (Onda 0): SYSTEM_ADMIN sem IN gigante, catequese só para quem a
 * coordena, coordenador de pastoral pelo vínculo e `planLocked`.
 */
describe('DashboardService — escopo do Início (onda 0)', () => {
  let prisma: any;
  let service: DashboardService;
  let coordinatedPastorals: Array<{ communityPastoralId: string; role: string; isActive: boolean }>;
  let catechesisCoordination: Array<{ communityPastoral: { communityId: string } }>;

  /** Prisma "automático": count → 0, listas → [], aggregate → vazio; cada método é um jest.fn reaproveitado. */
  const autoPrisma = () => {
    const models = new Map<string, any>();
    const defaults: Record<string, () => any> = {
      count: () => 0,
      findMany: () => [],
      groupBy: () => [],
      aggregate: () => ({ _count: { _all: 0 }, _min: { createdAt: null } }),
      findUnique: () => null,
      findFirst: () => null,
    };
    return new Proxy(
      { $queryRaw: jest.fn(async () => []) },
      {
        get(target: any, model: string) {
          if (model in target) return target[model];
          if (!models.has(model)) {
            models.set(
              model,
              new Proxy(
                {},
                {
                  get(fns: any, method: string) {
                    if (!fns[method]) fns[method] = jest.fn(async () => (defaults[method] ?? (() => undefined))());
                    return fns[method];
                  },
                },
              ),
            );
          }
          return models.get(model);
        },
      },
    );
  };

  const user = (role: UserRole, over: Record<string, unknown> = {}) => ({ id: `u-${role}`, role, ...over }) as any;

  beforeEach(() => {
    coordinatedPastorals = [];
    catechesisCoordination = [];
    prisma = autoPrisma();
    // Coordenação: loadCoordinatedPastoralIds (sem filtro isCatechesis) x catequese (com isCatechesis)
    prisma.pastoralMember.findMany.mockImplementation(async ({ where }: any) =>
      where?.communityPastoral?.globalPastoral?.isCatechesis ? catechesisCoordination : coordinatedPastorals,
    );
    prisma.pastoralCoordinator.findMany.mockResolvedValue([]);
    prisma.community.count.mockResolvedValue(53000);
    service = new DashboardService(prisma, new HierarchyService(prisma));
  });

  const rawSqlTexts = () =>
    prisma.$queryRaw.mock.calls.map((call: any[]) => ({ sql: call[0].sql as string, values: call[0].values as unknown[] }));

  describe('SYSTEM_ADMIN (eng-qualidade-06 / ux-dashboards-17)', () => {
    it('sem comunidade escolhida: nenhuma lista de ids — nem busca as comunidades, nem IN no SQL', async () => {
      const admin = user(UserRole.SYSTEM_ADMIN);
      const overview = await service.getCoordinatorOverview(admin);
      const insights = await service.getCoordinatorInsights(admin);

      expect(prisma.community.findMany).not.toHaveBeenCalled();
      expect(overview.scope).toEqual({ communityIds: [], pastoralScoped: false, pastoralIds: [], unrestricted: true, communityCount: 53000 });
      expect(insights.scope.unrestricted).toBe(true);
      // Contagens sem filtro de comunidade (where sem communityId)
      const enrollmentWhere = prisma.catechesisEnrollment.count.mock.calls[0][0].where;
      expect(enrollmentWhere.class).toEqual({ deletedAt: null, status: 'ACTIVE' });
      expect(prisma.prayerRequest.count.mock.calls[0][0].where).toEqual({ status: 'PENDING' });
      // SQL cru: nenhum parâmetro além das datas/chaves de aniversário
      for (const { sql, values } of rawSqlTexts()) {
        expect(sql).not.toMatch(/communityId"\s+IN/);
        expect(values.length).toBeLessThan(20);
      }
      expect(overview.planLocked).toEqual([]);
      expect(overview.canSeeCatechesis).toBe(true);
    });

    it('com comunidade escolhida: só ela', async () => {
      const overview = await service.getCoordinatorOverview(user(UserRole.SYSTEM_ADMIN), 'c1');
      expect(overview.scope).toMatchObject({ communityIds: ['c1'], unrestricted: false, communityCount: 1 });
    });
  });

  describe('catequese só para quem a coordena (ux-dashboards-01)', () => {
    const musica = () =>
      user(UserRole.PASTORAL_COORDINATOR, { communityId: 'c1', parishId: 'p1', coordinatedPastoralIds: ['cp-musica'] });

    it('coordenador da Música: bloco zerado, sem consulta à catequese e sem nomes do "risco de evasão"', async () => {
      coordinatedPastorals = [{ communityPastoralId: 'cp-musica', role: 'COORDINATOR', isActive: true }];
      prisma.catechesisEnrollment.count.mockResolvedValue(9);
      const overview = await service.getCoordinatorOverview(musica());
      expect(overview.canSeeCatechesis).toBe(false);
      expect(overview.catechesis).toEqual({ pendingApprovals: 0, documentsToReview: 0, sessionsWithoutAttendance: 0, unreadFamilyMessages: 0 });
      expect(prisma.catechesisEnrollment.count).not.toHaveBeenCalled();

      const insights = await service.getCoordinatorInsights(musica());
      expect(insights.canSeeCatechesis).toBe(false);
      expect(insights.catechesis.atRisk.students).toEqual([]);
      // Turmas consultadas com lista vazia (nada volta) e frequência com FALSE no SQL
      expect(prisma.catechesisClass.findMany.mock.calls[0][0].where.communityId).toEqual({ in: [] });
      expect(rawSqlTexts().some(({ sql }) => /WHERE FALSE/.test(sql))).toBe(true);
    });

    it('coordenador da Catequese (pastoral isCatechesis): vê a catequese da comunidade', async () => {
      coordinatedPastorals = [{ communityPastoralId: 'cp-cat', role: 'COORDINATOR', isActive: true }];
      catechesisCoordination = [{ communityPastoral: { communityId: 'c1' } }];
      prisma.catechesisEnrollment.count.mockResolvedValue(4);
      const overview = await service.getCoordinatorOverview(musica());
      expect(overview.canSeeCatechesis).toBe(true);
      expect(overview.catechesis.pendingApprovals).toBe(4);
      expect(prisma.catechesisEnrollment.count.mock.calls[0][0].where.class.communityId).toEqual({ in: ['c1'] });
      // A detecção é pelo flag, não pelo nome
      const catechesisQuery = prisma.pastoralMember.findMany.mock.calls.find(
        (call: any[]) => call[0].where?.communityPastoral?.globalPastoral,
      );
      expect(catechesisQuery[0].where.communityPastoral.globalPastoral).toEqual({ isCatechesis: true });
    });

    it('coordenador da comunidade e PARISH_ADMIN veem (mesma regra do módulo da catequese)', async () => {
      const cc = await service.getCoordinatorOverview(user(UserRole.COMMUNITY_COORDINATOR, { communityId: 'c1', parishId: 'p1' }));
      expect(cc.canSeeCatechesis).toBe(true);
      prisma.community.findMany.mockResolvedValue([{ id: 'c1' }, { id: 'c2' }]);
      const pa = await service.getCoordinatorOverview(user(UserRole.PARISH_ADMIN, { parishId: 'p1' }));
      expect(pa.canSeeCatechesis).toBe(true);
      expect(pa.scope.communityIds).toEqual(['c1', 'c2']);
    });
  });

  describe('coordenador de pastoral pelo vínculo (ux-dashboards-22)', () => {
    it('VOLUNTEER que coordena pastoral recebe o Início das suas pastorais (sem membros da comunidade)', async () => {
      coordinatedPastorals = [{ communityPastoralId: 'cp-musica', role: 'COORDINATOR', isActive: true }];
      prisma.communityPastoral.findMany.mockImplementation(async ({ where }: any) =>
        where?.id?.in
          ? [{ id: 'cp-musica', communityId: 'c1', globalPastoral: { name: 'Música' }, _count: { members: 3 } }]
          : [],
      );
      const volunteer = user(UserRole.VOLUNTEER, { communityId: 'c1', communities: [{ communityId: 'cX', isActive: true }] });
      const overview = await service.getCoordinatorOverview(volunteer);
      expect(overview.scope).toMatchObject({ communityIds: ['c1'], pastoralScoped: true, pastoralIds: ['cp-musica'] });
      expect(overview.canSeeCatechesis).toBe(false);
      expect(overview.canModeratePrayers).toBe(false);
      // Escalas só das pastorais que coordena
      const pendingWhere = prisma.scheduleAssignment.count.mock.calls[0][0].where;
      expect(pendingWhere.communityPastoralId).toEqual({ in: ['cp-musica'] });

      const insights = await service.getCoordinatorInsights(volunteer);
      expect(insights.community.activeMembers).toBe(0);
      expect(insights.community.birthdays).toEqual([]);
      expect(prisma.member.count).not.toHaveBeenCalled();
    });

    it('vínculo de fé não amplia: comunidade fora das pastorais que coordena → 403', async () => {
      coordinatedPastorals = [{ communityPastoralId: 'cp-musica', role: 'COORDINATOR', isActive: true }];
      prisma.communityPastoral.findMany.mockResolvedValue([{ communityId: 'c1' }]);
      const volunteer = user(UserRole.VOLUNTEER, { communityId: 'c1', communities: [{ communityId: 'cX', isActive: true }] });
      await expect(service.getCoordinatorOverview(volunteer, 'cX')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('fiel/voluntário que não coordena nada → 403', async () => {
      await expect(service.getCoordinatorOverview(user(UserRole.FAITHFUL, { communityId: 'c1' }))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await expect(service.getCoordinatorInsights(user(UserRole.VOLUNTEER, { communityId: 'c1' }))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('participação (pastoralIds da sessão) não vira coordenação', async () => {
      const pc = user(UserRole.PASTORAL_COORDINATOR, { communityId: 'c1', pastoralIds: ['cp-participa'] });
      const overview = await service.getCoordinatorOverview(pc);
      expect(overview.scope.pastoralIds).toEqual([]);
    });
  });

  describe('planLocked (contrato 5 / ux-dashboards-20)', () => {
    const cc = () => user(UserRole.COMMUNITY_COORDINATOR, { communityId: 'c1', parishId: 'p1' });
    const planAccess = (mode: string, paid: string[]) => ({
      enforcement: jest.fn(() => mode),
      communityHasAccess: jest.fn(async (id: string) => paid.includes(id)),
      paidCommunityIdsInScope: jest.fn(async () => paid),
    });

    it('on + comunidade sem plano: recursos pagos bloqueados e seções pagas zeradas (fora do total)', async () => {
      service = new DashboardService(prisma, new HierarchyService(prisma), planAccess('on', []) as any);
      prisma.scheduleAssignment.count.mockResolvedValue(5);
      prisma.prayerRequest.count.mockResolvedValue(2);
      const overview = await service.getCoordinatorOverview(cc());
      expect(overview.planLocked).toEqual([...PAID_FEATURES]);
      expect(overview.schedules).toEqual({ pendingResponses: 0, declinedToReplace: 0, upcomingWeek: 0 });
      expect(overview.catechesis.pendingApprovals).toBe(0);
      // Orações (grátis) seguem contando
      expect(overview.prayers.pendingModeration).toBe(2);
      expect(overview.total).toBe(2);
      expect(prisma.scheduleAssignment.count).not.toHaveBeenCalled();

      const insights = await service.getCoordinatorInsights(cc());
      expect(insights.planLocked).toEqual([...PAID_FEATURES]);
      expect(prisma.communityPastoral.findMany.mock.calls.at(-1)[0].where.communityId).toEqual({ in: [] });
    });

    it('on + comunidade com plano: nada bloqueado', async () => {
      service = new DashboardService(prisma, new HierarchyService(prisma), planAccess('on', ['c1']) as any);
      prisma.scheduleAssignment.count.mockResolvedValue(5);
      const overview = await service.getCoordinatorOverview(cc());
      expect(overview.planLocked).toEqual([]);
      expect(overview.schedules.pendingResponses).toBe(5);
    });

    it('log/off: nunca bloqueia (nem consulta o plano)', async () => {
      const access = planAccess('log', []);
      service = new DashboardService(prisma, new HierarchyService(prisma), access as any);
      const overview = await service.getCoordinatorOverview(cc());
      expect(overview.planLocked).toEqual([]);
      expect(access.communityHasAccess).not.toHaveBeenCalled();
    });
  });
});
