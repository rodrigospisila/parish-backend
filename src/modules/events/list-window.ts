import { BadRequestException } from '@nestjs/common';

/**
 * Janela de datas e paginação das listas que crescem toda semana
 * (eng-qualidade-05, contrato C6) — GET /events e GET /schedules.
 *
 *  • `from` / `to` (ISO): filtro aplicado NO BANCO (Event.startDate,
 *    Schedule.date — ambos com índice). Data sem hora no `to`
 *    ("2026-10-31") vale o dia inteiro: vira "< 2026-11-01T00:00Z".
 *  • `page` (1, 2, ...) e `pageSize` (padrão 50, máx. 200): só com `page` a
 *    resposta muda para `{ items, total, page, pageSize }`.
 *  • Sem nenhum desses parâmetros a resposta é exatamente a de antes (lista).
 */
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

export interface DateWindow {
  /** Inclusivo. */
  from?: Date;
  /** Exclusivo quando `toExclusive`, senão inclusivo. */
  to?: Date;
  toExclusive?: boolean;
}

export interface PageRequest {
  page: number;
  pageSize: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(raw: string, field: string): Date {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`Parâmetro "${field}" inválido: use uma data ISO (ex.: 2026-10-31).`);
  }
  return date;
}

/** Lê `from`/`to` da query. Lança 400 em data inválida ou `from` depois de `to`. */
export function parseDateWindow(from?: string, to?: string): DateWindow | undefined {
  const fromRaw = typeof from === 'string' ? from.trim() : '';
  const toRaw = typeof to === 'string' ? to.trim() : '';
  if (!fromRaw && !toRaw) return undefined;
  const window: DateWindow = {};
  if (fromRaw) window.from = parseDate(fromRaw, 'from');
  if (toRaw) {
    const parsed = parseDate(toRaw, 'to');
    if (DATE_ONLY.test(toRaw)) {
      // Dia inteiro: até o início do dia seguinte (exclusivo)
      window.to = new Date(parsed.getTime() + 24 * 60 * 60 * 1000);
      window.toExclusive = true;
    } else {
      window.to = parsed;
    }
  }
  if (window.from && window.to && window.from.getTime() > window.to.getTime()) {
    throw new BadRequestException('O parâmetro "from" deve ser anterior ao "to".');
  }
  return window;
}

/** Lê `page`/`pageSize`. Sem `page` → undefined (resposta em lista, como antes). */
export function parsePageRequest(page?: string, pageSize?: string): PageRequest | undefined {
  const pageRaw = typeof page === 'string' ? page.trim() : '';
  if (!pageRaw) return undefined;
  const pageNumber = Number(pageRaw);
  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    throw new BadRequestException('Parâmetro "page" inválido: use um número inteiro a partir de 1.');
  }
  const sizeRaw = typeof pageSize === 'string' ? pageSize.trim() : '';
  let size = DEFAULT_PAGE_SIZE;
  if (sizeRaw) {
    size = Number(sizeRaw);
    if (!Number.isInteger(size) || size < 1 || size > MAX_PAGE_SIZE) {
      throw new BadRequestException(`Parâmetro "pageSize" inválido: de 1 a ${MAX_PAGE_SIZE}.`);
    }
  }
  return { page: pageNumber, pageSize: size };
}

/** Condição Prisma do campo de data para a janela (ou undefined sem janela). */
export function dateWindowFilter(window?: DateWindow): { gte?: Date; lte?: Date; lt?: Date } | undefined {
  if (!window || (!window.from && !window.to)) return undefined;
  const filter: { gte?: Date; lte?: Date; lt?: Date } = {};
  if (window.from) filter.gte = window.from;
  if (window.to) {
    if (window.toExclusive) filter.lt = window.to;
    else filter.lte = window.to;
  }
  return filter;
}

/** skip/take do Prisma para a página. */
export function pageArgs(page: PageRequest): { skip: number; take: number } {
  return { skip: (page.page - 1) * page.pageSize, take: page.pageSize };
}
