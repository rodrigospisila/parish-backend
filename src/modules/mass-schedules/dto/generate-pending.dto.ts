import { ArrayNotEmpty, IsArray, IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** Gera de uma vez as escalas de todas as ocorrências pendentes do período. */
export class GeneratePendingDto {
  @IsDateString()
  @IsNotEmpty()
  from: string;

  @IsDateString()
  @IsNotEmpty()
  to: string;

  @IsOptional()
  @IsString()
  communityId?: string;

  /** Restringe às ocorrências que envolvem alguma destas pastorais. */
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  pastoralIds?: string[];
}
