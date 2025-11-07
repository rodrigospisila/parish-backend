import { IsString, IsOptional } from 'class-validator';

export class CreateAssignmentDto {
  @IsString()
  memberId: string;

  @IsString()
  role: string; // Ex: "Ministro da Eucaristia", "Leitor", "Cantor", "Violão"

  @IsOptional()
  @IsString()
  notes?: string;
}
