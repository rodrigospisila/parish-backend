import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** Gera uma escala (Schedule) para uma data específica do horário fixo. */
export class GenerateScheduleFromMassDto {
  @IsDateString()
  @IsNotEmpty()
  date: string; // Data da ocorrência (YYYY-MM-DD ou ISO)

  @IsOptional()
  @IsString()
  title?: string; // Título opcional (senão gerado a partir do tipo/horário)
}
