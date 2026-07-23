import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSchedulePastoralSettingDto {
  @IsString()
  @IsNotEmpty()
  communityPastoralId: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  requiredPeople: number;
}

export class CreateScheduleDto {
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
  @IsNotEmpty()
  eventId: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSchedulePastoralSettingDto)
  pastoralSettings?: CreateSchedulePastoralSettingDto[];
}
