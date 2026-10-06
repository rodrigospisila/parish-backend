import { BadRequestException } from '@nestjs/common';

/**
 * Datas CIVIS (só dia) da pastoral: conclusão de catequese, celebração de
 * sacramento, conclusão de formação. `new Date('AAAA-MM-DD')` é meia-noite
 * UTC — 21h da VÉSPERA no Brasil —, e o certificado formatado no fuso do
 * público saía com o dia anterior. Aqui o dia é ancorado ao meio-dia de
 * Brasília (-03 fixo desde 2019): cai no mesmo dia civil em qualquer fuso
 * brasileiro e também em UTC.
 */
export const PUBLIC_TZ = 'America/Sao_Paulo';

/** Hoje (AAAA-MM-DD) no fuso do público. */
export function todayCivil(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: PUBLIC_TZ }).format(now);
}

/** AAAA-MM-DD existente no calendário (rejeita 2026-02-30, 'abc'…) ou null. */
export function civilDayOrNull(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  const value = String(raw).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return null;
  return value;
}

/**
 * Data civil validada → Date ao meio-dia de Brasília. `label` entra na
 * mensagem de erro (400, nunca 500). Por padrão: entre 1900 e HOJE.
 */
export function parseCivilDate(
  raw: unknown,
  label: string,
  opts: { allowFuture?: boolean } = {},
): Date {
  const value = civilDayOrNull(raw);
  if (!value) throw new BadRequestException(`${label} inválida — use AAAA-MM-DD`);
  if (value < '1900-01-01') throw new BadRequestException(`${label} inválida (anterior a 1900)`);
  if (!opts.allowFuture && value > todayCivil()) {
    throw new BadRequestException(`${label} não pode ser futura`);
  }
  return civilDateAt(value);
}

/** AAAA-MM-DD (já validado) → meio-dia de Brasília. */
export function civilDateAt(day: string): Date {
  return new Date(`${day}T12:00:00-03:00`);
}

/**
 * Formata uma data civil (dd/mm/aaaa). Registros gravados antes da correção
 * ficaram em meia-noite UTC exata (o dia certo está em UTC); os demais são
 * lidos no fuso do público. Nenhum `new Date()` real cai em 00:00:00.000Z
 * cravado na prática, então a heurística não confunde datas com hora.
 */
export function formatCivilDate(date: Date): string {
  const legacyUtcMidnight =
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0;
  return date.toLocaleDateString('pt-BR', { timeZone: legacyUtcMidnight ? 'UTC' : PUBLIC_TZ });
}
