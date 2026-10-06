import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { scheduleCivilDay, scheduleWindow } from './schedule-time';

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
 * quando existe, startTime/endTime próprios quando não, fallback de 2h — tudo
 * pelo helper único de fuso (common/schedule-time).
 */
@Injectable()
export class ScheduleConflictsService {
  constructor(private readonly prisma: PrismaService) {}

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

    const targetWindow = scheduleWindow(target);
    const targetDay = scheduleCivilDay(target);
    const conflicts: GlobalScheduleConflict[] = [];

    for (const assignment of assignments) {
      const otherSchedule = assignment.schedule;
      // Mesmo dia CIVIL da paróquia (A17): Missa fixa (só-dia + startTime) e
      // evento (instante real) comparados no mesmo fuso
      if (scheduleCivilDay(otherSchedule) !== targetDay) continue;

      const otherWindow = scheduleWindow(otherSchedule);
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
