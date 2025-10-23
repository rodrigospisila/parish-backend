import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventType } from '@prisma/client';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createEventDto: CreateEventDto) {
    const { communityId, ...rest } = createEventDto;

    // Verificar se a comunidade existe
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
    });

    if (!community) {
      throw new NotFoundException(`Comunidade com ID ${communityId} não encontrada`);
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
  ) {
    const where: any = {};

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
          },
        },
        schedules: {
          select: {
            id: true,
            title: true,
            date: true,
          },
        },
        _count: {
          select: {
            schedules: true,
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
        community: true,
        schedules: {
          include: {
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
            },
          },
          orderBy: {
            date: 'asc',
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
}

