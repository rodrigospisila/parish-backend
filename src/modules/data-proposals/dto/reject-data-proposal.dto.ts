import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { REVIEW_NOTE_MAX, trimString } from './approve-data-proposal.dto';

/** POST /platform/data-proposals/:id/reject. */
export class RejectDataProposalDto {
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(REVIEW_NOTE_MAX)
  note?: string;
}
