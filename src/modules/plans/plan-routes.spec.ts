import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { PLAN_ROUTE_RULES } from './plan-routes';
import { PLAN_FEATURE_KEY, PLAN_RESOURCE_KEY } from './plan.decorators';
import { PlanFeatureGuard } from './plan-feature.guard';
import { MemberLimitGuard } from './member-limit.guard';
import { CatechesisController } from '../catechesis/catechesis.controller';
import { SchedulesController } from '../schedules/schedules.controller';
import { SwapsController } from '../swaps/swaps.controller';
import { JoinRequestsController } from '../pastorals/join-requests.controller';
import { EventsController } from '../events/events.controller';
import { ReportsController } from '../reports/reports.controller';
import { MembersController } from '../members/members.controller';

const CONTROLLERS: Record<string, any> = {
  CatechesisController,
  SchedulesController,
  SwapsController,
  JoinRequestsController,
};

describe('plan-routes — regras por rota apontam para métodos que existem', () => {
  it.each(Object.keys(PLAN_ROUTE_RULES))('%s', (key) => {
    const [cls, method] = key.split('.');
    expect(CONTROLLERS[cls]).toBeDefined();
    expect(typeof CONTROLLERS[cls].prototype[method]).toBe('function');
    // Rota "minhas"/grátis vale só dentro de um controller pago
    expect(Reflect.getMetadata(PLAN_FEATURE_KEY, CONTROLLERS[cls])).toBeDefined();
  });

  it('B12: só a leitura com eventId é grátis', () => {
    const rule = PLAN_ROUTE_RULES['SchedulesController.findAllSchedules'];
    expect(rule.kind).toBe('free');
    if (rule.kind !== 'free') return;
    expect(rule.when({ query: { eventId: 'ev1' } })).toBe(true);
    expect(rule.when({ query: {} })).toBe(false);
    expect(rule.when({ query: { eventId: '  ' } })).toBe(false);
  });
});

describe('B26 — escala por evento e relatório pastoral marcados como pagos', () => {
  const guardsOf = (handler: any) => (Reflect.getMetadata(GUARDS_METADATA, handler) ?? []) as any[];

  it.each([
    ['createAssignment', 'event', 'params', 'id'],
    ['checkinAssignment', 'eventAssignment', 'params', 'assignmentId'],
    ['removeAssignment', 'eventAssignment', 'params', 'assignmentId'],
  ])('EventsController.%s → schedules + %s', (method, kind, from, key) => {
    const handler = EventsController.prototype[method as keyof EventsController];
    expect(Reflect.getMetadata(PLAN_FEATURE_KEY, handler)).toMatchObject({ feature: 'schedules' });
    expect(Reflect.getMetadata(PLAN_RESOURCE_KEY, handler)).toEqual([{ kind, from, key }]);
    const guards = guardsOf(handler);
    // O guard do plano vem DEPOIS do JwtAuthGuard (precisa de req.user)
    expect(guards[guards.length - 1]).toBe(PlanFeatureGuard);
    expect(guards.length).toBeGreaterThan(1);
  });

  it.each(['getPastoralOverview', 'exportPastoralOverviewPdf'])('ReportsController.%s → pastorals', (method) => {
    const handler = ReportsController.prototype[method as keyof ReportsController];
    expect(Reflect.getMetadata(PLAN_FEATURE_KEY, handler)).toMatchObject({ feature: 'pastorals' });
    expect(guardsOf(handler)).toContain(PlanFeatureGuard);
  });

  it('B32: POST /members passa pelo MemberLimitGuard', () => {
    expect(guardsOf(MembersController.prototype.create)).toContain(MemberLimitGuard);
  });
});
