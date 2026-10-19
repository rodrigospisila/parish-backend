import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class DismissOnboardingDto {
  /** Opcional para o PARISH_ADMIN (vale a própria paróquia) */
  @IsOptional()
  @IsString()
  parishId?: string;

  /** `false` traz o cartão de volta (padrão: dispensar) */
  @IsOptional()
  @IsBoolean()
  dismissed?: boolean;
}
