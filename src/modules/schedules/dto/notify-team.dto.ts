import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class NotifyTeamDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  message: string;
}
