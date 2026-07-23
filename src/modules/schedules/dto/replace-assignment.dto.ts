import { IsNotEmpty, IsString } from 'class-validator';

export class ReplaceAssignmentDto {
  @IsString()
  @IsNotEmpty()
  memberId: string;
}
