import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, TransactionType, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { isRoleAtLeast } from '../auth/constants/role-hierarchy';
import { TitheService, appMethodLabel, safeName } from './tithe.service';

const MAX_AMOUNT = 50000;
const UNDO_WINDOW_MS = 24 * 60 * 60 * 1000;
/** Meios presenciais (o Pix aqui é o visto no extrato, registrado à mão) */
const PRESENTIAL_METHODS = ['CASH', 'ENVELOPE', 'POS', 'PIX', 'TRANSFER', 'CHECK'] as const;
type PresentialMethod = (typeof PRESENTIAL_METHODS)[number];

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.replace(/[\r\n\t]+/g, ' ').trim().slice(0, max) : '');
const civilDay = (value: Date) =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value);
const maskCpf = (cpf: string | null | undefined) => {
  const d = String(cpf ?? '').replace(/\D/g, '');
  return d.length === 11 ? `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**` : null;
};
const maskPhone = (phone: string | null | undefined) => {
  const d = String(phone ?? '').replace(/\D/g, '');
  return d.length >= 8 ? `(**) *****-${d.slice(-4)}` : null;
};

/**
 * Modo agente (Dízimo D4.2): a tesouraria (ou quem ela autorizar) registra na
 * hora a contribuição presencial — envelope, dinheiro, maquininha, Pix visto no
 * extrato, transferência, cheque — no mesmo histórico do dizimista: vira um
 * TitheIntent CONFIRMED (method MANUAL) liquidado pelo mesmo caminho do app
 * (lançamento financeiro + contribuição + comprovante).
 */
@Injectable()
export class TitheAgentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tithe: TitheService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Recorte de membros que este agente pode atender (mesmo escopo financeiro). */
  private async memberScopeWhere(user: CurrentUser): Promise<Record<string, unknown>> {
    if (!this.tithe.canManage(user.role)) throw new ForbiddenException('Sem permissão financeira');
    const scope = await this.tithe.financeScope(user);
    if (scope.communityIds) return { communityId: { in: scope.communityIds } };
    if (scope.parishIds) return { community: { parishId: { in: scope.parishIds } } };
    return {};
  }

  /** Busca por nome, nº de dizimista, CPF ou telefone (últimos dígitos). */
  async searchMembers(user: CurrentUser, q: unknown) {
    const term = text(q, 80);
    if (term.length < 2) return [];
    const scopeWhere = await this.memberScopeWhere(user);
    const digits = term.replace(/\D/g, '');
    const or: Record<string, unknown>[] = [];
    if (digits.length === 11 && /^[\d.\-\s]+$/.test(term)) {
      const formatted = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
      or.push({ cpf: { in: [digits, formatted] } });
    }
    if (digits.length >= 8 && /^[\d()\-\s+]+$/.test(term)) {
      // Telefone gravado com ou sem máscara ("99876-5432", "998765432"): casa
      // pelos últimos 8 dígitos nas formas contígua e com hífen
      const last8 = digits.slice(-8);
      const variants = new Set<string>([last8, `${last8.slice(0, 4)}-${last8.slice(4)}`]);
      if (digits.length >= 9) variants.add(`${digits.slice(-9, -4)}-${digits.slice(-4)}`);
      for (const v of variants) or.push({ phone: { contains: v } });
    }
    if (/^\d{1,8}$/.test(term)) or.push({ tither: { registrationNumber: term } });
    if (/[^\d()\-\s+.]/.test(term)) or.push({ fullName: { contains: term, mode: 'insensitive' } });
    if (!or.length) return [];
    const members = await this.prisma.member.findMany({
      where: { deletedAt: null, ...scopeWhere, OR: or },
      include: {
        community: { select: { id: true, name: true } },
        tither: {
          select: {
            registrationNumber: true,
            status: true,
            contributions: { orderBy: { date: 'desc' }, take: 1, select: { referenceMonth: true, amount: true, date: true, method: true } },
          },
        },
      },
      orderBy: { fullName: 'asc' },
      take: 20,
    });
    return members.map((m) => ({
      id: m.id,
      fullName: m.fullName,
      community: m.community ? { id: m.community.id, name: m.community.name } : null,
      registrationNumber: m.tither?.registrationNumber ?? null,
      titherStatus: m.tither?.status ?? null,
      cpfMasked: maskCpf(m.cpf),
      phoneMasked: maskPhone(m.phone),
      lastContribution: m.tither?.contributions[0] ?? null,
    }));
  }

  /** Registra e liquida na hora uma contribuição presencial. */
  async register(
    user: CurrentUser,
    dto: {
      memberId: string;
      amount: number;
      kind?: string;
      referenceMonth?: string;
      method: string;
      campaignId?: string | null;
      date?: string;
      note?: string | null;
      receiptNumber?: string | null;
    },
  ) {
    const scopeWhere = await this.memberScopeWhere(user);
    const memberId = typeof dto.memberId === 'string' ? dto.memberId : '';
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, deletedAt: null, ...scopeWhere },
      select: { id: true, fullName: true, userId: true, communityId: true, community: { select: { parishId: true, name: true } } },
    });
    if (!member || !member.community) throw new NotFoundException('Fiel não encontrado no seu escopo');
    const parish = await this.prisma.parish.findUnique({ where: { id: member.community.parishId }, select: { id: true, name: true, dioceseId: true } });
    if (!parish) throw new NotFoundException('Paróquia não encontrada');
    const amount = Math.round(Number(dto.amount) * 100) / 100;
    if (!Number.isFinite(amount) || amount < 1 || amount > MAX_AMOUNT) {
      throw new BadRequestException(`Informe um valor entre R$ 1,00 e R$ ${MAX_AMOUNT.toLocaleString('pt-BR')}`);
    }
    const method = String(dto.method ?? '').toUpperCase() as PresentialMethod;
    if (!PRESENTIAL_METHODS.includes(method)) throw new BadRequestException('Meio inválido — use dinheiro, envelope, maquininha, Pix, transferência ou cheque');
    // Campanha: precisa estar ativa e visível para a comunidade do fiel
    let campaign: { id: string; name: string } | null = null;
    if (dto.campaignId) {
      const now = new Date();
      campaign = await this.prisma.titheCampaign.findFirst({
        where: {
          id: String(dto.campaignId),
          parishId: parish.id,
          status: 'ACTIVE',
          OR: [{ communityId: null }, { communityId: member.communityId }],
          AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }, { OR: [{ startsAt: null }, { startsAt: { lte: now } }] }],
        },
        select: { id: true, name: true },
      });
      if (!campaign) throw new BadRequestException('Campanha encerrada ou indisponível para a comunidade do fiel');
    }
    const kind = campaign || dto.kind === 'OFFERING' ? 'OFFERING' : 'TITHE';
    const referenceMonth = this.tithe.validateReferenceMonth(dto.referenceMonth);
    let paidAt = new Date(`${civilDay(new Date())}T12:00:00.000Z`);
    if (dto.date) {
      const raw = String(dto.date).slice(0, 10);
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
      if (!match) throw new BadRequestException('Data inválida (use AAAA-MM-DD)');
      const probe = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
      if (probe.getUTCMonth() !== Number(match[2]) - 1 || probe.getUTCDate() !== Number(match[3])) throw new BadRequestException('Data inválida');
      paidAt = new Date(`${raw}T12:00:00.000Z`);
      if (paidAt.getTime() > Date.now() + 24 * 60 * 60 * 1000) throw new BadRequestException('Data no futuro');
      if (paidAt.getTime() < Date.now() - 366 * 24 * 60 * 60 * 1000) throw new BadRequestException('Data muito antiga (mais de um ano)');
    }
    const note = text(dto.note, 200) || null;
    const receiptNumber = text(dto.receiptNumber, 40) || undefined;
    const txid = this.tithe.newTxid();
    const intent = await this.prisma.titheIntent.create({
      data: {
        memberId: member.id,
        parishId: parish.id,
        communityId: member.communityId,
        amount,
        referenceMonth,
        kind,
        anonymous: false,
        campaignId: campaign?.id ?? null,
        method: 'MANUAL',
        paymentMethod: method,
        txid,
        brCode: null,
        note,
        declaredAt: paidAt,
      },
    });
    await this.tithe.settleIntent(
      {
        id: intent.id,
        txid,
        kind,
        anonymous: false,
        memberId: member.id,
        communityId: member.communityId,
        parishId: parish.id,
        paymentMethod: method,
        campaignId: campaign?.id ?? null,
        campaign,
        member: { fullName: member.fullName, communityId: member.communityId },
        parish: { dioceseId: parish.dioceseId },
      },
      { paidAt, paidAmount: amount, paidMonth: referenceMonth, byUserId: user.id, receiptNumber, source: 'agent' },
    );
    const settled = await this.prisma.titheIntent.findUniqueOrThrow({ where: { id: intent.id }, include: { campaign: { select: { id: true, name: true } } } });
    await this.auditService.log({
      actor: this.tithe.auditActor(user),
      action: 'CREATE',
      entity: 'TitheIntent',
      entityId: intent.id,
      metadata: { agent: true, memberId: member.id, amount, kind, referenceMonth, method, campaignId: campaign?.id ?? null },
    });
    if (member.userId) {
      try {
        await this.notificationsService.notifyUsers(
          [member.userId],
          NotificationType.TITHE,
          'Contribuição registrada 🙏',
          `${kind === 'OFFERING' ? 'Sua oferta' : 'Seu dízimo'} de R$ ${amount.toFixed(2).replace('.', ',')} (${campaign ? campaign.name : referenceMonth}, ${appMethodLabel(method).toLowerCase()}) foi registrado por ${safeName(parish.name)}. O comprovante está no app. Deus lhe pague!`,
          { kind: 'tithe-confirmed', intentId: intent.id },
        );
      } catch {
        // aviso é conveniência
      }
    }
    return { ...(await this.tithe.presentIntent(settled)), member: { id: member.id, fullName: member.fullName }, canUndo: true };
  }

  /** Últimos lançamentos presenciais deste agente (48h), com janela de desfazer. */
  async recent(user: CurrentUser) {
    if (!this.tithe.canManage(user.role)) throw new ForbiddenException('Sem permissão financeira');
    const since = new Date(Date.now() - 2 * UNDO_WINDOW_MS);
    const intents = await this.prisma.titheIntent.findMany({
      where: { method: 'MANUAL', confirmedByUserId: user.id, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { member: { select: { id: true, fullName: true } }, campaign: { select: { id: true, name: true } } },
    });
    const now = Date.now();
    return intents.map((i) => ({
      id: i.id,
      member: { id: i.member.id, fullName: i.member.fullName },
      amount: i.amountPaid ?? i.amount,
      kind: i.kind,
      referenceMonth: i.referenceMonth,
      paymentMethod: i.paymentMethod,
      campaign: i.campaign ? { id: i.campaign.id, name: i.campaign.name } : null,
      status: i.status,
      confirmedAt: i.confirmedAt,
      canUndo: i.status === 'CONFIRMED' && !!i.confirmedAt && now - i.confirmedAt.getTime() <= UNDO_WINDOW_MS,
    }));
  }

  /** Desfaz um lançamento presencial (24h pelo próprio agente; administração paroquial sem prazo). */
  async undo(user: CurrentUser, id: string) {
    const scopeWhere = await this.memberScopeWhere(user);
    const intent = await this.prisma.titheIntent.findFirst({
      where: { id, method: 'MANUAL', member: { deletedAt: null, ...scopeWhere } },
      include: { member: { select: { id: true, fullName: true, userId: true, communityId: true } }, parish: { select: { dioceseId: true } }, campaign: { select: { name: true } } },
    });
    if (!intent) throw new NotFoundException('Lançamento presencial não encontrado');
    if (intent.status !== 'CONFIRMED') throw new BadRequestException('Este lançamento já foi desfeito');
    const admin = isRoleAtLeast(user.role as UserRole, UserRole.PARISH_ADMIN);
    const mine = intent.confirmedByUserId === user.id;
    const inWindow = !!intent.confirmedAt && Date.now() - intent.confirmedAt.getTime() <= UNDO_WINDOW_MS;
    if (!admin && !(mine && inWindow)) throw new ForbiddenException('Só quem registrou pode desfazer, e dentro de 24 horas — depois disso, a administração paroquial');
    const amount = intent.amountPaid ?? intent.amount;
    const category = intent.kind === 'OFFERING' ? 'Ofertas' : 'Dízimo';
    await this.prisma.$transaction(async (tx) => {
      const moved = await tx.titheIntent.updateMany({
        where: { id, status: 'CONFIRMED' },
        data: { status: 'CANCELLED', note: `Lançamento presencial desfeito por ${safeName(user.email ?? 'tesouraria')}`, contributionId: null },
      });
      if (moved.count !== 1) throw new BadRequestException('Este lançamento já foi desfeito');
      if (intent.contributionId) await tx.titheContribution.deleteMany({ where: { id: intent.contributionId } });
      await tx.financialTransaction.create({
        data: {
          type: TransactionType.EXPENSE,
          category,
          amount,
          description: `Estorno — lançamento presencial desfeito (${appMethodLabel(intent.paymentMethod)} ${intent.txid})`,
          date: new Date(`${civilDay(new Date())}T12:00:00.000Z`),
          communityId: intent.communityId ?? intent.member.communityId,
          parishId: intent.parishId,
          dioceseId: intent.parish.dioceseId,
          campaignId: intent.campaignId ?? null,
          titheIntentId: intent.id,
        },
      });
    });
    await this.auditService.log({
      actor: this.tithe.auditActor(user),
      action: 'UPDATE',
      entity: 'TitheIntent',
      entityId: id,
      before: { status: 'CONFIRMED' },
      after: { status: 'CANCELLED' },
      metadata: { agentUndo: true, amount },
    });
    if (intent.member.userId) {
      try {
        await this.notificationsService.notifyUsers(
          [intent.member.userId],
          NotificationType.TITHE,
          'Lançamento desfeito',
          `O registro de R$ ${amount.toFixed(2).replace('.', ',')} (${intent.campaign ? intent.campaign.name : intent.referenceMonth}) foi desfeito pela tesouraria. Se você contribuiu, fale com a secretaria.`,
          { kind: 'tithe-rejected', intentId: id },
        );
      } catch {
        // best-effort
      }
    }
    return { id, status: 'CANCELLED' };
  }
}
