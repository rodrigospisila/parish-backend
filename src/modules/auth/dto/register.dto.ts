import {
  Equals,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export class RegisterDto {
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  email: string;

  @IsString({ message: 'Senha deve ser uma string' })
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
  password: string;

  @IsString({ message: 'Nome deve ser uma string' })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  name: string;

  @IsString({ message: 'Telefone deve ser uma string' })
  @IsOptional()
  phone?: string;

  @IsEnum(UserRole, { message: 'Perfil de usuário inválido' })
  @IsOptional()
  role?: UserRole;

  // IDs são cuid (não UUID) — validar apenas como string
  @IsString({ message: 'ID da diocese inválido' })
  @IsOptional()
  dioceseId?: string;

  @IsString({ message: 'ID da paróquia inválido' })
  @IsOptional()
  parishId?: string;

  @IsString({ message: 'ID da comunidade inválido' })
  @IsOptional()
  communityId?: string;

  // Aceite dos termos/política obrigatório no cadastro público (M4, LGPD art. 8º §2º)
  @Equals(true, { message: 'É preciso aceitar os termos de uso e a política de privacidade' })
  @IsBoolean({ message: 'Consentimento deve ser um booleano' })
  consentGiven: boolean;

  @IsString()
  @IsOptional()
  verifiedPhoneToken?: string;
}

