import { Logger } from '@nestjs/common';

/**
 * Trava distribuída das rotinas agendadas (@Cron) — auditoria M45.
 *
 * Com 2 réplicas, ou na sobreposição de containers durante um deploy, o
 * mesmo cron dispara em dois processos. Cada execução pega um advisory lock
 * do Postgres por job (pg_try_advisory_xact_lock): quem não consegue a trava
 * desiste na hora, sem esperar. A trava é de TRANSAÇÃO porque o Prisma usa
 * pool de conexões — um lock de sessão poderia ser liberado em outra conexão.
 * A transação só segura a trava; o trabalho roda fora dela (cada escrita
 * confirma sozinha), então quem chamar ainda precisa do "claim" atômico
 * (updateMany ... WHERE sentAt IS NULL) para o caso de as execuções não se
 * sobreporem no tempo (o segundo container dispara depois que o primeiro
 * terminou).
 */

/** Tempo máximo de uma execução segurando a trava (o Prisma desfaz a transação depois). */
const DEFAULT_JOB_TIMEOUT_MS = 15 * 60 * 1000;

type LockClient = {
  $transaction: (fn: (tx: any) => Promise<any>, options?: { maxWait?: number; timeout?: number }) => Promise<any>;
};

/** Chave estável do job no espaço de advisory locks (hashtext no Postgres). */
export function scheduledJobLockKey(jobName: string): string {
  return `parish:job:${jobName}`;
}

/**
 * Roda `work` só se esta réplica conseguir a trava do job. Devolve o
 * resultado de `work`, ou null quando outra réplica já está executando.
 */
export async function runExclusiveJob<T>(
  prisma: LockClient,
  jobName: string,
  work: () => Promise<T>,
  options: { logger?: Logger; timeoutMs?: number } = {},
): Promise<T | null> {
  const key = scheduledJobLockKey(jobName);
  return prisma.$transaction(
    async (tx) => {
      // ::text explícito no parâmetro: o bind do Prisma chega sem tipo e o
      // hashtext() precisa de text (mesmo cuidado dos locks da catequese)
      const rows: Array<{ locked: boolean }> =
        await tx.$queryRaw`SELECT pg_try_advisory_xact_lock(hashtext(${key}::text)) AS locked`;
      if (!rows?.[0]?.locked) {
        options.logger?.log(`Job ${jobName} já está rodando em outra instância; pulando esta execução`);
        return null;
      }
      return work();
    },
    { maxWait: 10_000, timeout: options.timeoutMs ?? DEFAULT_JOB_TIMEOUT_MS },
  );
}
