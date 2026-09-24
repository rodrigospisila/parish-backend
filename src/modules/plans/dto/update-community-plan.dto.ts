import { BillingCycle } from '@prisma/client';
import { IsEnum, IsIn, IsInt, IsISO8601, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export const PLAN_ACTIONS = [
  'START_TRIAL',
  'ACTIVATE',
  'SUSPEND',
  'REACTIVATE',
  'CANCEL',
  'SET_FREE',
  'EXTEND',
] as const;

export type PlanAction = (typeof PLAN_ACTIONS)[number];

export class UpdateCommunityPlanDto {
  @IsIn(PLAN_ACTIONS as unknown as string[])
  action: PlanAction;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  tierKey?: string;

  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;

  /** Preço combinado por ciclo, em centavos (padrão: o da faixa) */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  priceCents?: number;

  /** Data-limite (ISO): fim do teste, do período pago ou da prorrogação */
  @IsOptional()
  @IsISO8601()
  until?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
