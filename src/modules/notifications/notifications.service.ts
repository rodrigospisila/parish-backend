import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { PushDispatcherService } from './push-dispatcher.service';
import { MessagingService } from '../messaging/messaging.service';
import { EmailService } from '../messaging/email.service';
import { ConsentsService } from '../consents/consents.service';
import { isOptOutable } from '../consents/consent.constants';

/**
 * `bulk`: aviso em massa (catequese → famílias, pastoral → membros). A cadeia
 * fica em push → e-mail: o SMS é cobrado por mensagem e um único envio para
 * uma turma ou pastoral inteira viraria dezenas de SMS (B8).
 */
export interface NotifyOptions {
  bulk?: boolean;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pushDispatcher: PushDispatcherService,
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
   * Cria o registro de notificacao e dispara o push (best-effort) para um usuario.
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
      // aviso em massa (`bulk`) não chega ao SMS
      let sent = false;

      if (user?.pushToken) {
        const push = await this.pushDispatcher.sendWithResult({ to: user.pushToken, title, body, data });
        sent = push.sent;
        if (push.invalidToken) {
          // Token morto (B44): sai da conta para não "entregar" de novo no vazio
          await this.prisma.user
            .updateMany({ where: { id: userId, pushToken: user.pushToken }, data: { pushToken: null, pushTokenUpdatedAt: new Date() } })
            .catch(() => undefined);
        }
      }

      if (!sent && user?.email && this.emailService.configured) {
        sent = await this.emailService.trySend(user.email, title, body);
      }

      if (!sent && user && !options.bulk) {
        // Fallback SMS: comunidade com smsEnabled e Twilio configurado
        sent = await this.trySmsFallback(user, title, body);
      }

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
    const uniqueUserIds = [...new Set(userIds)];
    await Promise.all(
      uniqueUserIds.map((userId) => this.notifyUser(userId, type, title, body, data, options)),
    );
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
