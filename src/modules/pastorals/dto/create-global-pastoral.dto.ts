import { IsString, IsOptional, IsEnum, IsHexColor, IsBoolean } from 'class-validator';
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

  /**
   * Esta pastoral é a Catequese / Iniciação à Vida Cristã: quem a coordena
   * coordena a catequese da comunidade (substitui a detecção pelo nome).
   */
  @IsBoolean()
  @IsOptional()
  isCatechesis?: boolean;
}
