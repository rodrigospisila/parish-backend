import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UserRole } from '@prisma/client';

/**
 * Interface para o usuário atual com informações de hierarquia
 */
export interface CurrentUser {
  id: string;
  role: UserRole;
  email?: string;
  dioceseId?: string;
  parishId?: string;
  communityId?: string;
  pastoralIds?: string[];
  /** Vínculos N:N ATIVOS carregados pelo JwtStrategy (validateUser) */
  communities?: Array<{ communityId: string; isActive?: boolean }>;
}

/**
 * Interface para filtros de hierarquia
 */
export interface HierarchyFilter {
  dioceseId?: string;
  parishId?: string;
  communityId?: string;
  pastoralIds?: string[];
}

/**
 * Serviço utilitário para gerenciar filtros de hierarquia
 * Centraliza a lógica de filtragem de dados baseado no role do usuário
 */
@Injectable()
export class HierarchyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retorna os filtros de hierarquia baseado no role do usuário
   */
  getHierarchyFilter(user: CurrentUser): HierarchyFilter {
    const filter: HierarchyFilter = {};

    switch (user.role) {
      case UserRole.SYSTEM_ADMIN:
        // SYSTEM_ADMIN tem acesso a tudo, sem filtros
        break;

      case UserRole.DIOCESAN_ADMIN:
        // DIOCESAN_ADMIN só vê dados da sua diocese
        if (user.dioceseId) {
          filter.dioceseId = user.dioceseId;
        }
        break;

      case UserRole.PARISH_ADMIN:
        // PARISH_ADMIN só vê dados da sua paróquia
        if (user.parishId) {
          filter.parishId = user.parishId;
        }
        break;

      case UserRole.COMMUNITY_COORDINATOR:
        // COMMUNITY_COORDINATOR só vê dados da sua comunidade
        if (user.communityId) {
          filter.communityId = user.communityId;
        }
        break;

      case UserRole.PASTORAL_COORDINATOR:
      case UserRole.VOLUNTEER:
      case UserRole.FAITHFUL:
        // Esses roles têm acesso limitado à sua comunidade
        if (user.communityId) {
          filter.communityId = user.communityId;
        }
        break;
    }

    return filter;
  }

  /**
   * Busca as pastorais que o usuário coordena (para PASTORAL_COORDINATOR)
   */
  async getUserPastoralIds(userId: string, coordinatorOnly: boolean = true): Promise<string[]> {
    // Buscar o Member vinculado ao User
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        member: {
          include: {
            pastoralMemberships: {
              where: coordinatorOnly ? { role: 'COORDINATOR', isActive: true } : { isActive: true },
              select: { communityPastoralId: true },
            },
          },
        },
      },
    });

    if (!user?.member?.pastoralMemberships) {
      return [];
    }

    return user.member.pastoralMemberships
      .map((pm) => pm.communityPastoralId)
      .filter((id): id is string => id !== null);
  }

  /**
   * Verifica se o usuário tem acesso a uma pastoral específica
   */
  async hasAccessToPastoral(
    userId: string,
    pastoralId: string,
    requireCoordinator: boolean = false,
  ): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        member: {
          include: {
            pastoralMemberships: {
              where: { communityPastoralId: pastoralId, isActive: true },
            },
          },
        },
      },
    });

    if (!user?.member?.pastoralMemberships?.length) {
      return false;
    }

    if (requireCoordinator) {
      return user.member.pastoralMemberships.some((pm) => pm.role === 'COORDINATOR');
    }

    return true;
  }

  /**
   * Verifica se o usuário tem acesso a um evento específico
   * Baseado nas pastorais vinculadas ao evento
   */
  async hasAccessToEvent(userId: string, eventId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { member: true },
    });

    // SYSTEM_ADMIN tem acesso a tudo
    if (user?.role === UserRole.SYSTEM_ADMIN) {
      return true;
    }

    // Buscar o evento com suas pastorais
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        eventPastorals: true,
        community: {
          include: {
            parish: true,
          },
        },
      },
    });

    if (!event) {
      return false;
    }

    // Verificar hierarquia
    if (user?.role === UserRole.DIOCESAN_ADMIN) {
      return event.community?.parish?.dioceseId === user.dioceseId;
    }

    if (user?.role === UserRole.PARISH_ADMIN) {
      return event.community?.parishId === user.parishId;
    }

    if (user?.role === UserRole.COMMUNITY_COORDINATOR) {
      return event.communityId === user.communityId;
    }

    // Para PASTORAL_COORDINATOR, verificar se coordena alguma pastoral do evento
    if (user?.role === UserRole.PASTORAL_COORDINATOR && user.member) {
      const userPastoralIds = await this.getUserPastoralIds(userId, true);
      return event.eventPastorals.some((ep) => userPastoralIds.includes(ep.communityPastoralId));
    }

    // VOLUNTEER e FAITHFUL só têm acesso se estiverem na mesma comunidade
    return event.communityId === user?.communityId;
  }

  /**
   * Verifica se o usuário tem acesso a uma escala específica.
   * Escala com evento: herda o acesso do evento. Escala sem evento (Fase 4.1):
   * usa a comunidade própria da escala.
   */
  async hasAccessToSchedule(userId: string, scheduleId: string): Promise<boolean> {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id: scheduleId },
      select: { eventId: true, communityId: true },
    });

    if (!schedule) {
      return false;
    }

    if (schedule.eventId) {
      return this.hasAccessToEvent(userId, schedule.eventId);
    }

    if (schedule.communityId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) return false;
      const currentUser: CurrentUser = {
        id: user.id,
        role: user.role,
        dioceseId: user.dioceseId ?? undefined,
        parishId: user.parishId ?? undefined,
        communityId: user.communityId ?? undefined,
      };
      return this.isCommunityInScope(currentUser, schedule.communityId);
    }

    return false;
  }

  /**
   * Verifica se o usuário tem acesso a uma atribuição de escala específica
   * (para confirmar/recusar ou fazer check-in)
   */
  async hasAccessToAssignment(userId: string, assignmentId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { member: true },
    });

    if (!user) {
      return false;
    }

    // SYSTEM_ADMIN tem acesso a tudo
    if (user.role === UserRole.SYSTEM_ADMIN) {
      return true;
    }

    const assignment = await this.prisma.scheduleAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        member: {
          include: {
            pastoralMemberships: {
              where: {
                isActive: true,
                communityPastoralId: { not: null },
              },
              select: {
                communityPastoralId: true,
              },
            },
          },
        },
        schedule: {
          include: {
            event: {
              include: {
                eventPastorals: {
                  select: {
                    communityPastoralId: true,
                  },
                },
                community: {
                  include: { parish: true },
                },
              },
            },
          },
        },
      },
    });

    if (!assignment) {
      return false;
    }

    // O próprio membro pode confirmar/recusar sua atribuição
    if (assignment.memberId === user.member?.id) {
      return true;
    }

    // Verificar hierarquia para administradores
    const event = assignment.schedule?.event;
    if (!event) {
      return false;
    }

    if (user.role === UserRole.DIOCESAN_ADMIN) {
      return event.community?.parish?.dioceseId === user.dioceseId;
    }

    if (user.role === UserRole.PARISH_ADMIN) {
      return event.community?.parishId === user.parishId;
    }

    if (user.role === UserRole.COMMUNITY_COORDINATOR) {
      return event.communityId === user.communityId;
    }

    // PASTORAL_COORDINATOR pode gerenciar atribuições de eventos de suas pastorais
    if (user.role === UserRole.PASTORAL_COORDINATOR) {
      const userPastoralIds = await this.getUserPastoralIds(userId, true);
      const assignmentPastoralIds = assignment.member?.pastoralMemberships
        ?.map((membership) => membership.communityPastoralId)
        .filter((id): id is string => !!id) || [];
      const eventPastoralIds = assignment.schedule?.event?.eventPastorals
        ?.map((eventPastoral) => eventPastoral.communityPastoralId)
        .filter((id): id is string => !!id) || [];

      return userPastoralIds.some(
        (pastoralId) =>
          assignmentPastoralIds.includes(pastoralId) &&
          eventPastoralIds.includes(pastoralId),
      );
    }

    return false;
  }

  /**
   * Verifica se o usuário pode gerenciar um membro específico
   */
  async canManageMember(userId: string, memberId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return false;
    }

    // SYSTEM_ADMIN pode gerenciar qualquer membro
    if (user.role === UserRole.SYSTEM_ADMIN) {
      return true;
    }

    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      include: {
        community: {
          include: { parish: true },
        },
        pastoralMemberships: {
          where: {
            isActive: true,
            communityPastoralId: { not: null },
          },
          select: {
            communityPastoralId: true,
          },
        },
      },
    });

    if (!member) {
      return false;
    }

    // Verificar hierarquia
    if (user.role === UserRole.DIOCESAN_ADMIN) {
      return member.community?.parish?.dioceseId === user.dioceseId;
    }

    if (user.role === UserRole.PARISH_ADMIN) {
      return member.community?.parishId === user.parishId;
    }

    if (user.role === UserRole.COMMUNITY_COORDINATOR) {
      return member.communityId === user.communityId;
    }

    if (user.role === UserRole.PASTORAL_COORDINATOR) {
      // Alinhado ao applyMemberFilter: o coordenador de pastoral gerencia os
      // membros da PRÓPRIA COMUNIDADE (vincular cônjuge, atualizar cadastro).
      return member.communityId === user.communityId;
    }

    return false;
  }

  /**
   * Verifica se uma comunidade está dentro do escopo de LEITURA/PARTICIPAÇÃO
   * do usuário (mais permissivo que canManageCommunity: um FAITHFUL "está em
   * escopo" na própria comunidade, embora não possa gerenciá-la).
   */
  async isCommunityInScope(user: CurrentUser, communityId: string): Promise<boolean> {
    if (user.role === UserRole.SYSTEM_ADMIN) {
      return true;
    }

    if (user.communityId === communityId) {
      return true;
    }

    if (
      user.communities?.some(
        (link) => link.communityId === communityId && link.isActive !== false,
      )
    ) {
      return true;
    }

    if (user.role === UserRole.DIOCESAN_ADMIN || user.role === UserRole.PARISH_ADMIN) {
      const community = await this.prisma.community.findUnique({
        where: { id: communityId },
        include: { parish: true },
      });

      if (!community) {
        return false;
      }

      if (user.role === UserRole.DIOCESAN_ADMIN) {
        return community.parish?.dioceseId === user.dioceseId;
      }

      return community.parishId === user.parishId;
    }

    return false;
  }

  /**
   * Verifica se o usuário pode gerenciar uma comunidade específica
   */
  async canManageCommunity(userId: string, communityId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return false;
    }

    // SYSTEM_ADMIN pode gerenciar qualquer comunidade
    if (user.role === UserRole.SYSTEM_ADMIN) {
      return true;
    }

    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
      include: {
        parish: true,
      },
    });

    if (!community) {
      return false;
    }

    // Verificar hierarquia
    if (user.role === UserRole.DIOCESAN_ADMIN) {
      return community.parish?.dioceseId === user.dioceseId;
    }

    if (user.role === UserRole.PARISH_ADMIN) {
      return community.parishId === user.parishId;
    }

    if (user.role === UserRole.COMMUNITY_COORDINATOR) {
      return community.id === user.communityId;
    }

    return false;
  }

  /**
   * Verifica se o usuário pode gerenciar uma paróquia específica
   */
  async canManageParish(userId: string, parishId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return false;
    }

    // SYSTEM_ADMIN pode gerenciar qualquer paróquia
    if (user.role === UserRole.SYSTEM_ADMIN) {
      return true;
    }

    const parish = await this.prisma.parish.findUnique({
      where: { id: parishId },
    });

    if (!parish) {
      return false;
    }

    // Verificar hierarquia
    if (user.role === UserRole.DIOCESAN_ADMIN) {
      return parish.dioceseId === user.dioceseId;
    }

    if (user.role === UserRole.PARISH_ADMIN) {
      return parish.id === user.parishId;
    }

    return false;
  }

  /**
   * Verifica se o usuário pode gerenciar um evento específico
   */
  async canManageEvent(userId: string, eventId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { member: true },
    });

    if (!user) {
      return false;
    }

    // SYSTEM_ADMIN pode gerenciar qualquer evento
    if (user.role === UserRole.SYSTEM_ADMIN) {
      return true;
    }

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        eventPastorals: true,
        community: {
          include: { parish: true },
        },
      },
    });

    if (!event) {
      return false;
    }

    // Verificar hierarquia
    if (user.role === UserRole.DIOCESAN_ADMIN) {
      return event.community?.parish?.dioceseId === user.dioceseId;
    }

    if (user.role === UserRole.PARISH_ADMIN) {
      return event.community?.parishId === user.parishId;
    }

    if (user.role === UserRole.COMMUNITY_COORDINATOR) {
      return event.communityId === user.communityId;
    }

    // Para PASTORAL_COORDINATOR, verificar se coordena alguma pastoral do evento
    if (user.role === UserRole.PASTORAL_COORDINATOR && user.member) {
      const userPastoralIds = await this.getUserPastoralIds(userId, true);
      return event.eventPastorals.some((ep) => userPastoralIds.includes(ep.communityPastoralId));
    }

    return false;
  }

  /**
   * Aplica filtros de hierarquia a uma query do Prisma para comunidades
   */
  applyCommunityFilter(user: CurrentUser): any {
    const where: any = {};

    switch (user.role) {
      case UserRole.SYSTEM_ADMIN:
        // Sem filtro
        break;
      case UserRole.DIOCESAN_ADMIN:
        if (user.dioceseId) {
          where.parish = { dioceseId: user.dioceseId };
        }
        break;
      case UserRole.PARISH_ADMIN:
        if (user.parishId) {
          where.parishId = user.parishId;
        }
        break;
      case UserRole.COMMUNITY_COORDINATOR:
      case UserRole.PASTORAL_COORDINATOR:
      case UserRole.VOLUNTEER:
      case UserRole.FAITHFUL:
        // Se o usuário tem communityId, filtra por comunidade
        // Se não tem, filtra pela paróquia (se tiver)
        if (user.communityId) {
          where.id = user.communityId;
        } else if (user.parishId) {
          where.parishId = user.parishId;
        }
        break;
    }

    return where;
  }

  /**
   * Aplica filtros de hierarquia a uma query do Prisma para paróquias
   */
  applyParishFilter(user: CurrentUser): any {
    const where: any = {};

    switch (user.role) {
      case UserRole.SYSTEM_ADMIN:
        // Sem filtro
        break;
      case UserRole.DIOCESAN_ADMIN:
        where.dioceseId = user.dioceseId;
        break;
      case UserRole.PARISH_ADMIN:
      case UserRole.COMMUNITY_COORDINATOR:
      case UserRole.PASTORAL_COORDINATOR:
      case UserRole.VOLUNTEER:
      case UserRole.FAITHFUL:
        where.id = user.parishId;
        break;
    }

    return where;
  }

  /**
   * Aplica filtros de hierarquia a uma query do Prisma para eventos
   */
  applyEventFilter(user: CurrentUser): any {
    const where: any = {};

    switch (user.role) {
      case UserRole.SYSTEM_ADMIN:
        // Sem filtro
        break;
      case UserRole.DIOCESAN_ADMIN:
        where.community = { parish: { dioceseId: user.dioceseId } };
        break;
      case UserRole.PARISH_ADMIN:
        where.community = { parishId: user.parishId };
        break;
      case UserRole.COMMUNITY_COORDINATOR:
        where.communityId = user.communityId;
        break;
      case UserRole.PASTORAL_COORDINATOR:
        // Vê os eventos da sua comunidade e também os eventos (de outras
        // comunidades) em que alguma de suas pastorais está envolvida
        if (user.pastoralIds?.length) {
          where.OR = [
            ...(user.communityId ? [{ communityId: user.communityId }] : []),
            {
              eventPastorals: {
                some: {
                  communityPastoralId: {
                    in: user.pastoralIds,
                  },
                },
              },
            },
          ];
        } else {
          where.communityId = user.communityId;
        }
        break;
      case UserRole.VOLUNTEER:
      case UserRole.FAITHFUL:
        where.communityId = user.communityId;
        break;
    }

    return where;
  }

  /**
   * Aplica filtros de hierarquia a uma query do Prisma para membros
   */
  applyMemberFilter(user: CurrentUser): any {
    const where: any = {};

    switch (user.role) {
      case UserRole.SYSTEM_ADMIN:
        // Sem filtro
        break;
      case UserRole.DIOCESAN_ADMIN:
        where.community = { parish: { dioceseId: user.dioceseId } };
        break;
      case UserRole.PARISH_ADMIN:
        where.community = { parishId: user.parishId };
        break;
      case UserRole.COMMUNITY_COORDINATOR:
      case UserRole.PASTORAL_COORDINATOR:
      // Coordenador (de comunidade ou pastoral) enxerga TODOS os membros da
      // comunidade — inclusive os de vínculo SECUNDÁRIO (multi-comunidade).
      // A edição segue regida por canManageMember (comunidade principal).
      case UserRole.VOLUNTEER:
      case UserRole.FAITHFUL:
        if (user.communityId) {
          where.OR = [
            { communityId: user.communityId },
            { communityLinks: { some: { communityId: user.communityId, isActive: true } } },
          ];
        }
        break;
    }

    return where;
  }

  /**
   * Aplica filtros de hierarquia a uma query do Prisma para escalas.
   * Cobre tanto escalas COM evento quanto escalas SEM evento (Fase 4.1),
   * que se ancoram diretamente na comunidade (schedule.communityId).
   */
  applyScheduleFilter(user: CurrentUser): any {
    // Cláusula equivalente aplicada ao evento OU à comunidade própria da escala
    let eventClause: any = null;
    let standaloneClause: any = null;

    switch (user.role) {
      case UserRole.SYSTEM_ADMIN:
        return {};
      case UserRole.DIOCESAN_ADMIN:
        eventClause = { community: { parish: { dioceseId: user.dioceseId } } };
        standaloneClause = { community: { parish: { dioceseId: user.dioceseId } } };
        break;
      case UserRole.PARISH_ADMIN:
        eventClause = { community: { parishId: user.parishId } };
        standaloneClause = { community: { parishId: user.parishId } };
        break;
      case UserRole.COMMUNITY_COORDINATOR:
        eventClause = { communityId: user.communityId };
        standaloneClause = { communityId: user.communityId };
        break;
      case UserRole.PASTORAL_COORDINATOR:
        if (user.pastoralIds?.length) {
          eventClause = {
            eventPastorals: { some: { communityPastoralId: { in: user.pastoralIds } } },
          };
          standaloneClause = {
            pastorals: { some: { communityPastoralId: { in: user.pastoralIds } } },
          };
        } else {
          eventClause = { communityId: user.communityId };
          standaloneClause = { communityId: user.communityId };
        }
        break;
      case UserRole.VOLUNTEER:
      case UserRole.FAITHFUL:
        eventClause = { communityId: user.communityId };
        standaloneClause = { communityId: user.communityId };
        break;
    }

    return {
      OR: [
        { event: eventClause },
        { AND: [{ eventId: null }, standaloneClause] },
      ],
    };
  }
}
