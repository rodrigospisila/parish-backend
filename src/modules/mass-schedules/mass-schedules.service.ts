import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateMassScheduleDto } from './dto/create-mass-schedule.dto';
import { UpdateMassScheduleDto } from './dto/update-mass-schedule.dto';
import { MassScheduleType, UserRole } from '@prisma/client';
import { CurrentUser, HierarchyService } from '../../common/hierarchy.service';

/** Rótulos e durações padrão por tipo de horário fixo (agenda da comunidade). */
const SCHEDULE_LABELS: Record<MassScheduleType, string> = {
  MASS: 'Missa',
  CONFESSION: 'Confissão',
  ADORATION: 'Adoração',
  ROSARY: 'Terço',
};

const SCHEDULE_DURATION_MIN: Record<MassScheduleType, number> = {
  MASS: 60,
  CONFESSION: 45,
  ADORATION: 60,
  ROSARY: 30,
};

export interface FixedOccurrence {
  id: string;
  massScheduleId: string;
  title: string;
  type: MassScheduleType;
  notes: string | null;
  start: string;
  end: string;
  community: { id: string; name: string } | null;
  isFixed: true;
}

@Injectable()
export class MassSchedulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  private async assertCommunityInScope(communityId: string, currentUser?: CurrentUser) {
    if (!currentUser || currentUser.role === UserRole.SYSTEM_ADMIN) return;
    const inScope = await this.hierarchyService.isCommunityInScope(currentUser, communityId);
    if (!inScope) {
      throw new ForbiddenException('Comunidade fora do seu escopo');
    }
  }

  /**
   * Filtro de escopo hierárquico para horários fixos (por comunidade).
   * Não usa applyEventFilter porque este último ramifica em eventPastorals,
   * que não existe em MassSchedule.
   */
  private massScopeWhere(user: CurrentUser): any {
    switch (user.role) {
      case UserRole.SYSTEM_ADMIN:
        return {};
      case UserRole.DIOCESAN_ADMIN:
        return { community: { parish: { dioceseId: user.dioceseId } } };
      case UserRole.PARISH_ADMIN:
        return { community: { parishId: user.parishId } };
      default:
        return user.communityId ? { communityId: user.communityId } : {};
    }
  }

  private ensureAccess(schedule: { communityId: string }, currentUser: CurrentUser) {
    const restrictedRoles: UserRole[] = [
      UserRole.COMMUNITY_COORDINATOR,
      UserRole.PASTORAL_COORDINATOR,
      UserRole.VOLUNTEER,
      UserRole.FAITHFUL,
    ];

    if (
      restrictedRoles.includes(currentUser.role) &&
      currentUser.communityId &&
      schedule.communityId !== currentUser.communityId
    ) {
      throw new ForbiddenException('Voce nao tem permissao para favoritar este horario');
    }
  }

  async create(createMassScheduleDto: CreateMassScheduleDto, currentUser?: CurrentUser) {
    const { communityId, ...rest } = createMassScheduleDto;

    // Verificar se a comunidade existe
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
    });

    if (!community) {
      throw new NotFoundException(`Comunidade com ID ${communityId} não encontrada`);
    }

    await this.assertCommunityInScope(communityId, currentUser);

    return this.prisma.massSchedule.create({
      data: {
        ...rest,
        communityId,
      },
      include: {
        community: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async findAll(communityId?: string, type?: MassScheduleType) {
    const where: any = {};

    if (communityId) {
      where.communityId = communityId;
    }

    if (type) {
      where.type = type;
    }

    return this.prisma.massSchedule.findMany({
      where,
      include: {
        community: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { time: 'asc' },
      ],
    });
  }

  /** Listagem escopada para o painel (Agenda Fixa). */
  async findAllManaged(currentUser: CurrentUser, communityId?: string, type?: MassScheduleType) {
    const where: any = this.massScopeWhere(currentUser);
    if (communityId) where.communityId = communityId;
    if (type) where.type = type;

    return this.prisma.massSchedule.findMany({
      where,
      include: {
        community: {
          select: { id: true, name: true, parish: { select: { id: true, name: true } } },
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { time: 'asc' }],
    });
  }

  /**
   * Expande os horários fixos (agenda da comunidade) em ocorrências dentro de
   * um período — para o calendário de Eventos mostrá-los materializados, sem
   * inflar o banco. Horários semanais geram uma ocorrência por semana; horários
   * "especiais" (com specialDate) geram uma única ocorrência naquela data.
   */
  async expandOccurrences(
    fromStr: string,
    toStr: string,
    currentUser?: CurrentUser,
    communityId?: string,
    opts?: { communityIds?: string[]; types?: MassScheduleType[] },
  ): Promise<FixedOccurrence[]> {
    const from = new Date(fromStr);
    const to = new Date(toStr);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) {
      throw new BadRequestException('Período inválido');
    }
    // Limita a janela para evitar expansões absurdas (~15 meses)
    if (to.getTime() - from.getTime() > 460 * 24 * 60 * 60 * 1000) {
      throw new BadRequestException('Período muito longo');
    }

    const where: any = currentUser ? this.massScopeWhere(currentUser) : {};
    if (communityId) where.communityId = communityId;
    // Busca por proximidade (sem escopo): restringe a um conjunto de comunidades e tipos
    if (opts?.communityIds) where.communityId = { in: opts.communityIds };
    if (opts?.types?.length) where.type = { in: opts.types };

    const schedules = await this.prisma.massSchedule.findMany({
      where,
      include: { community: { select: { id: true, name: true } } },
    });

    // Trabalha em dias de calendário UTC para evitar deslocamento de fuso; a
    // hora configurada (HH:MM) é emitida como "wall clock" (horário flutuante),
    // então a missa sempre aparece no horário certo em qualquer fuso.
    const startDay = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
    const endDay = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));

    const occurrences: FixedOccurrence[] = [];

    for (const schedule of schedules) {
      const [hh, mm] = (schedule.time || '00:00').split(':').map((n) => parseInt(n, 10) || 0);

      // Horário especial (festa/solenidade): ocorrência única na data marcada
      if (schedule.isSpecial && schedule.specialDate) {
        const sd = new Date(schedule.specialDate);
        const dayUTC = new Date(Date.UTC(sd.getUTCFullYear(), sd.getUTCMonth(), sd.getUTCDate()));
        if (dayUTC >= startDay && dayUTC <= endDay) {
          occurrences.push(this.toOccurrence(schedule, dayUTC, hh, mm));
        }
        continue;
      }

      // Semanal: do 1º dia que bate o dia da semana, pula de 7 em 7 dias
      const cursor = new Date(startDay);
      while (cursor.getUTCDay() !== schedule.dayOfWeek) {
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
      for (let day = new Date(cursor); day <= endDay; day.setUTCDate(day.getUTCDate() + 7)) {
        occurrences.push(this.toOccurrence(schedule, new Date(day), hh, mm));
      }
    }

    occurrences.sort((a, b) => a.start.localeCompare(b.start));
    return occurrences;
  }

  private toOccurrence(
    schedule: { id: string; type: MassScheduleType; notes: string | null; community: { id: string; name: string } | null },
    dayUTC: Date,
    hh: number,
    mm: number,
  ): FixedOccurrence {
    // Horário flutuante (sem Z): representa o relógio de parede da comunidade
    const startUtc = new Date(Date.UTC(dayUTC.getUTCFullYear(), dayUTC.getUTCMonth(), dayUTC.getUTCDate(), hh, mm, 0));
    const endUtc = new Date(startUtc.getTime() + (SCHEDULE_DURATION_MIN[schedule.type] ?? 45) * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    const floating = (dt: Date) =>
      `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())}:00`;

    const baseTitle = SCHEDULE_LABELS[schedule.type] ?? schedule.type;
    const dateKey = floating(startUtc).slice(0, 10);
    return {
      id: `mass-${schedule.id}-${dateKey}`,
      massScheduleId: schedule.id,
      title: schedule.notes ? `${baseTitle} — ${schedule.notes}` : baseTitle,
      type: schedule.type,
      notes: schedule.notes ?? null,
      start: floating(startUtc),
      end: floating(endUtc),
      community: schedule.community,
      isFixed: true,
    };
  }

  async findByDayOfWeek(dayOfWeek: number, communityId?: string) {
    const where: any = { dayOfWeek };

    if (communityId) {
      where.communityId = communityId;
    }

    return this.prisma.massSchedule.findMany({
      where,
      include: {
        community: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        time: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const schedule = await this.prisma.massSchedule.findUnique({
      where: { id },
      include: {
        community: true,
      },
    });

    if (!schedule) {
      throw new NotFoundException(`Horário de missa com ID ${id} não encontrado`);
    }

    return schedule;
  }

  async update(id: string, updateMassScheduleDto: UpdateMassScheduleDto, currentUser?: CurrentUser) {
    const schedule = await this.findOne(id); // Verifica se existe
    await this.assertCommunityInScope(schedule.communityId, currentUser);

    return this.prisma.massSchedule.update({
      where: { id },
      data: updateMassScheduleDto,
      include: {
        community: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async remove(id: string, currentUser?: CurrentUser) {
    const schedule = await this.findOne(id); // Verifica se existe
    await this.assertCommunityInScope(schedule.communityId, currentUser);

    return this.prisma.massSchedule.delete({
      where: { id },
    });
  }

  // Obter horários especiais (festas, solenidades)
  async findSpecialSchedules(communityId?: string) {
    const where: any = { isSpecial: true };

    if (communityId) {
      where.communityId = communityId;
    }

    return this.prisma.massSchedule.findMany({
      where,
      include: {
        community: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        specialDate: 'asc',
      },
    });
  }

  async getFavorites(currentUser: CurrentUser, communityId?: string) {
    const where: any = { userId: currentUser.id };
    const restrictedRoles: UserRole[] = [
      UserRole.COMMUNITY_COORDINATOR,
      UserRole.PASTORAL_COORDINATOR,
      UserRole.VOLUNTEER,
      UserRole.FAITHFUL,
    ];

    const scheduleFilter: any = {};
    if (restrictedRoles.includes(currentUser.role) && currentUser.communityId) {
      scheduleFilter.communityId = currentUser.communityId;
    } else if (communityId) {
      scheduleFilter.communityId = communityId;
    }

    if (Object.keys(scheduleFilter).length > 0) {
      where.massSchedule = scheduleFilter;
    }

    const favorites = await this.prisma.massScheduleFavorite.findMany({
      where,
      include: {
        massSchedule: {
          include: {
            community: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        { massSchedule: { dayOfWeek: 'asc' } },
        { massSchedule: { time: 'asc' } },
      ],
    });

    return favorites.map((favorite) => favorite.massSchedule);
  }

  async addFavorite(scheduleId: string, currentUser: CurrentUser) {
    const schedule = await this.prisma.massSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new NotFoundException(`Horario de missa com ID ${scheduleId} nao encontrado`);
    }

    this.ensureAccess(schedule, currentUser);

    await this.prisma.massScheduleFavorite.upsert({
      where: {
        userId_massScheduleId: {
          userId: currentUser.id,
          massScheduleId: scheduleId,
        },
      },
      update: {},
      create: {
        userId: currentUser.id,
        massScheduleId: scheduleId,
      },
    });

    return { massScheduleId: scheduleId, favorite: true };
  }

  async removeFavorite(scheduleId: string, currentUser: CurrentUser) {
    const schedule = await this.prisma.massSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new NotFoundException(`Horario de missa com ID ${scheduleId} nao encontrado`);
    }

    this.ensureAccess(schedule, currentUser);

    await this.prisma.massScheduleFavorite.deleteMany({
      where: {
        userId: currentUser.id,
        massScheduleId: scheduleId,
      },
    });

    return { massScheduleId: scheduleId, favorite: false };
  }
}
