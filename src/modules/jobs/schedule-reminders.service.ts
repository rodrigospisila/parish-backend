import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { runExclusiveJob } from '../../common/scheduled-job-lock';
import {
  DEFAULT_PARISH_TIME_ZONE,
  ScheduleTimeInput,
  scheduleCivilDay,
  scheduleLabel,
  scheduleStart,
} from '../../common/schedule-time';

const HOUR_MS = 60 * 60 * 1000;
// Janela de varredura dos lembretes D-1 (25h cobre atraso de até 1h do cron)
const REMINDER_24H_WINDOW_MS = 25 * HOUR_MS;
// Abaixo deste limite o lembrete enviado é o de "faltam poucas horas"
const REMINDER_2H_THRESHOLD_MS = 3 * HOUR_MS;
// Cobrança de resposta para atribuições PENDING
const PENDING_NUDGE_WINDOW_MS = 72 * HOUR_MS;
// Escala sem evento grava date à meia-noite UTC (dia civil) e a hora em
// startTime: a busca no banco abre 36h para trás (23:59 local + fuso cabem
// com folga) e o início efetivo é filtrado em memória
const DATE_ONLY_LOOKBACK_MS = 36 * HOUR_MS;

type ReminderSchedule = ScheduleTimeInput & { massScheduleId?: string | null };

/**
 * Lembretes automáticos de escala (roadmap Fase 1, item 1).
 * Roda de hora em hora, com trava distribuída por job (M45). A deduplicação é
 * feita pelos campos reminder24hSentAt / reminder2hSentAt / pendingNudgeSentAt
 * da atribuição, com "claim" atômico (updateMany ... WHERE campo IS NULL)
 * ANTES do envio — duas instâncias nunca mandam o mesmo lembrete.
 * O início efetivo vem do helper único de fuso (A17): dia civil + startTime
 * no fuso da paróquia, nunca setHours() no fuso do processo.
 */
@Injectable()
export class ScheduleRemindersService {
  private readonly logger = new Logger(ScheduleRemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR, { name: 'schedule-reminders', timeZone: DEFAULT_PARISH_TIME_ZONE })
  async handleCron() {
    await runExclusiveJob(
      this.prisma,
      'schedule-reminders',
      async () => {
        const now = new Date();
        await this.sendUpcomingReminders(now);
        await this.sendPendingNudges(now);
      },
      { logger: this.logger },
    );
  }

  /**
   * Datas suspensas ("não haverá", B18) das escalas da agenda fixa da lista,
   * como chaves `${massScheduleId}|AAAA-MM-DD`.
   */
  private async suspendedKeys(schedules: ReminderSchedule[]): Promise<Set<string>> {
    const fixed = schedules.filter((schedule) => schedule.massScheduleId);
    if (fixed.length === 0) return new Set();
    const days = fixed.map((schedule) => scheduleCivilDay(schedule)).sort();
    const rows = await this.prisma.massScheduleCancellation.findMany({
      where: {
        massScheduleId: { in: [...new Set(fixed.map((schedule) => schedule.massScheduleId as string))] },
        // @db.Date: o Prisma lê/grava o dia como meia-noite UTC
        date: { gte: new Date(`${days[0]}T00:00:00.000Z`), lte: new Date(`${days[days.length - 1]}T00:00:00.000Z`) },
      },
      select: { massScheduleId: true, date: true },
    });
    return new Set(rows.map((row) => `${row.massScheduleId}|${row.date.toISOString().slice(0, 10)}`));
  }

  private isSuspended(schedule: ReminderSchedule, suspended: Set<string>): boolean {
    return !!schedule.massScheduleId && suspended.has(`${schedule.massScheduleId}|${scheduleCivilDay(schedule)}`);
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
          date: { gt: new Date(now.getTime() - DATE_ONLY_LOOKBACK_MS), lte: windowEnd },
        },
        OR: [{ reminder24hSentAt: null }, { reminder2hSentAt: null }],
      },
      include: {
        schedule: {
          select: {
            id: true,
            title: true,
            date: true,
            startTime: true,
            endTime: true,
            massScheduleId: true,
            community: { select: { id: true, name: true } },
            event: {
              select: { startDate: true, endDate: true, community: { select: { id: true, name: true } } },
            },
          },
        },
        member: { select: { id: true, fullName: true, userId: true } },
      },
    });

    const suspended = await this.suspendedKeys(assignments.map((assignment) => assignment.schedule));
    let sent = 0;

    for (const assignment of assignments) {
      // Celebração suspensa ("não haverá"): ninguém é lembrado de ir. Não marca
      // o envio — se a data for reativada, o lembrete ainda sai.
      if (this.isSuspended(assignment.schedule, suspended)) continue;

      const startAt = scheduleStart(assignment.schedule);
      const msUntil = startAt.getTime() - now.getTime();
      // Início efetivo fora da janela (já começou ou ainda longe): pula
      if (msUntil <= 0 || startAt.getTime() > windowEnd.getTime()) {
        continue;
      }
      const isFinalReminder = msUntil <= REMINDER_2H_THRESHOLD_MS;

      if (isFinalReminder && assignment.reminder2hSentAt) {
        continue;
      }
      if (!isFinalReminder && assignment.reminder24hSentAt) {
        continue;
      }

      // Claim atômico antes de enviar: a outra instância que leu a mesma linha
      // perde a corrida (count 0) e não manda o push de novo. Marca mesmo sem
      // userId para não varrer o mesmo registro a cada hora.
      const claimed = await this.prisma.scheduleAssignment.updateMany({
        where: isFinalReminder
          ? { id: assignment.id, reminder2hSentAt: null }
          : { id: assignment.id, reminder24hSentAt: null },
        data: isFinalReminder
          ? {
              reminder2hSentAt: now,
              // Evita D-1 redundante quando a atribuição nasceu perto do evento
              reminder24hSentAt: assignment.reminder24hSentAt ?? now,
            }
          : { reminder24hSentAt: now },
      });
      if (claimed.count === 0) continue;

      const dateLabel = scheduleLabel(assignment.schedule);
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
          // Escalas SEM evento (agenda fixa/avulsas) também recebem a cobrança
          OR: [{ eventId: null }, { event: { deletedAt: null } }],
          date: { gt: new Date(now.getTime() - DATE_ONLY_LOOKBACK_MS), lte: windowEnd },
        },
      },
      include: {
        schedule: {
          select: {
            id: true,
            title: true,
            date: true,
            startTime: true,
            endTime: true,
            massScheduleId: true,
            event: { select: { startDate: true, endDate: true } },
          },
        },
        member: { select: { id: true, fullName: true, userId: true } },
      },
    });

    const suspended = await this.suspendedKeys(assignments.map((assignment) => assignment.schedule));
    let sent = 0;

    for (const assignment of assignments) {
      if (this.isSuspended(assignment.schedule, suspended)) continue;
      const startAt = scheduleStart(assignment.schedule);
      if (startAt.getTime() <= now.getTime() || startAt.getTime() > windowEnd.getTime()) {
        continue;
      }

      const claimed = await this.prisma.scheduleAssignment.updateMany({
        where: { id: assignment.id, pendingNudgeSentAt: null },
        data: { pendingNudgeSentAt: now },
      });
      if (claimed.count === 0) continue;

      if (assignment.member.userId) {
        await this.notificationsService.notifyUser(
          assignment.member.userId,
          NotificationType.SCHEDULE_REMINDER,
          'Confirme sua participação',
          `Você ainda não respondeu à escala "${assignment.schedule.title}" de ${scheduleLabel(assignment.schedule)}. Confirme ou recuse no app.`,
          { scheduleId: assignment.schedule.id, assignmentId: assignment.id },
        );
        sent += 1;
      }
    }

    if (sent > 0) {
      this.logger.log(`Cobranças de confirmação enviadas: ${sent}`);
    }

    return sent;
  }
}
