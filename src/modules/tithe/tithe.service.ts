import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, TransactionType, UserRole } from '@prisma/client';
import * as QRCode from 'qrcode';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser, HierarchyService } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PdfService } from '../pdf/pdf.service';
import { buildPixBrCode, normalizeAscii, normalizePixKey, validatePixKey } from './pix-brcode';

const FINANCE_ROLES: UserRole[] = [
  UserRole.SYSTEM_ADMIN,
  UserRole.DIOCESAN_ADMIN,
  UserRole.PARISH_ADMIN,
  UserRole.COMMUNITY_COORDINATOR,
];

const MAX_AMOUNT = 50000;
const MAX_OPEN_INTENTS = 5;
// Freios por membro em 24h (cancelar não libera vaga; declarar não vira spam)
const MAX_INTENTS_PER_DAY = 10;
const MAX_DECLARES_PER_DAY = 5;
const RENOTIFY_MINUTES = 10;

/**
 * Dízimo online — Fase 1 (Pix da própria paróquia, sem gateway):
 * o fiel gera um Pix copia-e-cola com valor + txid, paga no banco dele, marca
 * "já fiz o Pix"; a tesouraria confere no extrato e confirma → vira
 * contribuição de dizimista + lançamento no Financeiro. Fase 2 (gateway com
 * webhook) entra pelo campo method=GATEWAY/providerRef sem mudar o fluxo.
 */
@Injectable()
export class TitheService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly pdfService: PdfService,
  ) {}

  private auditActor(user: CurrentUser) {
    return { id: user.id, email: user.email, role: user.role };
  }

  private canManage(role: UserRole) {
    return FINANCE_ROLES.includes(role);
  }

  private currentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private async resolveMember(user: CurrentUser) {
    const member = await this.prisma.member.findFirst({
      where: { userId: user.id, deletedAt: null },
      select: {
        id: true,
        fullName: true,
        communityId: true,
        community: { select: { id: true, name: true, parishId: true } },
      },
    });
    if (!member) {
      throw new BadRequestException('Seu usuário ainda não tem cadastro de membro — procure a secretaria');
    }
    return member;
  }

  private parishConfigSelect = {
    id: true,
    name: true,
    city: true,
    logoUrl: true,
    titheEnabled: true,
    pixKey: true,
    pixKeyType: true,
    pixMerchantName: true,
    pixMerchantCity: true,
    titheMessage: true,
  } as const;

  // ===== CONFIGURAÇÃO (administração paroquial) =====

  private async assertParishAdmin(user: CurrentUser, parishId: string) {
    if (user.role === UserRole.SYSTEM_ADMIN) return;
    if (user.role === UserRole.DIOCESAN_ADMIN) {
      const parish = await this.prisma.parish.findUnique({ where: { id: parishId }, select: { dioceseId: true } });
      if (parish?.dioceseId === user.dioceseId) return;
    }
    if (user.role === UserRole.PARISH_ADMIN && user.parishId === parishId) return;
    throw new ForbiddenException('Somente a administração da paróquia configura o dízimo online');
  }

  private resolveParishId(user: CurrentUser, parishId?: string): string {
    const target = parishId || user.parishId;
    if (!target) throw new BadRequestException('Informe a paróquia');
    return target;
  }

  async getConfig(user: CurrentUser, parishId?: string) {
    const target = this.resolveParishId(user, parishId);
    await this.assertParishAdmin(user, target);
    const parish = await this.prisma.parish.findUnique({ where: { id: target }, select: this.parishConfigSelect });
    if (!parish) throw new NotFoundException('Paróquia não encontrada');
    const preview =
      parish.pixKey && parish.pixMerchantName && parish.pixMerchantCity
        ? buildPixBrCode({
            key: parish.pixKey,
            merchantName: parish.pixMerchantName,
            merchantCity: parish.pixMerchantCity,
            txid: 'PREVIEW',
            description: 'Dizimo',
          })
        : null;
    return { ...parish, brCodePreview: preview };
  }

  async updateConfig(
    user: CurrentUser,
    dto: {
      parishId?: string;
      titheEnabled?: boolean;
      pixKey?: string | null;
      pixKeyType?: string | null;
      pixMerchantName?: string | null;
      pixMerchantCity?: string | null;
      titheMessage?: string | null;
    },
  ) {
    const target = this.resolveParishId(user, dto.parishId);
    await this.assertParishAdmin(user, target);
    const current = await this.prisma.parish.findUnique({ where: { id: target }, select: this.parishConfigSelect });
    if (!current) throw new NotFoundException('Paróquia não encontrada');

    const pixKeyType = dto.pixKeyType !== undefined ? (dto.pixKeyType ?? '').trim().toUpperCase() || null : current.pixKeyType;
    const rawKey = dto.pixKey !== undefined ? (dto.pixKey ?? '').trim() || null : current.pixKey;
    // Grava no formato do DICT (minúsculas para e-mail/aleatória, CNPJ maiúsculo)
    const pixKey = rawKey ? normalizePixKey(pixKeyType, rawKey) : null;
    const pixMerchantName =
      dto.pixMerchantName !== undefined
        ? normalizeAscii(dto.pixMerchantName ?? '', 25) || null
        : current.pixMerchantName;
    const pixMerchantCity =
      dto.pixMerchantCity !== undefined
        ? normalizeAscii(dto.pixMerchantCity ?? '', 15).toUpperCase() || null
        : current.pixMerchantCity;
    const titheMessage =
      dto.titheMessage !== undefined ? (dto.titheMessage ?? '').trim().slice(0, 500) || null : current.titheMessage;
    const titheEnabled = dto.titheEnabled !== undefined ? !!dto.titheEnabled : current.titheEnabled;

    if (pixKey) {
      const error = validatePixKey(pixKeyType, pixKey);
      if (error) throw new BadRequestException(error);
    }
    if (titheEnabled && (!pixKey || !pixMerchantName || !pixMerchantCity)) {
      throw new BadRequestException('Para ativar, informe chave Pix, nome do recebedor e cidade');
    }

    const updated = await this.prisma.parish.update({
      where: { id: target },
      data: { pixKey, pixKeyType, pixMerchantName, pixMerchantCity, titheMessage, titheEnabled },
      select: this.parishConfigSelect,
    });
    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'UPDATE',
      entity: 'ParishTitheConfig',
      entityId: target,
      before: {
        titheEnabled: current.titheEnabled,
        pixKey: current.pixKey,
        pixKeyType: current.pixKeyType,
        pixMerchantName: current.pixMerchantName,
        pixMerchantCity: current.pixMerchantCity,
      },
      after: { titheEnabled, pixKey, pixKeyType, pixMerchantName, pixMerchantCity },
    });
    return this.getConfig(user, target);
  }

  // ===== FIEL =====

  /** Visão do fiel: paróquia (config), situação de dizimista, Pix recentes e contribuições. */
  async getMyTithe(user: CurrentUser) {
    const member = await this.resolveMember(user);
    const parish = await this.prisma.parish.findUnique({
      where: { id: member.community.parishId },
      select: this.parishConfigSelect,
    });
    const [tither, intents] = await Promise.all([
      this.prisma.tither.findUnique({
        where: { memberId: member.id },
        select: {
          registrationNumber: true,
          joinedAt: true,
          status: true,
          contributions: {
            orderBy: { date: 'desc' },
            take: 12,
            select: { id: true, amount: true, date: true, referenceMonth: true, method: true, receiptNumber: true },
          },
        },
      }),
      this.prisma.titheIntent.findMany({
        where: { memberId: member.id },
        orderBy: { createdAt: 'desc' },
        take: 12,
        select: {
          id: true,
          amount: true,
          referenceMonth: true,
          kind: true,
          status: true,
          txid: true,
          note: true,
          declaredAt: true,
          confirmedAt: true,
          createdAt: true,
        },
      }),
    ]);
    const lastAmount = intents.find((i) => i.status === 'CONFIRMED')?.amount ?? tither?.contributions[0]?.amount ?? null;
    return {
      member: { id: member.id, fullName: member.fullName, community: member.community.name },
      parish: parish
        ? {
            id: parish.id,
            name: parish.name,
            titheEnabled: parish.titheEnabled,
            titheMessage: parish.titheMessage,
            pixKeyType: parish.pixKeyType,
            // A chave é pública por natureza (é para ela que o fiel paga)
            pixKey: parish.titheEnabled ? parish.pixKey : null,
            merchantName: parish.pixMerchantName,
          }
        : null,
      tither: tither
        ? { registrationNumber: tither.registrationNumber, joinedAt: tither.joinedAt, status: tither.status }
        : null,
      contributions: tither?.contributions ?? [],
      intents,
      suggestedAmount: lastAmount,
      currentMonth: this.currentMonth(),
    };
  }

  private newTxid(): string {
    const stamp = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `PAR${stamp}${rand}`.replace(/[^A-Z0-9]/g, '').slice(0, 25);
  }

  /** Gera o Pix (BR Code + QR) para o valor/mês escolhidos. */
  async createIntent(user: CurrentUser, dto: { amount: number; referenceMonth?: string; kind?: string }) {
    const member = await this.resolveMember(user);
    const parish = await this.prisma.parish.findUnique({
      where: { id: member.community.parishId },
      select: this.parishConfigSelect,
    });
    if (!parish?.titheEnabled || !parish.pixKey || !parish.pixMerchantName || !parish.pixMerchantCity) {
      throw new BadRequestException('Sua paróquia ainda não ativou o dízimo pelo app');
    }
    const amount = Math.round(Number(dto.amount) * 100) / 100;
    if (!Number.isFinite(amount) || amount < 1 || amount > MAX_AMOUNT) {
      throw new BadRequestException(`Informe um valor entre R$ 1,00 e R$ ${MAX_AMOUNT.toLocaleString('pt-BR')}`);
    }
    const kind = dto.kind === 'OFFERING' ? 'OFFERING' : 'TITHE';
    const referenceMonth = (dto.referenceMonth ?? this.currentMonth()).trim();
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(referenceMonth)) {
      throw new BadRequestException('Mês de referência inválido (use AAAA-MM)');
    }
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [open, createdToday] = await Promise.all([
      this.prisma.titheIntent.count({ where: { memberId: member.id, status: { in: ['CREATED', 'DECLARED'] } } }),
      this.prisma.titheIntent.count({ where: { memberId: member.id, createdAt: { gte: since } } }),
    ]);
    if (open >= MAX_OPEN_INTENTS) {
      throw new BadRequestException('Você tem Pix em aberto demais — aguarde a conferência ou cancele os antigos');
    }
    if (createdToday >= MAX_INTENTS_PER_DAY) {
      throw new BadRequestException('Limite diário de Pix gerados atingido — tente amanhã');
    }

    const txid = this.newTxid();
    const description = `${kind === 'TITHE' ? 'Dizimo' : 'Oferta'} ${referenceMonth}`;
    const brCode = buildPixBrCode({
      key: parish.pixKey,
      merchantName: parish.pixMerchantName,
      merchantCity: parish.pixMerchantCity,
      amount,
      txid,
      description,
    });
    const intent = await this.prisma.titheIntent.create({
      data: {
        memberId: member.id,
        parishId: parish.id,
        communityId: member.communityId,
        amount,
        referenceMonth,
        kind,
        method: 'PIX_STATIC',
        txid,
        brCode,
      },
    });
    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'CREATE',
      entity: 'TitheIntent',
      entityId: intent.id,
      metadata: { amount, referenceMonth, kind, txid },
    });
    return this.presentIntent(intent, true);
  }

  private async presentIntent(intent: any, withQr = false) {
    const base = {
      id: intent.id,
      amount: intent.amount,
      referenceMonth: intent.referenceMonth,
      kind: intent.kind,
      status: intent.status,
      txid: intent.txid,
      brCode: intent.brCode,
      note: intent.note,
      declaredAt: intent.declaredAt,
      confirmedAt: intent.confirmedAt,
      createdAt: intent.createdAt,
    };
    if (!withQr || !intent.brCode) return base;
    const qrDataUrl = await QRCode.toDataURL(intent.brCode, { margin: 1, width: 360, errorCorrectionLevel: 'M' });
    return { ...base, qrDataUrl };
  }

  private async loadOwnIntent(id: string, user: CurrentUser) {
    const member = await this.resolveMember(user);
    const intent = await this.prisma.titheIntent.findFirst({ where: { id, memberId: member.id } });
    if (!intent) throw new NotFoundException('Pix não encontrado');
    return { member, intent };
  }

  async getIntent(id: string, user: CurrentUser) {
    const { intent } = await this.loadOwnIntent(id, user);
    return this.presentIntent(intent, intent.status === 'CREATED' || intent.status === 'DECLARED');
  }

  /** Fiel avisa que pagou — a tesouraria confere no extrato. */
  async declareIntent(id: string, user: CurrentUser) {
    const { member, intent } = await this.loadOwnIntent(id, user);
    if (intent.status !== 'CREATED') {
      throw new BadRequestException('Este Pix já foi informado ou encerrado');
    }
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const declaredToday = await this.prisma.titheIntent.count({
      where: { memberId: member.id, declaredAt: { gte: since } },
    });
    if (declaredToday >= MAX_DECLARES_PER_DAY) {
      throw new BadRequestException('Limite diário de Pix informados atingido — a tesouraria já foi avisada dos anteriores');
    }
    // Transição atômica: só sai de CREATED uma vez (dois toques não duplicam)
    const now = new Date();
    const moved = await this.prisma.titheIntent.updateMany({
      where: { id, status: 'CREATED' },
      data: { status: 'DECLARED', declaredAt: now },
    });
    if (moved.count !== 1) throw new BadRequestException('Este Pix já foi informado ou encerrado');
    const updated = await this.prisma.titheIntent.findUniqueOrThrow({ where: { id } });
    // Um aviso por membro a cada 10 min — vários Pix seguidos não viram spam
    const recentlyNotified = await this.prisma.titheIntent.count({
      where: {
        memberId: member.id,
        id: { not: id },
        declaredAt: { gte: new Date(now.getTime() - RENOTIFY_MINUTES * 60 * 1000) },
      },
    });
    if (recentlyNotified > 0) return this.presentIntent(updated);
    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'UPDATE',
      entity: 'TitheIntent',
      entityId: id,
      before: { status: 'CREATED' },
      after: { status: 'DECLARED' },
    });
    // Tesouraria da comunidade/paróquia recebe para conciliar (best-effort)
    try {
      const recipients = await this.prisma.user.findMany({
        where: {
          isActive: true,
          OR: [
            ...(member.communityId ? [{ communityId: member.communityId, role: UserRole.COMMUNITY_COORDINATOR }] : []),
            { parishId: intent.parishId, role: UserRole.PARISH_ADMIN },
          ],
        },
        select: { id: true },
      });
      if (recipients.length) {
        await this.notificationsService.notifyUsers(
          recipients.map((u) => u.id),
          NotificationType.TITHE,
          'Pix de dízimo a conferir',
          `${member.fullName} informou um Pix de R$ ${intent.amount.toFixed(2).replace('.', ',')} (${intent.referenceMonth}, id ${intent.txid}). Confira no extrato e confirme no Financeiro.`,
          { kind: 'tithe-declared', intentId: id },
        );
      }
    } catch {
      // aviso é conveniência
    }
    return this.presentIntent(updated);
  }

  async cancelIntent(id: string, user: CurrentUser) {
    const { intent } = await this.loadOwnIntent(id, user);
    if (intent.status === 'CONFIRMED') {
      throw new BadRequestException('Contribuição já confirmada — fale com a tesouraria');
    }
    if (intent.status === 'CANCELLED') return this.presentIntent(intent);
    const moved = await this.prisma.titheIntent.updateMany({
      where: { id, status: { in: ['CREATED', 'DECLARED'] } },
      data: { status: 'CANCELLED', note: 'Cancelado pelo fiel' },
    });
    if (moved.count !== 1) {
      throw new BadRequestException('Este Pix já foi confirmado pela tesouraria — fale com a secretaria');
    }
    const updated = await this.prisma.titheIntent.findUniqueOrThrow({ where: { id } });
    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'UPDATE',
      entity: 'TitheIntent',
      entityId: id,
      before: { status: intent.status },
      after: { status: 'CANCELLED' },
    });
    return this.presentIntent(updated);
  }

  // ===== TESOURARIA =====

  private async financeScope(user: CurrentUser): Promise<{ communityIds?: string[]; parishIds?: string[] }> {
    if (user.role === UserRole.SYSTEM_ADMIN) return {};
    if (user.role === UserRole.DIOCESAN_ADMIN && user.dioceseId) {
      const parishes = await this.prisma.parish.findMany({ where: { dioceseId: user.dioceseId }, select: { id: true } });
      return { parishIds: parishes.map((p) => p.id) };
    }
    if (user.role === UserRole.PARISH_ADMIN && user.parishId) return { parishIds: [user.parishId] };
    const linked = (user.communities ?? []).filter((c) => c.isActive !== false).map((c) => c.communityId);
    return { communityIds: [...new Set([user.communityId, ...linked].filter((id): id is string => !!id))] };
  }

  async listIntents(user: CurrentUser, filters: { status?: string; communityId?: string; referenceMonth?: string }) {
    if (!this.canManage(user.role)) throw new ForbiddenException('Sem permissão financeira');
    const scope = await this.financeScope(user);
    const where: any = {};
    if (scope.communityIds) where.communityId = { in: scope.communityIds };
    if (scope.parishIds) where.parishId = { in: scope.parishIds };
    if (filters.communityId) {
      if (scope.communityIds && !scope.communityIds.includes(filters.communityId)) {
        throw new ForbiddenException('Comunidade fora do seu escopo');
      }
      where.communityId = filters.communityId;
    }
    const status = (filters.status ?? 'DECLARED').toUpperCase();
    if (status !== 'ALL') {
      where.status = ['CREATED', 'DECLARED', 'CONFIRMED', 'CANCELLED'].includes(status) ? status : 'DECLARED';
    }
    if (filters.referenceMonth) where.referenceMonth = filters.referenceMonth;
    const intents = await this.prisma.titheIntent.findMany({
      where: { ...where, member: { deletedAt: null } },
      include: { member: { select: { id: true, fullName: true, community: { select: { name: true } } } } },
      orderBy: [{ status: 'asc' }, { declaredAt: 'desc' }, { createdAt: 'desc' }],
      take: 300,
    });
    return intents.map((i) => ({
      id: i.id,
      member: { id: i.member.id, fullName: i.member.fullName, community: i.member.community?.name ?? null },
      amount: i.amount,
      referenceMonth: i.referenceMonth,
      kind: i.kind,
      status: i.status,
      txid: i.txid,
      note: i.note,
      declaredAt: i.declaredAt,
      confirmedAt: i.confirmedAt,
      createdAt: i.createdAt,
    }));
  }

  private async loadIntentForFinance(id: string, user: CurrentUser) {
    if (!this.canManage(user.role)) throw new ForbiddenException('Sem permissão financeira');
    const intent = await this.prisma.titheIntent.findUnique({
      where: { id },
      include: {
        member: { select: { id: true, fullName: true, userId: true, communityId: true, deletedAt: true } },
        parish: { select: { id: true, name: true, dioceseId: true } },
      },
    });
    if (!intent || intent.member.deletedAt) throw new NotFoundException('Pix não encontrado');
    // Mesmo recorte da listagem, sobre a FOTOGRAFIA do Pix (comunidade/paróquia
    // que recebeu), não sobre onde o membro está hoje
    const scope = await this.financeScope(user);
    const inScope =
      user.role === UserRole.SYSTEM_ADMIN ||
      (scope.parishIds ? scope.parishIds.includes(intent.parishId) : false) ||
      (scope.communityIds ? !!intent.communityId && scope.communityIds.includes(intent.communityId) : false);
    if (!inScope) throw new ForbiddenException('Fora do seu escopo');
    return intent;
  }

  /** Tesouraria localizou o Pix no extrato: vira contribuição + lançamento no Financeiro. */
  async confirmIntent(id: string, user: CurrentUser, dto: { receiptNumber?: string; date?: string }) {
    const intent = await this.loadIntentForFinance(id, user);
    if (intent.status === 'CONFIRMED') throw new BadRequestException('Já confirmado');
    if (intent.status === 'CANCELLED') throw new BadRequestException('Este Pix foi cancelado');
    // Data do pagamento = dia em que caiu no extrato (date-only, 00:00Z), com
    // fallback no dia em que o fiel avisou — não o instante da conferência
    const toCivilDay = (value: Date) => new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
    let paidAt: Date;
    if (dto.date) {
      const raw = String(dto.date).slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new BadRequestException('Data inválida (use AAAA-MM-DD)');
      paidAt = new Date(`${raw}T00:00:00.000Z`);
      if (Number.isNaN(paidAt.getTime())) throw new BadRequestException('Data inválida');
      if (paidAt.getTime() > Date.now() + 24 * 60 * 60 * 1000) throw new BadRequestException('Data no futuro');
    } else {
      paidAt = toCivilDay(intent.declaredAt ?? new Date());
    }
    const isOffering = intent.kind === 'OFFERING';
    const category = isOffering ? 'Ofertas' : 'Dízimo';

    const result = await this.prisma.$transaction(async (tx) => {
      // Transição atômica ANTES de criar qualquer registro: duas confirmações
      // simultâneas não geram dois lançamentos
      const moved = await tx.titheIntent.updateMany({
        where: { id, status: { in: ['CREATED', 'DECLARED'] } },
        data: { status: 'CONFIRMED', confirmedAt: new Date(), confirmedByUserId: user.id, note: null },
      });
      if (moved.count !== 1) throw new BadRequestException('Este Pix já foi confirmado ou encerrado');
      const financial = await tx.financialTransaction.create({
        data: {
          type: TransactionType.INCOME,
          category,
          amount: intent.amount,
          description: `${category} ${intent.referenceMonth} — ${intent.member.fullName} (Pix app ${intent.txid})`,
          date: paidAt,
          communityId: intent.communityId ?? intent.member.communityId,
          parishId: intent.parishId,
          dioceseId: intent.parish.dioceseId,
        },
      });
      // Oferta avulsa é receita, não dízimo: não cria/reativa dizimista nem
      // entra na contagem mensal de contribuições
      if (isOffering) {
        return tx.titheIntent.findUniqueOrThrow({ where: { id } });
      }
      const tither = await tx.tither.upsert({
        where: { memberId: intent.memberId },
        create: { memberId: intent.memberId },
        update: { status: 'ACTIVE' },
      });
      const contribution = await tx.titheContribution.create({
        data: {
          titherId: tither.id,
          amount: intent.amount,
          date: paidAt,
          referenceMonth: intent.referenceMonth,
          method: 'PIX',
          receiptNumber: (dto.receiptNumber ?? '').trim() || intent.txid,
          financialTransactionId: financial.id,
        },
      });
      return tx.titheIntent.update({ where: { id }, data: { contributionId: contribution.id } });
    });

    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'UPDATE',
      entity: 'TitheIntent',
      entityId: id,
      before: { status: intent.status },
      after: { status: 'CONFIRMED', contributionId: result.contributionId },
      metadata: { amount: intent.amount, referenceMonth: intent.referenceMonth, category },
    });
    if (intent.member.userId) {
      try {
        await this.notificationsService.notifyUsers(
          [intent.member.userId],
          NotificationType.TITHE,
          'Contribuição confirmada 🙏',
          `Seu ${category === 'Dízimo' ? 'dízimo' : 'oferta'} de R$ ${intent.amount.toFixed(2).replace('.', ',')} (${intent.referenceMonth}) foi registrado. Obrigado por sustentar a missão da paróquia.`,
          { kind: 'tithe-confirmed', intentId: id },
        );
      } catch {
        // best-effort
      }
    }
    return this.presentIntent(result);
  }

  /** Tesouraria não localizou o Pix: encerra com motivo (o fiel recebe o aviso). */
  async rejectIntent(id: string, user: CurrentUser, rawReason?: string) {
    const intent = await this.loadIntentForFinance(id, user);
    if (intent.status === 'CONFIRMED') throw new BadRequestException('Já confirmado');
    const reason = (rawReason ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, 300) || 'Pix não localizado no extrato';
    const moved = await this.prisma.titheIntent.updateMany({
      where: { id, status: { in: ['CREATED', 'DECLARED'] } },
      data: { status: 'CANCELLED', note: reason },
    });
    if (moved.count !== 1) throw new BadRequestException('Este Pix já foi confirmado ou encerrado');
    const updated = await this.prisma.titheIntent.findUniqueOrThrow({ where: { id } });
    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'UPDATE',
      entity: 'TitheIntent',
      entityId: id,
      before: { status: intent.status },
      after: { status: 'CANCELLED', note: reason },
    });
    if (intent.member.userId) {
      try {
        await this.notificationsService.notifyUsers(
          [intent.member.userId],
          NotificationType.TITHE,
          'Pix não localizado',
          `Não encontramos o Pix de R$ ${intent.amount.toFixed(2).replace('.', ',')} (id ${intent.txid}): ${reason}. Se você pagou, fale com a secretaria.`,
          { kind: 'tithe-rejected', intentId: id },
        );
      } catch {
        // best-effort
      }
    }
    return this.presentIntent(updated);
  }

  /** Comprovante em PDF (fiel dono ou tesouraria). */
  async receipt(id: string, user: CurrentUser): Promise<Buffer> {
    const intent = await this.prisma.titheIntent.findUnique({
      where: { id },
      include: {
        member: { select: { id: true, fullName: true, userId: true, deletedAt: true } },
        parish: { select: { name: true, logoUrl: true } },
      },
    });
    if (!intent || intent.member.deletedAt) throw new NotFoundException('Pix não encontrado');
    const isOwner = intent.member.userId === user.id;
    if (!isOwner) await this.loadIntentForFinance(id, user);
    if (intent.status !== 'CONFIRMED') throw new BadRequestException('Comprovante só após a confirmação da tesouraria');
    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'EXPORT',
      entity: 'TitheIntent',
      entityId: id,
      metadata: { receipt: true },
    });
    const money = `R$ ${intent.amount.toFixed(2).replace('.', ',')}`;
    const day = (value: Date | null) =>
      value ? value.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—';
    let logo: Buffer | null = null;
    if (intent.parish.logoUrl && /^https:\/\//i.test(intent.parish.logoUrl)) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);
        const response = await fetch(intent.parish.logoUrl, { signal: controller.signal });
        clearTimeout(timer);
        if (response.ok && /image\/(png|jpe?g)/i.test(response.headers.get('content-type') ?? '')) {
          logo = Buffer.from(await response.arrayBuffer());
        }
      } catch {
        logo = null;
      }
    }
    return this.pdfService.renderCertificateDocument({
      logo,
      title: 'Comprovante de Contribuição',
      organization: intent.parish.name,
      subtitle: intent.kind === 'TITHE' ? 'Dízimo' : 'Oferta',
      orientation: 'portrait',
      pages: [
        {
          recipientName: intent.member.fullName,
          bodyParagraphs: [
            `Contribuiu com ${money}`,
            `referente a ${intent.referenceMonth},`,
            `via Pix (id ${intent.txid}), confirmado em ${day(intent.confirmedAt)}.`,
            'Deus lhe pague pela generosidade.',
          ],
          signatureLines: ['Tesouraria Paroquial'],
        },
      ],
      footer: `Emitido pelo Parish em ${day(new Date())}`,
    });
  }
}
