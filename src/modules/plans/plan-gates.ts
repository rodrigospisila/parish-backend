import { UseGuards, applyDecorators } from '@nestjs/common';
import type { PaidFeature } from './plan-rules';
import { PlanResource, RequiresFeature } from './plan.decorators';
import { PlanFeatureGuard } from './plan-feature.guard';
import { MemberLimitGuard } from './member-limit.guard';

/**
 * Marca UMA rota paga num controller que não usa o PlanFeatureGuard na classe
 * (eventos, relatórios...): guard + feature + recurso numa linha só.
 * Coloque ACIMA do `@UseGuards(JwtAuthGuard, ...)` da rota: os guards somam
 * nessa ordem, e o do plano precisa de `req.user`.
 *
 * Ex.: `@PlanGated('schedules', 'event')` (comunidade do evento em params.id).
 */
export const PlanGated = (feature: PaidFeature, ...resources: string[]) =>
  applyDecorators(
    UseGuards(PlanFeatureGuard),
    RequiresFeature(feature),
    ...(resources.length ? [PlanResource(...resources)] : []),
  );

/**
 * Limite de membros da faixa do plano na criação de membro (B32) — ver
 * MemberLimitGuard. Coloque ACIMA do `@UseGuards(JwtAuthGuard, ...)`.
 */
export const EnforceMemberLimit = () => UseGuards(MemberLimitGuard);
