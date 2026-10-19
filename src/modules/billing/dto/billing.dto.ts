import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/** PUT /billing/account — dados de cobrança (e da NFS-e) da paróquia. CPF/CNPJ conferido no service. */
export class SaveBillingAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  parishId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  legalName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  document: string;

  @IsEmail({}, { message: 'E-mail de cobrança inválido' })
  @MaxLength(160)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  responsibleName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  municipalRegistration?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{5}-?\d{3}$/, { message: 'CEP inválido (use 00000-000)' })
  zipCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  street?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  complement?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  neighborhood?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{2}$/, { message: 'UF inválida (use a sigla, ex.: PR)' })
  state?: string;
}

export class CheckoutItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  communityId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  tierKey: string;
}

/** POST /billing/checkout */
export class CheckoutDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  parishId: string;

  @IsIn(['MONTHLY', 'YEARLY'])
  cycle: 'MONTHLY' | 'YEARLY';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  @ArrayMinSize(1, { message: 'Escolha ao menos uma comunidade' })
  @ArrayMaxSize(200)
  items: CheckoutItemDto[];
}

/** POST /billing/cancel */
export class CancelBillingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  parishId: string;
}
