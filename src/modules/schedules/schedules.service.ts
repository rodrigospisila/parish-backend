import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  // ========== SCHEDULES ==========

  async createSchedule(createScheduleDto: CreateScheduleDto) {
    const { eventId, ...rest } = createScheduleDto;

    // Verificar se o evento existe
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Evento com ID ${eventId} não encontrado`);
    }

    return this.prisma.schedule.create({
      data: {
        ...rest,
        eventId,
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
      },
    });
  }

  async findAllSchedules(eventId?: string) {
    const where: any = {};

    if (eventId) {
      where.eventId = eventId;
    }

    return this.prisma.schedule.findMany({
      where,
      include: {
        event: {
          select: {
            id: true,
            title: true,
            type: true,
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
        },
        _count: {
          select: {
            assignments: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });
  }

  async findOneSchedule(id: string) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
      include: {
        event: true,
        assignments: {
          include: {
            member: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                photoUrl: true,
              },
            },
          },
          orderBy: {
            role: 'asc',
          },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException(`Escala com ID ${id} não encontrada`);
    }

    return schedule;
  }

  async removeSchedule(id: string) {
    await this.findOneSchedule(id); // Verifica se existe

    return this.prisma.schedule.delete({
      where: { id },
    });
  }

  // ========== ASSIGNMENTS ==========

  async createAssignment(createAssignmentDto: CreateAssignmentDto) {
    const { scheduleId, memberId, role } = createAssignmentDto;

    // Verificar se a escala existe
    const schedule = await this.prisma.schedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new NotFoundException(`Escala com ID ${scheduleId} não encontrada`);
    }

    // Verificar se o membro existe
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      throw new NotFoundException(`Membro com ID ${memberId} não encontrado`);
    }

    // Verificar se o membro já está atribuído nesta escala com a mesma função
    const existingAssignment = await this.prisma.scheduleAssignment.findFirst({
      where: {
        scheduleId,
        memberId,
        role,
      },
    });

    if (existingAssignment) {
      throw new BadRequestException(
        `Membro já está atribuído a esta escala com a função ${role}`,
      );
    }

    return this.prisma.scheduleAssignment.create({
      data: {
        role,
        scheduleId,
        memberId,
      },
      include: {
        schedule: {
          select: {
            id: true,
            title: true,
            date: true,
          },
        },
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

  async findAllAssignments(scheduleId?: string, memberId?: string) {
    const where: any = {};

    if (scheduleId) {
      where.scheduleId = scheduleId;
    }

    if (memberId) {
      where.memberId = memberId;
    }

    return this.prisma.scheduleAssignment.findMany({
      where,
      include: {
        schedule: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
                type: true,
              },
            },
          },
        },
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
        createdAt: 'desc',
      },
    });
  }

  async findOneAssignment(id: string) {
    const assignment = await this.prisma.scheduleAssignment.findUnique({
      where: { id },
      include: {
        schedule: {
          include: {
            event: true,
          },
        },
        member: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException(`Atribuição com ID ${id} não encontrada`);
    }

    return assignment;
  }

  async removeAssignment(id: string) {
    await this.findOneAssignment(id); // Verifica se existe

    return this.prisma.scheduleAssignment.delete({
      where: { id },
    });
  }

  // ========== CHECK-IN ==========

  async checkIn(id: string) {
    const assignment = await this.findOneAssignment(id);

    if (assignment.checkedIn) {
      throw new BadRequestException('Check-in já realizado');
    }

    return this.prisma.scheduleAssignment.update({
      where: { id },
      data: {
        checkedIn: true,
        checkedInAt: new Date(),
      },
      include: {
        schedule: {
          select: {
            id: true,
            title: true,
            date: true,
          },
        },
        member: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });
  }

  async undoCheckIn(id: string) {
    const assignment = await this.findOneAssignment(id);

    if (!assignment.checkedIn) {
      throw new BadRequestException('Check-in não foi realizado');
    }

    return this.prisma.scheduleAssignment.update({
      where: { id },
      data: {
        checkedIn: false,
        checkedInAt: null,
      },
    });
  }

  // ========== RELATÓRIOS ==========

  async getMemberStats(memberId: string) {
    const assignments = await this.prisma.scheduleAssignment.findMany({
      where: { memberId },
      include: {
        schedule: {
          select: {
            date: true,
          },
        },
      },
    });

    const total = assignments.length;
    const checkedIn = assignments.filter((a) => a.checkedIn).length;
    const missed = total - checkedIn;
    const attendanceRate = total > 0 ? (checkedIn / total) * 100 : 0;

    return {
      memberId,
      total,
      checkedIn,
      missed,
      attendanceRate: parseFloat(attendanceRate.toFixed(2)),
    };
  }
}

