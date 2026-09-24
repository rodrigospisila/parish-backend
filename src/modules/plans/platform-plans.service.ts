import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BillingCycle, CommunityPlanStatus, PlanTier, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { PlanAccessService } from './plan-access.service';
import { addDays, hasPaidAccess, monthlyEquivalentCents } from './plan-rules';
import { planTransition, tierPrice } from './plan-transitions';
import { UpdateCommunityPlanDto } from './dto/update-community-plan.dto';
import { UpsertPlanTierDto } from './dto/upsert-plan-tier.dto';

/**
 * "Já usa a plataforma": tem pastoral, escala, turma de catequese, sala,
 * documento ou alguém com papel acima de FAITHFUL ligado a ela. Mesmo
 * critério do script prisma/platform/iniciar-testes.ts.
 */
export const COMMUNITY_IN_USE_WHERE: Prisma.CommunityWhereInput[] = [
  { communityPastorals: { some: { deletedAt: null } } },
  { schedules: { some: { deletedAt: null } } },
  { catechesisClasses: { some: { deletedAt: null } } },
  { rooms: { some: { deletedAt: null } } },
  { documents: { some: { deletedAt: null } } },
  { users: { some: { role: { not: UserRole.FAITHFUL } } } },
  { userCommunities: { some: { isActive: true, role: { not: UserRole.FAITHFUL } } } },
];

/** Vínculo ativo de membro com conta no app */
const MEMBER_WITH_ACCOUNT: Prisma.MemberCommunityWhereInput = {
  isActive: true,
  member: { userId: { not: null }, deletedAt: null },
};

const PLAN_SELECT = {
  status: true,
  billingCycle: true,
  priceCents: true,
  trialEndsAt: true,
  currentPeriodEnd: true,
  graceDays: true,
  suspendedAt: true,
  notes: true,
  updatedAt: true,
  tier: { select: { key: true, name: true, monthlyPriceCents: true, yearlyPriceCents: true } },
} satisfies Prisma.CommunityPlanSelect;

type PlanRow = Prisma.CommunityPlanGetPayload<{ select: typeof PLAN_SELECT }>;

export interface ListPlansQuery {
  status?: string;
  search?: string;
  state?: string;
  dioceseId?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class PlatformPlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: PlanAccessService,
  ) {}

  serializePlan(plan: PlanRow | null) {
    if (!plan) return null;
    const cycle = plan.billingCycle;
    return {
      status: plan.status,
      tierKey: plan.tier?.key ?? null,
      tierName: plan.tier?.name ?? null,
      billingCycle: cycle,
      priceCents: plan.priceCents,
      /** Preço que vale: o combinado ou o da faixa no ciclo */
      effectivePriceCents: plan.priceCents ?? (plan.tier && cycle ? tierPrice(plan.tier, cycle) : null),
      trialEndsAt: plan.trialEndsAt,
      currentPeriodEnd: plan.currentPeriodEnd,
      graceDays: plan.graceDays,
      suspendedAt: plan.suspendedAt,
      notes: plan.notes,
      updatedAt: plan.updatedAt,
    };
  }

  // ------------------------------------------------------------------
  // Lista / resumo
  // ------------------------------------------------------------------

  async list(query: ListPlansQuery) {
    const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 200);
    const offset = Math.max(Number(query.offset) || 0, 0);

    const and: Prisma.CommunityWhereInput[] = [
      {
        OR: [
          { communityPlan: { isNot: null } },
          { memberLinks: { some: MEMBER_WITH_ACCOUNT } },
          ...COMMUNITY_IN_USE_WHERE,
        ],
      },
    ];

    if (query.status) {
      const status = String(query.status).toUpperCase();
      if (!(Object.values(CommunityPlanStatus) as string[]).includes(status)) {
        throw new BadRequestException(`status inválido: ${query.status}`);
      }
      and.push(
        status === CommunityPlanStatus.FREE
          ? { OR: [{ communityPlan: { is: null } }, { communityPlan: { is: { status: CommunityPlanStatus.FREE } } }] }
          : { communityPlan: { is: { status: status as CommunityPlanStatus } } },
      );
    }
    const search = query.search?.trim();
    if (search) {
      and.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } },
          { parish: { name: { contains: search, mode: 'insensitive' } } },
        ],
      });
    }
    if (query.state?.trim()) and.push({ state: { equals: query.state.trim(), mode: 'insensitive' } });
    if (query.dioceseId?.trim()) and.push({ parish: { dioceseId: query.dioceseId.trim() } });

    const where: Prisma.CommunityWhereInput = { deletedAt: null, AND: and };
    const now = new Date();

    const [total, rows] = await Promise.all([
      this.prisma.community.count({ where }),
      this.prisma.community.findMany({
        where,
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
          parish: { select: { id: true, name: true, diocese: { select: { id: true, name: true } } } },
          communityPlan: { select: PLAN_SELECT },
          _count: { select: { memberLinks: { where: MEMBER_WITH_ACCOUNT } } },
        },
        orderBy: [{ memberLinks: { _count: 'desc' } }, { name: 'asc' }],
        take: limit,
        skip: offset,
      }),
    ]);

    return {
      total,
      items: rows.map((row) => ({
        communityId: row.id,
        name: row.name,
        city: row.city,
        state: row.state,
        parish: row.parish ? { id: row.parish.id, name: row.parish.name } : null,
        diocese: row.parish?.diocese ? { id: row.parish.diocese.id, name: row.parish.diocese.name } : null,
        membersWithAccount: row._count.memberLinks,
        plan: this.serializePlan(row.communityPlan),
        paidAccess: hasPaidAccess(row.communityPlan, now),
      })),
    };
  }

  async summary() {
    const now = new Date();
    const [grouped, freeWithoutPlan, trialsEndingIn15d, paying] = await Promise.all([
      this.prisma.communityPlan.groupBy({ by: ['status'], _count: { _all: true } }),
      // Sem registro = FREE: conta só as que aparecem na lista (com uso ou fiéis
      // com conta), não as 53 mil comunidades do território
      this.prisma.community.count({
        where: {
          deletedAt: null,
          communityPlan: { is: null },
          OR: [{ memberLinks: { some: MEMBER_WITH_ACCOUNT } }, ...COMMUNITY_IN_USE_WHERE],
        },
      }),
      this.prisma.communityPlan.count({
        where: { status: CommunityPlanStatus.TRIAL, trialEndsAt: { gt: now, lte: addDays(now, 15) } },
      }),
      this.prisma.communityPlan.findMany({
        where: { status: { in: [CommunityPlanStatus.ACTIVE, CommunityPlanStatus.PAST_DUE] } },
        select: {
          priceCents: true,
          billingCycle: true,
          tier: { select: { monthlyPriceCents: true, yearlyPriceCents: true } },
        },
      }),
    ]);

    const byStatus = Object.fromEntries(Object.values(CommunityPlanStatus).map((s) => [s, 0])) as Record<
      CommunityPlanStatus,
      number
    >;
    for (const row of grouped) byStatus[row.status] = row._count._all;
    byStatus.FREE += freeWithoutPlan;

    const mrrCents = paying.reduce((sum, plan) => {
      const cycle = plan.billingCycle ?? BillingCycle.MONTHLY;
      const price = plan.priceCents ?? (plan.tier ? tierPrice(plan.tier, cycle) : 0);
      return sum + monthlyEquivalentCents(price, cycle);
    }, 0);

    return { byStatus, trialsEndingIn15d, pastDue: byStatus.PAST_DUE, mrrCents };
  }

  // ------------------------------------------------------------------
  // Mudança de plano
  // ------------------------------------------------------------------

  async update(communityId: string, dto: UpdateCommunityPlanDto, byUserId: string | null) {
    const community = await this.prisma.community.findUnique({ where: { id: communityId }, select: { id: true } });
    if (!community) throw new NotFoundException('Comunidade não encontrada');

    const current = await this.prisma.communityPlan.findUnique({
      where: { communityId },
      include: { tier: true },
    });

    let tier: PlanTier | null = null;
    if (dto.tierKey) {
      tier = await this.prisma.planTier.findUnique({ where: { key: dto.tierKey } });
      if (!tier) throw new BadRequestException(`Faixa desconhecida: ${dto.tierKey}`);
    }

    const now = new Date();
    const result = planTransition(current, dto, tier, now);

    const plan = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.communityPlan.upsert({
        where: { communityId },
        create: { communityId, ...result.data },
        update: result.data,
        select: PLAN_SELECT,
      });
      await tx.communityPlanEvent.create({
        data: {
          communityId,
          action: dto.action,
          fromStatus: result.fromStatus,
          toStatus: result.toStatus,
          byUserId,
          note: dto.note?.trim() || null,
          data: JSON.parse(
            JSON.stringify({
              created: !current,
              tierKey: saved.tier?.key ?? null,
              billingCycle: saved.billingCycle,
              priceCents: saved.priceCents,
              trialEndsAt: saved.trialEndsAt,
              currentPeriodEnd: saved.currentPeriodEnd,
              ...(dto.until ? { until: dto.until } : {}),
            }),
          ),
        },
      });
      return saved;
    });

    this.access.invalidate(communityId);
    return { communityId, plan: this.serializePlan(plan), paidAccess: hasPaidAccess(plan, now) };
  }

  async events(communityId: string) {
    const community = await this.prisma.community.findUnique({ where: { id: communityId }, select: { id: true } });
    if (!community) throw new NotFoundException('Comunidade não encontrada');

    const events = await this.prisma.communityPlanEvent.findMany({
      where: { communityId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const userIds = [...new Set(events.map((e) => e.byUserId).filter((id): id is string => !!id))];
    const users = userIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
      : [];
    const names = new Map(users.map((u) => [u.id, u.name]));

    return events.map((e) => ({
      id: e.id,
      action: e.action,
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      byUserId: e.byUserId,
      byUserName: e.byUserId ? (names.get(e.byUserId) ?? null) : null,
      note: e.note,
      data: e.data,
      createdAt: e.createdAt,
    }));
  }

  // ------------------------------------------------------------------
  // Faixas
  // ------------------------------------------------------------------

  listTiers() {
    return this.prisma.planTier.findMany({ orderBy: [{ sortOrder: 'asc' }, { monthlyPriceCents: 'asc' }] });
  }

  async upsertTier(key: string, dto: UpsertPlanTierDto) {
    const normalized = String(key ?? '').trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{1,39}$/.test(normalized)) {
      throw new BadRequestException('Chave inválida (use a-z, 0-9 e hífen; 2 a 40 caracteres)');
    }

    const data: Prisma.PlanTierUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.maxMembers !== undefined) data.maxMembers = dto.maxMembers;
    if (dto.monthlyPriceCents !== undefined) data.monthlyPriceCents = dto.monthlyPriceCents;
    if (dto.yearlyPriceCents !== undefined) data.yearlyPriceCents = dto.yearlyPriceCents;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;

    const existing = await this.prisma.planTier.findUnique({ where: { key: normalized } });
    if (existing) {
      return this.prisma.planTier.update({ where: { key: normalized }, data });
    }

    if (!dto.name || dto.monthlyPriceCents === undefined || dto.yearlyPriceCents === undefined) {
      throw new BadRequestException('Faixa nova exige name, monthlyPriceCents e yearlyPriceCents');
    }
    return this.prisma.planTier.create({
      data: {
        key: normalized,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        maxMembers: dto.maxMembers ?? null,
        monthlyPriceCents: dto.monthlyPriceCents,
        yearlyPriceCents: dto.yearlyPriceCents,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }
}
