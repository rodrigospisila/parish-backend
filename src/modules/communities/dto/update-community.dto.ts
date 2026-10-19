import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateCommunityDto } from './create-community.dto';

export class UpdateCommunityDto extends PartialType(CreateCommunityDto) {
  /**
   * Coordenador leigo pode registrar sacramento e emitir certidão nesta
   * comunidade (padrão: não). Só PARISH_ADMIN ou acima altera (o service confere).
   */
  @IsOptional()
  @IsBoolean()
  laySacramentRecords?: boolean;
}
