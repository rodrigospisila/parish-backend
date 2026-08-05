import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { CreateStandaloneScheduleDto } from './dto/create-standalone-schedule.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { ScheduleStatus, AssignmentStatus, NotificationType, UserRole } from '@prisma/client';
import { HierarchyService, CurrentUser } from '../../common/hierarchy.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PdfService } from '../pdf/pdf.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class SchedulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
    private readonly notificationsService: NotificationsService,
    private readonly pdfService: PdfService,
    private readonly auditService: AuditService,
  ) {}

  private toDateOrThrow(value: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Data da escala informada e invalida');
    }
    return date;
  }

  private formatDateLabel(date: Date): string {
    return date.toLocaleDateString('pt-BR');
  }

  /**
   * Notifica o membro escalado (criacao ou substituicao de atribuicao).
   * Best-effort: NotificationsService nunca lanca exception.
   */
  private async notifyMember(
    memberId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: { userId: true },
    });

    if (member?.userId) {
      await this.notificationsService.notifyUser(member.userId, type, title, body, data);
      return;
    }

    // Membro sem conta de usuário (sem app): tenta SMS direto (roadmap 2.3)
    await this.notificationsService.notifyMemberWithoutAccountBySms(memberId, title, body);
  }

  /**
   * Resolve quem deve ser avisado sobre uma pastoral: o(s) coordenador(es) atual(is)
   * da pastoral ou, na ausencia destes, o(s) COMMUNITY_COORDINATOR da comunidade.
   */
  private async getResponsibleCoordinatorUserIds(
    communityPastoralId?: string | null,
    communityId?: string,
  ): Promise<string[]> {
    const userIds: string[] = [];

    if (communityPastoralId) {
      const pastoralCoordinators = await this.prisma.pastoralCoordinator.findMany({
        where: { communityPastoralId, isCurrent: true },
        include: { member: { select: { userId: true } } },
      });
      userIds.push(
        ...pastoralCoordinators
          .map((coordinator) => coordinator.member.userId)
          .filter((id): id is string => !!id),
      );
    }

    if (userIds.length === 0 && communityId) {
      const communityCoordinators = await this.prisma.user.findMany({
        where: { communityId, role: 'COMMUNITY_COORDINATOR', isActive: true },
        select: { id: true },
      });
      userIds.push(...communityCoordinators.map((user) => user.id));
    }

    return [...new Set(userIds)];
  }

  private async getScopedPastoralIds(currentUser?: CurrentUser): Promise<string[]> {
    if (!currentUser?.id) {
      return [];
    }

    if (currentUser.pastoralIds?.length) {
      return currentUser.pastoralIds;
    }

    return this.hierarchyService.getUserPastoralIds(currentUser.id, true);
  }

  private getScopedAssignmentWhere(scopedPastoralIds: string[]) {
    return scopedPastoralIds.length
      ? {
          OR: [
            {
              communityPastoralId: {
                in: scopedPastoralIds,
              },
            },
            {
              member: {
                pastoralMemberships: {
                  some: {
                    communityPastoralId: {
                      in: scopedPastoralIds,
                    },
                    isActive: true,
                  },
                },
              },
            },
          ],
        }
      : undefined;
  }

  private getScopedEventPastoralWhere(scopedPastoralIds: string[]) {
    return scopedPastoralIds.length
      ? {
          communityPastoralId: {
            in: scopedPastoralIds,
          },
        }
      : undefined;
  }

  private getScopedSchedulePastoralWhere(scopedPastoralIds: string[]) {
    return scopedPastoralIds.length
      ? {
          communityPastoralId: {
            in: scopedPastoralIds,
          },
        }
      : undefined;
  }

  private mapSchedulePastoralToEventPastoral(schedulePastoral: any) {
    return {
      communityPastoralId: schedulePastoral.communityPastoralId,
      requiredPeople: schedulePastoral.requiredPeople,
      role: schedulePastoral.role,
      isLeader: schedulePastoral.isLeader,
      communityPastoral: {
        id: schedulePastoral.communityPastoral?.id,
        globalPastoral: schedulePastoral.communityPastoral?.globalPastoral || null,
      },
    };
  }

  private normalizeSchedulePayload<T extends { event: any; pastorals?: any[] }>(schedule: T) {
    const { pastorals = [], ...rest } = schedule as T & { pastorals?: any[] };

    // Escala sem evento (Fase 4.1): sintetiza um resumo "event-like" com os dados
    // da própria escala, para o front renderizar os dois casos com o mesmo shape.
    const raw = schedule as any;
    const baseEvent = schedule.event ?? {
      id: null,
      title: raw.title ?? null,
      type: null,
      location: raw.location ?? null,
      community: raw.community ?? null,
    };

    return {
      ...rest,
      isStandalone: !schedule.event,
      event: {
        ...baseEvent,
        eventPastorals: pastorals.map((pastoral) => this.mapSchedulePastoralToEventPastoral(pastoral)),
      },
    };
  }

  private isSameCalendarDay(left: Date, right: Date) {
    return (
      left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate()
    );
  }

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
    event?: {
      startDate?: Date | null;
      endDate?: Date | null;
    } | null;
  }) {
    const start = new Date(schedule.date);
    const fallbackEnd = new Date(start.getTime() + 2 * 60 * 60 * 1000);

    // Escala sem evento (Fase 4.1): usa os horários próprios (HH:MM) sobre a data
    if (!schedule.event) {
      const ownStart = this.applyHhMm(start, schedule.startTime) ?? start;
      const ownEnd = this.applyHhMm(start, schedule.endTime);
      return {
        start: ownStart,
        end: ownEnd && ownEnd.getTime() > ownStart.getTime() ? ownEnd : new Date(ownStart.getTime() + 2 * 60 * 60 * 1000),
      };
    }

    const eventStart = schedule.event?.startDate ? new Date(schedule.event.startDate) : start;
    const eventEnd = schedule.event?.endDate ? new Date(schedule.event.endDate) : fallbackEnd;

    return {
      start: eventStart.getTime() >= start.getTime() ? eventStart : start,
      end: eventEnd.getTime() > start.getTime() ? eventEnd : fallbackEnd,
    };
  }

  private getMinutesOfDay(date: Date) {
    return date.getHours() * 60 + date.getMinutes();
  }

  private formatMinutes(minutes: number) {
    const normalized = Math.max(0, Math.min(minutes, 24 * 60));
    const hours = Math.floor(normalized / 60)
      .toString()
      .padStart(2, '0');
    const mins = Math.floor(normalized % 60)
      .toString()
      .padStart(2, '0');
    return `${hours}:${mins}`;
  }

  private getWeekdayLabel(dayOfWeek: number) {
    const labels = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    return labels[dayOfWeek] || 'dia informado';
  }

  private formatDateTimeLabel(date: Date) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year} ${this.formatMinutes(this.getMinutesOfDay(date))}`;
  }

  private mergeAvailabilityRanges(
    rules: Array<{
      startMinutes: number;
      endMinutes: number;
    }>,
  ) {
    const ordered = rules
      .map((rule) => ({
        startMinutes: rule.startMinutes,
        endMinutes: rule.endMinutes,
      }))
      .sort((left, right) => left.startMinutes - right.startMinutes);

    return ordered.reduce<Array<{ startMinutes: number; endMinutes: number }>>((acc, rule) => {
      const last = acc[acc.length - 1];

      if (!last || rule.startMinutes > last.endMinutes) {
        acc.push({ ...rule });
        return acc;
      }

      last.endMinutes = Math.max(last.endMinutes, rule.endMinutes);
      return acc;
    }, []);
  }

  private evaluateAvailability(input: {
    scheduleWindow: { start: Date; end: Date };
    rules: Array<{
      dayOfWeek: number;
      startMinutes: number;
      endMinutes: number;
      isActive: boolean;
      notes?: string | null;
    }>;
    exceptions: Array<{
      startDate: Date;
      endDate: Date;
      notes?: string | null;
    }>;
  }) {
    const activeRules = input.rules.filter((rule) => rule.isActive);

    if (!activeRules.length) {
      return {
        status: 'NOT_CONFIGURED' as const,
        hasConfig: false,
        summary: ['Disponibilidade semanal ainda nao cadastrada'],
      };
    }

    const overlappingException = input.exceptions.find((item) =>
      this.windowsOverlap(input.scheduleWindow, {
        start: item.startDate,
        end: item.endDate,
      }),
    );

    if (overlappingException) {
      return {
        status: 'UNAVAILABLE' as const,
        hasConfig: true,
        summary: [
          overlappingException.notes?.trim()
            ? `Indisponivel: ${overlappingException.notes.trim()}`
            : `Bloqueado entre ${this.formatDateTimeLabel(overlappingException.startDate)} e ${this.formatDateTimeLabel(overlappingException.endDate)}`,
        ],
      };
    }

    if (!this.isSameCalendarDay(input.scheduleWindow.start, input.scheduleWindow.end)) {
      return {
        status: 'PARTIAL' as const,
        hasConfig: true,
        summary: ['Evento cruza mais de um dia; validar disponibilidade manualmente'],
      };
    }

    const dayOfWeek = input.scheduleWindow.start.getDay();
    const dayRules = activeRules.filter((rule) => rule.dayOfWeek === dayOfWeek);

    if (!dayRules.length) {
      return {
        status: 'UNAVAILABLE' as const,
        hasConfig: true,
        summary: [`Sem disponibilidade cadastrada para ${this.getWeekdayLabel(dayOfWeek)}`],
      };
    }

    const mergedRanges = this.mergeAvailabilityRanges(dayRules);
    const scheduleStartMinutes = this.getMinutesOfDay(input.scheduleWindow.start);
    const scheduleEndMinutes = this.getMinutesOfDay(input.scheduleWindow.end);
    const coveringRange = mergedRanges.find(
      (range) =>
        range.startMinutes <= scheduleStartMinutes && range.endMinutes >= scheduleEndMinutes,
    );

    if (coveringRange) {
      return {
        status: 'AVAILABLE' as const,
        hasConfig: true,
        summary: [
          `Disponivel em ${this.getWeekdayLabel(dayOfWeek)}, ${this.formatMinutes(coveringRange.startMinutes)}-${this.formatMinutes(coveringRange.endMinutes)}`,
        ],
      };
    }

    const partialRange = mergedRanges.find(
      (range) =>
        range.startMinutes < scheduleEndMinutes && range.endMinutes > scheduleStartMinutes,
    );

    if (partialRange) {
      return {
        status: 'PARTIAL' as const,
        hasConfig: true,
        summary: [
          `Disponibilidade parcial em ${this.getWeekdayLabel(dayOfWeek)}, ${this.formatMinutes(partialRange.startMinutes)}-${this.formatMinutes(partialRange.endMinutes)}`,
        ],
      };
    }

    return {
      status: 'UNAVAILABLE' as const,
      hasConfig: true,
      summary: [
        `Horario fora da janela cadastrada para ${this.getWeekdayLabel(dayOfWeek)}`,
      ],
    };
  }

  private windowsOverlap(
    left: { start: Date; end: Date },
    right: { start: Date; end: Date },
  ) {
    return left.start.getTime() < right.end.getTime() && right.start.getTime() < left.end.getTime();
  }

  private buildHistorySummary(
    assignments: Array<{
      id: string;
      role: string;
      status: AssignmentStatus;
      checkedIn: boolean;
      checkedInAt: Date | null;
      schedule: {
        id: string;
        title: string;
        date: Date;
        event?: {
          title?: string | null;
          location?: string | null;
        } | null;
      };
    }>,
  ) {
    const now = new Date();
    const pastAssignments = assignments
      .filter((assignment) => assignment.schedule.date.getTime() < now.getTime())
      .sort((a, b) => b.schedule.date.getTime() - a.schedule.date.getTime());

    const actionableAssignments = pastAssignments.filter(
      (assignment) => assignment.status !== AssignmentStatus.DECLINED,
    );
    const checkedInCount = actionableAssignments.filter((assignment) => assignment.checkedIn).length;
    const noShowCount = actionableAssignments.filter((assignment) => !assignment.checkedIn).length;
    const declinedCount = assignments.filter(
      (assignment) => assignment.status === AssignmentStatus.DECLINED,
    ).length;
    const respondedCount = pastAssignments.filter(
      (assignment) => assignment.status !== AssignmentStatus.PENDING,
    ).length;
    const attendanceRate =
      actionableAssignments.length > 0
        ? (checkedInCount / actionableAssignments.length) * 100
        : 0;
    const responseRate =
      pastAssignments.length > 0 ? (respondedCount / pastAssignments.length) * 100 : 0;

    const recent = pastAssignments.slice(0, 5).map((assignment) => ({
      assignmentId: assignment.id,
      scheduleId: assignment.schedule.id,
      title: assignment.schedule.event?.title || assignment.schedule.title,
      role: assignment.role,
      date: assignment.schedule.date,
      location: assignment.schedule.event?.location || null,
      outcome: assignment.checkedIn
        ? 'CHECKED_IN'
        : assignment.status === AssignmentStatus.DECLINED
          ? 'DECLINED'
          : 'NO_SHOW',
      status: assignment.status,
      checkedIn: assignment.checkedIn,
      checkedInAt: assignment.checkedInAt,
    }));

    return {
      totalPastAssignments: pastAssignments.length,
      actionableAssignments: actionableAssignments.length,
      respondedCount,
      checkedInCount,
      declinedCount,
      noShowCount,
      attendanceRate: parseFloat(attendanceRate.toFixed(2)),
      responseRate: parseFloat(responseRate.toFixed(2)),
      recent,
    };
  }

  private buildRecommendation(input: {
    currentScheduleAssigned: boolean;
    overlappingAssignmentsCount: number;
    sameDayAssignmentsCount: number;
    upcoming30DaysCount: number;
    noShowCount: number;
    attendanceRate: number;
    checkedInCount: number;
    respondedCount: number;
    hasAvailabilityConfig: boolean;
    availabilityStatus: 'NOT_CONFIGURED' | 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE';
  }) {
    const reasons: string[] = [];
    let score = 100;

    if (input.currentScheduleAssigned) {
      score -= 1000;
      reasons.push('Ja esta atribuido nesta escala');
    }

    if (input.overlappingAssignmentsCount > 0) {
      score -= 60;
      reasons.push(`Conflito de horario com ${input.overlappingAssignmentsCount} escala(s)`);
    }

    if (input.sameDayAssignmentsCount > 0) {
      score -= 20;
      reasons.push(`Ja atua em ${input.sameDayAssignmentsCount} escala(s) no mesmo dia`);
    }

    if (input.upcoming30DaysCount >= 4) {
      score -= 15;
      reasons.push('Carga alta de escalas nos proximos 30 dias');
    } else if (input.upcoming30DaysCount >= 2) {
      score -= 8;
      reasons.push('Ja possui outras escalas nos proximos dias');
    }

    if (input.noShowCount >= 3) {
      score -= 20;
      reasons.push('Historico recente de faltas exige atencao');
    } else if (input.noShowCount > 0) {
      score -= 8;
      reasons.push('Ja teve falta recente em escala');
    }

    if (input.checkedInCount >= 3 && input.attendanceRate >= 80) {
      score += 10;
      reasons.push('Bom historico recente de presenca');
    }

    if (input.availabilityStatus === 'AVAILABLE') {
      score += 8;
      reasons.push('Disponibilidade compativel com data e horario');
    } else if (input.availabilityStatus === 'PARTIAL') {
      score -= 20;
      reasons.push('Disponibilidade cobre apenas parte do horario');
    } else if (input.availabilityStatus === 'UNAVAILABLE') {
      score -= 50;
      reasons.push('Disponibilidade indica indisponibilidade neste horario');
    }

    if (input.respondedCount >= 3) {
      score += 5;
      reasons.push('Costuma responder as convocacoes');
    }

    if (!input.hasAvailabilityConfig) {
      reasons.push('Disponibilidade ainda nao cadastrada');
    }

    const level =
      input.currentScheduleAssigned ||
      input.overlappingAssignmentsCount > 0 ||
      input.availabilityStatus === 'UNAVAILABLE'
        ? 'CONFLICT'
        : input.sameDayAssignmentsCount > 0 ||
            input.noShowCount >= 2 ||
            input.upcoming30DaysCount >= 4 ||
            input.availabilityStatus === 'PARTIAL'
          ? 'ATTENTION'
          : 'RECOMMENDED';

    return {
      level,
      score,
      reasons,
    };
  }

  // ========== SCHEDULES ==========

  async createSchedule(createScheduleDto: CreateScheduleDto, currentUser?: CurrentUser) {
    const { eventId, date, pastoralSettings = [], ...rest } = createScheduleDto;
    const scheduleDate = this.toDateOrThrow(date);
    const now = new Date();
    const scopedPastoralIds =
      currentUser?.role === 'PASTORAL_COORDINATOR'
        ? await this.getScopedPastoralIds(currentUser)
        : [];

    if (scheduleDate.getTime() < now.getTime()) {
      throw new BadRequestException('Nao e possivel criar escala em data e horario anteriores');
    }

    // Verificar se o evento existe
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        eventPastorals: {
          select: {
            communityPastoralId: true,
            role: true,
            isLeader: true,
            requiredPeople: true,
            communityPastoral: {
              select: {
                id: true,
                globalPastoral: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Evento com ID ${eventId} nÃ£o encontrado`);
    }

    if (scheduleDate.getTime() < event.startDate.getTime()) {
      throw new BadRequestException('Data da escala nao pode ser anterior ao inicio do evento');
    }

    if (event.endDate && scheduleDate.getTime() > event.endDate.getTime()) {
      throw new BadRequestException('Data da escala nao pode ser posterior ao fim do evento');
    }

    const duplicateSchedule = await this.prisma.schedule.findFirst({
      where: {
        eventId,
        date: scheduleDate,
      },
    });

    if (duplicateSchedule) {
      throw new BadRequestException('Ja existe uma escala para este evento nesta data e horario');
    }

    // Validar acesso ao evento para PASTORAL_COORDINATOR
    if (currentUser) {
      const hasAccess = await this.hierarchyService.hasAccessToEvent(currentUser.id, eventId);
      if (!hasAccess) {
        throw new ForbiddenException('VocÃª nÃ£o tem permissÃ£o para criar escalas para este evento');
      }
    }

    const eventPastorals = event.eventPastorals || [];
    const availablePastoralIds = new Set(eventPastorals.map((item) => item.communityPastoralId));
    const duplicatePastoralIds = pastoralSettings.filter(
      (item, index, list) => list.findIndex((candidate) => candidate.communityPastoralId === item.communityPastoralId) !== index,
    );

    if (duplicatePastoralIds.length > 0) {
      throw new BadRequestException('Nao envie pastorais duplicadas na configuracao da escala');
    }

    for (const pastoralSetting of pastoralSettings) {
      if (!availablePastoralIds.has(pastoralSetting.communityPastoralId)) {
        throw new BadRequestException('Uma das pastorais informadas nao pertence ao evento selecionado');
      }

      if (scopedPastoralIds.length && !scopedPastoralIds.includes(pastoralSetting.communityPastoralId)) {
        throw new ForbiddenException('Voce nao pode alterar a quantidade de vagas de outra pastoral');
      }
    }

    const pastoralSettingsMap = new Map(
      pastoralSettings.map((item) => [item.communityPastoralId, Number(item.requiredPeople || 0)]),
    );

    const createdSchedule = await this.prisma.schedule.create({
      data: {
        ...rest,
        date: scheduleDate,
        eventId,
        status: ScheduleStatus.OPEN,
        pastorals: {
          create: eventPastorals.map((eventPastoral) => ({
            communityPastoralId: eventPastoral.communityPastoralId,
            role: eventPastoral.role || null,
            isLeader: eventPastoral.isLeader,
            requiredPeople: pastoralSettingsMap.has(eventPastoral.communityPastoralId)
              ? pastoralSettingsMap.get(eventPastoral.communityPastoralId) || 0
              : Number(eventPastoral.requiredPeople || 0),
          })),
        },
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            type: true,
            community: {
              select: {
                id: true,
                name: true,
                parish: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        pastorals: {
          where: this.getScopedSchedulePastoralWhere(scopedPastoralIds),
          include: {
            communityPastoral: {
              select: {
                id: true,
                globalPastoral: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            isLeader: 'desc',
          },
        },
      },
    });

    return this.normalizeSchedulePayload(createdSchedule);
  }

  /**
   * Cria uma escala de serviço contínuo SEM evento (Fase 4.1).
   * Ancorada diretamente na comunidade + horário próprio.
   */
  async createStandaloneSchedule(dto: CreateStandaloneScheduleDto, currentUser: CurrentUser) {
    const scheduleDate = this.toDateOrThrow(dto.date);
    const now = new Date();
    if (scheduleDate.getTime() < now.getTime()) {
      throw new BadRequestException('Nao e possivel criar escala em data e horario anteriores');
    }

    const inScope = await this.hierarchyService.isCommunityInScope(currentUser, dto.communityId);
    if (!inScope) {
      throw new ForbiddenException('Voce nao tem permissao para criar escalas nesta comunidade');
    }

    const pastoralSettings = dto.pastoralSettings ?? [];
    // Valida que as pastorais pertencem à comunidade e (para coordenador) ao seu escopo
    if (pastoralSettings.length) {
      const scopedPastoralIds =
        currentUser.role === 'PASTORAL_COORDINATOR' ? await this.getScopedPastoralIds(currentUser) : [];
      const communityPastorals = await this.prisma.communityPastoral.findMany({
        where: { communityId: dto.communityId, deletedAt: null },
        select: { id: true },
      });
      const validIds = new Set(communityPastorals.map((cp) => cp.id));
      for (const setting of pastoralSettings) {
        if (!validIds.has(setting.communityPastoralId)) {
          throw new BadRequestException('Pastoral informada nao pertence a esta comunidade');
        }
        if (scopedPastoralIds.length && !scopedPastoralIds.includes(setting.communityPastoralId)) {
          throw new ForbiddenException('Voce nao pode configurar vagas de outra pastoral');
        }
      }
    }

    const created = await this.prisma.schedule.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        date: scheduleDate,
        communityId: dto.communityId,
        startTime: dto.startTime ?? null,
        endTime: dto.endTime ?? null,
        location: dto.location ?? null,
        status: ScheduleStatus.OPEN,
        pastorals: {
          create: pastoralSettings.map((setting) => ({
            communityPastoralId: setting.communityPastoralId,
            requiredPeople: Number(setting.requiredPeople || 0),
          })),
        },
      },
      include: {
        community: { select: { id: true, name: true } },
        pastorals: {
          include: {
            communityPastoral: {
              select: { id: true, globalPastoral: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });

    await this.auditService.log({
      actor: { id: currentUser.id, email: currentUser.email, role: currentUser.role },
      action: 'CREATE',
      entity: 'Schedule',
      entityId: created.id,
      metadata: { standalone: true, communityId: dto.communityId },
    });

    return created;
  }

  async findAllSchedules(eventId?: string, currentUser?: CurrentUser) {
    const hierarchyFilter = currentUser ? this.hierarchyService.applyScheduleFilter(currentUser) : {};
    const scopedPastoralIds =
      currentUser?.role === 'PASTORAL_COORDINATOR'
        ? await this.getScopedPastoralIds(currentUser)
        : [];
    const assignmentWhere = this.getScopedAssignmentWhere(scopedPastoralIds);

    // Combina o filtro de escopo (pode conter OR para escalas com/sem evento)
    // com a exclusão de eventos arquivados — sem quebrar escalas standalone.
    const where: any = { deletedAt: null };
    const andConditions: any[] = [
      // Escala sem evento OU cujo evento não está arquivado
      { OR: [{ eventId: null }, { event: { deletedAt: null } }] },
    ];
    if (hierarchyFilter.OR) {
      andConditions.push({ OR: hierarchyFilter.OR });
    } else {
      Object.assign(where, hierarchyFilter);
    }
    if (eventId) {
      where.eventId = eventId;
    }
    where.AND = andConditions;

    const schedules = await this.prisma.schedule.findMany({
      where,
      include: {
        event: {
          select: {
            id: true,
            title: true,
            type: true,
            community: {
              select: {
                id: true,
                name: true,
                parish: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        // Comunidade da própria escala (fallback para escala sem evento)
        community: {
          select: {
            id: true,
            name: true,
            parish: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        pastorals: {
          where: this.getScopedSchedulePastoralWhere(scopedPastoralIds),
          include: {
            communityPastoral: {
              select: {
                id: true,
                globalPastoral: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            isLeader: 'desc',
          },
        },
        assignments: {
          where: assignmentWhere,
          include: {
            communityPastoral: {
              select: {
                id: true,
                community: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                globalPastoral: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            member: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        _count: {
          select: {
            assignments: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    return schedules.map((schedule) => this.normalizeSchedulePayload(schedule));
  }

  async findOneSchedule(id: string, currentUser?: CurrentUser) {
    if (currentUser) {
      const hasAccess = await this.hierarchyService.hasAccessToSchedule(currentUser.id, id);
      if (!hasAccess) {
        throw new ForbiddenException('Voce nao tem permissao para acessar esta escala');
      }
    }

    const scopedPastoralIds =
      currentUser?.role === 'PASTORAL_COORDINATOR'
        ? await this.getScopedPastoralIds(currentUser)
        : [];
    const assignmentWhere = this.getScopedAssignmentWhere(scopedPastoralIds);

    const schedule = await this.prisma.schedule.findFirst({
      where: { id, deletedAt: null },
      include: {
        event: {
          include: {
            community: {
              select: {
                id: true,
                name: true,
                parish: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        // Comunidade da própria escala (fallback para escala sem evento)
        community: {
          select: {
            id: true,
            name: true,
            parish: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        pastorals: {
          where: this.getScopedSchedulePastoralWhere(scopedPastoralIds),
          include: {
            communityPastoral: {
              select: {
                id: true,
                globalPastoral: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            isLeader: 'desc',
          },
        },
        assignments: {
          where: assignmentWhere,
          include: {
            communityPastoral: {
              select: {
                id: true,
                community: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                globalPastoral: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            member: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                photoUrl: true,
              },
            },
          },
          orderBy: {
            role: 'asc',
          },
        },
        _count: {
          select: {
            assignments: true,
          },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException(`Escala com ID ${id} nÃ£o encontrada`);
    }

    return this.normalizeSchedulePayload(schedule);
  }

  async removeSchedule(id: string, currentUser?: CurrentUser) {
    await this.findOneSchedule(id, currentUser);

    // Validar acesso Ã  escala
    if (currentUser) {
      const hasAccess = await this.hierarchyService.hasAccessToSchedule(currentUser.id, id);
      if (!hasAccess) {
        throw new ForbiddenException('VocÃª nÃ£o tem permissÃ£o para excluir esta escala');
      }
    }

    // Soft delete: preserva atribuições, confirmações e histórico de presença
    return this.prisma.schedule.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ========== ASSIGNMENTS ==========

  async createAssignment(createAssignmentDto: CreateAssignmentDto, currentUser?: CurrentUser) {
    const {
      scheduleId,
      memberId,
      role,
      communityPastoralId,
    } = createAssignmentDto;
    const scopedPastoralIds =
      currentUser?.role === 'PASTORAL_COORDINATOR'
        ? await this.getScopedPastoralIds(currentUser)
        : [];

    // Verificar se a escala existe
    const schedule = await this.prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: {
        pastorals: {
          select: {
            communityPastoralId: true,
            requiredPeople: true,
          },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException(`Escala com ID ${scheduleId} nÃ£o encontrada`);
    }

    if (schedule.status !== ScheduleStatus.OPEN) {
      throw new BadRequestException('Escala nao esta aberta para atribuicao');
    }

    // Impedir atribuicao em escalas passadas
    if (schedule.date.getTime() < new Date().getTime()) {
      throw new BadRequestException('Nao e possivel adicionar membros em escalas com data/hora passada');
    }

    // Validar acesso Ã  escala
    if (currentUser) {
      const hasAccess = await this.hierarchyService.hasAccessToSchedule(currentUser.id, scheduleId);
      if (!hasAccess) {
        throw new ForbiddenException('VocÃª nÃ£o tem permissÃ£o para adicionar membros a esta escala');
      }
    }

    // Verificar se o membro existe e esta ativo
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      throw new NotFoundException(`Membro com ID ${memberId} nÃ£o encontrado`);
    }

    if (member.status !== 'ACTIVE') {
      throw new BadRequestException('Somente membros ativos podem ser escalados');
    }

    const schedulePastorals = schedule.pastorals || [];
    const hasEventPastorals = schedulePastorals.length > 0;
    const requestedPastoralId = communityPastoralId?.trim() || '';
    const allowedPastoralIds = scopedPastoralIds.length
      ? schedulePastorals
          .map((schedulePastoral) => schedulePastoral.communityPastoralId)
          .filter((schedulePastoralId) => scopedPastoralIds.includes(schedulePastoralId))
      : schedulePastorals.map((schedulePastoral) => schedulePastoral.communityPastoralId);
    let resolvedCommunityPastoralId = requestedPastoralId || '';

    if (hasEventPastorals) {
      if (!requestedPastoralId && allowedPastoralIds.length === 1) {
        resolvedCommunityPastoralId = allowedPastoralIds[0];
      }

      if (requestedPastoralId && !schedulePastorals.some((ep) => ep.communityPastoralId === requestedPastoralId)) {
        throw new BadRequestException('Esta pastoral nao esta vinculada ao evento da escala');
      }

      if (
        requestedPastoralId &&
        scopedPastoralIds.length > 0 &&
        !allowedPastoralIds.includes(requestedPastoralId)
      ) {
        throw new ForbiddenException('Voce nao tem permissao para atribuir esta pastoral nesta escala');
      }

      if (!requestedPastoralId && allowedPastoralIds.length !== 1) {
        if (allowedPastoralIds.length === 0) {
          throw new ForbiddenException('Voce nao pode atribuir membros para pastoral sem permissao');
        }

        throw new BadRequestException(
          'Este evento possui mais de uma pastoral vinculada. Selecione a pastoral para esta atribuicao',
        );
      }

      const pastoralMember = await this.prisma.pastoralMember.findFirst({
        where: {
          memberId,
          communityPastoralId: resolvedCommunityPastoralId,
          isActive: true,
        },
      });

      if (!pastoralMember) {
        throw new BadRequestException('Membro nao pertence a esta pastoral');
      }

      const selectedPastoral = schedulePastorals.find(
        (schedulePastoral) => schedulePastoral.communityPastoralId === resolvedCommunityPastoralId,
      );
      const requiredPeople = Number(selectedPastoral?.requiredPeople || 0);

      if (requiredPeople > 0) {
        const assignedCount = await this.prisma.scheduleAssignment.count({
          where: {
            scheduleId,
            communityPastoralId: resolvedCommunityPastoralId,
          },
        });

        if (assignedCount >= requiredPeople) {
          throw new BadRequestException('Limite de membros atingido para esta pastoral nesta escala');
        }
      }
    } else if (requestedPastoralId) {
      throw new BadRequestException('Evento desta escala nao possui pastorais vinculadas');
    }

    // Evitar duplicidade para o mesmo membro e mesma funcao
    const existingAssignment = await this.prisma.scheduleAssignment.findFirst({
      where: {
        scheduleId,
        memberId,
        role,
      },
    });

    if (existingAssignment) {
      throw new BadRequestException(
        `Membro jÃ¡ estÃ¡ atribuÃ­do a esta escala com a funÃ§Ã£o ${role}`,
      );
    }

    const existingForSchedule = await this.prisma.scheduleAssignment.findFirst({
      where: {
        scheduleId,
        memberId,
      },
    });

    if (existingForSchedule) {
      throw new BadRequestException('Membro ja foi adicionado nesta escala para outra funcao');
    }

    const createdAssignment = await this.prisma.scheduleAssignment.create({
      data: {
        role,
        scheduleId,
        memberId,
        ...(resolvedCommunityPastoralId
          ? {
              communityPastoralId: resolvedCommunityPastoralId,
            }
          : {}),
      },
      include: {
        schedule: {
          select: {
            id: true,
            title: true,
            date: true,
          },
        },
        member: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
        communityPastoral: {
          select: {
            id: true,
            globalPastoral: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    await this.notifyMember(
      memberId,
      NotificationType.ASSIGNMENT_CREATED,
      'Nova escala',
      `Voce foi escalado(a) para "${createdAssignment.schedule.title}" em ${this.formatDateLabel(createdAssignment.schedule.date)}.`,
      { scheduleId, assignmentId: createdAssignment.id },
    );

    return createdAssignment;
  }

  async findAllAssignments(scheduleId?: string, memberId?: string, currentUser?: CurrentUser) {
    const scopedPastoralIds =
      currentUser?.role === 'PASTORAL_COORDINATOR'
        ? await this.getScopedPastoralIds(currentUser)
        : [];
    const where: any = {};

    if (scheduleId) {
      where.scheduleId = scheduleId;
    }

    if (memberId) {
      where.memberId = memberId;
    }

    if (scopedPastoralIds.length) {
      where.schedule = {
        pastorals: {
          some: {
            communityPastoralId: {
              in: scopedPastoralIds,
            },
          },
        },
      };
      where.OR = [
        {
          communityPastoralId: {
            in: scopedPastoralIds,
          },
        },
        {
          member: {
            pastoralMemberships: {
              some: {
                communityPastoralId: {
                  in: scopedPastoralIds,
                },
                isActive: true,
              },
            },
          },
        },
      ];
    }

    return this.prisma.scheduleAssignment.findMany({
      where,
      include: {
        schedule: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
                type: true,
              },
            },
          },
        },
        member: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOneAssignment(id: string, currentUser?: CurrentUser) {
    if (currentUser) {
      const hasAccess = await this.hierarchyService.hasAccessToAssignment(currentUser.id, id);
      if (!hasAccess) {
        throw new ForbiddenException('Voce nao tem permissao para acessar esta atribuicao');
      }
    }

    const assignment = await this.prisma.scheduleAssignment.findUnique({
      where: { id },
      include: {
        schedule: {
          include: {
            event: true,
          },
        },
        member: true,
        communityPastoral: {
          select: {
            id: true,
            communityId: true,
            globalPastoral: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException(`AtribuiÃ§Ã£o com ID ${id} nÃ£o encontrada`);
    }

    return assignment;
  }

  async removeAssignment(id: string, currentUser?: CurrentUser) {
    const assignment = await this.findOneAssignment(id, currentUser);

    // Validar acesso Ã  escala
    if (currentUser && assignment.scheduleId) {
      const hasAccess = await this.hierarchyService.hasAccessToSchedule(currentUser.id, assignment.scheduleId);
      if (!hasAccess) {
        throw new ForbiddenException('VocÃª nÃ£o tem permissÃ£o para remover membros desta escala');
      }
    }

    return this.prisma.scheduleAssignment.delete({
      where: { id },
    });
  }

  async replaceAssignment(id: string, newMemberId: string, currentUser?: CurrentUser) {
    const assignment = await this.findOneAssignment(id, currentUser);
    const scopedPastoralIds =
      currentUser?.role === 'PASTORAL_COORDINATOR'
        ? await this.getScopedPastoralIds(currentUser)
        : [];

    if (assignment.checkedIn) {
      throw new BadRequestException('Nao e possivel substituir um membro apos o check-in');
    }

    if (assignment.memberId === newMemberId) {
      throw new BadRequestException('Selecione um membro diferente para a substituicao');
    }

    const schedule = await this.prisma.schedule.findUnique({
      where: { id: assignment.scheduleId },
      include: {
        pastorals: {
          select: {
            communityPastoralId: true,
            requiredPeople: true,
          },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException(`Escala com ID ${assignment.scheduleId} nao encontrada`);
    }

    if (schedule.status !== ScheduleStatus.OPEN) {
      throw new BadRequestException('Escala nao esta aberta para substituicao');
    }

    if (schedule.date.getTime() < new Date().getTime()) {
      throw new BadRequestException('Nao e possivel substituir membros em escalas com data/hora passada');
    }

    if (currentUser) {
      const hasAccess = await this.hierarchyService.hasAccessToSchedule(currentUser.id, assignment.scheduleId);
      if (!hasAccess) {
        throw new ForbiddenException('Voce nao tem permissao para substituir membros nesta escala');
      }
    }

    const member = await this.prisma.member.findUnique({
      where: { id: newMemberId },
    });

    if (!member) {
      throw new NotFoundException(`Membro com ID ${newMemberId} nao encontrado`);
    }

    if (member.status !== 'ACTIVE') {
      throw new BadRequestException('Somente membros ativos podem ser escalados');
    }

    const schedulePastorals = schedule.pastorals || [];
    const hasEventPastorals = schedulePastorals.length > 0;
    const requestedPastoralId = assignment.communityPastoralId?.trim() || '';
    const allowedPastoralIds = scopedPastoralIds.length
      ? schedulePastorals
          .map((schedulePastoral) => schedulePastoral.communityPastoralId)
          .filter((schedulePastoralId) => scopedPastoralIds.includes(schedulePastoralId))
      : schedulePastorals.map((schedulePastoral) => schedulePastoral.communityPastoralId);
    let resolvedCommunityPastoralId = requestedPastoralId || '';

    if (hasEventPastorals) {
      if (!requestedPastoralId && allowedPastoralIds.length === 1) {
        resolvedCommunityPastoralId = allowedPastoralIds[0];
      }

      if (requestedPastoralId && !schedulePastorals.some((ep) => ep.communityPastoralId === requestedPastoralId)) {
        throw new BadRequestException('Esta pastoral nao esta vinculada ao evento da escala');
      }

      if (
        requestedPastoralId &&
        scopedPastoralIds.length > 0 &&
        !allowedPastoralIds.includes(requestedPastoralId)
      ) {
        throw new ForbiddenException('Voce nao tem permissao para substituir esta pastoral nesta escala');
      }

      if (!requestedPastoralId && allowedPastoralIds.length !== 1) {
        if (allowedPastoralIds.length === 0) {
          throw new ForbiddenException('Voce nao pode atribuir membros para pastoral sem permissao');
        }

        throw new BadRequestException(
          'Este evento possui mais de uma pastoral vinculada. Selecione a pastoral para esta atribuicao',
        );
      }

      const pastoralMember = await this.prisma.pastoralMember.findFirst({
        where: {
          memberId: newMemberId,
          communityPastoralId: resolvedCommunityPastoralId,
          isActive: true,
        },
      });

      if (!pastoralMember) {
        throw new BadRequestException('Membro nao pertence a esta pastoral');
      }

      const selectedPastoral = schedulePastorals.find(
        (schedulePastoral) => schedulePastoral.communityPastoralId === resolvedCommunityPastoralId,
      );
      const requiredPeople = Number(selectedPastoral?.requiredPeople || 0);

      if (requiredPeople > 0) {
        const assignedCount = await this.prisma.scheduleAssignment.count({
          where: {
            scheduleId: assignment.scheduleId,
            communityPastoralId: resolvedCommunityPastoralId,
            NOT: {
              id,
            },
          },
        });

        if (assignedCount >= requiredPeople) {
          throw new BadRequestException('Limite de membros atingido para esta pastoral nesta escala');
        }
      }
    } else if (requestedPastoralId) {
      throw new BadRequestException('Evento desta escala nao possui pastorais vinculadas');
    }

    const existingAssignment = await this.prisma.scheduleAssignment.findFirst({
      where: {
        scheduleId: assignment.scheduleId,
        memberId: newMemberId,
        role: assignment.role,
        NOT: {
          id,
        },
      },
    });

    if (existingAssignment) {
      throw new BadRequestException(
        `Membro ja esta atribuido a esta escala com a funcao ${assignment.role}`,
      );
    }

    const existingForSchedule = await this.prisma.scheduleAssignment.findFirst({
      where: {
        scheduleId: assignment.scheduleId,
        memberId: newMemberId,
        NOT: {
          id,
        },
      },
    });

    if (existingForSchedule) {
      throw new BadRequestException('Membro ja foi adicionado nesta escala para outra funcao');
    }

    const newAssignment = await this.prisma.$transaction(async (tx) => {
      await tx.scheduleAssignment.delete({
        where: { id },
      });

      return tx.scheduleAssignment.create({
        data: {
          role: assignment.role,
          scheduleId: assignment.scheduleId,
          memberId: newMemberId,
          ...(resolvedCommunityPastoralId
            ? {
                communityPastoralId: resolvedCommunityPastoralId,
              }
            : {}),
        },
        include: {
          schedule: {
            select: {
              id: true,
              title: true,
              date: true,
            },
          },
          member: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
          communityPastoral: {
            select: {
              id: true,
              globalPastoral: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
    });

    await this.notifyMember(
      newMemberId,
      NotificationType.ASSIGNMENT_REPLACED,
      'Voce foi escalado(a)',
      `Voce foi escalado(a) para "${newAssignment.schedule.title}" em ${this.formatDateLabel(newAssignment.schedule.date)} (substituicao).`,
      { scheduleId: assignment.scheduleId, assignmentId: newAssignment.id },
    );

    return newAssignment;
  }

  // ========== CHECK-IN ==========

  async checkIn(id: string, currentUser?: CurrentUser) {
    const assignment = await this.findOneAssignment(id, currentUser);

    // Validar permissÃ£o para fazer check-in
    if (currentUser) {
      const hasAccess = await this.hierarchyService.hasAccessToAssignment(currentUser.id, id);
      if (!hasAccess) {
        throw new ForbiddenException('VocÃª nÃ£o tem permissÃ£o para fazer check-in nesta escala');
      }
    }

    if (assignment.checkedIn) {
      throw new BadRequestException('Check-in jÃ¡ realizado');
    }

    if (assignment.status !== 'CONFIRMED') {
      throw new BadRequestException('A atribuicao precisa estar confirmada antes do check-in');
    }

    return this.prisma.scheduleAssignment.update({
      where: { id },
      data: {
        checkedIn: true,
        checkedInAt: new Date(),
      },
      include: {
        schedule: {
          select: {
            id: true,
            title: true,
            date: true,
          },
        },
        member: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });
  }

  async undoCheckIn(id: string, currentUser?: CurrentUser) {
    const assignment = await this.findOneAssignment(id, currentUser);

    // Validar permissÃ£o para desfazer check-in
    if (currentUser) {
      const hasAccess = await this.hierarchyService.hasAccessToAssignment(currentUser.id, id);
      if (!hasAccess) {
        throw new ForbiddenException('VocÃª nÃ£o tem permissÃ£o para desfazer check-in nesta escala');
      }
    }

    if (!assignment.checkedIn) {
      throw new BadRequestException('Check-in nÃ£o foi realizado');
    }

    return this.prisma.scheduleAssignment.update({
      where: { id },
      data: {
        checkedIn: false,
        checkedInAt: null,
      },
    });
  }

  // ========== MEMBROS ELEGÃVEIS ==========

  /**
   * Busca membros elegÃ­veis para uma escala baseado nas pastorais vinculadas ao evento
   * Se o evento tiver pastorais vinculadas, retorna apenas membros dessas pastorais
   * Se nÃ£o tiver pastorais vinculadas, retorna todos os membros da comunidade do evento
   */
  async findEligibleMembers(eventId: string, currentUser?: CurrentUser) {
    // Validar acesso ao evento
    if (currentUser) {
      const hasAccess = await this.hierarchyService.hasAccessToEvent(currentUser.id, eventId);
      if (!hasAccess) {
        throw new ForbiddenException('VocÃª nÃ£o tem permissÃ£o para acessar este evento');
      }
    }

    const scopedPastoralIds =
      currentUser?.role === 'PASTORAL_COORDINATOR'
        ? await this.getScopedPastoralIds(currentUser)
        : [];

    // Buscar o evento com suas pastorais vinculadas
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        eventPastorals: {
          where: this.getScopedEventPastoralWhere(scopedPastoralIds),
          include: {
            communityPastoral: {
              include: {
                members: {
                  where: { isActive: true },
                  include: {
                    member: {
                      select: {
                        id: true,
                        fullName: true,
                        email: true,
                        phone: true,
                        photoUrl: true,
                        status: true,
                      },
                    },
                  },
                },
                globalPastoral: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        community: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Evento com ID ${eventId} nÃ£o encontrado`);
    }

    // Se o evento tem pastorais vinculadas, retornar membros dessas pastorais
    if (event.eventPastorals && event.eventPastorals.length > 0) {
      const membersMap = new Map();
      const pastoralInfo: any[] = [];

      for (const ep of event.eventPastorals) {
        const pastoral = ep.communityPastoral;
        const pastoralName = pastoral.globalPastoral?.name || 'Pastoral';
        
        pastoralInfo.push({
          id: pastoral.id,
          name: pastoralName,
          role: ep.role,
          isLeader: ep.isLeader,
        });

        for (const pm of pastoral.members) {
          if (pm.member.status === 'ACTIVE') {
            if (!membersMap.has(pm.member.id)) {
              membersMap.set(pm.member.id, {
                ...pm.member,
                pastorals: [{ name: pastoralName, role: pm.role }],
              });
            } else {
              const existing = membersMap.get(pm.member.id);
              existing.pastorals.push({ name: pastoralName, role: pm.role });
            }
          }
        }
      }

      return {
        eventId: event.id,
        eventTitle: event.title,
        community: event.community,
        pastorals: pastoralInfo,
        hasPastorals: true,
        members: Array.from(membersMap.values()),
      };
    }

    if (scopedPastoralIds.length) {
      return {
        eventId: event.id,
        eventTitle: event.title,
        community: event.community,
        pastorals: [],
        hasPastorals: false,
        members: [],
      };
    }

    // Se nÃ£o tem pastorais vinculadas, retornar todos os membros ativos da comunidade
    const members = await this.prisma.member.findMany({
      where: {
        communityId: event.communityId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        photoUrl: true,
        status: true,
      },
      orderBy: {
        fullName: 'asc',
      },
    });

    return {
      eventId: event.id,
      eventTitle: event.title,
      community: event.community,
      pastorals: [],
      hasPastorals: false,
      members: members.map(m => ({ ...m, pastorals: [] })),
    };
  }

  async findScheduleCandidates(scheduleId: string, currentUser?: CurrentUser) {
    if (currentUser) {
      const hasAccess = await this.hierarchyService.hasAccessToSchedule(currentUser.id, scheduleId);
      if (!hasAccess) {
        throw new ForbiddenException('Voce nao tem permissao para acessar esta escala');
      }
    }

    const scopedPastoralIds =
      currentUser?.role === 'PASTORAL_COORDINATOR'
        ? await this.getScopedPastoralIds(currentUser)
        : [];
    const assignmentWhere = this.getScopedAssignmentWhere(scopedPastoralIds);

    const schedule = await this.prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: {
        event: {
          include: {
            community: {
              select: {
                id: true,
                name: true,
                parish: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        // Comunidade própria (escala sem evento — Fase 4.1)
        community: {
          select: { id: true, name: true, parish: { select: { id: true, name: true } } },
        },
        pastorals: {
          where: this.getScopedSchedulePastoralWhere(scopedPastoralIds),
          include: {
            communityPastoral: {
              include: {
                globalPastoral: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                members: {
                  where: { isActive: true },
                  include: {
                    member: {
                      select: {
                        id: true,
                        fullName: true,
                        email: true,
                        phone: true,
                        photoUrl: true,
                        status: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: {
            isLeader: 'desc',
          },
        },
        assignments: {
          where: assignmentWhere,
          include: {
            member: {
              select: {
                id: true,
                fullName: true,
              },
            },
            communityPastoral: {
              select: {
                id: true,
                globalPastoral: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException(`Escala com ID ${scheduleId} nao encontrada`);
    }

    // Resumo do "evento" null-safe: usa o evento quando existe; senão, os dados
    // próprios da escala sem evento (Fase 4.1).
    const eventSummary = schedule.event
      ? {
          id: schedule.event.id,
          title: schedule.event.title,
          type: schedule.event.type,
          location: schedule.event.location,
          community: schedule.event.community,
        }
      : {
          id: null,
          title: schedule.title,
          type: null,
          location: schedule.location,
          community: schedule.community,
        };

    const membersMap = new Map<string, any>();
    const pastoralSummaries = (schedule.pastorals || []).map((schedulePastoral) => {
      const assignedCount = schedule.assignments.filter(
        (assignment) => assignment.communityPastoralId === schedulePastoral.communityPastoralId,
      ).length;
      const requiredPeople = Number(schedulePastoral.requiredPeople || 0);

      return {
        id: schedulePastoral.communityPastoral.id,
        communityPastoralId: schedulePastoral.communityPastoralId,
        name: schedulePastoral.communityPastoral.globalPastoral?.name || 'Pastoral',
        role: schedulePastoral.role,
        isLeader: schedulePastoral.isLeader,
        requiredPeople,
        assignedCount,
        remainingPeople: requiredPeople > 0 ? Math.max(requiredPeople - assignedCount, 0) : null,
      };
    });

    if (schedule.pastorals.length > 0) {
      for (const schedulePastoral of schedule.pastorals) {
        const pastoral = schedulePastoral.communityPastoral;
        const pastoralName = pastoral.globalPastoral?.name || 'Pastoral';

        for (const pastoralMember of pastoral.members) {
          if (pastoralMember.member.status !== 'ACTIVE') {
            continue;
          }

          if (!membersMap.has(pastoralMember.member.id)) {
            membersMap.set(pastoralMember.member.id, {
              ...pastoralMember.member,
              pastorals: [],
            });
          }

          membersMap.get(pastoralMember.member.id).pastorals.push({
            id: pastoral.id,
            communityPastoralId: pastoral.id,
            name: pastoralName,
            role: pastoralMember.role,
            eventRole: schedulePastoral.role,
            isLeader: schedulePastoral.isLeader,
          });
        }
      }
    } else if (!scopedPastoralIds.length) {
      const scheduleCommunityId = schedule.event?.communityId ?? schedule.communityId;
      const members = scheduleCommunityId
        ? await this.prisma.member.findMany({
            where: {
              communityId: scheduleCommunityId,
              status: 'ACTIVE',
              deletedAt: null,
            },
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              photoUrl: true,
            },
            orderBy: {
              fullName: 'asc',
            },
          })
        : [];

      for (const member of members) {
        membersMap.set(member.id, {
          ...member,
          pastorals: [],
        });
      }
    }

    const candidateIds = Array.from(membersMap.keys());

    if (!candidateIds.length) {
      return {
        scheduleId: schedule.id,
        title: schedule.title,
        date: schedule.date,
        event: eventSummary,
        pastorals: pastoralSummaries,
        hasPastorals: schedule.pastorals.length > 0,
        availabilityFeatureEnabled: false,
        members: [],
      };
    }

    const currentWindow = this.getScheduleWindow({
      date: schedule.date,
      event: schedule.event,
    });
    const [relatedAssignments, availabilityRules, availabilityExceptions] = await Promise.all([
      this.prisma.scheduleAssignment.findMany({
        where: {
          memberId: {
            in: candidateIds,
          },
        },
        include: {
          schedule: {
            include: {
              event: {
                select: {
                  id: true,
                  title: true,
                  startDate: true,
                  endDate: true,
                  location: true,
                  community: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          schedule: {
            date: 'desc',
          },
        },
      }),
      this.prisma.memberAvailabilityRule.findMany({
        where: {
          memberId: {
            in: candidateIds,
          },
          isActive: true,
        },
        select: {
          memberId: true,
          dayOfWeek: true,
          startMinutes: true,
          endMinutes: true,
          isActive: true,
          notes: true,
        },
      }),
      this.prisma.memberAvailabilityException.findMany({
        where: {
          memberId: {
            in: candidateIds,
          },
          endDate: {
            gte: currentWindow.start,
          },
          startDate: {
            lte: currentWindow.end,
          },
        },
        select: {
          memberId: true,
          startDate: true,
          endDate: true,
          notes: true,
        },
      }),
    ]);
    const availabilityRulesByMember = availabilityRules.reduce<Map<string, typeof availabilityRules>>(
      (acc, rule) => {
        const current = acc.get(rule.memberId) || [];
        current.push(rule);
        acc.set(rule.memberId, current);
        return acc;
      },
      new Map(),
    );
    const availabilityExceptionsByMember = availabilityExceptions.reduce<
      Map<string, typeof availabilityExceptions>
    >((acc, item) => {
      const current = acc.get(item.memberId) || [];
      current.push(item);
      acc.set(item.memberId, current);
      return acc;
    }, new Map());
    const now = new Date();
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const members = candidateIds
      .map((memberId) => {
        const member = membersMap.get(memberId);
        const memberAssignments = relatedAssignments.filter((assignment) => assignment.memberId === memberId);
        const availability = this.evaluateAvailability({
          scheduleWindow: currentWindow,
          rules: availabilityRulesByMember.get(memberId) || [],
          exceptions: availabilityExceptionsByMember.get(memberId) || [],
        });
        const currentScheduleAssigned = schedule.assignments.some((assignment) => assignment.memberId === memberId);
        const futureAssignments = memberAssignments.filter(
          (assignment) =>
            assignment.scheduleId !== schedule.id &&
            assignment.schedule.date.getTime() >= now.getTime(),
        );
        const sameDayAssignments = futureAssignments.filter((assignment) =>
          this.isSameCalendarDay(assignment.schedule.date, schedule.date),
        );
        const overlappingAssignments = futureAssignments.filter((assignment) =>
          this.windowsOverlap(
            currentWindow,
            this.getScheduleWindow({
              date: assignment.schedule.date,
              event: assignment.schedule.event,
            }),
          ),
        );
        const upcoming30DaysCount = futureAssignments.filter(
          (assignment) => assignment.schedule.date.getTime() <= next30Days.getTime(),
        ).length;
        const past30DaysCount = memberAssignments.filter(
          (assignment) =>
            assignment.schedule.date.getTime() < now.getTime() &&
            assignment.schedule.date.getTime() >= last30Days.getTime(),
        ).length;
        const history = this.buildHistorySummary(memberAssignments);
        const recommendation = this.buildRecommendation({
          currentScheduleAssigned,
          overlappingAssignmentsCount: overlappingAssignments.length,
          sameDayAssignmentsCount: sameDayAssignments.length,
          upcoming30DaysCount,
          noShowCount: history.noShowCount,
          attendanceRate: history.attendanceRate,
          checkedInCount: history.checkedInCount,
          respondedCount: history.respondedCount,
          hasAvailabilityConfig: availability.hasConfig,
          availabilityStatus: availability.status,
        });

        const mapConflict = (assignment: any) => ({
          assignmentId: assignment.id,
          scheduleId: assignment.scheduleId,
          title: assignment.schedule.event?.title || assignment.schedule.title,
          role: assignment.role,
          date: assignment.schedule.date,
          location: assignment.schedule.event?.location || null,
          community: assignment.schedule.event?.community?.name || null,
          status: assignment.status,
          checkedIn: assignment.checkedIn,
        });

        return {
          id: member.id,
          fullName: member.fullName,
          email: member.email,
          phone: member.phone,
          photoUrl: member.photoUrl,
          pastorals: member.pastorals,
          currentScheduleAssigned,
          conflicts: {
            sameDayAssignments: sameDayAssignments.slice(0, 3).map(mapConflict),
            overlappingAssignments: overlappingAssignments.slice(0, 3).map(mapConflict),
          },
          load: {
            upcoming30DaysCount,
            past30DaysCount,
            nextAssignments: futureAssignments.slice(0, 3).map(mapConflict),
          },
          history,
          availability,
          recommendation,
        };
      })
      .sort((left, right) => {
        if (left.recommendation.score !== right.recommendation.score) {
          return right.recommendation.score - left.recommendation.score;
        }

        if (left.currentScheduleAssigned !== right.currentScheduleAssigned) {
          return left.currentScheduleAssigned ? 1 : -1;
        }

        if (left.history.noShowCount !== right.history.noShowCount) {
          return left.history.noShowCount - right.history.noShowCount;
        }

        if (left.load.upcoming30DaysCount !== right.load.upcoming30DaysCount) {
          return left.load.upcoming30DaysCount - right.load.upcoming30DaysCount;
        }

        return left.fullName.localeCompare(right.fullName);
      });

    return {
      scheduleId: schedule.id,
      title: schedule.title,
      date: schedule.date,
      event: eventSummary,
      pastorals: pastoralSummaries,
      hasPastorals: schedule.pastorals.length > 0,
      availabilityFeatureEnabled: true,
      members,
    };
  }

  /**
   * Gerador de rodízio (Fase 4.6). Para um conjunto de escalas, ranqueia os
   * candidatos com o scoring já existente e distribui em rodízio, penalizando
   * quem já foi alocado neste lote para equalizar a carga.
   * dryRun=true devolve apenas a prévia; dryRun=false cria as atribuições PENDING.
   */
  /**
   * Atualiza as vagas (requiredPeople) das pastorais já vinculadas à escala.
   * Não adiciona nem remove pastorais — só ajusta as vagas de cada uma.
   */
  async updateSchedulePastorals(
    scheduleId: string,
    dto: { pastoralSettings: Array<{ communityPastoralId: string; requiredPeople: number }> },
    currentUser: CurrentUser,
  ) {
    const hasAccess = await this.hierarchyService.hasAccessToSchedule(currentUser.id, scheduleId);
    if (!hasAccess) {
      throw new ForbiddenException('Voce nao tem permissao para alterar esta escala');
    }

    const schedule = await this.prisma.schedule.findFirst({
      where: { id: scheduleId, deletedAt: null },
      include: { pastorals: { select: { communityPastoralId: true } } },
    });
    if (!schedule) {
      throw new NotFoundException('Escala nao encontrada');
    }

    const linked = new Set(schedule.pastorals.map((p) => p.communityPastoralId));
    const scopedPastoralIds =
      currentUser.role === 'PASTORAL_COORDINATOR' ? await this.getScopedPastoralIds(currentUser) : null;

    for (const setting of dto.pastoralSettings || []) {
      if (!linked.has(setting.communityPastoralId)) {
        throw new BadRequestException('Pastoral nao vinculada a esta escala');
      }
      if (scopedPastoralIds && !scopedPastoralIds.includes(setting.communityPastoralId)) {
        throw new ForbiddenException('Voce so pode ajustar vagas das suas pastorais');
      }
      await this.prisma.schedulePastoral.updateMany({
        where: { scheduleId, communityPastoralId: setting.communityPastoralId },
        data: { requiredPeople: Math.max(0, Number(setting.requiredPeople || 0)) },
      });
    }

    return this.findOneSchedule(scheduleId, currentUser);
  }

  async generateRotation(
    dto: {
      scheduleIds: string[];
      dryRun?: boolean;
      /** Vagas por pastoral definidas na própria geração (persistidas ao publicar) */
      slotOverrides?: Array<{
        scheduleId: string;
        settings: Array<{ communityPastoralId: string; requiredPeople: number }>;
      }>;
    },
    currentUser: CurrentUser,
  ) {
    const dryRun = dto.dryRun !== false;
    const timesPicked = new Map<string, number>(); // memberId -> vezes escolhido no lote

    // Vagas definidas na própria geração: scheduleId -> (communityPastoralId -> vagas)
    const overrideMap = new Map<string, Map<string, number>>();
    for (const override of dto.slotOverrides ?? []) {
      overrideMap.set(
        override.scheduleId,
        new Map(
          (override.settings ?? []).map((s) => [
            s.communityPastoralId,
            Math.max(0, Number(s.requiredPeople || 0)),
          ]),
        ),
      );
    }

    const preview: Array<{
      scheduleId: string;
      title: string;
      date: Date;
      suggestions: Array<{ role: string; memberId: string; memberName: string; score: number }>;
      gaps: Array<{ role: string; missing: number }>;
      /** Pastorais da escala com as vagas efetivas (para edição na UI do rodízio) */
      pastorals: Array<{ communityPastoralId: string; name: string; requiredPeople: number }>;
      /** Escala sem nenhuma pastoral vinculada */
      noPastorals?: boolean;
      /** Pastorais vinculadas, mas todas com 0 vagas (nada a sugerir) */
      noSlots?: boolean;
      /** Todas as vagas já estão preenchidas — nada a completar */
      allFilled?: boolean;
    }> = [];

    for (const scheduleId of dto.scheduleIds) {
      const candidates = await this.findScheduleCandidates(scheduleId, currentUser);

      // Atribuições existentes: o rodízio COMPLETA a escala — desconta as vagas
      // já ocupadas e nunca sugere quem já está escalado.
      const existingAssignments = await this.prisma.scheduleAssignment.findMany({
        where: { scheduleId },
        select: { memberId: true, communityPastoralId: true },
      });
      const assignedMemberIds = new Set(existingAssignments.map((a) => a.memberId));
      const assignedByPastoral = new Map<string, number>();
      for (const assignment of existingAssignments) {
        if (assignment.communityPastoralId) {
          assignedByPastoral.set(
            assignment.communityPastoralId,
            (assignedByPastoral.get(assignment.communityPastoralId) ?? 0) + 1,
          );
        }
      }

      const suggestions: Array<{ role: string; memberId: string; memberName: string; score: number }> = [];
      const gaps: Array<{ role: string; missing: number }> = [];
      const pickedInThisSchedule = new Set<string>();
      const overrides = overrideMap.get(scheduleId);
      const effectiveRequired = (pastoral: any) =>
        Number(
          (overrides?.has(pastoral.communityPastoralId)
            ? overrides.get(pastoral.communityPastoralId)
            : pastoral.requiredPeople) || 0,
        );
      const remainingFor = (pastoral: any) =>
        Math.max(
          0,
          effectiveRequired(pastoral) - (assignedByPastoral.get(pastoral.communityPastoralId) ?? 0),
        );

      for (const pastoral of candidates.pastorals) {
        const required = remainingFor(pastoral);
        if (required <= 0) continue;

        // Candidatos elegíveis para esta pastoral, ordenados por score do rodízio
        const ranked = candidates.members
          .filter((m: any) => m.pastorals?.some((p: any) => p.communityPastoralId === pastoral.communityPastoralId))
          .filter((m: any) => !assignedMemberIds.has(m.id))
          .filter((m: any) => !pickedInThisSchedule.has(m.id))
          .map((m: any) => {
            const base = m.recommendation?.score ?? 0;
            // Penaliza quem já foi alocado no lote (equaliza carga)
            const penalty = (timesPicked.get(m.id) ?? 0) * 25;
            return { member: m, score: base - penalty };
          })
          .sort((a, b) => b.score - a.score);

        const roleLabel = pastoral.name || 'Função';
        let filled = 0;
        for (const entry of ranked) {
          if (filled >= required) break;
          suggestions.push({
            role: roleLabel,
            memberId: entry.member.id,
            memberName: entry.member.fullName,
            score: entry.score,
          });
          pickedInThisSchedule.add(entry.member.id);
          timesPicked.set(entry.member.id, (timesPicked.get(entry.member.id) ?? 0) + 1);
          filled++;
        }
        if (filled < required) {
          gaps.push({ role: roleLabel, missing: required - filled });
        }
      }

      preview.push({
        scheduleId,
        title: candidates.title,
        date: candidates.date,
        suggestions,
        gaps,
        pastorals: candidates.pastorals.map((p: any) => ({
          communityPastoralId: p.communityPastoralId,
          name: p.name || 'Pastoral',
          requiredPeople: effectiveRequired(p),
        })),
        noPastorals: candidates.pastorals.length === 0,
        noSlots:
          candidates.pastorals.length > 0 &&
          !candidates.pastorals.some((p: any) => effectiveRequired(p) > 0),
        allFilled:
          candidates.pastorals.some((p: any) => effectiveRequired(p) > 0) &&
          candidates.pastorals.every((p: any) => remainingFor(p) === 0),
      });
    }

    if (dryRun) {
      return { dryRun: true, preview };
    }

    // Persiste as vagas definidas na geração antes de criar as atribuições
    for (const [scheduleId, overrides] of overrideMap) {
      for (const [communityPastoralId, requiredPeople] of overrides) {
        await this.prisma.schedulePastoral.updateMany({
          where: { scheduleId, communityPastoralId },
          data: { requiredPeople },
        });
      }
    }

    // Publica: cria as atribuições PENDING sugeridas
    let created = 0;
    for (const item of preview) {
      for (const suggestion of item.suggestions) {
        try {
          await this.createAssignment(
            { scheduleId: item.scheduleId, memberId: suggestion.memberId, role: suggestion.role },
            currentUser,
          );
          created++;
        } catch {
          // ignora conflitos individuais; a prévia já sinalizou lacunas
        }
      }
    }
    return { dryRun: false, created, preview };
  }

  // ========== MINHAS ESCALAS ==========

  /**
   * Busca as escalas do usuÃ¡rio logado
   * Retorna apenas escalas futuras ou do dia atual
   */
  async findMyAssignments(userId: string) {
    // Buscar o membro vinculado ao usuÃ¡rio
    const member = await this.prisma.member.findFirst({
      where: { userId },
    });

    if (!member) {
      return {
        upcoming: [],
        past: [],
        message: 'UsuÃ¡rio nÃ£o possui cadastro de membro',
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Buscar escalas futuras
    const upcomingAssignments = await this.prisma.scheduleAssignment.findMany({
      where: {
        memberId: member.id,
        schedule: {
          deletedAt: null,
          date: {
            gte: today,
          },
        },
      },
      include: {
        schedule: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
                type: true,
                location: true,
                community: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        schedule: {
          date: 'asc',
        },
      },
    });

    // Buscar escalas passadas (Ãºltimos 30 dias)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const pastAssignments = await this.prisma.scheduleAssignment.findMany({
      where: {
        memberId: member.id,
        schedule: {
          deletedAt: null,
          date: {
            lt: today,
            gte: thirtyDaysAgo,
          },
        },
      },
      include: {
        schedule: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
                type: true,
                location: true,
              },
            },
          },
        },
      },
      orderBy: {
        schedule: {
          date: 'desc',
        },
      },
      take: 10,
    });

    return {
      memberId: member.id,
      memberName: member.fullName,
      upcoming: upcomingAssignments.map((a) => ({
        id: a.id,
        role: a.role,
        status: a.status,
        checkedIn: a.checkedIn,
        checkedInAt: a.checkedInAt,
        schedule: {
          id: a.schedule.id,
          title: a.schedule.title,
          description: a.schedule.description,
          date: a.schedule.date,
          event: a.schedule.event,
        },
      })),
      past: pastAssignments.map((a) => ({
        id: a.id,
        role: a.role,
        status: a.status,
        checkedIn: a.checkedIn,
        checkedInAt: a.checkedInAt,
        schedule: {
          id: a.schedule.id,
          title: a.schedule.title,
          date: a.schedule.date,
          event: a.schedule.event,
        },
      })),
    };
  }

  /**
   * Papéis que podem responder uma escala em nome do membro (confirmação assistida,
   * ex.: membro sem smartphone que confirmou verbalmente com o coordenador).
   */
  private readonly assistedResponseRoles: UserRole[] = [
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  ];

  private async assertCanRespondForMember(currentUser: CurrentUser, scheduleId: string) {
    if (!this.assistedResponseRoles.includes(currentUser.role)) {
      throw new ForbiddenException('Voce nao tem permissao para responder esta escala');
    }

    const hasAccess = await this.hierarchyService.hasAccessToSchedule(currentUser.id, scheduleId);
    if (!hasAccess) {
      throw new ForbiddenException('Voce nao tem permissao para responder escalas desta comunidade');
    }
  }

  /**
   * Confirma participaÃ§Ã£o em uma escala.
   * O próprio membro confirma, ou um coordenador confirma em nome dele
   * (auditado em respondedByUserId/respondedAt).
   */
  async confirmAssignment(assignmentId: string, currentUser: CurrentUser) {
    const assignment = await this.prisma.scheduleAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        member: {
          select: { id: true, userId: true, fullName: true },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Escala nÃ£o encontrada');
    }

    const isOwner = !!assignment.member.userId && assignment.member.userId === currentUser.id;
    if (!isOwner) {
      await this.assertCanRespondForMember(currentUser, assignment.scheduleId);
    }

    return this.prisma.scheduleAssignment.update({
      where: { id: assignmentId },
      data: {
        status: 'CONFIRMED',
        respondedAt: new Date(),
        respondedByUserId: isOwner ? null : currentUser.id,
      },
      include: {
        schedule: {
          select: {
            id: true,
            title: true,
            date: true,
          },
        },
      },
    });
  }

  /**
   * Recusa participaÃ§Ã£o em uma escala.
   * O próprio membro recusa, ou um coordenador recusa em nome dele
   * (auditado em respondedByUserId/respondedAt).
   */
  async declineAssignment(assignmentId: string, currentUser: CurrentUser, reason?: string) {
    const assignment = await this.prisma.scheduleAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        member: {
          select: { id: true, userId: true, fullName: true },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Escala nÃ£o encontrada');
    }

    const isOwner = !!assignment.member.userId && assignment.member.userId === currentUser.id;
    if (!isOwner) {
      await this.assertCanRespondForMember(currentUser, assignment.scheduleId);
    }

    const updatedAssignment = await this.prisma.scheduleAssignment.update({
      where: { id: assignmentId },
      data: {
        status: 'DECLINED',
        respondedAt: new Date(),
        respondedByUserId: isOwner ? null : currentUser.id,
        declineReason: reason?.trim() || null,
      },
      include: {
        schedule: {
          select: {
            id: true,
            title: true,
            date: true,
            communityId: true,
            event: {
              select: { communityId: true },
            },
          },
        },
      },
    });

    // Escala com evento usa a comunidade do evento; sem evento, a própria da escala
    const scheduleCommunityId =
      updatedAssignment.schedule.event?.communityId ?? updatedAssignment.schedule.communityId ?? undefined;
    const coordinatorUserIds = await this.getResponsibleCoordinatorUserIds(
      updatedAssignment.communityPastoralId,
      scheduleCommunityId,
    );

    if (coordinatorUserIds.length > 0) {
      await this.notificationsService.notifyUsers(
        coordinatorUserIds,
        NotificationType.ASSIGNMENT_DECLINED,
        'Recusa em escala',
        `${assignment.member.fullName} recusou a escala "${updatedAssignment.schedule.title}" (${this.formatDateLabel(updatedAssignment.schedule.date)}). Funcao: ${updatedAssignment.role}.`,
        { scheduleId: updatedAssignment.scheduleId, assignmentId: updatedAssignment.id },
      );
    }

    return updatedAssignment;
  }

  // ========== RELATÃ“RIOS ==========

  async getCoordinatorOverview(currentUser?: CurrentUser, from?: string, to?: string) {
    const hierarchyFilter = currentUser ? this.hierarchyService.applyScheduleFilter(currentUser) : {};
    const scopedPastoralIds =
      currentUser?.role === 'PASTORAL_COORDINATOR'
        ? await this.getScopedPastoralIds(currentUser)
        : [];
    const assignmentWhere = this.getScopedAssignmentWhere(scopedPastoralIds);
    const where: any = { deletedAt: null };
    const overviewAndConditions: any[] = [
      { OR: [{ eventId: null }, { event: { deletedAt: null } }] },
    ];
    if (hierarchyFilter.OR) {
      overviewAndConditions.push({ OR: hierarchyFilter.OR });
    } else {
      Object.assign(where, hierarchyFilter);
    }
    where.AND = overviewAndConditions;

    if (from || to) {
      const dateFilter: any = {};

      if (from) {
        const fromDate = new Date(from);
        if (Number.isNaN(fromDate.getTime())) {
          throw new BadRequestException('Data inicial (from) invalida');
        }

        dateFilter.gte = fromDate;
      }

      if (to) {
        const toDate = new Date(to);
        if (Number.isNaN(toDate.getTime())) {
          throw new BadRequestException('Data final (to) invalida');
        }

        // Considera ate o fim do dia informado
        toDate.setHours(23, 59, 59, 999);
        dateFilter.lte = toDate;
      }

      if (dateFilter.gte && dateFilter.lte && dateFilter.gte.getTime() > dateFilter.lte.getTime()) {
        throw new BadRequestException('Data inicial nao pode ser maior que data final');
      }

      where.date = dateFilter;
    }

    const schedules = await this.prisma.schedule.findMany({
      where,
      include: {
        event: {
          select: {
            id: true,
            title: true,
            type: true,
            location: true,
            community: {
              select: {
                id: true,
                name: true,
                parish: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        // Comunidade da própria escala (fallback para escala sem evento)
        community: {
          select: {
            id: true,
            name: true,
            parish: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        pastorals: {
          where: this.getScopedSchedulePastoralWhere(scopedPastoralIds),
          include: {
            communityPastoral: {
              select: {
                id: true,
                globalPastoral: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            isLeader: 'desc',
          },
        },
        assignments: {
          where: assignmentWhere,
          include: {
            member: {
              select: {
                id: true,
                fullName: true,
              },
            },
            // Pedidos de troca em aberto (alerta para o coordenador)
            swapRequests: {
              where: { status: 'PENDING' },
              select: { id: true, message: true, createdAt: true },
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: {
            role: 'asc',
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    return schedules.map((schedule) => {
      const total = schedule.assignments.length;
      const pending = schedule.assignments.filter((assignment) => assignment.status === 'PENDING').length;
      const confirmed = schedule.assignments.filter((assignment) => assignment.status === 'CONFIRMED').length;
      const declined = schedule.assignments.filter((assignment) => assignment.status === 'DECLINED').length;
      const checkedIn = schedule.assignments.filter((assignment) => assignment.checkedIn).length;
      const swapsPending = schedule.assignments.filter(
        (assignment: any) => (assignment.swapRequests?.length ?? 0) > 0,
      ).length;
      const attendanceRate = total > 0 ? parseFloat(((checkedIn / total) * 100).toFixed(2)) : 0;
      const normalizedSchedule = this.normalizeSchedulePayload(schedule as any);

      return {
        scheduleId: schedule.id,
        title: schedule.title,
        date: schedule.date,
        event: normalizedSchedule.event,
        counts: {
          total,
          pending,
          confirmed,
          declined,
          checkedIn,
          swapsPending,
        },
        attendanceRate,
        assignments: schedule.assignments.map((assignment: any) => ({
          id: assignment.id,
          memberId: assignment.memberId,
          memberName: assignment.member?.fullName || 'Membro',
          role: assignment.role,
          status: assignment.status,
          checkedIn: assignment.checkedIn,
          checkedInAt: assignment.checkedInAt,
          hasPendingSwap: (assignment.swapRequests?.length ?? 0) > 0,
          // Mensagem do pedido de troca mais recente (tooltip do coordenador)
          pendingSwapMessage: assignment.swapRequests?.[0]?.message ?? null,
        })),
      };
    });
  }

  /**
   * Gera o PDF da escala do período (para impressão/mural da sacristia).
   * Reusa o escopo e a consolidação do getCoordinatorOverview.
   */
  async exportSchedulesPdf(currentUser?: CurrentUser, from?: string, to?: string): Promise<Buffer> {
    const overview = await this.getCoordinatorOverview(currentUser, from, to);

    const statusLabels: Record<string, string> = {
      PENDING: 'Aguardando',
      CONFIRMED: 'Confirmado',
      DECLINED: 'Recusado',
    };

    const sections = overview.map((schedule) => {
      const community = schedule.event?.community?.name;
      const location = schedule.event?.location;
      const subheadingParts = [community, location].filter(Boolean);

      return {
        heading: `${this.formatDateTimeLabel(schedule.date)} — ${schedule.event?.title || schedule.title}`,
        subheading: subheadingParts.length ? subheadingParts.join(' · ') : undefined,
        columns: ['Função', 'Membro', 'Situação'],
        widths: [2, 4, 2],
        rows: schedule.assignments.map((assignment) => [
          assignment.role,
          assignment.memberName,
          assignment.checkedIn ? 'Presente' : statusLabels[assignment.status] || assignment.status,
        ]),
      };
    });

    if (sections.length === 0) {
      sections.push({
        heading: 'Nenhuma escala no período informado',
        subheading: undefined,
        columns: ['Função', 'Membro', 'Situação'],
        widths: [2, 4, 2],
        rows: [],
      });
    }

    const periodParts: string[] = [];
    if (from) periodParts.push(`de ${this.formatDateLabel(new Date(from))}`);
    if (to) periodParts.push(`até ${this.formatDateLabel(new Date(to))}`);

    return this.pdfService.renderTableDocument({
      title: 'Escala de Serviço',
      subtitle: periodParts.length ? `Período ${periodParts.join(' ')}` : undefined,
      sections,
      footer: `Emitido em ${this.formatDateTimeLabel(new Date())} — Parish`,
    });
  }

  async getMemberStats(memberId: string, currentUser?: CurrentUser) {
    // Escopo: o próprio membro, SYSTEM_ADMIN ou gestor com acesso hierárquico
    if (currentUser && currentUser.role !== 'SYSTEM_ADMIN') {
      const member = await this.prisma.member.findUnique({
        where: { id: memberId },
        select: { id: true, userId: true },
      });

      if (!member) {
        throw new NotFoundException(`Membro com ID ${memberId} nao encontrado`);
      }

      const isSelf = !!member.userId && member.userId === currentUser.id;
      if (!isSelf) {
        const canManage = await this.hierarchyService.canManageMember(currentUser.id, memberId);
        if (!canManage) {
          throw new ForbiddenException('Voce nao tem permissao para ver as estatisticas deste membro');
        }
      }
    }

    const assignments = await this.prisma.scheduleAssignment.findMany({
      where: { memberId },
      include: {
        schedule: {
          select: {
            id: true,
            title: true,
            date: true,
            event: {
              select: {
                title: true,
                location: true,
              },
            },
          },
        },
      },
      orderBy: {
        schedule: {
          date: 'desc',
        },
      },
    });

    const history = this.buildHistorySummary(assignments);

    return {
      memberId,
      total: history.totalPastAssignments,
      checkedIn: history.checkedInCount,
      missed: history.noShowCount,
      noShowCount: history.noShowCount,
      declinedCount: history.declinedCount,
      respondedCount: history.respondedCount,
      attendanceRate: history.attendanceRate,
      responseRate: history.responseRate,
      recent: history.recent,
    };
  }

  async updateScheduleStatus(scheduleId: string, status: ScheduleStatus, currentUser?: CurrentUser) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id: scheduleId },
      select: { id: true, title: true, date: true },
    });

    if (!schedule) {
      throw new NotFoundException(`Escala com ID ${scheduleId} nao encontrada`);
    }

    if (currentUser) {
      const hasAccess = await this.hierarchyService.hasAccessToSchedule(currentUser.id, scheduleId);
      if (!hasAccess) {
        throw new ForbiddenException('Voce nao tem permissao para alterar esta escala');
      }
    }

    const updatedSchedule = await this.prisma.schedule.update({
      where: { id: scheduleId },
      data: { status },
    });

    if (status === ScheduleStatus.CANCELLED) {
      await this.notifyScheduleCancelled(schedule.id, schedule.title, schedule.date);
    }

    return updatedSchedule;
  }

  private async getAssignedUserIds(scheduleId: string): Promise<string[]> {
    const assignments = await this.prisma.scheduleAssignment.findMany({
      where: { scheduleId },
      select: { member: { select: { userId: true } } },
    });

    const userIds = assignments
      .map((assignment) => assignment.member.userId)
      .filter((id): id is string => !!id);

    return [...new Set(userIds)];
  }

  private async notifyScheduleCancelled(scheduleId: string, title: string, date: Date) {
    const userIds = await this.getAssignedUserIds(scheduleId);

    if (userIds.length === 0) {
      return;
    }

    await this.notificationsService.notifyUsers(
      userIds,
      NotificationType.SCHEDULE_CANCELLED,
      'Escala cancelada',
      `A escala "${title}" em ${this.formatDateLabel(date)} foi cancelada.`,
      { scheduleId },
    );
  }

  /**
   * Avisa todos os membros escalados de uma escala com uma mensagem livre do coordenador.
   */
  async notifyTeam(scheduleId: string, message: string, currentUser: CurrentUser) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id: scheduleId },
      select: { id: true, title: true },
    });

    if (!schedule) {
      throw new NotFoundException(`Escala com ID ${scheduleId} nao encontrada`);
    }

    const hasAccess = await this.hierarchyService.hasAccessToSchedule(currentUser.id, scheduleId);
    if (!hasAccess) {
      throw new ForbiddenException('Voce nao tem permissao para avisar a equipe desta escala');
    }

    const userIds = await this.getAssignedUserIds(scheduleId);

    if (userIds.length === 0) {
      return { notified: 0 };
    }

    await this.notificationsService.notifyUsers(
      userIds,
      NotificationType.TEAM_BROADCAST,
      `Aviso: ${schedule.title}`,
      message,
      { scheduleId },
    );

    return { notified: userIds.length };
  }
}





