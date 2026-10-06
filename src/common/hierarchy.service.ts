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
  /** Pastorais que o usuário COORDENA (validateUser) — subconjunto de pastoralIds */
  coordinatedPastoralIds?: string[];
  /**
   * Vínculos N:N ATIVOS carregados pelo JwtStrategy (validateUser). `role` é o
   * papel gravado no vínculo: só o vínculo com o MESMO papel de gestão do
   * usuário (atribuído por um superior via /users) conta como escopo de gestão.
   */
  communities?: Array<{ communityId: string; isActive?: boolean; role?: UserRole }>;
  /** Cadastro de membro do usuário (carregado pelo JwtStrategy em validateUser) */
  member?: { id: string } | null;
}

/**
 * Cláusula `where` que não casa com nenhum registro. Usada quando o escopo do
 * usuário não pode ser resolvido (papel restrito sem diocese/paróquia/comunidade,
 * papel desconhecido): negar por padrão, nunca devolver `{}` (= tudo).
 * Sempre um objeto NOVO — os chamadores acrescentam chaves ao where devolvido.
 */
export function noAccessWhere(): { id: string } {
  return { id: '__none__' };
}

/** True quando o filtro devolvido é a negação total (escopo não resolvido). */
export function isNoAccessWhere(where: any): boolean {
  return !!where && where.id === '__none__';
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
      if (await this.isCommunityInScope(currentUser, schedule.communityId)) {
        return true;
      }

      // Multi-comunidade: coordenador de pastoral "de fora" (ex.: música da
      // matriz servindo na capela) tem acesso quando a pastoral que coordena
      // está vinculada à escala — mesma regra do hasAccessToEvent.
      const coordinatedPastoralIds = await this.getUserPastoralIds(userId, true);
      if (coordinatedPastoralIds.length > 0) {
        const linkedPastoral = await this.prisma.schedulePastoral.findFirst({
          where: { scheduleId, communityPastoralId: { in: coordinatedPastoralIds } },
          select: { id: true },
        });
        if (linkedPastoral) return true;
      }
      return false;
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
   * Comunidades de GESTÃO de um coordenador de comunidade além da principal:
   * vínculos ativos gravados com o MESMO papel (atribuídos por um superior via
   * /users — coordenação de várias comunidades da paróquia). Vínculo de fé
   * (papel diferente ou sem papel) nunca entra. Para os demais papéis: vazio.
   */
  getManagementLinkCommunityIds(user: CurrentUser): string[] {
    if (user.role !== UserRole.COMMUNITY_COORDINATOR) {
      return [];
    }
    return (user.communities ?? [])
      .filter((link) => link.isActive !== false && link.role === user.role)
      .map((link) => link.communityId);
  }

  /**
   * Lista das comunidades no escopo de um papel de COMUNIDADE — a mesma regra
   * do isCommunityInScope, para quem precisa de `in: [...]`:
   * - COMMUNITY_COORDINATOR: principal + vínculos de gestão (mesmo papel) da
   *   própria paróquia; vínculo de fé nunca entra;
   * - PASTORAL_COORDINATOR: só a principal;
   * - VOLUNTEER/FAITHFUL: principal + vínculos ativos (leitura/participação);
   * - demais papéis (ou admin sem âncora): vazio — negar por padrão.
   */
  async getCommunityScopeIds(user: CurrentUser): Promise<string[]> {
    const primary = user?.communityId ? [user.communityId] : [];
    switch (user?.role) {
      case UserRole.COMMUNITY_COORDINATOR: {
        const links = this.getManagementLinkCommunityIds(user).filter((id) => id !== user.communityId);
        if (!links.length || !user.parishId) return primary;
        const rows = await this.prisma.community.findMany({
          where: { id: { in: links }, parishId: user.parishId },
          select: { id: true },
        });
        return [...primary, ...rows.map((r) => r.id)];
      }
      case UserRole.PASTORAL_COORDINATOR:
        return primary;
      case UserRole.VOLUNTEER:
      case UserRole.FAITHFUL: {
        const links = (user.communities ?? []).filter((l) => l.isActive !== false).map((l) => l.communityId);
        return [...new Set([...primary, ...links])];
      }
      default:
        return [];
    }
  }

  /**
   * Verifica se uma comunidade está dentro do escopo do usuário. Usado tanto
   * em leitura quanto em ESCRITA (mural, escalas, finanças, salas...), por isso:
   * - Gestão (DIOCESAN/PARISH_ADMIN, COMMUNITY/PASTORAL_COORDINATOR): só o
   *   escopo de gestão do cadastro (diocese/paróquia/comunidade). Vínculo de FÉ
   *   (UserCommunity escolhido pelo próprio usuário) nunca amplia escopo. Única
   *   exceção: coordenador de comunidade com outras comunidades atribuídas por
   *   um superior (vínculo com o mesmo papel, dentro da sua paróquia).
   * - Fiel/voluntário: a comunidade principal e os vínculos ativos (leitura e
   *   participação — mural, agenda, pedidos de oração; vínculo aberto).
   * - Papel desconhecido ou escopo não resolvido: negado.
   */
  async isCommunityInScope(user: CurrentUser, communityId: string): Promise<boolean> {
    if (!user?.role || !communityId) {
      return false;
    }

    switch (user.role) {
      case UserRole.SYSTEM_ADMIN:
        return true;

      case UserRole.DIOCESAN_ADMIN:
      case UserRole.PARISH_ADMIN: {
        const anchor = user.role === UserRole.DIOCESAN_ADMIN ? user.dioceseId : user.parishId;
        if (!anchor) {
          return false;
        }
        const community = await this.prisma.community.findUnique({
          where: { id: communityId },
          include: { parish: true },
        });
        if (!community) {
          return false;
        }
        return user.role === UserRole.DIOCESAN_ADMIN
          ? community.parish?.dioceseId === user.dioceseId
          : community.parishId === user.parishId;
      }

      case UserRole.COMMUNITY_COORDINATOR: {
        if (user.communityId && user.communityId === communityId) {
          return true;
        }
        if (!user.parishId || !this.getManagementLinkCommunityIds(user).includes(communityId)) {
          return false;
        }
        // Coordenação de várias comunidades só vale dentro da própria paróquia
        const community = await this.prisma.community.findUnique({
          where: { id: communityId },
          select: { parishId: true },
        });
        return !!community && community.parishId === user.parishId;
      }

      case UserRole.PASTORAL_COORDINATOR:
        return !!user.communityId && user.communityId === communityId;

      case UserRole.VOLUNTEER:
      case UserRole.FAITHFUL:
        if (user.communityId && user.communityId === communityId) {
          return true;
        }
        return !!user.communities?.some(
          (link) => link.communityId === communityId && link.isActive !== false,
        );

      default:
        return false;
    }
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
    switch (user.role) {
      case UserRole.SYSTEM_ADMIN:
        // Sem filtro
        return {};
      case UserRole.DIOCESAN_ADMIN:
        return user.dioceseId ? { dioceseId: user.dioceseId } : noAccessWhere();
      case UserRole.PARISH_ADMIN:
      case UserRole.COMMUNITY_COORDINATOR:
      case UserRole.PASTORAL_COORDINATOR:
      case UserRole.VOLUNTEER:
      case UserRole.FAITHFUL:
        // `{ id: undefined }` seria ignorado pelo Prisma (= todas as paróquias)
        return user.parishId ? { id: user.parishId } : noAccessWhere();
      default:
        return noAccessWhere();
    }
  }

  /**
   * Aplica filtros de hierarquia a uma query do Prisma para eventos.
   * Negar por padrão: papel sem o escopo correspondente (ex.: fiel sem
   * comunidade, admin diocesano sem diocese) recebe um filtro impossível —
   * `{ communityId: undefined }` seria ignorado pelo Prisma e viraria "tudo".
   */
  applyEventFilter(user: CurrentUser): any {
    switch (user.role) {
      case UserRole.SYSTEM_ADMIN:
        // Sem filtro
        return {};
      case UserRole.DIOCESAN_ADMIN:
        return user.dioceseId
          ? { community: { parish: { dioceseId: user.dioceseId } } }
          : noAccessWhere();
      case UserRole.PARISH_ADMIN:
        return user.parishId ? { community: { parishId: user.parishId } } : noAccessWhere();
      case UserRole.COMMUNITY_COORDINATOR:
        return user.communityId ? { communityId: user.communityId } : noAccessWhere();
      case UserRole.PASTORAL_COORDINATOR: {
        // Vê os eventos da sua comunidade e também os eventos (de outras
        // comunidades) das pastorais que COORDENA. Participar de uma pastoral
        // (pastoralIds) não dá escopo de gestão; sem a lista de coordenação na
        // sessão, nada além da própria comunidade (negar por padrão).
        const coordinated = user.coordinatedPastoralIds ?? [];
        if (coordinated.length) {
          return {
            OR: [
              ...(user.communityId ? [{ communityId: user.communityId }] : []),
              {
                eventPastorals: {
                  some: {
                    communityPastoralId: {
                      in: coordinated,
                    },
                  },
                },
              },
            ],
          };
        }
        return user.communityId ? { communityId: user.communityId } : noAccessWhere();
      }
      case UserRole.VOLUNTEER:
      case UserRole.FAITHFUL:
        return user.communityId ? { communityId: user.communityId } : noAccessWhere();
      default:
        return noAccessWhere();
    }
  }

  /**
   * Aplica filtros de hierarquia a uma query do Prisma para membros.
   *
   * - Gestão com escopo (admin/coordenação) enxerga os membros do seu escopo.
   * - Fiel/voluntário NÃO lista o cadastro da comunidade (LGPD): enxerga só o
   *   próprio cadastro e os dependentes (responsibleId) — `user.member.id`
   *   vem do JwtStrategy.
   * - Escopo não resolvido (sem diocese/paróquia/comunidade/membro) ou papel
   *   desconhecido: filtro impossível, nunca `{}`.
   */
  applyMemberFilter(user: CurrentUser): any {
    switch (user.role) {
      case UserRole.SYSTEM_ADMIN:
        // Sem filtro
        return {};
      case UserRole.DIOCESAN_ADMIN:
        return user.dioceseId
          ? { community: { parish: { dioceseId: user.dioceseId } } }
          : noAccessWhere();
      case UserRole.PARISH_ADMIN:
        return user.parishId ? { community: { parishId: user.parishId } } : noAccessWhere();
      case UserRole.COMMUNITY_COORDINATOR:
      case UserRole.PASTORAL_COORDINATOR:
        // Coordenador (de comunidade ou pastoral) enxerga TODOS os membros da
        // comunidade — inclusive os de vínculo SECUNDÁRIO (multi-comunidade).
        // A edição segue regida por canManageMember (comunidade principal).
        if (!user.communityId) return noAccessWhere();
        return {
          OR: [
            { communityId: user.communityId },
            { communityLinks: { some: { communityId: user.communityId, isActive: true } } },
          ],
        };
      case UserRole.VOLUNTEER:
      case UserRole.FAITHFUL: {
        const selfMemberId = user.member?.id;
        if (!selfMemberId) return noAccessWhere();
        return { OR: [{ id: selfMemberId }, { responsibleId: selfMemberId }] };
      }
      default:
        return noAccessWhere();
    }
  }

  /**
   * Aplica filtros de hierarquia a uma query do Prisma para escalas.
   * Cobre tanto escalas COM evento quanto escalas SEM evento (Fase 4.1),
   * que se ancoram diretamente na comunidade (schedule.communityId).
   * Negar por padrão: papel sem o escopo correspondente recebe filtro impossível.
   */
  applyScheduleFilter(user: CurrentUser): any {
    // Cláusula equivalente aplicada ao evento OU à comunidade própria da escala
    let eventClause: any = null;
    let standaloneClause: any = null;

    switch (user.role) {
      case UserRole.SYSTEM_ADMIN:
        return {};
      case UserRole.DIOCESAN_ADMIN:
        if (!user.dioceseId) return noAccessWhere();
        eventClause = { community: { parish: { dioceseId: user.dioceseId } } };
        standaloneClause = { community: { parish: { dioceseId: user.dioceseId } } };
        break;
      case UserRole.PARISH_ADMIN:
        if (!user.parishId) return noAccessWhere();
        eventClause = { community: { parishId: user.parishId } };
        standaloneClause = { community: { parishId: user.parishId } };
        break;
      case UserRole.COMMUNITY_COORDINATOR:
        if (!user.communityId) return noAccessWhere();
        eventClause = { communityId: user.communityId };
        standaloneClause = { communityId: user.communityId };
        break;
      case UserRole.PASTORAL_COORDINATOR: {
        // Só as pastorais que COORDENA (coordinatedPastoralIds); participação
        // não conta. Ausente na sessão = nenhuma (negar por padrão).
        const coordinated = user.coordinatedPastoralIds ?? [];
        if (coordinated.length) {
          eventClause = {
            eventPastorals: { some: { communityPastoralId: { in: coordinated } } },
          };
          standaloneClause = {
            pastorals: { some: { communityPastoralId: { in: coordinated } } },
          };
        } else {
          if (!user.communityId) return noAccessWhere();
          eventClause = { communityId: user.communityId };
          standaloneClause = { communityId: user.communityId };
        }
        break;
      }
      case UserRole.VOLUNTEER:
      case UserRole.FAITHFUL:
        if (!user.communityId) return noAccessWhere();
        eventClause = { communityId: user.communityId };
        standaloneClause = { communityId: user.communityId };
        break;
      default:
        return noAccessWhere();
    }

    return {
      OR: [
        { event: eventClause },
        { AND: [{ eventId: null }, standaloneClause] },
      ],
    };
  }
}
