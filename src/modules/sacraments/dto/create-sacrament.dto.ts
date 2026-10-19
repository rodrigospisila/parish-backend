import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString, MaxLength } from 'class-validator';
import { SacramentRecordKind, SacramentType } from '@prisma/client';

export class CreateSacramentDto {
  @IsString()
  @IsNotEmpty({ message: 'O membro é obrigatório' })
  memberId: string;

  @IsEnum(SacramentType, { message: 'Tipo de sacramento inválido' })
  type: SacramentType;

  @IsDateString({}, { message: 'Data inválida' })
  date: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  place?: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  minister?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;

  // Numeração do assento no livro paroquial (livro/folha/termo)
  @IsString()
  @IsOptional()
  @MaxLength(40)
  book?: string;

  @IsString()
  @IsOptional()
  @MaxLength(40)
  page?: string;

  @IsString()
  @IsOptional()
  @MaxLength(40)
  term?: string;

  // RECORD (padrão) = assento do livro; INFORMED = só informado (sem certidão)
  @IsEnum(SacramentRecordKind, { message: 'Tipo de registro inválido' })
  @IsOptional()
  recordKind?: SacramentRecordKind;
}
