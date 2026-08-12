import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const HOUR_MS = 60 * 60 * 1000;
// Janela de varredura dos lembretes D-1 (25h cobre atraso de até 1h do cron)
const REMINDER_24H_WINDOW_MS = 25 * HOUR_MS;
// Abaixo deste limite o lembrete enviado é o de "faltam poucas horas"
const REMINDER_2H_THRESHOLD_MS = 3 * HOUR_MS;
// Cobrança de resposta para atribuições PENDING
const PENDING_NUDGE_WINDOW_MS = 72 * HOUR_MS;

/**
 * Lembretes automáticos de escala (roadmap Fase 1, item 1).
 * Roda de hora em hora; a deduplicação é feita pelos campos
 * reminder24hSentAt / reminder2hSentAt / pendingNudgeSentAt da atribuição.
 */
@Injectable()
export class ScheduleRemindersService {
  private readonly logger = new Logger(ScheduleRemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    const now = new Date();
    await this.sendUpcomingReminders(now);
    await this.sendPendingNudges(now);
  }

  /**
   * Lembretes D-1 e de véspera imediata (~2h) para atribuições não recusadas
   * em escalas abertas.
   */
  async sendUpcomingReminders(now: Date): Promise<number> {
    const windowEnd = new Date(now.getTime() + REMINDER_24H_WINDOW_MS);

    const assignments = await this.prisma.scheduleAssignment.findMany({
      where: {
        status: { not: 'DECLINED' },
        schedule: {
          status: 'OPEN',
          deletedAt: null,
          // Escalas SEM evento (agenda fixa/avulsas) também recebem lembrete
          OR: [{ eventId: null }, { event: { deletedAt: null } }],
          date: { gt: now, lte: windowEnd },
        },
        OR: [{ reminder24hSentAt: null }, { reminder2hSentAt: null }],
      },
      include: {
        schedule: {
          select: {
            id: true,
            title: true,
            date: true,
            community: { select: { id: true, name: true } },
            event: { select: { community: { select: { id: true, name: true } } } },
          },
        },
        member: { select: { id: true, fullName: true, userId: true } },
      },
    });

    let sent = 0;

    for (const assignment of assignments) {
      const msUntil = assignment.schedule.date.getTime() - now.getTime();
      const isFinalReminder = msUntil <= REMINDER_2H_THRESHOLD_MS;

      if (isFinalReminder && assignment.reminder2hSentAt) {
        continue;
      }
      if (!isFinalReminder && assignment.reminder24hSentAt) {
        continue;
      }

      const dateLabel = this.formatDateTimeLabel(assignment.schedule.date);
      // Multi-comunidade: quem serve em mais de uma precisa saber DE ONDE é a escala
      const community =
        assignment.schedule.event?.community ?? assignment.schedule.community ?? null;
      const communitySuffix = community ? ` · ${community.name}` : '';
      const body = isFinalReminder
        ? `Sua escala "${assignment.schedule.title}"${communitySuffix} começa em breve (${dateLabel}). Função: ${assignment.role}.`
        : `Você está escalado(a) amanhã: "${assignment.schedule.title}"${communitySuffix} em ${dateLabel}. Função: ${assignment.role}.`;

      if (assignment.member.userId) {
        await this.notificationsService.notifyUser(
          assignment.member.userId,
          NotificationType.SCHEDULE_REMINDER,
          'Lembrete de escala',
          body,
          {
            scheduleId: assignment.schedule.id,
            assignmentId: assignment.id,
            ...(community ? { communityId: community.id } : {}),
          },
        );
        sent += 1;
      }

      // Marca mesmo sem userId para não varrer o mesmo registro a cada hora
      await this.prisma.scheduleAssignment.update({
        where: { id: assignment.id },
        data: isFinalReminder
          ? {
              reminder2hSentAt: now,
              // Evita D-1 redundante quando a atribuição nasceu perto do evento
              reminder24hSentAt: assignment.reminder24hSentAt ?? now,
            }
          : { reminder24hSentAt: now },
      });
    }

    if (sent > 0) {
      this.logger.log(`Lembretes de escala enviados: ${sent}`);
    }

    return sent;
  }

  /**
   * Cobrança de resposta: atribuições ainda PENDING com escala em até 72h.
   */
  async sendPendingNudges(now: Date): Promise<number> {
    const windowEnd = new Date(now.getTime() + PENDING_NUDGE_WINDOW_MS);

    const assignments = await this.prisma.scheduleAssignment.findMany({
      where: {
        status: 'PENDING',
        pendingNudgeSentAt: null,
        schedule: {
          status: 'OPEN',
          deletedAt: null,
          event: { deletedAt: null },
          date: { gt: now, lte: windowEnd },
        },
      },
      include: {
        schedule: { select: { id: true, title: true, date: true } },
        member: { select: { id: true, fullName: true, userId: true } },
      },
    });

    let sent = 0;

    for (const assignment of assignments) {
      if (assignment.member.userId) {
        await this.notificationsService.notifyUser(
          assignment.member.userId,
          NotificationType.SCHEDULE_REMINDER,
          'Confirme sua participação',
          `Você ainda não respondeu à escala "${assignment.schedule.title}" de ${this.formatDateTimeLabel(assignment.schedule.date)}. Confirme ou recuse no app.`,
          { scheduleId: assignment.schedule.id, assignmentId: assignment.id },
        );
        sent += 1;
      }

      await this.prisma.scheduleAssignment.update({
        where: { id: assignment.id },
        data: { pendingNudgeSentAt: now },
      });
    }

    if (sent > 0) {
      this.logger.log(`Cobranças de confirmação enviadas: ${sent}`);
    }

    return sent;
  }

  private formatDateTimeLabel(date: Date): string {
    const day = date.toLocaleDateString('pt-BR');
    const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${day} às ${time}`;
  }
}
