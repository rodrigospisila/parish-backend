/**
 * Fuso e datas civis da paróquia — helper ÚNICO (auditoria A17/A19/M45).
 *
 * O Brasil tem fusos -3/-4/-5, mas as datas civis de uma paróquia seguem o
 * fuso DELA. Ainda não existe campo de fuso na Parish/Community: todo o
 * sistema usa America/Sao_Paulo explicitamente por aqui. Quando o campo
 * existir, basta passar o `timeZone` da paróquia nos parâmetros opcionais.
 *
 * Nunca dependa do TZ do processo (setHours/getDate/toLocaleString sem
 * timeZone): o Railway roda com TZ=America/Sao_Paulo, os testes e outras
 * máquinas não. E nunca faça new Date('AAAA-MM-DD') esperando o dia local —
 * isso é meia-noite UTC, que em Brasília é 21:00 do dia ANTERIOR.
 */

export const DEFAULT_PARISH_TIME_ZONE = 'America/Sao_Paulo';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const HHMM_RE = /^(\d{1,2}):(\d{2})$/;
// 'AAAA-MM-DDTHH:MM', com segundos/milissegundos opcionais e SEM fuso
const NAIVE_DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/;
const HAS_OFFSET_RE = /(Z|[+-]\d{2}:?\d{2})$/i;

const pad = (value: number) => String(value).padStart(2, '0');

export interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  /** 0 = domingo … 6 = sábado */
  weekday: number;
}

const partsFormatters = new Map<string, Intl.DateTimeFormat>();
function partsFormatter(timeZone: string) {
  let formatter = partsFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
    });
    partsFormatters.set(timeZone, formatter);
  }
  return formatter;
}

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Relógio de parede de um instante no fuso da paróquia. */
export function zonedParts(instant: Date, timeZone = DEFAULT_PARISH_TIME_ZONE): ZonedParts {
  const map: Record<string, string> = {};
  for (const part of partsFormatter(timeZone).formatToParts(instant)) {
    map[part.type] = part.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour) % 24,
    minute: Number(map.minute),
    weekday: WEEKDAYS[map.weekday] ?? 0,
  };
}

/** Dia civil (AAAA-MM-DD) de um instante no fuso da paróquia. */
export function zonedYmd(instant: Date, timeZone = DEFAULT_PARISH_TIME_ZONE): string {
  const p = zonedParts(instant, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Hoje (AAAA-MM-DD) no fuso da paróquia. */
export function todayYmd(now = new Date(), timeZone = DEFAULT_PARISH_TIME_ZONE): string {
  return zonedYmd(now, timeZone);
}

/** Instante exatamente à meia-noite UTC — marca de valor só-dia (convenção do painel). */
export function isMidnightUtc(date: Date): boolean {
  return (
    date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0
  );
}

/** Dia civil de um campo só-dia gravado à meia-noite UTC (@db.Date, escala da agenda fixa). */
export function utcYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** 'AAAA-MM-DD' válido (rejeita 2026-02-30)? Devolve as partes ou null. */
export function parseYmd(value: string | null | undefined): { year: number; month: number; day: number } | null {
  const match = YMD_RE.exec(String(value ?? '').trim());
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    return null;
  }
  return { year, month, day };
}

/** Soma dias a um 'AAAA-MM-DD' (aritmética de calendário, sem fuso). */
export function addDaysYmd(ymd: string, days: number): string {
  const p = parseYmd(ymd);
  if (!p) throw new Error(`Data inválida: ${ymd}`);
  return utcYmd(new Date(Date.UTC(p.year, p.month - 1, p.day) + days * DAY_MS));
}

/** Diferença (ms) entre o relógio do fuso e o UTC naquele instante (SP = -3h). */
function offsetMs(instant: Date, timeZone: string): number {
  const p = zonedParts(instant, timeZone);
  const seconds = instant.getUTCSeconds();
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, seconds);
  return asUtc - (instant.getTime() - instant.getUTCMilliseconds());
}

/**
 * Relógio de parede da paróquia → instante. Ex.: ('2026-09-05', 18, 0) em SP
 * = 2026-09-05T21:00:00Z. Cobre a troca de horário de verão (datas antigas,
 * até 2019) como o "compatible" do Temporal: na hora repetida (fim do verão)
 * vale a PRIMEIRA ocorrência; na hora que não existiu (início do verão, ex.:
 * 04/11/2018 00:00 em SP) o relógio avança com o offset novo — 01:00 do
 * mesmo dia, nunca 23:00 do dia anterior (R3#51).
 */
export function zonedDateTimeToInstant(
  ymd: string,
  hour: number,
  minute: number,
  timeZone = DEFAULT_PARISH_TIME_ZONE,
  second = 0,
  millisecond = 0,
): Date {
  const p = parseYmd(ymd);
  if (!p) throw new Error(`Data inválida: ${ymd}`);
  const wall = Date.UTC(p.year, p.month - 1, p.day, hour, minute, second, millisecond);
  // Offsets antes e depois de uma eventual troca (não há duas trocas em 2 dias)
  const before = offsetMs(new Date(wall - DAY_MS), timeZone);
  const after = offsetMs(new Date(wall + DAY_MS), timeZone);
  if (before === after) return new Date(wall - before);
  const valid = [before, after].filter((offset) => offsetMs(new Date(wall - offset), timeZone) === offset);
  // Hora repetida: as duas valem → o instante mais cedo (maior offset)
  if (valid.length === 2) return new Date(wall - Math.max(before, after));
  if (valid.length === 1) return new Date(wall - valid[0]);
  // Buraco: lê o relógio com o offset de antes → cai depois da troca
  return new Date(wall - before);
}

/** Início e fim (inclusivo) do dia civil no fuso da paróquia, como instantes. */
export function zonedDayRange(ymd: string, timeZone = DEFAULT_PARISH_TIME_ZONE): { start: Date; end: Date } {
  const start = zonedDateTimeToInstant(ymd, 0, 0, timeZone);
  const next = zonedDateTimeToInstant(addDaysYmd(ymd, 1), 0, 0, timeZone);
  return { start, end: new Date(next.getTime() - 1) };
}

/**
 * Data/hora vinda de cliente → instante. Com fuso ('Z', '-03:00') vale como
 * veio; SEM fuso ('2026-12-20T19:00', o datetime-local do painel) é relógio
 * de parede da paróquia; só-dia ('2026-12-20') é a meia-noite local.
 * Devolve null se não for uma data válida.
 */
export function parseClientDateTime(value: string | null | undefined, timeZone = DEFAULT_PARISH_TIME_ZONE): Date | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  const naive = NAIVE_DATETIME_RE.exec(raw);
  if (naive) {
    const ymd = `${naive[1]}-${naive[2]}-${naive[3]}`;
    const [hour, minute, second] = [Number(naive[4]), Number(naive[5]), Number(naive[6] ?? 0)];
    const millisecond = Number((naive[7] ?? '0').padEnd(3, '0'));
    if (!parseYmd(ymd) || hour > 23 || minute > 59 || second > 59) return null;
    return zonedDateTimeToInstant(ymd, hour, minute, timeZone, second, millisecond);
  }
  if (parseYmd(raw)) {
    return zonedDateTimeToInstant(raw, 0, 0, timeZone);
  }
  if (!HAS_OFFSET_RE.test(raw)) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Data da escala AVULSA (sem evento) → { date só-dia 00:00Z, startTime }.
 * O painel manda o datetime-local como instante (new Date('2026-10-10T22:00')
 * .toISOString() = 2026-10-11T01:00Z): o dia é o civil da paróquia (10/10),
 * não o UTC (11/10), e sem startTime a hora sai do próprio instante (22:00).
 * Só-dia ('2026-10-10') fica como veio, sem horário (dia inteiro). R3#45.
 */
export function normalizeStandaloneScheduleDate(
  value: string | null | undefined,
  startTime?: string | null,
  timeZone = DEFAULT_PARISH_TIME_ZONE,
): { date: Date; startTime: string | null } | null {
  const raw = String(value ?? '').trim();
  const explicitStart = startTime?.trim() || null;
  if (parseYmd(raw)) {
    return { date: new Date(`${raw}T00:00:00.000Z`), startTime: explicitStart };
  }
  const instant = parseClientDateTime(raw, timeZone);
  if (!instant) return null;
  const p = zonedParts(instant, timeZone);
  return {
    date: new Date(`${zonedYmd(instant, timeZone)}T00:00:00.000Z`),
    startTime: explicitStart ?? `${pad(p.hour)}:${pad(p.minute)}`,
  };
}

/**
 * Evento de "dia inteiro" (sem hora; o mapa não o lista como "às 00:00" e o
 * app mostra "Dia todo") — R3#47. Dia inteiro é:
 *  • fim às 00:00 de OUTRO dia civil com início às 00:00, ou janela ≥ 24 h;
 *  • sem fim e início às 00:00, só se NÃO for Missa — Missa às 00:00 sem fim
 *    é a Missa do Galo, com hora.
 * Mesmo critério do app (app/(tabs)/index.tsx).
 */
export function isAllDayEvent(
  event: { type?: string | null; startDate: Date; endDate?: Date | null },
  timeZone = DEFAULT_PARISH_TIME_ZONE,
): boolean {
  const start = new Date(event.startDate);
  const end = event.endDate ? new Date(event.endDate) : null;
  if (end && end.getTime() - start.getTime() >= DAY_MS) return true;
  const startParts = zonedParts(start, timeZone);
  if (startParts.hour !== 0 || startParts.minute !== 0) return false;
  if (!end) return event.type !== 'MASS';
  const endParts = zonedParts(end, timeZone);
  return endParts.hour === 0 && endParts.minute === 0 && zonedYmd(end, timeZone) !== zonedYmd(start, timeZone);
}

/** 'HH:MM' → { hour, minute } (null se ausente ou inválido). */
export function parseHhMm(value: string | null | undefined): { hour: number; minute: number } | null {
  const match = HHMM_RE.exec(String(value ?? '').trim());
  if (!match) return null;
  const [hour, minute] = [Number(match[1]), Number(match[2])];
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

/** Minutos desde a meia-noite no fuso da paróquia. */
export function zonedMinutesOfDay(instant: Date, timeZone = DEFAULT_PARISH_TIME_ZONE): number {
  const p = zonedParts(instant, timeZone);
  return p.hour * 60 + p.minute;
}

/** '05/09/2026 às 18:00' no fuso da paróquia. */
export function formatDateTimeBR(instant: Date, timeZone = DEFAULT_PARISH_TIME_ZONE): string {
  const p = zonedParts(instant, timeZone);
  return `${pad(p.day)}/${pad(p.month)}/${p.year} às ${pad(p.hour)}:${pad(p.minute)}`;
}

/** '05/09/2026' a partir de 'AAAA-MM-DD'. */
export function formatYmdBR(ymd: string): string {
  const [year, month, day] = ymd.split('-');
  return `${day}/${month}/${year}`;
}

// ---------------------------------------------------------------------------
// Escalas: Schedule.date tem DUAS semânticas (mesma regra do painel):
//  • sem evento (agenda fixa / avulsa): date é SÓ-DIA (gravado 00:00Z) e a
//    hora está em startTime/endTime, relógio de parede da paróquia;
//  • com evento: date é instante real e a janela vem do evento.
// ---------------------------------------------------------------------------

export interface ScheduleTimeInput {
  date: Date;
  startTime?: string | null;
  endTime?: string | null;
  event?: { startDate?: Date | null; endDate?: Date | null } | null;
}

const FALLBACK_DURATION_MS = 2 * HOUR_MS;

/** Dia civil (AAAA-MM-DD) da escala no fuso da paróquia. */
export function scheduleCivilDay(schedule: ScheduleTimeInput, timeZone = DEFAULT_PARISH_TIME_ZONE): string {
  const date = new Date(schedule.date);
  if (!schedule.event && (parseHhMm(schedule.startTime) || isMidnightUtc(date))) return utcYmd(date);
  return zonedYmd(scheduleWindow(schedule, timeZone).start, timeZone);
}

/**
 * Janela [início, fim] da escala como instantes. Sem evento: dia civil +
 * startTime/endTime no fuso da paróquia (sem startTime = meia-noite local).
 * Com evento: horários do evento, nunca antes da própria data da escala;
 * fallback de 2h.
 */
export function scheduleWindow(
  schedule: ScheduleTimeInput,
  timeZone = DEFAULT_PARISH_TIME_ZONE,
): { start: Date; end: Date } {
  const date = new Date(schedule.date);

  if (!schedule.event) {
    const day = utcYmd(date);
    const startHm = parseHhMm(schedule.startTime);
    const endHm = parseHhMm(schedule.endTime);
    // Sem startTime e fora da meia-noite UTC: a própria data já é o instante
    // (escala avulsa antiga gravada com hora) — mesma regra do painel
    const start =
      !startHm && !isMidnightUtc(date)
        ? date
        : zonedDateTimeToInstant(day, startHm?.hour ?? 0, startHm?.minute ?? 0, timeZone);
    const end = endHm ? zonedDateTimeToInstant(day, endHm.hour, endHm.minute, timeZone) : null;
    return {
      start,
      end: end && end.getTime() > start.getTime() ? end : new Date(start.getTime() + FALLBACK_DURATION_MS),
    };
  }

  const fallbackEnd = new Date(date.getTime() + FALLBACK_DURATION_MS);
  const eventStart = schedule.event.startDate ? new Date(schedule.event.startDate) : date;
  const eventEnd = schedule.event.endDate ? new Date(schedule.event.endDate) : fallbackEnd;
  return {
    start: eventStart.getTime() >= date.getTime() ? eventStart : date,
    end: eventEnd.getTime() > date.getTime() ? eventEnd : fallbackEnd,
  };
}

/** Início efetivo da escala (instante). */
export function scheduleStart(schedule: ScheduleTimeInput, timeZone = DEFAULT_PARISH_TIME_ZONE): Date {
  return scheduleWindow(schedule, timeZone).start;
}

/** Rótulo '05/09/2026 às 18:00' do início da escala, no fuso da paróquia. */
export function scheduleLabel(schedule: ScheduleTimeInput, timeZone = DEFAULT_PARISH_TIME_ZONE): string {
  return formatDateTimeBR(scheduleStart(schedule, timeZone), timeZone);
}
