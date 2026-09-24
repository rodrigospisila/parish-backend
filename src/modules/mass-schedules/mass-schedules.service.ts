import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateMassScheduleDto,
  MassSchedulePastoralSettingDto,
} from './dto/create-mass-schedule.dto';
import { UpdateMassScheduleDto } from './dto/update-mass-schedule.dto';
import { GenerateScheduleFromMassDto } from './dto/generate-schedule.dto';
import {
  CancelOccurrencesDto,
  MAX_CANCELLATION_DATES,
  MAX_CANCELLATION_REASON,
} from './dto/cancel-occurrences.dto';
import {
  MassScheduleType,
  ScheduleStatus,
  UserRole,
  MassRecurrence,
  NotificationType,
} from '@prisma/client';
import { CurrentUser, HierarchyService } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { nowBrazilFloating } from '../masses/map-search.utils';

/** Include padrão das pastorais vinculadas (com o nome global para o painel). */
const PASTORAL_INCLUDE = {
  include: {
    communityPastoral: {
      select: {
        id: true,
        communityId: true,
        community: { select: { id: true, name: true } },
        globalPastoral: { select: { id: true, name: true } },
      },
    },
  },
} as const;

/** Rótulos e durações padrão por tipo de horário fixo (agenda da comunidade). */
const SCHEDULE_LABELS: Record<MassScheduleType, string> = {
  MASS: 'Missa',
  CONFESSION: 'Confissão',
  ADORATION: 'Adoração',
  ROSARY: 'Terço',
};

const SCHEDULE_DURATION_MIN: Record<MassScheduleType, number> = {
  MASS: 60,
  CONFESSION: 45,
  ADORATION: 60,
  ROSARY: 30,
};

export interface FixedOccurrence {
  id: string;
  massScheduleId: string;
  title: string;
  type: MassScheduleType;
  notes: string | null;
  start: string;
  end: string;
  community: { id: string; name: string } | null;
  isFixed: true;
  /** Data suspensa pela comunidade ("não haverá"): continua na lista, com aviso. */
  cancelled: boolean;
  cancelReason: string | null;
}

/** Data suspensa de um horário fixo (formato das rotas /cancellations). */
export interface MassScheduleCancellationView {
  id: string;
  date: string; // YYYY-MM-DD
  reason: string | null;
  createdAt: Date;
  createdBy: { id: string; name: string } | null;
}

/** Suspensões futuras resumidas, anexadas à lista de horários (app e página pública). */
export interface UpcomingCancellation {
  date: string; // YYYY-MM-DD
  reason: string | null;
}

/** Quantos dias à frente as listas mostram as suspensões (upcomingCancellations). */
export const UPCOMING_CANCELLATIONS_DAYS = 60;
/** Até quando dá para suspender uma data (evita pedidos para daqui a anos). */
const MAX_CANCELLATION_AHEAD_DAYS = 366;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Dia de calendário (YYYY-MM-DD) de uma data gravada à meia-noite UTC (@db.Date). */
export function ymd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** 'YYYY-MM-DD' → Date à meia-noite UTC (como o Prisma grava/lê @db.Date). */
function dayUtc(ymdStr: string): Date {
  return new Date(`${ymdStr}T00:00:00.000Z`);
}

/** Soma dias a um 'YYYY-MM-DD'. */
export function addDaysYmd(ymdStr: string, days: number): string {
  return ymd(new Date(dayUtc(ymdStr).getTime() + days * DAY_MS));
}

/** Data de calendário válida (rejeita 2026-02-30)? */
function isRealDate(ymdStr: string): boolean {
  if (!DATE_RE.test(ymdStr)) return false;
  const d = dayUtc(ymdStr);
  return !Number.isNaN(d.getTime()) && ymd(d) === ymdStr;
}

/** 25/09/2026 */
function brDate(ymdStr: string): string {
  const [y, m, d] = ymdStr.split('-');
  return `${d}/${m}/${y}`;
}

/** Suspensões de hoje (SP) até +60 dias, para anexar num `include`/`select` do Prisma. */
export function upcomingCancellationsSelect(today: string) {
  return {
    where: {
      date: { gte: dayUtc(today), lte: dayUtc(addDaysYmd(today, UPCOMING_CANCELLATIONS_DAYS)) },
    },
    select: { date: true, reason: true },
    orderBy: { date: 'asc' as const },
  };
}

export function toUpcomingCancellations(
  rows: { date: Date; reason: string | null }[] | undefined,
): UpcomingCancellation[] {
  return (rows ?? []).map((c) => ({ date: ymd(c.date), reason: c.reason ?? null }));
}

@Injectable()
export class MassSchedulesService {
  private readonly logger = new Logger(MassSchedulesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Hoje no relógio de São Paulo, YYYY-MM-DD (método para os testes congelarem). */
  protected todaySaoPaulo(): string {
    return nowBrazilFloating().slice(0, 10);
  }

  private async assertCommunityInScope(communityId: string, currentUser?: CurrentUser) {
    if (!currentUser || currentUser.role === UserRole.SYSTEM_ADMIN) return;
    const inScope = await this.hierarchyService.isCommunityInScope(currentUser, communityId);
    if (!inScope) {
      throw new ForbiddenException('Comunidade fora do seu escopo');
    }
  }

  /**
   * Filtro de escopo hierárquico para horários fixos (por comunidade).
   * Não usa applyEventFilter porque este último ramifica em eventPastorals,
   * que não existe em MassSchedule.
   */
  private massScopeWhere(user: CurrentUser): any {
    switch (user.role) {
      case UserRole.SYSTEM_ADMIN:
        return {};
      case UserRole.DIOCESAN_ADMIN:
        return { community: { parish: { dioceseId: user.dioceseId } } };
      case UserRole.PARISH_ADMIN:
        return { community: { parishId: user.parishId } };
      default:
        return user.communityId ? { communityId: user.communityId } : {};
    }
  }

  private ensureAccess(schedule: { communityId: string }, currentUser: CurrentUser) {
    const restrictedRoles: UserRole[] = [
      UserRole.COMMUNITY_COORDINATOR,
      UserRole.PASTORAL_COORDINATOR,
      UserRole.VOLUNTEER,
      UserRole.FAITHFUL,
    ];

    if (
      restrictedRoles.includes(currentUser.role) &&
      currentUser.communityId &&
      schedule.communityId !== currentUser.communityId
    ) {
      throw new ForbiddenException('Voce nao tem permissao para favoritar este horario');
    }
  }

  /**
   * Valida que as pastorais pertencem à comunidade e monta o array de criação
   * de MassSchedulePastoral (uma linha por pastoral, sem duplicar).
   */
  private async buildPastoralCreate(
    communityId: string,
    settings?: MassSchedulePastoralSettingDto[],
  ) {
    if (!settings || settings.length === 0) return [];
    const byId = new Map<string, MassSchedulePastoralSettingDto>();
    for (const s of settings) byId.set(s.communityPastoralId, s);
    const ids = [...byId.keys()];

    // Multi-comunidade: pastorais/ministérios de OUTRA comunidade da MESMA
    // paróquia podem servir neste horário (ex.: música da matriz nas capelas)
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
      select: { parishId: true },
    });
    const valid = await this.prisma.communityPastoral.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
        community: { parishId: community?.parishId ?? '__none__' },
      },
      select: { id: true },
    });
    const validIds = new Set(valid.map((v) => v.id));
    const missing = ids.filter((id) => !validIds.has(id));
    if (missing.length) {
      throw new BadRequestException(
        'Uma ou mais pastorais não pertencem à paróquia desta comunidade',
      );
    }

    return [...byId.values()].map((s) => ({
      communityPastoralId: s.communityPastoralId,
      role: s.role ?? null,
      isLeader: s.isLeader ?? false,
      requiredPeople: Number(s.requiredPeople ?? 0),
    }));
  }

  private addMinutes(hhmm: string, minutes: number): string {
    const [h, m] = (hhmm || '00:00').split(':').map((n) => parseInt(n, 10) || 0);
    const total = h * 60 + m + minutes;
    const hh = Math.floor((((total % (24 * 60)) + 24 * 60) % (24 * 60)) / 60);
    const mm = ((total % 60) + 60) % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  /**
   * Coerência entre a recorrência e os campos que ela usa, com mensagem em
   * português — sem isto o erro só apareceria como violação de CHECK do banco.
   * Também limpa o que não pertence ao tipo escolhido, para não sobrar lixo de
   * uma edição que trocou WEEKLY por MONTHLY_DAY.
   */
  private normalizeRecurrence<T extends {
    recurrence?: MassRecurrence;
    dayOfWeek?: number | null;
    weeksOfMonth?: number[];
    dayOfMonth?: number | null;
  }>(dados: T, atual?: { recurrence: MassRecurrence; dayOfWeek: number | null; dayOfMonth: number | null }): T {
    const recorrencia = dados.recurrence ?? atual?.recurrence ?? MassRecurrence.WEEKLY;
    const diaDaSemana = dados.dayOfWeek !== undefined ? dados.dayOfWeek : atual?.dayOfWeek ?? null;
    const diaDoMes = dados.dayOfMonth !== undefined ? dados.dayOfMonth : atual?.dayOfMonth ?? null;

    if (recorrencia === MassRecurrence.MONTHLY_DAY) {
      if (diaDoMes == null) {
        throw new BadRequestException('Informe o dia do mês (1 a 31) para um horário de data fixa.');
      }
      return { ...dados, recurrence: recorrencia, dayOfWeek: null, dayOfMonth: diaDoMes, weeksOfMonth: [] };
    }

    if (diaDaSemana == null) {
      throw new BadRequestException('Informe o dia da semana.');
    }

    if (recorrencia === MassRecurrence.MONTHLY_NTH) {
      const semanas = [...new Set(dados.weeksOfMonth ?? [])].filter((n) => n === -1 || (n >= 1 && n <= 5));
      if (semanas.length === 0) {
        throw new BadRequestException(
          'Escolha quais ocorrências do mês (1ª a 5ª, ou a última) para um horário mensal.',
        );
      }
      return { ...dados, recurrence: recorrencia, dayOfWeek: diaDaSemana, dayOfMonth: null, weeksOfMonth: semanas };
    }

    return { ...dados, recurrence: MassRecurrence.WEEKLY, dayOfWeek: diaDaSemana, dayOfMonth: null, weeksOfMonth: [] };
  }

  async create(createMassScheduleDto: CreateMassScheduleDto, currentUser?: CurrentUser) {
    const { communityId, pastoralSettings, ...bruto } = createMassScheduleDto;
    const rest = this.normalizeRecurrence(bruto);

    // Verificar se a comunidade existe
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
    });

    if (!community) {
      throw new NotFoundException(`Comunidade com ID ${communityId} não encontrada`);
    }

    await this.assertCommunityInScope(communityId, currentUser);

    const pastoralsCreate = await this.buildPastoralCreate(communityId, pastoralSettings);

    return this.prisma.massSchedule.create({
      data: {
        ...rest,
        communityId,
        pastorals: { create: pastoralsCreate },
      },
      include: {
        community: { select: { id: true, name: true } },
        pastorals: PASTORAL_INCLUDE,
      },
    });
  }

  async findAll(communityId?: string, type?: MassScheduleType) {
    const where: any = {};

    if (communityId) {
      where.communityId = communityId;
    }

    if (type) {
      where.type = type;
    }

    const schedules = await this.prisma.massSchedule.findMany({
      where,
      include: {
        community: {
          select: {
            id: true,
            name: true,
          },
        },
        // Datas suspensas de hoje até +60 dias (o app mostra "não haverá")
        cancellations: upcomingCancellationsSelect(this.todaySaoPaulo()),
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { time: 'asc' },
      ],
    });

    return schedules.map(({ cancellations, ...schedule }) => ({
      ...schedule,
      upcomingCancellations: toUpcomingCancellations(cancellations),
    }));
  }

  /** Listagem escopada para o painel (Agenda Fixa). */
  async findAllManaged(currentUser: CurrentUser, communityId?: string, type?: MassScheduleType) {
    const where: any = this.massScopeWhere(currentUser);
    if (communityId) where.communityId = communityId;
    if (type) where.type = type;

    return this.prisma.massSchedule.findMany({
      where,
      include: {
        community: {
          select: { id: true, name: true, parish: { select: { id: true, name: true } } },
        },
        pastorals: PASTORAL_INCLUDE,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { time: 'asc' }],
    });
  }

  /**
   * Expande os horários fixos (agenda da comunidade) em ocorrências dentro de
   * um período — para o calendário de Eventos mostrá-los materializados, sem
   * inflar o banco. Horários semanais geram uma ocorrência por semana; horários
   * "especiais" (com specialDate) geram uma única ocorrência naquela data.
   */
  async expandOccurrences(
    fromStr: string,
    toStr: string,
    currentUser?: CurrentUser,
    communityId?: string,
    opts?: { communityIds?: string[]; types?: MassScheduleType[] },
  ): Promise<FixedOccurrence[]> {
    const from = new Date(fromStr);
    const to = new Date(toStr);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) {
      throw new BadRequestException('Período inválido');
    }
    // Limita a janela para evitar expansões absurdas (~15 meses)
    if (to.getTime() - from.getTime() > 460 * 24 * 60 * 60 * 1000) {
      throw new BadRequestException('Período muito longo');
    }

    const where: any = currentUser ? this.massScopeWhere(currentUser) : {};
    if (communityId) where.communityId = communityId;
    // Busca por proximidade (sem escopo): restringe a um conjunto de comunidades e tipos
    if (opts?.communityIds) where.communityId = { in: opts.communityIds };
    if (opts?.types?.length) where.type = { in: opts.types };

    const schedules = await this.prisma.massSchedule.findMany({
      where,
      include: { community: { select: { id: true, name: true } } },
    });

    // Trabalha em dias de calendário UTC para evitar deslocamento de fuso; a
    // hora configurada (HH:MM) é emitida como "wall clock" (horário flutuante),
    // então a missa sempre aparece no horário certo em qualquer fuso.
    const startDay = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
    const endDay = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));

    const occurrences: FixedOccurrence[] = [];
    for (const schedule of schedules) {
      const [hh, mm] = (schedule.time || '00:00').split(':').map((n) => parseInt(n, 10) || 0);
      for (const day of this.occurrenceDays(schedule, startDay, endDay)) {
        occurrences.push(this.toOccurrence(schedule, day, hh, mm));
      }
    }

    // Datas suspensas ("não haverá") da janela: UMA consulta para todos os
    // horários encontrados. A ocorrência continua na lista, marcada — o fiel
    // precisa ver o aviso, não um buraco na agenda.
    if (occurrences.length > 0) {
      const cancellations = await this.prisma.massScheduleCancellation.findMany({
        where: {
          massScheduleId: { in: [...new Set(occurrences.map((o) => o.massScheduleId))] },
          date: { gte: startDay, lte: endDay },
        },
        select: { massScheduleId: true, date: true, reason: true },
      });
      if (cancellations.length > 0) {
        const byKey = new Map(
          cancellations.map((c) => [`${c.massScheduleId}:${ymd(c.date)}`, c.reason ?? null]),
        );
        for (const occ of occurrences) {
          const key = `${occ.massScheduleId}:${occ.start.slice(0, 10)}`;
          if (byKey.has(key)) {
            occ.cancelled = true;
            occ.cancelReason = byKey.get(key) ?? null;
          }
        }
      }
    }

    occurrences.sort((a, b) => a.start.localeCompare(b.start));
    return occurrences;
  }

  /**
   * Dias (meia-noite UTC = dia de calendário) em que o horário acontece dentro
   * de [startDay, endDay]. Única fonte da regra de recorrência: usada na
   * expansão da agenda e na validação das datas suspensas.
   */
  private occurrenceDays(
    schedule: {
      isSpecial: boolean;
      specialDate: Date | null;
      recurrence?: MassRecurrence | string | null;
      dayOfWeek: number | null;
      dayOfMonth?: number | null;
      weeksOfMonth?: number[] | null;
    },
    startDay: Date,
    endDay: Date,
  ): Date[] {
    const days: Date[] = [];

    // Horário especial (festa/solenidade): ocorrência única na data marcada
    if (schedule.isSpecial && schedule.specialDate) {
      const sd = new Date(schedule.specialDate);
      const dayUTC = new Date(Date.UTC(sd.getUTCFullYear(), sd.getUTCMonth(), sd.getUTCDate()));
      if (dayUTC >= startDay && dayUTC <= endDay) days.push(dayUTC);
      return days;
    }

    // Data fixa do mês ("todo dia 13"): uma ocorrência por mês, se o mês tiver
    // o dia. Fevereiro simplesmente não tem "dia 30" — o mês é pulado, e não
    // empurrado para o dia 1º de março.
    if (schedule.recurrence === 'MONTHLY_DAY') {
      const dia = schedule.dayOfMonth;
      if (!dia) return days;
      const mes = new Date(Date.UTC(startDay.getUTCFullYear(), startDay.getUTCMonth(), 1));
      while (mes <= endDay) {
        const diasNoMes = new Date(Date.UTC(mes.getUTCFullYear(), mes.getUTCMonth() + 1, 0)).getUTCDate();
        if (dia <= diasNoMes) {
          const data = new Date(Date.UTC(mes.getUTCFullYear(), mes.getUTCMonth(), dia));
          if (data >= startDay && data <= endDay) days.push(data);
        }
        mes.setUTCMonth(mes.getUTCMonth() + 1);
      }
      return days;
    }

    if (schedule.dayOfWeek === null || schedule.dayOfWeek === undefined) return days;

    // Enésimo dia da semana do mês ("1º e 3º sábado", "último domingo"):
    // percorre mês a mês e escolhe as ocorrências pedidas. Lista vazia
    // significa todas — aí o comportamento é o mesmo do semanal.
    const semanas = schedule.weeksOfMonth ?? [];
    if (schedule.recurrence === 'MONTHLY_NTH' && semanas.length > 0) {
      const mes = new Date(Date.UTC(startDay.getUTCFullYear(), startDay.getUTCMonth(), 1));
      while (mes <= endDay) {
        // Todos os dias do mês que caem no dia da semana pedido
        const doDiaDaSemana: Date[] = [];
        const diasNoMes = new Date(Date.UTC(mes.getUTCFullYear(), mes.getUTCMonth() + 1, 0)).getUTCDate();
        for (let d = 1; d <= diasNoMes; d += 1) {
          const data = new Date(Date.UTC(mes.getUTCFullYear(), mes.getUTCMonth(), d));
          if (data.getUTCDay() === schedule.dayOfWeek) doDiaDaSemana.push(data);
        }
        for (const semana of semanas) {
          // -1 é a última do mês, que pode ser a 4ª ou a 5ª conforme o mês
          const data = semana === -1 ? doDiaDaSemana[doDiaDaSemana.length - 1] : doDiaDaSemana[semana - 1];
          if (data && data >= startDay && data <= endDay) days.push(data);
        }
        mes.setUTCMonth(mes.getUTCMonth() + 1);
      }
      return days;
    }

    // Semanal: do 1º dia que bate o dia da semana, pula de 7 em 7 dias
    const cursor = new Date(startDay);
    while (cursor.getUTCDay() !== schedule.dayOfWeek) {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    for (let day = new Date(cursor); day <= endDay; day.setUTCDate(day.getUTCDate() + 7)) {
      days.push(new Date(day));
    }
    return days;
  }

  /**
   * Ocorrências da agenda fixa SEM escala criada no período (pendências).
   * Considera apenas horários com pastorais vinculadas (sem pastoral não há
   * escala a gerar). `pastoralId` filtra pendências que envolvam a pastoral.
   */
  async pendingOccurrences(
    fromStr: string,
    toStr: string,
    currentUser: CurrentUser,
    communityId?: string,
    pastoralId?: string,
  ) {
    const occurrences = await this.expandOccurrences(fromStr, toStr, currentUser, communityId);
    if (occurrences.length === 0) return [];

    const massIds = [...new Set(occurrences.map((o) => o.massScheduleId))];
    const [masses, existing] = await Promise.all([
      this.prisma.massSchedule.findMany({
        where: { id: { in: massIds } },
        select: { id: true, pastorals: PASTORAL_INCLUDE },
      }),
      this.prisma.schedule.findMany({
        where: {
          massScheduleId: { in: massIds },
          deletedAt: null,
          date: {
            gte: new Date(new Date(fromStr).getTime() - 24 * 60 * 60 * 1000),
            lte: new Date(new Date(toStr).getTime() + 24 * 60 * 60 * 1000),
          },
        },
        select: { massScheduleId: true, date: true },
      }),
    ]);

    const pastoralsByMass = new Map(
      masses.map((mass) => [
        mass.id,
        mass.pastorals.map((p) => ({
          id: p.communityPastoralId,
          name: p.communityPastoral?.globalPastoral?.name ?? 'Pastoral',
          requiredPeople: p.requiredPeople,
        })),
      ]),
    );
    const covered = new Set(
      existing.map((s) => `${s.massScheduleId}:${s.date.toISOString().slice(0, 10)}`),
    );

    return occurrences
      .map((occurrence) => ({
        ...occurrence,
        date: occurrence.start.slice(0, 10),
        time: occurrence.start.slice(11, 16),
        pastorals: pastoralsByMass.get(occurrence.massScheduleId) ?? [],
      }))
      .filter((occurrence) => occurrence.pastorals.length > 0)
      // Data suspensa: não há missa, então não há escala a sugerir
      .filter((occurrence) => !occurrence.cancelled)
      .filter((occurrence) => !covered.has(`${occurrence.massScheduleId}:${occurrence.date}`))
      .filter(
        (occurrence) =>
          !pastoralId || occurrence.pastorals.some((p) => p.id === pastoralId),
      );
  }

  /**
   * Gera as escalas de TODAS as ocorrências pendentes do período de uma vez.
   * Reusa generateSchedule (escopo, dedupe e cópia das pastorais por item);
   * conflitos de corrida são ignorados, outros erros contam como falha.
   */
  async generatePendingSchedules(
    dto: { from: string; to: string; communityId?: string; pastoralIds?: string[] },
    currentUser: CurrentUser,
  ) {
    let pending = await this.pendingOccurrences(dto.from, dto.to, currentUser, dto.communityId);
    if (dto.pastoralIds?.length) {
      const wanted = new Set(dto.pastoralIds);
      pending = pending.filter((occurrence) =>
        occurrence.pastorals.some((pastoral) => wanted.has(pastoral.id)),
      );
    }

    const created: { id: string; massScheduleId: string; date: string; time: string; title: string }[] = [];
    let failed = 0;
    for (const occurrence of pending) {
      try {
        const schedule = await this.generateSchedule(
          occurrence.massScheduleId,
          { date: occurrence.date },
          currentUser,
        );
        created.push({
          id: schedule.id,
          massScheduleId: occurrence.massScheduleId,
          date: occurrence.date,
          time: occurrence.time,
          title: schedule.title,
        });
      } catch (error) {
        if (error instanceof ConflictException) continue; // outra pessoa acabou de criar
        failed++;
      }
    }

    return { created: created.length, failed, schedules: created };
  }

  private toOccurrence(
    schedule: { id: string; type: MassScheduleType; notes: string | null; community: { id: string; name: string } | null },
    dayUTC: Date,
    hh: number,
    mm: number,
  ): FixedOccurrence {
    // Horário flutuante (sem Z): representa o relógio de parede da comunidade
    const startUtc = new Date(Date.UTC(dayUTC.getUTCFullYear(), dayUTC.getUTCMonth(), dayUTC.getUTCDate(), hh, mm, 0));
    const endUtc = new Date(startUtc.getTime() + (SCHEDULE_DURATION_MIN[schedule.type] ?? 45) * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    const floating = (dt: Date) =>
      `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())}:00`;

    const baseTitle = SCHEDULE_LABELS[schedule.type] ?? schedule.type;
    const dateKey = floating(startUtc).slice(0, 10);
    return {
      id: `mass-${schedule.id}-${dateKey}`,
      massScheduleId: schedule.id,
      title: schedule.notes ? `${baseTitle} — ${schedule.notes}` : baseTitle,
      type: schedule.type,
      notes: schedule.notes ?? null,
      start: floating(startUtc),
      end: floating(endUtc),
      community: schedule.community,
      isFixed: true,
      cancelled: false,
      cancelReason: null,
    };
  }

  async findByDayOfWeek(dayOfWeek: number, communityId?: string) {
    const where: any = { dayOfWeek };

    if (communityId) {
      where.communityId = communityId;
    }

    return this.prisma.massSchedule.findMany({
      where,
      include: {
        community: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        time: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const schedule = await this.prisma.massSchedule.findUnique({
      where: { id },
      include: {
        community: true,
        pastorals: PASTORAL_INCLUDE,
      },
    });

    if (!schedule) {
      throw new NotFoundException(`Horário de missa com ID ${id} não encontrado`);
    }

    return schedule;
  }

  /** O usuário é coordenador ATUAL desta pastoral da comunidade? */
  private async isCurrentPastoralCoordinator(userId: string, communityPastoralId: string) {
    const link = await this.prisma.pastoralCoordinator.findFirst({
      where: {
        communityPastoralId,
        isCurrent: true,
        member: { userId, deletedAt: null },
      },
      select: { id: true },
    });
    return !!link;
  }

  /**
   * Quem pode mexer no vínculo de UMA pastoral com o horário fixo: a gestão
   * (coordenação de comunidade ou acima, no escopo) mexe em qualquer uma; o
   * COORDENADOR DE PASTORAL apenas na pastoral que coordena — é ele quem sabe
   * onde a própria equipe serve, sem poder tocar nas demais.
   */
  private async assertPastoralLinkPermission(
    schedule: { communityId: string },
    communityPastoralId: string,
    currentUser: CurrentUser,
  ) {
    const managing = ([
      UserRole.SYSTEM_ADMIN,
      UserRole.DIOCESAN_ADMIN,
      UserRole.PARISH_ADMIN,
      UserRole.COMMUNITY_COORDINATOR,
    ] as UserRole[]).includes(currentUser.role as UserRole);
    if (managing) {
      await this.assertCommunityInScope(schedule.communityId, currentUser);
      return;
    }
    if (currentUser.role === UserRole.PASTORAL_COORDINATOR) {
      const coordinates = await this.isCurrentPastoralCoordinator(currentUser.id, communityPastoralId);
      if (coordinates) return;
      throw new ForbiddenException('Você só pode vincular ou desvincular a pastoral que coordena');
    }
    throw new ForbiddenException('Sem permissão para vincular pastorais');
  }

  /** Vincula UMA pastoral ao horário fixo (upsert — atualiza as vagas se já vinculada). */
  async linkPastoral(
    massScheduleId: string,
    dto: { communityPastoralId: string; requiredPeople?: number },
    currentUser: CurrentUser,
  ) {
    if (!dto?.communityPastoralId || typeof dto.communityPastoralId !== 'string') {
      throw new BadRequestException('Informe a pastoral (communityPastoralId)');
    }
    const schedule = await this.findOne(massScheduleId);
    await this.assertPastoralLinkPermission(schedule, dto.communityPastoralId, currentUser);

    // Mesma regra do buildPastoralCreate: pastoral/ministério da MESMA paróquia
    const community = await this.prisma.community.findUnique({
      where: { id: schedule.communityId },
      select: { parishId: true },
    });
    const pastoral = await this.prisma.communityPastoral.findFirst({
      where: {
        id: dto.communityPastoralId,
        deletedAt: null,
        community: { parishId: community?.parishId ?? '__none__' },
      },
      select: { id: true },
    });
    if (!pastoral) {
      throw new BadRequestException('A pastoral não pertence à paróquia desta comunidade');
    }

    const requiredPeople = Math.max(0, Math.floor(Number(dto.requiredPeople ?? 0)) || 0);
    return this.prisma.massSchedulePastoral.upsert({
      where: {
        massScheduleId_communityPastoralId: {
          massScheduleId,
          communityPastoralId: dto.communityPastoralId,
        },
      },
      update: { requiredPeople },
      create: { massScheduleId, communityPastoralId: dto.communityPastoralId, requiredPeople },
      ...PASTORAL_INCLUDE,
    });
  }

  /** Remove o vínculo de UMA pastoral com o horário fixo. */
  async unlinkPastoral(massScheduleId: string, communityPastoralId: string, currentUser: CurrentUser) {
    const schedule = await this.findOne(massScheduleId);
    await this.assertPastoralLinkPermission(schedule, communityPastoralId, currentUser);
    const result = await this.prisma.massSchedulePastoral.deleteMany({
      where: { massScheduleId, communityPastoralId },
    });
    if (result.count === 0) {
      throw new NotFoundException('Esta pastoral não está vinculada a este horário');
    }
    return { removed: result.count };
  }

  async update(id: string, updateMassScheduleDto: UpdateMassScheduleDto, currentUser?: CurrentUser) {
    const schedule = await this.findOne(id); // Verifica se existe
    await this.assertCommunityInScope(schedule.communityId, currentUser);

    const { pastoralSettings, communityId, ...bruto } = updateMassScheduleDto;
    // A edição pode trocar o tipo de recorrência; a normalização parte do que
    // já está gravado para não exigir o reenvio de campos que não mudaram.
    const mudouRecorrencia =
      bruto.recurrence !== undefined ||
      bruto.dayOfWeek !== undefined ||
      bruto.dayOfMonth !== undefined ||
      bruto.weeksOfMonth !== undefined;
    const rest = mudouRecorrencia
      ? this.normalizeRecurrence(bruto, {
          recurrence: schedule.recurrence,
          dayOfWeek: schedule.dayOfWeek,
          dayOfMonth: schedule.dayOfMonth,
        })
      : bruto;
    const targetCommunityId = communityId ?? schedule.communityId;
    if (communityId && communityId !== schedule.communityId) {
      await this.assertCommunityInScope(communityId, currentUser);
    }

    const data: any = { ...rest };
    if (communityId) data.communityId = communityId;
    // Se pastoralSettings vier no payload, substitui as pastorais vinculadas.
    if (pastoralSettings !== undefined) {
      const pastoralsCreate = await this.buildPastoralCreate(targetCommunityId, pastoralSettings);
      data.pastorals = { deleteMany: {}, create: pastoralsCreate };
    }

    return this.prisma.massSchedule.update({
      where: { id },
      data,
      include: {
        community: { select: { id: true, name: true } },
        pastorals: PASTORAL_INCLUDE,
      },
    });
  }

  /**
   * Gera uma escala (Schedule) para uma data específica deste horário fixo,
   * copiando as pastorais vinculadas — mesmo fluxo de uma escala de evento.
   */
  async generateSchedule(
    id: string,
    dto: GenerateScheduleFromMassDto,
    currentUser: CurrentUser,
  ) {
    const mass = await this.prisma.massSchedule.findUnique({
      where: { id },
      include: {
        community: { select: { id: true, name: true } },
        pastorals: true,
      },
    });
    if (!mass) {
      throw new NotFoundException(`Horário fixo com ID ${id} não encontrado`);
    }
    await this.assertCommunityInScope(mass.communityId, currentUser);

    if (mass.pastorals.length === 0) {
      throw new BadRequestException(
        'Vincule ao menos uma pastoral a este horário fixo antes de gerar a escala.',
      );
    }

    const date = new Date(dto.date);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Data inválida');
    }

    // Data suspensa ("não haverá"): não gera escala para o que não vai acontecer
    const suspensa = await this.prisma.massScheduleCancellation.findUnique({
      where: { massScheduleId_date: { massScheduleId: id, date: dayUtc(ymd(date)) } },
      select: { id: true },
    });
    if (suspensa) {
      throw new BadRequestException(
        `Este horário está suspenso em ${brDate(ymd(date))}. Reative a data antes de gerar a escala.`,
      );
    }

    // Deduplicação: no máximo uma escala por (horário fixo, dia)
    const dayStart = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0),
    );
    const dayEnd = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59),
    );
    const existing = await this.prisma.schedule.findFirst({
      where: {
        massScheduleId: id,
        date: { gte: dayStart, lte: dayEnd },
        deletedAt: null,
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Já existe uma escala para este horário nesta data.');
    }

    const label = SCHEDULE_LABELS[mass.type] ?? mass.type;
    const title =
      dto.title?.trim() ||
      `${label} ${mass.time}${mass.notes ? ` — ${mass.notes}` : ''}`;
    const endTime = this.addMinutes(mass.time, SCHEDULE_DURATION_MIN[mass.type] ?? 45);

    return this.prisma.schedule.create({
      data: {
        title,
        date,
        communityId: mass.communityId,
        massScheduleId: mass.id,
        startTime: mass.time,
        endTime,
        status: ScheduleStatus.OPEN,
        pastorals: {
          create: mass.pastorals.map((p) => ({
            communityPastoralId: p.communityPastoralId,
            role: p.role,
            isLeader: p.isLeader,
            requiredPeople: p.requiredPeople,
          })),
        },
      },
      include: {
        community: { select: { id: true, name: true } },
        pastorals: PASTORAL_INCLUDE,
      },
    });
  }

  // --- Suspensão pontual ("não haverá") ------------------------------------
  // A Matriz tem Confissão às 09:00 e 15:00, mas em alguns dias não acontece
  // (agenda dos padres). A gestão marca a data; o fiel vê o aviso no app e no
  // mapa; quem favoritou recebe push se for hoje/amanhã. O horário continua.

  /** Horário fixo + escopo de gestão (mesma checagem do Editar). */
  private async findScheduleForCancellation(id: string, currentUser: CurrentUser) {
    const schedule = await this.prisma.massSchedule.findUnique({
      where: { id },
      include: { community: { select: { id: true, name: true } } },
    });
    if (!schedule) {
      throw new NotFoundException(`Horário fixo com ID ${id} não encontrado`);
    }
    await this.assertCommunityInScope(schedule.communityId, currentUser);
    return schedule;
  }

  private toCancellationView(row: {
    id: string;
    date: Date;
    reason: string | null;
    createdAt: Date;
    createdBy?: { id: string; name: string } | null;
  }): MassScheduleCancellationView {
    return {
      id: row.id,
      date: ymd(row.date),
      reason: row.reason ?? null,
      createdAt: row.createdAt,
      createdBy: row.createdBy ? { id: row.createdBy.id, name: row.createdBy.name } : null,
    };
  }

  private readonly cancellationSelect = {
    id: true,
    date: true,
    reason: true,
    createdAt: true,
    createdBy: { select: { id: true, name: true } },
  } as const;

  /** Datas suspensas do horário no período (padrão: hoje..+60 dias, relógio de SP). */
  async listCancellations(
    id: string,
    currentUser: CurrentUser,
    fromStr?: string,
    toStr?: string,
  ): Promise<MassScheduleCancellationView[]> {
    await this.findScheduleForCancellation(id, currentUser);
    const today = this.todaySaoPaulo();
    const from = fromStr || today;
    const to = toStr || addDaysYmd(from, UPCOMING_CANCELLATIONS_DAYS);
    if (!isRealDate(from) || !isRealDate(to)) {
      throw new BadRequestException('Período inválido: use datas no formato AAAA-MM-DD');
    }
    if (to < from) {
      throw new BadRequestException('Período inválido: a data final é anterior à inicial');
    }

    const rows = await this.prisma.massScheduleCancellation.findMany({
      where: { massScheduleId: id, date: { gte: dayUtc(from), lte: dayUtc(to) } },
      select: this.cancellationSelect,
      orderBy: { date: 'asc' },
    });
    return rows.map((r) => this.toCancellationView(r));
  }

  /**
   * Suspende o horário em uma ou mais datas. Cada data precisa ser uma
   * ocorrência real do horário (mesma regra de recorrência da agenda) e não
   * pode ter passado — hoje pode. Idempotente: data já suspensa só troca o
   * motivo. Escalas já geradas para a data não são tocadas.
   */
  async cancelOccurrences(
    id: string,
    dto: CancelOccurrencesDto,
    currentUser: CurrentUser,
  ): Promise<MassScheduleCancellationView[]> {
    const schedule = await this.findScheduleForCancellation(id, currentUser);

    const dates = [...new Set((dto?.dates ?? []).map((d) => String(d).trim()))].sort();
    if (dates.length === 0) {
      throw new BadRequestException('Informe ao menos uma data');
    }
    if (dates.length > MAX_CANCELLATION_DATES) {
      throw new BadRequestException(`Envie no máximo ${MAX_CANCELLATION_DATES} datas por vez`);
    }
    const invalid = dates.find((d) => !isRealDate(d));
    if (invalid) {
      throw new BadRequestException(`Data inválida: ${invalid} (use o formato AAAA-MM-DD)`);
    }
    const reasonRaw = typeof dto?.reason === 'string' ? dto.reason.trim() : '';
    if (reasonRaw.length > MAX_CANCELLATION_REASON) {
      throw new BadRequestException(`O motivo pode ter no máximo ${MAX_CANCELLATION_REASON} caracteres`);
    }
    const reason = reasonRaw || null;

    const today = this.todaySaoPaulo();
    const past = dates.find((d) => d < today);
    if (past) {
      throw new BadRequestException(`A data ${brDate(past)} já passou`);
    }
    const limit = addDaysYmd(today, MAX_CANCELLATION_AHEAD_DAYS);
    const tooFar = dates.find((d) => d > limit);
    if (tooFar) {
      throw new BadRequestException(
        `Só é possível suspender datas até ${brDate(limit)} (${brDate(tooFar)} está longe demais)`,
      );
    }

    // A data precisa ser um dia em que o horário acontece de verdade
    const validDays = new Set(
      this.occurrenceDays(schedule, dayUtc(dates[0]), dayUtc(dates[dates.length - 1])).map(ymd),
    );
    const label = SCHEDULE_LABELS[schedule.type] ?? schedule.type;
    const notOccurrence = dates.find((d) => !validDays.has(d));
    if (notOccurrence) {
      throw new BadRequestException(
        `Não há ${label} às ${schedule.time} em ${brDate(notOccurrence)}`,
      );
    }

    const alreadyCancelled = await this.prisma.massScheduleCancellation.findMany({
      where: { massScheduleId: id, date: { in: dates.map(dayUtc) } },
      select: { date: true },
    });
    const existing = new Set(alreadyCancelled.map((c) => ymd(c.date)));
    const newDates = dates.filter((d) => !existing.has(d));

    const rows = await this.prisma.$transaction(
      dates.map((d) =>
        this.prisma.massScheduleCancellation.upsert({
          where: { massScheduleId_date: { massScheduleId: id, date: dayUtc(d) } },
          update: { reason },
          create: { massScheduleId: id, date: dayUtc(d), reason, createdById: currentUser.id },
          select: this.cancellationSelect,
        }),
      ),
    );

    // Escalas já geradas para as datas: ficam como estão (a coordenação decide);
    // só registramos na auditoria para quem for conferir.
    const linkedSchedules = await this.prisma.schedule.findMany({
      where: {
        massScheduleId: id,
        deletedAt: null,
        date: {
          gte: dayUtc(dates[0]),
          lt: new Date(dayUtc(dates[dates.length - 1]).getTime() + DAY_MS),
        },
      },
      select: { id: true, date: true },
    });
    const dateSet = new Set(dates);
    const affectedSchedules = linkedSchedules.filter((s) => dateSet.has(ymd(s.date)));

    await this.auditService.log({
      actor: { id: currentUser.id, email: currentUser.email, role: currentUser.role },
      action: 'MASS_SCHEDULE_CANCELLED',
      entity: 'MassSchedule',
      entityId: id,
      after: { dates, reason },
      metadata: {
        communityId: schedule.communityId,
        newDates,
        reasonUpdatedDates: dates.filter((d) => existing.has(d)),
        existingScheduleIds: affectedSchedules.map((s) => s.id),
      },
    });

    // Push só para datas NOVAS (trocar o motivo não re-notifica ninguém)
    await this.notifyFavoritesOfChange(schedule, newDates, 'cancelled', reason, currentUser.id);

    return rows.map((r) => this.toCancellationView(r));
  }

  /** Reativa uma data suspensa ("voltou a acontecer"). 404 se não estava suspensa. */
  async restoreOccurrence(id: string, date: string, currentUser: CurrentUser) {
    const schedule = await this.findScheduleForCancellation(id, currentUser);
    if (!isRealDate(date)) {
      throw new BadRequestException(`Data inválida: ${date} (use o formato AAAA-MM-DD)`);
    }

    const found = await this.prisma.massScheduleCancellation.findUnique({
      where: { massScheduleId_date: { massScheduleId: id, date: dayUtc(date) } },
      select: { id: true, reason: true },
    });
    if (!found) {
      throw new NotFoundException(`Este horário não está suspenso em ${brDate(date)}`);
    }
    await this.prisma.massScheduleCancellation.delete({ where: { id: found.id } });

    await this.auditService.log({
      actor: { id: currentUser.id, email: currentUser.email, role: currentUser.role },
      action: 'MASS_SCHEDULE_RESTORED',
      entity: 'MassSchedule',
      entityId: id,
      before: { date, reason: found.reason ?? null },
      metadata: { communityId: schedule.communityId },
    });

    await this.notifyFavoritesOfChange(schedule, [date], 'restored', null, currentUser.id);

    return { ok: true };
  }

  /**
   * Avisa quem favoritou o horário quando a mudança é para HOJE ou AMANHÃ
   * (relógio de SP) — mais longe que isso o fiel vê o aviso no app. Nunca
   * lança: falha de push não derruba a suspensão. O autor não recebe.
   */
  private async notifyFavoritesOfChange(
    schedule: { id: string; type: MassScheduleType; time: string; communityId: string; community: { name: string } | null },
    dates: string[],
    kind: 'cancelled' | 'restored',
    reason: string | null,
    authorId: string,
  ) {
    try {
      const today = this.todaySaoPaulo();
      const tomorrow = addDaysYmd(today, 1);
      const soon = dates.filter((d) => d === today || d === tomorrow);
      if (soon.length === 0) return;

      const favorites = await this.prisma.massScheduleFavorite.findMany({
        where: { massScheduleId: schedule.id, userId: { not: authorId } },
        select: { userId: true },
      });
      const userIds = favorites.map((f) => f.userId);
      if (userIds.length === 0) return;

      const label = SCHEDULE_LABELS[schedule.type] ?? schedule.type;
      const communityName = schedule.community?.name ?? 'Sua comunidade';
      for (const d of soon) {
        const when = d === today ? 'hoje' : 'amanhã';
        const title =
          kind === 'cancelled'
            ? `${label} das ${schedule.time} não vai acontecer ${when}`
            : `${label} das ${schedule.time} voltou a acontecer ${when}`;
        const body =
          kind === 'cancelled'
            ? reason
              ? `${communityName} — ${reason}`
              : communityName
            : `${communityName} — o horário está mantido.`;
        await this.notificationsService.notifyUsers(userIds, NotificationType.EVENT_REMINDER, title, body, {
          kind: kind === 'cancelled' ? 'mass-schedule-cancelled' : 'mass-schedule-restored',
          massScheduleId: schedule.id,
          communityId: schedule.communityId,
          date: d,
        });
      }
    } catch (error) {
      // Aviso é best-effort: a suspensão já foi gravada
      this.logger.warn(`Falha ao avisar favoritos do horário ${schedule.id}: ${error}`);
    }
  }

  async remove(id: string, currentUser?: CurrentUser) {
    const schedule = await this.findOne(id); // Verifica se existe
    await this.assertCommunityInScope(schedule.communityId, currentUser);

    return this.prisma.massSchedule.delete({
      where: { id },
    });
  }

  // Obter horários especiais (festas, solenidades)
  async findSpecialSchedules(communityId?: string) {
    const where: any = { isSpecial: true };

    if (communityId) {
      where.communityId = communityId;
    }

    return this.prisma.massSchedule.findMany({
      where,
      include: {
        community: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        specialDate: 'asc',
      },
    });
  }

  async getFavorites(currentUser: CurrentUser, communityId?: string) {
    const where: any = { userId: currentUser.id };
    const restrictedRoles: UserRole[] = [
      UserRole.COMMUNITY_COORDINATOR,
      UserRole.PASTORAL_COORDINATOR,
      UserRole.VOLUNTEER,
      UserRole.FAITHFUL,
    ];

    const scheduleFilter: any = {};
    if (restrictedRoles.includes(currentUser.role) && currentUser.communityId) {
      scheduleFilter.communityId = currentUser.communityId;
    } else if (communityId) {
      scheduleFilter.communityId = communityId;
    }

    if (Object.keys(scheduleFilter).length > 0) {
      where.massSchedule = scheduleFilter;
    }

    const favorites = await this.prisma.massScheduleFavorite.findMany({
      where,
      include: {
        massSchedule: {
          include: {
            community: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        { massSchedule: { dayOfWeek: 'asc' } },
        { massSchedule: { time: 'asc' } },
      ],
    });

    return favorites.map((favorite) => favorite.massSchedule);
  }

  async addFavorite(scheduleId: string, currentUser: CurrentUser) {
    const schedule = await this.prisma.massSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new NotFoundException(`Horario de missa com ID ${scheduleId} nao encontrado`);
    }

    this.ensureAccess(schedule, currentUser);

    await this.prisma.massScheduleFavorite.upsert({
      where: {
        userId_massScheduleId: {
          userId: currentUser.id,
          massScheduleId: scheduleId,
        },
      },
      update: {},
      create: {
        userId: currentUser.id,
        massScheduleId: scheduleId,
      },
    });

    return { massScheduleId: scheduleId, favorite: true };
  }

  async removeFavorite(scheduleId: string, currentUser: CurrentUser) {
    const schedule = await this.prisma.massSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new NotFoundException(`Horario de missa com ID ${scheduleId} nao encontrado`);
    }

    this.ensureAccess(schedule, currentUser);

    await this.prisma.massScheduleFavorite.deleteMany({
      where: {
        userId: currentUser.id,
        massScheduleId: scheduleId,
      },
    });

    return { massScheduleId: scheduleId, favorite: false };
  }
}
