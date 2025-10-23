import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  Min,
} from 'class-validator';
import { IntentionType } from '@prisma/client';

export class CreateMassIntentionDto {
  @IsString()
  @IsNotEmpty()
  intentionFor: string; // Nome da pessoa

  @IsEnum(IntentionType)
  type: IntentionType;

  @IsDateString()
  @IsNotEmpty()
  requestedDate: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @IsString()
  @IsNotEmpty()
  requestedBy: string; // Email ou nome do solicitante

  @IsString()
  @IsNotEmpty()
  communityId: string;
}

