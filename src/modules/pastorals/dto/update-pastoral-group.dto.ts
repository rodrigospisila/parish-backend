import { IsString, IsOptional, IsEnum } from 'class-validator';
import { EntityStatus } from '@prisma/client';

export class UpdatePastoralGroupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;

  @IsOptional()
  @IsString()
  parentGroupId?: string;
}
