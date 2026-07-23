import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { SacramentType } from '@prisma/client';

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
  place?: string;

  @IsString()
  @IsOptional()
  minister?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
