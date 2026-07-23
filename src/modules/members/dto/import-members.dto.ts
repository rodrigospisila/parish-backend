import { IsArray, IsNotEmpty, IsObject, IsString } from 'class-validator';

export class ImportMembersDto {
  @IsString()
  @IsNotEmpty({ message: 'A comunidade é obrigatória' })
  communityId: string;

  // Linhas já parseadas do CSV (ex.: { fullName, cpf, email, phone })
  @IsArray()
  @IsObject({ each: true })
  rows: Array<Record<string, string>>;
}
