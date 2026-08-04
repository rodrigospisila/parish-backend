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
import { MassScheduleType } from '@prisma/client';

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
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number; // 0 = Domingo, 6 = Sábado

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
