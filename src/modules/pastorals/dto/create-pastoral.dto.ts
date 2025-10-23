import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { EntityStatus } from '@prisma/client';

export class CreatePastoralDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  mission?: string;

  @IsString()
  @IsOptional()
  photoUrl?: string;

  @IsDateString()
  @IsOptional()
  foundedAt?: string;

  @IsEnum(EntityStatus)
  @IsOptional()
  status?: EntityStatus;

  @IsString()
  @IsNotEmpty()
  communityId: string;
}

