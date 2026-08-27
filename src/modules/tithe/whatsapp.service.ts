import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../common/audit.service';
import { MessagingService } from '../messaging/messaging.service';
import { buildPixBrCode } from './pix-brcode';
import { TitheService, safeName } from './tithe.service';

const MONTH_NAMES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const monthLabel = (referenceMonth: string) => {
  const [y, m] = referenceMonth.split('-').map(Number);
  return `${MONTH_NAMES[(m ?? 1) - 1]}/${y}`;
};
const money = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;
const firstName = (fullName: string) => safeName(fullName).split(' ')[0] || 'irmão(ã)';

/**
 * WhatsApp como canal do dízimo (D4.5), via Twilio: no dia do lembrete o fiel
 * que optou recebe o Pix copia-e-cola do mês; responde PAGUEI e a tesouraria
 * é avisada; ao confirmar, recebe o "Deus lhe pague". SAIR desliga. O canal
 * só funciona com o Twilio do servidor configurado e a paróquia com o WhatsApp
 * ativado; nada aqui derruba o fluxo principal.
 */
@Injectable()
export class TitheWhatsAppService {
  private readonly logger = new Logger(TitheWhatsAppService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messaging: MessagingService,
    private readonly auditService: AuditService,
    @Inject(forwardRef(() => TitheService)) private readonly tithe: TitheService,
  ) {}

  serverConfigured(): boolean {
    return this.messaging.whatsappConfigured;
  }

  /** O celular precisa virar E.164 para o Twilio (DDD + número). */
  phoneUsable(phone: string | null | undefined): boolean {
    return !!phone && !!this.messaging.normalizePhone(phone);
  }

  /** Dígitos nacionais (DDD + número) sem o +55 — para comparação exata. */
  private nationalDigits(phone: string | null | undefined): string | null {
    const e164 = phone ? this.messaging.normalizePhone(phone) : null;
    return e164 ? e164.replace(/^\+55/, '') : null;
  }

  /**
   * Acha o membro pelo número: candidatos pelos últimos 8 dígitos, depois
   * igualdade exata de DDD+número em memória; só quem está em paróquia com
   * o canal ligado; se sobrar mais de um, não age (homônimos de número).
   */
  private async memberByPhone(rawPhone: string) {
    const wanted = this.nationalDigits(rawPhone);
    if (!wanted) return null;
    const last8 = wanted.slice(-8);
    const variants = [last8, `${last8.slice(0, 4)}-${last8.slice(4)}`, `${wanted.slice(-9, -4)}-${wanted.slice(-4)}`];
    const candidates = await this.prisma.member.findMany({
      where: { deletedAt: null, status: { notIn: ['DECEASED', 'ANONYMIZED'] }, OR: variants.map((v) => ({ phone: { contains: v } })) },
      select: {
        id: true,
        fullName: true,
        userId: true,
        phone: true,
        communityId: true,
        whatsappOptIn: true,
        titheReminderDay: true,
        community: { select: { parishId: true, parish: { select: { name: true, whatsappEnabled: true } } } },
      },
      take: 10,
    });
    const exact = candidates.filter((m) => this.nationalDigits(m.phone) === wanted && m.community?.parish.whatsappEnabled);
    if (exact.length === 1) return exact[0];
    if (exact.length > 1) {
      const opted = exact.filter((m) => m.whatsappOptIn);
      return opted.length === 1 ? opted[0] : null;
    }
    return null;
  }

  /**
   * Pix do mês pelo WhatsApp (chamado pelo lembrete mensal). Cria um Pix
   * estático com o último valor do fiel e envia o copia-e-cola.
   */
  async sendMonthlyPix(memberId: string, referenceMonth: string): Promise<boolean> {
    if (!this.serverConfigured()) return false;
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, deletedAt: null, whatsappOptIn: true, phone: { not: null } },
      select: { id: true, fullName: true, phone: true, communityId: true, community: { select: { parishId: true } } },
    });
    if (!member?.phone || !member.community) return false;
    const parish = await this.tithe.parishFor(member.community.parishId);
    if (!parish?.whatsappEnabled || !this.tithe.parishUsable(parish)) return false;
    const [lastIntent, tither] = await Promise.all([
      this.prisma.titheIntent.findFirst({ where: { memberId: member.id, kind: 'TITHE', status: 'CONFIRMED' }, orderBy: { confirmedAt: 'desc' }, select: { amount: true } }),
      this.prisma.tither.findUnique({ where: { memberId: member.id }, select: { contributions: { orderBy: { date: 'desc' }, take: 1, select: { amount: true } } } }),
    ]);
    const amount = lastIntent?.amount ?? tither?.contributions[0]?.amount ?? null;
    const name = firstName(member.fullName);
    if (!amount) {
      return this.messaging.trySendWhatsApp(
        member.phone,
        `Olá, ${name}! Aqui é a ${safeName(parish.name)}. Lembrete do dízimo de ${monthLabel(referenceMonth)}: contribua pelo app Parish — leva menos de um minuto. Para não receber mais, responda SAIR.`,
        { '1': name, '2': monthLabel(referenceMonth), '3': safeName(parish.name) },
        'reminder',
      );
    }
    // Reaproveita um Pix do mês ainda aberto; senão cria (estático, sem cair nos limites do app)
    let intent = await this.prisma.titheIntent.findFirst({
      where: { memberId: member.id, kind: 'TITHE', referenceMonth, status: 'CREATED', method: 'PIX_STATIC' },
      orderBy: { createdAt: 'desc' },
    });
    if (!intent) {
      const txid = this.tithe.newTxid();
      intent = await this.prisma.titheIntent.create({
        data: {
          memberId: member.id,
          parishId: parish.id,
          communityId: member.communityId,
          amount,
          referenceMonth,
          kind: 'TITHE',
          anonymous: false,
          method: 'PIX_STATIC',
          paymentMethod: 'PIX',
          txid,
          brCode: buildPixBrCode({
            key: parish.pixKey!,
            merchantName: parish.pixMerchantName!,
            merchantCity: parish.pixMerchantCity!,
            amount,
            txid,
            description: `Dizimo ${referenceMonth}`,
          }),
          note: 'Enviado pelo WhatsApp',
        },
      });
    }
    const sent = await this.messaging.trySendWhatsApp(
      member.phone,
      `Olá, ${name}! Seu dízimo de ${monthLabel(referenceMonth)} na ${safeName(parish.name)}: ${money(amount)}.\n\nPix copia e cola:\n${intent.brCode}\n\nConfira o recebedor (${parish.pixMerchantName}) antes de pagar. Depois de pagar, responda PAGUEI. Quer outro valor? Use o app Parish. Para não receber mais, responda SAIR.`,
      { '1': name, '2': monthLabel(referenceMonth), '3': money(amount), '4': intent.brCode ?? '' },
      'pix',
    );
    await this.auditService.log({ actor: null, action: 'UPDATE', entity: 'TitheIntent', entityId: intent.id, metadata: { whatsapp: 'monthly-pix', sent } });
    return sent;
  }

  /** "Deus lhe pague" pelo WhatsApp após a confirmação (best-effort). */
  async tryThank(intentId: string): Promise<void> {
    if (!this.serverConfigured()) return;
    try {
      const intent = await this.prisma.titheIntent.findUnique({
        where: { id: intentId },
        select: {
          amount: true,
          amountPaid: true,
          referenceMonth: true,
          kind: true,
          anonymous: true,
          campaign: { select: { name: true } },
          member: { select: { fullName: true, phone: true, whatsappOptIn: true } },
          parish: { select: { name: true, whatsappEnabled: true } },
        },
      });
      if (!intent || !intent.member.whatsappOptIn || !intent.member.phone || !intent.parish.whatsappEnabled) return;
      const value = money(intent.amountPaid ?? intent.amount);
      await this.messaging.trySendWhatsApp(
        intent.member.phone,
        `Deus lhe pague, ${firstName(intent.member.fullName)}! 🙏 ${intent.kind === 'OFFERING' ? 'Sua oferta' : 'Seu dízimo'} de ${value} (${intent.campaign ? intent.campaign.name : monthLabel(intent.referenceMonth)}) foi recebido pela ${safeName(intent.parish.name)}. O comprovante está no app.`,
        { '1': firstName(intent.member.fullName), '2': value, '3': intent.campaign ? intent.campaign.name : monthLabel(intent.referenceMonth) },
        'thanks',
      );
    } catch (error) {
      this.logger.warn(`Agradecimento WhatsApp falhou: ${String(error)}`);
    }
  }

  /** Mensagem recebida (Twilio → webhook). Devolve o texto da resposta. */
  async handleInbound(from: string, body: string): Promise<string> {
    const text = String(body ?? '').trim().toUpperCase().replace(/[!.\s]+$/g, '');
    const member = await this.memberByPhone(from);
    if (!member) {
      return 'Olá! Não encontramos um cadastro com este número. Peça à secretaria da sua paróquia para atualizar seu celular ou use o app Parish.';
    }
    const name = firstName(member.fullName);
    if (['SAIR', 'PARAR', 'CANCELAR', 'STOP'].includes(text)) {
      await this.prisma.member.update({ where: { id: member.id }, data: { whatsappOptIn: false, whatsappOptInAt: null } });
      await this.auditService.log({ actor: null, action: 'UPDATE', entity: 'Member', entityId: member.id, metadata: { whatsappOptIn: false, via: 'whatsapp' } });
      return `Tudo bem, ${name}. Você não receberá mais o Pix do dízimo pelo WhatsApp. Para voltar, responda QUERO.`;
    }
    if (['QUERO', 'ENTRAR', 'SIM', 'VOLTAR'].includes(text)) {
      if (!member.community?.parish.whatsappEnabled) return `${name}, sua paróquia ainda não ativou o WhatsApp do dízimo. Use o app Parish.`;
      // Sem dia de lembrete o Pix do mês não teria quando sair
      await this.prisma.member.update({
        where: { id: member.id },
        data: { whatsappOptIn: true, whatsappOptInAt: new Date(), ...(member.titheReminderDay ? {} : { titheReminderDay: 10 }) },
      });
      await this.auditService.log({ actor: null, action: 'UPDATE', entity: 'Member', entityId: member.id, metadata: { whatsappOptIn: true, via: 'whatsapp' } });
      return `Combinado, ${name}! Todo mês, no dia do seu lembrete, você recebe o Pix do dízimo por aqui. Responda SAIR quando quiser parar.`;
    }
    if (['PAGUEI', 'PAGO', 'FEITO', 'JA PAGUEI', 'JÁ PAGUEI'].includes(text)) {
      // Só o Pix estático do mês enviado por aqui: cobrança do provedor confirma sozinha; cartão/boleto não é "PAGUEI"
      const intent = await this.prisma.titheIntent.findFirst({
        where: { memberId: member.id, status: 'CREATED', method: 'PIX_STATIC', createdAt: { gte: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) } },
        orderBy: [{ note: 'desc' }, { createdAt: 'desc' }],
        include: { member: { select: { fullName: true, communityId: true } } },
      });
      if (!intent) return `${name}, não achei um Pix em aberto seu. Se pagou pelo app, toque em "Já fiz o Pix" lá; se precisa de um novo, responda PIX.`;
      // Mesmos freios do app: no máximo 5 avisos por dia e um alerta à tesouraria a cada 10 min
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const declaredToday = await this.prisma.titheIntent.count({ where: { memberId: member.id, declaredAt: { gte: since } } });
      if (declaredToday >= 5) return `${name}, você já avisou vários pagamentos hoje — a tesouraria vai conferir todos. Deus lhe pague!`;
      const moved = await this.prisma.titheIntent.updateMany({ where: { id: intent.id, status: 'CREATED' }, data: { status: 'DECLARED', declaredAt: new Date() } });
      if (moved.count === 1) {
        await this.auditService.log({ actor: null, action: 'UPDATE', entity: 'TitheIntent', entityId: intent.id, before: { status: 'CREATED' }, after: { status: 'DECLARED' }, metadata: { via: 'whatsapp' } });
        const recentlyNotified = await this.prisma.titheIntent.count({
          where: { memberId: member.id, id: { not: intent.id }, declaredAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } },
        });
        if (recentlyNotified === 0) await this.tithe.notifyTreasury(
          { communityId: intent.communityId, parishId: intent.parishId, member: { communityId: intent.member.communityId } },
          'Pix de dízimo a conferir',
          `${safeName(intent.member.fullName)} avisou pelo WhatsApp que pagou o Pix de ${money(intent.amount)} (${intent.referenceMonth}, id ${intent.txid}). Confira no extrato e confirme no Financeiro.`,
          { kind: 'tithe-declared', intentId: intent.id },
        );
      }
      return `Obrigado, ${name}! Avisamos a tesouraria; assim que conferirem, você recebe a confirmação. Deus lhe pague! 🙏`;
    }
    if (['PIX', 'DIZIMO', 'DÍZIMO', 'CONTRIBUIR'].includes(text)) {
      if (!member.whatsappOptIn) return `${name}, para receber o Pix por aqui responda QUERO primeiro (ou use o app Parish).`;
      // Freio: um Pix novo por dia via WhatsApp (o do mês é reaproveitado enquanto estiver aberto)
      const createdToday = await this.prisma.titheIntent.count({
        where: { memberId: member.id, note: 'Enviado pelo WhatsApp', createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, status: { not: 'CREATED' } },
      });
      if (createdToday >= 3) return `${name}, já enviamos o Pix de hoje. Se precisar de outro valor, use o app Parish.`;
      const sent = await this.sendMonthlyPix(member.id, this.tithe.currentMonth());
      return sent ? '' : `${name}, não consegui gerar o Pix agora. Use o app Parish para contribuir.`;
    }
    return `Olá, ${name}! Comandos: PIX (Pix do mês), PAGUEI (avisar que pagou), SAIR (parar de receber), QUERO (voltar a receber).`;
  }

  /** Aviso interno (push) para quem administra quando o canal está ligado sem Twilio. */
  async warnIfMisconfigured(parishId: string, userIds: string[], notifications: { notifyUsers: (ids: string[], type: NotificationType, title: string, body: string, data: Record<string, unknown>) => Promise<unknown> }) {
    if (this.serverConfigured() || !userIds.length) return;
    try {
      await notifications.notifyUsers(userIds, NotificationType.NEWS, 'WhatsApp do dízimo sem Twilio', 'O canal está ligado na paróquia, mas o servidor não tem TWILIO_WHATSAPP_FROM configurado — nada será enviado.', { kind: 'tithe-whatsapp', parishId });
    } catch {
      // best-effort
    }
  }
}
