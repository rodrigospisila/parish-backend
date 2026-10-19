import {
  Equals,
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ParishClaimStatus } from '@prisma/client';

/** POST /public/parishes/:parishId/claims — "Sou da equipe desta paróquia". */
export class CreateClaimDto {
  @IsString({ message: 'Nome inválido' })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @MinLength(2, { message: 'Nome muito curto' })
  @MaxLength(120, { message: 'Nome muito longo' })
  name: string;

  @IsEmail({}, { message: 'E-mail inválido' })
  @MaxLength(160, { message: 'E-mail muito longo' })
  email: string;

  @IsOptional()
  @IsString({ message: 'Celular inválido' })
  @MaxLength(30)
  phone?: string;

  /** Cargo declarado: pároco, administrador paroquial, vigário, secretária, coordenador, ecônomo... */
  @IsString({ message: 'Informe a sua função na paróquia' })
  @IsNotEmpty({ message: 'Informe a sua função na paróquia' })
  @MaxLength(60, { message: 'Função muito longa' })
  role: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Mensagem muito longa (até 1000 caracteres)' })
  message?: string;

  /** Link da provisão do pároco / carta da cúria (revisão manual) */
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true }, { message: 'Link do documento inválido (use https://)' })
  @MaxLength(500)
  evidenceUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  communityId?: string;

  @IsBoolean({ message: 'Consentimento inválido' })
  @Equals(true, {
    message: 'É preciso concordar com o uso dos seus dados para analisarmos o pedido',
  })
  consent: boolean;
}

export class SendClaimCodeDto {
  @IsIn(['PHONE', 'EMAIL'], { message: 'Canal inválido (PHONE ou EMAIL)' })
  channel: 'PHONE' | 'EMAIL';
}

export class VerifyClaimCodeDto {
  @IsString({ message: 'Código inválido' })
  @Matches(/^\d{6}$/, { message: 'O código tem 6 números' })
  code: string;
}

export class ListClaimsQueryDto {
  @IsOptional()
  @IsIn(Object.values(ParishClaimStatus), { message: 'Situação inválida' })
  status?: ParishClaimStatus;
}

export class ReviewClaimDto {
  @IsIn(['APPROVE', 'REJECT'], { message: 'Ação inválida (APPROVE ou REJECT)' })
  action: 'APPROVE' | 'REJECT';

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Observação muito longa (até 1000 caracteres)' })
  note?: string;
}
