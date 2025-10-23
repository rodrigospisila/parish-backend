import {
  IsInt,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { MassScheduleType } from '@prisma/client';

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
}

