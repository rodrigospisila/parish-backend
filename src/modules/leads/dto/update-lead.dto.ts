import { LeadStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

/** PATCH /platform/leads/:id (SYSTEM_ADMIN) — estágio e anotações do contato comercial. */
export class UpdateLeadDto {
  @IsOptional()
  @IsEnum(LeadStatus, { message: 'Status inválido' })
  status?: LeadStatus;

  /** null ou "" limpa */
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string | null;
}
