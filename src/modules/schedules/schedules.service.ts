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

  // ========== MEMBROS ELEGÍVEIS ==========

  /**
   * Busca membros elegíveis para uma escala baseado nas pastorais vinculadas ao evento
   * Se o evento tiver pastorais vinculadas, retorna apenas membros dessas pastorais
   * Se não tiver pastorais vinculadas, retorna todos os membros da comunidade do evento
   */
  async findEligibleMembers(eventId: string) {
    // Buscar o evento com suas pastorais vinculadas
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        eventPastorals: {
          include: {
            communityPastoral: {
              include: {
                members: {
                  where: { isActive: true },
                  include: {
                    member: {
                      select: {
                        id: true,
                        fullName: true,
                        email: true,
                        phone: true,
                        photoUrl: true,
                        status: true,
                      },
                    },
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
          },
        },
        community: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Evento com ID ${eventId} não encontrado`);
    }

    // Se o evento tem pastorais vinculadas, retornar membros dessas pastorais
    if (event.eventPastorals && event.eventPastorals.length > 0) {
      const membersMap = new Map();
      const pastoralInfo: any[] = [];

      for (const ep of event.eventPastorals) {
        const pastoral = ep.communityPastoral;
        const pastoralName = pastoral.globalPastoral?.name || 'Pastoral';
        
        pastoralInfo.push({
          id: pastoral.id,
          name: pastoralName,
          role: ep.role,
          isLeader: ep.isLeader,
        });

        for (const pm of pastoral.members) {
          if (pm.member.status === 'ACTIVE') {
            if (!membersMap.has(pm.member.id)) {
              membersMap.set(pm.member.id, {
                ...pm.member,
                pastorals: [{ name: pastoralName, role: pm.role }],
              });
            } else {
              const existing = membersMap.get(pm.member.id);
              existing.pastorals.push({ name: pastoralName, role: pm.role });
            }
          }
        }
      }

      return {
        eventId: event.id,
        eventTitle: event.title,
        community: event.community,
        pastorals: pastoralInfo,
        hasPastorals: true,
        members: Array.from(membersMap.values()),
      };
    }

    // Se não tem pastorais vinculadas, retornar todos os membros ativos da comunidade
    const members = await this.prisma.member.findMany({
      where: {
        communityId: event.communityId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        photoUrl: true,
        status: true,
      },
      orderBy: {
        fullName: 'asc',
      },
    });

    return {
      eventId: event.id,
      eventTitle: event.title,
      community: event.community,
      pastorals: [],
      hasPastorals: false,
      members: members.map(m => ({ ...m, pastorals: [] })),
    };
  }

  // ========== MINHAS ESCALAS ==========

  /**
   * Busca as escalas do usuário logado
   * Retorna apenas escalas futuras ou do dia atual
   */
  async findMyAssignments(userId: string) {
    // Buscar o membro vinculado ao usuário
    const member = await this.prisma.member.findFirst({
      where: { userId },
    });

    if (!member) {
      return {
        upcoming: [],
        past: [],
        message: 'Usuário não possui cadastro de membro',
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Buscar escalas futuras
    const upcomingAssignments = await this.prisma.scheduleAssignment.findMany({
      where: {
        memberId: member.id,
        schedule: {
          date: {
            gte: today,
          },
        },
      },
      include: {
        schedule: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
                type: true,
                location: true,
                community: {
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
      orderBy: {
        schedule: {
          date: 'asc',
        },
      },
    });

    // Buscar escalas passadas (últimos 30 dias)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const pastAssignments = await this.prisma.scheduleAssignment.findMany({
      where: {
        memberId: member.id,
        schedule: {
          date: {
            lt: today,
            gte: thirtyDaysAgo,
          },
        },
      },
      include: {
        schedule: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
                type: true,
                location: true,
              },
            },
          },
        },
      },
      orderBy: {
        schedule: {
          date: 'desc',
        },
      },
      take: 10,
    });

    return {
      memberId: member.id,
      memberName: member.fullName,
      upcoming: upcomingAssignments.map((a) => ({
        id: a.id,
        role: a.role,
        status: a.status,
        checkedIn: a.checkedIn,
        checkedInAt: a.checkedInAt,
        schedule: {
          id: a.schedule.id,
          title: a.schedule.title,
          description: a.schedule.description,
          date: a.schedule.date,
          event: a.schedule.event,
        },
      })),
      past: pastAssignments.map((a) => ({
        id: a.id,
        role: a.role,
        status: a.status,
        checkedIn: a.checkedIn,
        checkedInAt: a.checkedInAt,
        schedule: {
          id: a.schedule.id,
          title: a.schedule.title,
          date: a.schedule.date,
          event: a.schedule.event,
        },
      })),
    };
  }

  /**
   * Confirma participação em uma escala
   */
  async confirmAssignment(assignmentId: string, userId: string) {
    // Verificar se o assignment pertence ao usuário
    const member = await this.prisma.member.findFirst({
      where: { userId },
    });

    if (!member) {
      throw new NotFoundException('Usuário não possui cadastro de membro');
    }

    const assignment = await this.prisma.scheduleAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException('Escala não encontrada');
    }

    if (assignment.memberId !== member.id) {
      throw new BadRequestException('Você não tem permissão para confirmar esta escala');
    }

    return this.prisma.scheduleAssignment.update({
      where: { id: assignmentId },
      data: {
        status: 'CONFIRMED',
      },
      include: {
        schedule: {
          select: {
            id: true,
            title: true,
            date: true,
          },
        },
      },
    });
  }

  /**
   * Recusa participação em uma escala
   */
  async declineAssignment(assignmentId: string, userId: string) {
    // Verificar se o assignment pertence ao usuário
    const member = await this.prisma.member.findFirst({
      where: { userId },
    });

    if (!member) {
      throw new NotFoundException('Usuário não possui cadastro de membro');
    }

    const assignment = await this.prisma.scheduleAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException('Escala não encontrada');
    }

    if (assignment.memberId !== member.id) {
      throw new BadRequestException('Você não tem permissão para recusar esta escala');
    }

    return this.prisma.scheduleAssignment.update({
      where: { id: assignmentId },
      data: {
        status: 'DECLINED',
      },
      include: {
        schedule: {
          select: {
            id: true,
            title: true,
            date: true,
          },
        },
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

