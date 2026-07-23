import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsEnum,
  IsOptional,
  MinLength,
  IsArray,
  IsBoolean,
  IsString as IsStringEach,
} from 'class-validator';
import { UserRole, ClergyTitle } from '@prisma/client';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  // null limpa o telefone (users.phone é unique; vazio é normalizado para null no service)
  @IsString()
  @IsOptional()
  phone?: string | null;

  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  // Cargo eclesiástico (opcional): Bispo/Pároco/Diácono. null limpa.
  @IsEnum(ClergyTitle)
  @IsOptional()
  clergyTitle?: ClergyTitle | null;

  @IsString()
  @IsOptional()
  dioceseId?: string;

  @IsString()
  @IsOptional()
  parishId?: string;

  @IsString()
  @IsOptional()
  communityId?: string;

  @IsArray()
  @IsOptional()
  communityIds?: string[];

  @IsArray()
  @IsOptional()
  @IsStringEach({ each: true })
  pastoralIds?: string[];

  @IsBoolean()
  @IsOptional()
  consentGiven?: boolean;
}
