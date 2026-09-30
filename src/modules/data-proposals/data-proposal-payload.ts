import { BadRequestException } from '@nestjs/common';
import { DataProposalKind, MassRecurrence, MassScheduleType } from '@prisma/client';

/**
 * Regras do `payload` de cada tipo de proposta. Funções puras: o serviço as usa
 * tanto no payload carregado pelo script quanto no editado pelo aprovador — o
 * que vem do banco também não é confiável (a carga é feita por script).
 */

export const SCHEDULE_TYPES = Object.values(MassScheduleType);
export const RECURRENCES = Object.values(MassRecurrence);

export const NOTES_MAX = 500;
export const ADDRESS_MAX = 300;
export const NAME_MAX = 200;
export const WEBSITE_MAX = 500;

/** Campos de horário aceitos em SCHEDULE_CREATE/SCHEDULE_UPDATE. */
const SCHEDULE_FIELDS = ['type', 'dayOfWeek', 'time', 'recurrence', 'weeksOfMonth', 'dayOfMonth', 'notes'] as const;
/** SCHEDULE_RECURRENCE só mexe na regra de repetição (a hora e o tipo ficam). */
const RECURRENCE_FIELDS = ['recurrence', 'dayOfWeek', 'weeksOfMonth', 'dayOfMonth'] as const;

/** Campos permitidos no payload por tipo. */
export const ALLOWED_FIELDS: Record<DataProposalKind, readonly string[]> = {
  SCHEDULE_CREATE: SCHEDULE_FIELDS,
  SCHEDULE_UPDATE: SCHEDULE_FIELDS,
  SCHEDULE_DELETE: [],
  SCHEDULE_RECURRENCE: RECURRENCE_FIELDS,
  COMMUNITY_ADDRESS: ['address'],
  COMMUNITY_PARISH: ['parishId'],
  COMMUNITY_CREATE: ['name', 'address', 'city', 'state', 'zipCode'],
  COMMUNITY_WEBSITE: ['website'],
  PARISH_WEBSITE: ['website'],
};

/** O horário completo, como fica gravado em MassSchedule. */
export interface ScheduleFields {
  type: MassScheduleType;
  dayOfWeek: number | null;
  time: string;
  recurrence: MassRecurrence;
  weeksOfMonth: number[];
  dayOfMonth: number | null;
  notes: string | null;
}

export type SchedulePatch = Partial<ScheduleFields>;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);

/** Payload como objeto (nulo/ausente vira {}); array ou escalar é inválido. */
export function asPayloadObject(payload: unknown): Record<string, unknown> {
  if (payload == null) return {};
  if (!isObj(payload)) throw new BadRequestException('O payload da proposta deve ser um objeto');
  return payload;
}

/** Recusa campos que o tipo não usa — evita "aprovar" algo que nunca seria aplicado. */
export function assertAllowedFields(kind: DataProposalKind, payload: Record<string, unknown>) {
  const allowed = ALLOWED_FIELDS[kind];
  const extra = Object.keys(payload).filter((k) => !allowed.includes(k));
  if (extra.length) {
    throw new BadRequestException(`Campo não permitido em ${kind}: ${extra.join(', ')}`);
  }
}

/** "7:00" → "07:00"; recusa o que não é HH:MM de 00:00 a 23:59. */
export function normalizeTime(v: unknown): string {
  const m = typeof v === 'string' ? /^(\d{1,2}):(\d{2})$/.exec(v.trim()) : null;
  const h = m ? Number(m[1]) : NaN;
  const min = m ? Number(m[2]) : NaN;
  if (!m || h > 23 || min > 59) throw new BadRequestException('Hora inválida: use HH:MM (00:00 a 23:59)');
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/**
 * Confere os tipos de cada campo de horário presente (sem olhar a coerência
 * entre eles — isso é do `resolveSchedule`, depois de juntar com o atual).
 */
export function parseSchedulePatch(payload: Record<string, unknown>): SchedulePatch {
  const out: SchedulePatch = {};
  if ('type' in payload) {
    if (!SCHEDULE_TYPES.includes(payload.type as MassScheduleType)) {
      throw new BadRequestException(`Tipo de celebração inválido (${SCHEDULE_TYPES.join(', ')})`);
    }
    out.type = payload.type as MassScheduleType;
  }
  if ('time' in payload) out.time = normalizeTime(payload.time);
  if ('recurrence' in payload) {
    if (!RECURRENCES.includes(payload.recurrence as MassRecurrence)) {
      throw new BadRequestException(`Recorrência inválida (${RECURRENCES.join(', ')})`);
    }
    out.recurrence = payload.recurrence as MassRecurrence;
  }
  if ('dayOfWeek' in payload) {
    const d = payload.dayOfWeek;
    if (d !== null && !(isInt(d) && d >= 0 && d <= 6)) {
      throw new BadRequestException('Dia da semana inválido (0 = domingo a 6 = sábado)');
    }
    out.dayOfWeek = d as number | null;
  }
  if ('dayOfMonth' in payload) {
    const d = payload.dayOfMonth;
    if (d !== null && !(isInt(d) && d >= 1 && d <= 31)) {
      throw new BadRequestException('Dia do mês inválido (1 a 31)');
    }
    out.dayOfMonth = d as number | null;
  }
  if ('weeksOfMonth' in payload) {
    const w = payload.weeksOfMonth ?? [];
    if (!Array.isArray(w) || w.some((n) => !(isInt(n) && (n === -1 || (n >= 1 && n <= 5))))) {
      throw new BadRequestException('Semanas do mês inválidas: use 1 a 5, e -1 para a última');
    }
    out.weeksOfMonth = [...new Set(w as number[])].sort((a, b) => a - b);
  }
  if ('notes' in payload) {
    const n = payload.notes;
    if (n !== null && typeof n !== 'string') throw new BadRequestException('Observação inválida');
    const t = typeof n === 'string' ? n.trim() : '';
    if (t.length > NOTES_MAX) throw new BadRequestException(`Observação longa demais (até ${NOTES_MAX} caracteres)`);
    out.notes = t || null;
  }
  return out;
}

/**
 * Junta o que muda com o horário atual (se houver) e confere a coerência da
 * recorrência — as mesmas regras do CHECK "mass_schedules_recurrence_check" e
 * do MassSchedulesService, com mensagem em português. Limpa o que não pertence
 * ao tipo escolhido (trocar WEEKLY por MONTHLY_DAY zera o dia da semana).
 */
export function resolveSchedule(patch: SchedulePatch, base?: ScheduleFields | null): ScheduleFields {
  const type = patch.type ?? base?.type;
  const time = patch.time ?? base?.time;
  if (!type) throw new BadRequestException('Informe o tipo de celebração');
  if (!time) throw new BadRequestException('Informe a hora (HH:MM)');

  const recurrence = patch.recurrence ?? base?.recurrence ?? MassRecurrence.WEEKLY;
  const dayOfWeek = patch.dayOfWeek !== undefined ? patch.dayOfWeek : base?.dayOfWeek ?? null;
  const dayOfMonth = patch.dayOfMonth !== undefined ? patch.dayOfMonth : base?.dayOfMonth ?? null;
  const weeks = patch.weeksOfMonth !== undefined ? patch.weeksOfMonth : base?.weeksOfMonth ?? [];
  const notes = patch.notes !== undefined ? patch.notes : base?.notes ?? null;

  if (recurrence === MassRecurrence.MONTHLY_DAY) {
    if (dayOfMonth == null) throw new BadRequestException('Informe o dia do mês (1 a 31) para um horário de data fixa');
    return { type, time, recurrence, dayOfWeek: null, dayOfMonth, weeksOfMonth: [], notes };
  }
  if (dayOfWeek == null) throw new BadRequestException('Informe o dia da semana');
  if (recurrence === MassRecurrence.MONTHLY_NTH) {
    if (!weeks.length) {
      throw new BadRequestException('Escolha quais ocorrências do mês (1ª a 5ª, ou a última) para um horário mensal');
    }
    return { type, time, recurrence, dayOfWeek, dayOfMonth: null, weeksOfMonth: [...weeks].sort((a, b) => a - b), notes };
  }
  return { type, time, recurrence: MassRecurrence.WEEKLY, dayOfWeek, dayOfMonth: null, weeksOfMonth: [], notes };
}

/** Texto obrigatório, aparado, com tamanho mínimo/máximo. */
export function requiredText(v: unknown, label: string, max: number, min = 2): string {
  const t = typeof v === 'string' ? v.trim() : '';
  if (t.length < min) throw new BadRequestException(`Informe ${label}`);
  if (t.length > max) throw new BadRequestException(`${label[0].toUpperCase()}${label.slice(1)} longo demais (até ${max} caracteres)`);
  return t;
}

/** Site: URL http(s) ou nulo (apagar site errado). O campo precisa vir explícito. */
export function parseWebsite(payload: Record<string, unknown>): string | null {
  if (!('website' in payload)) throw new BadRequestException('Informe o site (ou null para apagar)');
  const v = payload.website;
  if (v === null) return null;
  const t = typeof v === 'string' ? v.trim() : '';
  if (!t) return null;
  if (t.length > WEBSITE_MAX) throw new BadRequestException(`Site longo demais (até ${WEBSITE_MAX} caracteres)`);
  let url: URL;
  try {
    url = new URL(t);
  } catch {
    throw new BadRequestException('Site inválido: use um endereço http(s)://');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new BadRequestException('Site inválido: use um endereço http(s)://');
  }
  return t;
}

/** UF com duas letras maiúsculas. */
export function parseState(v: unknown): string {
  const t = typeof v === 'string' ? v.trim().toUpperCase() : '';
  if (!/^[A-Z]{2}$/.test(t)) throw new BadRequestException('UF inválida (duas letras, ex.: PR)');
  return t;
}

/** Proposta que não dá para aprovar sem o aprovador informar o dado certo. */
export function needsEdit(kind: DataProposalKind, payload: unknown): boolean {
  if (kind === DataProposalKind.SCHEDULE_RECURRENCE) return payload == null;
  if (kind === DataProposalKind.SCHEDULE_UPDATE) return !isObj(payload) || Object.keys(payload).length === 0;
  return false;
}

/** Comparação de valores do `current` com o dado atual (arrays de número sem ordem; ausente = nulo). */
export function sameValue(a: unknown, b: unknown): boolean {
  const norm = (v: unknown): unknown => {
    if (v === undefined) return null;
    if (Array.isArray(v)) return [...v].map(norm).sort((x, y) => String(x).localeCompare(String(y)));
    if (v instanceof Date) return v.toISOString();
    if (typeof v === 'string') return v.trim();
    return v;
  };
  return JSON.stringify(norm(a)) === JSON.stringify(norm(b));
}

/**
 * O `current` gravado na proposta ainda bate com o dado de hoje? Só as chaves
 * presentes no `current` contam (o `id` é o próprio alvo e é ignorado).
 */
export function currentMatches(current: unknown, actual: Record<string, unknown>): boolean {
  if (!isObj(current)) return true;
  return Object.entries(current).every(([k, v]) => k === 'id' || sameValue(v, actual[k]));
}
