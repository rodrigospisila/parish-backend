import { ArrayMaxSize, ArrayMinSize, IsArray, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

/** Teto de datas por pedido (dois meses de um horário diário). */
export const MAX_CANCELLATION_DATES = 62;
/** Tamanho máximo do motivo mostrado ao fiel. */
export const MAX_CANCELLATION_REASON = 140;

/**
 * Suspende um horário fixo em uma ou mais datas ("não haverá Confissão às 15:00
 * em 25/09"). O horário continua existindo; só aquelas datas deixam de valer.
 */
export class CancelOccurrencesDto {
  /** Dias no relógio de São Paulo, formato YYYY-MM-DD. */
  @IsArray({ message: 'Informe as datas (dates) como lista' })
  @ArrayMinSize(1, { message: 'Informe ao menos uma data' })
  @ArrayMaxSize(MAX_CANCELLATION_DATES, {
    message: `Envie no máximo ${MAX_CANCELLATION_DATES} datas por vez`,
  })
  @IsString({ each: true, message: 'Cada data deve ser um texto no formato AAAA-MM-DD' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { each: true, message: 'Cada data deve estar no formato AAAA-MM-DD' })
  dates: string[];

  /** Texto curto mostrado ao fiel ("agenda dos padres"). Vazio vira nulo. */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'O motivo deve ser um texto' })
  @MaxLength(MAX_CANCELLATION_REASON, {
    message: `O motivo pode ter no máximo ${MAX_CANCELLATION_REASON} caracteres`,
  })
  reason?: string | null;
}
