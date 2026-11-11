import { BadRequestException } from '@nestjs/common';
import { MassScheduleType } from '@prisma/client';
import { MASS_SCHEDULE_TYPE_DURATION_MIN } from './mass-schedule-types';

/**
 * Janela (início–fim) de uma ocorrência de horário fixo e o "acontecendo agora".
 * Funções puras, fonte única da regra: usadas pela agenda expandida, pelo mapa
 * (/masses/nearby, /public/map/*), pela página pública da comunidade e pelas
 * listas de horários. Tudo em relógio de parede da comunidade (horário
 * flutuante 'YYYY-MM-DDTHH:MM:SS', sem fuso) — quem chama passa o "agora" já
 * convertido para o fuso da UF (nowFloatingIn(timeZoneForState(uf))).
 */

/** HH:MM de 00:00 a 23:59 (o formato gravado; "7:30" de carga antiga é normalizado antes). */
export const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
/** Duração (min) quando o tipo é desconhecido. */
const FALLBACK_DURATION_MIN = 45;
/** Maior duração padrão: quanto olhar para trás para achar o que ainda está em andamento sem `endTime`. */
export const MAX_DEFAULT_DURATION_MIN = Math.max(...Object.values(MASS_SCHEDULE_TYPE_DURATION_MIN));
const DAY_MS = 24 * 60 * 60 * 1000;

/** "7:30" → "07:30"; o resto volta aparado. */
export function normalizeHhmm(value?: string | null): string {
  const trimmed = String(value ?? '').trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  return match ? `${match[1].padStart(2, '0')}:${match[2]}` : trimmed;
}

/** Duração padrão (min) do tipo de horário. */
export function defaultDurationMin(type: MassScheduleType | string): number {
  return (MASS_SCHEDULE_TYPE_DURATION_MIN as Record<string, number>)[type] ?? FALLBACK_DURATION_MIN;
}

/** Soma minutos a um horário flutuante (YYYY-MM-DDTHH:MM:SS), sem fuso. */
function shiftFloating(floating: string, minutes: number): string {
  return new Date(new Date(`${floating}.000Z`).getTime() + minutes * 60_000).toISOString().slice(0, 19);
}

/**
 * O `endTime` vale? Precisa ser HH:MM e maior que o início (mesmo dia). Dado
 * antigo/inválido é ignorado na leitura (cai na duração padrão) — nunca gera
 * um fim antes do começo.
 */
export function isUsableEndTime(time: string, endTime?: string | null): endTime is string {
  if (endTime == null) return false;
  const end = normalizeHhmm(endTime);
  return HHMM_RE.test(end) && end > normalizeHhmm(time);
}

/**
 * Validação de escrita (criar/editar horário): `null`/vazio limpa; senão HH:MM
 * e maior que `time` — 400 em português. Devolve o valor a gravar.
 */
export function assertEndTime(time: string, endTime: string | null | undefined): string | null {
  if (endTime == null || String(endTime).trim() === '') return null;
  const end = normalizeHhmm(endTime);
  if (!HHMM_RE.test(end)) {
    throw new BadRequestException('Horário de término inválido: use HH:MM, de 00:00 a 23:59');
  }
  if (end <= normalizeHhmm(time)) {
    throw new BadRequestException(
      `O horário de término (${end}) precisa ser depois do início (${normalizeHhmm(time)}), no mesmo dia`,
    );
  }
  return end;
}

const hhmmToMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/**
 * A hora de início mudou e o fim NÃO foi enviado (cliente que não conhece o
 * campo, proposta de dados): o fim acompanha, preservando a duração — "19:00–
 * 20:00" movido para 08:00 vira "08:00–09:00", e não "08:00–20:00". Devolve o
 * fim a gravar: `null` (limpa → duração padrão do tipo) quando o fim deslocado
 * passaria de 23:59 ou quando o fim gravado já não valia.
 */
export function shiftedEndTime(oldTime: string, oldEndTime: string | null | undefined, newTime: string): string | null {
  if (oldEndTime == null) return null;
  const from = normalizeHhmm(oldTime);
  const to = normalizeHhmm(newTime);
  const end = normalizeHhmm(oldEndTime);
  // Início igual: o fim fica como está, se ainda vale
  if (from === to) return isUsableEndTime(to, end) ? end : null;
  // Fim gravado inválido (dado antigo) ou hora fora do formato: não há duração a preservar
  if (!HHMM_RE.test(from) || !HHMM_RE.test(to) || !isUsableEndTime(from, end)) return null;
  const shifted = hhmmToMin(to) + (hhmmToMin(end) - hhmmToMin(from));
  // Fim depois da meia-noite não é suportado: limpa
  if (shifted > 23 * 60 + 59) return null;
  return `${String(Math.floor(shifted / 60)).padStart(2, '0')}:${String(shifted % 60).padStart(2, '0')}`;
}

/** início ≤ agora < fim, e nunca numa ocorrência suspensa ("não haverá"). */
export function isHappeningNow(start: string, end: string, nowLocal: string, cancelled = false): boolean {
  if (cancelled) return false;
  const now = nowLocal.slice(0, 19);
  return start <= now && now < end;
}

export interface OccurrenceWindow {
  /** Início em relógio de parede (YYYY-MM-DDTHH:MM:00). */
  start: string;
  /** Fim: `endTime` do horário ou início + duração padrão do tipo (pode cair no dia seguinte). */
  end: string;
  happeningNow: boolean;
}

/**
 * A função central: dado o horário (`time`, `endTime`, `type`), o dia da
 * ocorrência, o "agora" local da comunidade e se aquela data está suspensa,
 * devolve início, fim e se está acontecendo agora. Sem `nowLocal` (quem só
 * quer início/fim), `happeningNow` é false.
 */
export function occurrenceWindow(input: {
  /** Dia da ocorrência (YYYY-MM-DD). */
  date: string;
  time: string;
  endTime?: string | null;
  type: MassScheduleType | string;
  /** "Agora" no relógio de parede da comunidade (YYYY-MM-DDTHH:MM:SS). */
  nowLocal?: string | null;
  /** A ocorrência desta data está suspensa ("não haverá")? */
  cancelled?: boolean;
}): OccurrenceWindow {
  const time = normalizeHhmm(input.time);
  const start = `${input.date.slice(0, 10)}T${time}:00`;
  const end = isUsableEndTime(time, input.endTime)
    ? `${input.date.slice(0, 10)}T${normalizeHhmm(input.endTime)}:00`
    : shiftFloating(start, defaultDurationMin(input.type));
  return {
    start,
    end,
    happeningNow: input.nowLocal ? isHappeningNow(start, end, input.nowLocal, input.cancelled === true) : false,
  };
}

/** Campos da regra de recorrência de um horário fixo. */
export interface RecurrenceFields {
  isSpecial: boolean;
  specialDate: Date | string | null;
  recurrence?: string | null;
  dayOfWeek: number | null;
  dayOfMonth?: number | null;
  weeksOfMonth?: number[] | null;
}

/**
 * Dias (meia-noite UTC = dia de calendário) em que o horário acontece dentro
 * de [startDay, endDay]. Única fonte da regra de recorrência: usada na
 * expansão da agenda, na validação das datas suspensas e no "acontecendo agora".
 */
export function occurrenceDays(schedule: RecurrenceFields, startDay: Date, endDay: Date): Date[] {
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
 * "Acontecendo agora" de um horário listado SEM data (lista de horários da
 * comunidade, favoritos, Agenda Fixa): vale para a ocorrência de HOJE. Só é
 * true se hoje é dia de ocorrência pela recorrência (semanal, "1º sábado",
 * "todo dia 13", data especial), se hoje não está suspenso e se o relógio da
 * comunidade está entre o início e o fim.
 *
 * Também olha a ocorrência de ONTEM que passa da meia-noite (só acontece sem
 * `endTime`: 23:30 + duração padrão) — desde que ontem não esteja suspenso.
 */
export function scheduleHappeningNow(
  schedule: RecurrenceFields & { time: string; endTime?: string | null; type: MassScheduleType | string },
  nowLocal: string,
  /** Datas suspensas (YYYY-MM-DD) conhecidas deste horário. */
  cancelledDates: Iterable<string> = [],
): boolean {
  if (!HHMM_RE.test(normalizeHhmm(schedule.time))) return false;
  const cancelled = new Set(cancelledDates);
  const today = nowLocal.slice(0, 10);
  const todayUtc = new Date(`${today}T00:00:00.000Z`);
  const yesterdayUtc = new Date(todayUtc.getTime() - DAY_MS);
  for (const day of occurrenceDays(schedule, yesterdayUtc, todayUtc)) {
    const date = day.toISOString().slice(0, 10);
    const window = occurrenceWindow({
      date,
      time: schedule.time,
      endTime: schedule.endTime,
      type: schedule.type,
      nowLocal,
      cancelled: cancelled.has(date),
    });
    if (window.happeningNow) return true;
  }
  return false;
}
