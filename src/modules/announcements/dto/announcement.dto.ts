import { IsIn, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export const ANNOUNCEMENT_KINDS = ['NEWS', 'MAINTENANCE', 'INCIDENT'] as const;
export const ANNOUNCEMENT_AUDIENCES = ['ADMINS', 'ALL'] as const;
export type AnnouncementKind = (typeof ANNOUNCEMENT_KINDS)[number];
export type AnnouncementAudience = (typeof ANNOUNCEMENT_AUDIENCES)[number];

/**
 * POST /platform/announcements. `audience`: ADMINS = gestores (PASTORAL_COORDINATOR
 * ou acima, ou quem coordena pastoral pelo vínculo); ALL = qualquer pessoa logada.
 * `startsAt` padrão = agora; `endsAt` nulo = sem fim.
 */
export class CreateAnnouncementDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body: string;

  @IsOptional()
  @IsIn(ANNOUNCEMENT_KINDS)
  kind?: AnnouncementKind;

  @IsOptional()
  @IsIn(ANNOUNCEMENT_AUDIENCES)
  audience?: AnnouncementAudience;

  @IsOptional()
  @IsISO8601({}, { message: 'Início inválido' })
  startsAt?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'Fim inválido' })
  endsAt?: string | null;
}

/** PATCH /platform/announcements/:id — campos opcionais; `endsAt: null` remove o fim. */
export class UpdateAnnouncementDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body?: string;

  @IsOptional()
  @IsIn(ANNOUNCEMENT_KINDS)
  kind?: AnnouncementKind;

  @IsOptional()
  @IsIn(ANNOUNCEMENT_AUDIENCES)
  audience?: AnnouncementAudience;

  @IsOptional()
  @IsISO8601({}, { message: 'Início inválido' })
  startsAt?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'Fim inválido' })
  endsAt?: string | null;
}
