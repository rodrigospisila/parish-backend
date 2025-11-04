import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateGlobalPastoralDto } from './dto/create-global-pastoral.dto';
import { UpdateGlobalPastoralDto } from './dto/update-global-pastoral.dto';
import { CreateCommunityPastoralDto } from './dto/create-community-pastoral.dto';
import { UpdateCommunityPastoralDto } from './dto/update-community-pastoral.dto';
import { CreatePastoralGroupDto } from './dto/create-pastoral-group.dto';
import { CreatePastoralMemberDto } from './dto/create-pastoral-member.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class PastoralsService {
  constructor(private prisma: PrismaService) {}

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
    const canCreate = [
      UserRole.SYSTEM_ADMIN,
      UserRole.DIOCESAN_ADMIN,
      UserRole.PARISH_ADMIN,
      UserRole.COMMUNITY_COORDINATOR,
    ].includes(user.role);

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

  async findAllCommunityPastorals(communityId?: string) {
    return this.prisma.communityPastoral.findMany({
      where: communityId ? { communityId } : undefined,
      include: {
        globalPastoral: true,
        community: true,
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
        coordinatorHistory: {
          include: {
            member: true,
          },
          orderBy: {
            startDate: 'desc',
          },
        },
        meetings: {
          orderBy: {
            date: 'desc',
          },
          take: 10,
        },
        activities: {
          orderBy: {
            startDate: 'desc',
          },
          take: 10,
        },
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

    const canUpdate = [
      UserRole.SYSTEM_ADMIN,
      UserRole.DIOCESAN_ADMIN,
      UserRole.PARISH_ADMIN,
      UserRole.COMMUNITY_COORDINATOR,
    ].includes(user.role);

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

    const canDelete = [
      UserRole.SYSTEM_ADMIN,
      UserRole.DIOCESAN_ADMIN,
      UserRole.PARISH_ADMIN,
      UserRole.COMMUNITY_COORDINATOR,
    ].includes(user.role);

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
}
