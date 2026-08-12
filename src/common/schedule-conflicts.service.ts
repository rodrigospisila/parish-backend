import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

/** Conflito de escala detectado em QUALQUER comunidade (visão global). */
export interface GlobalScheduleConflict {
  memberId: string;
  memberName: string;
  scheduleId: string;
  scheduleTitle: string;
  communityName: string | null;
  date: Date;
  /** OVERLAP = horários se sobrepõem; SAME_DAY = mesmo dia, sem sobreposição */
  type: 'OVERLAP' | 'SAME_DAY';
}

/**
 * Detector global de duplo agendamento (multi-comunidade, Fase 1).
 * Busca as atribuições dos membros em TODAS as comunidades no mesmo dia da
 * escala alvo e classifica em sobreposição de horário ou mesmo-dia.
 * A janela usa a mesma semântica do painel de candidatos: horários do evento
 * quando existe, startTime/endTime próprios quando não, fallback de 2h.
 */
@Injectable()
export class ScheduleConflictsService {
  constructor(private readonly prisma: PrismaService) {}

  private applyHhMm(base: Date, hhmm?: string | null): Date | null {
    if (!hhmm) return null;
    const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
    if (!match) return null;
    const result = new Date(base);
    result.setHours(Number(match[1]), Number(match[2]), 0, 0);
    return result;
  }

  private getScheduleWindow(schedule: {
    date: Date;
    startTime?: string | null;
    endTime?: string | null;
    event?: { startDate?: Date | null; endDate?: Date | null } | null;
  }) {
    const start = new Date(schedule.date);
    const fallbackEnd = new Date(start.getTime() + 2 * 60 * 60 * 1000);

    if (!schedule.event) {
      const ownStart = this.applyHhMm(start, schedule.startTime) ?? start;
      const ownEnd = this.applyHhMm(start, schedule.endTime);
      return {
        start: ownStart,
        end:
          ownEnd && ownEnd.getTime() > ownStart.getTime()
            ? ownEnd
            : new Date(ownStart.getTime() + 2 * 60 * 60 * 1000),
      };
    }

    const eventStart = schedule.event?.startDate ? new Date(schedule.event.startDate) : start;
    const eventEnd = schedule.event?.endDate ? new Date(schedule.event.endDate) : fallbackEnd;

    return {
      start: eventStart.getTime() >= start.getTime() ? eventStart : start,
      end: eventEnd.getTime() > start.getTime() ? eventEnd : fallbackEnd,
    };
  }

  private isSameCalendarDay(left: Date, right: Date) {
    return (
      left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate()
    );
  }

  private windowsOverlap(left: { start: Date; end: Date }, right: { start: Date; end: Date }) {
    return left.start.getTime() < right.end.getTime() && right.start.getTime() < left.end.getTime();
  }

  /**
   * Conflitos dos membros com a escala alvo, em qualquer comunidade.
   * Ignora atribuições recusadas e escalas canceladas/excluídas.
   */
  async findConflicts(
    memberIds: string[],
    targetScheduleId: string,
  ): Promise<GlobalScheduleConflict[]> {
    const uniqueIds = [...new Set(memberIds.filter(Boolean))];
    if (uniqueIds.length === 0) return [];

    const target = await this.prisma.schedule.findUnique({
      where: { id: targetScheduleId },
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
        event: { select: { startDate: true, endDate: true } },
      },
    });
    if (!target) return [];

    // Janela de busca: ±36h cobre o dia-calendário da escala em qualquer fuso
    const rangeStart = new Date(target.date.getTime() - 36 * 60 * 60 * 1000);
    const rangeEnd = new Date(target.date.getTime() + 36 * 60 * 60 * 1000);

    const assignments = await this.prisma.scheduleAssignment.findMany({
      where: {
        memberId: { in: uniqueIds },
        scheduleId: { not: targetScheduleId },
        status: { not: 'DECLINED' },
        schedule: {
          deletedAt: null,
          status: { not: 'CANCELLED' },
          date: { gte: rangeStart, lte: rangeEnd },
        },
      },
      include: {
        member: { select: { id: true, fullName: true } },
        schedule: {
          select: {
            id: true,
            title: true,
            date: true,
            startTime: true,
            endTime: true,
            community: { select: { name: true } },
            event: {
              select: {
                startDate: true,
                endDate: true,
                community: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    const targetWindow = this.getScheduleWindow(target);
    const conflicts: GlobalScheduleConflict[] = [];

    for (const assignment of assignments) {
      const otherSchedule = assignment.schedule;
      if (!this.isSameCalendarDay(otherSchedule.date, target.date)) continue;

      const otherWindow = this.getScheduleWindow(otherSchedule);
      conflicts.push({
        memberId: assignment.member.id,
        memberName: assignment.member.fullName,
        scheduleId: otherSchedule.id,
        scheduleTitle: otherSchedule.title,
        communityName:
          otherSchedule.event?.community?.name ?? otherSchedule.community?.name ?? null,
        date: otherSchedule.date,
        type: this.windowsOverlap(targetWindow, otherWindow) ? 'OVERLAP' : 'SAME_DAY',
      });
    }

    // Sobreposições primeiro (mais graves), depois por nome
    conflicts.sort((a, b) =>
      a.type === b.type ? a.memberName.localeCompare(b.memberName) : a.type === 'OVERLAP' ? -1 : 1,
    );
    return conflicts;
  }

  /** Resumo curto e legível para a mensagem de erro/aviso. */
  summarize(conflicts: GlobalScheduleConflict[]): string {
    if (conflicts.length === 0) return '';
    const first = conflicts[0];
    const where = first.communityName ? ` (${first.communityName})` : '';
    const kind = first.type === 'OVERLAP' ? 'no mesmo horário' : 'no mesmo dia';
    if (conflicts.length === 1) {
      return `${first.memberName} já está escalado(a) ${kind} em "${first.scheduleTitle}"${where}.`;
    }
    const memberCount = new Set(conflicts.map((conflict) => conflict.memberId)).size;
    return `${memberCount} membro(s) já escalado(s) no mesmo dia/horário em outras escalas (ex.: ${first.memberName} em "${first.scheduleTitle}"${where}).`;
  }
}
