import { UserRole } from '@prisma/client';
import { PlanAccessService } from '../modules/plans/plan-access.service';
import { CatechesisService } from '../modules/catechesis/catechesis.service';
import { SchedulesService } from '../modules/schedules/schedules.service';
import { SwapsService } from '../modules/swaps/swaps.service';
import { JoinRequestsService } from '../modules/pastorals/join-requests.service';
import { RoomsService } from '../modules/rooms/rooms.service';
import { VisitationService } from '../modules/visitation/visitation.service';
import { DocumentsService } from '../modules/documents/documents.service';
import { planFilter, planMark } from './plan-list';

/**
 * Leva 2 (M35/A21): as listas filtram/marcam pela comunidade do RECURSO.
 * "Matriz" (c-paga) em teste e "Capela" (c-free) sem plano — o caso de
 * Imbituva. No modo log (o de produção hoje) nada muda; no on, a capela sai
 * (rotas "minhas", visões agregadas, PDF) ou vem com o cadeado (listas).
 */
const PAID = 'c-paga';
const FREE = 'c-free';

/** Prisma de mentira: cada modelo responde vazio, salvo o que o teste definir. */
function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const defaults = () => ({
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn().mockResolvedValue(null),
    findUnique: jest.fn().mockResolvedValue(null),
    groupBy: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
  });
  const models: Record<string, any> = {
    communityPlan: {
      findUnique: jest.fn(async ({ where }: any) =>
        where.communityId === PAID
          ? { status: 'TRIAL', trialEndsAt: new Date(Date.now() + 30 * 86_400_000), currentPeriodEnd: null, graceDays: 7, tier: null }
          : null,
      ),
    },
  };
  for (const [name, methods] of Object.entries(overrides)) models[name] = { ...defaults(), ...methods };
  return new Proxy(models, {
    get: (target, key: string | symbol) => {
      if (typeof key === 'symbol') return undefined;
      if (!(key in target)) target[key] = defaults();
      return target[key];
    },
  }) as any;
}

function planAccessFor(prisma: any, mode: 'off' | 'log' | 'on') {
  return new PlanAccessService(prisma, { get: () => mode } as any);
}

const parishAdmin = { id: 'u-adm', role: UserRole.PARISH_ADMIN, parishId: 'p1', dioceseId: 'd1', communityId: null } as any;
const faithful = { id: 'u-fiel', role: UserRole.FAITHFUL, communityId: FREE, parishId: 'p1' } as any;
const systemAdmin = { id: 'u-sys', role: UserRole.SYSTEM_ADMIN } as any;

describe('plan-list: planFilter / planMark', () => {
  const items = [
    { id: 'a', communityId: PAID },
    { id: 'b', communityId: FREE },
    { id: 'c', communityId: null },
  ];

  it.each(['off', 'log'] as const)('modo %s: devolve a MESMA lista, sem planLocked', async (mode) => {
    const access = planAccessFor(fakePrisma(), mode);
    await expect(planFilter(access, parishAdmin, items, (i) => i.communityId)).resolves.toBe(items);
    const marked = await planMark(access, parishAdmin, items, (i) => i.communityId);
    expect(marked).toBe(items);
    expect(marked[0]).not.toHaveProperty('planLocked');
  });

  it('sem PlanAccessService (spec antigo): não mexe', async () => {
    await expect(planFilter(undefined, parishAdmin, items, (i) => i.communityId)).resolves.toBe(items);
    await expect(planMark(undefined, parishAdmin, items, (i) => i.communityId)).resolves.toBe(items);
  });

  it('modo on: filtra/marca pela comunidade; item sem comunidade fica; SYSTEM_ADMIN vê tudo', async () => {
    const access = planAccessFor(fakePrisma(), 'on');
    expect((await planFilter(access, parishAdmin, items, (i) => i.communityId)).map((i) => i.id)).toEqual(['a', 'c']);
    expect((await planMark(access, parishAdmin, items, (i) => i.communityId)).map((i) => i.planLocked)).toEqual([false, true, false]);
    expect(await planFilter(access, systemAdmin, items, (i) => i.communityId)).toHaveLength(3);
  });
});

describe('services: rotas "minhas" filtram, listas marcam (só no modo on)', () => {
  const none: any = {};

  describe('CatechesisService', () => {
    const klass = (id: string, communityId: string) => ({
      id,
      communityId,
      name: id,
      year: 2026,
      capacity: null,
      stage: { id: 's', name: 'Etapa', sacramentType: null, color: null },
      community: { id: communityId, name: communityId },
      _count: { enrollments: 0, sessions: 0 },
    });
    const enrollment = (id: string, communityId: string) => ({
      id,
      classId: `k-${communityId}`,
      status: 'ACTIVE',
      member: { id: 'm1', fullName: 'Fulano' },
      class: klass(`k-${communityId}`, communityId),
      attendances: [],
      documents: [],
      _count: { assessments: 0, messages: 0 },
      guardianConsentAt: new Date(),
    });

    function build(mode: 'log' | 'on') {
      const prisma = fakePrisma({
        member: { findFirst: jest.fn().mockResolvedValue({ id: 'm1' }) },
        catechesisCatechist: {
          findMany: jest.fn().mockResolvedValue([
            { classId: `k-${PAID}`, role: 'CATECHIST', class: klass(`k-${PAID}`, PAID) },
            { classId: `k-${FREE}`, role: 'CATECHIST', class: klass(`k-${FREE}`, FREE) },
          ]),
        },
        catechesisEnrollment: { findMany: jest.fn().mockResolvedValue([enrollment('e1', PAID), enrollment('e2', FREE)]) },
        catechesisClass: { findMany: jest.fn().mockResolvedValue([klass('k1', PAID), klass('k2', FREE)]) },
      });
      const service = new CatechesisService(prisma, none, none, none, none, planAccessFor(prisma, mode));
      return { service, prisma };
    }

    it('log: my-classes, my-family e a lista de turmas iguais ao que o banco trouxe', async () => {
      const { service } = build('log');
      expect((await service.getMyClasses(faithful)).map((c: any) => c.classId)).toEqual([`k-${PAID}`, `k-${FREE}`]);
      // A família também: o mock devolve as duas matrículas para qualquer findMany de matrícula
      const family: any[] = await service.getMyFamilyCatechesis(faithful);
      expect(family.map((e) => e.enrollmentId)).toEqual(['e1', 'e2']);
      const classes: any[] = await service.listClasses(systemAdmin);
      expect(classes.map((c) => c.id)).toEqual(['k1', 'k2']);
      expect(classes[0]).not.toHaveProperty('planLocked');
    });

    it('on: my-classes e my-family só da comunidade paga; lista de turmas com cadeado na capela', async () => {
      const { service } = build('on');
      expect((await service.getMyClasses(faithful)).map((c: any) => c.classId)).toEqual([`k-${PAID}`]);
      const family: any[] = await service.getMyFamilyCatechesis(faithful);
      expect(family.map((e) => e.enrollmentId)).toEqual(['e1']);
      const classes: any[] = await service.listClasses({ ...parishAdmin, communityId: null });
      expect(classes.map((c) => [c.id, c.planLocked])).toEqual([
        ['k1', false],
        ['k2', true],
      ]);
    });

    it('on: visões agregadas da comunidade sem plano saem vazias', async () => {
      const { service, prisma } = build('on');
      jest.spyOn(service as any, 'assertCatechesisCoordination').mockResolvedValue(undefined);
      const raw = (communityId: string) => ({ ...klass(`k-${communityId}`, communityId), enrollments: [], sessions: [], fees: [] });
      prisma.catechesisClass.findMany.mockResolvedValue([raw(FREE)]);
      await expect(service.getCommunityOverview(parishAdmin, FREE)).resolves.toEqual([]);
      await expect(service.getYearEndOverview(parishAdmin, FREE)).resolves.toEqual([]);
      prisma.catechesisClass.findMany.mockResolvedValue([raw(PAID)]);
      await expect(service.getCommunityOverview(parishAdmin, PAID)).resolves.toHaveLength(1);
    });
  });

  describe('SchedulesService', () => {
    const scheduleRow = (id: string, communityId: string | null, eventCommunityId?: string) => ({
      id,
      title: id,
      date: new Date('2026-11-01T12:00:00Z'),
      communityId,
      event: eventCommunityId ? { id: `ev-${id}`, title: 'Missa', type: 'MASS', communityId: eventCommunityId, community: { id: eventCommunityId, name: 'x' } } : null,
      community: communityId ? { id: communityId, name: 'x' } : null,
      pastorals: [],
      assignments: [],
    });

    function build(mode: 'log' | 'on') {
      const prisma = fakePrisma({
        member: { findFirst: jest.fn().mockResolvedValue({ id: 'm1', fullName: 'Fulano', spouseId: null }) },
        scheduleAssignment: {
          findMany: jest
            .fn()
            .mockResolvedValueOnce([
              { id: 'a1', scheduleId: 's1', schedule: scheduleRow('s1', PAID) },
              { id: 'a2', scheduleId: 's2', schedule: scheduleRow('s2', null, FREE) },
            ])
            .mockResolvedValueOnce([{ id: 'a3', scheduleId: 's3', schedule: scheduleRow('s3', null, FREE) }]),
        },
        schedule: { findMany: jest.fn().mockResolvedValue([scheduleRow('s1', PAID), scheduleRow('s2', null, FREE)]) },
      });
      const hierarchy: any = { applyScheduleFilter: () => ({}) };
      const service = new SchedulesService(prisma, hierarchy, none, none, none, none, planAccessFor(prisma, mode));
      return { service, prisma };
    }

    it('log: my-assignments e coordinator-overview sem mudança', async () => {
      const { service } = build('log');
      const mine: any = await service.findMyAssignments(faithful.id, faithful);
      expect(mine.upcoming.map((a: any) => a.id)).toEqual(['a1', 'a2']);
      expect(mine.past.map((a: any) => a.id)).toEqual(['a3']);
      const overview = await service.getCoordinatorOverview(parishAdmin);
      expect(overview.map((s) => s.scheduleId)).toEqual(['s1', 's2']);
    });

    it('on: my-assignments só da comunidade paga (da escala ou do evento)', async () => {
      const { service } = build('on');
      const mine: any = await service.findMyAssignments(faithful.id, faithful);
      expect(mine.upcoming.map((a: any) => a.id)).toEqual(['a1']);
      expect(mine.past).toEqual([]);
    });

    it('on: coordinator-overview (e o PDF, que o reusa) sem as escalas da capela', async () => {
      const { service } = build('on');
      const overview = await service.getCoordinatorOverview(parishAdmin);
      expect(overview.map((s) => s.scheduleId)).toEqual(['s1']);
    });

    it('on: lista de escalas com cadeado; escalas de UM evento (calendário grátis) intactas', async () => {
      const { service } = build('on');
      const list: any[] = await service.findAllSchedules(undefined, parishAdmin);
      expect(list.map((s) => [s.id, s.planLocked])).toEqual([
        ['s1', false],
        ['s2', true],
      ]);
      const ofEvent: any[] = await service.findAllSchedules('ev-s2', parishAdmin);
      expect(ofEvent[0]).not.toHaveProperty('planLocked');
    });
  });

  describe('SwapsService.listMine e JoinRequestsService.mine', () => {
    function buildSwaps(mode: 'log' | 'on') {
      const swap = (id: string, communityId: string | null, eventCommunityId: string | null) => ({
        id,
        requesterId: 'm1',
        targetId: null,
        assignment: { schedule: { id: `s-${id}`, communityId, event: eventCommunityId ? { communityId: eventCommunityId } : null } },
      });
      const prisma = fakePrisma({
        member: {
          findFirst: jest.fn().mockResolvedValue({ id: 'm1' }),
          findUnique: jest.fn().mockResolvedValue({ communityId: FREE, communityLinks: [] }),
        },
        assignmentSwapRequest: {
          findMany: jest
            .fn()
            .mockResolvedValueOnce([swap('w1', PAID, null), swap('w2', null, FREE)])
            .mockResolvedValueOnce([swap('w3', null, FREE)]),
        },
      });
      return new SwapsService(prisma, none, none, none, none, planAccessFor(prisma, mode));
    }

    function buildJoin(mode: 'log' | 'on') {
      const request = (id: string, communityId: string) => ({
        id,
        communityPastoralId: `cp-${communityId}`,
        communityPastoral: { communityId, globalPastoral: { name: 'Liturgia' } },
        status: 'PENDING',
      });
      const prisma = fakePrisma({
        member: { findFirst: jest.fn().mockResolvedValue({ id: 'm1' }) },
        pastoralJoinRequest: { findMany: jest.fn().mockResolvedValue([request('j1', PAID), request('j2', FREE)]) },
      });
      return new JoinRequestsService(prisma, none, none, none, planAccessFor(prisma, mode));
    }

    it('log: tudo igual', async () => {
      const swaps: any = await buildSwaps('log').listMine(faithful);
      expect(swaps.requested.map((s: any) => s.id)).toEqual(['w1', 'w2']);
      expect(swaps.invited.map((s: any) => s.id)).toEqual(['w3']);
      const join: any = await buildJoin('log').mine(faithful);
      expect(join.requests.map((r: any) => r.id)).toEqual(['j1', 'j2']);
    });

    it('on: só as da comunidade paga', async () => {
      const swaps: any = await buildSwaps('on').listMine(faithful);
      expect(swaps.requested.map((s: any) => s.id)).toEqual(['w1']);
      expect(swaps.invited).toEqual([]);
      const join: any = await buildJoin('on').mine(faithful);
      expect(join.requests.map((r: any) => r.id)).toEqual(['j1']);
    });
  });

  describe('salas, visitas e documentos: cadeado na lista', () => {
    function build(mode: 'log' | 'on') {
      const rows = [
        { id: 'x1', communityId: PAID },
        { id: 'x2', communityId: FREE },
      ];
      const prisma = fakePrisma({
        room: { findMany: jest.fn().mockResolvedValue(rows) },
        visitRequest: { findMany: jest.fn().mockResolvedValue(rows) },
        pastoralDocument: { findMany: jest.fn().mockResolvedValue(rows) },
      });
      const access = planAccessFor(prisma, mode);
      return {
        prisma,
        rooms: new RoomsService(prisma, none, none, access),
        visits: new VisitationService(prisma, none, none, access),
        docs: new DocumentsService(prisma, none, none, access),
      };
    }

    it('log: listas iguais, sem planLocked', async () => {
      const ctx = build('log');
      for (const list of [await ctx.rooms.listRooms(parishAdmin), await ctx.visits.listRequests(parishAdmin), await ctx.docs.list(parishAdmin, {})]) {
        expect(list.map((r: any) => r.id)).toEqual(['x1', 'x2']);
        expect(list[1]).not.toHaveProperty('planLocked');
      }
    });

    it('on: item de comunidade sem plano vem com planLocked', async () => {
      const ctx = build('on');
      for (const list of [await ctx.rooms.listRooms(parishAdmin), await ctx.visits.listRequests(parishAdmin), await ctx.docs.list(parishAdmin, {})]) {
        expect(list.map((r: any) => [r.id, r.planLocked])).toEqual([
          ['x1', false],
          ['x2', true],
        ]);
      }
      // A visita passa a trazer a comunidade (para o cadeado)
      expect(ctx.prisma.visitRequest.findMany.mock.calls[0][0].select.communityId).toBe(true);
    });
  });
});
