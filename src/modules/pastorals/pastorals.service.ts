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
import { UserRole, NotificationType } from '@prisma/client';
import { HierarchyService, CurrentUser } from '../../common/hierarchy.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PastoralsService {
  constructor(
    private prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async getScopedPastoralIds(currentUser?: CurrentUser): Promise<string[]> {
    if (!currentUser?.id) {
      return [];
    }

    if (currentUser.pastoralIds?.length) {
      return currentUser.pastoralIds;
    }

    return this.hierarchyService.getUserPastoralIds(currentUser.id, true);
  }

  async ensurePastoralAccess(communityPastoralId: string, currentUser?: CurrentUser) {
    if (!currentUser) {
      return;
    }

    if (currentUser.role === UserRole.SYSTEM_ADMIN) {
      return;
    }

    const pastoral = await this.prisma.communityPastoral.findUnique({
      where: { id: communityPastoralId },
      include: {
        community: {
          include: {
            parish: true,
          },
        },
      },
    });

    if (!pastoral || pastoral.deletedAt) {
      throw new NotFoundException('Pastoral comunitaria nao encontrada');
    }

    if (currentUser.role === UserRole.DIOCESAN_ADMIN) {
      if (pastoral.community.parish.dioceseId !== currentUser.dioceseId) {
        throw new ForbiddenException('Voce nao tem permissao para acessar esta pastoral');
      }
      return;
    }

    if (currentUser.role === UserRole.PARISH_ADMIN) {
      if (pastoral.community.parishId !== currentUser.parishId) {
        throw new ForbiddenException('Voce nao tem permissao para acessar esta pastoral');
      }
      return;
    }

    if (currentUser.role === UserRole.COMMUNITY_COORDINATOR) {
      if (pastoral.communityId !== currentUser.communityId) {
        throw new ForbiddenException('Voce nao tem permissao para acessar esta pastoral');
      }
      return;
    }

    if (currentUser.role === UserRole.PASTORAL_COORDINATOR) {
      const scopedPastoralIds = await this.getScopedPastoralIds(currentUser);
      if (!scopedPastoralIds.includes(communityPastoralId)) {
        throw new ForbiddenException('Voce nao tem permissao para acessar outra pastoral');
      }
      return;
    }

    throw new ForbiddenException('Voce nao tem permissao para acessar esta pastoral');
  }

  private async ensureGroupAccess(groupId: string, currentUser?: CurrentUser) {
    const group = await this.prisma.pastoralGroup.findUnique({
      where: { id: groupId },
      select: {
        communityPastoralId: true,
      },
    });

    if (!group) {
      throw new NotFoundException('Grupo pastoral nao encontrado');
    }

    await this.ensurePastoralAccess(group.communityPastoralId, currentUser);
    return group.communityPastoralId;
  }

  private async ensurePastoralMemberAccess(id: string, currentUser?: CurrentUser) {
    const pastoralMember = await this.prisma.pastoralMember.findUnique({
      where: { id },
      select: {
        communityPastoralId: true,
        pastoralGroupId: true,
      },
    });

    if (!pastoralMember) {
      throw new NotFoundException('Vinculo nao encontrado');
    }

    if (pastoralMember.communityPastoralId) {
      await this.ensurePastoralAccess(pastoralMember.communityPastoralId, currentUser);
      return;
    }

    if (pastoralMember.pastoralGroupId) {
      await this.ensureGroupAccess(pastoralMember.pastoralGroupId, currentUser);
    }
  }

  // ============================================
  // GLOBAL PASTORALS (SYSTEM_ADMIN only)
  // ============================================

  async createGlobalPastoral(dto: CreateGlobalPastoralDto, userRole: UserRole) {
    // Apenas SYSTEM_ADMIN pode criar pastorais globais
    if (userRole !== UserRole.SYSTEM_ADMIN) {
      throw new ForbiddenException('Apenas SYSTEM_ADMIN pode criar pastorais globais');
    }

    // Verificar se jÃ¡ existe pastoral com esse nome
    const existing = await this.prisma.globalPastoral.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new BadRequestException('JÃ¡ existe uma pastoral com esse nome');
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
      throw new NotFoundException('Pastoral global nÃ£o encontrada');
    }

    return pastoral;
  }

  async updateGlobalPastoral(id: string, dto: UpdateGlobalPastoralDto, userRole: UserRole) {
    if (userRole !== UserRole.SYSTEM_ADMIN) {
      throw new ForbiddenException('Apenas SYSTEM_ADMIN pode editar pastorais globais');
    }

    await this.findOneGlobalPastoral(id);

    // Se estÃ¡ alterando o nome, verificar duplicaÃ§Ã£o
    if (dto.name) {
      const existing = await this.prisma.globalPastoral.findFirst({
        where: {
          name: dto.name,
          id: { not: id },
        },
      });

      if (existing) {
        throw new BadRequestException('JÃ¡ existe uma pastoral com esse nome');
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
    // Verificar se o usuÃ¡rio tem permissÃ£o na comunidade
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { community: true },
    });

    if (!user) {
      throw new NotFoundException('UsuÃ¡rio nÃ£o encontrado');
    }

    // Validar hierarquia de permissÃµes
    const allowedRoles: UserRole[] = [
      UserRole.SYSTEM_ADMIN,
      UserRole.DIOCESAN_ADMIN,
      UserRole.PARISH_ADMIN,
      UserRole.COMMUNITY_COORDINATOR,
    ];
    const canCreate = allowedRoles.includes(user.role);

    if (!canCreate) {
      throw new ForbiddenException('VocÃª nÃ£o tem permissÃ£o para criar pastorais');
    }

    // Verificar se a comunidade existe
    const community = await this.prisma.community.findUnique({
      where: { id: dto.communityId },
    });

    if (!community) {
      throw new NotFoundException('Comunidade nÃ£o encontrada');
    }

    // Verificar se a pastoral global existe
    const globalPastoral = await this.prisma.globalPastoral.findUnique({
      where: { id: dto.globalPastoralId },
    });

    if (!globalPastoral) {
      throw new NotFoundException('Pastoral global nÃ£o encontrada');
    }

    // Verificar se jÃ¡ existe essa pastoral na comunidade
    const existing = await this.prisma.communityPastoral.findFirst({
      where: {
        globalPastoralId: dto.globalPastoralId,
        communityId: dto.communityId,
      },
    });

    if (existing) {
      throw new BadRequestException('Esta pastoral jÃ¡ existe nesta comunidade');
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

  /** Pastorais em que o usuário é coordenador ATUAL (vínculos self-service). */
  async findCoordinatedByMe(userId: string) {
    const links = await this.prisma.pastoralCoordinator.findMany({
      where: {
        isCurrent: true,
        member: { userId, deletedAt: null },
        communityPastoral: { deletedAt: null },
      },
      select: {
        communityPastoral: {
          select: {
            id: true,
            communityId: true,
            community: { select: { id: true, name: true } },
            globalPastoral: { select: { id: true, name: true } },
          },
        },
      },
    });
    // Coordenações duplicadas (histórico) não repetem a pastoral
    const unique = new Map(links.map((link) => [link.communityPastoral.id, link.communityPastoral]));
    return [...unique.values()];
  }

  async findAllCommunityPastorals(
    communityId?: string,
    currentUser?: CurrentUser,
    parishId?: string,
  ) {
    // Aplicar filtros de hierarquia
    const where: any = {};

    // parishId amplia para a paróquia inteira (agenda fixa multi-comunidade)
    if (parishId) {
      where.community = { parishId };
    } else if (communityId) {
      where.communityId = communityId;
    }
    
    // Aplicar filtro de hierarquia baseado no role do usuário.
    // SEGURANÇA: o parishId do query string NUNCA amplia o escopo — papéis
    // restritos só enxergam a própria paróquia/comunidade; sem escopo definido,
    // a resposta é vazia (a rota inclui dados pessoais dos membros).
    if (currentUser) {
      switch (currentUser.role) {
        case UserRole.SYSTEM_ADMIN:
          // Sem filtro adicional
          break;
        case UserRole.DIOCESAN_ADMIN:
          if (!currentUser.dioceseId) return [];
          where.community = {
            ...(parishId ? { parishId } : {}),
            parish: { dioceseId: currentUser.dioceseId },
          };
          break;
        case UserRole.PARISH_ADMIN:
          if (!currentUser.parishId) return [];
          // Parâmetro de outra paróquia não vale: escopo é a própria
          where.community = { parishId: currentUser.parishId };
          break;
        case UserRole.COMMUNITY_COORDINATOR:
        case UserRole.VOLUNTEER:
        case UserRole.FAITHFUL:
        case UserRole.PASTORAL_COORDINATOR: {
          // Multi-comunidade: a comunidade SOLICITADA vale quando o membro tem
          // vínculo ATIVO com ela (app com "comunidade em foco" secundária)
          if (communityId && communityId !== currentUser.communityId) {
            const requesterMember = await this.prisma.member.findFirst({
              where: { userId: currentUser.id, deletedAt: null },
              select: { id: true },
            });
            const activeLink = requesterMember
              ? await this.prisma.memberCommunity.findFirst({
                  where: { memberId: requesterMember.id, communityId, isActive: true },
                  select: { id: true },
                })
              : null;
            if (activeLink) {
              delete where.community;
              where.communityId = communityId;
              break;
            }
          }
          // parishId só vale quando é a PRÓPRIA paróquia (resolvida pelo token
          // ou pela comunidade do usuário — agenda fixa multi-comunidade)
          let ownParishId = currentUser.parishId ?? null;
          if (!ownParishId && currentUser.communityId) {
            const ownCommunity = await this.prisma.community.findUnique({
              where: { id: currentUser.communityId },
              select: { parishId: true },
            });
            ownParishId = ownCommunity?.parishId ?? null;
          }
          if (parishId && ownParishId && ownParishId === parishId) {
            delete where.communityId;
            where.community = { parishId };
          } else if (currentUser.communityId) {
            delete where.community;
            where.communityId = currentUser.communityId;
          } else {
            return [];
          }
          break;
        }
        default:
          return [];
      }
    }
    
    where.deletedAt = null;

    return this.prisma.communityPastoral.findMany({
      where,
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
          where: { member: { deletedAt: null } },
          include: {
            member: true,
          },
        },
        subGroups: {
          where: { deletedAt: null },
        },
        // Pedidos "quero participar" aguardando decisão — alerta nos cards
        _count: {
          select: {
            joinRequests: { where: { status: 'PENDING', member: { deletedAt: null } } },
          },
        },
      },
      orderBy: {
        globalPastoral: {
          name: 'asc',
        },
      },
    });
  }

  async findOneCommunityPastoral(id: string, currentUser?: CurrentUser) {
    await this.ensurePastoralAccess(id, currentUser);

    const pastoral = await this.prisma.communityPastoral.findFirst({
      where: { id, deletedAt: null },
      include: {
        globalPastoral: true,
        community: true,
        members: {
          where: { member: { deletedAt: null } },
          include: {
            member: true,
          },
        },
        subGroups: {
          where: { deletedAt: null },
          include: {
            members: {
              where: { member: { deletedAt: null } },
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
      throw new NotFoundException('Pastoral comunitÃ¡ria nÃ£o encontrada');
    }

    return pastoral;
  }

  async findAvailableMembersForCommunityPastoral(
    communityPastoralId: string,
    currentUser?: CurrentUser,
  ) {
    await this.ensurePastoralAccess(communityPastoralId, currentUser);

    const pastoral = await this.prisma.communityPastoral.findUnique({
      where: { id: communityPastoralId },
      select: {
        id: true,
        communityId: true,
      },
    });

    if (!pastoral) {
      throw new NotFoundException('Pastoral comunitaria nao encontrada');
    }

    return this.prisma.member.findMany({
      where: {
        communityId: pastoral.communityId,
        status: 'ACTIVE',
        deletedAt: null,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
      },
      orderBy: {
        fullName: 'asc',
      },
    });
  }

  async updateCommunityPastoral(id: string, dto: UpdateCommunityPastoralDto, userId: string) {
    const pastoral = await this.findOneCommunityPastoral(id);

    // Verificar permissÃµes
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('UsuÃ¡rio nÃ£o encontrado');
    }

    const allowedRoles: UserRole[] = [
      UserRole.SYSTEM_ADMIN,
      UserRole.DIOCESAN_ADMIN,
      UserRole.PARISH_ADMIN,
      UserRole.COMMUNITY_COORDINATOR,
    ];
    const canUpdate = allowedRoles.includes(user.role);

    if (!canUpdate) {
      throw new ForbiddenException('VocÃª nÃ£o tem permissÃ£o para editar pastorais');
    }

    return this.prisma.communityPastoral.update({
      where: { id },
      data: {
        ...dto,
        // null limpa a data; undefined mantém o valor atual
        foundedAt: dto.foundedAt ? new Date(dto.foundedAt) : dto.foundedAt === null ? null : undefined,
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
      throw new NotFoundException('UsuÃ¡rio nÃ£o encontrado');
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

    // Soft delete: preserva membros, histórico de coordenação e vínculos com eventos
    return this.prisma.communityPastoral.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ============================================
  // PASTORAL GROUPS (Sub-grupos)
  // ============================================

  async createPastoralGroup(dto: CreatePastoralGroupDto, currentUser?: CurrentUser) {
    await this.ensurePastoralAccess(dto.communityPastoralId, currentUser);

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

  async findAllPastoralGroups(communityPastoralId?: string, currentUser?: CurrentUser) {
    if (communityPastoralId) {
      await this.ensurePastoralAccess(communityPastoralId, currentUser);
    }

    return this.prisma.pastoralGroup.findMany({
      where: {
        deletedAt: null,
        ...(communityPastoralId ? { communityPastoralId } : {}),
      },
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

  async findOnePastoralGroup(id: string, currentUser?: CurrentUser) {
    await this.ensureGroupAccess(id, currentUser);

    const group = await this.prisma.pastoralGroup.findFirst({
      where: { id, deletedAt: null },
      include: {
        communityPastoral: {
          include: {
            globalPastoral: true,
          },
        },
        members: {
          where: { member: { deletedAt: null } },
          include: {
            member: true,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Grupo pastoral nao encontrado');
    }

    return group;
  }

  async updatePastoralGroup(id: string, dto: UpdatePastoralGroupDto, currentUser?: CurrentUser) {
    await this.findOnePastoralGroup(id, currentUser);

    return this.prisma.pastoralGroup.update({
      where: { id },
      data: dto,
    });
  }

  async removePastoralGroup(id: string, currentUser?: CurrentUser) {
    await this.findOnePastoralGroup(id, currentUser);

    // Soft delete: preserva vínculos e histórico dos membros do grupo
    return this.prisma.pastoralGroup.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ============================================
  // PASTORAL MEMBERS
  // ============================================

  /**
   * 'COORDINATOR' e o valor canonico verificado pelo controle de acesso
   * (hierarchy.service). As telas enviam 'Coordenador' (pt-BR) — normalizamos aqui.
   */
  private isCoordinatorRole(role?: string | null): boolean {
    return role === 'COORDINATOR' || role === 'Coordenador';
  }

  private normalizeMemberRole(role?: string | null): string | null | undefined {
    return this.isCoordinatorRole(role) ? 'COORDINATOR' : role;
  }

  /**
   * Torna o membro coordenador oficial da pastoral: encerra a coordenacao vigente,
   * registra o historico (PastoralCoordinator) e promove o usuario vinculado a
   * PASTORAL_COORDINATOR quando ele tem papel inferior (FAITHFUL/VOLUNTEER).
   * Mesmo efeito do fluxo de cadastro de usuarios (syncPastoralCoordinatorLinks).
   */
  private async promoteMemberToCoordinator(memberId: string, communityPastoralId: string) {
    const now = new Date();

    await this.prisma.pastoralCoordinator.updateMany({
      where: {
        communityPastoralId,
        isCurrent: true,
        memberId: { not: memberId },
      },
      data: { isCurrent: false, endDate: now },
    });

    const existingCurrent = await this.prisma.pastoralCoordinator.findFirst({
      where: { communityPastoralId, memberId, isCurrent: true },
    });

    if (!existingCurrent) {
      await this.prisma.pastoralCoordinator.create({
        data: { communityPastoralId, memberId, startDate: now, isCurrent: true },
      });
    }

    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: { userId: true },
    });

    if (member?.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: member.userId },
        select: { role: true },
      });

      if (user && (user.role === UserRole.FAITHFUL || user.role === UserRole.VOLUNTEER)) {
        await this.prisma.user.update({
          where: { id: member.userId },
          data: { role: UserRole.PASTORAL_COORDINATOR },
        });
      }
    }
  }

  /**
   * Encerra a coordenacao do membro nesta pastoral e, se ele nao coordena mais
   * nenhuma outra, rebaixa o usuario PASTORAL_COORDINATOR para VOLUNTEER.
   */
  private async demoteMemberFromCoordinator(memberId: string, communityPastoralId: string) {
    await this.prisma.pastoralCoordinator.updateMany({
      where: { communityPastoralId, memberId, isCurrent: true },
      data: { isCurrent: false, endDate: new Date() },
    });

    const remainingCoordinations = await this.prisma.pastoralCoordinator.count({
      where: { memberId, isCurrent: true },
    });

    if (remainingCoordinations > 0) {
      return;
    }

    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: { userId: true },
    });

    if (member?.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: member.userId },
        select: { role: true },
      });

      if (user?.role === UserRole.PASTORAL_COORDINATOR) {
        await this.prisma.user.update({
          where: { id: member.userId },
          data: { role: UserRole.VOLUNTEER },
        });
      }
    }
  }

  async addMemberToPastoral(dto: CreatePastoralMemberDto, currentUser?: CurrentUser) {
    let targetCommunityPastoralId = dto.communityPastoralId;

    if (dto.communityPastoralId) {
      await this.ensurePastoralAccess(dto.communityPastoralId, currentUser);
    }

    if (dto.pastoralGroupId) {
      targetCommunityPastoralId = await this.ensureGroupAccess(dto.pastoralGroupId, currentUser);
    }

    const member = await this.prisma.member.findUnique({
      where: { id: dto.memberId },
      select: {
        id: true,
        communityId: true,
        status: true,
      },
    });

    if (!member) {
      throw new NotFoundException('Membro nao encontrado');
    }

    if (member.status !== 'ACTIVE') {
      throw new BadRequestException('Somente membros ativos podem ser adicionados');
    }

    if (targetCommunityPastoralId) {
      const communityPastoral = await this.prisma.communityPastoral.findUnique({
        where: { id: targetCommunityPastoralId },
        select: {
          communityId: true,
        },
      });

      if (!communityPastoral) {
        throw new NotFoundException('Pastoral comunitaria nao encontrada');
      }

      if (communityPastoral.communityId !== member.communityId) {
        // Multi-comunidade: vínculo secundário ATIVO também habilita a pastoral
        const activeLink = await this.prisma.memberCommunity.findFirst({
          where: {
            memberId: dto.memberId,
            communityId: communityPastoral.communityId,
            isActive: true,
          },
          select: { id: true },
        });
        if (!activeLink) {
          throw new BadRequestException(
            'Somente membros da comunidade (ou com vínculo ativo nela) podem ser adicionados a esta pastoral',
          );
        }
      }
    }

    const existing = await this.prisma.pastoralMember.findFirst({
      where: {
        memberId: dto.memberId,
        communityPastoralId: dto.communityPastoralId,
        pastoralGroupId: dto.pastoralGroupId,
      },
    });

    if (existing) {
      throw new BadRequestException('Membro ja esta vinculado a esta pastoral ou grupo');
    }

    const normalizedRole = this.normalizeMemberRole(dto.role);

    const pastoralMember = await this.prisma.pastoralMember.create({
      data: {
        ...dto,
        role: normalizedRole,
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
    });

    if (normalizedRole === 'COORDINATOR' && dto.communityPastoralId) {
      await this.promoteMemberToCoordinator(dto.memberId, dto.communityPastoralId);
    }

    return pastoralMember;
  }

  async findPastoralMembers(
    communityPastoralId?: string,
    pastoralGroupId?: string,
    currentUser?: CurrentUser,
  ) {
    if (communityPastoralId) {
      await this.ensurePastoralAccess(communityPastoralId, currentUser);
    }

    if (pastoralGroupId) {
      await this.ensureGroupAccess(pastoralGroupId, currentUser);
    }

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

  async updateMember(id: string, dto: UpdatePastoralMemberDto, currentUser?: CurrentUser) {
    await this.ensurePastoralMemberAccess(id, currentUser);

    const existing = await this.prisma.pastoralMember.findUnique({
      where: { id },
      select: { memberId: true, communityPastoralId: true, role: true, isActive: true },
    });

    if (!existing) {
      throw new NotFoundException('Vinculo de membro nao encontrado');
    }

    const normalizedRole = dto.role !== undefined ? this.normalizeMemberRole(dto.role) : undefined;

    const updated = await this.prisma.pastoralMember.update({
      where: { id },
      data: {
        ...dto,
        ...(normalizedRole !== undefined ? { role: normalizedRole } : {}),
      },
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

    if (existing.communityPastoralId) {
      const wasCoordinator = this.isCoordinatorRole(existing.role) && existing.isActive;
      const isNowCoordinator = this.isCoordinatorRole(updated.role) && updated.isActive;

      if (isNowCoordinator) {
        // Idempotente — também regulariza vínculos legados gravados como 'Coordenador'
        await this.promoteMemberToCoordinator(existing.memberId, existing.communityPastoralId);
      } else if (wasCoordinator) {
        await this.demoteMemberFromCoordinator(existing.memberId, existing.communityPastoralId);
      }
    }

    return updated;
  }

  async removeMemberFromPastoral(id: string, currentUser?: CurrentUser) {
    await this.ensurePastoralMemberAccess(id, currentUser);

    const existing = await this.prisma.pastoralMember.findUnique({
      where: { id },
      select: { memberId: true, communityPastoralId: true, role: true },
    });

    const removed = await this.prisma.pastoralMember.delete({
      where: { id },
    });

    if (existing?.communityPastoralId && this.isCoordinatorRole(existing.role)) {
      await this.demoteMemberFromCoordinator(existing.memberId, existing.communityPastoralId);
    }

    return removed;
  }

  /**
   * Avisa todos os membros ativos de uma pastoral comunitaria com uma mensagem livre
   * do coordenador (ex: "reuniao extra quinta-feira"). Diferente do aviso de escala:
   * alcanca todo o time da pastoral, nao apenas quem esta escalado numa data especifica.
   */
  async notifyMembers(communityPastoralId: string, message: string, currentUser?: CurrentUser) {
    await this.ensurePastoralAccess(communityPastoralId, currentUser);

    const pastoral = await this.prisma.communityPastoral.findUnique({
      where: { id: communityPastoralId },
      select: { id: true, globalPastoral: { select: { name: true } } },
    });

    if (!pastoral) {
      throw new NotFoundException('Pastoral comunitaria nao encontrada');
    }

    const pastoralMembers = await this.prisma.pastoralMember.findMany({
      where: { communityPastoralId, isActive: true },
      select: { member: { select: { userId: true } } },
    });

    const userIds = [
      ...new Set(
        pastoralMembers.map((pastoralMember) => pastoralMember.member.userId).filter((id): id is string => !!id),
      ),
    ];

    if (userIds.length === 0) {
      return { notified: 0 };
    }

    await this.notificationsService.notifyUsers(
      userIds,
      NotificationType.TEAM_BROADCAST,
      `Aviso: ${pastoral.globalPastoral.name}`,
      message,
      { communityPastoralId },
    );

    return { notified: userIds.length };
  }

  // ============================================
  // MEETINGS & ACTIVITIES (DEPRECATED)
  // ============================================
  /*
   * MÃ‰TODOS DEPRECADOS - ReuniÃµes e Atividades foram unificadas em Event
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
      throw new NotFoundException('ReuniÃ£o nÃ£o encontrada');
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
    // Verificar se reuniÃ£o existe
    await this.findOneMeeting(dto.meetingId);

    // Verificar se membro existe
    const member = await this.prisma.member.findUnique({
      where: { id: dto.memberId },
    });

    if (!member) {
      throw new NotFoundException('Membro nÃ£o encontrado');
    }

    // Criar ou atualizar registro de presenÃ§a
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
      throw new NotFoundException('Atividade nÃ£o encontrada');
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

