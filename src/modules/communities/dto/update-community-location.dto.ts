import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

/** Apara o texto; o resto passa como veio para a validação. */
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/**
 * PATCH /communities/:id/location — pino e endereço da própria comunidade
 * (plano grátis). Lista fechada de campos: o resto do cadastro fica no PATCH geral.
 * O modelo Community não tem bairro (`neighborhood`): ele vai dentro de `address`.
 */
export class UpdateCommunityLocationDto {
  @IsNumber({}, { message: 'Informe a latitude (número)' })
  latitude: number;

  @IsNumber({}, { message: 'Informe a longitude (número)' })
  longitude: number;

  /** 'manual' (pino arrastado no mapa — padrão) ou 'gps' (celular no local). */
  @IsOptional()
  @IsIn(['manual', 'gps'], { message: "Origem inválida: use 'manual' ou 'gps'" })
  geoSource?: 'manual' | 'gps';

  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'O endereço não pode ficar vazio' })
  @MaxLength(300, { message: 'O endereço pode ter no máximo 300 caracteres' })
  address?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'A cidade não pode ficar vazia' })
  @MaxLength(120, { message: 'A cidade pode ter no máximo 120 caracteres' })
  city?: string;

  /** UF com 2 letras (define o fuso dos horários da comunidade). */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^[A-Z]{2}$/, { message: 'UF inválida: use a sigla com 2 letras' })
  state?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'O CEP não pode ficar vazio' })
  @MaxLength(12, { message: 'O CEP pode ter no máximo 12 caracteres' })
  zipCode?: string;
}
