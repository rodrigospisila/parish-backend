import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UserRole } from '@prisma/client';

/**
 * Interface para o usuário atual com informações de hierarquia
 */
export interface CurrentUser {
  id: string;
  role: UserRole;
  dioceseId?: string;
  parishId?: string;
  communityId?: string;
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
              where: coordinatorOnly ? { role: 'COORDINATOR' } : undefined,
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
              where: { communityPastoralId: pastoralId },
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
   * Verifica se o usuário tem acesso a uma escala específica
   */
  async hasAccessToSchedule(userId: string, scheduleId: string): Promise<boolean> {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: { event: true },
    });

    if (!schedule?.eventId) {
      return false;
    }

    return this.hasAccessToEvent(userId, schedule.eventId);
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
        schedule: {
          include: {
            event: {
              include: {
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
      return this.hasAccessToEvent(userId, event.id);
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
      case UserRole.PASTORAL_COORDINATOR:
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
      case UserRole.VOLUNTEER:
      case UserRole.FAITHFUL:
        where.communityId = user.communityId;
        break;
    }

    return where;
  }

  /**
   * Aplica filtros de hierarquia a uma query do Prisma para escalas
   */
  applyScheduleFilter(user: CurrentUser): any {
    const where: any = {};

    switch (user.role) {
      case UserRole.SYSTEM_ADMIN:
        // Sem filtro
        break;
      case UserRole.DIOCESAN_ADMIN:
        where.event = { community: { parish: { dioceseId: user.dioceseId } } };
        break;
      case UserRole.PARISH_ADMIN:
        where.event = { community: { parishId: user.parishId } };
        break;
      case UserRole.COMMUNITY_COORDINATOR:
      case UserRole.PASTORAL_COORDINATOR:
      case UserRole.VOLUNTEER:
      case UserRole.FAITHFUL:
        where.event = { communityId: user.communityId };
        break;
    }

    return where;
  }
}
