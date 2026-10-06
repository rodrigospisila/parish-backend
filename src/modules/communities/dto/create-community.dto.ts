import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsBoolean, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { GeoPrecision, EntityStatus } from '@prisma/client';

/** '' ou só espaços → null (o painel manda o campo vazio ao apagar o contato). */
const emptyToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? (value.trim() === '' ? null : value.trim()) : value;

export class CreateCommunityDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsNotEmpty()
  zipCode: string;

  @Transform(emptyToNull)
  @IsString()
  @IsOptional()
  phone?: string | null;

  @Transform(emptyToNull)
  @IsString()
  @IsOptional()
  email?: string | null;

  @IsString()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsOptional()
  coordinatorName?: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  /** Origem da coordenada: MANUAL (pino posto no mapa), STREET ou CITY. */
  @IsOptional()
  @IsEnum(GeoPrecision)
  geoPrecision?: GeoPrecision | null;

  /** Origem declarada pelo cliente: 'manual' (pino no mapa) ou 'gps' (celular no local). */
  @IsOptional()
  @IsIn(['manual', 'gps'])
  geoSource?: 'manual' | 'gps' | null;

  @IsString()
  @IsNotEmpty()
  parishId: string;

  @IsEnum(EntityStatus)
  @IsOptional()
  status?: EntityStatus;

  // Habilita o fallback de notificação por SMS para membros sem app (custo por comunidade)
  @IsBoolean()
  @IsOptional()
  smsEnabled?: boolean;
}

