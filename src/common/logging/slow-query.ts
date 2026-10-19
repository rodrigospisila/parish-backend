/**
 * Consulta lenta do Prisma (eng-qualidade-15, contrato C6): acima do limite
 * (`PRISMA_SLOW_QUERY_MS`, padrão 500 ms; `0` desliga) vira aviso no log.
 * O evento `query` do Prisma traz o SQL com marcadores ($1, $2...) e os
 * parâmetros À PARTE — só o SQL entra no aviso (primeiros 120 caracteres,
 * espaços colapsados). Os parâmetros (que podem ser nome, CPF, telefone)
 * NUNCA são registrados.
 */
export const DEFAULT_SLOW_QUERY_MS = 500;
export const SLOW_QUERY_SQL_CHARS = 120;

export function slowQueryThresholdMs(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.PRISMA_SLOW_QUERY_MS;
  if (raw === undefined || raw.trim() === '') return DEFAULT_SLOW_QUERY_MS;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_SLOW_QUERY_MS;
}

/** Texto do aviso: duração + início do SQL (sem parâmetros). */
export function describeSlowQuery(event: { query: string; duration: number; target?: string }): string {
  const sql = String(event.query ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, SLOW_QUERY_SQL_CHARS);
  return `Consulta lenta (${Math.round(event.duration)} ms): ${sql}`;
}
