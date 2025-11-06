import { IsString, IsBoolean } from 'class-validator';

export class MarkAttendanceDto {
  @IsString()
  meetingId: string;

  @IsString()
  memberId: string;

  @IsBoolean()
  attended: boolean;
}
