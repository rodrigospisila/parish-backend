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
 *
 * Custos e limites (R3#52), todos explícitos:
 *  • a transação segura UMA conexão do pool durante o job inteiro — por isso
 *    os crons ficam em horários diferentes e cada um ocupa no máximo uma;
 *  • maxWait (padrão 5 s): sem conexão livre nesse tempo (pool cheio, banco
 *    fora) a execução é PULADA com aviso no log, sem lançar — o próximo
 *    disparo do cron tenta de novo e os claims atômicos evitam o dobro;
 *  • timeout (padrão 55 min): maior que o job mais longo de hoje (lembretes
 *    e expurgos levam segundos a poucos minutos) e menor que o intervalo do
 *    cron horário. Se estourar, o Prisma encerra a transação e a trava se
 *    solta antes do fim — o trabalho já feito vale (devolvemos o resultado e
 *    registramos o aviso), e o claim atômico segura a outra réplica.
 * Job mais longo que isso: passe timeoutMs maior em vez de mudar o padrão.
 */

/** Espera máxima por uma conexão do pool para abrir a transação da trava. */
const DEFAULT_LOCK_MAX_WAIT_MS = 5_000;
/** Tempo máximo de uma execução segurando a trava (o Prisma desfaz a transação depois). */
const DEFAULT_JOB_TIMEOUT_MS = 55 * 60 * 1000;

type LockClient = {
  $transaction: (fn: (tx: any) => Promise<any>, options?: { maxWait?: number; timeout?: number }) => Promise<any>;
};

/** Chave estável do job no espaço de advisory locks (hashtext no Postgres). */
export function scheduledJobLockKey(jobName: string): string {
  return `parish:job:${jobName}`;
}

/**
 * Roda `work` só se esta réplica conseguir a trava do job. Devolve o
 * resultado de `work`, ou null quando outra réplica já está executando ou
 * quando não deu para abrir a transação da trava (pool cheio/banco fora).
 * Erro do próprio `work` continua sendo lançado.
 */
export async function runExclusiveJob<T>(
  prisma: LockClient,
  jobName: string,
  work: () => Promise<T>,
  options: { logger?: Logger; timeoutMs?: number; maxWaitMs?: number } = {},
): Promise<T | null> {
  const key = scheduledJobLockKey(jobName);
  let started = false;
  let finished = false;
  let result: T | null = null;
  try {
    return await prisma.$transaction(
      async (tx) => {
        started = true;
        // ::text explícito no parâmetro: o bind do Prisma chega sem tipo e o
        // hashtext() precisa de text (mesmo cuidado dos locks da catequese)
        const rows: Array<{ locked: boolean }> =
          await tx.$queryRaw`SELECT pg_try_advisory_xact_lock(hashtext(${key}::text)) AS locked`;
        if (!rows?.[0]?.locked) {
          options.logger?.log(`Job ${jobName} já está rodando em outra instância; pulando esta execução`);
          return null;
        }
        result = await work();
        finished = true;
        return result;
      },
      {
        maxWait: options.maxWaitMs ?? DEFAULT_LOCK_MAX_WAIT_MS,
        timeout: options.timeoutMs ?? DEFAULT_JOB_TIMEOUT_MS,
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!started) {
      // Nem chegou a abrir a transação (sem conexão no maxWait): pula esta vez
      options.logger?.warn(`Job ${jobName}: sem conexão para a trava (${message}); pulando esta execução`);
      return null;
    }
    if (finished) {
      // O trabalho terminou, mas a transação da trava expirou antes do commit
      options.logger?.warn(`Job ${jobName} passou do tempo da trava; resultado mantido (${message})`);
      return result;
    }
    throw error;
  }
}
