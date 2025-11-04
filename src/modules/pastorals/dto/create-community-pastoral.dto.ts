import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
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

  @IsEnum(EntityStatus)
  @IsOptional()
  status?: EntityStatus;
}
