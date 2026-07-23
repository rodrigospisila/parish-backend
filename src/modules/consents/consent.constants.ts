import { NotificationType } from '@prisma/client';

/**
 * Versão vigente da política de privacidade / termos de uso.
 * Incrementar quando o texto mudar de forma material (novo aceite é exigido).
 * Mantida em sincronia com docs/privacidade.md e docs/termos.md.
 */
export const CURRENT_POLICY_VERSION = '2026-07-14';

/**
 * Notificações ESSENCIAIS (operacionais/transacionais): sempre enviadas,
 * independentemente do opt-out de comunicações. São necessárias para a pessoa
 * exercer seu serviço pastoral ou para segurança da conta — não são marketing.
 */
export const ESSENTIAL_NOTIFICATION_TYPES: ReadonlySet<NotificationType> = new Set([
  NotificationType.ASSIGNMENT_CREATED,
  NotificationType.ASSIGNMENT_DECLINED,
  NotificationType.ASSIGNMENT_REPLACED,
  NotificationType.SCHEDULE_CANCELLED,
  NotificationType.SCHEDULE_REMINDER,
]);

/**
 * true quando o tipo de notificação respeita o opt-out de comunicações
 * (informativo/não essencial). Ex.: NEWS, DAILY_LITURGY, EVENT_REMINDER.
 */
export function isOptOutable(type: NotificationType): boolean {
  return !ESSENTIAL_NOTIFICATION_TYPES.has(type);
}
