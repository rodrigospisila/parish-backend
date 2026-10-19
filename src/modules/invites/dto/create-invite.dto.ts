import { IsBoolean, IsEmail, IsEnum, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';
import { INVITE_STATUSES } from '../invite-token';

/** POST /invites — convite de equipe por link (C2). */
export class CreateInviteDto {
  @IsEnum(UserRole, { message: 'Papel inválido' })
  role: UserRole;

  /** Só para convidar administração diocesana (SYSTEM_ADMIN) */
  @IsOptional()
  @IsString({ message: 'Diocese inválida' })
  @MaxLength(40)
  dioceseId?: string;

  @IsOptional()
  @IsString({ message: 'Paróquia inválida' })
  @MaxLength(40)
  parishId?: string;

  @IsOptional()
  @IsString({ message: 'Comunidade inválida' })
  @MaxLength(40)
  communityId?: string;

  /** Cadastro de membro (sem conta) que a pessoa assume ao aceitar */
  @IsOptional()
  @IsString({ message: 'Membro inválido' })
  @MaxLength(40)
  memberId?: string;

  @IsOptional()
  @IsString({ message: 'Nome inválido' })
  @MinLength(2, { message: 'Nome muito curto' })
  @MaxLength(120, { message: 'Nome muito longo' })
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'E-mail inválido' })
  @MaxLength(160)
  email?: string;

  @IsOptional()
  @IsString({ message: 'Celular inválido' })
  @MaxLength(30)
  phone?: string;

  /** Titular da paróquia — só SYSTEM_ADMIN ou o titular, e só com PARISH_ADMIN */
  @IsOptional()
  @IsBoolean({ message: 'Titular deve ser verdadeiro ou falso' })
  holder?: boolean;
}

export class ListInvitesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  parishId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  communityId?: string;

  @IsOptional()
  @IsIn(INVITE_STATUSES, {
    message: 'Situação inválida (PENDING, ACCEPTED, EXPIRED ou REVOKED)',
  })
  status?: (typeof INVITE_STATUSES)[number];
}
