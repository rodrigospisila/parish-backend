import {
  IsInt,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsArray,
  ValidateNested,
  Matches,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { MassRecurrence, MassScheduleType } from '@prisma/client';

/** "7:30" → "07:30" (e " 19:00 " → "19:00"); o resto passa como veio para a validação. */
export function normalizeHhMm(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return /^\d:\d{2}$/.test(trimmed) ? trimmed.padStart(5, '0') : trimmed;
}

/** Configuração de uma pastoral vinculada ao horário fixo (espelha o evento). */
export class MassSchedulePastoralSettingDto {
  @IsString()
  @IsNotEmpty()
  communityPastoralId: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  requiredPeople?: number;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsBoolean()
  isLeader?: boolean;
}

export class CreateMassScheduleDto {
  /**
   * 0 = Domingo, 6 = Sábado. Obrigatório, menos em MONTHLY_DAY ("todo dia 13"),
   * que não tem dia da semana. A coerência entre recorrência e campos é
   * conferida no serviço e também por CHECK no banco.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  /** WEEKLY (padrão), MONTHLY_NTH ("1º e 3º sábado") ou MONTHLY_DAY ("todo dia 13"). */
  @IsOptional()
  @IsEnum(MassRecurrence)
  recurrence?: MassRecurrence;

  /** MONTHLY_NTH: quais ocorrências do mês. 1 a 5, e -1 para a última. */
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(-1, { each: true })
  @Max(5, { each: true })
  weeksOfMonth?: number[];

  /** MONTHLY_DAY: dia do mês. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  /**
   * HH:MM de 00:00 a 23:59 — "25:70" virava 02:10 do dia seguinte, e a
   * suspensão não casava. "H:MM" (horário legado "7:30") vira "07:30" antes
   * da validação: editar o horário antigo dava 400 (R3#49).
   */
  @Transform(({ value }) => normalizeHhMm(value))
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Hora inválida: use HH:MM, de 00:00 a 23:59' })
  time: string;

  @IsEnum(MassScheduleType)
  type: MassScheduleType;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  isSpecial?: boolean;

  @IsDateString()
  @IsOptional()
  specialDate?: string;

  @IsString()
  @IsNotEmpty()
  communityId: string;

  /** Pastorais vinculadas a este horário fixo (base para gerar escalas). */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MassSchedulePastoralSettingDto)
  pastoralSettings?: MassSchedulePastoralSettingDto[];
}
