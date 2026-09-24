import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { MassScheduleType, SuggestionKind } from '@prisma/client';

/** Faixa aceita para a coordenada sugerida: o retângulo do Brasil. */
export const BR_LAT_MIN = -34;
export const BR_LAT_MAX = 6;
export const BR_LNG_MIN = -74;
export const BR_LNG_MAX = -28;
export const MESSAGE_MIN = 3;
export const MESSAGE_MAX = 1000;
/** Precisão de GPS acima disto (metros) não diz nada sobre o templo. */
export const ACCURACY_MAX_M = 100_000;

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** POST /communities/:id/suggestions — correção sugerida por um fiel. */
export class CreateCommunitySuggestionDto {
  @IsEnum(SuggestionKind)
  kind: SuggestionKind;

  @IsOptional()
  @IsEnum(MassScheduleType)
  scheduleType?: MassScheduleType;

  // Em LOCATION a coordenada é obrigatória; nos demais, se vier, precisa ser válida
  @ValidateIf((o) => o.kind === SuggestionKind.LOCATION || o.latitude != null)
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: 'latitude inválida' })
  @Min(BR_LAT_MIN, { message: 'latitude fora do Brasil' })
  @Max(BR_LAT_MAX, { message: 'latitude fora do Brasil' })
  latitude?: number;

  @ValidateIf((o) => o.kind === SuggestionKind.LOCATION || o.longitude != null)
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: 'longitude inválida' })
  @Min(BR_LNG_MIN, { message: 'longitude fora do Brasil' })
  @Max(BR_LNG_MAX, { message: 'longitude fora do Brasil' })
  longitude?: number;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(ACCURACY_MAX_M)
  accuracyM?: number;

  @IsOptional()
  @IsBoolean()
  atChurch?: boolean;

  @Transform(trim)
  @IsString()
  @Length(MESSAGE_MIN, MESSAGE_MAX, { message: `a mensagem deve ter de ${MESSAGE_MIN} a ${MESSAGE_MAX} caracteres` })
  message: string;
}
