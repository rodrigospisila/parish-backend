import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { isRoleAtLeast } from '../auth/constants/role-hierarchy';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from './dto/announcement.dto';

export const ACTIVE_ANNOUNCEMENTS_MAX = 20;

const SELECT = {
  id: true,
  title: true,
  body: true,
  kind: true,
  audience: true,
  startsAt: true,
  endsAt: true,
} satisfies Prisma.PlatformAnnouncementSelect;

const ADMIN_SELECT = { ...SELECT, createdByUserId: true, createdAt: true } satisfies Prisma.PlatformAnnouncementSelect;

export interface AnnouncementViewer {
  role: UserRole | string;
  coordinatedPastoralIds?: string[];
}

/** Gestor para fins de aviso: PASTORAL_COORDINATOR ou acima, ou coordenador de pastoral pelo vínculo. */
export function isAnnouncementAdmin(user: AnnouncementViewer | null | undefined): boolean {
  if (!user) return false;
  if (isRoleAtLeast(user.role as UserRole, UserRole.PASTORAL_COORDINATOR)) return true;
  return (user.coordinatedPastoralIds?.length ?? 0) > 0;
}

const parseDate = (value: string | null | undefined, label: string): Date | null => {
  if (value === null || value === undefined || value === '') return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new BadRequestException(`${label} inválido`);
  return date;
};

/**
 * Avisos da plataforma para os clientes (saas-implantacao-29): novidades,
 * manutenção programada e incidentes. Só vigentes aparecem
 * (startsAt ≤ agora < endsAt, ou sem fim).
 */
@Injectable()
export class AnnouncementsService {
  constructor(private readonly prisma: PrismaService) {}

  /** GET /announcements/active — vigentes para o público de quem está logado. */
  async active(user: AnnouncementViewer, now: Date = new Date()) {
    const audiences = isAnnouncementAdmin(user) ? ['ALL', 'ADMINS'] : ['ALL'];
    return this.prisma.platformAnnouncement.findMany({
      where: {
        audience: { in: audiences },
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      select: SELECT,
      orderBy: { startsAt: 'desc' },
      take: ACTIVE_ANNOUNCEMENTS_MAX,
    });
  }

  /** GET /platform/announcements — todos (mais recentes primeiro) com o estado calculado. */
  async list(now: Date = new Date()) {
    const rows = await this.prisma.platformAnnouncement.findMany({
      select: ADMIN_SELECT,
      orderBy: { startsAt: 'desc' },
      take: 200,
    });
    return rows.map((row) => ({ ...row, state: this.state(row, now) }));
  }

  async create(dto: CreateAnnouncementDto, userId: string | null) {
    const startsAt = parseDate(dto.startsAt, 'Início') ?? new Date();
    const endsAt = parseDate(dto.endsAt, 'Fim');
    this.assertRange(startsAt, endsAt);
    const row = await this.prisma.platformAnnouncement.create({
      data: {
        title: dto.title.trim(),
        body: dto.body.trim(),
        kind: dto.kind ?? 'NEWS',
        audience: dto.audience ?? 'ADMINS',
        startsAt,
        endsAt,
        createdByUserId: userId,
      },
      select: ADMIN_SELECT,
    });
    return { ...row, state: this.state(row) };
  }

  async update(id: string, dto: UpdateAnnouncementDto) {
    const current = await this.prisma.platformAnnouncement.findUnique({
      where: { id },
      select: { id: true, startsAt: true, endsAt: true },
    });
    if (!current) throw new NotFoundException('Aviso não encontrado');

    const data: Prisma.PlatformAnnouncementUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.body !== undefined) data.body = dto.body.trim();
    if (dto.kind !== undefined) data.kind = dto.kind;
    if (dto.audience !== undefined) data.audience = dto.audience;
    const startsAt = dto.startsAt !== undefined ? parseDate(dto.startsAt, 'Início') ?? current.startsAt : current.startsAt;
    const endsAt = dto.endsAt !== undefined ? parseDate(dto.endsAt, 'Fim') : current.endsAt;
    if (dto.startsAt !== undefined) data.startsAt = startsAt;
    if (dto.endsAt !== undefined) data.endsAt = endsAt;
    this.assertRange(startsAt, endsAt);
    if (!Object.keys(data).length) throw new BadRequestException('Nada para alterar');

    const row = await this.prisma.platformAnnouncement.update({ where: { id }, data, select: ADMIN_SELECT });
    return { ...row, state: this.state(row) };
  }

  async remove(id: string) {
    const current = await this.prisma.platformAnnouncement.findUnique({ where: { id }, select: { id: true } });
    if (!current) throw new NotFoundException('Aviso não encontrado');
    await this.prisma.platformAnnouncement.delete({ where: { id } });
    return { id, deleted: true };
  }

  private assertRange(startsAt: Date, endsAt: Date | null) {
    if (endsAt && endsAt.getTime() <= startsAt.getTime()) {
      throw new BadRequestException('O fim do aviso precisa ser depois do início');
    }
  }

  private state(row: { startsAt: Date; endsAt: Date | null }, now: Date = new Date()): 'SCHEDULED' | 'ACTIVE' | 'ENDED' {
    if (row.startsAt.getTime() > now.getTime()) return 'SCHEDULED';
    if (row.endsAt && row.endsAt.getTime() <= now.getTime()) return 'ENDED';
    return 'ACTIVE';
  }
}
