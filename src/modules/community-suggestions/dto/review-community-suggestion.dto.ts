import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { SuggestionStatus } from '@prisma/client';

/** Status que a revisão pode gravar (voltar para PENDING não faz sentido). */
export const REVIEW_STATUSES = [SuggestionStatus.REVIEWED, SuggestionStatus.ACCEPTED, SuggestionStatus.REJECTED] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

/** PATCH /community-suggestions/:id — marcação da revisão (não aplica nada). */
export class ReviewCommunitySuggestionDto {
  @IsIn(REVIEW_STATUSES as unknown as string[])
  status: ReviewStatus;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(1000)
  reviewNote?: string;
}
