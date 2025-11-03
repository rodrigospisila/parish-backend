import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import { EventType, EventStatus, RecurrenceType } from '@prisma/client';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(EventType)
  type: EventType;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @IsEnum(RecurrenceType)
  @IsOptional()
  recurrenceType?: RecurrenceType;

  @IsInt()
  @Min(1)
  @IsOptional()
  recurrenceInterval?: number; // A cada X dias/semanas/meses

  @IsString()
  @IsOptional()
  recurrenceDays?: string; // JSON array de dias da semana [0-6] ou datas específicas

  @IsDateString()
  @IsOptional()
  recurrenceEndDate?: string; // Data de término da recorrência

  @IsString()
  @IsOptional()
  recurrenceRule?: string; // iCal RRULE format (opcional)

  @IsInt()
  @Min(1)
  @IsOptional()
  maxParticipants?: number;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus;

  @IsString()
  @IsNotEmpty()
  communityId: string;
}

