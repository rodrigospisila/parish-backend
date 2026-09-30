import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { REVIEW_NOTE_MAX, trimString } from './approve-data-proposal.dto';

export const BULK_MAX = 200;
export const BULK_ACTIONS = ['approve', 'reject'] as const;
export type BulkAction = (typeof BULK_ACTIONS)[number];

/**
 * POST /platform/data-proposals/bulk — uma a uma, cada uma na sua transação.
 * Aprovação em lote não aceita edição: as que precisam do dado certo são puladas.
 */
export class BulkDataProposalsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(BULK_MAX)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  ids: string[];

  @IsIn(BULK_ACTIONS as unknown as string[])
  action: BulkAction;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(REVIEW_NOTE_MAX)
  note?: string;
}
