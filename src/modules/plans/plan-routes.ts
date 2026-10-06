/**
 * Regras do plano declaradas por ROTA (Controller.método), sem mexer nos
 * controllers dos módulos. O PlanFeatureGuard consulta esta tabela antes de
 * decidir:
 *
 * - `personal`: rota "minhas" (sem recurso na URL) — a decisão sai das
 *   comunidades dos RECURSOS do próprio usuário (turma do filho, turma em que
 *   é catequista, escala em que foi escalado, pastoral de que participa), não
 *   da comunidade principal dele. A família da capela com a turma na Matriz
 *   paga passa; quem tem a comunidade principal paga mas só tem recursos em
 *   comunidades sem plano, não.
 * - `free`: leitura mínima usada por uma tela GRÁTIS (calendário). Só vale
 *   quando `when(req)` é verdadeiro; o resto da rota continua pago.
 *
 * O spec (plan-routes.spec.ts) confere que cada chave existe de verdade no
 * controller — renomear o método sem atualizar aqui quebra o teste.
 */
export type PlanRouteRule =
  | { kind: 'personal' }
  | { kind: 'free'; reason: string; when: (req: { query?: any; params?: any; body?: any }) => boolean };

const hasText = (value: unknown) => typeof value === 'string' && value.trim().length > 0;

export const PLAN_ROUTE_RULES: Readonly<Record<string, PlanRouteRule>> = {
  // A21 — rotas "minhas": vale a comunidade do recurso
  'CatechesisController.myClasses': { kind: 'personal' },
  'CatechesisController.myFamily': { kind: 'personal' },
  'SchedulesController.findMyAssignments': { kind: 'personal' },
  'SwapsController.mine': { kind: 'personal' },
  'JoinRequestsController.mine': { kind: 'personal' },

  // B12 — calendário (grátis): o detalhe do evento no app lê as escalas DE UM
  // evento (GET /schedules?eventId=). Sem eventId é a lista de escalas (paga).
  'SchedulesController.findAllSchedules': {
    kind: 'free',
    reason: 'calendário: escalas de um evento',
    when: (req) => hasText(req?.query?.eventId),
  },
};

export function planRouteRule(cls: { name?: string } | undefined, handler: { name?: string } | undefined): PlanRouteRule | null {
  if (!cls?.name || !handler?.name) return null;
  return PLAN_ROUTE_RULES[`${cls.name}.${handler.name}`] ?? null;
}
