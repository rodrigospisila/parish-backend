import { IsArray, IsBoolean, IsDateString, IsNotEmpty, IsOptional } from 'class-validator';

export class DuplicateEventDto {
  @IsArray()
  @IsDateString({}, { each: true })
  @IsNotEmpty()
  dates: string[]; // Array de datas para duplicar o evento

  @IsOptional()
  @IsBoolean()
  copyTeam?: boolean; // Quando true, clona a escala (e a equipe) do evento original para cada nova data
}
