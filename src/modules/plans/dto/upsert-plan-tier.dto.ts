import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

/**
 * PUT /platform/tiers/:key — edita a faixa (ou cria, se a chave não existir:
 * aí `name`, `monthlyPriceCents` e `yearlyPriceCents` são obrigatórios).
 * `maxMembers: null` = sem limite; `description: null` limpa.
 */
export class UpsertPlanTierDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000_000)
  maxMembers?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  monthlyPriceCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  yearlyPriceCents?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  sortOrder?: number;
}
