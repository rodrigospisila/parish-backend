import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/**
 * Paginação e busca SEM ACENTO das listas de gestão (GET /communities e
 * GET /parishes — contrato 4 da Onda 0). Só quando `page` vem a resposta muda
 * para `{ items, total, page, pageSize }`; sem `page`, a lista de sempre.
 */
export const LIST_PAGE_SIZE_DEFAULT = 20;
export const LIST_PAGE_SIZE_MAX = 100;
const SEARCH_MAX = 80;

export interface ListPaging {
  page: number;
  pageSize: number;
  skip: number;
  /** Termo já dobrado (minúsculo, sem acento) — vazio = sem busca */
  search: string;
}

export interface ListPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Sem `page` → `null` (lista inteira, comportamento antigo). Lixo → 400. */
export function parsePaging(page?: string, pageSize?: string, search?: string): ListPaging | null {
  if (page == null || String(page).trim() === '') return null;
  const p = Number(page);
  if (!Number.isInteger(p) || p < 1) throw new BadRequestException('Parâmetro page inválido: use um inteiro a partir de 1');
  let size = LIST_PAGE_SIZE_DEFAULT;
  if (pageSize != null && String(pageSize).trim() !== '') {
    size = Number(pageSize);
    if (!Number.isInteger(size) || size < 1) {
      throw new BadRequestException('Parâmetro pageSize inválido: use um inteiro a partir de 1');
    }
    size = Math.min(size, LIST_PAGE_SIZE_MAX);
  }
  return { page: p, pageSize: size, skip: (p - 1) * size, search: foldSearch(search) };
}

/** Minúsculo, sem acento, espaços colapsados ("  São  José " → "sao jose"). */
export function foldSearch(text?: string | null): string {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, SEARCH_MAX);
}

// Sem a extensão unaccent no banco: translate() cobre as letras do português
const ACCENTED = 'áàâãäåéèêëíìîïóòôõöúùûüçñ';
const PLAIN = 'aaaaaaeeeeiiiiooooouuuucn';

/** Coluna dobrada no SQL (minúscula e sem acento), comparável com foldSearch. */
export function foldedColumn(column: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`translate(lower(${column}), ${ACCENTED}, ${PLAIN})`;
}

/** `%termo%` com os curingas do LIKE escapados (o termo é parâmetro, nunca SQL). */
export function likePattern(folded: string): string {
  return `%${folded.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/** Reordena as linhas na ordem dos ids da página (o findMany por `in` não garante ordem). */
export function inIdOrder<T extends { id: string }>(ids: string[], rows: T[]): T[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.map((id) => byId.get(id)).filter((row): row is T => !!row);
}
