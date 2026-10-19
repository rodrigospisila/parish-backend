import { Equals, IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * POST /public/invites/:token/accept. Senha com a MESMA política do cadastro
 * (RegisterDto: mínimo de 8 caracteres). Com Bearer de conta existente
 * (fiel/voluntário), a senha é ignorada — a conta mantém a dela.
 */
export class AcceptInviteDto {
  @IsString({ message: 'Nome deve ser uma string' })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @MinLength(2, { message: 'Nome muito curto' })
  @MaxLength(120, { message: 'Nome muito longo' })
  name: string;

  @IsOptional()
  @IsString({ message: 'Senha deve ser uma string' })
  @MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
  @MaxLength(128, { message: 'Senha muito longa' })
  password?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email inválido' })
  @MaxLength(160)
  email?: string;

  @IsOptional()
  @IsString({ message: 'Telefone deve ser uma string' })
  @MaxLength(30)
  phone?: string;

  @IsBoolean({ message: 'Aceite dos termos deve ser verdadeiro ou falso' })
  @Equals(true, {
    message: 'É preciso aceitar os termos de uso e a política de privacidade',
  })
  acceptTerms: boolean;
}
