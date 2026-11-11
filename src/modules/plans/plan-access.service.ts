import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommunityPlanStatus, MemberStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService } from '../../common/hierarchy.service';
import { EnforcementMode, PaidFeature, hasPaidAccess, parseEnforcement } from './plan-rules';
import type { PlanFeatureMeta, PlanResourceKind, PlanResourceSpec } from './plan.decorators';
// Regra pura (sem dependência de módulo): critério único do piloto
import { pilotParishWhere, trialHeirCommunityWhere } from '../jobs/plan-lifecycle-rules';

export interface PlanSnapshot {
  status: CommunityPlanStatus;
  tierKey: string | null;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  graceDays: number;
  /** Limite de membros da faixa (null = sem limite) */
  maxMembers: number | null;
}

/** Alvo da checagem: uma comunidade, ou "alguma comunidade" de uma paróquia/diocese. */
export type PlanTarget =
  | { communityId: string }
  | { parishId: string }
  | { dioceseId: string };

export interface PlanDecision {
  allowed: boolean;
  /** Comunidade avaliada (nula quando o alvo é paróquia/diocese ou o usuário não tem comunidade) */
  communityId: string | null;
  /** Descrição curta do alvo para log */
  target: string;
  /**
   * Id explícito do cliente (communityId/parishId) FORA do escopo do usuário:
   * negado sem olhar o plano — senão bastava pôr o id de uma comunidade paga
   * na URL para usar o recurso de graça (o service ignora o parâmetro).
   */
  outOfScope?: boolean;
}

export interface MemberLimitStatus {
  communityId: string;
  maxMembers: number;
  activeMembers: number;
  /** Já atingiu o limite: o próximo membro passaria da faixa */
  reached: boolean;
}

export interface PlanUser {
  id: string;
  role: UserRole | `${UserRole}`;
  communityId?: string | null;
  parishId?: string | null;
  dioceseId?: string | null;
  communities?: Array<{ communityId: string; isActive?: boolean; role?: UserRole | `${UserRole}` }>;
  /** Cadastro de membro (JwtStrategy); ausente → busca por userId */
  member?: { id: string } | null;
}

interface CacheEntry<T> {
  value: T;
  exp: number;
}

const PAID_STATUSES: CommunityPlanStatus[] = [
  CommunityPlanStatus.TRIAL,
  CommunityPlanStatus.ACTIVE,
  CommunityPlanStatus.PAST_DUE,
];

const MAX_CACHE_ENTRIES = 20_000;

/** Teto de ids avaliados numa lista (ex.: scheduleIds) — acima disso, nega. */
const MAX_LIST_IDS = 500;

/**
 * Papéis abaixo de PARISH_ADMIN: o escopo de um `communityId` explícito também
 * vale pelas comunidades do cadastro de membro e dos recursos dele. Coordenador
 * (de comunidade ou de pastoral) também é fiel: participa/serve em outra
 * comunidade e o service (ex.: events.service) trata esse caso.
 */
const MEMBER_SCOPE_ROLES = new Set<string>([
  UserRole.FAITHFUL,
  UserRole.VOLUNTEER,
  UserRole.PASTORAL_COORDINATOR,
  UserRole.COMMUNITY_COORDINATOR,
]);

/** Descobre a comunidade (ou a paróquia) dona de um recurso pelo id. */
type Resolver = (prisma: PrismaService, id: string) => Promise<PlanTarget | null>;

const byCommunity = (row: { communityId?: string | null } | null | undefined): PlanTarget | null =>
  row?.communityId ? { communityId: row.communityId } : null;

const byParish = (row: { parishId?: string | null } | null | undefined): PlanTarget | null =>
  row?.parishId ? { parishId: row.parishId } : null;

const RESOLVERS: Record<PlanResourceKind, Resolver> = {
  community: async (_p, id) => ({ communityId: id }),
  event: async (p, id) => byCommunity(await p.event.findUnique({ where: { id }, select: { communityId: true } })),
  member: async (p, id) => byCommunity(await p.member.findUnique({ where: { id }, select: { communityId: true } })),
  schedule: async (p, id) => {
    const s = await p.schedule.findUnique({
      where: { id },
      select: { communityId: true, event: { select: { communityId: true } } },
    });
    return byCommunity({ communityId: s?.communityId ?? s?.event?.communityId });
  },
  assignment: async (p, id) => {
    const a = await p.scheduleAssignment.findUnique({
      where: { id },
      select: { schedule: { select: { communityId: true, event: { select: { communityId: true } } } } },
    });
    return byCommunity({ communityId: a?.schedule?.communityId ?? a?.schedule?.event?.communityId });
  },
  swap: async (p, id) => {
    const s = await p.assignmentSwapRequest.findUnique({
      where: { id },
      select: {
        assignment: {
          select: { schedule: { select: { communityId: true, event: { select: { communityId: true } } } } },
        },
      },
    });
    const sch = s?.assignment?.schedule;
    return byCommunity({ communityId: sch?.communityId ?? sch?.event?.communityId });
  },
  communityPastoral: async (p, id) =>
    byCommunity(await p.communityPastoral.findUnique({ where: { id }, select: { communityId: true } })),
  pastoralGroup: async (p, id) => {
    const g = await p.pastoralGroup.findUnique({
      where: { id },
      select: { communityPastoral: { select: { communityId: true } } },
    });
    return byCommunity(g?.communityPastoral);
  },
  pastoralMember: async (p, id) => {
    const m = await p.pastoralMember.findUnique({
      where: { id },
      select: {
        communityPastoral: { select: { communityId: true } },
        pastoralGroup: { select: { communityPastoral: { select: { communityId: true } } } },
      },
    });
    return byCommunity(m?.communityPastoral ?? m?.pastoralGroup?.communityPastoral);
  },
  joinRequest: async (p, id) => {
    const r = await p.pastoralJoinRequest.findUnique({
      where: { id },
      select: { communityPastoral: { select: { communityId: true } } },
    });
    return byCommunity(r?.communityPastoral);
  },
  catechesisStage: async (p, id) => {
    const s = await p.catechesisStage.findUnique({ where: { id }, select: { parishId: true } });
    return s?.parishId ? { parishId: s.parishId } : null;
  },
  catechesisClass: async (p, id) =>
    byCommunity(await p.catechesisClass.findUnique({ where: { id }, select: { communityId: true } })),
  catechesisEnrollment: async (p, id) => {
    const e = await p.catechesisEnrollment.findUnique({ where: { id }, select: { class: { select: { communityId: true } } } });
    return byCommunity(e?.class);
  },
  catechesisSession: async (p, id) => {
    const s = await p.catechesisSession.findUnique({ where: { id }, select: { class: { select: { communityId: true } } } });
    return byCommunity(s?.class);
  },
  catechesisDocument: async (p, id) => {
    const d = await p.catechesisDocument.findUnique({
      where: { id },
      select: { enrollment: { select: { class: { select: { communityId: true } } } } },
    });
    return byCommunity(d?.enrollment?.class);
  },
  catechesisFee: async (p, id) => {
    const f = await p.catechesisFee.findUnique({ where: { id }, select: { class: { select: { communityId: true } } } });
    return byCommunity(f?.class);
  },
  catechesisFeePayment: async (p, id) => {
    const f = await p.catechesisFeePayment.findUnique({
      where: { id },
      select: { fee: { select: { class: { select: { communityId: true } } } } },
    });
    return byCommunity(f?.fee?.class);
  },
  catechesisPreset: async (p, id) =>
    byCommunity(await p.catechesisEnrollmentPreset.findUnique({ where: { id }, select: { communityId: true } })),
  formationTrack: async (p, id) => {
    const t = await p.formationTrack.findUnique({ where: { id }, select: { parishId: true } });
    return t?.parishId ? { parishId: t.parishId } : null;
  },
  formationCourse: async (p, id) => {
    const c = await p.formationCourse.findUnique({ where: { id }, select: { parishId: true } });
    return c?.parishId ? { parishId: c.parishId } : null;
  },
  formationEnrollment: async (p, id) => {
    const e = await p.formationEnrollment.findUnique({ where: { id }, select: { course: { select: { parishId: true } } } });
    return e?.course?.parishId ? { parishId: e.course.parishId } : null;
  },
  room: async (p, id) => byCommunity(await p.room.findUnique({ where: { id }, select: { communityId: true } })),
  roomReservation: async (p, id) => {
    const r = await p.roomReservation.findUnique({ where: { id }, select: { room: { select: { communityId: true } } } });
    return byCommunity(r?.room);
  },
  visitRequest: async (p, id) =>
    byCommunity(await p.visitRequest.findUnique({ where: { id }, select: { communityId: true } })),
  pastoralDocument: async (p, id) => {
    const d = await p.pastoralDocument.findUnique({ where: { id }, select: { communityId: true, parishId: true } });
    if (!d) return null;
    return d.communityId ? { communityId: d.communityId } : { parishId: d.parishId };
  },
  eventAssignment: async (p, id) => {
    const a = await p.eventPastoralAssignment.findUnique({
      where: { id },
      select: { eventPastoral: { select: { event: { select: { communityId: true } } } } },
    });
    return byCommunity(a?.eventPastoral?.event);
  },

  // --- Lançamento (11/11/2026) ---
  news: async (p, id) => byCommunity(await p.news.findUnique({ where: { id }, select: { communityId: true } })),
  prayerRequest: async (p, id) =>
    byCommunity(await p.prayerRequest.findUnique({ where: { id }, select: { communityId: true } })),
  // Mensagem do clero: vale o alvo mais específico (comunidade → pastoral →
  // destinatário → paróquia → diocese)
  clergyMessage: async (p, id) => {
    const m = await p.clergyMessage.findUnique({
      where: { id },
      select: {
        communityId: true,
        parishId: true,
        dioceseId: true,
        communityPastoral: { select: { communityId: true } },
        member: { select: { communityId: true } },
      },
    });
    if (!m) return null;
    const communityId = m.communityId ?? m.communityPastoral?.communityId ?? m.member?.communityId;
    if (communityId) return { communityId };
    if (m.parishId) return { parishId: m.parishId };
    return m.dioceseId ? { dioceseId: m.dioceseId } : null;
  },
  // Planejamento pastoral é da PARÓQUIA (feature `planning`, nível paróquia):
  // mesmo o plano de uma comunidade responde pela paróquia dele
  pastoralPlan: async (p, id) => byParish(await p.pastoralPlan.findUnique({ where: { id }, select: { parishId: true } })),
  planObjective: async (p, id) => {
    const o = await p.pastoralObjective.findUnique({ where: { id }, select: { plan: { select: { parishId: true } } } });
    return byParish(o?.plan);
  },
  planGoal: async (p, id) => {
    const g = await p.pastoralGoal.findUnique({
      where: { id },
      select: { objective: { select: { plan: { select: { parishId: true } } } } },
    });
    return byParish(g?.objective?.plan);
  },
  planAction: async (p, id) => {
    const a = await p.pastoralAction.findUnique({
      where: { id },
      select: { objective: { select: { plan: { select: { parishId: true } } } } },
    });
    return byParish(a?.objective?.plan);
  },
  sacramentProcess: async (p, id) =>
    byCommunity(await p.sacramentProcess.findUnique({ where: { id }, select: { communityId: true } })),
  sacrament: async (p, id) => {
    const s = await p.sacrament.findUnique({ where: { id }, select: { member: { select: { communityId: true } } } });
    return byCommunity(s?.member);
  },
  financialStatement: async (p, id) => {
    const f = await p.financialStatement.findUnique({ where: { id }, select: { communityId: true, parishId: true } });
    if (!f) return null;
    return f.communityId ? { communityId: f.communityId } : { parishId: f.parishId };
  },
  // Dízimo é da PARÓQUIA (feature `tithe`, nível paróquia): a conta de
  // recebimento e a configuração são paroquiais, então responde a paróquia
  titheIntent: async (p, id) => byParish(await p.titheIntent.findUnique({ where: { id }, select: { parishId: true } })),
  titheCampaign: async (p, id) =>
    byParish(await p.titheCampaign.findUnique({ where: { id }, select: { parishId: true } })),
  titheCampaignEntry: async (p, id) => {
    const t = await p.financialTransaction.findUnique({
      where: { id },
      select: { parishId: true, communityId: true, campaign: { select: { parishId: true } } },
    });
    if (!t) return null;
    const parishId = t.campaign?.parishId ?? t.parishId;
    if (parishId) return { parishId };
    // Lançamento antigo só com a comunidade
    return byCommunity(t);
  },
  titheGuestGift: async (p, id) =>
    byParish(await p.titheGuestGift.findUnique({ where: { id }, select: { parishId: true } })),
};

/**
 * Comunidades dos RECURSOS pagos do membro, por recurso (A21): é onde o
 * usuário de fato usa a função — turma do filho ou em que é catequista,
 * escala em que foi escalado, pastoral de que participa.
 */
function resourceCommunityWhere(feature: PaidFeature, memberId: string): Prisma.CommunityWhereInput[] {
  const scheduled: Prisma.ScheduleWhereInput = { deletedAt: null, assignments: { some: { memberId } } };
  switch (feature) {
    case 'catechesis':
      return [
        {
          catechesisClasses: {
            some: {
              deletedAt: null,
              OR: [
                { catechists: { some: { memberId } } },
                { enrollments: { some: { member: { deletedAt: null, OR: [{ id: memberId }, { responsibleId: memberId }] } } } },
              ],
            },
          },
        },
      ];
    case 'schedules':
    case 'swaps':
      return [
        { schedules: { some: scheduled } },
        // Escala de evento sem comunidade própria: vale a do evento
        { events: { some: { schedules: { some: { ...scheduled, communityId: null } } } } },
      ];
    case 'pastorals':
      return [
        {
          communityPastorals: {
            some: {
              deletedAt: null,
              OR: [
                { members: { some: { memberId, isActive: true } } },
                { subGroups: { some: { members: { some: { memberId, isActive: true } } } } },
                { joinRequests: { some: { memberId } } },
              ],
            },
          },
        },
      ];
    default:
      // Features sem rota "minhas" (eventos, notícias, dízimo, finanças…):
      // nenhuma comunidade de recurso → decidePersonal cai na regra do usuário
      return [];
  }
}

/**
 * Acesso aos recursos pagos, com cache curto (60 s) em memória por
 * comunidade / paróquia / diocese / recurso. Mudanças feitas pelo painel
 * (PlatformPlansService) chamam `invalidate()`; em outra réplica o cache
 * expira sozinho em até 60 s.
 */
@Injectable()
export class PlanAccessService {
  static readonly TTL_MS = 60_000;

  private readonly planCache = new Map<string, CacheEntry<PlanSnapshot | null>>();
  private readonly scopeCache = new Map<string, CacheEntry<boolean>>();
  private readonly resourceCache = new Map<string, CacheEntry<PlanTarget | null>>();
  /** Comunidades dos recursos do usuário (por feature) e checagens de escopo */
  private readonly userCache = new Map<string, CacheEntry<string[]>>();
  private readonly scopeCheckCache = new Map<string, CacheEntry<boolean>>();
  /** Comunidade/paróquia é do piloto? */
  private readonly pilotCache = new Map<string, CacheEntry<boolean>>();
  /** Comunidade sem linha de plano herda o teste pedido vigente da paróquia? */
  private readonly heirCache = new Map<string, CacheEntry<boolean>>();
  private readonly hierarchy: HierarchyService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Optional() hierarchy?: HierarchyService,
  ) {
    // Testes antigos instanciam só com (prisma, config)
    this.hierarchy = hierarchy ?? new HierarchyService(prisma);
  }

  /** Lido a cada requisição (mudar a env + reiniciar basta; testes trocam à vontade). */
  enforcement(): EnforcementMode {
    return parseEnforcement(this.config.get<string>('PLAN_ENFORCEMENT') ?? process.env.PLAN_ENFORCEMENT);
  }

  invalidate(communityId?: string) {
    if (communityId) this.planCache.delete(communityId);
    else this.planCache.clear();
    // O piloto é definido por plano/evento de comunidade: recalcula
    this.pilotCache.clear();
    // Teste herdado depende do plano das outras comunidades da paróquia
    this.heirCache.clear();
    // Paróquia/diocese dependem de todas as comunidades delas: limpa tudo (barato)
    this.scopeCache.clear();
  }

  private cached<T>(map: Map<string, CacheEntry<T>>, key: string): CacheEntry<T> | undefined {
    const hit = map.get(key);
    if (hit && hit.exp > Date.now()) return hit;
    if (hit) map.delete(key);
    return undefined;
  }

  private store<T>(map: Map<string, CacheEntry<T>>, key: string, value: T) {
    if (map.size >= MAX_CACHE_ENTRIES) map.clear();
    map.set(key, { value, exp: Date.now() + PlanAccessService.TTL_MS });
  }

  async getPlan(communityId: string): Promise<PlanSnapshot | null> {
    const hit = this.cached(this.planCache, communityId);
    if (hit) return hit.value;

    const row = await this.prisma.communityPlan.findUnique({
      where: { communityId },
      select: {
        status: true,
        trialEndsAt: true,
        currentPeriodEnd: true,
        graceDays: true,
        tier: { select: { key: true, maxMembers: true } },
      },
    });
    const value: PlanSnapshot | null = row
      ? {
          status: row.status,
          tierKey: row.tier?.key ?? null,
          trialEndsAt: row.trialEndsAt,
          currentPeriodEnd: row.currentPeriodEnd,
          graceDays: row.graceDays,
          maxMembers: row.tier?.maxMembers ?? null,
        }
      : null;
    this.store(this.planCache, communityId, value);
    return value;
  }

  /**
   * A comunidade tem acesso aos recursos pagos? Pelo plano dela
   * (`hasPaidAccess`) OU por ser de paróquia do PILOTO (`pilotParishWhere`):
   * o piloto mantém acesso total sempre, inclusive numa comunidade NOVA criada
   * depois (que nasce sem linha em CommunityPlan). A consulta do piloto só
   * acontece quando o plano não libera, e fica em cache (60 s).
   *
   * Comunidade SEM linha de plano de paróquia com teste PEDIDO vigente
   * (criada depois do POST /billing/trial): tem acesso até o fim desse teste,
   * sem esperar o job diário gravar o TRIAL_INHERITED.
   */
  async communityHasAccess(communityId: string, now: Date = new Date()): Promise<boolean> {
    const plan = await this.getPlan(communityId);
    if (hasPaidAccess(plan, now)) return true;
    if (await this.isPilotCommunity(communityId)) return true;
    if (plan) return false;
    return this.inheritsParishTrial(communityId, now);
  }

  /**
   * Comunidade ATIVA sem linha de plano cuja paróquia tem teste pedido vigente
   * (`trialHeirCommunityWhere`) — cache 60 s. O fim do teste já está na
   * condição (`trialEndsAt > agora`), então basta existir.
   */
  private async inheritsParishTrial(communityId: string, now: Date): Promise<boolean> {
    const hit = this.cached(this.heirCache, communityId);
    if (hit) return hit.value;
    const value =
      (await this.prisma.community.count({ where: { AND: [{ id: communityId }, trialHeirCommunityWhere(now)] } })) > 0;
    this.store(this.heirCache, communityId, value);
    return value;
  }

  /** Comunidade de paróquia do piloto (acesso total) — cache 60 s. */
  async isPilotCommunity(communityId: string): Promise<boolean> {
    const key = `community:${communityId}`;
    const hit = this.cached(this.pilotCache, key);
    if (hit) return hit.value;
    const value = (await this.prisma.community.count({ where: { id: communityId, parish: pilotParishWhere() } })) > 0;
    this.store(this.pilotCache, key, value);
    return value;
  }

  /** Paróquia do piloto (acesso total) — cache 60 s. */
  async isPilotParish(parishId: string): Promise<boolean> {
    const key = `parish:${parishId}`;
    const hit = this.cached(this.pilotCache, key);
    if (hit) return hit.value;
    const value = (await this.prisma.parish.count({ where: { AND: [{ id: parishId }, pilotParishWhere()] } })) > 0;
    this.store(this.pilotCache, key, value);
    return value;
  }

  /** Alguma comunidade (não arquivada) da paróquia/diocese tem acesso? */
  private async scopeHasAccess(kind: 'parish' | 'diocese', id: string, now: Date): Promise<boolean> {
    const key = `${kind}:${id}`;
    const hit = this.cached(this.scopeCache, key);
    if (hit) return hit.value;

    const value = (await this.paidCommunityIdsIn(kind, id, now)).length > 0;
    this.store(this.scopeCache, key, value);
    return value;
  }

  /**
   * Comunidades (não arquivadas) da paróquia/diocese com acesso pago agora —
   * pelo plano, mais TODAS as comunidades de paróquia do piloto e as
   * comunidades ativas sem linha de plano de paróquia com teste pedido vigente
   * (teste herdado — mesma regra de `communityHasAccess`).
   */
  private async paidCommunityIdsIn(kind: 'parish' | 'diocese', id: string, now: Date): Promise<string[]> {
    const community = kind === 'parish' ? { parishId: id, deletedAt: null } : { parish: { dioceseId: id }, deletedAt: null };
    const scope: Prisma.CommunityWhereInput = kind === 'parish' ? { parishId: id } : { parish: { dioceseId: id } };
    const [rows, extra] = await Promise.all([
      this.prisma.communityPlan.findMany({
        where: { status: { in: PAID_STATUSES }, community },
        select: { communityId: true, status: true, trialEndsAt: true, currentPeriodEnd: true, graceDays: true },
      }),
      this.prisma.community.findMany({
        where: { AND: [scope, { deletedAt: null }, { OR: [{ parish: pilotParishWhere() }, trialHeirCommunityWhere(now)] }] },
        select: { id: true },
      }),
    ]);
    const ids = new Set(rows.filter((row) => hasPaidAccess(row, now)).map((row) => row.communityId));
    for (const row of extra ?? []) ids.add(row.id);
    return [...ids];
  }

  async targetHasAccess(target: PlanTarget, now: Date = new Date()): Promise<boolean> {
    if ('communityId' in target) return this.communityHasAccess(target.communityId, now);
    if ('parishId' in target) return this.scopeHasAccess('parish', target.parishId, now);
    return this.scopeHasAccess('diocese', target.dioceseId, now);
  }

  async resolveResource(kind: PlanResourceKind, id: string): Promise<PlanTarget | null> {
    const key = `${kind}:${id}`;
    const hit = this.cached(this.resourceCache, key);
    if (hit) return hit.value;
    const resolver = RESOLVERS[kind];
    if (!resolver) throw new Error(`Tipo de recurso sem resolvedor: ${kind}`);
    const value = await resolver(this.prisma, id);
    this.store(this.resourceCache, key, value);
    return value;
  }

  /**
   * Decide o acesso de uma requisição ao recurso pago. Ordem:
   *  1. recurso da rota (@PlanResource) → comunidade/paróquia dele
   *     (recurso inexistente → libera: o service responde 404). Lista de ids
   *     (ex.: scheduleIds): TODOS precisam de acesso. Em feature de nível
   *     paróquia, alvo de comunidade (aqui e no passo 2) é avaliado pela
   *     PARÓQUIA dela (`levelTarget`);
   *  2. communityId explícito (params | query | body), depois parishId — só
   *     valem DENTRO do escopo do usuário; fora dele → negado (`outOfScope`);
   *  3. rota "minhas" (`personal`): comunidades dos recursos do usuário;
   *  4. pelo usuário: DIOCESAN/PARISH_ADMIN (ou recurso de nível paróquia) →
   *     alguma comunidade do escopo; demais → comunidade do usuário (ou algum
   *     vínculo ativo dele).
   * SYSTEM_ADMIN sempre passa.
   */
  async decide(
    meta: PlanFeatureMeta,
    user: PlanUser,
    req: { params?: any; query?: any; body?: any },
    resources: PlanResourceSpec[] = [],
    options: { now?: Date; personal?: boolean } = {},
  ): Promise<PlanDecision> {
    if (user.role === UserRole.SYSTEM_ADMIN) {
      return { allowed: true, communityId: null, target: 'system-admin' };
    }
    const now = options.now ?? new Date();

    for (const spec of resources) {
      const raws = pickAll(req, spec.from, spec.key);
      if (!raws.length) continue;
      if (raws.length > MAX_LIST_IDS) {
        return { allowed: false, communityId: null, target: `${spec.kind}: ${raws.length} ids (acima de ${MAX_LIST_IDS})` };
      }
      let last: PlanDecision | null = null;
      for (const raw of raws) {
        const target = await this.resolveResource(spec.kind, raw);
        if (!target) continue; // inexistente: o service responde 404
        // 'community' é id cru do cliente (não um registro): exige escopo
        if (spec.kind === 'community' && !(await this.inPlanScope(user, target, meta.feature))) {
          return outOfScope(target);
        }
        const decision = await this.evaluate(await this.levelTarget(meta, target), now);
        if (!decision.allowed) return decision;
        last = decision;
      }
      return last ?? { allowed: true, communityId: null, target: `${spec.kind}:${raws[0]} (não encontrado)` };
    }

    for (const key of ['communityId', 'parishId'] as const) {
      for (const from of ['params', 'query', 'body'] as const) {
        const ids = pickAll(req, from, key);
        if (!ids.length) continue;
        if (ids.length > MAX_LIST_IDS) {
          return { allowed: false, communityId: null, target: `${key}: ${ids.length} ids (acima de ${MAX_LIST_IDS})` };
        }
        let last: PlanDecision | null = null;
        for (const id of ids) {
          const target: PlanTarget = key === 'communityId' ? { communityId: id } : { parishId: id };
          if (!(await this.inPlanScope(user, target, meta.feature))) return outOfScope(target);
          const decision = await this.evaluate(await this.levelTarget(meta, target), now);
          if (!decision.allowed) return decision;
          last = decision;
        }
        return last!;
      }
    }

    if (options.personal) return this.decidePersonal(meta, user, now);
    return this.decideForUser(meta, user, now);
  }

  /**
   * Recurso de nível PARÓQUIA (dízimo, planejamento, formação) com alvo de
   * COMUNIDADE (membro, evento, `communityId` no body/query): quem responde é
   * a paróquia dessa comunidade — passa se ALGUMA comunidade dela tiver
   * acesso. Sem isso o membro da capela sem plano seria barrado no extrato do
   * dízimo enquanto o resto do dízimo (paroquial) passa. O escopo do id
   * explícito continua conferido na comunidade, antes desta troca.
   */
  private async levelTarget(meta: Pick<PlanFeatureMeta, 'level'>, target: PlanTarget): Promise<PlanTarget> {
    if (meta.level !== 'parish' || !('communityId' in target)) return target;
    const parishId = await this.parishOfCommunity(target.communityId);
    // Comunidade inexistente: segue pela comunidade (sem plano → sem acesso)
    return parishId ? { parishId } : target;
  }

  /** Paróquia da comunidade — cache 60 s. */
  private async parishOfCommunity(communityId: string): Promise<string | null> {
    const key = `parishOf:${communityId}`;
    const hit = this.cached(this.resourceCache, key);
    if (hit) return hit.value && 'parishId' in hit.value ? hit.value.parishId : null;
    const row = await this.prisma.community.findUnique({ where: { id: communityId }, select: { parishId: true } });
    const value: PlanTarget | null = row?.parishId ? { parishId: row.parishId } : null;
    this.store(this.resourceCache, key, value);
    return value ? row!.parishId : null;
  }

  /**
   * Rota "minhas" (A21): vale a comunidade dos RECURSOS do usuário — passa se
   * alguma delas tiver acesso. Sem recurso nenhum (lista vazia de qualquer
   * jeito), cai na regra do usuário. Os itens das comunidades SEM acesso que
   * vierem junto devem ser filtrados no service com `filterByPlan`.
   */
  async decidePersonal(meta: PlanFeatureMeta, user: PlanUser, now: Date = new Date()): Promise<PlanDecision> {
    if (user.role === UserRole.SYSTEM_ADMIN) {
      return { allowed: true, communityId: null, target: 'system-admin' };
    }
    const ids = await this.resourceCommunityIds(user, meta.feature);
    if (!ids.length) return this.decideForUser(meta, user, now);
    for (const communityId of ids) {
      if (await this.communityHasAccess(communityId, now)) {
        return { allowed: true, communityId, target: `community:${communityId} (recurso do usuário)` };
      }
    }
    return { allowed: false, communityId: ids[0], target: `community:${ids[0]} (recursos do usuário)` };
  }

  /** Sem alvo explícito: pelo escopo/comunidade do próprio usuário. */
  async decideForUser(meta: Pick<PlanFeatureMeta, 'level'>, user: PlanUser, now: Date = new Date()): Promise<PlanDecision> {
    if (user.role === UserRole.SYSTEM_ADMIN) {
      return { allowed: true, communityId: null, target: 'system-admin' };
    }
    if (user.role === UserRole.DIOCESAN_ADMIN && user.dioceseId) {
      return this.evaluate({ dioceseId: user.dioceseId }, now);
    }
    if ((user.role === UserRole.PARISH_ADMIN || meta.level === 'parish') && user.parishId) {
      return this.evaluate({ parishId: user.parishId }, now);
    }

    const ids = this.userCommunityIds(user);
    if (ids.length === 0) {
      return { allowed: false, communityId: null, target: 'usuário sem comunidade' };
    }
    for (const communityId of ids) {
      if (await this.communityHasAccess(communityId, now)) {
        return { allowed: true, communityId, target: `community:${communityId}` };
      }
    }
    return { allowed: false, communityId: ids[0], target: `community:${ids[0]}` };
  }

  /** Comunidade principal + vínculos que contam para o plano (sem consulta). */
  private userCommunityIds(user: PlanUser): string[] {
    // Coordenação: só vínculos de gestão (mesmo papel) — vínculo de fé numa
    // comunidade com plano não libera recurso pago para a comunidade que ele gere
    const coordinating = user.role === UserRole.COMMUNITY_COORDINATOR || user.role === UserRole.PASTORAL_COORDINATOR;
    const links = (user.communities ?? []).filter(
      (link) =>
        link.isActive !== false &&
        (!coordinating || (user.role === UserRole.COMMUNITY_COORDINATOR && link.role === user.role)),
    );
    return [user.communityId, ...links.map((link) => link.communityId)].filter(
      (id, i, all): id is string => !!id && all.indexOf(id) === i,
    );
  }

  private async memberIdOf(user: PlanUser): Promise<string | null> {
    if (user.member?.id) return user.member.id;
    const member = await this.prisma.member.findFirst({
      where: { userId: user.id, deletedAt: null },
      select: { id: true },
    });
    return member?.id ?? null;
  }

  /** Comunidades (não arquivadas) dos recursos do usuário nesta feature — cache 60 s. */
  async resourceCommunityIds(user: PlanUser, feature: PaidFeature): Promise<string[]> {
    const key = `res:${user.id}:${feature}`;
    const hit = this.cached(this.userCache, key);
    if (hit) return hit.value;
    const memberId = await this.memberIdOf(user);
    const or = memberId ? resourceCommunityWhere(feature, memberId) : [];
    const ids = or.length
      ? (
          await this.prisma.community.findMany({
            where: { deletedAt: null, OR: or },
            select: { id: true },
            take: 200,
          })
        ).map((row) => row.id)
      : [];
    this.store(this.userCache, key, ids);
    return ids;
  }

  /** Comunidades em que o cadastro de membro do usuário tem vínculo ativo — cache 60 s. */
  private async memberLinkCommunityIds(user: PlanUser): Promise<string[]> {
    const key = `links:${user.id}`;
    const hit = this.cached(this.userCache, key);
    if (hit) return hit.value;
    const memberId = await this.memberIdOf(user);
    const ids = memberId
      ? (
          await this.prisma.memberCommunity.findMany({
            where: { memberId, isActive: true },
            select: { communityId: true },
            take: 200,
          })
        ).map((row) => row.communityId)
      : [];
    this.store(this.userCache, key, ids);
    return ids;
  }

  /**
   * Comunidades (não arquivadas) em que uma pastoral do membro SERVE em algum
   * evento (ex.: música da Matriz na festa da capela) — cache 60 s. Só para o
   * escopo do `communityId` explícito da agenda (feature `events`).
   */
  private async servedCommunityIds(user: PlanUser): Promise<string[]> {
    const key = `served:${user.id}`;
    const hit = this.cached(this.userCache, key);
    if (hit) return hit.value;
    const memberId = await this.memberIdOf(user);
    const ids = memberId
      ? (
          await this.prisma.community.findMany({
            where: {
              deletedAt: null,
              events: {
                some: {
                  deletedAt: null,
                  eventPastorals: {
                    some: { communityPastoral: { deletedAt: null, members: { some: { memberId, isActive: true } } } },
                  },
                },
              },
            },
            select: { id: true },
            take: 200,
          })
        ).map((row) => row.id)
      : [];
    this.store(this.userCache, key, ids);
    return ids;
  }

  /**
   * O id explícito pode ser usado pelo guard? (M43)
   * - comunidade: escopo da hierarquia (isCommunityInScope); todo papel abaixo
   *   de PARISH_ADMIN (fiel, voluntário e também os coordenadores) vale ainda
   *   nas comunidades do cadastro de membro e dos recursos dele (família da
   *   capela que vê as turmas abertas da Matriz; coordenador com vínculo de
   *   membro em outra comunidade) e, na agenda (`events`), nas comunidades em
   *   que uma pastoral dele serve. Aqui só se decide se o id pode ser AVALIADO
   *   — o que o usuário enxerga lá continua sendo regra do service, e o plano
   *   avaliado é o da comunidade pedida;
   * - paróquia: a do usuário (diocese: as paróquias dela).
   */
  async inPlanScope(user: PlanUser, target: PlanTarget, feature: PaidFeature): Promise<boolean> {
    if (user.role === UserRole.SYSTEM_ADMIN) return true;
    const id = 'communityId' in target ? target.communityId : 'parishId' in target ? target.parishId : target.dioceseId;
    const key = [user.id, user.role, user.parishId, user.dioceseId, user.communityId, feature, JSON.stringify(target)].join('|');
    const hit = this.cached(this.scopeCheckCache, key);
    if (hit) return hit.value;

    let value = false;
    if ('communityId' in target) {
      value = await this.hierarchy.isCommunityInScope(user as any, id);
      if (!value && MEMBER_SCOPE_ROLES.has(user.role)) {
        value =
          (await this.memberLinkCommunityIds(user)).includes(id) ||
          (await this.resourceCommunityIds(user, feature)).includes(id) ||
          (feature === 'events' && (await this.servedCommunityIds(user)).includes(id));
      }
    } else if ('parishId' in target) {
      if (user.role === UserRole.DIOCESAN_ADMIN) {
        if (user.dioceseId) {
          const parish = await this.prisma.parish.findUnique({ where: { id }, select: { dioceseId: true } });
          value = parish?.dioceseId === user.dioceseId;
        }
      } else {
        value = !!user.parishId && user.parishId === id;
      }
    } else {
      value = user.role === UserRole.DIOCESAN_ADMIN && user.dioceseId === id;
    }
    this.store(this.scopeCheckCache, key, value);
    return value;
  }

  // ------------------------------------------------------------------
  // Listas (M35 / A21): filtrar ou marcar itens por comunidade
  // ------------------------------------------------------------------

  /**
   * Das comunidades dadas, quais liberam o recurso pago AGORA. `null` = sem
   * restrição (modo off/log, ou SYSTEM_ADMIN) — o chamador não filtra nada.
   */
  async restrictToPaid(
    user: Pick<PlanUser, 'role'>,
    communityIds: Array<string | null | undefined>,
    now: Date = new Date(),
  ): Promise<Set<string> | null> {
    if (this.enforcement() !== 'on' || user?.role === UserRole.SYSTEM_ADMIN) return null;
    const unique = [...new Set(communityIds.filter((id): id is string => !!id))];
    const allowed = new Set<string>();
    for (const id of unique) {
      if (await this.communityHasAccess(id, now)) allowed.add(id);
    }
    return allowed;
  }

  /**
   * Tira da lista os itens de comunidades SEM acesso (só no modo `on`). Item
   * sem comunidade conhecida fica (o guard já decidiu a rota). Para os
   * services de lista e das rotas "minhas" — ex.:
   * `filterByPlan(user, turmas, (t) => t.communityId)`.
   */
  async filterByPlan<T>(
    user: Pick<PlanUser, 'role'>,
    items: T[],
    communityOf: (item: T) => string | null | undefined,
  ): Promise<T[]> {
    const allowed = await this.restrictToPaid(user, items.map(communityOf));
    if (!allowed) return items;
    return items.filter((item) => {
      const id = communityOf(item);
      return !id || allowed.has(id);
    });
  }

  /** Igual ao filterByPlan, mas mantém o item com `planLocked: true` (lista que mostra o cadeado). */
  async markByPlan<T extends object>(
    user: Pick<PlanUser, 'role'>,
    items: T[],
    communityOf: (item: T) => string | null | undefined,
  ): Promise<Array<T & { planLocked: boolean }>> {
    const allowed = await this.restrictToPaid(user, items.map(communityOf));
    return items.map((item) => {
      const id = communityOf(item);
      return { ...item, planLocked: !!allowed && !!id && !allowed.has(id) };
    });
  }

  /**
   * Comunidades do escopo do usuário com acesso pago (para o /me/entitlements:
   * o painel do PARISH_ADMIN/DIOCESAN marca o que é de capela sem plano).
   */
  async paidCommunityIdsInScope(user: PlanUser, now: Date = new Date()): Promise<string[]> {
    if (user.role === UserRole.DIOCESAN_ADMIN && user.dioceseId) return this.paidCommunityIdsIn('diocese', user.dioceseId, now);
    if (user.role === UserRole.PARISH_ADMIN && user.parishId) return this.paidCommunityIdsIn('parish', user.parishId, now);
    const paid: string[] = [];
    for (const id of this.userCommunityIds(user)) {
      if (await this.communityHasAccess(id, now)) paid.push(id);
    }
    return paid;
  }

  /**
   * Testes que acabam nos próximos `days` dias no escopo do usuário (banner
   * "teste até dd/mm" do painel): paróquia/diocese para os admins; comunidade
   * principal + vínculos para os demais.
   */
  async trialsEndingSoon(
    user: PlanUser,
    days = 15,
    now: Date = new Date(),
  ): Promise<Array<{ communityId: string; communityName: string; trialEndsAt: Date }>> {
    if (user.role === UserRole.SYSTEM_ADMIN) return [];
    let community: Prisma.CommunityWhereInput | null = null;
    if (user.role === UserRole.DIOCESAN_ADMIN && user.dioceseId) community = { parish: { dioceseId: user.dioceseId } };
    else if (user.role === UserRole.PARISH_ADMIN && user.parishId) community = { parishId: user.parishId };
    else {
      const ids = this.userCommunityIds(user);
      if (ids.length) community = { id: { in: ids } };
    }
    if (!community) return [];
    const rows = await this.prisma.communityPlan.findMany({
      where: {
        status: CommunityPlanStatus.TRIAL,
        trialEndsAt: { gt: now, lte: new Date(now.getTime() + days * 24 * 60 * 60 * 1000) },
        community: { ...community, deletedAt: null },
      },
      select: { communityId: true, trialEndsAt: true, community: { select: { name: true } } },
      orderBy: { trialEndsAt: 'asc' },
      take: 50,
    });
    return rows.map((row) => ({ communityId: row.communityId, communityName: row.community.name, trialEndsAt: row.trialEndsAt! }));
  }

  // ------------------------------------------------------------------
  // Limite de membros da faixa (B32)
  // ------------------------------------------------------------------

  /**
   * Situação do limite de membros da faixa do plano. `null` quando não há
   * limite (sem plano, FREE/SUSPENDED/CANCELED, faixa sem maxMembers).
   * Conta os membros ATIVOS da comunidade (principal ou vínculo ativo).
   */
  async memberLimitStatus(communityId: string): Promise<MemberLimitStatus | null> {
    const plan = await this.getPlan(communityId);
    if (!plan?.maxMembers || !PAID_STATUSES.includes(plan.status)) return null;
    const activeMembers = await this.prisma.member.count({ where: activeMembersWhere(communityId) });
    return { communityId, maxMembers: plan.maxMembers, activeMembers, reached: activeMembers >= plan.maxMembers };
  }

  private async evaluate(target: PlanTarget, now: Date): Promise<PlanDecision> {
    const allowed = await this.targetHasAccess(target, now);
    if ('communityId' in target) return { allowed, communityId: target.communityId, target: `community:${target.communityId}` };
    if ('parishId' in target) return { allowed, communityId: null, target: `parish:${target.parishId}` };
    return { allowed, communityId: null, target: `diocese:${target.dioceseId}` };
  }
}

/** Membros ativos da comunidade (principal ou vínculo ativo) — mesmo critério do /platform/plans. */
export function activeMembersWhere(communityId: string): Prisma.MemberWhereInput {
  return {
    deletedAt: null,
    status: MemberStatus.ACTIVE,
    OR: [{ communityId }, { communityLinks: { some: { communityId, isActive: true } } }],
  };
}

function targetLabel(target: PlanTarget): string {
  if ('communityId' in target) return `community:${target.communityId}`;
  if ('parishId' in target) return `parish:${target.parishId}`;
  return `diocese:${target.dioceseId}`;
}

function outOfScope(target: PlanTarget): PlanDecision {
  return {
    allowed: false,
    communityId: 'communityId' in target ? target.communityId : null,
    target: `${targetLabel(target)} (fora do escopo)`,
    outOfScope: true,
  };
}

/** Todos os ids (sem repetição) de params|query|body[key] — string ou lista de strings. */
function pickAll(req: { params?: any; query?: any; body?: any }, from: 'params' | 'query' | 'body', key: string): string[] {
  const source = req?.[from];
  if (!source || typeof source !== 'object') return [];
  const raw = source[key];
  const values: unknown[] = Array.isArray(raw) ? raw : [raw];
  const ids = values.filter((v): v is string => typeof v === 'string' && v.trim().length > 0).map((v) => v.trim());
  return [...new Set(ids)];
}
