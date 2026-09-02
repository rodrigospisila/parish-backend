import { ForbiddenException, Injectable } from '@nestjs/common';
import { ScheduleStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser, HierarchyService } from '../../common/hierarchy.service';
import { isRoleAtLeast } from '../auth/constants/role-hierarchy';

export interface CoordinatorOverview {
  scope: { communityIds: string[]; pastoralScoped: boolean; pastoralIds: string[] };
  catechesis: {
    pendingApprovals: number;
    documentsToReview: number;
    sessionsWithoutAttendance: number;
    unreadFamilyMessages: number;
  };
  schedules: { pendingResponses: number; declinedToReplace: number; upcomingWeek: number };
  swaps: { pending: number };
  pastorals: { joinRequests: number };
  prayers: { pendingModeration: number };
  /** Orações só são moderáveis a partir de COMMUNITY_COORDINATOR */
  canModeratePrayers: boolean;
  total: number;
}

/**
 * Dashboard do coordenador (Onda 4): pendências acionáveis consolidadas no
 * escopo do usuário — a landing por papel na web e o card da Home no app.
 */
@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  private startOfTodayUtc(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }

  /** Comunidades que o usuário acompanha (ou a informada, se estiver no escopo). */
  private async resolveCommunityIds(user: CurrentUser, communityId?: string): Promise<string[]> {
    if (communityId) {
      if (!(await this.hierarchyService.isCommunityInScope(user, communityId))) {
        throw new ForbiddenException('Comunidade fora do seu escopo');
      }
      return [communityId];
    }
    if (user.role === UserRole.SYSTEM_ADMIN) {
      return (await this.prisma.community.findMany({ select: { id: true } })).map((c) => c.id);
    }
    if (user.role === UserRole.DIOCESAN_ADMIN && user.dioceseId) {
      return (
        await this.prisma.community.findMany({ where: { parish: { dioceseId: user.dioceseId } }, select: { id: true } })
      ).map((c) => c.id);
    }
    if (user.role === UserRole.PARISH_ADMIN && user.parishId) {
      return (await this.prisma.community.findMany({ where: { parishId: user.parishId }, select: { id: true } })).map(
        (c) => c.id,
      );
    }
    const linked = (user.communities ?? []).filter((c) => c.isActive !== false).map((c) => c.communityId);
    return [...new Set([user.communityId, ...linked].filter((id): id is string => !!id))];
  }

  async getCoordinatorOverview(user: CurrentUser, communityId?: string): Promise<CoordinatorOverview> {
    const communityIds = await this.resolveCommunityIds(user, communityId);
    // Coordenador de pastoral enxerga escalas/trocas/pedidos só das SUAS pastorais;
    // catequese e orações seguem o escopo da comunidade (mesma regra dos módulos)
    const pastoralScoped = user.role === UserRole.PASTORAL_COORDINATOR;
    const pastoralIds = pastoralScoped
      ? [...new Set([...(user.pastoralIds ?? []), ...(await this.hierarchyService.getUserPastoralIds(user.id, true))])]
      : [];

    const empty: CoordinatorOverview = {
      scope: { communityIds, pastoralScoped, pastoralIds },
      catechesis: { pendingApprovals: 0, documentsToReview: 0, sessionsWithoutAttendance: 0, unreadFamilyMessages: 0 },
      schedules: { pendingResponses: 0, declinedToReplace: 0, upcomingWeek: 0 },
      swaps: { pending: 0 },
      pastorals: { joinRequests: 0 },
      prayers: { pendingModeration: 0 },
      canModeratePrayers: isRoleAtLeast(user.role, UserRole.COMMUNITY_COORDINATOR),
      total: 0,
    };
    if (!communityIds.length) return empty;

    const today = this.startOfTodayUtc();
    const inSevenDays = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const classWhere = { communityId: { in: communityIds }, deletedAt: null, status: 'ACTIVE' as const };
    // Escala viva, de evento vivo (arquivar evento/escala não pode deixar pendência fantasma)
    const scheduleScope = {
      date: { gte: today },
      status: { not: ScheduleStatus.CANCELLED },
      deletedAt: null,
      OR: [{ communityId: { in: communityIds } }, { event: { communityId: { in: communityIds } } }],
      AND: [{ OR: [{ eventId: null }, { event: { deletedAt: null } }] }],
    };
    const pastoralFilter = pastoralScoped ? { communityPastoralId: { in: pastoralIds } } : {};
    // "Esta semana" no recorte das pastorais do coordenador de pastoral (mesma
    // regra da lista de escalas dele)
    const upcomingScope = pastoralScoped
      ? {
          ...scheduleScope,
          AND: [
            ...scheduleScope.AND,
            {
              OR: [
                { event: { eventPastorals: { some: { communityPastoralId: { in: pastoralIds } } } } },
                { pastorals: { some: { communityPastoralId: { in: pastoralIds } } } },
              ],
            },
          ],
        }
      : scheduleScope;

    const [
      pendingApprovals,
      documentsToReview,
      sessionsWithoutAttendance,
      unreadFamilyMessages,
      pendingResponses,
      declinedToReplace,
      upcomingWeek,
      pendingSwaps,
      joinRequests,
      pendingModeration,
    ] = await Promise.all([
      this.prisma.catechesisEnrollment.count({
        // Fila de espera também aguarda decisão da coordenação (aceitar/recusar)
        where: { status: { in: ['PENDING_APPROVAL', 'WAITLISTED'] }, member: { deletedAt: null }, class: classWhere },
      }),
      this.prisma.catechesisDocument.count({ where: { status: 'SUBMITTED', enrollment: { class: classWhere } } }),
      this.prisma.catechesisSession.count({
        where: { date: { lte: today }, attendances: { none: {} }, class: classWhere },
      }),
      this.prisma.catechesisMessage.count({
        where: {
          fromTeam: false,
          readAt: null,
          enrollment: { class: classWhere, status: { in: ['ACTIVE', 'PENDING_APPROVAL'] } },
        },
      }),
      this.prisma.scheduleAssignment.count({ where: { status: 'PENDING', schedule: scheduleScope, ...pastoralFilter } }),
      this.prisma.scheduleAssignment.count({ where: { status: 'DECLINED', schedule: scheduleScope, ...pastoralFilter } }),
      this.prisma.schedule.count({ where: { ...upcomingScope, date: { gte: today, lt: inSevenDays } } }),
      this.prisma.assignmentSwapRequest.count({
        where: { status: 'PENDING', assignment: { schedule: scheduleScope, ...pastoralFilter } },
      }),
      this.prisma.pastoralJoinRequest.count({
        where: {
          status: 'PENDING',
          member: { deletedAt: null },
          communityPastoral: {
            communityId: { in: communityIds },
            deletedAt: null,
            ...(pastoralScoped ? { id: { in: pastoralIds } } : {}),
          },
        },
      }),
      // Quem não pode moderar não recebe pendência que não consegue resolver
      empty.canModeratePrayers
        ? this.prisma.prayerRequest.count({ where: { status: 'PENDING', communityId: { in: communityIds } } })
        : Promise.resolve(0),
    ]);

    const overview: CoordinatorOverview = {
      scope: { communityIds, pastoralScoped, pastoralIds },
      catechesis: { pendingApprovals, documentsToReview, sessionsWithoutAttendance, unreadFamilyMessages },
      schedules: { pendingResponses, declinedToReplace, upcomingWeek },
      swaps: { pending: pendingSwaps },
      pastorals: { joinRequests },
      prayers: { pendingModeration },
      canModeratePrayers: empty.canModeratePrayers,
      total: 0,
    };
    overview.total =
      pendingApprovals +
      documentsToReview +
      sessionsWithoutAttendance +
      unreadFamilyMessages +
      pendingResponses +
      declinedToReplace +
      pendingSwaps +
      joinRequests +
      pendingModeration;
    return overview;
  }
}
