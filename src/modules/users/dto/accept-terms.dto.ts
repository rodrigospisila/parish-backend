import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Aceite dos termos/política vigentes (POST /users/me/accept-terms). */
export class AcceptTermsDto {
  /** Versão que o cliente mostrou; tem de ser a vigente (TERMS_VERSION) */
  @IsOptional()
  @IsString({ message: 'Versão dos termos inválida' })
  @MaxLength(40)
  version?: string;
}
