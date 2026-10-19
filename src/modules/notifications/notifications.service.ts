import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { buildOutboxData } from './push-outbox.data';
import { MessagingService } from '../messaging/messaging.service';
import { EmailService } from '../messaging/email.service';
import { ConsentsService } from '../consents/consents.service';
import { isOptOutable } from '../consents/consent.constants';

/**
 * `bulk`: aviso em massa (catequese → famílias, pastoral → membros). A cadeia
 * fica em push → e-mail: o SMS é cobrado por mensagem e um único envio para
 * uma turma ou pastoral inteira viraria dezenas de SMS (B8).
 *
 * `skipFallback`: só in-app + push, nunca e-mail/SMS — nem na hora (conta sem
 * token) nem depois (push que falhou de vez, no worker). Para fluxos que já
 * mandam o próprio e-mail ao mesmo destinatário (régua de planos, alertas da
 * plataforma): sem isto o admin recebia o aviso duas vezes por e-mail (S2).
 */
export interface NotifyOptions {
  bulk?: boolean;
  skipFallback?: boolean;
}

/** Destinatários processados ao mesmo tempo em notifyUsers. */
export const NOTIFY_USERS_CONCURRENCY = 10;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messagingService: MessagingService,
    private readonly emailService: EmailService,
    private readonly consentsService: ConsentsService,
  ) {}

  /**
   * Grava (ou limpa, com null) o token de push do aparelho na conta logada.
   * Um aparelho = uma conta (M42): o mesmo token sai de qualquer outra conta
   * — senão, em celular compartilhado, os avisos da conta anterior (catequese
   * dos filhos, dízimo) continuariam chegando a quem entrou depois.
   */
  async registerPushToken(userId: string, pushToken: string | null) {
    const token = typeof pushToken === 'string' && pushToken.trim() ? pushToken.trim() : null;
    if (token) {
      await this.prisma.user.updateMany({
        where: { pushToken: token, id: { not: userId } },
        data: { pushToken: null, pushTokenUpdatedAt: new Date() },
      });
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        pushToken: token,
        pushTokenUpdatedAt: new Date(),
      },
    });
  }

  /**
   * Cria o registro de notificacao e enfileira o push (outbox) para um usuario;
   * sem token de push, tenta e-mail → SMS na hora, como sempre.
   * Nunca lanca exceptions: notificacao nao deve quebrar o fluxo que a originou.
   */
  async notifyUser(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, unknown>,
    options: NotifyOptions = {},
  ) {
    try {
      // Opt-out LGPD: notificações não essenciais respeitam o consentimento
      // de comunicações do titular. Essenciais (escala/segurança) sempre passam.
      if (isOptOutable(type)) {
        const allowed = await this.consentsService.allowsNonEssentialComms(userId);
        if (!allowed) {
          this.logger.log(`Notificação ${type} suprimida por opt-out do usuário ${userId}`);
          return null;
        }
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          pushToken: true,
          phone: true,
          email: true,
          member: {
            select: {
              phone: true,
              community: {
                select: { smsEnabled: true },
              },
            },
          },
        },
      });

      const notification = await this.prisma.notification.create({
        data: {
          userId,
          type,
          title,
          body,
          data: data ? JSON.parse(JSON.stringify(data)) : undefined,
        },
      });

      // Cadeia de entrega: push → e-mail → SMS (o primeiro que funcionar encerra);
      // aviso em massa (`bulk`) não chega ao SMS.
      // O push NÃO sai daqui (eng-qualidade-02): vai para a outbox e o worker
      // (PushOutboxService) envia em lote, marca isSent e, se o push falhar de
      // vez, segue a cadeia (e-mail → SMS) pelo deliverFallback.
      if (user?.pushToken) {
        const queued = await this.prisma.notificationOutbox
          .create({
            data: {
              userId,
              notificationId: notification.id,
              title,
              body,
              data: buildOutboxData(data, options.bulk, options.skipFallback),
              channel: 'PUSH',
            },
            select: { id: true },
          })
          .then(() => true)
          .catch((error) => {
            this.logger.warn(`Falha ao enfileirar push do usuario ${userId}: ${error}`);
            return false;
          });
        if (queued) return notification;
      }

      // skipFallback (S2): o fluxo de origem já cuida do e-mail
      const sent = user && !options.skipFallback ? await this.fallbackChain(user, title, body, options) : false;
      if (sent) {
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: { isSent: true, sentAt: new Date() },
        });
      }

      return notification;
    } catch (error) {
      this.logger.warn(`Falha ao notificar usuario ${userId}: ${error}`);
      return null;
    }
  }

  /**
   * Cadeia depois do push: e-mail → SMS (SMS fora em aviso em massa, B8).
   * Devolve se algum canal entregou.
   */
  private async fallbackChain(
    user: {
      email?: string | null;
      phone?: string | null;
      member?: { phone: string | null; community: { smsEnabled: boolean } } | null;
    },
    title: string,
    body: string,
    options: NotifyOptions,
  ): Promise<boolean> {
    let sent = false;
    if (user.email && this.emailService.configured) {
      sent = await this.emailService.trySend(user.email, title, body);
    }
    if (!sent && !options.bulk) {
      // Fallback SMS: comunidade com smsEnabled e Twilio configurado
      sent = await this.trySmsFallback({ phone: user.phone ?? null, member: user.member ?? null }, title, body);
    }
    return sent;
  }

  /**
   * Usado pelo worker da outbox quando o push falhou de vez (token morto,
   * tentativas esgotadas, conta sem token na hora do envio): segue a cadeia
   * como o envio direto fazia e marca a notificação como entregue se algum
   * canal funcionou. Nunca lança.
   */
  async deliverFallback(
    userId: string,
    notificationId: string | null,
    title: string,
    body: string,
    options: NotifyOptions = {},
  ): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          phone: true,
          email: true,
          member: { select: { phone: true, community: { select: { smsEnabled: true } } } },
        },
      });
      if (!user) return false;
      const sent = await this.fallbackChain(user, title, body, options);
      if (sent && notificationId) {
        await this.prisma.notification.updateMany({
          where: { id: notificationId },
          data: { isSent: true, sentAt: new Date() },
        });
      }
      return sent;
    } catch (error) {
      this.logger.warn(`Falha no fallback de notificacao do usuario ${userId}: ${error}`);
      return false;
    }
  }

  /**
   * Fallback por SMS para usuários sem push token (membro sem smartphone/app).
   * Só envia quando a comunidade do membro habilitou SMS (controle de custo).
   */
  private async trySmsFallback(
    user: {
      phone: string | null;
      member: { phone: string | null; community: { smsEnabled: boolean } } | null;
    },
    title: string,
    body: string,
  ): Promise<boolean> {
    if (!user.member?.community.smsEnabled || !this.messagingService.smsConfigured) {
      return false;
    }

    const rawPhone = user.phone || user.member.phone;
    if (!rawPhone) {
      return false;
    }

    const phone = this.messagingService.normalizePhone(rawPhone);
    if (!phone) {
      return false;
    }

    // SMS é cobrado por segmento: corpo limitado (título + resumo)
    return this.messagingService.trySendSms(phone, `${title}: ${body}`.slice(0, 300));
  }

  async notifyUsers(
    userIds: string[],
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, unknown>,
    options: NotifyOptions = {},
  ) {
    // Concorrência limitada (eng-qualidade-02): um aviso para milhares de
    // fiéis não abre milhares de consultas ao mesmo tempo (pool do Prisma).
    // Cada notifyUser só grava (o push vai para a outbox), então o lote anda rápido.
    const uniqueUserIds = [...new Set(userIds)];
    for (let index = 0; index < uniqueUserIds.length; index += NOTIFY_USERS_CONCURRENCY) {
      const chunk = uniqueUserIds.slice(index, index + NOTIFY_USERS_CONCURRENCY);
      await Promise.all(chunk.map((userId) => this.notifyUser(userId, type, title, body, data, options)));
    }
  }

  /**
   * Avisa um membro que NÃO possui conta de usuário (sem app), via SMS direto
   * para o telefone do próprio membro. Usado no fluxo de escala para idosos/
   * membros sem smartphone (roadmap 2.3). Só envia se a comunidade tem smsEnabled.
   * Best-effort: nunca lança.
   */
  async notifyMemberWithoutAccountBySms(memberId: string, title: string, body: string): Promise<boolean> {
    try {
      const member = await this.prisma.member.findFirst({
        where: { id: memberId, deletedAt: null },
        select: { phone: true, userId: true, community: { select: { smsEnabled: true } } },
      });

      // Só trata o caso "sem conta"; membros com userId seguem o fluxo normal
      if (!member || member.userId || !member.phone || !member.community.smsEnabled) {
        return false;
      }
      if (!this.messagingService.smsConfigured) {
        return false;
      }

      const phone = this.messagingService.normalizePhone(member.phone);
      if (!phone) {
        return false;
      }

      // SMS é cobrado por segmento: corpo limitado (título + resumo)
    return this.messagingService.trySendSms(phone, `${title}: ${body}`.slice(0, 300));
    } catch (error) {
      this.logger.warn(`Falha ao enviar SMS ao membro ${memberId}: ${error}`);
      return false;
    }
  }
}
