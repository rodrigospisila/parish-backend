import {
  IsString,
  IsNotEmpty,
} from 'class-validator';

export class CreateAssignmentDto {
  @IsString()
  @IsNotEmpty()
  role: string; // e.g., "Leitor", "Ministro", "Acólito", "Músico"

  @IsString()
  @IsNotEmpty()
  scheduleId: string;

  @IsString()
  @IsNotEmpty()
  memberId: string;
}

