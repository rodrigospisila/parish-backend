import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';
import { TitheService, safeName } from './tithe.service';

export type RetentionStage = 'NEW' | 'ACTIVE' | 'COOLING' | 'LAPSED' | 'INACTIVE' | 'NEVER';
export type Trend = 'UP' | 'DOWN' | 'FLAT' | 'NEW';
const STAGES: RetentionStage[] = ['NEW', 'ACTIVE', 'COOLING', 'LAPSED', 'INACTIVE', 'NEVER'];
const ACTION_TYPES = ['THANKS', 'MESSAGE', 'CALL', 'VISIT', 'NOTE'] as const;
type ActionType = (typeof ACTION_TYPES)[number];

export const STAGE_LABELS: Record<RetentionStage, string> = {
  NEW: 'Novo dizimista',
  ACTIVE: 'Em dia',
  COOLING: 'Esfriando',
  LAPSED: 'Afastado',
  INACTIVE: 'Inativo',
  NEVER: 'Nunca contribuiu',
};

/** Ação pastoral sugerida por estágio — relacionamento, não cobrança. */
export const SUGGESTED_ACTIONS: Record<RetentionStage, { type: ActionType; label: string; hint: string }> = {
  NEW: { type: 'THANKS', label: 'Agradecer e acolher', hint: 'Um "obrigado" nas primeiras semanas fideliza: mensagem do pároco ou da pastoral do dízimo.' },
  ACTIVE: { type: 'THANKS', label: 'Manter o vínculo', hint: 'Está em dia — convide para a missa dos dizimistas ou compartilhe o balancete.' },
  COOLING: { type: 'MESSAGE', label: 'Mensagem gentil', hint: 'Dois ou três meses sem contribuir: "sentimos sua falta", sem tom de cobrança.' },
  LAPSED: { type: 'CALL', label: 'Ligar ou convidar', hint: 'Meses afastado: uma ligação da pastoral ou convite pessoal para um encontro.' },
  INACTIVE: { type: 'VISIT', label: 'Visita ou carta do pároco', hint: 'Mais de um ano sem contribuir: visita pastoral ou carta pessoal; talvez tenha mudado de paróquia.' },
  NEVER: { type: 'MESSAGE', label: 'Convite ao dízimo', hint: 'Cadastrado, mas nunca contribuiu: explique o dízimo como gesto de fé e mostre como é fácil pelo app.' },
};

const round2 = (v: number) => Math.round(v * 100) / 100;
const text = (value: unknown, max: number) => (typeof value === 'string' ? value.replace(/[\r\n\t]+/g, ' ').trim().slice(0, max) : '');
const maskPhone = (phone: string | null | undefined) => {
  const d = String(phone ?? '').replace(/\D/g, '');
  return d.length >= 8 ? `(**) *****-${d.slice(-4)}` : null;
};
const csvCell = (v: unknown) => {
  let t = String(v ?? '').replace(/[\r\n]+/g, ' ');
  if (/^[=+\-@\t]/.test(t)) t = `'${t}`;
  return `"${t.replace(/"/g, '""')}"`;
};

/** Índice de mês (ano*12+mês) para contar distância entre meses de referência. */
const monthIndex = (referenceMonth: string) => {
  const [y, m] = referenceMonth.split('-').map(Number);
  return y * 12 + (m - 1);
};
const monthFromIndex = (index: number) => `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;

export interface MemberRow {
  memberId: string;
  fullName: string;
  community: { id: string; name: string } | null;
  registrationNumber: string | null;
  phoneMasked: string | null;
  stage: RetentionStage;
  stageLabel: string;
  lastMonth: string | null;
  monthsSince: number | null;
  monthsContributing: number;
  lastAmount: number | null;
  avgAmount: number | null;
  trend: Trend;
  suggestedAction: { type: ActionType; label: string; hint: string };
  lastAction: { type: ActionType; note: string | null; at: Date; by: string | null } | null;
}

/**
 * Retenção e inadimplência (Dízimo D4.4): classifica cada dizimista pelo tempo
 * desde a última contribuição e pela tendência dos valores, e sugere a ação
 * pastoral adequada. Dado individual: só quem tem permissão financeira, no
 * próprio escopo. O tom é de cuidado com o fiel, não de cobrança.
 */
@Injectable()
export class TitheRetentionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tithe: TitheService,
    private readonly auditService: AuditService,
  ) {}

  private async memberScopeWhere(user: CurrentUser): Promise<Record<string, unknown>> {
    if (!this.tithe.canManage(user.role)) throw new ForbiddenException('Sem permissão financeira');
    const scope = await this.tithe.financeScope(user);
    if (scope.communityIds) return { communityId: { in: scope.communityIds } };
    if (scope.parishIds) return { community: { parishId: { in: scope.parishIds } } };
    return {};
  }

  private classify(
    contributions: Array<{ referenceMonth: string; amount: number }>,
    currentIndex: number,
  ): Pick<MemberRow, 'stage' | 'lastMonth' | 'monthsSince' | 'monthsContributing' | 'lastAmount' | 'avgAmount' | 'trend'> {
    if (!contributions.length) {
      return { stage: 'NEVER', lastMonth: null, monthsSince: null, monthsContributing: 0, lastAmount: null, avgAmount: null, trend: 'NEW' };
    }
    // Total por mês de referência (vários lançamentos no mesmo mês contam uma vez)
    const byMonth = new Map<string, number>();
    for (const c of contributions) byMonth.set(c.referenceMonth, round2((byMonth.get(c.referenceMonth) ?? 0) + c.amount));
    const months = [...byMonth.keys()].sort();
    const lastMonth = months[months.length - 1];
    const firstMonth = months[0];
    const monthsSince = Math.max(0, currentIndex - monthIndex(lastMonth));
    const sinceFirst = currentIndex - monthIndex(firstMonth);
    const lastAmount = byMonth.get(lastMonth) ?? null;
    const recent = months.slice(-6);
    const avgAmount = round2(recent.reduce((sum, m) => sum + (byMonth.get(m) ?? 0), 0) / recent.length);
    // Tendência: 3 últimos meses de referência × 3 anteriores (só com histórico)
    let trend: Trend = 'NEW';
    if (months.length >= 6) {
      const last3 = months.slice(-3).reduce((sum, m) => sum + (byMonth.get(m) ?? 0), 0);
      const prev3 = months.slice(-6, -3).reduce((sum, m) => sum + (byMonth.get(m) ?? 0), 0);
      trend = prev3 <= 0 ? 'FLAT' : last3 >= prev3 * 1.1 ? 'UP' : last3 <= prev3 * 0.9 ? 'DOWN' : 'FLAT';
    }
    let stage: RetentionStage;
    if (monthsSince <= 1 && sinceFirst <= 3) stage = 'NEW';
    else if (monthsSince <= 1) stage = 'ACTIVE';
    else if (monthsSince <= 3) stage = 'COOLING';
    else if (monthsSince <= 12) stage = 'LAPSED';
    else stage = 'INACTIVE';
    return { stage, lastMonth, monthsSince, monthsContributing: months.length, lastAmount, avgAmount, trend };
  }

  private async rows(user: CurrentUser, filters: { communityId?: string }): Promise<MemberRow[]> {
    const scopeWhere = await this.memberScopeWhere(user);
    if (filters.communityId) {
      const scope = await this.tithe.financeScope(user);
      if (scope.communityIds && !scope.communityIds.includes(filters.communityId)) throw new ForbiddenException('Comunidade fora do seu escopo');
    }
    const tithers = await this.prisma.tither.findMany({
      where: { member: { deletedAt: null, ...scopeWhere, ...(filters.communityId ? { communityId: filters.communityId } : {}) } },
      select: {
        registrationNumber: true,
        member: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            community: { select: { id: true, name: true } },
            titheRetentionActions: { orderBy: { createdAt: 'desc' }, take: 1, select: { type: true, note: true, createdAt: true, userName: true } },
          },
        },
        contributions: { select: { referenceMonth: true, amount: true }, orderBy: { referenceMonth: 'desc' }, take: 36 },
      },
      take: 5000,
    });
    const currentIndex = monthIndex(this.tithe.currentMonth());
    return tithers.map((t) => {
      const c = this.classify(t.contributions, currentIndex);
      const last = t.member.titheRetentionActions[0];
      return {
        memberId: t.member.id,
        fullName: safeName(t.member.fullName),
        community: t.member.community,
        registrationNumber: t.registrationNumber,
        phoneMasked: maskPhone(t.member.phone),
        ...c,
        stageLabel: STAGE_LABELS[c.stage],
        suggestedAction: SUGGESTED_ACTIONS[c.stage],
        lastAction: last ? { type: last.type as ActionType, note: last.note, at: last.createdAt, by: last.userName } : null,
      };
    });
  }

  /** Visão geral: quantos em cada estágio, série mensal (12 meses) e tendência da paróquia/comunidade. */
  async summary(user: CurrentUser, filters: { communityId?: string }) {
    const rows = await this.rows(user, filters);
    const stages = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<RetentionStage, number>;
    for (const r of rows) stages[r.stage] += 1;
    const currentIndex = monthIndex(this.tithe.currentMonth());
    const monthsWanted = Array.from({ length: 12 }, (_, i) => monthFromIndex(currentIndex - 11 + i));
    const memberIds = rows.map((r) => r.memberId);
    const contributions = memberIds.length
      ? await this.prisma.titheContribution.findMany({
          where: { tither: { memberId: { in: memberIds } }, referenceMonth: { in: monthsWanted } },
          select: { referenceMonth: true, amount: true, tither: { select: { memberId: true } } },
        })
      : [];
    const monthly = monthsWanted.map((month) => {
      const list = contributions.filter((c) => c.referenceMonth === month);
      return { month, total: round2(list.reduce((sum, c) => sum + c.amount, 0)), contributors: new Set(list.map((c) => c.tither.memberId)).size };
    });
    const last3 = monthly.slice(-3).reduce((sum, m) => sum + m.total, 0);
    const prev3 = monthly.slice(-6, -3).reduce((sum, m) => sum + m.total, 0);
    return {
      total: rows.length,
      stages: STAGES.map((s) => ({ stage: s, label: STAGE_LABELS[s], count: stages[s], suggestedAction: SUGGESTED_ACTIONS[s] })),
      needingAttention: rows.filter((r) => r.stage === 'COOLING' || r.stage === 'LAPSED').length,
      monthly,
      trend: { last3: round2(last3), prev3: round2(prev3), deltaPercent: prev3 > 0 ? Math.round(((last3 - prev3) / prev3) * 1000) / 10 : null },
    };
  }

  /** Lista individual (dado restrito) com filtro por estágio e busca por nome. */
  async list(user: CurrentUser, filters: { communityId?: string; stage?: string; q?: string }) {
    const rows = await this.rows(user, filters);
    const stage = (filters.stage ?? '').toUpperCase();
    const q = text(filters.q, 60).toLowerCase();
    const order: Record<RetentionStage, number> = { COOLING: 0, LAPSED: 1, INACTIVE: 2, NEVER: 3, NEW: 4, ACTIVE: 5 };
    return rows
      .filter((r) => (!STAGES.includes(stage as RetentionStage) || r.stage === stage) && (!q || r.fullName.toLowerCase().includes(q)))
      .sort((a, b) => order[a.stage] - order[b.stage] || (b.monthsSince ?? 0) - (a.monthsSince ?? 0) || a.fullName.localeCompare(b.fullName, 'pt-BR'))
      .slice(0, 1000);
  }

  async csv(user: CurrentUser, filters: { communityId?: string; stage?: string }): Promise<string> {
    const rows = await this.list(user, filters);
    await this.auditService.log({ actor: this.tithe.auditActor(user), action: 'EXPORT', entity: 'TitheRetention', entityId: filters.communityId ?? 'scope', metadata: { rows: rows.length, stage: filters.stage ?? null } });
    const lines = [['Dizimista', 'Comunidade', 'Nº', 'Estágio', 'Último mês', 'Meses sem contribuir', 'Meses contribuindo', 'Último valor', 'Média (6m)', 'Tendência', 'Ação sugerida', 'Última ação', 'Quando'].map(csvCell).join(';')];
    for (const r of rows) {
      lines.push(
        [
          r.fullName,
          r.community?.name ?? '',
          r.registrationNumber ?? '',
          r.stageLabel,
          r.lastMonth ?? '',
          r.monthsSince ?? '',
          r.monthsContributing,
          r.lastAmount != null ? r.lastAmount.toFixed(2).replace('.', ',') : '',
          r.avgAmount != null ? r.avgAmount.toFixed(2).replace('.', ',') : '',
          r.trend,
          r.suggestedAction.label,
          r.lastAction ? `${r.lastAction.type}${r.lastAction.note ? ` — ${r.lastAction.note}` : ''}` : '',
          r.lastAction ? r.lastAction.at.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '',
        ]
          .map(csvCell)
          .join(';'),
      );
    }
    return '\uFEFF' + lines.join('\r\n');
  }

  private async assertMember(user: CurrentUser, memberId: string) {
    const scopeWhere = await this.memberScopeWhere(user);
    const member = await this.prisma.member.findFirst({ where: { id: memberId, deletedAt: null, ...scopeWhere }, select: { id: true, fullName: true } });
    if (!member) throw new NotFoundException('Dizimista não encontrado no seu escopo');
    return member;
  }

  /** Registra a ação pastoral feita (ligação, visita, mensagem…). */
  async addAction(user: CurrentUser, memberId: string, dto: { type?: string; note?: string | null }) {
    const member = await this.assertMember(user, memberId);
    const type = String(dto.type ?? '').toUpperCase() as ActionType;
    if (!ACTION_TYPES.includes(type)) throw new BadRequestException('Tipo de ação inválido');
    const note = text(dto.note, 500) || null;
    const action = await this.prisma.titheRetentionAction.create({
      data: { memberId: member.id, userId: user.id, userName: safeName(user.email ?? null) || null, type, note },
    });
    await this.auditService.log({ actor: this.tithe.auditActor(user), action: 'CREATE', entity: 'TitheRetentionAction', entityId: action.id, metadata: { memberId, type } });
    return { id: action.id, type: action.type, note: action.note, at: action.createdAt, by: action.userName };
  }

  async actions(user: CurrentUser, memberId: string) {
    await this.assertMember(user, memberId);
    const list = await this.prisma.titheRetentionAction.findMany({ where: { memberId }, orderBy: { createdAt: 'desc' }, take: 50 });
    return list.map((a) => ({ id: a.id, type: a.type, note: a.note, at: a.createdAt, by: a.userName }));
  }
}
