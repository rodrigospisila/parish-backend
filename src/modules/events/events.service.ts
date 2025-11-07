import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { AddPastoralToEventDto } from './dto/add-pastoral-to-event.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { CheckinAssignmentDto } from './dto/checkin-assignment.dto';
import { EventType, UserRole } from '@prisma/client';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Converte string de data para formato ISO-8601 completo aceito pelo Prisma
   * @param dateString - Data no formato "YYYY-MM-DDTHH:mm" ou similar
   * @returns Date object no formato ISO-8601
   */
  private formatToISO(dateString: string): Date {
    // Se já tem timezone (Z ou +/-), retorna como Date
    if (dateString.includes('Z') || dateString.match(/[+-]\d{2}:\d{2}$/)) {
      return new Date(dateString);
    }
    // Se não tem segundos, adiciona :00.000Z
    if (dateString.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
      return new Date(dateString + ':00.000Z');
    }
    // Se tem segundos mas não tem milissegundos, adiciona .000Z
    if (dateString.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/)) {
      return new Date(dateString + '.000Z');
    }
    // Caso contrário, tenta converter diretamente
    return new Date(dateString);
  }

  async create(createEventDto: CreateEventDto, user: any) {
    const { communityId, startDate, endDate, ...rest } = createEventDto;

    // Converter datas para formato ISO-8601 completo
    const formattedStartDate = this.formatToISO(startDate);
    const formattedEndDate = endDate ? this.formatToISO(endDate) : undefined;

    // Verificar se a comunidade existe
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
      throw new NotFoundException(`Comunidade com ID ${communityId} não encontrada`);
    }

    // Verificar permissão por diocese
    if (user.role === UserRole.DIOCESAN_ADMIN && community.parish.dioceseId !== user.dioceseId) {
      throw new BadRequestException('Você não tem permissão para criar eventos nesta comunidade');
    }

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
      },
    });
  }

  async findAll(
    communityId?: string,
    type?: EventType,
    startDate?: string,
    endDate?: string,
    user?: any,
  ) {
    const where: any = {};

    // Filtrar por diocese se for DIOCESAN_ADMIN
    if (user && user.role === UserRole.DIOCESAN_ADMIN && user.dioceseId) {
      where.community = {
        parish: {
          dioceseId: user.dioceseId,
        },
      };
    }

    // PARISH_ADMIN só vê eventos das comunidades da sua paróquia
    if (user && user.role === UserRole.PARISH_ADMIN && user.parishId) {
      where.community = {
        parishId: user.parishId,
      };
    }

    // COMMUNITY_COORDINATOR só vê eventos da sua comunidade
    if (user && user.role === UserRole.COMMUNITY_COORDINATOR && user.communityId) {
      where.communityId = user.communityId;
    }

    if (communityId) {
      where.communityId = communityId;
    }

    if (type) {
      where.type = type;
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

  async findUpcoming(communityId?: string, limit: number = 10) {
    const where: any = {
      startDate: {
        gte: new Date(),
      },
      status: 'PUBLISHED',
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

  async findRecurring(communityId?: string) {
    const where: any = { isRecurring: true };

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
      },
      orderBy: {
        startDate: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
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
        eventPastorals: {
          include: {
            communityPastoral: {
              select: {
                id: true,
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
        },
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
      throw new NotFoundException(`Evento com ID ${id} não encontrado`);
    }

    return event;
  }

  async update(id: string, updateEventDto: UpdateEventDto) {
    await this.findOne(id); // Verifica se existe

    // Formatar datas se existirem no DTO
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
        _count: {
          select: {
            participants: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Verifica se existe

    return this.prisma.event.delete({
      where: { id },
    });
  }

  // Buscar eventos por tipo
  async findByType(type: EventType, communityId?: string) {
    const where: any = { type };

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
      },
      orderBy: {
        startDate: 'asc',
      },
    });
  }

  // Buscar eventos em um intervalo de datas
  async findByDateRange(startDate: string, endDate: string, communityId?: string) {
    const where: any = {
      startDate: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
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
      },
      orderBy: {
        startDate: 'asc',
      },
    });
  }

  // ============================================
  // PARTICIPANT MANAGEMENT
  // ============================================

  async addParticipant(eventId: string, memberId: string) {
    // Verificar se o evento existe
    const event = await this.findOne(eventId);

    // Verificar se o membro existe
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      throw new NotFoundException(`Membro com ID ${memberId} não encontrado`);
    }

    // Verificar se já está inscrito
    const existing = await this.prisma.eventParticipant.findUnique({
      where: {
        eventId_memberId: {
          eventId,
          memberId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Membro já está inscrito neste evento');
    }

    // Verificar vagas disponíveis
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
      throw new NotFoundException('Inscrição não encontrada');
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

  async getParticipants(eventId: string) {
    await this.findOne(eventId); // Verifica se o evento existe

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

  // ============================================
  // DUPLICATE EVENT
  // ============================================

  /**
   * Duplica um evento para múltiplas datas
   * @param id ID do evento original
   * @param duplicateEventDto DTO com array de datas
   * @param user Usuário autenticado
   * @returns Array de eventos criados
   */
  async duplicate(id: string, duplicateEventDto: any, user: any) {
    // Buscar evento original
    const originalEvent = await this.findOne(id);

    if (!originalEvent) {
      throw new NotFoundException(`Evento com ID ${id} não encontrado`);
    }

    // Calcular duração do evento
    const duration = originalEvent.endDate
      ? originalEvent.endDate.getTime() - originalEvent.startDate.getTime()
      : 0;

    // Criar eventos duplicados
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
          isRecurring: false, // Eventos duplicados não são recorrentes
          maxParticipants: originalEvent.maxParticipants,
          isPublic: originalEvent.isPublic,
          status: originalEvent.status,
          communityId: originalEvent.communityId,
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
          _count: {
            select: {
              participants: true,
            },
          },
        },
      });

      createdEvents.push(newEvent);
    }

    return {
      message: `${createdEvents.length} eventos criados com sucesso`,
      events: createdEvents,
    };
  }

  // ============================================
  // PASTORAL MANAGEMENT
  // ============================================

  async addPastoralToEvent(eventId: string, dto: AddPastoralToEventDto) {
    // Verificar se o evento existe
    await this.findOne(eventId);

    // Verificar se a pastoral existe
    const pastoral = await this.prisma.communityPastoral.findUnique({
      where: { id: dto.communityPastoralId },
    });

    if (!pastoral) {
      throw new NotFoundException(`Pastoral com ID ${dto.communityPastoralId} não encontrada`);
    }

    // Verificar se já está vinculada
    const existing = await this.prisma.eventPastoral.findUnique({
      where: {
        eventId_communityPastoralId: {
          eventId,
          communityPastoralId: dto.communityPastoralId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Pastoral já está vinculada a este evento');
    }

    return this.prisma.eventPastoral.create({
      data: {
        eventId,
        communityPastoralId: dto.communityPastoralId,
        role: dto.role,
        isLeader: dto.isLeader || false,
      },
      include: {
        communityPastoral: {
          select: {
            id: true,
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

  async getEventPastorals(eventId: string) {
    await this.findOne(eventId);

    return this.prisma.eventPastoral.findMany({
      where: { eventId },
      include: {
        communityPastoral: {
          select: {
            id: true,
            globalPastoral: {
              select: {
                id: true,
                name: true,
              },
            },
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

  async removePastoralFromEvent(eventId: string, pastoralId: string) {
    const eventPastoral = await this.prisma.eventPastoral.findUnique({
      where: {
        eventId_communityPastoralId: {
          eventId,
          communityPastoralId: pastoralId,
        },
      },
    });

    if (!eventPastoral) {
      throw new NotFoundException('Pastoral não está vinculada a este evento');
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

  // ============================================
  // ASSIGNMENT MANAGEMENT (ESCALA)
  // ============================================

  async createAssignment(eventId: string, pastoralId: string, dto: CreateAssignmentDto) {
    // Verificar se o EventPastoral existe
    const eventPastoral = await this.prisma.eventPastoral.findUnique({
      where: {
        eventId_communityPastoralId: {
          eventId,
          communityPastoralId: pastoralId,
        },
      },
    });

    if (!eventPastoral) {
      throw new NotFoundException('Pastoral não está vinculada a este evento');
    }

    // Verificar se o membro existe e pertence à pastoral
    const pastoralMember = await this.prisma.pastoralMember.findFirst({
      where: {
        communityPastoralId: pastoralId,
        memberId: dto.memberId,
      },
    });

    if (!pastoralMember) {
      throw new BadRequestException('Membro não pertence a esta pastoral');
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

  async getAssignments(eventId: string, pastoralId: string) {
    // Verificar se o EventPastoral existe
    const eventPastoral = await this.prisma.eventPastoral.findUnique({
      where: {
        eventId_communityPastoralId: {
          eventId,
          communityPastoralId: pastoralId,
        },
      },
    });

    if (!eventPastoral) {
      throw new NotFoundException('Pastoral não está vinculada a este evento');
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

  async checkinAssignment(assignmentId: string, dto: CheckinAssignmentDto) {
    const assignment = await this.prisma.eventPastoralAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException('Escalação não encontrada');
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

  async removeAssignment(assignmentId: string) {
    const assignment = await this.prisma.eventPastoralAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException('Escalação não encontrada');
    }

    return this.prisma.eventPastoralAssignment.delete({
      where: { id: assignmentId },
    });
  }
}
