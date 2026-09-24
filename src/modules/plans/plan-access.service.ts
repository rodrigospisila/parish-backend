import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommunityPlanStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { EnforcementMode, hasPaidAccess, parseEnforcement } from './plan-rules';
import type { PlanFeatureMeta, PlanResourceKind, PlanResourceSpec } from './plan.decorators';

export interface PlanSnapshot {
  status: CommunityPlanStatus;
  tierKey: string | null;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  graceDays: number;
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
}

export interface PlanUser {
  id: string;
  role: UserRole | `${UserRole}`;
  communityId?: string | null;
  parishId?: string | null;
  dioceseId?: string | null;
  communities?: Array<{ communityId: string; isActive?: boolean }>;
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

/** Descobre a comunidade (ou a paróquia) dona de um recurso pelo id. */
type Resolver = (prisma: PrismaService, id: string) => Promise<PlanTarget | null>;

const byCommunity = (row: { communityId?: string | null } | null | undefined): PlanTarget | null =>
  row?.communityId ? { communityId: row.communityId } : null;

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
};

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

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Lido a cada requisição (mudar a env + reiniciar basta; testes trocam à vontade). */
  enforcement(): EnforcementMode {
    return parseEnforcement(this.config.get<string>('PLAN_ENFORCEMENT') ?? process.env.PLAN_ENFORCEMENT);
  }

  invalidate(communityId?: string) {
    if (communityId) this.planCache.delete(communityId);
    else this.planCache.clear();
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
        tier: { select: { key: true } },
      },
    });
    const value: PlanSnapshot | null = row
      ? {
          status: row.status,
          tierKey: row.tier?.key ?? null,
          trialEndsAt: row.trialEndsAt,
          currentPeriodEnd: row.currentPeriodEnd,
          graceDays: row.graceDays,
        }
      : null;
    this.store(this.planCache, communityId, value);
    return value;
  }

  async communityHasAccess(communityId: string, now: Date = new Date()): Promise<boolean> {
    return hasPaidAccess(await this.getPlan(communityId), now);
  }

  /** Alguma comunidade (não arquivada) da paróquia/diocese tem acesso? */
  private async scopeHasAccess(kind: 'parish' | 'diocese', id: string, now: Date): Promise<boolean> {
    const key = `${kind}:${id}`;
    const hit = this.cached(this.scopeCache, key);
    if (hit) return hit.value;

    const community = kind === 'parish' ? { parishId: id, deletedAt: null } : { parish: { dioceseId: id }, deletedAt: null };
    const rows = await this.prisma.communityPlan.findMany({
      where: { status: { in: PAID_STATUSES }, community },
      select: { status: true, trialEndsAt: true, currentPeriodEnd: true, graceDays: true },
    });
    const value = rows.some((row) => hasPaidAccess(row, now));
    this.store(this.scopeCache, key, value);
    return value;
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
   *     (recurso inexistente → libera: o service responde 404);
   *  2. communityId explícito (params | query | body), depois parishId;
   *  3. pelo usuário: DIOCESAN/PARISH_ADMIN (ou recurso de nível paróquia) →
   *     alguma comunidade do escopo; demais → comunidade do usuário (ou algum
   *     vínculo ativo dele).
   * SYSTEM_ADMIN sempre passa.
   */
  async decide(
    meta: PlanFeatureMeta,
    user: PlanUser,
    req: { params?: any; query?: any; body?: any },
    resources: PlanResourceSpec[] = [],
    now: Date = new Date(),
  ): Promise<PlanDecision> {
    if (user.role === UserRole.SYSTEM_ADMIN) {
      return { allowed: true, communityId: null, target: 'system-admin' };
    }

    for (const spec of resources) {
      const raw = pick(req, spec.from, spec.key);
      if (!raw) continue;
      const target = await this.resolveResource(spec.kind, raw);
      if (!target) return { allowed: true, communityId: null, target: `${spec.kind}:${raw} (não encontrado)` };
      return this.evaluate(target, now);
    }

    for (const from of ['params', 'query', 'body'] as const) {
      const communityId = pick(req, from, 'communityId');
      if (communityId) return this.evaluate({ communityId }, now);
    }
    for (const from of ['params', 'query', 'body'] as const) {
      const parishId = pick(req, from, 'parishId');
      if (parishId) return this.evaluate({ parishId }, now);
    }

    return this.decideForUser(meta, user, now);
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

    const ids = [
      user.communityId,
      ...(user.communities ?? []).filter((link) => link.isActive !== false).map((link) => link.communityId),
    ].filter((id, i, all): id is string => !!id && all.indexOf(id) === i);

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

  private async evaluate(target: PlanTarget, now: Date): Promise<PlanDecision> {
    const allowed = await this.targetHasAccess(target, now);
    if ('communityId' in target) return { allowed, communityId: target.communityId, target: `community:${target.communityId}` };
    if ('parishId' in target) return { allowed, communityId: null, target: `parish:${target.parishId}` };
    return { allowed, communityId: null, target: `diocese:${target.dioceseId}` };
  }
}

function pick(req: { params?: any; query?: any; body?: any }, from: 'params' | 'query' | 'body', key: string): string | null {
  const source = req?.[from];
  if (!source || typeof source !== 'object') return null;
  // Lista de ids (ex.: scheduleIds): vale o primeiro
  const value = Array.isArray(source[key]) ? source[key][0] : source[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
