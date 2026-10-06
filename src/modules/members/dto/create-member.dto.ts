import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { MemberStatus, MemberType, Gender, MaritalStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { normalizeBrazilianPhone } from '../../messaging/log-mask';

export class CreateMemberDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEnum(MemberType)
  @IsOptional()
  memberType?: MemberType;

  @IsString()
  @IsOptional()
  emergencyContactName?: string;

  @IsString()
  @IsOptional()
  emergencyContactPhone?: string;

  @IsString()
  @IsOptional()
  emergencyContactRelation?: string;

  @IsDateString()
  @IsOptional()
  birthDate?: string;

  @IsString()
  @IsOptional()
  cpf?: string;

  @IsString()
  @IsOptional()
  rg?: string;

  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @IsEnum(MaritalStatus)
  @IsOptional()
  maritalStatus?: MaritalStatus;

  @IsString()
  @IsOptional()
  occupation?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;

  @IsString()
  @IsOptional()
  photoUrl?: string;

  // E.164 (+55…) sempre que der para normalizar (A23): a adoção do cadastro
  // pelo app compara com o celular verificado por SMS, que vem em E.164.
  // Número que não normaliza (estrangeiro, incompleto) fica como digitado.
  @Transform(({ value }) => (typeof value === 'string' ? normalizeBrazilianPhone(value) ?? value.trim() : value))
  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  zipCode?: string;

  @IsString()
  @IsOptional()
  street?: string;

  @IsString()
  @IsOptional()
  number?: string;

  @IsString()
  @IsOptional()
  complement?: string;

  @IsString()
  @IsOptional()
  neighborhood?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  fatherName?: string;

  @IsString()
  @IsOptional()
  motherName?: string;

  @IsString()
  @IsOptional()
  spouseId?: string;

  @IsEnum(MemberStatus)
  @IsOptional()
  status?: MemberStatus;

  @IsBoolean()
  @IsOptional()
  consentGiven?: boolean;

  // `userId` NÃO é aceito aqui nem no update (PartialType): ligar a ficha a uma
  // conta é fluxo próprio (cadastro/adoção por telefone verificado) — pelo
  // corpo, um gestor religaria o cadastro à conta de outra pessoa.

  @IsString()
  @IsOptional()
  responsibleId?: string;

  @IsString()
  @IsNotEmpty()
  communityId: string;
}

