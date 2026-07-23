import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class MemberAvailabilityRuleDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsInt()
  @Min(0)
  @Max(1439)
  startMinutes: number;

  @IsInt()
  @Min(1)
  @Max(1440)
  endMinutes: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class MemberAvailabilityExceptionDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateMemberAvailabilityDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MemberAvailabilityRuleDto)
  rules?: MemberAvailabilityRuleDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MemberAvailabilityExceptionDto)
  exceptions?: MemberAvailabilityExceptionDto[];
}
