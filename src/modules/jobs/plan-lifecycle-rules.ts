import { CommunityPlanStatus, Prisma } from '@prisma/client';
import { DEFAULT_GRACE_DAYS } from '../plans/plan-rules';
import { brDate, ymdInBrazil } from '../billing/billing-rules';

/**
 * Régua de teste/cobrança (Onda 1, C3) — regras PURAS: qual aviso cabe a cada
 * plano hoje. O dedupe é por (kind, refKey) em PlanNotice; o refKey leva a
 * data de referência, então um teste estendido ou um período novo recomeçam
 * a régua sem repetir os avisos antigos.
 */

export const NOTICE_KINDS = [
  'TRIAL_D7',
  'TRIAL_D3',
  'TRIAL_D1',
  'TRIAL_ENDED',
  'PAST_DUE_D1',
  'PAST_DUE_D7',
  'GRACE_D3',
  'SUSPENDED',
] as const;

export type NoticeKind = (typeof NOTICE_KINDS)[number];

const DAY_MS = 24 * 60 * 60 * 1000;
/** Avisos de "terminou"/"suspenso" só nos primeiros dias (o 1º deploy não dispara avisos de meses atrás). */
export const LATE_NOTICE_WINDOW_DAYS = 7;

export interface LifecyclePlan {
  communityId: string;
  status: CommunityPlanStatus | `${CommunityPlanStatus}`;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  graceDays: number | null;
  /** Status da conta de faturamento que paga o plano (null = nenhuma) */
  billingStatus?: string | null;
}

export interface DueNotice {
  kind: NoticeKind;
  communityId: string;
  refKey: string;
  /** Data citada no texto (fim do teste ou fim da carência) */
  date: Date;
}

/**
 * Já contratou: os avisos de fim de teste ("contrate em...") não fazem sentido
 * (S9). PENDING = assinatura criada e 1ª cobrança em aberto — inclusive boleto
 * pago no vencimento e ainda compensando (1 a 3 dias úteis); PAST_DUE = a
 * cobrança venceu (a própria cobrança do provedor avisa). ACTIVE = pago.
 * NONE/CANCELED (ou sem conta) seguem recebendo a régua.
 */
export const CONTRACTED_BILLING_STATUSES: ReadonlySet<string> = new Set(['PENDING', 'ACTIVE', 'PAST_DUE']);

/**
 * Paróquia do piloto (Imbituva + Santa Rita, acesso total — S11). Critério
 * explícito: a paróquia tem ALGUMA comunidade (excluída ou não) com
 *  (a) plano ACTIVE sem `currentPeriodEnd` e nota de piloto (`notes` contém
 *      "piloto", sem diferença de caixa — o script grava "Piloto — acesso
 *      total (decisão de 19/10/2026)"), ou
 *  (b) um evento de plano `PILOT_FULL_ACCESS` (prisma/platform/piloto-acesso-total.ts).
 * Paróquia piloto nunca ganha teste automático nem recebe a régua, mesmo que
 * passe a ter `managedAt` (convite de titular aceito, reivindicação aprovada).
 */
export const PILOT_EVENT_ACTION = 'PILOT_FULL_ACCESS';
export const PILOT_NOTE_MARKER = 'piloto';

export function pilotParishWhere(): Prisma.ParishWhereInput {
  return {
    communities: {
      some: {
        OR: [
          {
            communityPlan: {
              is: {
                status: CommunityPlanStatus.ACTIVE,
                currentPeriodEnd: null,
                notes: { contains: PILOT_NOTE_MARKER, mode: 'insensitive' },
              },
            },
          },
          { communityPlanEvents: { some: { action: PILOT_EVENT_ACTION } } },
        ],
      },
    },
  };
}

export function dueNotice(plan: LifecyclePlan, now: Date): DueNotice | null {
  const nowMs = now.getTime();

  if (plan.status === CommunityPlanStatus.TRIAL && plan.trialEndsAt) {
    const end = plan.trialEndsAt;
    const refKey = `${plan.communityId}:${ymdInBrazil(end)}`;
    const left = end.getTime() - nowMs;
    // Quem já contratou (ou pagou e a compensação não chegou) não recebe "contrate"
    if (plan.billingStatus && CONTRACTED_BILLING_STATUSES.has(plan.billingStatus)) return null;
    if (left > 0) {
      const days = Math.ceil(left / DAY_MS);
      const kind: NoticeKind | null = days <= 1 ? 'TRIAL_D1' : days <= 3 ? 'TRIAL_D3' : days <= 7 ? 'TRIAL_D7' : null;
      return kind ? { kind, communityId: plan.communityId, refKey, date: end } : null;
    }
    if (-left < LATE_NOTICE_WINDOW_DAYS * DAY_MS) {
      return { kind: 'TRIAL_ENDED', communityId: plan.communityId, refKey, date: end };
    }
    return null;
  }

  // Pago com prazo (o piloto, ACTIVE sem currentPeriodEnd, nunca entra aqui)
  if ((plan.status === CommunityPlanStatus.ACTIVE || plan.status === CommunityPlanStatus.PAST_DUE) && plan.currentPeriodEnd) {
    const end = plan.currentPeriodEnd.getTime();
    if (end > nowMs) return null;
    const graceEnd = new Date(end + Math.max(0, plan.graceDays ?? DEFAULT_GRACE_DAYS) * DAY_MS);
    const refKey = `${plan.communityId}:${ymdInBrazil(plan.currentPeriodEnd)}`;
    if (graceEnd.getTime() <= nowMs) {
      return nowMs - graceEnd.getTime() < LATE_NOTICE_WINDOW_DAYS * DAY_MS
        ? { kind: 'SUSPENDED', communityId: plan.communityId, refKey, date: graceEnd }
        : null;
    }
    const graceLeft = Math.ceil((graceEnd.getTime() - nowMs) / DAY_MS);
    if (graceLeft <= 3) return { kind: 'GRACE_D3', communityId: plan.communityId, refKey, date: graceEnd };
    const since = Math.floor((nowMs - end) / DAY_MS);
    if (since >= 7) return { kind: 'PAST_DUE_D7', communityId: plan.communityId, refKey, date: graceEnd };
    if (since >= 1) return { kind: 'PAST_DUE_D1', communityId: plan.communityId, refKey, date: graceEnd };
  }
  return null;
}

export interface NoticeMessageInput {
  parishName: string;
  communities: Array<{ name: string; date: Date }>;
  /** Página "Plano e assinatura" no painel */
  planUrl: string;
  supportLine?: string | null;
  /** A assinatura foi cancelada pela paróquia */
  canceled?: boolean;
}

export interface NoticeMessage {
  subject: string;
  text: string;
  /** Título e corpo curtos da notificação in-app/push */
  title: string;
  body: string;
}

const PAID_LIST = 'pastorais, escalas e trocas, catequese, formação, salas, visitas e documentos';
const FREE_LIST = 'Calendário, eventos, mapa e liturgia continuam grátis.';
const NOTHING_DELETED = 'Nenhum dado é apagado: tudo volta assim que o plano for contratado ou o pagamento confirmado.';

/** Texto simples (pt-BR) do aviso agrupado por paróquia. */
export function noticeMessage(kind: NoticeKind, input: NoticeMessageInput): NoticeMessage {
  const list = input.communities.map((c) => `- ${c.name} (${brDate(c.date)})`).join('\n');
  const names = input.communities.map((c) => c.name).join(', ');
  const date = input.communities.length ? brDate(input.communities[0].date) : '';
  const many = input.communities.length > 1;
  const one = (singular: string, plural: string) => (many ? plural : singular);
  let subject: string;
  let lead: string;
  let action: string;
  let body: string;

  switch (kind) {
    case 'TRIAL_D7':
    case 'TRIAL_D3':
    case 'TRIAL_D1': {
      const when = kind === 'TRIAL_D1' ? 'amanhã' : kind === 'TRIAL_D3' ? 'em 3 dias' : 'em 7 dias';
      subject = `Parish: o teste termina ${when}`;
      lead = `O período de teste do Parish termina ${when} (${date}) ${one('na comunidade', 'nas comunidades')}:`;
      action = `Para continuar usando ${PAID_LIST}, contrate o plano em:\n${input.planUrl}\n\n${FREE_LIST}`;
      body = `O teste de ${names} termina ${when} (${date}). Contrate em Plano e assinatura.`;
      break;
    }
    case 'TRIAL_ENDED':
      subject = 'Parish: o teste terminou';
      lead = `O período de teste do Parish terminou em ${date} ${one('na comunidade', 'nas comunidades')}:`;
      action = `Os recursos pagos (${PAID_LIST}) ficaram indisponíveis. ${NOTHING_DELETED}\n\nContrate em:\n${input.planUrl}\n\n${FREE_LIST}`;
      body = `O teste de ${names} terminou. Seus dados continuam guardados; contrate em Plano e assinatura.`;
      break;
    case 'PAST_DUE_D1':
    case 'PAST_DUE_D7':
      subject = input.canceled
        ? 'Parish: o período pago terminou'
        : kind === 'PAST_DUE_D7'
          ? 'Parish: lembrete — pagamento da assinatura em atraso'
          : 'Parish: pagamento da assinatura em atraso';
      lead = input.canceled
        ? `A assinatura foi cancelada e o período pago terminou ${one('na comunidade', 'nas comunidades')}:`
        : `Ainda não identificamos o pagamento da assinatura do Parish ${one('da comunidade', 'das comunidades')}:`;
      action =
        `O acesso continua durante a carência, até ${date}. ` +
        (input.canceled
          ? `Para continuar, contrate de novo em:\n${input.planUrl}`
          : `Pague pela fatura (o link está no e-mail de cobrança e em Plano e assinatura):\n${input.planUrl}\n\nSe já pagou, desconsidere este aviso.`);
      body = input.canceled
        ? `O período pago de ${names} terminou. Acesso até ${date}.`
        : `Pagamento da assinatura de ${names} em atraso. Acesso até ${date}.`;
      break;
    case 'GRACE_D3':
      subject = 'Parish: a carência termina em breve';
      lead = `A carência da assinatura do Parish termina em ${date} ${one('para a comunidade', 'para as comunidades')}:`;
      action = `Depois disso, ${PAID_LIST} ficam suspensos até o pagamento. ${NOTHING_DELETED}\n\nRegularize em:\n${input.planUrl}`;
      body = `A carência de ${names} termina em ${date}. Regularize em Plano e assinatura.`;
      break;
    case 'SUSPENDED':
    default:
      subject = 'Parish: recursos pagos suspensos';
      lead = `Os recursos pagos do Parish foram suspensos por falta de pagamento ${one('na comunidade', 'nas comunidades')}:`;
      action = `${NOTHING_DELETED} ${FREE_LIST}\n\nRegularize em:\n${input.planUrl}`;
      body = `Recursos pagos de ${names} suspensos. Nenhum dado foi apagado.`;
      break;
  }

  const text = [
    'Olá!',
    '',
    `${lead}\n${list}`,
    '',
    action,
    ...(input.supportLine ? ['', input.supportLine] : []),
    '',
    `Paróquia: ${input.parishName}`,
    'Equipe Parish',
  ].join('\n');
  return { subject, text, title: subject.replace(/^Parish: /, ''), body: body.slice(0, 240) };
}
