import { IsBoolean } from 'class-validator';

export class CheckinAssignmentDto {
  @IsBoolean()
  checkedIn: boolean;
}
