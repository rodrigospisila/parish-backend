import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { TransactionType, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService, CurrentUser } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';

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
    dto: { type: TransactionType; category: string; amount: number; description?: string; date: string; communityId?: string; accountName?: string },
    user: CurrentUser,
  ) {
    if (!this.canManageFinance(user.role)) throw new ForbiddenException('Sem permissão financeira');
    if (dto.communityId) {
      const inScope = await this.hierarchyService.isCommunityInScope(user, dto.communityId);
      if (!inScope) throw new ForbiddenException('Comunidade fora do seu escopo');
    }
    if (dto.amount <= 0) throw new BadRequestException('Valor deve ser positivo');

    const tx = await this.prisma.financialTransaction.create({
      data: {
        type: dto.type,
        category: dto.category,
        amount: dto.amount,
        description: dto.description ?? null,
        date: new Date(dto.date),
        accountName: dto.accountName ?? null,
        communityId: dto.communityId ?? null,
        parishId: user.parishId ?? null,
        dioceseId: user.dioceseId ?? null,
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
      where.date = {
        ...(filters.from ? { gte: new Date(filters.from) } : {}),
        ...(filters.to ? { lte: new Date(filters.to) } : {}),
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
    const tither = await this.prisma.tither.findUnique({ where: { id: dto.titherId }, include: { member: true } });
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
          date: new Date(dto.date),
          communityId: tither.member.communityId,
          parishId: user.parishId ?? null,
        },
      });
      const contribution = await prisma.titheContribution.create({
        data: {
          titherId: dto.titherId,
          amount: dto.amount,
          date: new Date(dto.date),
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
