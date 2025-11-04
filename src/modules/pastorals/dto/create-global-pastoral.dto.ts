import { IsString, IsOptional, IsEnum, IsHexColor } from 'class-validator';
import { EntityStatus } from '@prisma/client';

export class CreateGlobalPastoralDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  mission?: string;

  @IsString()
  @IsOptional()
  iconUrl?: string;

  @IsHexColor()
  @IsOptional()
  colorHex?: string;

  @IsEnum(EntityStatus)
  @IsOptional()
  status?: EntityStatus;
}
