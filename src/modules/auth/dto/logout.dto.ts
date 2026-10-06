import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Corpo OPCIONAL do POST /auth/logout (clientes antigos mandam vazio).
 * `refreshToken`: a sessão deste aparelho (encerra só ela).
 * `pushToken`: o aparelho deixa de receber os avisos desta conta.
 */
export class LogoutDto {
  @IsString()
  @IsOptional()
  @MaxLength(4096)
  refreshToken?: string;

  @IsString()
  @IsOptional()
  @MaxLength(512)
  pushToken?: string;
}
