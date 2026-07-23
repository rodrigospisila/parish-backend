import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class NotifyMembersDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  message: string;
}
