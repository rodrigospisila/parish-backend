import { randomBytes } from 'crypto';
import { BillingCycle, CommunityPlanStatus } from '@prisma/client';
import { DEFAULT_PARISH_TIME_ZONE } from '../../common/schedule-time';
import { addCycle } from '../plans/plan-rules';
import { tierPrice } from '../plans/plan-transitions';

/**
 * Regras PURAS da assinatura da plataforma (Onda 1, C3): valor por ciclo,
 * primeira data de cobrança e período pago a partir do vencimento.
 */

export type Cycle = BillingCycle | `${BillingCycle}`;

export interface PricingTier {
  id: string;
  key: string;
  name: string;
  isActive: boolean;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
}

export interface PricingPlan {
  status: CommunityPlanStatus | `${CommunityPlanStatus}`;
  tierId: string | null;
  billingCycle: Cycle | null;
  priceCents: number | null;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
}

export interface PricingItem {
  communityId: string;
  tier: PricingTier;
  plan: PricingPlan | null;
}

export interface PriceLine {
  communityId: string;
  tierId: string;
  tierKey: string;
  priceCents: number;
  /** Preço combinado pelo SYSTEM_ADMIN (ex.: Paróquia Fundadora) em vez do da faixa */
  negotiated: boolean;
}

export interface SubscriptionPricing {
  lines: PriceLine[];
  /** Comunidades do piloto (ACTIVE sem prazo): acesso total, nunca entram na cobrança */
  skippedCommunityIds: string[];
  valueCents: number;
}

/** Piloto (Imbituva + Santa Rita): ACTIVE sem currentPeriodEnd — contrato sem renovação; ninguém mexe. */
export function isPilotPlan(plan: Pick<PricingPlan, 'status' | 'currentPeriodEnd'> | null | undefined): boolean {
  return !!plan && plan.status === CommunityPlanStatus.ACTIVE && !plan.currentPeriodEnd;
}

/**
 * Valor da assinatura = soma das faixas no ciclo (anual = yearlyPriceCents).
 * Preço combinado (CommunityPlan.priceCents com a mesma faixa e ciclo, gravado
 * pelo SYSTEM_ADMIN no PATCH /platform/plans) vale quando for menor que o da
 * faixa — desconto de fundador; nunca cobra acima da tabela atual.
 */
export function priceSubscription(items: PricingItem[], cycle: Cycle): SubscriptionPricing {
  const lines: PriceLine[] = [];
  const skippedCommunityIds: string[] = [];
  for (const item of items) {
    if (isPilotPlan(item.plan)) {
      skippedCommunityIds.push(item.communityId);
      continue;
    }
    const table = tierPrice(item.tier, cycle as BillingCycle);
    const combined =
      item.plan &&
      item.plan.priceCents != null &&
      item.plan.tierId === item.tier.id &&
      item.plan.billingCycle === cycle &&
      item.plan.priceCents >= 0
        ? item.plan.priceCents
        : null;
    const negotiated = combined !== null && combined < table;
    lines.push({
      communityId: item.communityId,
      tierId: item.tier.id,
      tierKey: item.tier.key,
      priceCents: negotiated ? combined! : table,
      negotiated,
    });
  }
  return { lines, skippedCommunityIds, valueCents: lines.reduce((sum, line) => sum + line.priceCents, 0) };
}

/** AAAA-MM-DD no fuso de Brasília. */
export function ymdInBrazil(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: DEFAULT_PARISH_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** dd/mm/aaaa no fuso de Brasília (textos da régua). */
export function brDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: DEFAULT_PARISH_TIME_ZONE }).format(date);
}

/** Fim do dia AAAA-MM-DD em Brasília (23:59:59 -03:00). */
export function endOfBrazilDay(ymd: string): Date {
  return new Date(`${ymd}T23:59:59.000-03:00`);
}

/**
 * Primeira cobrança: hoje, ou o fim do acesso que a comunidade já tem (teste
 * em andamento ou período pago), o que vier PRIMEIRO entre as comunidades —
 * quem contrata no meio do teste não perde os dias restantes, e nenhuma
 * comunidade fica sem acesso esperando a cobrança.
 */
export function firstDueDate(items: Array<{ plan: PricingPlan | null }>, now: Date): string {
  const today = ymdInBrazil(now);
  let earliest: string | null = null;
  for (const { plan } of items) {
    let until: Date | null = null;
    if (plan?.status === CommunityPlanStatus.TRIAL) until = plan.trialEndsAt;
    else if (plan?.status === CommunityPlanStatus.ACTIVE || plan?.status === CommunityPlanStatus.PAST_DUE) {
      until = plan.currentPeriodEnd;
    }
    const day = until && until.getTime() > now.getTime() ? ymdInBrazil(until) : today;
    if (earliest === null || day < earliest) earliest = day;
  }
  if (earliest === null || earliest < today) return today;
  return earliest;
}

/** Período pago por uma cobrança: vencimento + ciclo (até o fim do dia, em Brasília). */
export function periodEndFromDueDate(dueDate: string, cycle: Cycle): Date {
  return addCycle(endOfBrazilDay(dueDate.slice(0, 10)), cycle);
}

/** Status da cobrança Asaas que já é pagamento (não regride para pendente/vencida). */
export const PAID_PAYMENT_STATUSES = new Set(['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH']);
/** Cobranças em aberto (a fatura ainda aceita pagamento). */
export const OPEN_PAYMENT_STATUSES = new Set(['PENDING', 'OVERDUE', 'AWAITING_RISK_ANALYSIS']);

/** Evita que um evento antigo (ex.: PAYMENT_CREATED reentregue) volte uma cobrança paga para pendente. */
export function nextPaymentStatus(current: string | null | undefined, incoming: string): string {
  const cur = String(current ?? '').toUpperCase();
  const inc = String(incoming ?? '').toUpperCase();
  if (PAID_PAYMENT_STATUSES.has(cur) && OPEN_PAYMENT_STATUSES.has(inc)) return cur;
  return inc;
}

/** Eventos de estorno/chargeback: alertam o SYSTEM_ADMIN; os planos não mudam sozinhos. */
export const REFUND_EVENTS = new Set([
  'PAYMENT_REFUNDED',
  'PAYMENT_PARTIALLY_REFUNDED',
  'PAYMENT_REFUND_IN_PROGRESS',
  'PAYMENT_CHARGEBACK_REQUESTED',
  'PAYMENT_CHARGEBACK_DISPUTE',
  'PAYMENT_AWAITING_CHARGEBACK_REVERSAL',
]);

export const PAID_EVENTS = new Set(['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED']);

/** Eventos a marcar no webhook da conta da empresa no Asaas. */
export const PLATFORM_WEBHOOK_EVENTS = [
  'PAYMENT_CREATED',
  'PAYMENT_UPDATED',
  'PAYMENT_CONFIRMED',
  'PAYMENT_RECEIVED',
  'PAYMENT_OVERDUE',
  'PAYMENT_DELETED',
  'PAYMENT_RESTORED',
  'PAYMENT_REFUNDED',
  'PAYMENT_PARTIALLY_REFUNDED',
  'PAYMENT_REFUND_IN_PROGRESS',
  'PAYMENT_CHARGEBACK_REQUESTED',
  'PAYMENT_CHARGEBACK_DISPUTE',
  'PAYMENT_AWAITING_CHARGEBACK_REVERSAL',
  'INVOICE_AUTHORIZED',
] as const;

// ------------------------------------------------------------------
// Cobertura de cada cobrança (revisão S5/S6)
// ------------------------------------------------------------------
//
// Cada POST /billing/checkout (contratação ou alteração) gera um "retrato"
// identificado por checkoutRef:
// - no banco: os CommunityPlanEvent CHECKOUT daquela chamada levam
//   data.checkoutRef, data.billingCycle e data.subscriptionValueCents (uma
//   linha por comunidade cobrada) — sem mudar o schema;
// - no Asaas: o externalReference da assinatura vira
//   "billing:<billingAccountId>:<checkoutRef>" e as cobranças geradas por ela
//   herdam esse valor (o cliente continua "billing:<billingAccountId>").
// O webhook de pago ativa SÓ as comunidades e o ciclo do retrato da própria
// cobrança, nunca a configuração atual da conta.

export const BILLING_REF_PREFIX = 'billing:';

/** Identificador do retrato: instante (base 36) + aleatório. */
export function newCheckoutRef(now: Date, random: string = randomBytes(4).toString('hex')): string {
  return `${now.getTime().toString(36)}-${random}`;
}

/** externalReference do Asaas: cliente = "billing:<conta>"; assinatura/cobrança = "billing:<conta>:<retrato>". */
export function billingExternalRef(billingAccountId: string, checkoutRef?: string | null): string {
  return checkoutRef ? `${BILLING_REF_PREFIX}${billingAccountId}:${checkoutRef}` : `${BILLING_REF_PREFIX}${billingAccountId}`;
}

export interface BillingExternalRef {
  billingAccountId: string;
  checkoutRef: string | null;
  /** Quando o retrato foi gerado (lido do próprio checkoutRef) */
  issuedAt: Date | null;
}

export function parseBillingExternalRef(value: unknown): BillingExternalRef | null {
  if (typeof value !== 'string' || !value.startsWith(BILLING_REF_PREFIX)) return null;
  const [billingAccountId, checkoutRef] = value.slice(BILLING_REF_PREFIX.length).split(':');
  if (!billingAccountId) return null;
  let issuedAt: Date | null = null;
  if (checkoutRef) {
    const ms = parseInt(checkoutRef.split('-')[0], 36);
    if (Number.isFinite(ms) && ms > 0) issuedAt = new Date(ms);
  }
  return { billingAccountId, checkoutRef: checkoutRef || null, issuedAt };
}

/** Retrato de uma contratação: ciclo, valor da assinatura e comunidades cobradas. */
export interface CheckoutSnapshot {
  checkoutRef: string;
  createdAt: Date;
  cycle: Cycle;
  valueCents: number;
  communityIds: string[];
}

/** Agrupa os CommunityPlanEvent CHECKOUT por checkoutRef (mais antigo primeiro). Eventos sem retrato ficam de fora. */
export function snapshotsFromCheckoutEvents(events: Array<{ communityId: string; createdAt: Date; data: unknown }>): CheckoutSnapshot[] {
  const byRef = new Map<string, CheckoutSnapshot>();
  for (const event of events) {
    const data = (event.data ?? {}) as Record<string, unknown>;
    const ref = typeof data.checkoutRef === 'string' ? data.checkoutRef : null;
    const cycle = data.billingCycle === BillingCycle.YEARLY || data.billingCycle === BillingCycle.MONTHLY ? (data.billingCycle as Cycle) : null;
    const valueCents = typeof data.subscriptionValueCents === 'number' ? data.subscriptionValueCents : null;
    if (!ref || !cycle || valueCents === null) continue;
    const current = byRef.get(ref);
    if (current) {
      if (!current.communityIds.includes(event.communityId)) current.communityIds.push(event.communityId);
      if (event.createdAt.getTime() < current.createdAt.getTime()) current.createdAt = event.createdAt;
    } else {
      byRef.set(ref, { checkoutRef: ref, createdAt: event.createdAt, cycle, valueCents, communityIds: [event.communityId] });
    }
  }
  return [...byRef.values()].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

/**
 * Retrato que a cobrança paga cobre:
 * 1. o retrato do externalReference da cobrança, se o valor bate;
 * 2. senão, o retrato mais recente DEPOIS dele com o mesmo valor (cobrança em
 *    aberto reajustada pelo updatePendingPayments numa alteração posterior);
 * 3. senão, o próprio retrato da cobrança (foi gerada com ele), desde que o
 *    valor pago não seja menor que o dele (nunca ativa mais do que foi pago);
 * 4. sem retrato no externalReference: o mais recente com o mesmo valor.
 * null = nenhuma contratação corresponde (não ativa nada; o SYSTEM_ADMIN confere).
 */
export function pickChargeCoverage(
  snapshots: CheckoutSnapshot[],
  charge: { checkoutRef: string | null; valueCents: number },
): CheckoutSnapshot | null {
  const latestMatching = (list: CheckoutSnapshot[]) => {
    for (let i = list.length - 1; i >= 0; i -= 1) if (list[i].valueCents === charge.valueCents) return list[i];
    return null;
  };
  if (charge.checkoutRef) {
    const index = snapshots.findIndex((snapshot) => snapshot.checkoutRef === charge.checkoutRef);
    if (index >= 0) {
      const own = snapshots[index];
      if (own.valueCents === charge.valueCents) return own;
      return latestMatching(snapshots.slice(index + 1)) ?? (charge.valueCents >= own.valueCents ? own : null);
    }
  }
  return latestMatching(snapshots);
}
