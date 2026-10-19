import { ForbiddenException, Injectable, Optional } from '@nestjs/common';
import { AssignmentStatus, Prisma, ScheduleStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser, HierarchyService } from '../../common/hierarchy.service';
import { isRoleAtLeast } from '../auth/constants/role-hierarchy';
import { PlanAccessService } from '../plans/plan-access.service';
import { PAID_FEATURES, PaidFeature } from '../plans/plan-rules';
import { COORDINATOR_MEMBER_ROLES, loadCoordinatedPastoralIds } from '../pastorals/coordination-scope';

/**
 * Escopo exibido no Início. `communityIds` vazio + `unrestricted: true` =
 * SYSTEM_ADMIN sem comunidade escolhida (o país inteiro): nenhuma consulta
 * monta `IN (...)` com ids — o total vem em `communityCount`.
 */
export interface DashboardScopeView {
  communityIds: string[];
  pastoralScoped: boolean;
  pastoralIds: string[];
  unrestricted: boolean;
  communityCount: number;
}

export interface CoordinatorOverview {
  scope: DashboardScopeView;
  /**
   * Recursos pagos (chaves de plan-rules) bloqueados pelo plano no escopo
   * exibido — só com PLAN_ENFORCEMENT=on; as seções deles vêm zeradas.
   */
  planLocked: PaidFeature[];
  /** Coordena a catequese (pastoral `isCatechesis`) ou é PARISH_ADMIN+; senão o bloco vem zerado */
  canSeeCatechesis: boolean;
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

interface StatusCounts {
  confirmed: number;
  pending: number;
  declined: number;
  expired: number;
}

export interface CoordinatorInsights {
  generatedAt: string;
  scope: DashboardScopeView;
  /** Mesmo significado do CoordinatorOverview.planLocked */
  planLocked: PaidFeature[];
  /** Mesmo significado do CoordinatorOverview.canSeeCatechesis (inclui o "risco de evasão" com nomes) */
  canSeeCatechesis: boolean;
  catechesis: {
    classes: number;
    catechists: number;
    activeStudents: number;
    newEnrollments30d: number;
    imageConsentPending: number;
    byStatus: { active: number; pendingApproval: number; waitlisted: number; completed: number; droppedOut: number };
    byStage: { stageId: string; name: string; ordering: number; active: number; capacity: number | null; classes: number }[];
    /** 8 semanas (segunda a domingo), da mais antiga para a atual */
    weeklyAttendance: {
      weekStart: string;
      sessions: number;
      marks: number;
      present: number;
      late: number;
      justified: number;
      rate: number | null;
    }[];
    /** Últimas 4 semanas vs. as 4 anteriores */
    attendanceRate: number | null;
    previousAttendanceRate: number | null;
    classesAttention: {
      classId: string;
      name: string;
      stage: string;
      active: number;
      capacity: number | null;
      rate: number | null;
      openSessions: number;
      pendingApprovals: number;
    }[];
    atRisk: {
      /** false em escopos amplos (muitas comunidades): o cálculo por aluno é omitido */
      available: boolean;
      count: number;
      students: { enrollmentId: string; classId: string; memberName: string; className: string; consecutiveAbsences: number }[];
    };
  };
  schedules: {
    next30: StatusCounts & { total: number; schedules: number; confirmationRate: number | null };
    weekly: (StatusCounts & { weekStart: string; schedules: number; isCurrent: boolean })[];
    byPastoral: (StatusCounts & { pastoralId: string | null; name: string; total: number })[];
    gaps: {
      scheduleId: string;
      date: string;
      time: string | null;
      title: string;
      pastoral: string;
      required: number;
      confirmed: number;
      pending: number;
      missing: number;
    }[];
    overloaded: { memberId: string; name: string; upcomingCount: number }[];
    agenda: {
      id: string;
      kind: 'schedule' | 'event';
      date: string;
      time: string | null;
      title: string;
      eventType: string | null;
      location: string | null;
      pastorals: string[];
      coverage: (StatusCounts & { total: number; required: number }) | null;
    }[];
  };
  community: {
    activeMembers: number;
    newMembers30d: number;
    monthlyNewMembers: { month: string; count: number }[];
    pastorals: { count: number; agents: number };
    agentsByPastoral: { pastoralId: string; name: string; agents: number }[];
    birthdays: { memberId: string; name: string; date: string; isToday: boolean; age: number | null }[];
    events: { next30: number; byType: { type: string; count: number }[] };
    sacraments: { requested: number; documents: number; course: number; scheduled: number; celebrated90d: number } | null;
    prayers: { approved30d: number } | null;
    joinRequests: { pending: number; oldestDays: number | null };
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** Acima disto (comunidades no escopo) as séries por aluno são omitidas — só agregações no banco */
const WIDE_SCOPE_COMMUNITIES = 12;
/** Até aqui (comunidades no escopo) o plano é conferido uma a uma (cache de 60 s do PlanAccessService). */
const PLAN_CHECK_ONE_BY_ONE = 25;

/** Recorte interno. `null` = sem restrição (só SYSTEM_ADMIN sem comunidade escolhida). */
interface DashboardScope {
  communityIds: string[] | null;
  communityCount: number;
  pastoralScoped: boolean;
  pastoralIds: string[];
  /** Comunidades cuja catequese o usuário coordena (null = sem restrição) */
  catechesisIds: string[] | null;
  /** Comunidades com os recursos pagos liberados (null = sem restrição de plano) */
  paidIds: string[] | null;
  planLocked: PaidFeature[];
  /** Membros/aniversariantes da comunidade: PASTORAL_COORDINATOR ou acima (mesma regra do applyMemberFilter) */
  canSeeMembers: boolean;
}

/** Interseção de recortes (`null` = sem restrição). */
function intersectIds(a: string[] | null, b: string[] | null): string[] | null {
  if (a === null) return b;
  if (b === null) return a;
  const set = new Set(b);
  return a.filter((id) => set.has(id));
}

/** `{ communityId: { in } }`, ou nada quando sem restrição. */
function communityIn(ids: string[] | null): { communityId?: { in: string[] } } {
  return ids === null ? {} : { communityId: { in: ids } };
}

/** Mesmo recorte em SQL: sem restrição → TRUE; lista vazia → FALSE (Prisma.join([]) quebra). */
function communitySql(column: Prisma.Sql, ids: string[] | null): Prisma.Sql {
  if (ids === null) return Prisma.sql`TRUE`;
  if (!ids.length) return Prisma.sql`FALSE`;
  return Prisma.sql`${column} IN (${Prisma.join(ids)})`;
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
    // Global (PlansModule); opcional para os specs que montam o service à mão
    @Optional() private readonly planAccess?: PlanAccessService,
  ) {}

  private startOfTodayUtc(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }

  /** Segunda-feira (UTC) da semana que contém a data */
  private startOfWeekUtc(date: Date): Date {
    const offset = (date.getUTCDay() + 6) % 7;
    return new Date(date.getTime() - offset * DAY_MS);
  }

  private addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * DAY_MS);
  }

  private isoDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private rate(part: number, whole: number): number | null {
    return whole > 0 ? Math.round((part / whole) * 100) : null;
  }

  /**
   * Comunidades que o usuário acompanha (ou a informada, se estiver no escopo).
   * SYSTEM_ADMIN sem comunidade escolhida → `null` (sem restrição): nada de
   * buscar as ~53 mil comunidades para montar `IN (...)`.
   */
  private async resolveCommunityIds(user: CurrentUser, communityId?: string): Promise<string[] | null> {
    if (communityId) {
      if (!(await this.hierarchyService.isCommunityInScope(user, communityId))) {
        throw new ForbiddenException('Comunidade fora do seu escopo');
      }
      return [communityId];
    }
    if (user.role === UserRole.SYSTEM_ADMIN) {
      return null;
    }
    if (user.role === UserRole.DIOCESAN_ADMIN) {
      if (!user.dioceseId) return [];
      return (
        await this.prisma.community.findMany({ where: { parish: { dioceseId: user.dioceseId } }, select: { id: true } })
      ).map((c) => c.id);
    }
    if (user.role === UserRole.PARISH_ADMIN) {
      if (!user.parishId) return [];
      return (await this.prisma.community.findMany({ where: { parishId: user.parishId }, select: { id: true } })).map(
        (c) => c.id,
      );
    }
    return this.hierarchyService.getCommunityScopeIds(user);
  }

  /**
   * Comunidades em que o usuário COORDENA a pastoral da catequese
   * (`GlobalPastoral.isCatechesis`): coordenação vigente ou papel de
   * coordenação ativo — mesma regra do módulo da catequese.
   */
  private async catechesisCoordinatedCommunityIds(userId: string): Promise<string[]> {
    const pastoral = { deletedAt: null, globalPastoral: { isCatechesis: true } };
    const [coordinations, memberships] = await Promise.all([
      this.prisma.pastoralCoordinator.findMany({
        where: { isCurrent: true, member: { userId, deletedAt: null }, communityPastoral: pastoral },
        select: { communityPastoral: { select: { communityId: true } } },
      }),
      this.prisma.pastoralMember.findMany({
        where: {
          isActive: true,
          leftAt: null,
          role: { in: COORDINATOR_MEMBER_ROLES },
          member: { userId, deletedAt: null },
          communityPastoral: pastoral,
        },
        select: { communityPastoral: { select: { communityId: true } } },
      }),
    ]);
    const ids = new Set<string>();
    for (const row of [...coordinations, ...memberships]) {
      if (row.communityPastoral?.communityId) ids.add(row.communityPastoral.communityId);
    }
    return [...ids];
  }

  /**
   * Comunidades do escopo com os recursos pagos liberados. `null` = sem
   * restrição (PLAN_ENFORCEMENT off/log, SYSTEM_ADMIN ou sem PlanAccessService).
   */
  private async resolvePaidIds(user: CurrentUser, communityIds: string[] | null): Promise<string[] | null> {
    if (communityIds === null || !this.planAccess || user.role === UserRole.SYSTEM_ADMIN) return null;
    if (this.planAccess.enforcement() !== 'on') return null;
    if (
      communityIds.length > PLAN_CHECK_ONE_BY_ONE &&
      (user.role === UserRole.DIOCESAN_ADMIN || user.role === UserRole.PARISH_ADMIN)
    ) {
      // Uma consulta para a paróquia/diocese inteira
      const paid = new Set(await this.planAccess.paidCommunityIdsInScope(user));
      return communityIds.filter((id) => paid.has(id));
    }
    const paid: string[] = [];
    for (const id of communityIds) {
      if (await this.planAccess.communityHasAccess(id)) paid.push(id);
    }
    return paid;
  }

  /**
   * Escopo do Início:
   * - comunidades: hierarquia (SYSTEM_ADMIN sem restrição, sem lista de ids);
   * - coordenador de pastoral (papel PASTORAL_COORDINATOR, ou VOLUNTEER/FAITHFUL
   *   que coordena pastoral pelo vínculo — ux-dashboards-22): escalas, trocas e
   *   pedidos só das pastorais que COORDENA (coordenação, não participação);
   *   quem não tem papel de coordenação nem coordena pastoral → 403;
   * - catequese: só quem coordena a catequese da comunidade (pastoral
   *   `isCatechesis`), o coordenador da própria comunidade (mesma regra do
   *   módulo) ou PARISH_ADMIN+ (ux-dashboards-01);
   * - plano (PLAN_ENFORCEMENT=on): seções pagas só das comunidades com plano.
   */
  private async resolveScope(user: CurrentUser, communityId?: string): Promise<DashboardScope> {
    const roleCoordinates = isRoleAtLeast(user.role, UserRole.PASTORAL_COORDINATOR);
    const pastoralOnly = !roleCoordinates;
    const pastoralScoped = user.role === UserRole.PASTORAL_COORDINATOR || pastoralOnly;
    const pastoralIds = pastoralScoped ? await loadCoordinatedPastoralIds(this.prisma as any, user.id) : [];

    let communityIds: string[] | null;
    if (pastoralOnly) {
      if (!pastoralIds.length) {
        throw new ForbiddenException('O painel da coordenação é para quem coordena uma pastoral');
      }
      // Comunidades das pastorais que coordena (o vínculo de fé não amplia nada)
      const own = await this.prisma.communityPastoral.findMany({
        where: { id: { in: pastoralIds }, deletedAt: null },
        select: { communityId: true },
      });
      const ownIds = [...new Set(own.map((row) => row.communityId))];
      if (communityId && !ownIds.includes(communityId)) {
        throw new ForbiddenException('Comunidade fora do seu escopo');
      }
      communityIds = communityId ? [communityId] : ownIds;
    } else {
      communityIds = await this.resolveCommunityIds(user, communityId);
    }

    let catechesisIds: string[] | null;
    if (isRoleAtLeast(user.role, UserRole.PARISH_ADMIN)) {
      catechesisIds = communityIds;
    } else {
      const allowed = new Set(roleCoordinates ? await this.catechesisCoordinatedCommunityIds(user.id) : []);
      if (user.role === UserRole.COMMUNITY_COORDINATOR && user.communityId) allowed.add(user.communityId);
      catechesisIds = (communityIds ?? []).filter((id) => allowed.has(id));
    }

    const paidIds = await this.resolvePaidIds(user, communityIds);
    const planLocked: PaidFeature[] =
      paidIds !== null && communityIds !== null && communityIds.length > 0 && paidIds.length === 0
        ? [...PAID_FEATURES]
        : [];

    return {
      communityIds,
      communityCount:
        communityIds === null ? await this.prisma.community.count({ where: { deletedAt: null } }) : communityIds.length,
      pastoralScoped,
      pastoralIds,
      catechesisIds,
      paidIds,
      planLocked,
      canSeeMembers: roleCoordinates,
    };
  }

  /**
   * Recorte comum aos dois painéis (where de cada seção). Escalas, trocas e
   * pastorais são recursos pagos: só comunidades com plano (modo on).
   */
  private async buildScope(user: CurrentUser, communityId?: string) {
    const scope = await this.resolveScope(user, communityId);
    const { communityIds, pastoralScoped, pastoralIds } = scope;
    const paidCommunityIds = intersectIds(communityIds, scope.paidIds);
    const catechesisCommunityIds = intersectIds(intersectIds(communityIds, scope.catechesisIds), scope.paidIds);

    const classWhere = { ...communityIn(catechesisCommunityIds), deletedAt: null, status: 'ACTIVE' as const };
    // Escala viva, de evento vivo (arquivar evento/escala não pode deixar pendência fantasma)
    const scheduleBase = {
      status: { not: ScheduleStatus.CANCELLED },
      deletedAt: null,
      ...(paidCommunityIds === null
        ? {}
        : { OR: [{ communityId: { in: paidCommunityIds } }, { event: { communityId: { in: paidCommunityIds } } }] }),
      AND: [{ OR: [{ eventId: null }, { event: { deletedAt: null } }] }] as any[],
    };
    const pastoralFilter = pastoralScoped ? { communityPastoralId: { in: pastoralIds } } : {};
    // Escalas das pastorais do coordenador de pastoral (mesma regra da lista dele)
    const scopedSchedules = pastoralScoped
      ? {
          ...scheduleBase,
          AND: [
            ...scheduleBase.AND,
            {
              OR: [
                { event: { eventPastorals: { some: { communityPastoralId: { in: pastoralIds } } } } },
                { pastorals: { some: { communityPastoralId: { in: pastoralIds } } } },
              ],
            },
          ],
        }
      : scheduleBase;

    const view: DashboardScopeView = {
      communityIds: communityIds ?? [],
      pastoralScoped,
      pastoralIds,
      unrestricted: communityIds === null,
      communityCount: scope.communityCount,
    };

    return {
      scope,
      view,
      communityIds,
      paidCommunityIds,
      catechesisCommunityIds,
      pastoralScoped,
      pastoralIds,
      classWhere,
      scheduleBase,
      scopedSchedules,
      pastoralFilter,
    };
  }

  async getCoordinatorOverview(user: CurrentUser, communityId?: string): Promise<CoordinatorOverview> {
    const {
      scope,
      view,
      communityIds,
      paidCommunityIds,
      catechesisCommunityIds,
      pastoralScoped,
      pastoralIds,
      classWhere,
      scheduleBase,
      scopedSchedules,
      pastoralFilter,
    } = await this.buildScope(user, communityId);
    // Lista vazia = seção fora do alcance (catequese de outra coordenação, plano): nem consulta
    const catechesisOn = catechesisCommunityIds === null || catechesisCommunityIds.length > 0;
    const paidOn = paidCommunityIds === null || paidCommunityIds.length > 0;
    const zero = Promise.resolve(0);

    const empty: CoordinatorOverview = {
      scope: view,
      planLocked: scope.planLocked,
      canSeeCatechesis: scope.catechesisIds === null || scope.catechesisIds.length > 0,
      catechesis: { pendingApprovals: 0, documentsToReview: 0, sessionsWithoutAttendance: 0, unreadFamilyMessages: 0 },
      schedules: { pendingResponses: 0, declinedToReplace: 0, upcomingWeek: 0 },
      swaps: { pending: 0 },
      pastorals: { joinRequests: 0 },
      prayers: { pendingModeration: 0 },
      canModeratePrayers: isRoleAtLeast(user.role, UserRole.COMMUNITY_COORDINATOR),
      total: 0,
    };
    if (communityIds !== null && !communityIds.length) return empty;

    const today = this.startOfTodayUtc();
    const inSevenDays = this.addDays(today, 7);
    const scheduleScope = { ...scheduleBase, date: { gte: today } };
    const upcomingScope = { ...scopedSchedules, date: { gte: today, lt: inSevenDays } };

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
      catechesisOn
        ? this.prisma.catechesisEnrollment.count({
            // Fila de espera também aguarda decisão da coordenação (aceitar/recusar)
            where: { status: { in: ['PENDING_APPROVAL', 'WAITLISTED'] }, member: { deletedAt: null }, class: classWhere },
          })
        : zero,
      catechesisOn
        ? this.prisma.catechesisDocument.count({ where: { status: 'SUBMITTED', enrollment: { class: classWhere } } })
        : zero,
      catechesisOn
        ? this.prisma.catechesisSession.count({
            where: { date: { lte: today }, attendances: { none: {} }, class: classWhere },
          })
        : zero,
      catechesisOn
        ? this.prisma.catechesisMessage.count({
            where: {
              fromTeam: false,
              readAt: null,
              enrollment: { class: classWhere, status: { in: ['ACTIVE', 'PENDING_APPROVAL'] } },
            },
          })
        : zero,
      paidOn
        ? this.prisma.scheduleAssignment.count({ where: { status: 'PENDING', schedule: scheduleScope, ...pastoralFilter } })
        : zero,
      paidOn
        ? this.prisma.scheduleAssignment.count({ where: { status: 'DECLINED', schedule: scheduleScope, ...pastoralFilter } })
        : zero,
      paidOn ? this.prisma.schedule.count({ where: upcomingScope }) : zero,
      paidOn
        ? this.prisma.assignmentSwapRequest.count({
            where: { status: 'PENDING', assignment: { schedule: scheduleScope, ...pastoralFilter } },
          })
        : zero,
      paidOn
        ? this.prisma.pastoralJoinRequest.count({
            where: {
              status: 'PENDING',
              member: { deletedAt: null },
              communityPastoral: {
                ...communityIn(paidCommunityIds),
                deletedAt: null,
                ...(pastoralScoped ? { id: { in: pastoralIds } } : {}),
              },
            },
          })
        : zero,
      // Quem não pode moderar não recebe pendência que não consegue resolver
      empty.canModeratePrayers
        ? this.prisma.prayerRequest.count({ where: { status: 'PENDING', ...communityIn(communityIds) } })
        : zero,
    ]);

    const overview: CoordinatorOverview = {
      scope: view,
      planLocked: empty.planLocked,
      canSeeCatechesis: empty.canSeeCatechesis,
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

  /**
   * Indicadores do painel "Início": frequência da catequese por semana, risco
   * de evasão, resposta às escalas, lacunas de vagas, agenda, crescimento da
   * comunidade e aniversariantes. Só leitura; janelas fixas (8 semanas /
   * 30 dias / 6 meses) documentadas em cada campo.
   */
  async getCoordinatorInsights(user: CurrentUser, communityId?: string): Promise<CoordinatorInsights> {
    const {
      scope,
      view,
      communityIds,
      paidCommunityIds,
      catechesisCommunityIds,
      pastoralScoped,
      pastoralIds,
      classWhere,
      scheduleBase,
      scopedSchedules,
      pastoralFilter,
    } = await this.buildScope(user, communityId);
    const canSeeCommunityWide = isRoleAtLeast(user.role, UserRole.COMMUNITY_COORDINATOR);
    // Lista vazia = seção fora do alcance (catequese de outra coordenação, plano): nem consulta
    const catechesisOn = catechesisCommunityIds === null || catechesisCommunityIds.length > 0;
    const paidOn = paidCommunityIds === null || paidCommunityIds.length > 0;
    const membersOn = scope.canSeeMembers;

    const today = this.startOfTodayUtc();
    const tomorrow = this.addDays(today, 1);
    const in7 = this.addDays(today, 7);
    const in14 = this.addDays(today, 14);
    const in30 = this.addDays(today, 30);
    const ago30 = this.addDays(today, -30);
    const ago90 = this.addDays(today, -90);
    const thisWeek = this.startOfWeekUtc(today);
    const attendanceFrom = this.addDays(thisWeek, -7 * 7);
    const scheduleWeeksFrom = this.addDays(thisWeek, -5 * 7);
    const scheduleWeeksTo = this.addDays(thisWeek, 3 * 7);
    const monthsFrom = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 5, 1));

    const insights: CoordinatorInsights = {
      generatedAt: new Date().toISOString(),
      scope: view,
      planLocked: scope.planLocked,
      canSeeCatechesis: scope.catechesisIds === null || scope.catechesisIds.length > 0,
      catechesis: {
        classes: 0,
        catechists: 0,
        activeStudents: 0,
        newEnrollments30d: 0,
        imageConsentPending: 0,
        byStatus: { active: 0, pendingApproval: 0, waitlisted: 0, completed: 0, droppedOut: 0 },
        byStage: [],
        weeklyAttendance: [],
        attendanceRate: null,
        previousAttendanceRate: null,
        classesAttention: [],
        atRisk: { available: true, count: 0, students: [] },
      },
      schedules: {
        next30: { total: 0, schedules: 0, confirmed: 0, pending: 0, declined: 0, expired: 0, confirmationRate: null },
        weekly: [],
        byPastoral: [],
        gaps: [],
        overloaded: [],
        agenda: [],
      },
      community: {
        activeMembers: 0,
        newMembers30d: 0,
        monthlyNewMembers: [],
        pastorals: { count: 0, agents: 0 },
        agentsByPastoral: [],
        birthdays: [],
        events: { next30: 0, byType: [] },
        sacraments: null,
        prayers: null,
        joinRequests: { pending: 0, oldestDays: null },
      },
    };
    if (communityIds !== null && !communityIds.length) return insights;
    const wideScope =
      catechesisCommunityIds === null || catechesisCommunityIds.length > WIDE_SCOPE_COMMUNITIES;
    insights.catechesis.atRisk.available = !wideScope;

    const next30Schedules = { ...scopedSchedules, date: { gte: today, lt: in30 } };
    const sessionWindow = { class: classWhere, date: { gte: attendanceFrom, lte: today } };
    // Pastorais são recurso pago: só comunidades com plano (modo on)
    const pastoralWhere = {
      ...communityIn(paidCommunityIds),
      deletedAt: null,
      status: 'ACTIVE' as const,
      ...(pastoralScoped ? { id: { in: pastoralIds } } : {}),
    };
    // Membros da(s) comunidade(s): vínculo principal ou secundário ativo
    const memberWhere =
      communityIds === null
        ? { deletedAt: null }
        : {
            deletedAt: null,
            OR: [
              { communityId: { in: communityIds } },
              { communityLinks: { some: { communityId: { in: communityIds }, isActive: true } } },
            ],
          };
    const eventWhere = {
      ...communityIn(communityIds),
      deletedAt: null,
      status: 'PUBLISHED' as const,
      ...(pastoralScoped ? { eventPastorals: { some: { communityPastoralId: { in: pastoralIds } } } } : {}),
    };

    // Aniversários: os 7 dias a partir de hoje, em MMDD (a virada de ano é
    // tratada pela lista, não por BETWEEN). Em ano não bissexto, quem nasceu
    // em 29/02 comemora em 28/02.
    const birthdayKeys = Array.from({ length: 7 }, (_, i) => {
      const d = this.addDays(today, i);
      return `${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
    });
    const year = today.getUTCFullYear();
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    const birthdaySqlKeys = !isLeap && birthdayKeys.includes('0228') ? [...birthdayKeys, '0229'] : birthdayKeys;
    // Membro da comunidade: vínculo principal ou secundário ativo (mesma regra de memberWhere)
    // Sem restrição (SYSTEM_ADMIN): TRUE — nunca IN com a lista do país
    // Coordenador só pelo vínculo (papel VOLUNTEER/FAITHFUL) não lista membros da comunidade: FALSE
    const memberScopeSql = !membersOn
      ? Prisma.sql`FALSE`
      : communityIds === null
        ? Prisma.sql`TRUE`
        : Prisma.sql`(
      ${communitySql(Prisma.sql`m."communityId"`, communityIds)}
      OR EXISTS (
        SELECT 1 FROM member_communities mc
        WHERE mc."memberId" = m.id AND mc."isActive" = true AND ${communitySql(Prisma.sql`mc."communityId"`, communityIds)}
      )
    )`;

    const [
      classes,
      enrollmentGroups,
      catechists,
      newEnrollments30d,
      imageConsentPending,
      sessionsInWindow,
      attendanceBySession,
      attendanceRows,
      next30Groups,
      next30ScheduleCount,
      weeklyAssignmentGroups,
      weeklySchedules8,
      byPastoralGroups,
      upcomingSchedules,
      upcomingEventsWithoutSchedule,
      overloadedGroups,
      activeMembers,
      newMembers30d,
      monthlyRows,
      pastorals,
      agentRows,
      birthdayRows,
      eventGroups,
      sacramentGroups,
      celebrated90d,
      approvedPrayers30d,
      joinRequestAgg,
    ] = await Promise.all([
      this.prisma.catechesisClass.findMany({
        where: classWhere,
        select: {
          id: true,
          name: true,
          capacity: true,
          stage: { select: { id: true, name: true, ordering: true } },
          _count: { select: { sessions: { where: { date: { lte: today }, attendances: { none: {} } } } } },
        },
        orderBy: [{ stage: { ordering: 'asc' } }, { name: 'asc' }],
      }),
      this.prisma.catechesisEnrollment.groupBy({
        by: ['classId', 'status'],
        where: { class: classWhere, member: { deletedAt: null } },
        _count: { _all: true },
      }),
      this.prisma.catechesisCatechist.findMany({
        where: { class: classWhere, member: { deletedAt: null } },
        distinct: ['memberId'],
        select: { memberId: true },
      }),
      this.prisma.catechesisEnrollment.count({
        where: {
          class: classWhere,
          member: { deletedAt: null },
          enrolledAt: { gte: ago30 },
          status: { in: ['ACTIVE', 'PENDING_APPROVAL', 'WAITLISTED'] },
        },
      }),
      this.prisma.catechesisEnrollment.count({
        where: { class: classWhere, member: { deletedAt: null }, status: 'ACTIVE', imageConsent: null },
      }),
      this.prisma.catechesisSession.findMany({
        where: sessionWindow,
        select: { id: true, date: true, classId: true },
      }),
      // Uma linha por encontro (agregado no banco): escala para qualquer escopo
      this.prisma.$queryRaw<{ sessionId: string; marks: number; present: number; late: number; justified: number }[]>(Prisma.sql`
        SELECT a."sessionId",
               COUNT(*)::int AS marks,
               COUNT(*) FILTER (WHERE a.present)::int AS present,
               COUNT(*) FILTER (WHERE a.late)::int AS late,
               COUNT(*) FILTER (WHERE a.justified)::int AS justified
        FROM catechesis_attendances a
        JOIN catechesis_sessions s ON s.id = a."sessionId"
        JOIN catechesis_classes c ON c.id = s."classId"
        JOIN catechesis_enrollments e ON e.id = a."enrollmentId"
        JOIN members m ON m.id = e."memberId"
        WHERE ${communitySql(Prisma.sql`c."communityId"`, catechesisCommunityIds)}
          AND c."deletedAt" IS NULL AND c.status = 'ACTIVE'
          AND s.date >= ${attendanceFrom} AND s.date <= ${today}
          AND e.status = 'ACTIVE' AND m."deletedAt" IS NULL
        GROUP BY a."sessionId"
      `),
      // Marcações por aluno (só para o risco de evasão; omitido em escopo amplo)
      wideScope
        ? Promise.resolve([] as { enrollmentId: string; present: boolean; justified: boolean; session: { date: Date } }[])
        : this.prisma.catechesisAttendance.findMany({
            where: { session: sessionWindow, enrollment: { status: 'ACTIVE', member: { deletedAt: null } } },
            select: { enrollmentId: true, present: true, justified: true, session: { select: { date: true } } },
          }),
      this.prisma.scheduleAssignment.groupBy({
        by: ['status'],
        where: { schedule: next30Schedules, ...pastoralFilter },
        _count: { _all: true },
      }),
      this.prisma.schedule.count({ where: next30Schedules }),
      this.prisma.scheduleAssignment.groupBy({
        by: ['scheduleId', 'status'],
        where: { schedule: { ...scopedSchedules, date: { gte: scheduleWeeksFrom, lt: scheduleWeeksTo } }, ...pastoralFilter },
        _count: { _all: true },
      }),
      this.prisma.schedule.findMany({
        where: { ...scopedSchedules, date: { gte: scheduleWeeksFrom, lt: scheduleWeeksTo } },
        select: { id: true, date: true },
      }),
      this.prisma.scheduleAssignment.groupBy({
        by: ['communityPastoralId', 'status'],
        where: { schedule: next30Schedules, ...pastoralFilter },
        _count: { _all: true },
      }),
      this.prisma.schedule.findMany({
        where: { ...scopedSchedules, date: { gte: today, lt: in14 } },
        select: {
          id: true,
          title: true,
          date: true,
          startTime: true,
          location: true,
          event: { select: { title: true, type: true, location: true } },
          pastorals: {
            select: {
              communityPastoralId: true,
              requiredPeople: true,
              communityPastoral: { select: { globalPastoral: { select: { name: true } } } },
            },
          },
          assignments: { where: pastoralFilter, select: { status: true, communityPastoralId: true } },
        },
        orderBy: { date: 'asc' },
        take: 250,
      }),
      // Evento sem escala VIVA (cancelada não conta) entra na agenda por si só
      this.prisma.event.findMany({
        where: {
          ...eventWhere,
          startDate: { gte: today, lt: in7 },
          schedules: { none: { deletedAt: null, status: { not: ScheduleStatus.CANCELLED } } },
        },
        select: { id: true, title: true, type: true, startDate: true, location: true },
        orderBy: { startDate: 'asc' },
        take: 20,
      }),
      this.prisma.scheduleAssignment.groupBy({
        by: ['memberId'],
        where: {
          status: { not: AssignmentStatus.DECLINED },
          schedule: { ...scheduleBase, date: { gte: today, lt: in30 } },
          member: { ...memberWhere },
          ...pastoralFilter,
        },
        _count: { _all: true },
        having: { memberId: { _count: { gte: 4 } } },
      }),
      membersOn ? this.prisma.member.count({ where: { ...memberWhere, status: 'ACTIVE' } }) : Promise.resolve(0),
      membersOn
        ? this.prisma.member.count({ where: { ...memberWhere, status: 'ACTIVE', createdAt: { gte: ago30 } } })
        : Promise.resolve(0),
      this.prisma.$queryRaw<{ month: string; count: number }[]>(Prisma.sql`
        SELECT to_char(date_trunc('month', m."createdAt"), 'YYYY-MM') AS month, COUNT(*)::int AS count
        FROM members m
        WHERE ${memberScopeSql}
          AND m."deletedAt" IS NULL
          AND m."createdAt" >= ${monthsFrom}
        GROUP BY 1
        ORDER BY 1
      `),
      this.prisma.communityPastoral.findMany({
        where: pastoralWhere,
        select: {
          id: true,
          globalPastoral: { select: { name: true } },
          _count: { select: { members: { where: { isActive: true, leftAt: null, member: { deletedAt: null } } } } },
        },
      }),
      this.prisma.pastoralMember.findMany({
        where: { isActive: true, leftAt: null, member: { deletedAt: null }, communityPastoral: pastoralWhere },
        distinct: ['memberId'],
        select: { memberId: true },
      }),
      this.prisma.$queryRaw<{ id: string; fullName: string; birthDate: Date }[]>(Prisma.sql`
        SELECT m.id, m."fullName", m."birthDate"
        FROM members m
        WHERE ${memberScopeSql}
          AND m."deletedAt" IS NULL
          AND m.status = 'ACTIVE'
          AND m."birthDate" IS NOT NULL
          AND to_char(m."birthDate", 'MMDD') IN (${Prisma.join(birthdaySqlKeys)})
        ORDER BY array_position(ARRAY[${Prisma.join(birthdaySqlKeys)}]::text[], to_char(m."birthDate", 'MMDD')), m."fullName"
        LIMIT 40
      `),
      this.prisma.event.groupBy({
        by: ['type'],
        where: { ...eventWhere, startDate: { gte: today, lt: in30 } },
        _count: { _all: true },
      }),
      canSeeCommunityWide
        ? this.prisma.sacramentProcess.groupBy({
            by: ['status'],
            where: { ...communityIn(communityIds), deletedAt: null, status: { notIn: ['CELEBRATED', 'CANCELLED'] } },
            _count: { _all: true },
          })
        : Promise.resolve([] as { status: string; _count: { _all: number } }[]),
      canSeeCommunityWide
        ? this.prisma.sacramentProcess.count({
            where: { ...communityIn(communityIds), deletedAt: null, status: 'CELEBRATED', updatedAt: { gte: ago90 } },
          })
        : Promise.resolve(0),
      canSeeCommunityWide
        ? this.prisma.prayerRequest.count({
            where: { status: 'APPROVED', ...communityIn(communityIds), updatedAt: { gte: ago30 } },
          })
        : Promise.resolve(0),
      this.prisma.pastoralJoinRequest.aggregate({
        where: { status: 'PENDING', member: { deletedAt: null }, communityPastoral: pastoralWhere },
        _count: { _all: true },
        _min: { createdAt: true },
      }),
    ]);

    // ---------- Catequese ----------
    const perClass = new Map<string, { active: number; pending: number; waitlisted: number }>();
    for (const group of enrollmentGroups) {
      const bucket = perClass.get(group.classId) ?? { active: 0, pending: 0, waitlisted: 0 };
      const n = group._count._all;
      if (group.status === 'ACTIVE') bucket.active += n;
      else if (group.status === 'PENDING_APPROVAL') bucket.pending += n;
      else if (group.status === 'WAITLISTED') bucket.waitlisted += n;
      perClass.set(group.classId, bucket);
      if (group.status === 'ACTIVE') insights.catechesis.byStatus.active += n;
      else if (group.status === 'PENDING_APPROVAL') insights.catechesis.byStatus.pendingApproval += n;
      else if (group.status === 'WAITLISTED') insights.catechesis.byStatus.waitlisted += n;
      else if (group.status === 'COMPLETED') insights.catechesis.byStatus.completed += n;
      else if (group.status === 'DROPPED_OUT') insights.catechesis.byStatus.droppedOut += n;
    }
    insights.catechesis.classes = classes.length;
    insights.catechesis.catechists = catechists.length;
    insights.catechesis.activeStudents = insights.catechesis.byStatus.active;
    insights.catechesis.newEnrollments30d = newEnrollments30d;
    insights.catechesis.imageConsentPending = imageConsentPending;

    const stages = new Map<string, CoordinatorInsights['catechesis']['byStage'][number]>();
    for (const klass of classes) {
      const stage = stages.get(klass.stage.id) ?? {
        stageId: klass.stage.id,
        name: klass.stage.name,
        ordering: klass.stage.ordering,
        active: 0,
        capacity: 0,
        classes: 0,
      };
      stage.classes += 1;
      stage.active += perClass.get(klass.id)?.active ?? 0;
      // Uma turma sem limite torna a etapa "sem limite"
      stage.capacity = stage.capacity === null || klass.capacity === null ? null : stage.capacity + klass.capacity;
      stages.set(klass.stage.id, stage);
    }
    insights.catechesis.byStage = [...stages.values()].sort((a, b) => a.ordering - b.ordering || a.name.localeCompare(b.name));

    // Frequência por semana + últimas 4 vs. 4 anteriores + por turma (30 dias) + risco de evasão
    const weeks = Array.from({ length: 8 }, (_, i) => this.addDays(attendanceFrom, i * 7));
    const weekly = weeks.map((weekStart) => ({
      weekStart: this.isoDate(weekStart),
      sessions: new Set<string>(),
      marks: 0,
      present: 0,
      late: 0,
      justified: 0,
    }));
    const classRecent = new Map<string, { marks: number; present: number }>();
    const sessionById = new Map(sessionsInWindow.map((s) => [s.id, s]));
    for (const agg of attendanceBySession) {
      const session = sessionById.get(agg.sessionId);
      if (!session) continue;
      const index = Math.min(7, Math.max(0, Math.floor((session.date.getTime() - attendanceFrom.getTime()) / (7 * DAY_MS))));
      const bucket = weekly[index];
      bucket.sessions.add(session.id);
      bucket.marks += agg.marks;
      bucket.present += agg.present;
      bucket.late += agg.late;
      bucket.justified += agg.justified;
      if (session.date >= ago30) {
        const recent = classRecent.get(session.classId) ?? { marks: 0, present: 0 };
        recent.marks += agg.marks;
        recent.present += agg.present;
        classRecent.set(session.classId, recent);
      }
    }
    const byEnrollment = new Map<string, { date: number; present: boolean; justified: boolean }[]>();
    for (const row of attendanceRows) {
      const list = byEnrollment.get(row.enrollmentId) ?? [];
      list.push({ date: row.session.date.getTime(), present: row.present, justified: row.justified });
      byEnrollment.set(row.enrollmentId, list);
    }
    insights.catechesis.weeklyAttendance = weekly.map((w) => ({
      weekStart: w.weekStart,
      sessions: w.sessions.size,
      marks: w.marks,
      present: w.present,
      late: w.late,
      justified: w.justified,
      rate: this.rate(w.present, w.marks),
    }));
    const sum = (slice: typeof weekly) =>
      slice.reduce((acc, w) => ({ marks: acc.marks + w.marks, present: acc.present + w.present }), { marks: 0, present: 0 });
    const recent4 = sum(weekly.slice(4));
    const previous4 = sum(weekly.slice(0, 4));
    insights.catechesis.attendanceRate = this.rate(recent4.present, recent4.marks);
    insights.catechesis.previousAttendanceRate = this.rate(previous4.present, previous4.marks);

    insights.catechesis.classesAttention = classes
      .map((klass) => {
        const recent = classRecent.get(klass.id);
        const counts = perClass.get(klass.id);
        return {
          classId: klass.id,
          name: klass.name,
          stage: klass.stage.name,
          active: counts?.active ?? 0,
          capacity: klass.capacity,
          rate: recent ? this.rate(recent.present, recent.marks) : null,
          openSessions: klass._count.sessions,
          pendingApprovals: (counts?.pending ?? 0) + (counts?.waitlisted ?? 0),
        };
      })
      // Precisa de atenção: chamada em aberto, inscrição parada ou frequência baixa
      .filter((c) => c.openSessions > 0 || c.pendingApprovals > 0 || (c.rate !== null && c.rate < 75))
      .sort((a, b) => (a.rate ?? 101) - (b.rate ?? 101) || b.openSessions - a.openSessions)
      .slice(0, 8);

    // Risco de evasão: 3+ faltas NÃO justificadas seguidas nas últimas chamadas
    const risky: { enrollmentId: string; streak: number }[] = [];
    for (const [enrollmentId, marks] of byEnrollment) {
      marks.sort((a, b) => b.date - a.date);
      let streak = 0;
      for (const mark of marks) {
        if (mark.present || mark.justified) break;
        streak += 1;
      }
      if (streak >= 3) risky.push({ enrollmentId, streak });
    }
    risky.sort((a, b) => b.streak - a.streak);
    insights.catechesis.atRisk.count = risky.length;
    if (risky.length) {
      const top = risky.slice(0, 8);
      const details = await this.prisma.catechesisEnrollment.findMany({
        where: { id: { in: top.map((r) => r.enrollmentId) } },
        select: { id: true, classId: true, member: { select: { fullName: true } }, class: { select: { name: true } } },
      });
      const byId = new Map(details.map((d) => [d.id, d]));
      insights.catechesis.atRisk.students = top
        .map((r) => {
          const d = byId.get(r.enrollmentId);
          return d
            ? {
                enrollmentId: r.enrollmentId,
                classId: d.classId,
                memberName: d.member.fullName,
                className: d.class.name,
                consecutiveAbsences: r.streak,
              }
            : null;
        })
        .filter((s): s is NonNullable<typeof s> => !!s);
    }

    // ---------- Escalas ----------
    const emptyStatus = (): StatusCounts => ({ confirmed: 0, pending: 0, declined: 0, expired: 0 });
    const addStatus = (target: StatusCounts, status: AssignmentStatus, n: number) => {
      if (status === 'CONFIRMED') target.confirmed += n;
      else if (status === 'PENDING') target.pending += n;
      else if (status === 'DECLINED') target.declined += n;
      else if (status === 'EXPIRED') target.expired += n;
    };
    const next30 = emptyStatus();
    for (const group of next30Groups) addStatus(next30, group.status, group._count._all);
    const next30Total = next30.confirmed + next30.pending + next30.declined + next30.expired;
    insights.schedules.next30 = {
      ...next30,
      total: next30Total,
      schedules: next30ScheduleCount,
      confirmationRate: this.rate(next30.confirmed, next30Total),
    };

    const scheduleWeeks = Array.from({ length: 8 }, (_, i) => this.addDays(scheduleWeeksFrom, i * 7));
    const weeklySchedules = scheduleWeeks.map((weekStart) => ({
      weekStart: this.isoDate(weekStart),
      isCurrent: weekStart.getTime() === thisWeek.getTime(),
      schedules: new Set<string>(),
      ...emptyStatus(),
    }));
    const weekIndexOfSchedule = new Map<string, number>();
    for (const schedule of weeklySchedules8) {
      const index = Math.min(7, Math.max(0, Math.floor((schedule.date.getTime() - scheduleWeeksFrom.getTime()) / (7 * DAY_MS))));
      weekIndexOfSchedule.set(schedule.id, index);
      weeklySchedules[index].schedules.add(schedule.id);
    }
    for (const group of weeklyAssignmentGroups) {
      const index = weekIndexOfSchedule.get(group.scheduleId);
      if (index === undefined) continue;
      addStatus(weeklySchedules[index], group.status, group._count._all);
    }
    insights.schedules.weekly = weeklySchedules.map((w) => ({
      weekStart: w.weekStart,
      isCurrent: w.isCurrent,
      schedules: w.schedules.size,
      confirmed: w.confirmed,
      pending: w.pending,
      declined: w.declined,
      expired: w.expired,
    }));

    const pastoralNames = new Map(pastorals.map((p) => [p.id, p.globalPastoral.name]));
    const missingNameIds = [
      ...new Set(
        byPastoralGroups
          .map((g) => g.communityPastoralId)
          .filter((id): id is string => !!id && !pastoralNames.has(id)),
      ),
    ];
    if (missingNameIds.length) {
      const extra = await this.prisma.communityPastoral.findMany({
        where: { id: { in: missingNameIds } },
        select: { id: true, globalPastoral: { select: { name: true } } },
      });
      for (const p of extra) pastoralNames.set(p.id, p.globalPastoral.name);
    }
    const byPastoral = new Map<string | null, StatusCounts & { pastoralId: string | null; name: string; total: number }>();
    for (const group of byPastoralGroups) {
      const key = group.communityPastoralId;
      const bucket = byPastoral.get(key) ?? {
        pastoralId: key,
        name: key ? pastoralNames.get(key) ?? 'Pastoral' : 'Sem pastoral',
        total: 0,
        ...emptyStatus(),
      };
      addStatus(bucket, group.status, group._count._all);
      bucket.total += group._count._all;
      byPastoral.set(key, bucket);
    }
    const ranked = [...byPastoral.values()].sort((a, b) => b.total - a.total);
    // Até 7 pastorais nomeadas; o resto agrupado em "Outras" (limite de séries legíveis)
    if (ranked.length > 8) {
      const others = ranked.slice(7).reduce(
        (acc, p) => {
          acc.total += p.total;
          acc.confirmed += p.confirmed;
          acc.pending += p.pending;
          acc.declined += p.declined;
          acc.expired += p.expired;
          return acc;
        },
        { pastoralId: null, name: 'Outras', total: 0, ...emptyStatus() } as StatusCounts & { pastoralId: string | null; name: string; total: number },
      );
      insights.schedules.byPastoral = [...ranked.slice(0, 7), others];
    } else {
      insights.schedules.byPastoral = ranked;
    }

    // schedule.date tem duas semânticas (date-only 00:00Z + startTime, ou
    // timestamp real da escala de evento); o cliente decide pelo próprio `date`,
    // aqui só vai o horário explícito quando existe
    const timeOf = (schedule: (typeof upcomingSchedules)[number]): string | null => schedule.startTime ?? null;
    const gaps: CoordinatorInsights['schedules']['gaps'] = [];
    for (const schedule of upcomingSchedules) {
      for (const sp of schedule.pastorals) {
        if (sp.requiredPeople <= 0) continue;
        if (pastoralScoped && !pastoralIds.includes(sp.communityPastoralId)) continue;
        const own = schedule.assignments.filter((a) => a.communityPastoralId === sp.communityPastoralId);
        const confirmed = own.filter((a) => a.status === 'CONFIRMED').length;
        const pending = own.filter((a) => a.status === 'PENDING').length;
        const missing = Math.max(0, sp.requiredPeople - confirmed - pending);
        if (missing > 0) {
          gaps.push({
            scheduleId: schedule.id,
            date: schedule.date.toISOString(),
            time: timeOf(schedule),
            title: schedule.event?.title ?? schedule.title,
            pastoral: sp.communityPastoral.globalPastoral.name,
            required: sp.requiredPeople,
            confirmed,
            pending,
            missing,
          });
        }
      }
    }
    insights.schedules.gaps = gaps.slice(0, 8);

    if (overloadedGroups.length) {
      const members = await this.prisma.member.findMany({
        where: { id: { in: overloadedGroups.map((g) => g.memberId) } },
        select: { id: true, fullName: true },
      });
      const names = new Map(members.map((m) => [m.id, m.fullName]));
      insights.schedules.overloaded = overloadedGroups
        .map((g) => ({ memberId: g.memberId, name: names.get(g.memberId) ?? '—', upcomingCount: g._count._all }))
        .sort((a, b) => b.upcomingCount - a.upcomingCount)
        .slice(0, 6);
    }

    // Cobertura no mesmo recorte de `gaps`: coordenador de pastoral vê só as
    // vagas/convocações das suas pastorais (assignments já vêm filtradas)
    const inScope = (sp: { communityPastoralId: string }) => !pastoralScoped || pastoralIds.includes(sp.communityPastoralId);
    const agenda: CoordinatorInsights['schedules']['agenda'] = upcomingSchedules
      .filter((s) => s.date < in7)
      .map((schedule) => {
        const coverage = emptyStatus();
        for (const a of schedule.assignments) addStatus(coverage, a.status, 1);
        const required = schedule.pastorals.filter(inScope).reduce((acc, sp) => acc + sp.requiredPeople, 0);
        return {
          id: schedule.id,
          kind: 'schedule' as const,
          date: schedule.date.toISOString(),
          time: timeOf(schedule),
          title: schedule.event?.title ?? schedule.title,
          eventType: schedule.event?.type ?? null,
          location: schedule.location ?? schedule.event?.location ?? null,
          pastorals: schedule.pastorals.map((sp) => sp.communityPastoral.globalPastoral.name),
          coverage: { ...coverage, total: schedule.assignments.length, required },
        };
      });
    for (const event of upcomingEventsWithoutSchedule) {
      agenda.push({
        id: event.id,
        kind: 'event',
        date: event.startDate.toISOString(),
        time: null,
        title: event.title,
        eventType: event.type,
        location: event.location ?? null,
        pastorals: [],
        coverage: null,
      });
    }
    // Ordem só aproximada aqui (as duas semânticas de `date` não se comparam
    // direto); o cliente agrupa por dia local e reordena pelo horário exibido
    agenda.sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''));
    insights.schedules.agenda = agenda.slice(0, 40);

    // ---------- Comunidade ----------
    insights.community.activeMembers = activeMembers;
    insights.community.newMembers30d = newMembers30d;
    const monthMap = new Map(monthlyRows.map((r) => [r.month, Number(r.count)]));
    insights.community.monthlyNewMembers = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(Date.UTC(monthsFrom.getUTCFullYear(), monthsFrom.getUTCMonth() + i, 1));
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      return { month: key, count: monthMap.get(key) ?? 0 };
    });

    insights.community.pastorals = { count: pastorals.length, agents: agentRows.length };
    insights.community.agentsByPastoral = pastorals
      .map((p) => ({ pastoralId: p.id, name: p.globalPastoral.name, agents: p._count.members }))
      .sort((a, b) => b.agents - a.agents || a.name.localeCompare(b.name))
      .slice(0, 8);

    insights.community.birthdays = birthdayRows
      .map((row) => {
        const key = `${String(row.birthDate.getUTCMonth() + 1).padStart(2, '0')}${String(row.birthDate.getUTCDate()).padStart(2, '0')}`;
        const offset = birthdayKeys.indexOf(key);
        const date = this.addDays(today, Math.max(0, offset));
        return {
          memberId: row.id,
          name: row.fullName,
          date: this.isoDate(date),
          isToday: offset === 0,
          // Ano 1900 = "só dia/mês conhecidos" (cadastros vindos de planilha sem ano)
          age: row.birthDate.getUTCFullYear() <= 1900 ? null : date.getUTCFullYear() - row.birthDate.getUTCFullYear(),
          offset,
        };
      })
      .sort((a, b) => a.offset - b.offset || a.name.localeCompare(b.name))
      .map(({ offset: _offset, ...rest }) => rest);

    insights.community.events = {
      next30: eventGroups.reduce((acc, g) => acc + g._count._all, 0),
      byType: eventGroups.map((g) => ({ type: g.type, count: g._count._all })).sort((a, b) => b.count - a.count),
    };

    if (canSeeCommunityWide) {
      const funnel = { requested: 0, documents: 0, course: 0, scheduled: 0, celebrated90d };
      for (const g of sacramentGroups) {
        if (g.status === 'REQUESTED') funnel.requested = g._count._all;
        else if (g.status === 'DOCUMENTS') funnel.documents = g._count._all;
        else if (g.status === 'COURSE') funnel.course = g._count._all;
        else if (g.status === 'SCHEDULED') funnel.scheduled = g._count._all;
      }
      insights.community.sacraments = funnel;
      insights.community.prayers = { approved30d: approvedPrayers30d };
    }

    const oldest = joinRequestAgg._min.createdAt;
    insights.community.joinRequests = {
      pending: joinRequestAgg._count._all,
      oldestDays: oldest ? Math.max(0, Math.floor((tomorrow.getTime() - oldest.getTime()) / DAY_MS)) : null,
    };

    return insights;
  }
}
