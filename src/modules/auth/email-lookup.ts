import { Prisma } from '@prisma/client';

/**
 * E-mail de conta (User.email) sem diferença de maiúsculas/minúsculas.
 *
 * Contas antigas podem ter sido gravadas com maiúscula ("Maria@Gmail.com");
 * daqui para frente o cadastro grava em minúsculas, mas o banco NÃO foi
 * reescrito — por isso toda busca de conta por e-mail é insensitive e, se
 * houver mais de uma conta que difere só na caixa, a escolha é determinística
 * (ver `pickEmailMatch`).
 */

/** Forma gravada daqui para frente: sem espaços nas pontas e em minúsculas. */
export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

/** Filtro Prisma que casa o e-mail ignorando a caixa. */
export const emailInsensitive = (email: string): Prisma.StringFilter => ({
  equals: email.trim(),
  mode: 'insensitive',
});

/**
 * Escolhe, entre as contas encontradas pela busca insensitive, a certa:
 * 1) a com o e-mail exatamente como digitado; 2) a gravada em minúsculas;
 * 3) a primeira da lista (quem chama ordena por createdAt asc = a mais antiga).
 * Descarta o que não for igual ignorando a caixa (defesa caso o banco trate
 * `_`/`%` como curinga numa comparação ILIKE).
 */
export function pickEmailMatch<T extends { email: string }>(candidates: T[], typed: string): T | null {
  const exact = typed.trim();
  const lower = exact.toLowerCase();
  const same = candidates.filter((candidate) => candidate.email.toLowerCase() === lower);
  return (
    same.find((candidate) => candidate.email === exact) ??
    same.find((candidate) => candidate.email === lower) ??
    same[0] ??
    null
  );
}
