import {
  IsBoolean,
  IsString,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';

export class CreateAssignmentDto {
  @IsString()
  @IsNotEmpty()
  role: string; // e.g., "Leitor", "Ministro", "Acólito", "Músico"

  @IsString()
  @IsNotEmpty()
  scheduleId: string;

  @IsString()
  @IsNotEmpty()
  memberId: string;

  @IsOptional()
  @IsString()
  communityPastoralId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  /** Confirma a escalação mesmo com conflito global de horário (auditado) */
  @IsOptional()
  @IsBoolean()
  overrideConflict?: boolean;
}
