import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FinancialStatementStatus, NotificationType, TransactionType, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser, HierarchyService } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PdfService } from '../pdf/pdf.service';
import { isRoleAtLeast } from '../auth/constants/role-hierarchy';

const FINANCE_ROLES: UserRole[] = [UserRole.SYSTEM_ADMIN, UserRole.DIOCESAN_ADMIN, UserRole.PARISH_ADMIN, UserRole.COMMUNITY_COORDINATOR];
/** Sugestões de centro de custo (a paróquia pode digitar outros) */
export const DEFAULT_COST_CENTERS = ['Administrativo', 'Pastoral', 'Liturgia', 'Obras e manutenção', 'Caridade e social', 'Catequese', 'Eventos', 'Pessoal', 'Água, luz e telefone'];
const NOTIFY_LIMIT = 5000;
const MONTHS_BACK = 24;

const MONTH_NAMES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const monthLabel = (referenceMonth: string) => {
  const [y, m] = referenceMonth.split('-').map(Number);
  return `${MONTH_NAMES[(m ?? 1) - 1]}/${y}`;
};
const money = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;
const day = (value: Date | null | undefined) => (value ? value.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—');
const round2 = (value: number) => Math.round(value * 100) / 100;
const text = (value: unknown, max: number) => (typeof value === 'string' ? value.replace(/[\r\n\t]+/g, ' ').trim().slice(0, max) : '');
const csvCell = (v: unknown) => {
  let t = String(v ?? '').replace(/[\r\n]+/g, ' ');
  if (/^[=+\-@\t]/.test(t)) t = `'${t}`;
  return `"${t.replace(/"/g, '""')}"`;
};

type Bucket = { total: number; count: number };
export interface StatementSnapshot {
  referenceMonth: string;
  generatedAt: string;
  income: { total: number; count: number; byCategory: Array<{ name: string; total: number; count: number }>; byCostCenter: Array<{ name: string; total: number; count: number }> };
  expense: { total: number; count: number; byCategory: Array<{ name: string; total: number; count: number }>; byCostCenter: Array<{ name: string; total: number; count: number }> };
  balance: number;
  campaigns: Array<{ id: string; name: string; total: number }>;
  communities: Array<{ id: string | null; name: string; income: number; expense: number }>;
}

/**
 * Transparência (Dízimo D4.3): balancete mensal da paróquia (ou da comunidade)
 * gerado a partir dos lançamentos, aprovado pelo Conselho de Assuntos
 * Econômicos (registrado pela administração paroquial) e publicado para os
 * fiéis no app/web — só totais por categoria e centro de custo, nunca dado
 * individual. Centro de custo e exportação contábil completam a prestação de contas.
 */
@Injectable()
export class StatementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly pdfService: PdfService,
  ) {}

  private actor(user: CurrentUser) {
    return { id: user.id, email: user.email, role: user.role };
  }

  private canManage(role: UserRole) {
    return FINANCE_ROLES.includes(role);
  }

  private isParishAdmin(role: UserRole) {
    return isRoleAtLeast(role, UserRole.PARISH_ADMIN);
  }

  private validateMonth(raw: unknown): string {
    const value = String(raw ?? '').trim();
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) throw new BadRequestException('Mês inválido (use AAAA-MM)');
    const [y, m] = value.split('-').map(Number);
    const first = new Date(Date.UTC(y, m - 1, 1));
    const now = new Date();
    if (first.getTime() > Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)) throw new BadRequestException('Mês no futuro');
    if (first.getTime() < Date.UTC(now.getUTCFullYear() - 5, now.getUTCMonth(), 1)) throw new BadRequestException('Mês antigo demais (mais de 5 anos)');
    return value;
  }

  private monthRange(referenceMonth: string) {
    const [y, m] = referenceMonth.split('-').map(Number);
    const from = new Date(`${referenceMonth}-01T00:00:00.000-03:00`);
    const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
    const to = new Date(`${next}-01T00:00:00.000-03:00`);
    return { from, to };
  }

  /** Escopo: comunidade no escopo do usuário; paróquia inteira só para a administração paroquial. */
  private async assertScope(user: CurrentUser, parishId: string, communityId: string | null) {
    if (!this.canManage(user.role)) throw new ForbiddenException('Sem permissão financeira');
    if (user.role === UserRole.SYSTEM_ADMIN) return;
    if (user.role === UserRole.DIOCESAN_ADMIN) {
      const parish = await this.prisma.parish.findUnique({ where: { id: parishId }, select: { dioceseId: true } });
      if (!parish || parish.dioceseId !== user.dioceseId) throw new ForbiddenException('Paróquia fora da sua diocese');
      return;
    }
    if (user.parishId !== parishId) throw new ForbiddenException('Paróquia fora do seu escopo');
    if (!communityId) {
      if (!this.isParishAdmin(user.role)) throw new ForbiddenException('O balancete da paróquia inteira é da administração paroquial');
      return;
    }
    const inScope = await this.hierarchyService.isCommunityInScope(user, communityId);
    if (!inScope) throw new ForbiddenException('Comunidade fora do seu escopo');
  }

  private async resolveParish(user: CurrentUser, parishId?: string | null, communityId?: string | null) {
    if (communityId) {
      const community = await this.prisma.community.findUnique({ where: { id: communityId }, select: { parishId: true } });
      if (!community) throw new NotFoundException('Comunidade não encontrada');
      if (parishId && parishId !== community.parishId) throw new BadRequestException('A comunidade não pertence a esta paróquia');
      return community.parishId;
    }
    const target = parishId || user.parishId;
    if (!target) throw new BadRequestException('Informe a paróquia');
    return target;
  }

  private present(s: any) {
    return {
      id: s.id,
      parishId: s.parishId,
      communityId: s.communityId,
      community: s.community ? { id: s.community.id, name: s.community.name } : null,
      referenceMonth: s.referenceMonth,
      monthLabel: monthLabel(s.referenceMonth),
      status: s.status,
      snapshot: s.snapshot as StatementSnapshot,
      notes: s.notes,
      generatedAt: s.generatedAt,
      approvedAt: s.approvedAt,
      approvedByName: s.approvedByName,
      publishedAt: s.publishedAt,
      updatedAt: s.updatedAt,
    };
  }

  private include = { community: { select: { id: true, name: true } } } as const;

  /** Fotografia dos totais do mês (sem descrições nem nomes). */
  private async buildSnapshot(parishId: string, communityId: string | null, referenceMonth: string): Promise<StatementSnapshot> {
    const { from, to } = this.monthRange(referenceMonth);
    const [transactions, communities] = await Promise.all([
      this.prisma.financialTransaction.findMany({
        where: { parishId, ...(communityId ? { communityId } : {}), date: { gte: from, lt: to } },
        select: { type: true, category: true, costCenter: true, amount: true, communityId: true, campaignId: true, campaign: { select: { id: true, name: true } } },
      }),
      this.prisma.community.findMany({ where: { parishId }, select: { id: true, name: true } }),
    ]);
    const bucket = (map: Map<string, Bucket>, key: string, amount: number) => {
      const row = map.get(key) ?? { total: 0, count: 0 };
      row.total = round2(row.total + amount);
      row.count += 1;
      map.set(key, row);
    };
    const incomeCat = new Map<string, Bucket>();
    const expenseCat = new Map<string, Bucket>();
    const incomeCc = new Map<string, Bucket>();
    const expenseCc = new Map<string, Bucket>();
    const campaigns = new Map<string, { id: string; name: string; total: number }>();
    const byCommunity = new Map<string, { income: number; expense: number }>();
    let income = 0;
    let expense = 0;
    let incomeCount = 0;
    let expenseCount = 0;
    for (const t of transactions) {
      const isIncome = t.type === TransactionType.INCOME;
      const category = (t.category || 'Outros').trim();
      const cc = (t.costCenter || 'Sem centro de custo').trim();
      if (isIncome) {
        income = round2(income + t.amount);
        incomeCount += 1;
        bucket(incomeCat, category, t.amount);
        bucket(incomeCc, cc, t.amount);
      } else {
        expense = round2(expense + t.amount);
        expenseCount += 1;
        bucket(expenseCat, category, t.amount);
        bucket(expenseCc, cc, t.amount);
      }
      if (t.campaign) {
        const row = campaigns.get(t.campaign.id) ?? { id: t.campaign.id, name: t.campaign.name, total: 0 };
        row.total = round2(row.total + (isIncome ? t.amount : -t.amount));
        campaigns.set(t.campaign.id, row);
      }
      const key = t.communityId ?? '';
      const c = byCommunity.get(key) ?? { income: 0, expense: 0 };
      if (isIncome) c.income = round2(c.income + t.amount);
      else c.expense = round2(c.expense + t.amount);
      byCommunity.set(key, c);
    }
    const nameOf = new Map(communities.map((c) => [c.id, c.name]));
    const list = (map: Map<string, Bucket>) => [...map.entries()].map(([name, b]) => ({ name, ...b })).sort((a, b) => b.total - a.total);
    return {
      referenceMonth,
      generatedAt: new Date().toISOString(),
      income: { total: income, count: incomeCount, byCategory: list(incomeCat), byCostCenter: list(incomeCc) },
      expense: { total: expense, count: expenseCount, byCategory: list(expenseCat), byCostCenter: list(expenseCc) },
      balance: round2(income - expense),
      campaigns: [...campaigns.values()].sort((a, b) => b.total - a.total),
      communities: [...byCommunity.entries()]
        .map(([id, v]) => ({ id: id || null, name: nameOf.get(id) ?? (id ? '—' : 'Paróquia (sem comunidade)'), ...v }))
        .sort((a, b) => b.income - a.income),
    };
  }

  // ===== GESTÃO =====

  async list(user: CurrentUser, filters: { parishId?: string; communityId?: string }) {
    if (!this.canManage(user.role)) throw new ForbiddenException('Sem permissão financeira');
    const parishId = await this.resolveParish(user, filters.parishId, filters.communityId);
    const where: any = { parishId };
    if (filters.communityId) {
      await this.assertScope(user, parishId, filters.communityId);
      where.communityId = filters.communityId;
    } else if (!this.isParishAdmin(user.role) && user.role !== UserRole.SYSTEM_ADMIN && user.role !== UserRole.DIOCESAN_ADMIN) {
      // Coordenação: só os da própria comunidade (+ os publicados da paróquia, para leitura)
      where.OR = [{ communityId: user.communityId ?? '' }, { communityId: null, status: 'PUBLISHED' }];
    } else {
      await this.assertScope(user, parishId, null);
    }
    const rows = await this.prisma.financialStatement.findMany({ where, orderBy: [{ referenceMonth: 'desc' }, { communityId: 'asc' }], include: this.include, take: 200 });
    return rows.map((r) => this.present(r));
  }

  /** Gera (ou regenera) o balancete do mês: sempre volta a rascunho — aprovação é sobre uma fotografia específica. */
  async generate(user: CurrentUser, dto: { referenceMonth: string; parishId?: string; communityId?: string | null }) {
    const referenceMonth = this.validateMonth(dto.referenceMonth);
    const communityId = typeof dto.communityId === 'string' && dto.communityId ? dto.communityId : null;
    const parishId = await this.resolveParish(user, dto.parishId, communityId);
    await this.assertScope(user, parishId, communityId);
    const existing = await this.prisma.financialStatement.findUnique({
      where: { parishId_scopeKey_referenceMonth: { parishId, scopeKey: communityId ?? 'PARISH', referenceMonth } },
    });
    if (existing?.status === 'PUBLISHED') throw new BadRequestException('Balancete publicado — despublique antes de regenerar');
    const snapshot = await this.buildSnapshot(parishId, communityId, referenceMonth);
    const saved = await this.prisma.financialStatement.upsert({
      where: { parishId_scopeKey_referenceMonth: { parishId, scopeKey: communityId ?? 'PARISH', referenceMonth } },
      create: { parishId, communityId, scopeKey: communityId ?? 'PARISH', referenceMonth, snapshot: snapshot as any, generatedByUserId: user.id },
      update: { snapshot: snapshot as any, generatedAt: new Date(), generatedByUserId: user.id, status: 'DRAFT', approvedAt: null, approvedByUserId: null, approvedByName: null },
      include: this.include,
    });
    await this.auditService.log({
      actor: this.actor(user),
      action: existing ? 'UPDATE' : 'CREATE',
      entity: 'FinancialStatement',
      entityId: saved.id,
      metadata: { referenceMonth, communityId, income: snapshot.income.total, expense: snapshot.expense.total, regenerated: !!existing },
    });
    return this.present(saved);
  }

  private async load(user: CurrentUser, id: string) {
    const statement = await this.prisma.financialStatement.findUnique({ where: { id }, include: this.include });
    if (!statement) throw new NotFoundException('Balancete não encontrado');
    return statement;
  }

  async get(user: CurrentUser, id: string) {
    const statement = await this.load(user, id);
    if (!this.canManage(user.role)) throw new ForbiddenException('Sem permissão financeira');
    // Coordenação lê o balancete publicado da paróquia; os demais só no escopo
    if (!(statement.communityId === null && statement.status === 'PUBLISHED' && user.parishId === statement.parishId)) {
      await this.assertScope(user, statement.parishId, statement.communityId);
    }
    return this.present(statement);
  }

  async updateNotes(user: CurrentUser, id: string, dto: { notes?: string | null }) {
    const statement = await this.load(user, id);
    await this.assertScope(user, statement.parishId, statement.communityId);
    if (statement.status === 'PUBLISHED') throw new BadRequestException('Balancete publicado — despublique para editar a mensagem');
    const notes = text(dto.notes, 2000) || null;
    const saved = await this.prisma.financialStatement.update({ where: { id }, data: { notes }, include: this.include });
    await this.auditService.log({ actor: this.actor(user), action: 'UPDATE', entity: 'FinancialStatement', entityId: id, metadata: { notes: !!notes } });
    return this.present(saved);
  }

  /** Aprovação em nome do Conselho de Assuntos Econômicos: só a administração paroquial registra. */
  async approve(user: CurrentUser, id: string, dto: { approvedByName?: string | null }) {
    const statement = await this.load(user, id);
    await this.assertScope(user, statement.parishId, statement.communityId);
    if (!this.isParishAdmin(user.role)) throw new ForbiddenException('A aprovação do balancete é registrada pela administração paroquial (em nome do CAEP)');
    if (statement.status !== 'DRAFT') throw new BadRequestException(statement.status === 'PUBLISHED' ? 'Balancete já publicado' : 'Balancete já aprovado');
    const approvedByName = text(dto.approvedByName, 120) || 'Conselho de Assuntos Econômicos Paroquiais';
    const saved = await this.prisma.financialStatement.update({
      where: { id },
      data: { status: 'APPROVED', approvedAt: new Date(), approvedByUserId: user.id, approvedByName },
      include: this.include,
    });
    await this.auditService.log({ actor: this.actor(user), action: 'UPDATE', entity: 'FinancialStatement', entityId: id, before: { status: 'DRAFT' }, after: { status: 'APPROVED', approvedByName } });
    return this.present(saved);
  }

  /** Publica para os fiéis (paróquia inteira ou a comunidade) e avisa uma vez. */
  async publish(user: CurrentUser, id: string) {
    const statement = await this.load(user, id);
    await this.assertScope(user, statement.parishId, statement.communityId);
    if (!this.isParishAdmin(user.role)) throw new ForbiddenException('A publicação do balancete é da administração paroquial');
    if (statement.status === 'PUBLISHED') return this.present(statement);
    if (statement.status !== 'APPROVED') throw new BadRequestException('Aprove o balancete (CAEP) antes de publicar');
    const saved = await this.prisma.financialStatement.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date(), publishedByUserId: user.id },
      include: this.include,
    });
    await this.auditService.log({ actor: this.actor(user), action: 'UPDATE', entity: 'FinancialStatement', entityId: id, before: { status: 'APPROVED' }, after: { status: 'PUBLISHED' } });
    try {
      const members = await this.prisma.member.findMany({
        where: {
          deletedAt: null,
          userId: { not: null },
          ...(saved.communityId ? { communityId: saved.communityId } : { community: { parishId: saved.parishId } }),
        },
        select: { userId: true },
        take: NOTIFY_LIMIT,
      });
      const ids = members.map((m) => m.userId!).filter(Boolean);
      if (ids.length) {
        const snap = saved.snapshot as unknown as StatementSnapshot;
        await this.notificationsService.notifyUsers(
          ids,
          NotificationType.NEWS,
          `Balancete de ${monthLabel(saved.referenceMonth)} publicado`,
          `${saved.community ? saved.community.name : 'Paróquia'}: receitas ${money(snap.income.total)}, despesas ${money(snap.expense.total)}, saldo ${money(snap.balance)}. Veja os detalhes na área do dízimo.`,
          { kind: 'finance-statement', statementId: id },
        );
      }
    } catch {
      // aviso é conveniência
    }
    return this.present(saved);
  }

  async unpublish(user: CurrentUser, id: string) {
    const statement = await this.load(user, id);
    await this.assertScope(user, statement.parishId, statement.communityId);
    if (!this.isParishAdmin(user.role)) throw new ForbiddenException('Só a administração paroquial despublica');
    if (statement.status !== 'PUBLISHED') return this.present(statement);
    const saved = await this.prisma.financialStatement.update({ where: { id }, data: { status: 'APPROVED', publishedAt: null, publishedByUserId: null }, include: this.include });
    await this.auditService.log({ actor: this.actor(user), action: 'UPDATE', entity: 'FinancialStatement', entityId: id, before: { status: 'PUBLISHED' }, after: { status: 'APPROVED' } });
    return this.present(saved);
  }

  /** Centros de custo em uso na paróquia + sugestões. */
  async costCenters(user: CurrentUser, parishId?: string) {
    if (!this.canManage(user.role)) throw new ForbiddenException('Sem permissão financeira');
    const target = parishId || user.parishId;
    const used = target
      ? await this.prisma.financialTransaction.findMany({ where: { parishId: target, costCenter: { not: null } }, distinct: ['costCenter'], select: { costCenter: true }, take: 100 })
      : [];
    const names = new Set<string>([...used.map((u) => u.costCenter!).filter(Boolean), ...DEFAULT_COST_CENTERS]);
    return [...names].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  /** Exportação contábil do mês: todos os lançamentos com categoria e centro de custo (só gestão). */
  async exportCsv(user: CurrentUser, id: string): Promise<{ filename: string; csv: string }> {
    const statement = await this.load(user, id);
    await this.assertScope(user, statement.parishId, statement.communityId);
    const { from, to } = this.monthRange(statement.referenceMonth);
    const [transactions, communities] = await Promise.all([
      this.prisma.financialTransaction.findMany({
        where: { parishId: statement.parishId, ...(statement.communityId ? { communityId: statement.communityId } : {}), date: { gte: from, lt: to } },
        orderBy: { date: 'asc' },
        take: 20000,
        select: { id: true, date: true, type: true, category: true, costCenter: true, description: true, amount: true, communityId: true, accountName: true, campaign: { select: { name: true } } },
      }),
      this.prisma.community.findMany({ where: { parishId: statement.parishId }, select: { id: true, name: true } }),
    ]);
    const nameOf = new Map(communities.map((c) => [c.id, c.name]));
    const lines = [['Data', 'Tipo', 'Categoria', 'Centro de custo', 'Comunidade', 'Campanha', 'Conta', 'Descrição', 'Entrada', 'Saída', 'Id'].map(csvCell).join(';')];
    for (const t of transactions) {
      const isIncome = t.type === TransactionType.INCOME;
      lines.push(
        [
          day(t.date),
          isIncome ? 'Receita' : 'Despesa',
          t.category,
          t.costCenter ?? '',
          nameOf.get(t.communityId ?? '') ?? (t.communityId ? '—' : 'Paróquia'),
          t.campaign?.name ?? '',
          t.accountName ?? '',
          t.description ?? '',
          isIncome ? t.amount.toFixed(2).replace('.', ',') : '',
          isIncome ? '' : t.amount.toFixed(2).replace('.', ','),
          t.id,
        ]
          .map(csvCell)
          .join(';'),
      );
    }
    const snap = statement.snapshot as unknown as StatementSnapshot;
    lines.push(['', 'Totais', '', '', '', '', '', '', snap.income.total.toFixed(2).replace('.', ','), snap.expense.total.toFixed(2).replace('.', ','), ''].map(csvCell).join(';'));
    await this.auditService.log({ actor: this.actor(user), action: 'EXPORT', entity: 'FinancialStatement', entityId: id, metadata: { rows: transactions.length } });
    return { filename: `balancete-${statement.referenceMonth}${statement.communityId ? '-comunidade' : ''}.csv`, csv: '\uFEFF' + lines.join('\r\n') };
  }

  /** PDF do balancete (o mesmo que o fiel vê): totais por categoria, centro de custo, campanhas e saldo. */
  async pdf(statement: { parishId: string; referenceMonth: string; snapshot: unknown; notes: string | null; approvedByName: string | null; approvedAt: Date | null; publishedAt: Date | null; community: { name: string } | null; status: string }): Promise<Buffer> {
    const parish = await this.prisma.parish.findUnique({ where: { id: statement.parishId }, select: { name: true, logoUrl: true } });
    const snap = statement.snapshot as StatementSnapshot;
    const table = (rows: Array<{ name: string; total: number; count: number }>) => rows.map((r) => [r.name, String(r.count), money(r.total)]);
    let logo: Buffer | null = null;
    if (parish?.logoUrl && /^https:\/\//i.test(parish.logoUrl)) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);
        const response = await fetch(parish.logoUrl, { signal: controller.signal });
        clearTimeout(timer);
        if (response.ok && /image\/(png|jpe?g)/i.test(response.headers.get('content-type') ?? '')) logo = Buffer.from(await response.arrayBuffer());
      } catch {
        logo = null;
      }
    }
    const status =
      statement.status === 'PUBLISHED'
        ? `Aprovado por ${statement.approvedByName ?? 'CAEP'} em ${day(statement.approvedAt)} · publicado em ${day(statement.publishedAt)}`
        : statement.status === 'APPROVED'
          ? `Aprovado por ${statement.approvedByName ?? 'CAEP'} em ${day(statement.approvedAt)} · ainda não publicado`
          : 'Rascunho — em revisão';
    return this.pdfService.renderTableDocument({
      logo,
      title: `Balancete de ${monthLabel(statement.referenceMonth)}`,
      subtitle: `${parish?.name ?? 'Paróquia'}${statement.community ? ` · ${statement.community.name}` : ''} · ${status}`,
      sections: [
        {
          heading: 'Resumo',
          columns: ['', 'Lançamentos', 'Total'],
          widths: [3, 1, 2],
          rows: [
            ['Receitas', String(snap.income.count), money(snap.income.total)],
            ['Despesas', String(snap.expense.count), money(snap.expense.total)],
            ['Saldo do mês', '', money(snap.balance)],
          ],
        },
        { heading: 'Receitas por categoria', columns: ['Categoria', 'Qtd', 'Total'], widths: [3, 1, 2], rows: table(snap.income.byCategory) },
        { heading: 'Despesas por categoria', columns: ['Categoria', 'Qtd', 'Total'], widths: [3, 1, 2], rows: table(snap.expense.byCategory) },
        { heading: 'Despesas por centro de custo', columns: ['Centro de custo', 'Qtd', 'Total'], widths: [3, 1, 2], rows: table(snap.expense.byCostCenter) },
        ...(snap.campaigns.length
          ? [{ heading: 'Campanhas e fundos', columns: ['Campanha', 'Arrecadado no mês'], widths: [3, 2], rows: snap.campaigns.map((c) => [c.name, money(c.total)]) }]
          : []),
        ...(statement.notes ? [{ heading: 'Mensagem do Conselho', columns: [''], rows: [[statement.notes]] }] : []),
      ],
      signatureLines: ['Pároco', 'Conselho de Assuntos Econômicos'],
      footer: `Emitido pelo Parish em ${day(new Date())} — sem dados individuais de dizimistas`,
    });
  }

  async pdfForManage(user: CurrentUser, id: string): Promise<Buffer> {
    const statement = await this.load(user, id);
    if (!(statement.communityId === null && statement.status === 'PUBLISHED' && user.parishId === statement.parishId)) {
      await this.assertScope(user, statement.parishId, statement.communityId);
    }
    return this.pdf(statement);
  }

  // ===== FIEL (publicados) =====

  private async memberOf(user: CurrentUser) {
    const member = await this.prisma.member.findFirst({
      where: { userId: user.id, deletedAt: null },
      select: { communityId: true, community: { select: { parishId: true } } },
    });
    if (!member?.community) throw new NotFoundException('Vincule-se a uma comunidade para ver os balancetes');
    return member;
  }

  async listPublished(user: CurrentUser) {
    const member = await this.memberOf(user);
    const rows = await this.prisma.financialStatement.findMany({
      where: {
        parishId: member.community.parishId,
        status: 'PUBLISHED',
        OR: [{ communityId: null }, ...(member.communityId ? [{ communityId: member.communityId }] : [])],
      },
      orderBy: [{ referenceMonth: 'desc' }, { communityId: 'asc' }],
      include: this.include,
      take: MONTHS_BACK * 2,
    });
    return rows.map((r) => this.present(r));
  }

  async publishedPdf(user: CurrentUser, id: string): Promise<Buffer> {
    const member = await this.memberOf(user);
    const statement = await this.prisma.financialStatement.findFirst({
      where: {
        id,
        status: 'PUBLISHED',
        parishId: member.community.parishId,
        OR: [{ communityId: null }, ...(member.communityId ? [{ communityId: member.communityId }] : [])],
      },
      include: this.include,
    });
    if (!statement) throw new NotFoundException('Balancete não encontrado');
    return this.pdf(statement);
  }
}
