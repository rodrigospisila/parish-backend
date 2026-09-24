import { BillingCycle, CommunityPlanStatus } from '@prisma/client';

/**
 * Regras PURAS dos planos da plataforma (sem banco) — fonte única para o
 * guard, o /me/entitlements, o painel do SYSTEM_ADMIN e os testes.
 *
 * Unidade do plano: a COMUNIDADE. O fiel nunca paga; se a comunidade não tem
 * acesso, o recurso pago fica indisponível para todos dela.
 */

/**
 * Recursos pagos (por comunidade). `planning` (planejamento pastoral:
 * objetivos/metas/ações) NÃO entra: não faz parte de escalas — é o plano
 * pastoral da paróquia e não estava na lista do dono (fica grátis).
 */
export const PAID_FEATURES = [
  'pastorals',
  'schedules',
  'swaps',
  'catechesis',
  'formation',
  'rooms',
  'visitation',
  'documents',
] as const;

export type PaidFeature = (typeof PAID_FEATURES)[number];

/**
 * Recursos sempre liberados (referência para o app/painel montar o menu).
 * Tudo que não é PAID_FEATURES continua grátis.
 */
export const FREE_FEATURES = [
  'calendar',
  'events',
  'map',
  'liturgy',
  'mass-schedules',
  'masses',
  'tithe',
  'news',
  'prayer-requests',
  'mass-intentions',
  'clergy-messages',
  'saints',
  'planning',
  'sacrament-processes',
  'finance',
] as const;

export type EnforcementMode = 'off' | 'log' | 'on';

/** `PLAN_ENFORCEMENT=off|log|on`; ausente/inválido = `log` (registra, não bloqueia). */
export function parseEnforcement(value: string | undefined | null): EnforcementMode {
  const v = String(value ?? '').trim().toLowerCase();
  if (v === 'off' || v === 'on' || v === 'log') return v;
  return 'log';
}

export interface PlanAccessFields {
  status: CommunityPlanStatus | `${CommunityPlanStatus}`;
  trialEndsAt?: Date | string | null;
  currentPeriodEnd?: Date | string | null;
  graceDays?: number | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_GRACE_DAYS = 15;

function toTime(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const t = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}

/**
 * A comunidade tem acesso aos recursos pagos?
 * - sem plano (null) / FREE / SUSPENDED / CANCELED → não
 * - TRIAL → só enquanto trialEndsAt > agora
 * - ACTIVE → sim
 * - PAST_DUE → até currentPeriodEnd + graceDays (sem currentPeriodEnd → não)
 */
export function hasPaidAccess(plan: PlanAccessFields | null | undefined, now: Date = new Date()): boolean {
  if (!plan) return false;
  const nowMs = now.getTime();

  switch (plan.status) {
    case 'ACTIVE':
      return true;
    case 'TRIAL': {
      const ends = toTime(plan.trialEndsAt);
      return ends !== null && ends > nowMs;
    }
    case 'PAST_DUE': {
      const end = toTime(plan.currentPeriodEnd);
      if (end === null) return false;
      const grace = plan.graceDays ?? DEFAULT_GRACE_DAYS;
      return end + Math.max(0, grace) * DAY_MS > nowMs;
    }
    default:
      return false;
  }
}

/** Soma um ciclo de cobrança (mês/ano do calendário, em UTC). */
export function addCycle(from: Date, cycle: BillingCycle | `${BillingCycle}`): Date {
  const d = new Date(from.getTime());
  if (cycle === 'YEARLY') d.setUTCFullYear(d.getUTCFullYear() + 1);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d;
}

export function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * DAY_MS);
}

/** Valor mensal equivalente (para MRR): anual / 12, arredondado. */
export function monthlyEquivalentCents(priceCents: number, cycle: BillingCycle | `${BillingCycle}` | null | undefined): number {
  if (!Number.isFinite(priceCents) || priceCents <= 0) return 0;
  return cycle === 'YEARLY' ? Math.round(priceCents / 12) : priceCents;
}

export function isPaidFeature(value: string): value is PaidFeature {
  return (PAID_FEATURES as readonly string[]).includes(value);
}
