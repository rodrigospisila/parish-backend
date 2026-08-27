import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, TransactionType } from '@prisma/client';
import * as QRCode from 'qrcode';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PdfService } from '../pdf/pdf.service';
import { buildPixBrCode, normalizeAscii } from './pix-brcode';
import { TitheService, safeName } from './tithe.service';

const MAX_GOAL = 10_000_000;
const MAX_PLEDGE = 100_000;
const MAX_ENTRY = 1_000_000;
const NOTIFY_LIMIT = 5000;

type CampaignRow = {
  id: string;
  parishId: string;
  communityId: string | null;
  kind: string;
  status: string;
  code: string;
  name: string;
  description: string | null;
  goalAmount: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  allowAnonymous: boolean;
  suggestedAmounts: unknown;
  createdAt: Date;
  closedAt: Date | null;
  community: { id: string; name: string } | null;
};

type Totals = { raised: number; contributors: number; count: number; appTotal: number };

const money = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;
const day = (value: Date | null | undefined) => (value ? value.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—');
const civilDay = (value: Date) =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value);
const text = (value: unknown, max: number) => (typeof value === 'string' ? value.replace(/[\r\n\t]+/g, ' ').trim().slice(0, max) : '');
/** Célula CSV segura: sem quebra de linha e sem fórmula (=, +, -, @) interpretável pelo Excel. */
const csvCell = (v: unknown) => {
  let t = String(v ?? '').replace(/[\r\n]+/g, ' ');
  if (/^[=+\-@\t]/.test(t)) t = `'${t}`;
  return `"${t.replace(/"/g, '""')}"`;
};

/**
 * Fundos e campanhas (Dízimo D4.1): oferta com finalidade — meta, prazo,
 * QR próprio, promessas e split por comunidade. Campanha é da paróquia
 * (ou de uma comunidade); a contribuição é um TitheIntent comum com
 * `campaignId`, e o lançamento financeiro carrega a mesma finalidade
 * (`titheIntentId` diz que veio do app; sem ele é lançamento manual).
 */
@Injectable()
export class TitheCampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tithe: TitheService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly pdfService: PdfService,
  ) {}

  private select = {
    id: true,
    parishId: true,
    communityId: true,
    kind: true,
    status: true,
    code: true,
    name: true,
    description: true,
    goalAmount: true,
    startsAt: true,
    endsAt: true,
    allowAnonymous: true,
    suggestedAmounts: true,
    createdAt: true,
    closedAt: true,
    community: { select: { id: true, name: true } },
  } as const;

  private async newCode(): Promise<string> {
    for (let i = 0; i < 10; i += 1) {
      const code = Math.random().toString(36).slice(2, 8).toUpperCase().replace(/[^A-Z0-9]/g, 'X').padEnd(6, 'X');
      const exists = await this.prisma.titheCampaign.findUnique({ where: { code }, select: { id: true } });
      if (!exists) return code;
    }
    throw new BadRequestException('Não foi possível gerar o código da campanha — tente de novo');
  }

  /** Arrecadado = entradas − saídas com a finalidade; contribuintes = membros distintos pelo app. */
  private async totals(ids: string[]): Promise<Map<string, Totals>> {
    const map = new Map<string, Totals>();
    if (!ids.length) return map;
    const [sums, confirmed] = await Promise.all([
      this.prisma.financialTransaction.groupBy({
        by: ['campaignId', 'type'],
        where: { campaignId: { in: ids } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.titheIntent.findMany({
        where: { campaignId: { in: ids }, status: 'CONFIRMED' },
        select: { campaignId: true, memberId: true, amountPaid: true, amount: true },
      }),
    ]);
    for (const id of ids) map.set(id, { raised: 0, contributors: 0, count: 0, appTotal: 0 });
    for (const row of sums) {
      const entry = map.get(row.campaignId!)!;
      const amount = row._sum.amount ?? 0;
      entry.raised = Math.round((entry.raised + (row.type === TransactionType.INCOME ? amount : -amount)) * 100) / 100;
      if (row.type === TransactionType.INCOME) entry.count += row._count._all;
    }
    const members = new Map<string, Set<string>>();
    for (const i of confirmed) {
      const entry = map.get(i.campaignId!)!;
      entry.appTotal = Math.round((entry.appTotal + (i.amountPaid ?? i.amount)) * 100) / 100;
      if (!members.has(i.campaignId!)) members.set(i.campaignId!, new Set());
      members.get(i.campaignId!)!.add(i.memberId);
    }
    for (const [id, set] of members) map.get(id)!.contributors = set.size;
    return map;
  }

  private present(c: CampaignRow, t?: Totals) {
    const raised = t?.raised ?? 0;
    // 100% só com a meta atingida de fato; abaixo disso nunca arredonda para 100
    const percent =
      c.goalAmount && c.goalAmount > 0 ? (raised >= c.goalAmount ? 100 : Math.min(99.9, Math.floor((raised / c.goalAmount) * 1000) / 10)) : null;
    const now = new Date();
    // Dias em calendário de Brasília: 0 = último dia
    const daysLeft = c.endsAt
      ? Math.max(0, Math.round((Date.parse(`${civilDay(c.endsAt)}T00:00:00Z`) - Date.parse(`${civilDay(now)}T00:00:00Z`)) / 86400000))
      : null;
    const expired = !!c.endsAt && c.endsAt.getTime() < now.getTime();
    const suggested = Array.isArray(c.suggestedAmounts) ? (c.suggestedAmounts as unknown[]).filter((v) => typeof v === 'number') : [];
    return {
      id: c.id,
      parishId: c.parishId,
      communityId: c.communityId,
      community: c.community,
      kind: c.kind,
      status: c.status,
      code: c.code,
      name: c.name,
      description: c.description,
      goalAmount: c.goalAmount,
      startsAt: c.startsAt,
      endsAt: c.endsAt,
      allowAnonymous: c.allowAnonymous,
      suggestedAmounts: suggested,
      raised,
      percent,
      contributors: t?.contributors ?? 0,
      entriesCount: t?.count ?? 0,
      appTotal: t?.appTotal ?? 0,
      daysLeft,
      expired,
      createdAt: c.createdAt,
      closedAt: c.closedAt,
    };
  }

  private visibleWhere(parishId: string, communityId: string | null, now: Date) {
    return {
      parishId,
      status: 'ACTIVE' as const,
      OR: [{ communityId: null }, ...(communityId ? [{ communityId }] : [])],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }, { OR: [{ startsAt: null }, { startsAt: { lte: now } }] }],
    };
  }

  // ===== FIEL =====

  /** Campanhas/fundos ativos visíveis para o fiel (paróquia inteira ou a comunidade dele), com o que ele já deu e prometeu. */
  async listForMember(user: CurrentUser) {
    const member = await this.tithe.resolveMember(user);
    const now = new Date();
    const campaigns = await this.prisma.titheCampaign.findMany({
      where: this.visibleWhere(member.community.parishId, member.communityId, now),
      orderBy: [{ endsAt: 'asc' }, { createdAt: 'desc' }],
      select: this.select,
    });
    const ids = campaigns.map((c) => c.id);
    const [totals, mine, pledges] = await Promise.all([
      this.totals(ids),
      this.prisma.titheIntent.findMany({
        where: { campaignId: { in: ids }, memberId: member.id, status: 'CONFIRMED' },
        select: { campaignId: true, amountPaid: true, amount: true },
      }),
      this.prisma.titheCampaignPledge.findMany({ where: { campaignId: { in: ids }, memberId: member.id, status: 'OPEN' } }),
    ]);
    const myTotals = new Map<string, number>();
    for (const i of mine) myTotals.set(i.campaignId!, Math.round(((myTotals.get(i.campaignId!) ?? 0) + (i.amountPaid ?? i.amount)) * 100) / 100);
    const myPledges = new Map(pledges.map((p) => [p.campaignId, p]));
    return campaigns.map((c) => {
      const myTotal = myTotals.get(c.id) ?? 0;
      const pledge = myPledges.get(c.id);
      return {
        ...this.present(c, totals.get(c.id)),
        myTotal,
        myPledge: pledge ? { amount: pledge.amount, note: pledge.note, fulfilled: myTotal >= pledge.amount } : null,
      };
    });
  }

  private async visibleForMember(user: CurrentUser, id: string) {
    const member = await this.tithe.resolveMember(user);
    const campaign = await this.prisma.titheCampaign.findFirst({
      where: { id, ...this.visibleWhere(member.community.parishId, member.communityId, new Date()) },
      select: this.select,
    });
    if (!campaign) throw new NotFoundException('Campanha encerrada ou indisponível para a sua comunidade');
    return { member, campaign };
  }

  /** Promessa (upsert): o cumprimento é calculado pelas contribuições confirmadas. */
  async setPledge(user: CurrentUser, id: string, dto: { amount: number; note?: string | null }) {
    const { member, campaign } = await this.visibleForMember(user, id);
    const amount = Math.round(Number(dto.amount) * 100) / 100;
    if (!Number.isFinite(amount) || amount < 1 || amount > MAX_PLEDGE) {
      throw new BadRequestException(`Informe um valor entre R$ 1,00 e ${money(MAX_PLEDGE)}`);
    }
    const note = text(dto.note, 200) || null;
    const pledge = await this.prisma.titheCampaignPledge.upsert({
      where: { campaignId_memberId: { campaignId: campaign.id, memberId: member.id } },
      create: { campaignId: campaign.id, memberId: member.id, amount, note },
      update: { amount, note, status: 'OPEN' },
    });
    await this.auditService.log({
      actor: this.tithe.auditActor(user),
      action: 'UPDATE',
      entity: 'TitheCampaignPledge',
      entityId: pledge.id,
      metadata: { campaignId: campaign.id, amount },
    });
    const given = await this.prisma.titheIntent.aggregate({
      where: { campaignId: campaign.id, memberId: member.id, status: 'CONFIRMED' },
      _sum: { amountPaid: true },
    });
    const myTotal = given._sum.amountPaid ?? 0;
    return { amount: pledge.amount, note: pledge.note, fulfilled: myTotal >= pledge.amount, myTotal };
  }

  async cancelPledge(user: CurrentUser, id: string) {
    const member = await this.tithe.resolveMember(user);
    const result = await this.prisma.titheCampaignPledge.updateMany({
      where: { campaignId: id, memberId: member.id, status: 'OPEN' },
      data: { status: 'CANCELLED' },
    });
    return { cancelled: result.count > 0 };
  }

  /** QR próprio da campanha (Pix estático da paróquia, sem valor) para o fiel compartilhar. */
  async shareQr(user: CurrentUser, id: string) {
    const { campaign } = await this.visibleForMember(user, id);
    return this.staticQr(campaign);
  }

  private async staticQr(campaign: CampaignRow) {
    const parish = await this.tithe.parishFor(campaign.parishId);
    if (!this.tithe.parishUsable(parish)) throw new BadRequestException('A paróquia ainda não ativou o Pix pelo app');
    const brCode = buildPixBrCode({
      key: parish!.pixKey!,
      merchantName: parish!.pixMerchantName!,
      merchantCity: parish!.pixMerchantCity!,
      txid: `CP${campaign.code}`.slice(0, 25),
      description: normalizeAscii(campaign.name, 20) || 'Campanha',
    });
    const qrDataUrl = await QRCode.toDataURL(brCode, { margin: 1, width: 360, errorCorrectionLevel: 'M' });
    return { brCode, qrDataUrl, name: campaign.name, code: campaign.code, parish: parish!.name, pixKey: parish!.pixKey, merchantName: parish!.pixMerchantName };
  }

  // ===== GESTÃO (tesouraria) =====

  /** Quem gerencia: tesouraria no escopo; coordenação de comunidade só na própria comunidade. */
  private async assertManage(user: CurrentUser, parishId: string, communityId: string | null) {
    if (!this.tithe.canManage(user.role)) throw new ForbiddenException('Sem permissão financeira');
    const scope = await this.tithe.financeScope(user);
    if (scope.parishIds && !scope.parishIds.includes(parishId)) throw new ForbiddenException('Paróquia fora do seu escopo');
    if (scope.communityIds) {
      if (!communityId) throw new ForbiddenException('Coordenação de comunidade gerencia campanhas só da própria comunidade');
      if (!scope.communityIds.includes(communityId)) throw new ForbiddenException('Comunidade fora do seu escopo');
    }
  }

  /** Quem lê relatório/cartaz: além de quem gerencia, a coordenação lê campanha da paróquia inteira (a parte da comunidade dela). */
  private async assertRead(user: CurrentUser, parishId: string, communityId: string | null) {
    if (!this.tithe.canManage(user.role)) throw new ForbiddenException('Sem permissão financeira');
    const scope = await this.tithe.financeScope(user);
    if (scope.parishIds && !scope.parishIds.includes(parishId)) throw new ForbiddenException('Paróquia fora do seu escopo');
    if (scope.communityIds) {
      const own = !!communityId && scope.communityIds.includes(communityId);
      const parishWide = !communityId && !!user.parishId && user.parishId === parishId;
      if (!own && !parishWide) throw new ForbiddenException('Campanha fora do seu escopo');
    }
  }

  private async loadForManage(user: CurrentUser, id: string) {
    const campaign = await this.prisma.titheCampaign.findUnique({ where: { id }, select: this.select });
    if (!campaign) throw new NotFoundException('Campanha não encontrada');
    await this.assertManage(user, campaign.parishId, campaign.communityId);
    return campaign;
  }

  private async loadForRead(user: CurrentUser, id: string) {
    const campaign = await this.prisma.titheCampaign.findUnique({ where: { id }, select: this.select });
    if (!campaign) throw new NotFoundException('Campanha não encontrada');
    await this.assertRead(user, campaign.parishId, campaign.communityId);
    return campaign;
  }

  async listManage(user: CurrentUser, filters: { parishId?: string; status?: string }) {
    if (!this.tithe.canManage(user.role)) throw new ForbiddenException('Sem permissão financeira');
    const scope = await this.tithe.financeScope(user);
    const where: any = {};
    if (scope.parishIds) where.parishId = { in: scope.parishIds };
    if (scope.communityIds) {
      // Coordenação vê as da própria comunidade e as da paróquia inteira (para acompanhar a parte dela)
      where.OR = [{ communityId: { in: scope.communityIds } }, ...(user.parishId ? [{ parishId: user.parishId, communityId: null }] : [])];
    }
    if (filters.parishId) {
      if (scope.parishIds && !scope.parishIds.includes(filters.parishId)) throw new ForbiddenException('Paróquia fora do seu escopo');
      where.parishId = filters.parishId;
    }
    const status = (filters.status ?? 'ALL').toUpperCase();
    if (['DRAFT', 'ACTIVE', 'CLOSED'].includes(status)) where.status = status;
    const campaigns = await this.prisma.titheCampaign.findMany({ where, orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], select: this.select, take: 200 });
    const totals = await this.totals(campaigns.map((c) => c.id));
    return campaigns.map((c) => this.present(c, totals.get(c.id)));
  }

  private normalize(dto: {
    name?: unknown;
    description?: unknown;
    kind?: unknown;
    goalAmount?: number | null;
    startsAt?: unknown;
    endsAt?: unknown;
    allowAnonymous?: boolean;
    suggestedAmounts?: unknown;
  }) {
    const out: any = {};
    if (dto.name !== undefined) {
      const name = text(dto.name, 80);
      if (name.length < 3) throw new BadRequestException('Dê um nome à campanha (pelo menos 3 letras)');
      out.name = name;
    }
    if (dto.description !== undefined) out.description = (typeof dto.description === 'string' ? dto.description.trim().slice(0, 1000) : '') || null;
    if (dto.kind !== undefined) out.kind = dto.kind === 'FUND' ? 'FUND' : 'CAMPAIGN';
    if (dto.goalAmount !== undefined) {
      const goal = dto.goalAmount === null || dto.goalAmount === undefined ? null : Math.round(Number(dto.goalAmount) * 100) / 100;
      if (goal !== null && (!Number.isFinite(goal) || goal < 0 || goal > MAX_GOAL)) throw new BadRequestException('Meta inválida');
      out.goalAmount = goal && goal > 0 ? goal : null;
    }
    const parseDate = (value: unknown, endOfDay: boolean) => {
      if (value === null || value === undefined || value === '') return null;
      const raw = String(value).slice(0, 10);
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
      if (!match) throw new BadRequestException('Data inválida (use AAAA-MM-DD)');
      const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
      const probe = new Date(Date.UTC(y, m - 1, d));
      // Calendário real: 31/02 não "rola" para março
      if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) throw new BadRequestException('Data inválida');
      return new Date(`${raw}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}-03:00`);
    };
    if (dto.startsAt !== undefined) out.startsAt = parseDate(dto.startsAt, false);
    if (dto.endsAt !== undefined) out.endsAt = parseDate(dto.endsAt, true);
    if (dto.allowAnonymous !== undefined) out.allowAnonymous = !!dto.allowAnonymous;
    if (dto.suggestedAmounts !== undefined) {
      const list = Array.isArray(dto.suggestedAmounts)
        ? (dto.suggestedAmounts as unknown[])
            .map((v) => Math.round(Number(v) * 100) / 100)
            .filter((v) => Number.isFinite(v) && v >= 1 && v <= 50000)
            .slice(0, 6)
        : [];
      out.suggestedAmounts = list;
    }
    return out;
  }

  async create(
    user: CurrentUser,
    dto: {
      parishId?: string;
      communityId?: string | null;
      name: string;
      description?: string | null;
      kind?: string;
      goalAmount?: number | null;
      startsAt?: string | null;
      endsAt?: string | null;
      allowAnonymous?: boolean;
      suggestedAmounts?: unknown;
      activate?: boolean;
    },
  ) {
    const communityId = typeof dto.communityId === 'string' && dto.communityId ? dto.communityId : null;
    let parishId = (typeof dto.parishId === 'string' && dto.parishId) || user.parishId || null;
    if (communityId) {
      const community = await this.prisma.community.findUnique({ where: { id: communityId }, select: { parishId: true } });
      if (!community) throw new NotFoundException('Comunidade não encontrada');
      if (parishId && community.parishId !== parishId) throw new BadRequestException('A comunidade não pertence a esta paróquia');
      parishId = community.parishId;
    }
    if (!parishId) throw new BadRequestException('Informe a paróquia ou a comunidade da campanha');
    await this.assertManage(user, parishId, communityId);
    const data = this.normalize({ ...dto, name: dto.name ?? '' });
    if (data.startsAt && data.endsAt && data.endsAt < data.startsAt) throw new BadRequestException('O fim precisa ser depois do início');
    const campaign = await this.prisma.titheCampaign.create({
      data: { ...data, parishId, communityId, code: await this.newCode(), createdByUserId: user.id },
      select: this.select,
    });
    await this.auditService.log({
      actor: this.tithe.auditActor(user),
      action: 'CREATE',
      entity: 'TitheCampaign',
      entityId: campaign.id,
      metadata: { name: campaign.name, goalAmount: campaign.goalAmount, communityId, kind: campaign.kind },
    });
    if (dto.activate) return this.activate(user, campaign.id);
    return this.present(campaign);
  }

  async update(user: CurrentUser, id: string, dto: Parameters<TitheCampaignsService['normalize']>[0] & { communityId?: string | null }) {
    const current = await this.loadForManage(user, id);
    if (current.status === 'CLOSED') throw new BadRequestException('Campanha encerrada não pode ser editada');
    const data = this.normalize(dto);
    if (dto.communityId !== undefined) {
      const communityId = typeof dto.communityId === 'string' && dto.communityId ? dto.communityId : null;
      if (communityId !== (current.communityId ?? null)) {
        if (communityId) {
          const community = await this.prisma.community.findUnique({ where: { id: communityId }, select: { parishId: true } });
          if (!community || community.parishId !== current.parishId) throw new BadRequestException('A comunidade não pertence a esta paróquia');
        }
        await this.assertManage(user, current.parishId, communityId);
        if (current.status === 'ACTIVE') {
          // Mudar o público de uma campanha em andamento deixaria promessas e contribuições fora do escopo
          const [intents, pledges] = await Promise.all([
            this.prisma.titheIntent.count({ where: { campaignId: id } }),
            this.prisma.titheCampaignPledge.count({ where: { campaignId: id, status: 'OPEN' } }),
          ]);
          if (intents + pledges > 0) throw new BadRequestException('Campanha ativa com contribuições ou promessas não pode mudar de comunidade — encerre e crie outra');
        }
        data.communityId = communityId;
      }
    }
    const startsAt = data.startsAt !== undefined ? data.startsAt : current.startsAt;
    const endsAt = data.endsAt !== undefined ? data.endsAt : current.endsAt;
    if (startsAt && endsAt && endsAt < startsAt) throw new BadRequestException('O fim precisa ser depois do início');
    if (current.status === 'ACTIVE' && data.endsAt !== undefined && data.endsAt && data.endsAt.getTime() < Date.now()) {
      throw new BadRequestException('O fim não pode ficar no passado em campanha ativa — encerre a campanha em vez disso');
    }
    const updated = await this.prisma.titheCampaign.update({ where: { id }, data, select: this.select });
    await this.auditService.log({ actor: this.tithe.auditActor(user), action: 'UPDATE', entity: 'TitheCampaign', entityId: id, metadata: { fields: Object.keys(data) } });
    const totals = await this.totals([id]);
    return this.present(updated, totals.get(id));
  }

  /** Ativa e avisa os membros (uma vez): paróquia inteira ou só a comunidade. */
  async activate(user: CurrentUser, id: string) {
    const current = await this.loadForManage(user, id);
    if (current.status === 'CLOSED') throw new BadRequestException('Campanha encerrada — crie outra');
    if (current.status === 'ACTIVE') {
      const totals = await this.totals([id]);
      return this.present(current, totals.get(id));
    }
    const now = new Date();
    if (current.endsAt && current.endsAt.getTime() < now.getTime()) throw new BadRequestException('O prazo já passou — ajuste a data de fim antes de ativar');
    // Sem Pix pelo app o fiel não consegue contribuir: a campanha nasceria muda
    const parish = await this.tithe.parishFor(current.parishId);
    if (!this.tithe.parishUsable(parish)) throw new BadRequestException('Ative o dízimo pelo app (chave Pix da paróquia) antes de ativar a campanha');
    const updated = await this.prisma.titheCampaign.update({
      where: { id },
      data: { status: 'ACTIVE', startsAt: current.startsAt ?? now },
      select: this.select,
    });
    await this.auditService.log({ actor: this.tithe.auditActor(user), action: 'UPDATE', entity: 'TitheCampaign', entityId: id, before: { status: current.status }, after: { status: 'ACTIVE' } });
    try {
      const members = await this.prisma.member.findMany({
        where: {
          deletedAt: null,
          userId: { not: null },
          ...(updated.communityId ? { communityId: updated.communityId } : { community: { parishId: updated.parishId } }),
        },
        select: { userId: true },
        take: NOTIFY_LIMIT,
      });
      const ids = members.map((m) => m.userId!).filter(Boolean);
      if (ids.length) {
        const goal = updated.goalAmount ? ` Meta: ${money(updated.goalAmount)}.` : '';
        const until = updated.endsAt ? ` Até ${day(updated.endsAt)}.` : '';
        const from = updated.startsAt && updated.startsAt.getTime() > now.getTime() ? ` A partir de ${day(updated.startsAt)}.` : '';
        await this.notificationsService.notifyUsers(
          ids,
          NotificationType.NEWS,
          `${updated.kind === 'FUND' ? 'Novo fundo' : 'Nova campanha'}: ${updated.name}`,
          `${(updated.description ?? '').slice(0, 140)}${goal}${until}${from} ${from ? 'Contribua' : 'Contribua já'} pelo app, na área do dízimo.`.trim(),
          { kind: 'tithe-campaign', campaignId: id },
        );
      }
    } catch {
      // aviso é conveniência
    }
    const totals = await this.totals([id]);
    return this.present(updated, totals.get(id));
  }

  async close(user: CurrentUser, id: string) {
    const current = await this.loadForManage(user, id);
    if (current.status === 'CLOSED') return this.present(current, (await this.totals([id])).get(id));
    const updated = await this.prisma.titheCampaign.update({ where: { id }, data: { status: 'CLOSED', closedAt: new Date() }, select: this.select });
    await this.auditService.log({ actor: this.tithe.auditActor(user), action: 'UPDATE', entity: 'TitheCampaign', entityId: id, before: { status: current.status }, after: { status: 'CLOSED' } });
    return this.present(updated, (await this.totals([id])).get(id));
  }

  /** Lançamento manual (envelope, dinheiro, transferência) com a finalidade da campanha. */
  async addEntry(
    user: CurrentUser,
    id: string,
    dto: { amount: number; date?: string; description?: string | null; communityId?: string | null; method?: string | null },
  ) {
    const campaign = await this.loadForManage(user, id);
    if (campaign.status === 'DRAFT') throw new BadRequestException('Ative a campanha antes de lançar contribuições');
    if (campaign.status === 'CLOSED') throw new BadRequestException('Campanha encerrada — não recebe mais lançamentos');
    const amount = Math.round(Number(dto.amount) * 100) / 100;
    if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_ENTRY) throw new BadRequestException('Valor inválido');
    let date = new Date();
    if (dto.date) {
      const raw = String(dto.date).slice(0, 10);
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
      if (!match) throw new BadRequestException('Data inválida (use AAAA-MM-DD)');
      const probe = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
      if (probe.getUTCMonth() !== Number(match[2]) - 1 || probe.getUTCDate() !== Number(match[3])) throw new BadRequestException('Data inválida');
      date = new Date(`${raw}T12:00:00.000Z`);
      if (date.getTime() > Date.now() + 24 * 60 * 60 * 1000) throw new BadRequestException('Data no futuro');
      if (date.getTime() < Date.now() - 366 * 24 * 60 * 60 * 1000) throw new BadRequestException('Data muito antiga (mais de um ano)');
    }
    const method = text(dto.method, 30) || 'Dinheiro';
    const description = text(dto.description, 200);
    let communityId = (typeof dto.communityId === 'string' && dto.communityId) || campaign.communityId || null;
    const scope = await this.tithe.financeScope(user);
    if (communityId) {
      const community = await this.prisma.community.findUnique({ where: { id: communityId }, select: { parishId: true } });
      if (!community || community.parishId !== campaign.parishId) throw new BadRequestException('Comunidade fora da paróquia da campanha');
      if (scope.communityIds && !scope.communityIds.includes(communityId)) throw new ForbiddenException('Comunidade fora do seu escopo');
    } else if (scope.communityIds) {
      communityId = scope.communityIds[0] ?? null;
    }
    const parish = await this.prisma.parish.findUnique({ where: { id: campaign.parishId }, select: { dioceseId: true } });
    const entry = await this.prisma.financialTransaction.create({
      data: {
        type: TransactionType.INCOME,
        category: 'Ofertas',
        amount,
        description: `Campanha ${campaign.name} — ${description || method} (manual, ${method})`,
        date,
        communityId,
        parishId: campaign.parishId,
        dioceseId: parish?.dioceseId ?? null,
        campaignId: campaign.id,
      },
    });
    await this.auditService.log({
      actor: this.tithe.auditActor(user),
      action: 'CREATE',
      entity: 'FinancialTransaction',
      entityId: entry.id,
      metadata: { campaignId: campaign.id, amount, method, manual: true },
    });
    return { id: entry.id, amount: entry.amount, date: entry.date, description: entry.description, communityId: entry.communityId };
  }

  /** Estorna um lançamento manual (nunca apaga): saída no mesmo valor, apontando o lançamento estornado. */
  async reverseEntry(user: CurrentUser, id: string, entryId: string) {
    const campaign = await this.loadForManage(user, id);
    const entry = await this.prisma.financialTransaction.findFirst({
      where: { id: entryId, campaignId: id, type: TransactionType.INCOME, titheIntentId: null },
    });
    if (!entry) throw new NotFoundException('Lançamento manual não encontrado nesta campanha');
    const scope = await this.tithe.financeScope(user);
    if (scope.communityIds && entry.communityId && !scope.communityIds.includes(entry.communityId)) throw new ForbiddenException('Comunidade fora do seu escopo');
    const already = await this.prisma.financialTransaction.findFirst({ where: { reversalOfId: entry.id }, select: { id: true } });
    if (already) throw new BadRequestException('Este lançamento já foi estornado');
    const reversal = await this.prisma.financialTransaction.create({
      data: {
        type: TransactionType.EXPENSE,
        category: entry.category,
        amount: entry.amount,
        description: `Estorno — ${entry.description ?? 'lançamento manual'}`.slice(0, 250),
        date: new Date(`${civilDay(new Date())}T12:00:00.000Z`),
        communityId: entry.communityId,
        parishId: entry.parishId,
        dioceseId: entry.dioceseId,
        campaignId: campaign.id,
        reversalOfId: entry.id,
      },
    });
    await this.auditService.log({
      actor: this.tithe.auditActor(user),
      action: 'CREATE',
      entity: 'FinancialTransaction',
      entityId: reversal.id,
      metadata: { campaignId: campaign.id, reversalOf: entry.id, amount: entry.amount },
    });
    return { reversalId: reversal.id };
  }

  /** Relatório: totais, split por comunidade e por meio, promessas, contribuições e lançamentos manuais/estornos. */
  async report(user: CurrentUser, id: string) {
    const campaign = await this.loadForRead(user, id);
    const scope = await this.tithe.financeScope(user);
    const communityFilter = scope.communityIds ? { in: scope.communityIds } : undefined;
    const [totals, transactions, intents, pledges, communities] = await Promise.all([
      this.totals([id]),
      this.prisma.financialTransaction.findMany({
        where: { campaignId: id, ...(communityFilter ? { communityId: communityFilter } : {}) },
        orderBy: { date: 'desc' },
        take: 1000,
        select: { id: true, type: true, amount: true, date: true, description: true, communityId: true, titheIntentId: true, reversalOfId: true },
      }),
      this.prisma.titheIntent.findMany({
        where: { campaignId: id, status: 'CONFIRMED', ...(communityFilter ? { communityId: communityFilter } : {}) },
        orderBy: { confirmedAt: 'desc' },
        take: 1000,
        select: {
          id: true,
          amount: true,
          amountPaid: true,
          anonymous: true,
          paymentMethod: true,
          method: true,
          txid: true,
          confirmedAt: true,
          communityId: true,
          member: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.titheCampaignPledge.findMany({
        where: { campaignId: id, status: 'OPEN', ...(communityFilter ? { member: { communityId: communityFilter } } : {}) },
        select: { memberId: true, amount: true, member: { select: { fullName: true, communityId: true } } },
      }),
      this.prisma.community.findMany({ where: { parishId: campaign.parishId }, select: { id: true, name: true } }),
    ]);
    const nameOf = new Map(communities.map((c) => [c.id, c.name]));
    const byCommunity = new Map<string, number>();
    for (const t of transactions) {
      const key = t.communityId ?? '';
      const signed = t.type === TransactionType.INCOME ? t.amount : -t.amount;
      byCommunity.set(key, Math.round(((byCommunity.get(key) ?? 0) + signed) * 100) / 100);
    }
    const byMethod = new Map<string, { total: number; count: number }>();
    for (const i of intents) {
      const key = i.paymentMethod ?? 'PIX';
      const row = byMethod.get(key) ?? { total: 0, count: 0 };
      row.total = Math.round((row.total + (i.amountPaid ?? i.amount)) * 100) / 100;
      row.count += 1;
      byMethod.set(key, row);
    }
    // Origem: com titheIntentId veio do app; sem ele é manual; EXPENSE é estorno (do app ou de manual)
    const manual = transactions.filter((t) => t.type === TransactionType.INCOME && !t.titheIntentId);
    const reversals = transactions.filter((t) => t.type === TransactionType.EXPENSE);
    const reversedIds = new Set(reversals.map((r) => r.reversalOfId).filter(Boolean));
    const manualReversed = reversals.filter((r) => r.reversalOfId).reduce((sum, r) => sum + r.amount, 0);
    const manualTotal = Math.round((manual.reduce((sum, m) => sum + m.amount, 0) - manualReversed) * 100) / 100;
    if (manual.length) byMethod.set('MANUAL', { total: manualTotal, count: manual.length });
    const t = totals.get(id)!;
    // Promessas: o "já deu" só conta ofertas com nome — oferta anônima não pode ser
    // desanonimizada por aqui (o fiel vê o cumprimento completo no app)
    const givenByMember = new Map<string, number>();
    let anonymousNote = false;
    const pledgeMembers = new Set(pledges.map((p) => p.memberId));
    for (const i of intents) {
      if (i.anonymous) {
        if (pledgeMembers.has(i.member.id)) anonymousNote = true;
        continue;
      }
      givenByMember.set(i.member.id, Math.round(((givenByMember.get(i.member.id) ?? 0) + (i.amountPaid ?? i.amount)) * 100) / 100);
    }
    const pledgeRows = pledges.map((p) => ({
      member: safeName(p.member.fullName),
      community: nameOf.get(p.member.communityId ?? '') ?? '—',
      amount: p.amount,
      given: givenByMember.get(p.memberId) ?? 0,
      fulfilled: (givenByMember.get(p.memberId) ?? 0) >= p.amount,
    }));
    return {
      campaign: this.present(campaign, t),
      raised: t.raised,
      appTotal: t.appTotal,
      manualTotal,
      contributors: t.contributors,
      byCommunity: [...byCommunity.entries()]
        .map(([communityId, total]) => ({ communityId: communityId || null, community: nameOf.get(communityId) ?? (communityId ? '—' : 'Paróquia'), total }))
        .sort((a, b) => b.total - a.total),
      byMethod: [...byMethod.entries()].map(([method, row]) => ({ method, ...row })).sort((a, b) => b.total - a.total),
      pledges: {
        count: pledgeRows.length,
        total: Math.round(pledgeRows.reduce((sum, p) => sum + p.amount, 0) * 100) / 100,
        fulfilled: pledgeRows.filter((p) => p.fulfilled).length,
        anonymousNote,
        rows: pledgeRows.sort((a, b) => b.amount - a.amount).slice(0, 200),
      },
      contributions: intents.map((i) => ({
        id: i.id,
        date: i.confirmedAt,
        amount: i.amountPaid ?? i.amount,
        anonymous: i.anonymous,
        member: i.anonymous ? { id: null, fullName: 'Oferta anônima' } : { id: i.member.id, fullName: safeName(i.member.fullName) },
        method: i.paymentMethod ?? 'PIX',
        community: nameOf.get(i.communityId ?? '') ?? '—',
        txid: i.txid,
      })),
      entries: [...manual, ...reversals]
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .map((e) => ({
          id: e.id,
          date: e.date,
          amount: e.type === TransactionType.INCOME ? e.amount : -e.amount,
          type: e.type,
          source: e.type === TransactionType.INCOME ? 'MANUAL' : 'REVERSAL',
          description: e.description,
          community: nameOf.get(e.communityId ?? '') ?? (e.communityId ? '—' : 'Paróquia'),
          reversed: e.type === TransactionType.INCOME && reversedIds.has(e.id),
          reversalOfId: e.reversalOfId ?? null,
        })),
    };
  }

  /** CSV a partir dos lançamentos (app, manual e estornos): a soma das linhas fecha com o arrecadado. */
  async reportCsv(user: CurrentUser, id: string): Promise<string> {
    const campaign = await this.loadForRead(user, id);
    const scope = await this.tithe.financeScope(user);
    const communityFilter = scope.communityIds ? { in: scope.communityIds } : undefined;
    const [transactions, communities] = await Promise.all([
      this.prisma.financialTransaction.findMany({
        where: { campaignId: id, ...(communityFilter ? { communityId: communityFilter } : {}) },
        orderBy: { date: 'asc' },
        take: 5000,
        select: { id: true, type: true, amount: true, date: true, description: true, communityId: true, titheIntentId: true, reversalOfId: true },
      }),
      this.prisma.community.findMany({ where: { parishId: campaign.parishId }, select: { id: true, name: true } }),
    ]);
    const intentIds = transactions.map((t) => t.titheIntentId).filter((v): v is string => !!v);
    const intents = intentIds.length
      ? await this.prisma.titheIntent.findMany({
          where: { id: { in: intentIds } },
          select: { id: true, anonymous: true, paymentMethod: true, txid: true, member: { select: { fullName: true } } },
        })
      : [];
    const intentOf = new Map(intents.map((i) => [i.id, i]));
    const nameOf = new Map(communities.map((c) => [c.id, c.name]));
    const lines = [['Data', 'Origem', 'Valor', 'Meio', 'Quem', 'Comunidade', 'Descrição'].map(csvCell).join(';')];
    let total = 0;
    for (const t of transactions) {
      const signed = t.type === TransactionType.INCOME ? t.amount : -t.amount;
      total = Math.round((total + signed) * 100) / 100;
      const intent = t.titheIntentId ? intentOf.get(t.titheIntentId) : undefined;
      const origin = t.type === TransactionType.EXPENSE ? 'Estorno' : intent ? 'App' : 'Manual';
      const who = intent ? (intent.anonymous ? 'Oferta anônima' : safeName(intent.member.fullName)) : '';
      const method = intent ? intent.paymentMethod ?? 'PIX' : '';
      lines.push(
        [day(t.date), origin, signed.toFixed(2).replace('.', ','), method, who, nameOf.get(t.communityId ?? '') ?? (t.communityId ? '—' : 'Paróquia'), t.description ?? '']
          .map(csvCell)
          .join(';'),
      );
    }
    lines.push(['', 'Total', total.toFixed(2).replace('.', ','), '', '', '', campaign.name].map(csvCell).join(';'));
    return '\uFEFF' + lines.join('\r\n');
  }

  /** Cartaz com o QR próprio da campanha (Pix estático da paróquia, txid CP+código). */
  async qrPdf(user: CurrentUser, id: string): Promise<Buffer> {
    const campaign = await this.loadForRead(user, id);
    const qr = await this.staticQr(campaign);
    const parish = await this.prisma.parish.findUnique({ where: { id: campaign.parishId }, select: { name: true, logoUrl: true } });
    const png = await QRCode.toBuffer(qr.brCode, { margin: 1, width: 800, errorCorrectionLevel: 'M' });
    const goal = campaign.goalAmount ? `Meta: ${money(campaign.goalAmount)}.` : '';
    const until = campaign.endsAt ? ` Até ${day(campaign.endsAt)}.` : '';
    return this.pdfService.renderCertificateDocument({
      logo: await this.tithe.fetchLogo(parish?.logoUrl),
      title: campaign.name,
      organization: parish?.name ?? 'Paróquia',
      subtitle: campaign.kind === 'FUND' ? 'Fundo — contribua pelo Pix' : 'Campanha — contribua pelo Pix',
      orientation: 'portrait',
      pages: [
        {
          recipientName: 'Aponte a câmera do seu banco',
          bodyParagraphs: [
            ...(campaign.description ? [campaign.description.slice(0, 240)] : []),
            `${goal}${until}`.trim() || 'Escolha o valor no seu banco.',
            `Confira o recebedor: ${qr.merchantName} · chave ${qr.pixKey}`,
            'Pelo app Parish a contribuição já entra na campanha com o seu nome (ou anônima).',
          ].filter(Boolean),
          qrImage: png,
        },
      ],
      footer: `Emitido pelo Parish em ${day(new Date())} · código ${campaign.code}`,
    });
  }
}
