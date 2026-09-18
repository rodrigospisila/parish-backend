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
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MassRecurrence, MassScheduleType } from '@prisma/client';

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

  @IsString()
  @IsNotEmpty()
  time: string; // Formato HH:MM

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
