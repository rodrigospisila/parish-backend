import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { randomBytes } from 'crypto';
import * as QRCode from 'qrcode';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';
import { EmailService } from '../messaging/email.service';
import { PdfService } from '../pdf/pdf.service';
import { PaymentsService } from '../payments/payments.service';
import { PAID_STATUSES, PaymentMethod, ProviderCharge } from '../payments/payment-provider.interface';
import { buildPixBrCode, normalizeAscii } from './pix-brcode';
import { TitheService, appMethodLabel, safeName } from './tithe.service';

const MAX_AMOUNT = 50000;
const MAX_OPEN_PER_EMAIL_DAY = 5;
const money = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;
const day = (value: Date | null | undefined) => (value ? value.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—');
const text = (value: unknown, max: number) => (typeof value === 'string' ? value.replace(/[\r\n\t]+/g, ' ').trim().slice(0, max) : '');
const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) && value.length <= 120;
const validCpf = (digits: string) => {
  if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i += 1) sum += Number(digits[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return calc(9) === Number(digits[9]) && calc(10) === Number(digits[10]);
};
const escapeHtml = (value: string) => value.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' })[c] as string);

/**
 * Oferta de visitante (Dízimo D4.6): quem não tem cadastro no Parish doa pela
 * página pública da paróquia — nome, e-mail (e CPF, se quiser cartão/boleto ou
 * confirmação automática) — recebe o Pix/QR e um comprovante por e-mail assim
 * que a oferta é confirmada (webhook do provedor ou tesouraria).
 */
@Injectable()
export class TitheGuestService {
  private readonly logger = new Logger(TitheGuestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tithe: TitheService,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
    private readonly pdfService: PdfService,
    private readonly paymentsService: PaymentsService,
  ) {}

  private newTxid() {
    return `VS${randomBytes(9).toString('base64url').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 22)}`.slice(0, 25);
  }

  private publicWebUrl() {
    return (process.env.PUBLIC_WEB_URL ?? '').replace(/\/$/, '') || null;
  }

  /** Dados públicos da paróquia para a página de doação. */
  async parishPage(parishId: string) {
    const parish = await this.tithe.parishFor(parishId);
    if (!parish) throw new NotFoundException('Paróquia não encontrada');
    const usable = this.tithe.parishUsable(parish);
    const gateway = usable && this.paymentsService.hasProvider(parish);
    const now = new Date();
    const campaigns = usable
      ? await this.prisma.titheCampaign.findMany({
          where: {
            parishId: parish.id,
            communityId: null,
            status: 'ACTIVE',
            AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }, { OR: [{ startsAt: null }, { startsAt: { lte: now } }] }],
          },
          select: { id: true, name: true, description: true, goalAmount: true, endsAt: true, suggestedAmounts: true, kind: true },
          orderBy: [{ endsAt: 'asc' }, { createdAt: 'desc' }],
          take: 10,
        })
      : [];
    return {
      parish: { id: parish.id, name: parish.name, city: parish.city, logoUrl: parish.logoUrl, message: parish.titheMessage },
      available: usable,
      gateway: {
        available: gateway,
        provider: gateway ? parish.paymentProvider : null,
        methods: gateway && parish.paymentProvider === 'ASAAS' ? ['PIX', 'CARD', 'BOLETO'] : gateway ? ['PIX'] : ['PIX'],
        needsCpfForAuto: gateway && parish.paymentProvider === 'ASAAS',
      },
      campaigns: campaigns.map((c) => ({ ...c, suggestedAmounts: Array.isArray(c.suggestedAmounts) ? c.suggestedAmounts : [] })),
      suggestedAmounts: [20, 50, 100, 200],
      recipient: usable ? { merchantName: parish.pixMerchantName, pixKey: parish.pixKey } : null,
    };
  }

  private async presentPublic(gift: any) {
    const open = gift.status === 'CREATED' || gift.status === 'DECLARED';
    const qrDataUrl = open && gift.brCode ? await QRCode.toDataURL(gift.brCode, { margin: 1, width: 360, errorCorrectionLevel: 'M' }) : null;
    return {
      token: gift.receiptToken,
      status: gift.status,
      amount: gift.amount,
      amountPaid: gift.amountPaid ?? null,
      name: gift.name,
      campaign: gift.campaign ? { id: gift.campaign.id, name: gift.campaign.name } : null,
      method: gift.method,
      paymentMethod: gift.paymentMethod,
      txid: gift.txid,
      brCode: open ? gift.brCode : null,
      qrDataUrl,
      paymentUrl: open ? gift.paymentUrl : null,
      boletoUrl: open ? gift.boletoUrl : null,
      boletoLine: open ? gift.boletoLine : null,
      qrExpiresAt: gift.qrExpiresAt,
      declaredAt: gift.declaredAt,
      confirmedAt: gift.confirmedAt,
      receiptSentAt: gift.receiptSentAt,
      createdAt: gift.createdAt,
      note: gift.status === 'CANCELLED' ? gift.note : null,
    };
  }

  /** Cria a oferta (público). Pix estático da paróquia ou cobrança no provedor. */
  async create(
    parishId: string,
    dto: { name?: unknown; email?: unknown; cpf?: unknown; amount?: unknown; campaignId?: unknown; message?: unknown; paymentMethod?: unknown; website?: unknown },
    ip: string | null,
  ) {
    // Honeypot: campo invisível preenchido = robô
    if (typeof dto.website === 'string' && dto.website.trim()) throw new BadRequestException('Não foi possível registrar a oferta');
    const parish = await this.tithe.parishFor(parishId);
    if (!parish || !this.tithe.parishUsable(parish)) throw new BadRequestException('Esta paróquia ainda não recebe ofertas pelo Parish');
    const name = text(dto.name, 80);
    if (name.length < 2) throw new BadRequestException('Informe seu nome');
    const email = text(dto.email, 120).toLowerCase();
    if (!isEmail(email)) throw new BadRequestException('Informe um e-mail válido para receber o comprovante');
    const cpfDigits = text(dto.cpf, 20).replace(/\D/g, '');
    if (cpfDigits && !validCpf(cpfDigits)) throw new BadRequestException('CPF inválido');
    const amount = Math.round(Number(dto.amount) * 100) / 100;
    if (!Number.isFinite(amount) || amount < 1 || amount > MAX_AMOUNT) throw new BadRequestException(`Informe um valor entre R$ 1,00 e R$ ${MAX_AMOUNT.toLocaleString('pt-BR')}`);
    const message = text(dto.message, 200) || null;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const openCount = await this.prisma.titheGuestGift.count({ where: { email, createdAt: { gte: since }, status: { in: ['CREATED', 'DECLARED'] } } });
    if (openCount >= MAX_OPEN_PER_EMAIL_DAY) throw new BadRequestException('Você já tem ofertas em aberto — pague uma delas ou tente amanhã');
    let campaign: { id: string; name: string } | null = null;
    if (typeof dto.campaignId === 'string' && dto.campaignId) {
      const now = new Date();
      campaign = await this.prisma.titheCampaign.findFirst({
        where: {
          id: dto.campaignId,
          parishId: parish.id,
          communityId: null,
          status: 'ACTIVE',
          AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }, { OR: [{ startsAt: null }, { startsAt: { lte: now } }] }],
        },
        select: { id: true, name: true },
      });
      if (!campaign) throw new BadRequestException('Campanha encerrada ou indisponível');
    }
    const wanted = String(dto.paymentMethod ?? 'PIX').toUpperCase();
    const paymentMethod: PaymentMethod = wanted === 'CARD' ? 'CARD' : wanted === 'BOLETO' ? 'BOLETO' : 'PIX';
    const gatewayOk = this.paymentsService.hasProvider(parish) && (parish.paymentProvider !== 'ASAAS' || !!cpfDigits);
    if (paymentMethod !== 'PIX' && (!gatewayOk || parish.paymentProvider !== 'ASAAS')) {
      throw new BadRequestException(cpfDigits ? 'Cartão e boleto não estão disponíveis nesta paróquia' : 'Para cartão ou boleto, informe o CPF');
    }
    const txid = this.newTxid();
    const description = campaign ? normalizeAscii(campaign.name, 20) || 'Oferta' : 'Oferta';
    const token = randomBytes(24).toString('base64url');
    let gift = await this.prisma.titheGuestGift.create({
      data: {
        parishId: parish.id,
        campaignId: campaign?.id ?? null,
        name,
        email,
        cpf: cpfDigits || null,
        amount,
        message,
        method: gatewayOk ? 'GATEWAY' : 'PIX_STATIC',
        paymentMethod,
        txid,
        brCode: gatewayOk
          ? null
          : buildPixBrCode({ key: parish.pixKey!, merchantName: parish.pixMerchantName!, merchantCity: parish.pixMerchantCity!, amount, txid, description }),
        receiptToken: token,
        createdByIp: ip,
      },
      include: { campaign: { select: { id: true, name: true } } },
    });
    if (gatewayOk) {
      try {
        const provider = this.paymentsService.forParish(parish);
        const customer = await provider.ensureCustomer({ cpfCnpj: cpfDigits || null, name, email, externalRef: `guest-${gift.id}` });
        const dueDays = paymentMethod === 'BOLETO' ? 5 : 3;
        const charge = await provider.createCharge({
          providerCustomerId: customer.providerCustomerId,
          method: paymentMethod,
          amount,
          dueDate: this.plusDays(dueDays),
          description: `${description} - ${parish.name}`.slice(0, 120),
          externalRef: `guest-${gift.id}`,
          idempotencyKey: `guest-${gift.id}`,
          payerEmail: email,
          payerCpf: cpfDigits || null,
          expiresInSec: dueDays * 24 * 60 * 60,
        });
        gift = await this.prisma.titheGuestGift.update({
          where: { id: gift.id },
          data: {
            providerRef: charge.providerRef,
            providerStatus: charge.status,
            brCode: charge.qrPayload ?? null,
            paymentUrl: charge.paymentUrl ?? null,
            boletoUrl: charge.boletoUrl ?? null,
            boletoLine: charge.boletoLine ?? null,
            qrExpiresAt: charge.expiresAt ? new Date(charge.expiresAt) : new Date(`${this.plusDays(dueDays)}T23:59:59.000-03:00`),
          },
          include: { campaign: { select: { id: true, name: true } } },
        });
      } catch (error) {
        if (paymentMethod !== 'PIX') {
          await this.prisma.titheGuestGift.update({ where: { id: gift.id }, data: { status: 'CANCELLED', note: 'Provedor indisponível' } });
          throw new BadRequestException(`Não foi possível gerar a cobrança agora: ${String((error as Error)?.message ?? error).slice(0, 160)}`);
        }
        // Provedor fora do ar: Pix estático da paróquia
        gift = await this.prisma.titheGuestGift.update({
          where: { id: gift.id },
          data: {
            method: 'PIX_STATIC',
            brCode: buildPixBrCode({ key: parish.pixKey!, merchantName: parish.pixMerchantName!, merchantCity: parish.pixMerchantCity!, amount, txid, description }),
          },
          include: { campaign: { select: { id: true, name: true } } },
        });
      }
    }
    await this.auditService.log({ actor: null, action: 'CREATE', entity: 'TitheGuestGift', entityId: gift.id, metadata: { parishId: parish.id, amount, method: gift.method, paymentMethod, campaignId: campaign?.id ?? null, ip } });
    return this.presentPublic(gift);
  }

  private plusDays(days: number): string {
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + days * 24 * 60 * 60 * 1000));
  }

  private async byToken(token: string) {
    if (!token || token.length < 16) throw new NotFoundException('Oferta não encontrada');
    const gift = await this.prisma.titheGuestGift.findUnique({ where: { receiptToken: token }, include: { campaign: { select: { id: true, name: true } }, parish: { select: { id: true, name: true, logoUrl: true, dioceseId: true } } } });
    if (!gift) throw new NotFoundException('Oferta não encontrada');
    return gift;
  }

  /** Situação da oferta (público, pelo token); com provedor, sincroniza. */
  async status(token: string) {
    let gift = await this.byToken(token);
    if (gift.method === 'GATEWAY' && gift.providerRef && (gift.status === 'CREATED' || gift.status === 'DECLARED')) {
      const parish = await this.tithe.parishFor(gift.parishId);
      if (parish && this.paymentsService.hasProvider(parish)) {
        try {
          const charge = await this.paymentsService.forParish(parish).getCharge(gift.providerRef);
          await this.applyCharge(gift.id, charge);
          gift = await this.byToken(token);
        } catch {
          // provedor fora do ar: estado local
        }
      }
    }
    return this.presentPublic(gift);
  }

  /** Visitante avisa que pagou (Pix estático) — a tesouraria confere. */
  async declare(token: string) {
    const gift = await this.byToken(token);
    if (gift.status !== 'CREATED') return this.presentPublic(gift);
    if (gift.method === 'GATEWAY') return this.status(token);
    await this.prisma.titheGuestGift.updateMany({ where: { id: gift.id, status: 'CREATED' }, data: { status: 'DECLARED', declaredAt: new Date() } });
    await this.tithe.notifyTreasury(
      { communityId: null, parishId: gift.parishId },
      'Oferta de visitante a conferir',
      `${safeName(gift.name)} (visitante) informou um Pix de ${money(gift.amount)}${gift.campaign ? ` para ${gift.campaign.name}` : ''} (id ${gift.txid}). Confira no extrato e confirme em Financeiro › Visitantes.`,
      { kind: 'tithe-guest', giftId: gift.id },
    );
    return this.presentPublic(await this.byToken(token));
  }

  /** Liquidação (tesouraria ou provedor): lançamento + recibo por e-mail. */
  private async settle(giftId: string, opts: { paidAmount: number; paidAt: Date; byUserId: string | null; source: 'treasury' | 'provider' }) {
    const gift = await this.prisma.titheGuestGift.findUnique({ where: { id: giftId }, include: { campaign: { select: { id: true, name: true } }, parish: { select: { id: true, name: true, dioceseId: true } } } });
    if (!gift) return null;
    const settled = await this.prisma.$transaction(async (tx) => {
      const moved = await tx.titheGuestGift.updateMany({
        where: { id: giftId, status: { in: opts.source === 'provider' ? ['CREATED', 'DECLARED', 'CANCELLED'] : ['CREATED', 'DECLARED'] } },
        data: { status: 'CONFIRMED', confirmedAt: new Date(), confirmedByUserId: opts.byUserId, amountPaid: opts.paidAmount, note: null, ...(opts.source === 'provider' ? { providerStatus: 'paid' } : {}) },
      });
      if (moved.count !== 1) return false;
      const financial = await tx.financialTransaction.create({
        data: {
          type: TransactionType.INCOME,
          category: 'Ofertas',
          amount: opts.paidAmount,
          description: `${gift.campaign ? `Campanha ${gift.campaign.name}` : 'Oferta de visitante'} — ${safeName(gift.name)} (${appMethodLabel(gift.paymentMethod)} ${opts.source === 'provider' ? 'provedor' : 'visitante'} ${gift.txid})`,
          date: opts.paidAt,
          communityId: null,
          parishId: gift.parishId,
          dioceseId: gift.parish.dioceseId,
          campaignId: gift.campaignId,
        },
      });
      await tx.titheGuestGift.update({ where: { id: giftId }, data: { financialTransactionId: financial.id } });
      return true;
    });
    if (!settled) return gift;
    await this.auditService.log({ actor: opts.byUserId ? { id: opts.byUserId } as any : null, action: 'UPDATE', entity: 'TitheGuestGift', entityId: giftId, before: { status: gift.status }, after: { status: 'CONFIRMED' }, metadata: { source: opts.source, paidAmount: opts.paidAmount } });
    await this.sendReceipt(giftId);
    return this.prisma.titheGuestGift.findUnique({ where: { id: giftId } });
  }

  /** Aplica o estado do provedor (webhook/consulta). */
  async applyCharge(giftId: string, charge: ProviderCharge) {
    const gift = await this.prisma.titheGuestGift.findUnique({ where: { id: giftId } });
    if (!gift) return;
    if (PAID_STATUSES.has(charge.status) && gift.status !== 'CONFIRMED') {
      const expected = gift.amount;
      if (typeof charge.value === 'number' && Math.abs(charge.value - expected) > 0.01) {
        await this.prisma.titheGuestGift.update({ where: { id: giftId }, data: { providerStatus: 'mismatch', note: `Provedor informa ${money(charge.value)}; esperado ${money(expected)}` } });
        return;
      }
      await this.settle(giftId, { paidAmount: expected, paidAt: this.tithe['civilDate'](charge.paidAt), byUserId: null, source: 'provider' });
      return;
    }
    if (charge.status === 'cancelled' && gift.status === 'CREATED') {
      await this.prisma.titheGuestGift.updateMany({ where: { id: giftId, status: 'CREATED' }, data: { status: 'CANCELLED', note: 'Cobrança cancelada no provedor', providerStatus: charge.status } });
    } else if (charge.status !== gift.providerStatus) {
      await this.prisma.titheGuestGift.update({ where: { id: giftId }, data: { providerStatus: charge.status } });
    }
  }

  /** Chamado pelo webhook quando a cobrança não é de um TitheIntent: devolve true se era oferta de visitante. */
  async settleByProvider(parishId: string, providerRef: string, charge: ProviderCharge): Promise<boolean> {
    const gift = await this.prisma.titheGuestGift.findFirst({ where: { parishId, providerRef } });
    if (!gift) return false;
    await this.applyCharge(gift.id, charge);
    return true;
  }

  private async sendReceipt(giftId: string): Promise<boolean> {
    const gift = await this.prisma.titheGuestGift.findUnique({ where: { id: giftId }, include: { campaign: { select: { name: true } }, parish: { select: { name: true } } } });
    if (!gift || gift.status !== 'CONFIRMED') return false;
    const value = money(gift.amountPaid ?? gift.amount);
    const web = this.publicWebUrl();
    const link = web ? `${web}/doar/recibo/${gift.receiptToken}` : null;
    const apiBase = (process.env.PUBLIC_API_URL ?? 'https://parish-backend-production.up.railway.app/api/v1').replace(/\/$/, '');
    const pdfLink = `${apiBase}/public/tithe/gifts/${gift.receiptToken}/receipt.pdf`;
    const subject = `Recibo da sua oferta — ${gift.parish.name}`;
    const textBody = [
      `Olá, ${gift.name}!`,
      '',
      `Recebemos sua oferta de ${value}${gift.campaign ? ` para a campanha "${gift.campaign.name}"` : ''} em ${day(gift.confirmedAt)}.`,
      `Identificador: ${gift.txid}`,
      '',
      `Comprovante em PDF: ${pdfLink}`,
      ...(link ? [`Acompanhe: ${link}`] : []),
      '',
      'Deus lhe pague pela generosidade!',
      gift.parish.name,
    ].join('\n');
    const html = `<p>Olá, ${escapeHtml(gift.name)}!</p><p>Recebemos sua oferta de <strong>${escapeHtml(value)}</strong>${gift.campaign ? ` para a campanha <strong>${escapeHtml(gift.campaign.name)}</strong>` : ''} em ${day(gift.confirmedAt)}.<br>Identificador: <code>${escapeHtml(gift.txid)}</code></p><p><a href="${pdfLink}">Baixar comprovante (PDF)</a>${link ? ` · <a href="${link}">Acompanhar</a>` : ''}</p><p>Deus lhe pague pela generosidade!<br>${escapeHtml(gift.parish.name)}</p>`;
    try {
      const sent = await this.emailService.trySend(gift.email, subject, textBody, html);
      if (sent) await this.prisma.titheGuestGift.update({ where: { id: giftId }, data: { receiptSentAt: new Date() } });
      return sent;
    } catch (error) {
      this.logger.warn(`Recibo por e-mail falhou (${giftId}): ${String(error)}`);
      return false;
    }
  }

  /** Comprovante em PDF (público, pelo token — só depois de confirmada). */
  async receiptPdf(token: string): Promise<Buffer> {
    const gift = await this.byToken(token);
    if (gift.status !== 'CONFIRMED') throw new BadRequestException('Comprovante disponível depois da confirmação');
    return this.pdfService.renderCertificateDocument({
      logo: await this.tithe.fetchLogo(gift.parish.logoUrl),
      title: 'Comprovante de Oferta',
      organization: gift.parish.name,
      subtitle: gift.campaign ? `Campanha ${gift.campaign.name}` : 'Oferta',
      orientation: 'portrait',
      pages: [
        {
          recipientName: safeName(gift.name),
          bodyParagraphs: [
            `Contribuiu com ${money(gift.amountPaid ?? gift.amount)}`,
            gift.campaign ? `para a campanha “${gift.campaign.name}”,` : 'como oferta,',
            `via ${appMethodLabel(gift.paymentMethod).toLowerCase()} (id ${gift.txid}), confirmado em ${day(gift.confirmedAt)}.`,
            'Deus lhe pague pela generosidade.',
          ],
          signatureLines: ['Tesouraria Paroquial'],
        },
      ],
      footer: `Emitido pelo Parish em ${day(new Date())}`,
    });
  }

  // ===== TESOURARIA =====

  private async assertParish(user: CurrentUser, parishId: string) {
    if (!this.tithe.canManage(user.role)) throw new ForbiddenException('Sem permissão financeira');
    const scope = await this.tithe.financeScope(user);
    if (scope.parishIds && !scope.parishIds.includes(parishId)) throw new ForbiddenException('Paróquia fora do seu escopo');
    if (scope.communityIds) {
      // Coordenação de comunidade: ofertas de visitante são da paróquia — só a administração paroquial concilia
      throw new ForbiddenException('Ofertas de visitante são conciliadas pela administração paroquial');
    }
  }

  async list(user: CurrentUser, filters: { parishId?: string; status?: string }) {
    const parishId = filters.parishId || user.parishId;
    if (!parishId) throw new BadRequestException('Informe a paróquia');
    await this.assertParish(user, parishId);
    const status = (filters.status ?? 'DECLARED').toUpperCase();
    const where: any = { parishId };
    if (status !== 'ALL') where.status = ['CREATED', 'DECLARED', 'CONFIRMED', 'CANCELLED'].includes(status) ? status : 'DECLARED';
    const gifts = await this.prisma.titheGuestGift.findMany({ where, orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], include: { campaign: { select: { id: true, name: true } } }, take: 300 });
    return gifts.map((g) => ({
      id: g.id,
      name: safeName(g.name),
      email: g.email,
      cpfMasked: g.cpf ? `***.${g.cpf.slice(3, 6)}.${g.cpf.slice(6, 9)}-**` : null,
      amount: g.amount,
      amountPaid: g.amountPaid,
      message: g.message,
      campaign: g.campaign,
      status: g.status,
      method: g.method,
      paymentMethod: g.paymentMethod,
      providerStatus: g.providerStatus,
      txid: g.txid,
      note: g.note,
      receiptSentAt: g.receiptSentAt,
      declaredAt: g.declaredAt,
      confirmedAt: g.confirmedAt,
      createdAt: g.createdAt,
    }));
  }

  async confirm(user: CurrentUser, id: string, dto: { date?: string; amountPaid?: number }) {
    const gift = await this.prisma.titheGuestGift.findUnique({ where: { id } });
    if (!gift) throw new NotFoundException('Oferta não encontrada');
    await this.assertParish(user, gift.parishId);
    if (gift.status === 'CONFIRMED') throw new BadRequestException('Já confirmada');
    if (gift.status === 'CANCELLED') throw new BadRequestException('Oferta cancelada');
    if (gift.method === 'GATEWAY' && gift.providerRef && gift.providerStatus !== 'mismatch') throw new BadRequestException('Cobrança do provedor: a confirmação é automática — use “Consultar provedor”');
    const paidAmount = dto.amountPaid !== undefined && dto.amountPaid !== null ? Math.round(Number(dto.amountPaid) * 100) / 100 : gift.amount;
    if (!Number.isFinite(paidAmount) || paidAmount <= 0 || paidAmount > MAX_AMOUNT) throw new BadRequestException('Valor pago inválido');
    let paidAt = new Date(`${this.plusDays(0)}T12:00:00.000Z`);
    if (dto.date) {
      const raw = String(dto.date).slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new BadRequestException('Data inválida (use AAAA-MM-DD)');
      paidAt = new Date(`${raw}T12:00:00.000Z`);
      if (Number.isNaN(paidAt.getTime()) || paidAt.getTime() > Date.now() + 24 * 60 * 60 * 1000) throw new BadRequestException('Data inválida');
    }
    const settled = await this.settle(id, { paidAmount, paidAt, byUserId: user.id, source: 'treasury' });
    return settled ? { id, status: settled.status, receiptSentAt: settled.receiptSentAt } : { id, status: gift.status };
  }

  async reject(user: CurrentUser, id: string, rawReason?: string) {
    const gift = await this.prisma.titheGuestGift.findUnique({ where: { id } });
    if (!gift) throw new NotFoundException('Oferta não encontrada');
    await this.assertParish(user, gift.parishId);
    if (gift.status === 'CONFIRMED') throw new BadRequestException('Já confirmada');
    const reason = text(rawReason, 200) || 'Pix não localizado no extrato';
    const moved = await this.prisma.titheGuestGift.updateMany({ where: { id, status: { in: ['CREATED', 'DECLARED'] } }, data: { status: 'CANCELLED', note: reason } });
    if (moved.count !== 1) throw new BadRequestException('Esta oferta já foi encerrada');
    await this.auditService.log({ actor: this.tithe.auditActor(user), action: 'UPDATE', entity: 'TitheGuestGift', entityId: id, before: { status: gift.status }, after: { status: 'CANCELLED', note: reason } });
    return { id, status: 'CANCELLED' };
  }

  async syncForFinance(user: CurrentUser, id: string) {
    const gift = await this.prisma.titheGuestGift.findUnique({ where: { id } });
    if (!gift) throw new NotFoundException('Oferta não encontrada');
    await this.assertParish(user, gift.parishId);
    if (gift.method !== 'GATEWAY' || !gift.providerRef) throw new BadRequestException('Esta oferta não é do provedor — confira no extrato');
    const parish = await this.tithe.parishFor(gift.parishId);
    if (!parish || !this.paymentsService.hasProvider(parish)) throw new BadRequestException('Provedor não configurado');
    const charge = await this.paymentsService.forParish(parish).getCharge(gift.providerRef);
    await this.applyCharge(gift.id, charge);
    const fresh = await this.prisma.titheGuestGift.findUnique({ where: { id } });
    return { id, status: fresh?.status, providerStatus: fresh?.providerStatus };
  }

  async resendReceipt(user: CurrentUser, id: string) {
    const gift = await this.prisma.titheGuestGift.findUnique({ where: { id } });
    if (!gift) throw new NotFoundException('Oferta não encontrada');
    await this.assertParish(user, gift.parishId);
    if (gift.status !== 'CONFIRMED') throw new BadRequestException('Recibo só depois da confirmação');
    const sent = await this.sendReceipt(id);
    return { id, sent };
  }
}
