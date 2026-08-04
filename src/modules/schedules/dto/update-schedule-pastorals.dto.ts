import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateSchedulePastoralSettingDto } from './create-schedule.dto';

/** Atualiza as vagas (requiredPeople) das pastorais já vinculadas à escala. */
export class UpdateSchedulePastoralsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSchedulePastoralSettingDto)
  pastoralSettings: CreateSchedulePastoralSettingDto[];
}
