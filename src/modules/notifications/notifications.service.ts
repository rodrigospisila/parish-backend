import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { PushDispatcherService } from './push-dispatcher.service';
import { MessagingService } from '../messaging/messaging.service';
import { EmailService } from '../messaging/email.service';
import { ConsentsService } from '../consents/consents.service';
import { isOptOutable } from '../consents/consent.constants';

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

  async registerPushToken(userId: string, pushToken: string | null) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        pushToken,
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

      // Cadeia de entrega: push → e-mail → SMS (o primeiro que funcionar encerra)
      let sent = false;

      if (user?.pushToken) {
        sent = await this.pushDispatcher.send({ to: user.pushToken, title, body, data });
      }

      if (!sent && user?.email && this.emailService.configured) {
        sent = await this.emailService.trySend(user.email, title, body);
      }

      if (!sent && user) {
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

    return this.messagingService.trySendSms(phone, `${title}: ${body}`);
  }

  async notifyUsers(
    userIds: string[],
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ) {
    const uniqueUserIds = [...new Set(userIds)];
    await Promise.all(
      uniqueUserIds.map((userId) => this.notifyUser(userId, type, title, body, data)),
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

      return this.messagingService.trySendSms(phone, `${title}: ${body}`);
    } catch (error) {
      this.logger.warn(`Falha ao enviar SMS ao membro ${memberId}: ${error}`);
      return false;
    }
  }
}
