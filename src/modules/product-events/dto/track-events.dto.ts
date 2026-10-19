import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { PRODUCT_EVENT_PLATFORMS } from '../product-event-names';

export const PRODUCT_EVENTS_BATCH_MAX = 50;

/**
 * Um evento de uso. `name` fora da lista branca, `appVersion` fora do formato
 * curto (1.2.3) e `communityId` fora do formato/inexistente NÃO derrubam o
 * lote: o serviço ignora o evento ou zera o campo (ver ProductEventsService).
 */
export class ProductEventInputDto {
  @IsString()
  @MaxLength(60)
  name: string;

  @IsIn(PRODUCT_EVENT_PLATFORMS)
  platform: 'web' | 'app';

  @IsOptional()
  @IsString()
  @MaxLength(32)
  appVersion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  communityId?: string;
}

/** POST /product-events `{ events: [...] }` (máx. 50 por lote). */
export class TrackEventsDto {
  @IsArray()
  @ArrayMaxSize(PRODUCT_EVENTS_BATCH_MAX)
  @ValidateNested({ each: true })
  @Type(() => ProductEventInputDto)
  events: ProductEventInputDto[];
}
