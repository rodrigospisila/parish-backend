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
 * - `free`: leitura mínima usada por uma tela GRÁTIS. Só vale quando
 *   `when(req)` é verdadeiro; o resto da rota continua pago. (Nenhuma entrada
 *   hoje — o tipo fica disponível.)
 *
 * O spec (plan-routes.spec.ts) confere que cada chave existe de verdade no
 * controller — renomear o método sem atualizar aqui quebra o teste.
 */
export type PlanRouteRule =
  | { kind: 'personal' }
  | { kind: 'free'; reason: string; when: (req: { query?: any; params?: any; body?: any }) => boolean };

export const PLAN_ROUTE_RULES: Readonly<Record<string, PlanRouteRule>> = {
  // A21 — rotas "minhas": vale a comunidade do recurso
  'CatechesisController.myClasses': { kind: 'personal' },
  'CatechesisController.myFamily': { kind: 'personal' },
  'SchedulesController.findMyAssignments': { kind: 'personal' },
  'SwapsController.mine': { kind: 'personal' },
  'JoinRequestsController.mine': { kind: 'personal' },

  // Sem exceções `free` no momento. A B12 (escalas de UM evento para o
  // calendário grátis — GET /schedules?eventId=) saiu no lançamento de
  // 11/11/2026: evento passou a ser recurso pago.
};

export function planRouteRule(cls: { name?: string } | undefined, handler: { name?: string } | undefined): PlanRouteRule | null {
  if (!cls?.name || !handler?.name) return null;
  return PLAN_ROUTE_RULES[`${cls.name}.${handler.name}`] ?? null;
}
