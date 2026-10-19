import { Equals, IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** Origens aceitas no formulário público (as demais — CLAIM, SUGGESTION, MANUAL — são internas). */
export const PUBLIC_LEAD_SOURCES = ['SITE', 'DEMO_REQUEST'] as const;

/**
 * POST /public/leads — "Quero o Parish na minha paróquia" / "Agendar demonstração".
 * E-mail OU telefone é obrigatório (checado no serviço). `website` é o honeypot:
 * campo escondido no formulário, que pessoas deixam vazio e robôs preenchem.
 */
export class CreateLeadDto {
  @IsString()
  @MinLength(2, { message: 'Informe o seu nome' })
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsEmail({}, { message: 'E-mail inválido' })
  @MaxLength(160)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Matches(/^[\d\s()+.-]*$/, { message: 'Telefone inválido' })
  phone?: string;

  /** Cargo declarado: pároco, secretária, coordenador... */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  role?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  parishName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{2}$/, { message: 'UF inválida' })
  state?: string;

  /** Paróquia do território (busca no site); id fora do formato ou inexistente é descartado */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  parishId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @IsOptional()
  @IsIn(PUBLIC_LEAD_SOURCES)
  source?: (typeof PUBLIC_LEAD_SOURCES)[number];

  @Equals(true, { message: 'É preciso autorizar o contato para enviar' })
  consent: boolean;

  /** Honeypot — deve chegar vazio */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  website?: string;
}
