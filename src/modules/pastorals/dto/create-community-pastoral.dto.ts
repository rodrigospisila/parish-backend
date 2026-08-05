import { IsString, IsOptional, IsEnum, IsDateString, IsBoolean } from 'class-validator';
import { EntityStatus } from '@prisma/client';

export class CreateCommunityPastoralDto {
  @IsString()
  globalPastoralId: string;

  @IsString()
  communityId: string;

  @IsString()
  @IsOptional()
  parishPastoralId?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  mission?: string;

  @IsString()
  @IsOptional()
  photoUrl?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsDateString()
  @IsOptional()
  foundedAt?: string;

  /** Regra de escala: casais servem juntos (o rodízio puxa o cônjuge) */
  @IsBoolean()
  @IsOptional()
  scheduleCouplesTogether?: boolean;

  @IsEnum(EntityStatus)
  @IsOptional()
  status?: EntityStatus;
}
