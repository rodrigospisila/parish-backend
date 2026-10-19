import { PartialType, OmitType } from '@nestjs/mapped-types';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateSacramentDto } from './create-sacrament.dto';

// memberId não muda em uma atualização de sacramento
export class UpdateSacramentDto extends PartialType(
  OmitType(CreateSacramentDto, ['memberId'] as const),
) {
  // Obrigatório (mín. 10 caracteres, conferido no service) quando a mudança
  // retifica um assento (RECORD): tipo, data, ministro, local, livro/folha/termo
  @IsString()
  @IsOptional()
  @MaxLength(500)
  rectificationReason?: string;
}
