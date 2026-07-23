import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { DuplicateEventDto } from './dto/duplicate-event.dto';
import { AddPastoralToEventDto } from './dto/add-pastoral-to-event.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { CheckinAssignmentDto } from './dto/checkin-assignment.dto';
import { EventType, UserRole } from '@prisma/client';
import { HierarchyService, CurrentUser } from '../../common/hierarchy.service';
import { MassSchedulesService } from '../mass-schedules/mass-schedules.service';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
    private readonly massSchedulesService: MassSchedulesService,
  ) {}

  private formatToISO(dateString: string): Date {
    if (dateString.includes('Z') || dateString.match(/[+-]\d{2}:\d{2}$/)) {
      return new Date(dateString);
    }

    if (dateString.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
      return new Date(`${dateString}:00.000Z`);
    }

    if (dateString.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/)) {
      return new Date(`${dateString}.000Z`);
    }

    return new Date(dateString);
  }

  private async getScopedPastoralIds(currentUser?: CurrentUser): Promise<string[]> {
    if (!currentUser?.id) {
      return [];
    }

    if (currentUser.pastoralIds?.length) {
      return currentUser.pastoralIds;
    }

    return this.hierarchyService.getUserPastoralIds(currentUser.id, true);
  }

  private getEventPastoralWhere(scopedPastoralIds: string[]) {
    return scopedPastoralIds.length
      ? {
          communityPastoralId: {
            in: scopedPastoralIds,
          },
        }
      : undefined;
  }

  private buildEventPastoralsInclude(scopedPastoralIds: string[] = [], includeAssignments: boolean = false) {
    return {
      where: this.getEventPastoralWhere(scopedPastoralIds),
      include: {
        communityPastoral: {
          select: {
            id: true,
            communityId: true,
            community: {
              select: {
                id: true,
                name: true,
              },
            },
            globalPastoral: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        ...(includeAssignments
          ? {
              assignments: {
                include: {
                  member: {
                    select: {
                      id: true,
                      fullName: true,
                      email: true,
                      phone: true,
                    },
                  },
                },
                orderBy: {
                  createdAt: 'asc' as const,
                },
              },
              _count: {
                select: {
                  assignments: true,
                },
              },
            }
          : {}),
      },
      orderBy: {
        isLeader: 'desc' as const,
      },
    };
  }

  private async ensureCreateAccess(communityId: string, currentUser?: CurrentUser) {
    if (!currentUser) {
      return;
    }

    if (currentUser.role === UserRole.PASTORAL_COORDINATOR) {
      const scopedPastoralIds = await this.getScopedPastoralIds(currentUser);

      if (!scopedPastoralIds.length || currentUser.communityId !== communityId) {
        throw new ForbiddenException(
          'Voce nao tem permissao para criar eventos fora da comunidade da sua pastoral',
        );
      }

      return;
    }

    const canManage = await this.hierarchyService.canManageCommunity(currentUser.id, communityId);
    if (!canManage) {
      throw new ForbiddenException('Voce nao tem permissao para criar eventos nesta comunidade');
    }
  }

  private async ensureManageEventAccess(
    eventId: string,
    currentUser?: CurrentUser,
    pastoralId?: string,
  ): Promise<string[]> {
    if (!currentUser) {
      return [];
    }

    if (currentUser.role === UserRole.PASTORAL_COORDINATOR) {
      const scopedPastoralIds = await this.getScopedPastoralIds(currentUser);

      if (!scopedPastoralIds.length) {
        throw new ForbiddenException('Voce nao possui pastoral vinculada para gerenciar este evento');
      }

      if (pastoralId && !scopedPastoralIds.includes(pastoralId)) {
        throw new ForbiddenException('Voce nao pode operar em outra pastoral');
      }

      if (!pastoralId) {
        const canManage = await this.hierarchyService.canManageEvent(currentUser.id, eventId);
        if (!canManage) {
          throw new ForbiddenException('Voce nao tem permissao para gerenciar este evento');
        }
      }

      return scopedPastoralIds;
    }

    const canManage = await this.hierarchyService.canManageEvent(currentUser.id, eventId);
    if (!canManage) {
      throw new ForbiddenException('Voce nao tem permissao para gerenciar este evento');
    }

    return [];
  }

  async create(createEventDto: CreateEventDto, currentUser?: CurrentUser) {
    const { communityId, startDate, endDate, ...rest } = createEventDto;

    const formattedStartDate = this.formatToISO(startDate);
    const formattedEndDate = endDate ? this.formatToISO(endDate) : undefined;

    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
      include: {
        parish: {
          include: {
            diocese: true,
          },
        },
      },
    });

    if (!community) {
      throw new NotFoundException(`Comunidade com ID ${communityId} nao encontrada`);
    }

    await this.ensureCreateAccess(communityId, currentUser);

    return this.prisma.event.create({
      data: {
        ...rest,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        communityId,
      },
      include: {
        community: {
          select: {
            id: true,
            name: true,
            parish: {
              select: {
                id: true,
                name: true,
                diocese: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        eventPastorals: this.buildEventPastoralsInclude(),
      },
    });
  }

  async findAll(
    communityId?: string,
    type?: EventType,
    q?: string,
    startDate?: string,
    endDate?: string,
    currentUser?: CurrentUser,
    onlyMyPastorals?: boolean,
  ) {
    const hierarchyFilter = currentUser ? this.hierarchyService.applyEventFilter(currentUser) : {};
    const scopedPastoralIds =
      currentUser?.role === UserRole.PASTORAL_COORDINATOR
        ? await this.getScopedPastoralIds(currentUser)
        : [];
    const where: any = { ...hierarchyFilter, deletedAt: null };
    // O filtro de hierarquia pode conter OR; condições extras entram em AND
    // para não sobrescrevê-lo
    const andConditions: any[] = [];

    if (communityId) {
      where.communityId = communityId;
    }

    if (type) {
      where.type = type;
    }

    if (q) {
      andConditions.push({
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { location: { contains: q, mode: 'insensitive' } },
          { notes: { contains: q, mode: 'insensitive' } },
        ],
      });
    }

    if (onlyMyPastorals && currentUser) {
      const myPastoralIds = currentUser.pastoralIds?.length
        ? currentUser.pastoralIds
        : await this.hierarchyService.getUserPastoralIds(currentUser.id, false);

      andConditions.push({
        eventPastorals: {
          some: {
            communityPastoralId: {
              in: myPastoralIds,
            },
          },
        },
      });
    }

    if (andConditions.length) {
      where.AND = [...(where.AND ?? []), ...andConditions];
    }

    if (startDate || endDate) {
      where.startDate = {};
      if (startDate) {
        where.startDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.startDate.lte = new Date(endDate);
      }
    }

    return this.prisma.event.findMany({
      where,
      include: {
        community: {
          select: {
            id: true,
            name: true,
            parish: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        eventPastorals: this.buildEventPastoralsInclude(scopedPastoralIds),
        _count: {
          select: {
            participants: true,
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });
  }

  /**
   * Exporta a agenda em iCalendar (.ics) — importável no Google Calendar,
   * Outlook e Apple Calendar. Janela: últimos 30 dias + próximos 12 meses,
   * respeitando o escopo do usuário (reusa o findAll). Cancelados ficam fora.
   */
  async exportIcs(currentUser?: CurrentUser, communityId?: string): Promise<string> {
    const from = new Date();
    from.setDate(from.getDate() - 30);
    const to = new Date();
    to.setFullYear(to.getFullYear() + 1);

    const events = await this.findAll(
      communityId,
      undefined,
      undefined,
      from.toISOString(),
      to.toISOString(),
      currentUser,
      false,
    );

    const fmt = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const esc = (text: string) =>
      text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Parish//Gestao Paroquial//PT-BR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Agenda Paroquial',
    ];

    for (const event of events as any[]) {
      if (event.status === 'CANCELLED') continue;
      const start = new Date(event.startDate);
      const end = event.endDate ? new Date(event.endDate) : new Date(start.getTime() + 60 * 60 * 1000);
      const description = [event.description, event.community?.name ? `Comunidade: ${event.community.name}` : '']
        .filter(Boolean)
        .join('\n');

      lines.push(
        'BEGIN:VEVENT',
        `UID:${event.id}@parish-app`,
        `DTSTAMP:${fmt(new Date())}`,
        `DTSTART:${fmt(start)}`,
        `DTEND:${fmt(end)}`,
        `SUMMARY:${esc(event.title)}`,
        ...(event.location ? [`LOCATION:${esc(event.location)}`] : []),
        ...(description ? [`DESCRIPTION:${esc(description)}`] : []),
        `STATUS:${event.status === 'PUBLISHED' ? 'CONFIRMED' : 'TENTATIVE'}`,
        'END:VEVENT',
      );
    }

    // Inclui a agenda fixa (Missa/Confissão/Adoração/Terço) como ocorrências.
    // Horário flutuante (sem Z): '2026-07-05T08:00:00' → '20260705T080000'.
    const fixed = await this.massSchedulesService.expandOccurrences(
      from.toISOString(),
      to.toISOString(),
      currentUser,
      communityId,
    );
    const fmtFloating = (isoLocal: string) => isoLocal.replace(/[-:]/g, '');
    for (const occ of fixed) {
      lines.push(
        'BEGIN:VEVENT',
        `UID:${occ.id}@parish-app`,
        `DTSTAMP:${fmt(new Date())}`,
        `DTSTART:${fmtFloating(occ.start)}`,
        `DTEND:${fmtFloating(occ.end)}`,
        `SUMMARY:${esc(occ.title)}`,
        ...(occ.community?.name ? [`DESCRIPTION:${esc(`Comunidade: ${occ.community.name}`)}`] : []),
        'STATUS:CONFIRMED',
        'END:VEVENT',
      );
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  async findUpcoming(communityId?: string, limit: number = 10) {
    const where: any = {
      startDate: {
        gte: new Date(),
      },
      status: 'PUBLISHED',
      deletedAt: null,
    };

    if (communityId) {
      where.communityId = communityId;
    }

    return this.prisma.event.findMany({
      where,
      include: {
        community: {
          select: {
            id: true,
            name: true,
          },
        },
        eventPastorals: this.buildEventPastoralsInclude(),
        _count: {
          select: {
            participants: true,
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
      take: limit,
    });
  }

  async getFavorites(currentUser: CurrentUser) {
    const scopedPastoralIds =
      currentUser.role === UserRole.PASTORAL_COORDINATOR
        ? await this.getScopedPastoralIds(currentUser)
        : [];

    const favorites = await this.prisma.eventFavorite.findMany({
      where: { userId: currentUser.id, event: { deletedAt: null } },
      include: {
        event: {
          include: {
            community: {
              select: {
                id: true,
                name: true,
                parish: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            eventPastorals: this.buildEventPastoralsInclude(scopedPastoralIds),
            _count: {
              select: {
                participants: true,
              },
            },
          },
        },
      },
      orderBy: {
        event: {
          startDate: 'asc',
        },
      },
    });

    return favorites.map((favorite) => favorite.event);
  }

  async addFavorite(eventId: string, currentUser: CurrentUser) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Evento com ID ${eventId} nao encontrado`);
    }

    const hasAccess = await this.hierarchyService.hasAccessToEvent(currentUser.id, eventId);

    if (!hasAccess) {
      throw new ForbiddenException('Voce nao tem permissao para favoritar este evento');
    }

    await this.prisma.eventFavorite.upsert({
      where: {
        userId_eventId: {
          userId: currentUser.id,
          eventId,
        },
      },
      update: {},
      create: {
        userId: currentUser.id,
        eventId,
      },
    });

    return { eventId, favorite: true };
  }

  async removeFavorite(eventId: string, currentUser: CurrentUser) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Evento com ID ${eventId} nao encontrado`);
    }

    const hasAccess = await this.hierarchyService.hasAccessToEvent(currentUser.id, eventId);

    if (!hasAccess) {
      throw new ForbiddenException('Voce nao tem permissao para desfavoritar este evento');
    }

    await this.prisma.eventFavorite.deleteMany({
      where: {
        userId: currentUser.id,
        eventId,
      },
    });

    return { eventId, favorite: false };
  }

  async findRecurring(communityId?: string) {
    const where: any = { isRecurring: true, deletedAt: null };

    if (communityId) {
      where.communityId = communityId;
    }

    return this.prisma.event.findMany({
      where,
      include: {
        community: {
          select: {
            id: true,
            name: true,
          },
        },
        eventPastorals: this.buildEventPastoralsInclude(),
      },
      orderBy: {
        startDate: 'asc',
      },
    });
  }

  async findOne(id: string, currentUser?: CurrentUser) {
    if (currentUser) {
      const hasAccess = await this.hierarchyService.hasAccessToEvent(currentUser.id, id);
      if (!hasAccess) {
        throw new ForbiddenException('Voce nao tem permissao para acessar este evento');
      }
    }

    const scopedPastoralIds =
      currentUser?.role === UserRole.PASTORAL_COORDINATOR
        ? await this.getScopedPastoralIds(currentUser)
        : [];

    const event = await this.prisma.event.findFirst({
      where: { id, deletedAt: null },
      include: {
        community: {
          include: {
            parish: {
              include: {
                diocese: true,
              },
            },
          },
        },
        eventPastorals: this.buildEventPastoralsInclude(scopedPastoralIds, true),
        participants: {
          include: {
            member: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
              },
            },
          },
          orderBy: {
            registeredAt: 'asc',
          },
        },
        _count: {
          select: {
            participants: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Evento com ID ${id} nao encontrado`);
    }

    return event;
  }

  async update(id: string, updateEventDto: UpdateEventDto, currentUser?: CurrentUser) {
    await this.ensureManageEventAccess(id, currentUser);

    if (
      currentUser?.role === UserRole.PASTORAL_COORDINATOR &&
      updateEventDto.communityId &&
      updateEventDto.communityId !== currentUser.communityId
    ) {
      throw new ForbiddenException('Voce nao pode mover o evento para outra comunidade');
    }

    const dataToUpdate: any = { ...updateEventDto };
    if (updateEventDto.startDate) {
      dataToUpdate.startDate = this.formatToISO(updateEventDto.startDate as string);
    }
    if (updateEventDto.endDate) {
      dataToUpdate.endDate = this.formatToISO(updateEventDto.endDate as string);
    }

    return this.prisma.event.update({
      where: { id },
      data: dataToUpdate,
      include: {
        community: {
          select: {
            id: true,
            name: true,
          },
        },
        eventPastorals: this.buildEventPastoralsInclude(),
        _count: {
          select: {
            participants: true,
          },
        },
      },
    });
  }

  async remove(id: string, currentUser?: CurrentUser) {
    await this.ensureManageEventAccess(id, currentUser);

    // Soft delete: preserva escalas, presenças e histórico vinculados
    return this.prisma.event.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findByType(type: EventType, communityId?: string) {
    const where: any = { type, deletedAt: null };

    if (communityId) {
      where.communityId = communityId;
    }

    return this.prisma.event.findMany({
      where,
      include: {
        community: {
          select: {
            id: true,
            name: true,
          },
        },
        eventPastorals: this.buildEventPastoralsInclude(),
      },
      orderBy: {
        startDate: 'asc',
      },
    });
  }

  async findByDateRange(startDate: string, endDate: string, communityId?: string) {
    const where: any = {
      startDate: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
      deletedAt: null,
    };

    if (communityId) {
      where.communityId = communityId;
    }

    return this.prisma.event.findMany({
      where,
      include: {
        community: {
          select: {
            id: true,
            name: true,
          },
        },
        eventPastorals: this.buildEventPastoralsInclude(),
      },
      orderBy: {
        startDate: 'asc',
      },
    });
  }

  async addParticipant(eventId: string, memberId: string) {
    const event = await this.findOne(eventId);

    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      throw new NotFoundException(`Membro com ID ${memberId} nao encontrado`);
    }

    const existing = await this.prisma.eventParticipant.findUnique({
      where: {
        eventId_memberId: {
          eventId,
          memberId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Membro ja esta inscrito neste evento');
    }

    if (event.maxParticipants) {
      const count = await this.prisma.eventParticipant.count({
        where: { eventId },
      });

      if (count >= event.maxParticipants) {
        throw new BadRequestException('Evento lotado');
      }
    }

    return this.prisma.eventParticipant.create({
      data: {
        eventId,
        memberId,
      },
      include: {
        member: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
    });
  }

  async removeParticipant(eventId: string, memberId: string) {
    const participant = await this.prisma.eventParticipant.findUnique({
      where: {
        eventId_memberId: {
          eventId,
          memberId,
        },
      },
    });

    if (!participant) {
      throw new NotFoundException('Inscricao nao encontrada');
    }

    return this.prisma.eventParticipant.delete({
      where: {
        eventId_memberId: {
          eventId,
          memberId,
        },
      },
    });
  }

  async getParticipants(eventId: string, currentUser?: CurrentUser) {
    await this.findOne(eventId);

    // A lista de participantes expõe contatos pessoais (e-mail/telefone):
    // exigir acesso hierárquico ao evento.
    if (currentUser && currentUser.role !== 'SYSTEM_ADMIN') {
      const hasAccess = await this.hierarchyService.hasAccessToEvent(currentUser.id, eventId);
      if (!hasAccess) {
        throw new ForbiddenException('Você não tem permissão para ver os participantes deste evento');
      }
    }

    return this.prisma.eventParticipant.findMany({
      where: { eventId },
      include: {
        member: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            communityId: true,
            community: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        registeredAt: 'asc',
      },
    });
  }

  async duplicate(id: string, duplicateEventDto: DuplicateEventDto, user: CurrentUser) {
    const originalEvent = await this.findOne(id, user);
    await this.ensureManageEventAccess(id, user);

    const duration = originalEvent.endDate
      ? originalEvent.endDate.getTime() - originalEvent.startDate.getTime()
      : 0;

    const pastoralsToDuplicate = originalEvent.eventPastorals || [];
    const schedulesToCopy = duplicateEventDto.copyTeam
      ? await this.prisma.schedule.findMany({
          where: { eventId: id },
          include: { pastorals: true, assignments: true },
        })
      : [];
    const createdEvents: any[] = [];

    for (const dateStr of duplicateEventDto.dates) {
      const newStartDate = this.formatToISO(dateStr);
      const newEndDate = duration > 0 ? new Date(newStartDate.getTime() + duration) : undefined;

      const newEvent = await this.prisma.event.create({
        data: {
          title: originalEvent.title,
          description: originalEvent.description,
          type: originalEvent.type,
          startDate: newStartDate,
          endDate: newEndDate,
          location: originalEvent.location,
          isRecurring: false,
          maxParticipants: originalEvent.maxParticipants,
          isPublic: originalEvent.isPublic,
          status: originalEvent.status,
          communityId: originalEvent.communityId,
          eventPastorals: pastoralsToDuplicate.length
            ? {
                create: pastoralsToDuplicate.map((eventPastoral: any) => ({
                  communityPastoralId: eventPastoral.communityPastoralId,
                  role: eventPastoral.role,
                  isLeader: eventPastoral.isLeader,
                  requiredPeople: eventPastoral.requiredPeople ?? 0,
                  notes: eventPastoral.notes,
                })),
              }
            : undefined,
        },
        include: {
          community: {
            select: {
              id: true,
              name: true,
              parish: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          eventPastorals: this.buildEventPastoralsInclude(),
          _count: {
            select: {
              participants: true,
            },
          },
        },
      });

      if (schedulesToCopy.length > 0) {
        await this.cloneSchedulesForEvent(
          schedulesToCopy,
          originalEvent.startDate,
          newEvent.id,
          newStartDate,
        );
      }

      createdEvents.push(newEvent);
    }

    return {
      message: `${createdEvents.length} eventos criados com sucesso`,
      events: createdEvents,
    };
  }

  /**
   * Clona as escalas (e a equipe ja escalada) de um evento original para um novo evento
   * duplicado, preservando o deslocamento de horario entre a escala e o inicio do evento.
   * Atribuicoes clonadas voltam para status PENDING (a pessoa precisa reconfirmar).
   */
  private async cloneSchedulesForEvent(
    schedulesToCopy: Array<{
      title: string;
      description: string | null;
      date: Date;
      pastorals: Array<{
        communityPastoralId: string;
        role: string | null;
        isLeader: boolean;
        requiredPeople: number;
      }>;
      assignments: Array<{
        memberId: string;
        role: string;
        communityPastoralId: string | null;
      }>;
    }>,
    originalEventStartDate: Date,
    newEventId: string,
    newEventStartDate: Date,
  ) {
    for (const originalSchedule of schedulesToCopy) {
      const offsetMs = originalSchedule.date.getTime() - originalEventStartDate.getTime();
      const newScheduleDate = new Date(newEventStartDate.getTime() + offsetMs);

      await this.prisma.schedule.create({
        data: {
          title: originalSchedule.title,
          description: originalSchedule.description,
          date: newScheduleDate,
          eventId: newEventId,
          pastorals: originalSchedule.pastorals.length
            ? {
                create: originalSchedule.pastorals.map((pastoral) => ({
                  communityPastoralId: pastoral.communityPastoralId,
                  role: pastoral.role,
                  isLeader: pastoral.isLeader,
                  requiredPeople: pastoral.requiredPeople,
                })),
              }
            : undefined,
          assignments: originalSchedule.assignments.length
            ? {
                create: originalSchedule.assignments.map((assignment) => ({
                  memberId: assignment.memberId,
                  role: assignment.role,
                  communityPastoralId: assignment.communityPastoralId,
                })),
              }
            : undefined,
        },
      });
    }
  }

  async addPastoralToEvent(eventId: string, dto: AddPastoralToEventDto, currentUser?: CurrentUser) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        eventPastorals: true,
      },
    });

    if (!event) {
      throw new NotFoundException(`Evento com ID ${eventId} nao encontrado`);
    }

    const pastoral = await this.prisma.communityPastoral.findUnique({
      where: { id: dto.communityPastoralId },
      include: {
        globalPastoral: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!pastoral) {
      throw new NotFoundException(`Pastoral com ID ${dto.communityPastoralId} nao encontrada`);
    }

    if (pastoral.communityId !== event.communityId) {
      throw new BadRequestException('Evento e pastoral precisam pertencer a mesma comunidade');
    }

    if (currentUser) {
      if (currentUser.role === UserRole.PASTORAL_COORDINATOR) {
        const scopedPastoralIds = await this.getScopedPastoralIds(currentUser);

        if (!scopedPastoralIds.includes(dto.communityPastoralId) || currentUser.communityId !== event.communityId) {
          throw new ForbiddenException('Voce so pode vincular a sua pastoral a eventos da sua comunidade');
        }
      } else {
        await this.ensureManageEventAccess(eventId, currentUser);
      }
    }

    return this.prisma.eventPastoral.upsert({
      where: {
        eventId_communityPastoralId: {
          eventId,
          communityPastoralId: dto.communityPastoralId,
        },
      },
      update: {
        role: dto.role,
        isLeader: dto.isLeader || false,
        requiredPeople: dto.requiredPeople ?? 0,
      },
      create: {
        eventId,
        communityPastoralId: dto.communityPastoralId,
        role: dto.role,
        isLeader: dto.isLeader || false,
        requiredPeople: dto.requiredPeople ?? 0,
      },
      include: {
        communityPastoral: {
          select: {
            id: true,
            communityId: true,
            // Campo legado para exibir planejamento no app web
            // quando não definido, considera 0
            globalPastoral: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async getEventPastorals(eventId: string, currentUser?: CurrentUser) {
    if (currentUser) {
      const hasAccess = await this.hierarchyService.hasAccessToEvent(currentUser.id, eventId);
      if (!hasAccess) {
        throw new ForbiddenException('Voce nao tem permissao para acessar este evento');
      }
    }

    const scopedPastoralIds =
      currentUser?.role === UserRole.PASTORAL_COORDINATOR
        ? await this.getScopedPastoralIds(currentUser)
        : [];

    return this.prisma.eventPastoral.findMany({
      where: {
        eventId,
        ...(this.getEventPastoralWhere(scopedPastoralIds) || {}),
      },
      include: {
        communityPastoral: {
          select: {
            id: true,
            communityId: true,
            globalPastoral: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        assignments: {
          include: {
            member: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        _count: {
          select: {
            assignments: true,
          },
        },
      },
      orderBy: {
        isLeader: 'desc',
      },
    });
  }

  async removePastoralFromEvent(eventId: string, pastoralId: string, currentUser?: CurrentUser) {
    if (currentUser) {
      if (currentUser.role === UserRole.PASTORAL_COORDINATOR) {
        const scopedPastoralIds = await this.getScopedPastoralIds(currentUser);
        if (!scopedPastoralIds.includes(pastoralId)) {
          throw new ForbiddenException('Voce nao pode remover outra pastoral deste evento');
        }
      } else {
        await this.ensureManageEventAccess(eventId, currentUser);
      }
    }

    const eventPastoral = await this.prisma.eventPastoral.findUnique({
      where: {
        eventId_communityPastoralId: {
          eventId,
          communityPastoralId: pastoralId,
        },
      },
    });

    if (!eventPastoral) {
      throw new NotFoundException('Pastoral nao esta vinculada a este evento');
    }

    return this.prisma.eventPastoral.delete({
      where: {
        eventId_communityPastoralId: {
          eventId,
          communityPastoralId: pastoralId,
        },
      },
    });
  }

  async createAssignment(
    eventId: string,
    pastoralId: string,
    dto: CreateAssignmentDto,
    currentUser?: CurrentUser,
  ) {
    if (currentUser) {
      if (currentUser.role === UserRole.PASTORAL_COORDINATOR) {
        const scopedPastoralIds = await this.getScopedPastoralIds(currentUser);
        if (!scopedPastoralIds.includes(pastoralId)) {
          throw new ForbiddenException('Voce nao pode escalar membros de outra pastoral');
        }
      } else {
        await this.ensureManageEventAccess(eventId, currentUser);
      }
    }

    const eventPastoral = await this.prisma.eventPastoral.findUnique({
      where: {
        eventId_communityPastoralId: {
          eventId,
          communityPastoralId: pastoralId,
        },
      },
    });

    if (!eventPastoral) {
      throw new NotFoundException('Pastoral nao esta vinculada a este evento');
    }

    const pastoralMember = await this.prisma.pastoralMember.findFirst({
      where: {
        communityPastoralId: pastoralId,
        memberId: dto.memberId,
        isActive: true,
      },
    });

    if (!pastoralMember) {
      throw new BadRequestException('Membro nao pertence a esta pastoral');
    }

    return this.prisma.eventPastoralAssignment.create({
      data: {
        eventPastoralId: eventPastoral.id,
        memberId: dto.memberId,
        role: dto.role,
        notes: dto.notes,
      },
      include: {
        member: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
    });
  }

  async getAssignments(eventId: string, pastoralId: string, currentUser?: CurrentUser) {
    if (currentUser) {
      if (currentUser.role === UserRole.PASTORAL_COORDINATOR) {
        const scopedPastoralIds = await this.getScopedPastoralIds(currentUser);
        if (!scopedPastoralIds.includes(pastoralId)) {
          throw new ForbiddenException('Voce nao pode visualizar atribuicoes de outra pastoral');
        }
      } else {
        await this.ensureManageEventAccess(eventId, currentUser);
      }
    }

    const eventPastoral = await this.prisma.eventPastoral.findUnique({
      where: {
        eventId_communityPastoralId: {
          eventId,
          communityPastoralId: pastoralId,
        },
      },
    });

    if (!eventPastoral) {
      throw new NotFoundException('Pastoral nao esta vinculada a este evento');
    }

    return this.prisma.eventPastoralAssignment.findMany({
      where: { eventPastoralId: eventPastoral.id },
      include: {
        member: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async checkinAssignment(
    assignmentId: string,
    dto: CheckinAssignmentDto,
    currentUser?: CurrentUser,
  ) {
    const assignment = await this.prisma.eventPastoralAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        eventPastoral: {
          select: {
            eventId: true,
            communityPastoralId: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Escalacao nao encontrada');
    }

    if (currentUser) {
      if (currentUser.role === UserRole.PASTORAL_COORDINATOR) {
        const scopedPastoralIds = await this.getScopedPastoralIds(currentUser);
        if (!scopedPastoralIds.includes(assignment.eventPastoral.communityPastoralId)) {
          throw new ForbiddenException('Voce nao pode registrar presenca em outra pastoral');
        }
      } else {
        await this.ensureManageEventAccess(assignment.eventPastoral.eventId, currentUser);
      }
    }

    return this.prisma.eventPastoralAssignment.update({
      where: { id: assignmentId },
      data: {
        checkedIn: dto.checkedIn,
        checkedInAt: dto.checkedIn ? new Date() : null,
      },
      include: {
        member: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
    });
  }

  async removeAssignment(assignmentId: string, currentUser?: CurrentUser) {
    const assignment = await this.prisma.eventPastoralAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        eventPastoral: {
          select: {
            eventId: true,
            communityPastoralId: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Escalacao nao encontrada');
    }

    if (currentUser) {
      if (currentUser.role === UserRole.PASTORAL_COORDINATOR) {
        const scopedPastoralIds = await this.getScopedPastoralIds(currentUser);
        if (!scopedPastoralIds.includes(assignment.eventPastoral.communityPastoralId)) {
          throw new ForbiddenException('Voce nao pode remover atribuicoes de outra pastoral');
        }
      } else {
        await this.ensureManageEventAccess(assignment.eventPastoral.eventId, currentUser);
      }
    }

    return this.prisma.eventPastoralAssignment.delete({
      where: { id: assignmentId },
    });
  }
}
