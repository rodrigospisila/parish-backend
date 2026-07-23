import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Lembrete de eventos D-1 (roadmap 2.2).
 * `NotificationType.EVENT_REMINDER` existe no schema mas nada o disparava.
 *
 * Roda uma vez ao dia e lembra os participantes de eventos que ocorrem no dia
 * seguinte. Como a janela é o "dia de amanhã" e o cron é diário, cada evento é
 * lembrado exatamente uma vez (sem necessidade de coluna de deduplicação).
 */
@Injectable()
export class EventRemindersService {
  private readonly logger = new Logger(EventRemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleCron() {
    await this.remindTomorrowEvents(new Date());
  }

  async remindTomorrowEvents(now: Date): Promise<number> {
    // Janela: amanhã 00:00 → amanhã 23:59:59
    const start = new Date(now);
    start.setDate(start.getDate() + 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    const events = await this.prisma.event.findMany({
      where: {
        deletedAt: null,
        status: 'PUBLISHED',
        startDate: { gte: start, lte: end },
      },
      select: {
        id: true,
        title: true,
        startDate: true,
        location: true,
        participants: {
          where: { member: { deletedAt: null } },
          select: { member: { select: { userId: true } } },
        },
      },
    });

    let sent = 0;
    for (const event of events) {
      const userIds = event.participants
        .map((participant) => participant.member?.userId)
        .filter((id): id is string => !!id);

      if (userIds.length === 0) {
        continue;
      }

      const dateLabel = event.startDate.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });

      await this.notificationsService.notifyUsers(
        userIds,
        NotificationType.EVENT_REMINDER,
        'Lembrete de evento',
        `Amanhã: "${event.title}" em ${dateLabel}${event.location ? ` — ${event.location}` : ''}.`,
        { eventId: event.id },
      );
      sent += userIds.length;
    }

    if (sent > 0) {
      this.logger.log(`Lembretes de evento enviados: ${sent}`);
    }
    return sent;
  }
}
