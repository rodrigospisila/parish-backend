import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ReplaceAssignmentDto {
  @IsString()
  @IsNotEmpty()
  memberId: string;

  /** Confirma a substituição mesmo com conflito global de horário (auditado) */
  @IsOptional()
  @IsBoolean()
  overrideConflict?: boolean;
}
