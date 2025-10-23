import { IsBoolean, IsOptional } from 'class-validator';

export class CheckinAssignmentDto {
  @IsBoolean()
  @IsOptional()
  checkedIn?: boolean = true;
}

