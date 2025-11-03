import { IsArray, IsDateString, IsNotEmpty } from 'class-validator';

export class DuplicateEventDto {
  @IsArray()
  @IsDateString({}, { each: true })
  @IsNotEmpty()
  dates: string[]; // Array de datas para duplicar o evento
}
