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
import { EventType, EventStatus } from '@prisma/client';

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

  @IsString()
  @IsOptional()
  recurrenceRule?: string; // iCal RRULE format

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

