import { Logger } from '@nestjs/common';
import type { PlanAccessService } from '../plans/plan-access.service';

/** Resposta do WhatsApp ao fiel de paróquia sem o dízimo ativo no plano. */
export const TITHE_NOT_ACTIVE_MESSAGE = 'a contribuição pelo Parish não está ativa na sua paróquia no momento';

/**
 * Dízimo é recurso PAGO de nível paróquia. Os caminhos que CRIAM contribuição
 * sem passar pelo guard de rota (WhatsApp, lembrete diário, ativações do
 * PATCH /tithe/config) perguntam aqui: só com PLAN_ENFORCEMENT=on e NENHUMA
 * comunidade da paróquia com acesso a criação fica bloqueada. Em off/log nada
 * muda. Sem PlanAccessService (specs antigos) ou com falha na consulta, libera
 * — cobrança nunca derruba o dízimo. Mesma regra de
 * `TitheGuestService.offersBlockedByPlan`.
 */
export async function titheBlockedByPlan(
  planAccess: Pick<PlanAccessService, 'enforcement' | 'targetHasAccess'> | undefined | null,
  parishId: string,
  logger?: Logger,
): Promise<boolean> {
  if (!planAccess || planAccess.enforcement() !== 'on') return false;
  try {
    return !(await planAccess.targetHasAccess({ parishId }));
  } catch (error) {
    logger?.error(`Falha ao verificar o plano (tithe) da paróquia ${parishId} — liberado: ${error}`);
    return false;
  }
}
