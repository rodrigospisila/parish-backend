import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { runExclusiveJob } from '../../common/scheduled-job-lock';
import {
  DEFAULT_PARISH_TIME_ZONE,
  addDaysYmd,
  todayYmd,
  zonedDayRange,
  zonedParts,
} from '../../common/schedule-time';

const pad = (value: number) => String(value).padStart(2, '0');

/**
 * Lembrete de eventos D-1 (roadmap 2.2).
 * `NotificationType.EVENT_REMINDER` existe no schema mas nada o disparava.
 *
 * Roda uma vez ao dia, às 8h de Brasília (fuso explícito no @Cron — não
 * depende do TZ do container), e lembra os participantes dos eventos de
 * AMANHÃ no calendário da paróquia. Trava distribuída por job + claim atômico
 * em Event.reminderSentForStart (M45): duas réplicas ou a sobreposição de
 * containers num deploy não mandam o push em dobro.
 */
@Injectable()
export class EventRemindersService {
  private readonly logger = new Logger(EventRemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron('0 8 * * *', { name: 'event-reminders', timeZone: DEFAULT_PARISH_TIME_ZONE })
  async handleCron() {
    await runExclusiveJob(this.prisma, 'event-reminders', () => this.remindTomorrowEvents(new Date()), {
      logger: this.logger,
    });
  }

  async remindTomorrowEvents(now: Date): Promise<number> {
    // Janela: amanhã 00:00 → 23:59:59.999 no fuso da paróquia
    const { start, end } = zonedDayRange(addDaysYmd(todayYmd(now), 1));

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
        reminderSentForStart: true,
        participants: {
          where: { member: { deletedAt: null } },
          select: { member: { select: { userId: true } } },
        },
      },
    });

    let sent = 0;
    for (const event of events) {
      // Já lembrado para ESTE início (outra réplica/execução)
      if (event.reminderSentForStart && event.reminderSentForStart.getTime() === event.startDate.getTime()) {
        continue;
      }

      const userIds = event.participants
        .map((participant) => participant.member?.userId)
        .filter((id): id is string => !!id);

      if (userIds.length === 0) {
        continue;
      }

      // Claim atômico: quem perder a corrida (count 0) não envia
      const claimed = await this.prisma.event.updateMany({
        where: {
          id: event.id,
          OR: [{ reminderSentForStart: null }, { reminderSentForStart: { not: event.startDate } }],
        },
        data: { reminderSentForStart: event.startDate },
      });
      if (claimed.count === 0) continue;

      const p = zonedParts(event.startDate);
      const dateLabel = `${pad(p.day)}/${pad(p.month)}, ${pad(p.hour)}:${pad(p.minute)}`;

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
