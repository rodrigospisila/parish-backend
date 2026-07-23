import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateSacramentDto } from './create-sacrament.dto';

// memberId não muda em uma atualização de sacramento
export class UpdateSacramentDto extends PartialType(
  OmitType(CreateSacramentDto, ['memberId'] as const),
) {}
