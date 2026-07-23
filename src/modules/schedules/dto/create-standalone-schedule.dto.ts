import { IsString, IsNotEmpty, IsOptional, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateSchedulePastoralSettingDto } from './create-schedule.dto';

/**
 * Escala de serviço contínuo SEM evento (Fase 4.1): limpeza, secretaria,
 * plantão do dízimo, adoração perpétua. Ancora-se na comunidade + horário próprio.
 */
export class CreateStandaloneScheduleDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsNotEmpty({ message: 'A comunidade é obrigatória para escala sem evento' })
  communityId: string;

  @IsString()
  @IsOptional()
  startTime?: string; // HH:MM

  @IsString()
  @IsOptional()
  endTime?: string; // HH:MM

  @IsString()
  @IsOptional()
  location?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSchedulePastoralSettingDto)
  pastoralSettings?: CreateSchedulePastoralSettingDto[];
}
