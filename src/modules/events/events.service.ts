import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventType, UserRole } from '@prisma/client';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createEventDto: CreateEventDto, user: any) {
    const { communityId, ...rest } = createEventDto;

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

    return this.prisma.event.update({
      where: { id },
      data: updateEventDto,
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
}
