import { IsString, IsOptional, IsEnum } from 'class-validator';
import { EntityStatus } from '@prisma/client';

export class CreatePastoralGroupDto {
  @IsString()
  name: string;

  @IsString()
  communityPastoralId: string;

  @IsString()
  @IsOptional()
  parentGroupId?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  photoUrl?: string;

  @IsEnum(EntityStatus)
  @IsOptional()
  status?: EntityStatus;
}
