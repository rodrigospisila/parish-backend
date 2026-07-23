import { IsEmail, IsOptional, IsString } from 'class-validator';

/**
 * Identifica a conta por e-mail OU telefone. Pelo menos um deve ser informado.
 * A resposta é sempre genérica (não revela se a conta existe).
 */
export class ForgotPasswordDto {
  @IsEmail({}, { message: 'E-mail inválido' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;
}
