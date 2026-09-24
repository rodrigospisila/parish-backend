import { BadRequestException } from '@nestjs/common';
import { BillingCycle, CommunityPlanStatus } from '@prisma/client';
import { addCycle, addDays } from './plan-rules';
import type { PlanAction } from './dto/update-community-plan.dto';

/**
 * Transições do plano de uma comunidade (PATCH /platform/plans/:communityId)
 * — lógica PURA: recebe o estado atual e devolve o que gravar.
 */

export const DEFAULT_TRIAL_DAYS = 30;

export interface TierInfo {
  id: string;
  key: string;
  isActive: boolean;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
}

export interface CurrentPlan {
  status: CommunityPlanStatus;
  tierId: string | null;
  tier?: TierInfo | null;
  billingCycle: BillingCycle | null;
  priceCents: number | null;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
}

export interface TransitionInput {
  action: PlanAction;
  billingCycle?: BillingCycle;
  priceCents?: number;
  until?: string;
}

export interface TransitionResult {
  fromStatus: CommunityPlanStatus;
  toStatus: CommunityPlanStatus;
  /** Campos a gravar em CommunityPlan (create ou update) */
  data: {
    status: CommunityPlanStatus;
    tierId?: string | null;
    billingCycle?: BillingCycle | null;
    priceCents?: number | null;
    trialEndsAt?: Date | null;
    currentPeriodEnd?: Date | null;
    suspendedAt?: Date | null;
  };
}

export function tierPrice(tier: Pick<TierInfo, 'monthlyPriceCents' | 'yearlyPriceCents'>, cycle: BillingCycle): number {
  return cycle === BillingCycle.YEARLY ? tier.yearlyPriceCents : tier.monthlyPriceCents;
}

function parseUntil(until: string | undefined, now: Date): Date | null {
  if (!until) return null;
  const date = new Date(until);
  if (!Number.isFinite(date.getTime())) throw new BadRequestException('Data "until" inválida');
  if (date.getTime() <= now.getTime()) throw new BadRequestException('A data "until" precisa estar no futuro');
  return date;
}

function later(a: Date | null, b: Date): Date {
  return a && a.getTime() > b.getTime() ? a : b;
}

function requireFrom(action: PlanAction, from: CommunityPlanStatus, allowed: CommunityPlanStatus[]) {
  if (!allowed.includes(from)) {
    throw new BadRequestException(`${action} não se aplica a um plano ${from} (aceito: ${allowed.join(', ')})`);
  }
}

/**
 * @param current plano atual (null = sem registro = FREE)
 * @param tier faixa informada em `tierKey` (já buscada; null se não informada)
 */
export function planTransition(
  current: CurrentPlan | null,
  input: TransitionInput,
  tier: TierInfo | null,
  now: Date = new Date(),
): TransitionResult {
  const S = CommunityPlanStatus;
  const from = current?.status ?? S.FREE;
  const until = parseUntil(input.until, now);

  switch (input.action) {
    case 'START_TRIAL': {
      // Plano pago em dia não volta para teste (use EXTEND ou SET_FREE antes)
      requireFrom('START_TRIAL', from, [S.FREE, S.TRIAL, S.SUSPENDED, S.CANCELED]);
      return {
        fromStatus: from,
        toStatus: S.TRIAL,
        data: {
          status: S.TRIAL,
          trialEndsAt: until ?? addDays(now, DEFAULT_TRIAL_DAYS),
          suspendedAt: null,
          ...(tier ? { tierId: tier.id } : {}),
        },
      };
    }

    case 'ACTIVATE': {
      if (!tier || !input.billingCycle) {
        throw new BadRequestException('ACTIVATE exige tierKey e billingCycle');
      }
      if (!tier.isActive) throw new BadRequestException(`A faixa ${tier.key} está inativa`);
      const cycle = input.billingCycle;
      return {
        fromStatus: from,
        toStatus: S.ACTIVE,
        data: {
          status: S.ACTIVE,
          tierId: tier.id,
          billingCycle: cycle,
          priceCents: input.priceCents ?? tierPrice(tier, cycle),
          currentPeriodEnd: until ?? addCycle(now, cycle),
          suspendedAt: null,
        },
      };
    }

    case 'SUSPEND': {
      requireFrom('SUSPEND', from, [S.TRIAL, S.ACTIVE, S.PAST_DUE]);
      return { fromStatus: from, toStatus: S.SUSPENDED, data: { status: S.SUSPENDED, suspendedAt: now } };
    }

    case 'REACTIVATE': {
      requireFrom('REACTIVATE', from, [S.SUSPENDED, S.PAST_DUE, S.CANCELED]);
      const useTier = tier ?? current?.tier ?? null;
      const cycle = input.billingCycle ?? current?.billingCycle ?? null;
      if (!useTier || !cycle) {
        throw new BadRequestException('REACTIVATE precisa de faixa e ciclo (informe tierKey e billingCycle)');
      }
      // Preço combinado antes vale se a faixa e o ciclo não mudaram
      const keepsPrice = !tier && !input.billingCycle && current?.priceCents != null;
      return {
        fromStatus: from,
        toStatus: S.ACTIVE,
        data: {
          status: S.ACTIVE,
          tierId: useTier.id,
          billingCycle: cycle,
          priceCents: input.priceCents ?? (keepsPrice ? current!.priceCents : tierPrice(useTier, cycle)),
          currentPeriodEnd:
            until ??
            (current?.currentPeriodEnd && current.currentPeriodEnd.getTime() > now.getTime()
              ? current.currentPeriodEnd
              : addCycle(now, cycle)),
          suspendedAt: null,
        },
      };
    }

    case 'CANCEL': {
      requireFrom('CANCEL', from, [S.TRIAL, S.ACTIVE, S.PAST_DUE, S.SUSPENDED]);
      return { fromStatus: from, toStatus: S.CANCELED, data: { status: S.CANCELED } };
    }

    case 'SET_FREE': {
      if (from === S.FREE) throw new BadRequestException('A comunidade já está no plano gratuito');
      return { fromStatus: from, toStatus: S.FREE, data: { status: S.FREE, suspendedAt: null } };
    }

    case 'EXTEND': {
      if (from === S.TRIAL) {
        return {
          fromStatus: from,
          toStatus: from,
          data: {
            status: from,
            trialEndsAt: until ?? addDays(later(current?.trialEndsAt ?? null, now), DEFAULT_TRIAL_DAYS),
          },
        };
      }
      if (from === S.ACTIVE || from === S.PAST_DUE) {
        const cycle = current?.billingCycle ?? BillingCycle.MONTHLY;
        return {
          fromStatus: from,
          toStatus: from,
          data: {
            status: from,
            currentPeriodEnd: until ?? addCycle(later(current?.currentPeriodEnd ?? null, now), cycle),
          },
        };
      }
      throw new BadRequestException(`EXTEND não se aplica a um plano ${from} (aceito: TRIAL, ACTIVE, PAST_DUE)`);
    }

    default:
      throw new BadRequestException(`Ação desconhecida: ${String((input as any).action)}`);
  }
}
