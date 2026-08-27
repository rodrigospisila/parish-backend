import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { TransactionType, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService, CurrentUser } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';
import { isRoleAtLeast } from '../auth/constants/role-hierarchy';

/**
 * Dia civil (Brasília) como instante estável às 12:00Z — a mesma convenção do
 * dízimo, para o balancete e os filtros por dia não escorregarem com o fuso.
 * Aceita 'AAAA-MM-DD' ou um instante completo (convertido para o dia em Brasília).
 */
export function civilDate(value: unknown, offsetHours = 12): Date {
  const raw = String(value ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return new Date(`${raw}T${String(offsetHours).padStart(2, '0')}:00:00.000Z`);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) throw new BadRequestException('Data inválida (use AAAA-MM-DD)');
  const day = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(parsed);
  return new Date(`${day}T${String(offsetHours).padStart(2, '0')}:00:00.000Z`);
}

/**
 * Recursos financeiros e dízimo (roadmap 4.3).
 *
 * LIMITE: gestão pastoral ≠ contabilidade oficial da paróquia. Este módulo cobre
 * receitas/despesas por comunidade/evento/projeto e o dízimo com fim pastoral; NÃO
 * substitui o sistema contábil/fiscal oficial.
 *
 * LGPD: dados financeiros INDIVIDUAIS (dízimo por pessoa) são restritos a
 * PARISH_ADMIN+ e ao coordenador da Pastoral do Dízimo. Consentimento em `Member`.
 */
@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
    private readonly auditService: AuditService,
  ) {}

  private canManageFinance(role: UserRole) {
    return (
      role === UserRole.SYSTEM_ADMIN ||
      role === UserRole.DIOCESAN_ADMIN ||
      role === UserRole.PARISH_ADMIN ||
      role === UserRole.COMMUNITY_COORDINATOR
    );
  }

  // ===== TRANSAÇÕES (receitas/despesas) =====

  async createTransaction(
    dto: { type: TransactionType; category: string; amount: number; description?: string; date: string; communityId?: string; parishId?: string; accountName?: string; costCenter?: string | null },
    user: CurrentUser,
  ) {
    if (!this.canManageFinance(user.role)) throw new ForbiddenException('Sem permissão financeira');
    // Paróquia/diocese do lançamento: da comunidade quando informada (admins sem
    // paróquia própria não podem gerar lançamento "sem dono"), senão do usuário
    // ou de um parishId explícito dentro do escopo
    let parishId: string | null = user.parishId ?? null;
    let dioceseId: string | null = user.dioceseId ?? null;
    if (dto.communityId) {
      const inScope = await this.hierarchyService.isCommunityInScope(user, dto.communityId);
      if (!inScope) throw new ForbiddenException('Comunidade fora do seu escopo');
      const community = await this.prisma.community.findUnique({
        where: { id: dto.communityId },
        select: { parishId: true, parish: { select: { dioceseId: true } } },
      });
      if (community) {
        parishId = community.parishId;
        dioceseId = community.parish?.dioceseId ?? dioceseId;
      }
    } else if (dto.parishId && dto.parishId !== parishId) {
      const parish = await this.prisma.parish.findUnique({ where: { id: dto.parishId }, select: { id: true, dioceseId: true } });
      if (!parish) throw new NotFoundException('Paróquia não encontrada');
      const allowed =
        user.role === UserRole.SYSTEM_ADMIN || (user.role === UserRole.DIOCESAN_ADMIN && parish.dioceseId === user.dioceseId);
      if (!allowed) throw new ForbiddenException('Paróquia fora do seu escopo');
      parishId = parish.id;
      dioceseId = parish.dioceseId ?? dioceseId;
    }
    if (dto.amount <= 0) throw new BadRequestException('Valor deve ser positivo');
    // Coordenação lança na própria comunidade; ninguém cria lançamento "sem dono"
    let communityId = dto.communityId ?? null;
    if (!communityId && !isRoleAtLeast(user.role, UserRole.PARISH_ADMIN)) {
      communityId = user.communityId ?? null;
      if (!communityId) throw new BadRequestException('Informe a comunidade do lançamento');
      if (!parishId) {
        const community = await this.prisma.community.findUnique({ where: { id: communityId }, select: { parishId: true, parish: { select: { dioceseId: true } } } });
        parishId = community?.parishId ?? null;
        dioceseId = community?.parish?.dioceseId ?? dioceseId;
      }
    }
    if (!parishId) throw new BadRequestException('Informe a comunidade ou a paróquia do lançamento');

    const tx = await this.prisma.financialTransaction.create({
      data: {
        type: dto.type,
        category: dto.category,
        amount: dto.amount,
        description: dto.description ?? null,
        date: civilDate(dto.date),
        accountName: dto.accountName ?? null,
        costCenter: typeof dto.costCenter === 'string' ? dto.costCenter.replace(/[\r\n\t]+/g, ' ').trim().slice(0, 60) || null : null,
        communityId,
        parishId,
        dioceseId,
      },
    });
    await this.auditService.log({ actor: { id: user.id, email: user.email, role: user.role }, action: 'CREATE', entity: 'FinancialTransaction', entityId: tx.id, metadata: { type: dto.type, category: dto.category } });
    return tx;
  }

  async listTransactions(user: CurrentUser, filters: { communityId?: string; from?: string; to?: string }) {
    if (!this.canManageFinance(user.role)) throw new ForbiddenException('Sem permissão financeira');
    const where: any = {};
    if (filters.communityId) {
      const inScope = await this.hierarchyService.isCommunityInScope(user, filters.communityId);
      if (!inScope) throw new ForbiddenException('Comunidade fora do seu escopo');
      where.communityId = filters.communityId;
    } else if (user.role !== UserRole.SYSTEM_ADMIN) {
      if (user.communityId) where.communityId = user.communityId;
      else if (user.parishId) where.parishId = user.parishId;
    }
    if (filters.from || filters.to) {
      // 'até' é o dia inteiro: lançamentos gravados às 12:00Z do próprio dia entram
      const from = filters.from ? civilDate(filters.from, 0) : null;
      const toRaw = filters.to ? String(filters.to).slice(0, 10) : null;
      const to = toRaw && /^\d{4}-\d{2}-\d{2}$/.test(toRaw) ? new Date(new Date(`${toRaw}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000) : filters.to ? new Date(filters.to) : null;
      where.date = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lt: to } : {}),
      };
    }
    return this.prisma.financialTransaction.findMany({ where, orderBy: { date: 'desc' } });
  }

  /** Prestação de contas: totais de receita/despesa/saldo no escopo. */
  async summary(user: CurrentUser, filters: { communityId?: string; from?: string; to?: string }) {
    const transactions = await this.listTransactions(user, filters);
    const income = transactions.filter((t) => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter((t) => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0);
    return { income, expense, balance: income - expense, count: transactions.length };
  }

  // ===== DÍZIMO =====

  async registerTither(dto: { memberId: string; registrationNumber?: string }, user: CurrentUser) {
    if (!this.canManageFinance(user.role)) throw new ForbiddenException('Sem permissão');
    const member = await this.prisma.member.findFirst({ where: { id: dto.memberId, deletedAt: null } });
    if (!member) throw new NotFoundException('Membro não encontrado');
    const canManage = await this.hierarchyService.canManageMember(user.id, dto.memberId);
    if (!canManage && user.role !== UserRole.SYSTEM_ADMIN) {
      throw new ForbiddenException('Membro fora do seu escopo');
    }

    return this.prisma.tither.upsert({
      where: { memberId: dto.memberId },
      create: { memberId: dto.memberId, registrationNumber: dto.registrationNumber ?? null },
      update: { registrationNumber: dto.registrationNumber ?? undefined, status: 'ACTIVE' },
    });
  }

  /** Dizimistas do escopo do usuário (dados restritos à coordenação — LGPD). */
  async listTithers(user: CurrentUser) {
    if (!this.canManageFinance(user.role)) {
      throw new ForbiddenException('Dados individuais de dízimo são restritos');
    }
    const memberWhere: any = { deletedAt: null };
    if (user.role !== UserRole.SYSTEM_ADMIN) {
      if (user.communityId) memberWhere.communityId = user.communityId;
      else if (user.parishId) memberWhere.community = { parishId: user.parishId };
    }
    return this.prisma.tither.findMany({
      where: { member: memberWhere },
      include: {
        member: { select: { id: true, fullName: true } },
        _count: { select: { contributions: true } },
      },
      orderBy: { member: { fullName: 'asc' } },
    });
  }

  async addContribution(
    dto: { titherId: string; amount: number; date: string; referenceMonth: string; method: string; receiptNumber?: string },
    user: CurrentUser,
  ) {
    if (!this.canManageFinance(user.role)) throw new ForbiddenException('Sem permissão');
    const tither = await this.prisma.tither.findUnique({
      where: { id: dto.titherId },
      include: { member: { include: { community: { select: { parishId: true, parish: { select: { dioceseId: true } } } } } } },
    });
    if (!tither) throw new NotFoundException('Dizimista não encontrado');
    const canManage = await this.hierarchyService.canManageMember(user.id, tither.memberId);
    if (!canManage && user.role !== UserRole.SYSTEM_ADMIN) {
      throw new ForbiddenException('Fora do seu escopo');
    }
    if (dto.amount <= 0) throw new BadRequestException('Valor deve ser positivo');

    // Cada contribuição gera uma transação financeira (categoria "Dízimo")
    const result = await this.prisma.$transaction(async (prisma) => {
      const financial = await prisma.financialTransaction.create({
        data: {
          type: TransactionType.INCOME,
          category: 'Dízimo',
          amount: dto.amount,
          description: `Dízimo ${dto.referenceMonth}`,
          date: civilDate(dto.date),
          communityId: tither.member.communityId,
          // Paróquia/diocese do dizimista (não do token de quem lança)
          parishId: tither.member.community?.parishId ?? user.parishId ?? null,
          dioceseId: tither.member.community?.parish?.dioceseId ?? user.dioceseId ?? null,
        },
      });
      const contribution = await prisma.titheContribution.create({
        data: {
          titherId: dto.titherId,
          amount: dto.amount,
          date: civilDate(dto.date),
          referenceMonth: dto.referenceMonth,
          method: dto.method,
          receiptNumber: dto.receiptNumber ?? null,
          financialTransactionId: financial.id,
        },
      });
      return contribution;
    });

    await this.auditService.log({ actor: { id: user.id, email: user.email, role: user.role }, action: 'CREATE', entity: 'TitheContribution', entityId: result.id, metadata: { titherId: dto.titherId, referenceMonth: dto.referenceMonth } });
    return result;
  }

  /** Contribuintes por mês (dado individual — acesso restrito). */
  async contributionsByMonth(referenceMonth: string, user: CurrentUser) {
    if (!this.canManageFinance(user.role)) {
      throw new ForbiddenException('Dados individuais de dízimo são restritos');
    }
    const rows = await this.prisma.titheContribution.findMany({
      where: { referenceMonth },
      include: { tither: { include: { member: { select: { id: true, fullName: true, communityId: true } } } } },
      orderBy: { date: 'desc' },
    });
    // Filtra ao escopo do usuário
    return rows
      .filter((r) =>
        user.role === UserRole.SYSTEM_ADMIN ||
        !user.communityId ||
        r.tither.member.communityId === user.communityId,
      )
      .map((r) => ({
        contributionId: r.id,
        member: { id: r.tither.member.id, name: r.tither.member.fullName },
        amount: r.amount,
        method: r.method,
        date: r.date,
      }));
  }
}
