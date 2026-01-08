import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateGlobalPastoralDto } from './dto/create-global-pastoral.dto';
import { UpdateGlobalPastoralDto } from './dto/update-global-pastoral.dto';
import { CreateCommunityPastoralDto } from './dto/create-community-pastoral.dto';
import { UpdateCommunityPastoralDto } from './dto/update-community-pastoral.dto';
import { CreatePastoralGroupDto } from './dto/create-pastoral-group.dto';
import { UpdatePastoralGroupDto } from './dto/update-pastoral-group.dto';
import { CreatePastoralMemberDto } from './dto/create-pastoral-member.dto';
import { UpdatePastoralMemberDto } from './dto/update-pastoral-member.dto';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UserRole } from '@prisma/client';
import { HierarchyService, CurrentUser } from '../../common/hierarchy.service';

@Injectable()
export class PastoralsService {
  constructor(
    private prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  // ============================================
  // GLOBAL PASTORALS (SYSTEM_ADMIN only)
  // ============================================

  async createGlobalPastoral(dto: CreateGlobalPastoralDto, userRole: UserRole) {
    // Apenas SYSTEM_ADMIN pode criar pastorais globais
    if (userRole !== UserRole.SYSTEM_ADMIN) {
      throw new ForbiddenException('Apenas SYSTEM_ADMIN pode criar pastorais globais');
    }

    // Verificar se já existe pastoral com esse nome
    const existing = await this.prisma.globalPastoral.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new BadRequestException('Já existe uma pastoral com esse nome');
    }

    return this.prisma.globalPastoral.create({
      data: dto,
    });
  }

  async findAllGlobalPastorals() {
    return this.prisma.globalPastoral.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOneGlobalPastoral(id: string) {
    const pastoral = await this.prisma.globalPastoral.findUnique({
      where: { id },
      include: {
        communityPastorals: {
          include: {
            community: true,
          },
        },
      },
    });

    if (!pastoral) {
      throw new NotFoundException('Pastoral global não encontrada');
    }

    return pastoral;
  }

  async updateGlobalPastoral(id: string, dto: UpdateGlobalPastoralDto, userRole: UserRole) {
    if (userRole !== UserRole.SYSTEM_ADMIN) {
      throw new ForbiddenException('Apenas SYSTEM_ADMIN pode editar pastorais globais');
    }

    await this.findOneGlobalPastoral(id);

    // Se está alterando o nome, verificar duplicação
    if (dto.name) {
      const existing = await this.prisma.globalPastoral.findFirst({
        where: {
          name: dto.name,
          id: { not: id },
        },
      });

      if (existing) {
        throw new BadRequestException('Já existe uma pastoral com esse nome');
      }
    }

    return this.prisma.globalPastoral.update({
      where: { id },
      data: dto,
    });
  }

  async removeGlobalPastoral(id: string, userRole: UserRole) {
    if (userRole !== UserRole.SYSTEM_ADMIN) {
      throw new ForbiddenException('Apenas SYSTEM_ADMIN pode excluir pastorais globais');
    }

    await this.findOneGlobalPastoral(id);

    return this.prisma.globalPastoral.delete({
      where: { id },
    });
  }

  // ============================================
  // COMMUNITY PASTORALS
  // ============================================

  async createCommunityPastoral(dto: CreateCommunityPastoralDto, userId: string) {
    // Verificar se o usuário tem permissão na comunidade
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { community: true },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Validar hierarquia de permissões
    const allowedRoles: UserRole[] = [
      UserRole.SYSTEM_ADMIN,
      UserRole.DIOCESAN_ADMIN,
      UserRole.PARISH_ADMIN,
      UserRole.COMMUNITY_COORDINATOR,
    ];
    const canCreate = allowedRoles.includes(user.role);

    if (!canCreate) {
      throw new ForbiddenException('Você não tem permissão para criar pastorais');
    }

    // Verificar se a comunidade existe
    const community = await this.prisma.community.findUnique({
      where: { id: dto.communityId },
    });

    if (!community) {
      throw new NotFoundException('Comunidade não encontrada');
    }

    // Verificar se a pastoral global existe
    const globalPastoral = await this.prisma.globalPastoral.findUnique({
      where: { id: dto.globalPastoralId },
    });

    if (!globalPastoral) {
      throw new NotFoundException('Pastoral global não encontrada');
    }

    // Verificar se já existe essa pastoral na comunidade
    const existing = await this.prisma.communityPastoral.findFirst({
      where: {
        globalPastoralId: dto.globalPastoralId,
        communityId: dto.communityId,
      },
    });

    if (existing) {
      throw new BadRequestException('Esta pastoral já existe nesta comunidade');
    }

    return this.prisma.communityPastoral.create({
      data: {
        ...dto,
        foundedAt: dto.foundedAt ? new Date(dto.foundedAt) : undefined,
      },
      include: {
        globalPastoral: true,
        community: true,
      },
    });
  }

  async findAllCommunityPastorals(communityId?: string, currentUser?: CurrentUser) {
    // Aplicar filtros de hierarquia
    const where: any = {};
    
    if (communityId) {
      where.communityId = communityId;
    }
    
    // Aplicar filtro de hierarquia baseado no role do usuário
    if (currentUser) {
      switch (currentUser.role) {
        case UserRole.SYSTEM_ADMIN:
          // Sem filtro adicional
          break;
        case UserRole.DIOCESAN_ADMIN:
          // Filtrar por diocese
          if (currentUser.dioceseId) {
            where.community = { parish: { dioceseId: currentUser.dioceseId } };
          }
          break;
        case UserRole.PARISH_ADMIN:
          // Filtrar por paróquia
          if (currentUser.parishId) {
            where.community = { parishId: currentUser.parishId };
          }
          break;
        case UserRole.COMMUNITY_COORDINATOR:
        case UserRole.PASTORAL_COORDINATOR:
        case UserRole.VOLUNTEER:
        case UserRole.FAITHFUL:
          // Filtrar por comunidade
          if (currentUser.communityId) {
            where.communityId = currentUser.communityId;
          }
          break;
      }
    }
    
    return this.prisma.communityPastoral.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        globalPastoral: true,
        community: {
          include: {
            parish: {
              include: {
                diocese: true,
              },
            },
          },
        },
        members: {
          include: {
            member: true,
          },
        },
        subGroups: true,
      },
      orderBy: {
        globalPastoral: {
          name: 'asc',
        },
      },
    });
  }

  async findOneCommunityPastoral(id: string) {
    const pastoral = await this.prisma.communityPastoral.findUnique({
      where: { id },
      include: {
        globalPastoral: true,
        community: true,
        members: {
          include: {
            member: true,
          },
        },
        subGroups: {
          include: {
            members: {
              include: {
                member: true,
              },
            },
          },
        },
        // meetings e activities foram unificados em Event
        // Use eventPastorals para acessar eventos da pastoral
      },
    });

    if (!pastoral) {
      throw new NotFoundException('Pastoral comunitária não encontrada');
    }

    return pastoral;
  }

  async updateCommunityPastoral(id: string, dto: UpdateCommunityPastoralDto, userId: string) {
    const pastoral = await this.findOneCommunityPastoral(id);

    // Verificar permissões
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const allowedRoles: UserRole[] = [
      UserRole.SYSTEM_ADMIN,
      UserRole.DIOCESAN_ADMIN,
      UserRole.PARISH_ADMIN,
      UserRole.COMMUNITY_COORDINATOR,
    ];
    const canUpdate = allowedRoles.includes(user.role);

    if (!canUpdate) {
      throw new ForbiddenException('Você não tem permissão para editar pastorais');
    }

    return this.prisma.communityPastoral.update({
      where: { id },
      data: {
        ...dto,
        foundedAt: dto.foundedAt ? new Date(dto.foundedAt) : undefined,
      },
      include: {
        globalPastoral: true,
        community: true,
      },
    });
  }

  async removeCommunityPastoral(id: string, userId: string) {
    await this.findOneCommunityPastoral(id);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const allowedRoles: UserRole[] = [
      UserRole.SYSTEM_ADMIN,
      UserRole.DIOCESAN_ADMIN,
      UserRole.PARISH_ADMIN,
      UserRole.COMMUNITY_COORDINATOR,
    ];
    const canDelete = allowedRoles.includes(user.role);

    if (!canDelete) {
      throw new ForbiddenException('Você não tem permissão para excluir pastorais');
    }

    return this.prisma.communityPastoral.delete({
      where: { id },
    });
  }

  // ============================================
  // PASTORAL GROUPS (Sub-grupos)
  // ============================================

  async createPastoralGroup(dto: CreatePastoralGroupDto) {
    // Verificar se a pastoral comunitária existe
    const communityPastoral = await this.prisma.communityPastoral.findUnique({
      where: { id: dto.communityPastoralId },
    });

    if (!communityPastoral) {
      throw new NotFoundException('Pastoral comunitária não encontrada');
    }

    return this.prisma.pastoralGroup.create({
      data: dto,
      include: {
        communityPastoral: {
          include: {
            globalPastoral: true,
          },
        },
      },
    });
  }

  async findAllPastoralGroups(communityPastoralId?: string) {
    return this.prisma.pastoralGroup.findMany({
      where: communityPastoralId ? { communityPastoralId } : undefined,
      include: {
        communityPastoral: {
          include: {
            globalPastoral: true,
          },
        },
        members: {
          include: {
            member: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOnePastoralGroup(id: string) {
    const group = await this.prisma.pastoralGroup.findUnique({
      where: { id },
      include: {
        communityPastoral: {
          include: {
            globalPastoral: true,
          },
        },
        members: {
          include: {
            member: true,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Grupo pastoral não encontrado');
    }

    return group;
  }

  async updatePastoralGroup(id: string, dto: UpdatePastoralGroupDto) {
    await this.findOnePastoralGroup(id);

    return this.prisma.pastoralGroup.update({
      where: { id },
      data: dto,
    });
  }

  async removePastoralGroup(id: string) {
    await this.findOnePastoralGroup(id);

    return this.prisma.pastoralGroup.delete({
      where: { id },
    });
  }

  // ============================================
  // PASTORAL MEMBERS
  // ============================================

  async addMemberToPastoral(dto: CreatePastoralMemberDto) {
    // Verificar se o membro existe
    const member = await this.prisma.member.findUnique({
      where: { id: dto.memberId },
    });

    if (!member) {
      throw new NotFoundException('Membro não encontrado');
    }

    // Verificar se já está vinculado
    const existing = await this.prisma.pastoralMember.findFirst({
      where: {
        memberId: dto.memberId,
        communityPastoralId: dto.communityPastoralId,
        pastoralGroupId: dto.pastoralGroupId,
      },
    });

    if (existing) {
      throw new BadRequestException('Membro já está vinculado a esta pastoral/grupo');
    }

    return this.prisma.pastoralMember.create({
      data: dto,
      include: {
        member: true,
        communityPastoral: {
          include: {
            globalPastoral: true,
          },
        },
        pastoralGroup: true,
      },
    });
  }

  async findPastoralMembers(communityPastoralId?: string, pastoralGroupId?: string) {
    return this.prisma.pastoralMember.findMany({
      where: {
        communityPastoralId,
        pastoralGroupId,
      },
      include: {
        member: true,
        communityPastoral: {
          include: {
            globalPastoral: true,
          },
        },
        pastoralGroup: true,
      },
      orderBy: {
        joinedAt: 'desc',
      },
    });
  }

  async updateMember(id: string, dto: UpdatePastoralMemberDto) {
    const pastoralMember = await this.prisma.pastoralMember.findUnique({
      where: { id },
    });

    if (!pastoralMember) {
      throw new NotFoundException('Vínculo não encontrado');
    }

    return this.prisma.pastoralMember.update({
      where: { id },
      data: dto,
      include: {
        member: true,
        communityPastoral: {
          include: {
            globalPastoral: true,
            community: true,
          },
        },
      },
    });
  }

  async removeMemberFromPastoral(id: string) {
    const pastoralMember = await this.prisma.pastoralMember.findUnique({
      where: { id },
    });

    if (!pastoralMember) {
      throw new NotFoundException('Vínculo não encontrado');
    }

    return this.prisma.pastoralMember.delete({
      where: { id },
    });
  }

  // ============================================
  // MEETINGS & ACTIVITIES (DEPRECATED)
  // ============================================
  /*
   * MÉTODOS DEPRECADOS - Reuniões e Atividades foram unificadas em Event
   * Use EventsService para criar eventos do tipo PASTORAL_MEETING ou PASTORAL_ACTIVITY
   *

  async createMeeting(dto: CreateMeetingDto) {
    return this.prisma.pastoralMeeting.create({
      data: {
        title: dto.title,
        description: dto.description,
        date: new Date(dto.date),
        location: dto.location,
        notes: dto.notes,
        communityPastoralId: dto.communityPastoralId,
      },
      include: {
        communityPastoral: {
          include: {
            globalPastoral: true,
          },
        },
      },
    });
  }

  async findAllMeetings(communityPastoralId?: string) {
    return this.prisma.pastoralMeeting.findMany({
      where: communityPastoralId ? { communityPastoralId } : {},
      include: {
        communityPastoral: {
          include: {
            globalPastoral: true,
          },
        },
        participants: {
          include: {
            member: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });
  }

  async findOneMeeting(id: string) {
    const meeting = await this.prisma.pastoralMeeting.findUnique({
      where: { id },
      include: {
        communityPastoral: {
          include: {
            globalPastoral: true,
          },
        },
        participants: {
          include: {
            member: true,
          },
        },
      },
    });

    if (!meeting) {
      throw new NotFoundException('Reunião não encontrada');
    }

    return meeting;
  }

  async updateMeeting(id: string, dto: UpdateMeetingDto) {
    await this.findOneMeeting(id);

    const updateData: any = { ...dto };
    if (dto.date) {
      updateData.date = new Date(dto.date);
    }

    return this.prisma.pastoralMeeting.update({
      where: { id },
      data: updateData,
      include: {
        communityPastoral: {
          include: {
            globalPastoral: true,
          },
        },
      },
    });
  }

  async removeMeeting(id: string) {
    await this.findOneMeeting(id);

    return this.prisma.pastoralMeeting.delete({
      where: { id },
    });
  }

  async markAttendance(dto: MarkAttendanceDto) {
    // Verificar se reunião existe
    await this.findOneMeeting(dto.meetingId);

    // Verificar se membro existe
    const member = await this.prisma.member.findUnique({
      where: { id: dto.memberId },
    });

    if (!member) {
      throw new NotFoundException('Membro não encontrado');
    }

    // Criar ou atualizar registro de presença
    return this.prisma.pastoralMeetingParticipant.upsert({
      where: {
        meetingId_memberId: {
          meetingId: dto.meetingId,
          memberId: dto.memberId,
        },
      },
      create: {
        meetingId: dto.meetingId,
        memberId: dto.memberId,
        attended: dto.attended,
        attendedAt: dto.attended ? new Date() : null,
      },
      update: {
        attended: dto.attended,
        attendedAt: dto.attended ? new Date() : null,
      },
      include: {
        member: true,
      },
    });
  }

  // ============================================
  // ACTIVITIES
  // ============================================

  async createActivity(dto: CreateActivityDto) {
    return this.prisma.pastoralActivity.create({
      data: {
        title: dto.title,
        description: dto.description,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        location: dto.location,
        communityPastoralId: dto.communityPastoralId,
      },
      include: {
        communityPastoral: {
          include: {
            globalPastoral: true,
          },
        },
      },
    });
  }

  async findAllActivities(communityPastoralId?: string) {
    return this.prisma.pastoralActivity.findMany({
      where: communityPastoralId ? { communityPastoralId } : {},
      include: {
        communityPastoral: {
          include: {
            globalPastoral: true,
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    });
  }

  async findOneActivity(id: string) {
    const activity = await this.prisma.pastoralActivity.findUnique({
      where: { id },
      include: {
        communityPastoral: {
          include: {
            globalPastoral: true,
          },
        },
      },
    });

    if (!activity) {
      throw new NotFoundException('Atividade não encontrada');
    }

    return activity;
  }

  async removeActivity(id: string) {
    await this.findOneActivity(id);

    return this.prisma.pastoralActivity.delete({
      where: { id },
     });
  }
  */
}
