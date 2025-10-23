import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateMassScheduleDto } from './dto/create-mass-schedule.dto';
import { UpdateMassScheduleDto } from './dto/update-mass-schedule.dto';
import { MassScheduleType } from '@prisma/client';

@Injectable()
export class MassSchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createMassScheduleDto: CreateMassScheduleDto) {
    const { communityId, ...rest } = createMassScheduleDto;

    // Verificar se a comunidade existe
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
    });

    if (!community) {
      throw new NotFoundException(`Comunidade com ID ${communityId} não encontrada`);
    }

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

  async update(id: string, updateMassScheduleDto: UpdateMassScheduleDto) {
    await this.findOne(id); // Verifica se existe

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

  async remove(id: string) {
    await this.findOne(id); // Verifica se existe

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
}

