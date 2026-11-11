import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { UserRole } from '@prisma/client';
import { PLAN_FEATURE_KEY, PLAN_RESOURCE_KEY, parsePlanResourceSpec } from '../plans/plan.decorators';
import { PlanFeatureGuard } from '../plans/plan-feature.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { NewsController } from '../news/news.controller';
import { PrayerRequestsController } from '../prayer-requests/prayer-requests.controller';
import { ClergyMessagesController } from '../clergy-messages/clergy-messages.controller';
import { PlanningController } from '../planning/planning.controller';
import { DashboardController } from '../dashboard/dashboard.controller';
import { ReportsController } from '../reports/reports.controller';
import { MassSchedulesController } from '../mass-schedules/mass-schedules.controller';

/**
 * Lançamento (plano grátis enxuto): agenda, avisos, pedidos de oração, Palavra
 * do Pastor, planejamento, Início e geração de escala passam a ser pagos.
 * Este spec trava a marcação por rota: feature, de onde sai a comunidade e a
 * ordem dos guards (o do plano depois do JwtAuthGuard).
 */
type Row = [method: string, feature: string, resources: string[]];

const guardsOf = (target: any) => (Reflect.getMetadata(GUARDS_METADATA, target) ?? []) as any[];

/** Feature/guards efetivos da rota: metadata do método, senão a da classe. */
function routeMeta(controller: any, method: string) {
  const handler = controller.prototype[method];
  expect(typeof handler).toBe('function');
  const feature = Reflect.getMetadata(PLAN_FEATURE_KEY, handler) ?? Reflect.getMetadata(PLAN_FEATURE_KEY, controller);
  const resources = Reflect.getMetadata(PLAN_RESOURCE_KEY, handler) ?? [];
  // Nest roda os guards da classe antes dos do método
  const guards = [...guardsOf(controller), ...guardsOf(handler)];
  return { feature, resources, guards };
}

function expectGated(controller: any, [method, feature, resources]: Row, level: 'community' | 'parish' = 'community') {
  const meta = routeMeta(controller, method);
  expect(meta.feature).toEqual({ feature, level });
  expect(meta.resources).toEqual(resources.map(parsePlanResourceSpec));
  expect(meta.guards).toContain(PlanFeatureGuard);
  // O guard do plano precisa de req.user: sempre depois do JwtAuthGuard
  expect(meta.guards.indexOf(JwtAuthGuard)).toBeGreaterThanOrEqual(0);
  expect(meta.guards.indexOf(JwtAuthGuard)).toBeLessThan(meta.guards.indexOf(PlanFeatureGuard));
}

/** Métodos de rota do controller (tudo do prototype menos o construtor). */
const routesOf = (controller: any) =>
  Object.getOwnPropertyNames(controller.prototype).filter((name) => name !== 'constructor');

describe('Lançamento — rotas pagas (módulos A)', () => {
  const EVENTS: Row[] = [
    ['create', 'events', []],
    ['findAll', 'events', []],
    ['exportIcs', 'events', []],
    ['findUpcoming', 'events', []],
    ['findRecurring', 'events', []],
    ['findByType', 'events', []],
    ['findByDateRange', 'events', []],
    ['getFavorites', 'events', []],
    ['addFavorite', 'events', ['event']],
    ['removeFavorite', 'events', ['event']],
    ['findOne', 'events', ['event']],
    ['update', 'events', ['event']],
    ['remove', 'events', ['event']],
    ['duplicate', 'events', ['event']],
    ['addParticipant', 'events', ['event']],
    ['removeParticipant', 'events', ['event']],
    ['getParticipants', 'events', ['event']],
    ['addPastoralToEvent', 'events', ['event']],
    ['getEventPastorals', 'events', ['event']],
    ['removePastoralFromEvent', 'events', ['event']],
    ['getAssignments', 'events', ['event']],
    // Escala por evento continua em `schedules`
    ['createAssignment', 'schedules', ['event']],
    ['checkinAssignment', 'schedules', ['eventAssignment:params.assignmentId']],
    ['removeAssignment', 'schedules', ['eventAssignment:params.assignmentId']],
  ];

  it.each(EVENTS)('EventsController.%s → %s', (...row) => expectGated(EventsController, row));

  it('EventsController: nenhuma rota fica fora do plano', () => {
    expect(routesOf(EventsController).sort()).toEqual(EVENTS.map(([method]) => method).sort());
  });

  it.each<Row>([
    ['create', 'news', []],
    ['update', 'news', ['news']],
    ['remove', 'news', ['news']],
  ])('NewsController.%s → %s', (...row) => expectGated(NewsController, row));

  it.each(['findAll', 'findRecent', 'findUrgent', 'findOne'])(
    'NewsController.%s continua PÚBLICA (o corte é no service)',
    (method) => {
      const handler = NewsController.prototype[method as keyof NewsController];
      expect(guardsOf(handler)).toEqual([]);
      expect(Reflect.getMetadata(PLAN_FEATURE_KEY, handler)).toBeUndefined();
    },
  );

  const PRAYER: Row[] = [
    ['create', 'prayer-requests', []],
    ['findAll', 'prayer-requests', []],
    ['findApproved', 'prayer-requests', []],
    ['findPending', 'prayer-requests', []],
    ['getStats', 'prayer-requests', []],
    ['findOne', 'prayer-requests', ['prayerRequest']],
    ['update', 'prayer-requests', ['prayerRequest']],
    ['remove', 'prayer-requests', ['prayerRequest']],
    ['approve', 'prayer-requests', ['prayerRequest']],
    ['reject', 'prayer-requests', ['prayerRequest']],
    ['incrementPrayerCount', 'prayer-requests', ['prayerRequest']],
  ];

  it.each(PRAYER)('PrayerRequestsController.%s → %s', (...row) => expectGated(PrayerRequestsController, row));

  it('PrayerRequestsController: nenhuma rota fica fora do plano', () => {
    expect(routesOf(PrayerRequestsController).sort()).toEqual(PRAYER.map(([method]) => method).sort());
  });

  it.each<Row>([
    ['create', 'clergy-messages', ['communityPastoral:body.communityPastoralId']],
    ['feed', 'clergy-messages', []],
    ['mine', 'clergy-messages', []],
    ['remove', 'clergy-messages', ['clergyMessage']],
  ])('ClergyMessagesController.%s → %s', (...row) => expectGated(ClergyMessagesController, row));

  it.each<Row>([
    ['createPlan', 'planning', []],
    ['listPlans', 'planning', []],
    ['getPlan', 'planning', ['pastoralPlan']],
    ['updateStatus', 'planning', ['pastoralPlan']],
    ['addObjective', 'planning', ['pastoralPlan']],
    ['addGoal', 'planning', ['planObjective']],
    ['updateGoal', 'planning', ['planGoal']],
    ['addAction', 'planning', ['planObjective']],
    ['updateAction', 'planning', ['planAction']],
    ['linkEvent', 'planning', ['event:params.eventId']],
  ])('PlanningController.%s → %s (nível paróquia)', (...row) => expectGated(PlanningController, row, 'parish'));

  it.each<Row>([
    ['coordinator', 'dashboard', []],
    ['insights', 'dashboard', []],
  ])('DashboardController.%s → %s', (...row) => expectGated(DashboardController, row));

  it.each<Row>([
    ['getPastoralOverview', 'pastorals', []],
    ['exportPastoralOverviewPdf', 'pastorals', []],
  ])('ReportsController.%s → %s', (...row) => expectGated(ReportsController, row));

  it('ReportsController: todo relatório tem feature', () => {
    for (const method of routesOf(ReportsController)) {
      expect(routeMeta(ReportsController, method).feature).toBeDefined();
    }
  });

  it.each<Row>([
    ['generatePending', 'schedules', []],
    ['pending', 'schedules', []],
    ['generateSchedule', 'schedules', []],
    ['linkPastoral', 'schedules', ['communityPastoral:body.communityPastoralId']],
    ['unlinkPastoral', 'schedules', ['communityPastoral:params.communityPastoralId']],
  ])('MassSchedulesController.%s → %s', (...row) => expectGated(MassSchedulesController, row));

  it.each(['findAll', 'findAllManaged', 'occurrences', 'getFavorites', 'cancelOccurrences', 'create', 'update'])(
    'MassSchedulesController.%s continua GRÁTIS (horário fixo e "não haverá")',
    (method) => {
      const handler = (MassSchedulesController.prototype as any)[method];
      expect(typeof handler).toBe('function');
      expect(Reflect.getMetadata(PLAN_FEATURE_KEY, handler)).toBeUndefined();
      expect(guardsOf(handler)).not.toContain(PlanFeatureGuard);
    },
  );
});

describe('EventsService — plano nas listas (PLAN_ENFORCEMENT=on)', () => {
  const priest = { id: 'u1', role: UserRole.PARISH_ADMIN, parishId: 'p1' } as any;

  function build(mode: 'on' | 'log', paid: string[] = ['c-paga']) {
    const prisma: any = {
      event: {
        findMany: jest.fn(async (args: any) =>
          args.distinct ? [{ communityId: 'c-paga' }, { communityId: 'c-gratis' }] : [],
        ),
      },
      eventFavorite: {
        findMany: jest.fn().mockResolvedValue([
          { event: { id: 'e1', communityId: 'c-paga' } },
          { event: { id: 'e2', communityId: 'c-gratis' } },
        ]),
      },
    };
    const hierarchy: any = { applyEventFilter: jest.fn().mockReturnValue({ community: { parishId: 'p1' } }) };
    const planAccess: any = {
      enforcement: () => mode,
      restrictToPaid: jest.fn(async () => new Set(paid)),
      filterByPlan: jest.fn(async (_user: any, items: any[], communityOf: (item: any) => string) =>
        items.filter((item) => paid.includes(communityOf(item))),
      ),
    };
    const service = new EventsService(prisma, hierarchy, {} as any, planAccess);
    return { service, prisma, planAccess };
  }

  const listCall = (prisma: any) => prisma.event.findMany.mock.calls.find(([args]: any[]) => !args.distinct)[0];

  it('on: GET /events só traz eventos de comunidades com acesso (no where, sem furar a página)', async () => {
    const { service, prisma } = build('on');
    await service.findAll(undefined, undefined, undefined, undefined, undefined, priest);
    expect(listCall(prisma).where.AND).toContainEqual({ communityId: { in: ['c-paga'] } });
  });

  it('on: /events/upcoming também', async () => {
    const { service, prisma } = build('on');
    await service.findUpcoming(undefined, 10, priest);
    expect(listCall(prisma).where.AND).toContainEqual({ communityId: { in: ['c-paga'] } });
  });

  it('on: favoritos de comunidade sem acesso saem da lista', async () => {
    const { service } = build('on');
    await expect(service.getFavorites(priest)).resolves.toEqual([{ id: 'e1', communityId: 'c-paga' }]);
  });

  it('log: nada muda (nem consulta extra)', async () => {
    const { service, prisma, planAccess } = build('log');
    await service.findAll(undefined, undefined, undefined, undefined, undefined, priest);
    expect(prisma.event.findMany).toHaveBeenCalledTimes(1);
    expect(planAccess.restrictToPaid).not.toHaveBeenCalled();
    expect(JSON.stringify(listCall(prisma).where)).not.toContain('c-paga');
    await expect(service.getFavorites(priest)).resolves.toHaveLength(2);
  });

  it('on: SYSTEM_ADMIN não é filtrado', async () => {
    const { service, prisma } = build('on');
    await service.findAll(undefined, undefined, undefined, undefined, undefined, {
      id: 's',
      role: UserRole.SYSTEM_ADMIN,
    } as any);
    expect(prisma.event.findMany).toHaveBeenCalledTimes(1);
  });
});
