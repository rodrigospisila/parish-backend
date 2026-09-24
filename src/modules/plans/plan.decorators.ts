import { SetMetadata } from '@nestjs/common';
import type { PaidFeature } from './plan-rules';

export const PLAN_FEATURE_KEY = 'plan:feature';
export const PLAN_RESOURCE_KEY = 'plan:resource';
export const PLAN_SKIP_KEY = 'plan:skip';

export interface PlanFeatureMeta {
  feature: PaidFeature;
  /**
   * 'parish' = recurso da PARÓQUIA (formação): sem alvo explícito, vale o
   * escopo paroquial do usuário (passa se alguma comunidade da paróquia tiver
   * acesso). Padrão 'community'.
   */
  level?: 'community' | 'parish';
}

/**
 * Marca o controller/rota como recurso PAGO da comunidade. Requer o
 * `PlanFeatureGuard` na lista de `@UseGuards(...)` DEPOIS do JwtAuthGuard
 * (o guard precisa de `req.user`); sem a metadata o guard não faz nada.
 */
export const RequiresFeature = (feature: PaidFeature, options: { level?: 'community' | 'parish' } = {}) =>
  SetMetadata(PLAN_FEATURE_KEY, { feature, level: options.level ?? 'community' } as PlanFeatureMeta);

/** Tipos de recurso cuja comunidade (ou paróquia) o guard sabe descobrir pelo id. */
export type PlanResourceKind =
  | 'community'
  | 'event'
  | 'member'
  | 'schedule'
  | 'assignment'
  | 'swap'
  | 'communityPastoral'
  | 'pastoralGroup'
  | 'pastoralMember'
  | 'joinRequest'
  | 'catechesisStage'
  | 'catechesisClass'
  | 'catechesisEnrollment'
  | 'catechesisSession'
  | 'catechesisDocument'
  | 'catechesisFee'
  | 'catechesisFeePayment'
  | 'catechesisPreset'
  | 'formationTrack'
  | 'formationCourse'
  | 'formationEnrollment'
  | 'room'
  | 'roomReservation'
  | 'visitRequest'
  | 'pastoralDocument';

export interface PlanResourceSpec {
  kind: PlanResourceKind;
  from: 'params' | 'query' | 'body';
  key: string;
}

/**
 * Diz ao guard de onde tirar o id do recurso da rota para descobrir a
 * comunidade dele. Formato: `'tipo'` (= `params.id`) ou `'tipo:origem.chave'`,
 * ex.: `'catechesisClass'`, `'schedule:body.scheduleId'`,
 * `'communityPastoral:query.communityPastoralId'`. Vale o primeiro que vier
 * preenchido na requisição.
 */
export const PlanResource = (...specs: string[]) =>
  SetMetadata(PLAN_RESOURCE_KEY, specs.map(parsePlanResourceSpec));

/** Rota de um controller pago que continua liberada (catálogo usado por telas grátis, etc.). */
export const SkipPlanCheck = () => SetMetadata(PLAN_SKIP_KEY, true);

export function parsePlanResourceSpec(spec: string): PlanResourceSpec {
  const [kind, location] = spec.split(':');
  if (!location) return { kind: kind as PlanResourceKind, from: 'params', key: 'id' };
  const [from, key] = location.split('.');
  if ((from !== 'params' && from !== 'query' && from !== 'body') || !key) {
    throw new Error(`@PlanResource inválido: ${spec}`);
  }
  return { kind: kind as PlanResourceKind, from, key };
}
