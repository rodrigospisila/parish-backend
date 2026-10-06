import type { PlanAccessService, PlanUser } from '../modules/plans/plan-access.service';

/**
 * Plano por comunidade nas LISTAS dos services (M35/A21). O guard decide a
 * rota; aqui saem (ou ficam marcados) os itens de comunidades sem o plano:
 *
 * - `planFilter`: tira da lista — rotas "minhas" (a família, o catequista, o
 *   escalado), visões agregadas e exportações (PDF) da paróquia;
 * - `planMark`: mantém o item com `planLocked: true` — listas do painel que
 *   mostram o cadeado (o detalhe já responde 403 PLAN_REQUIRED).
 *
 * Só no PLAN_ENFORCEMENT=on. Em off/log a resposta não muda em NADA (nem o
 * campo `planLocked` aparece). Sem o PlanAccessService (specs que montam o
 * service à mão), idem.
 */
type PlanLists = Pick<PlanAccessService, 'enforcement' | 'filterByPlan' | 'markByPlan'>;

export async function planFilter<T>(
  planAccess: PlanLists | undefined | null,
  user: Pick<PlanUser, 'role'>,
  items: T[],
  communityOf: (item: T) => string | null | undefined,
): Promise<T[]> {
  if (!planAccess || planAccess.enforcement() !== 'on') return items;
  return planAccess.filterByPlan(user, items, communityOf);
}

export async function planMark<T extends object>(
  planAccess: PlanLists | undefined | null,
  user: Pick<PlanUser, 'role'>,
  items: T[],
  communityOf: (item: T) => string | null | undefined,
): Promise<Array<T & { planLocked?: boolean }>> {
  if (!planAccess || planAccess.enforcement() !== 'on') return items;
  return planAccess.markByPlan(user, items, communityOf);
}
