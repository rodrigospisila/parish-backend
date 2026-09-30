import { Transform } from 'class-transformer';
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export const REVIEW_NOTE_MAX = 1000;

/** Aparar texto antes de validar (nota em branco = sem nota). */
export const trimString = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/**
 * POST /platform/data-proposals/:id/approve.
 * `payload`, quando vem, SUBSTITUI o proposto (edição do aprovador) e é validado
 * pelas regras do tipo da proposta no serviço.
 */
export class ApproveDataProposalDto {
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(REVIEW_NOTE_MAX)
  note?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
