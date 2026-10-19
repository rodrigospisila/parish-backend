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
 *
 * Registro de execução (JobRun, eng-qualidade-15 / contrato C6): todo job que
 * passa por aqui grava início, fim, status (RUNNING → OK/ERROR, ou SKIPPED),
 * itens e erro — o painel da plataforma mostra a última execução de cada um.
 */

/** Espera máxima por uma conexão do pool para abrir a transação da trava. */
const DEFAULT_LOCK_MAX_WAIT_MS = 5_000;
/** Tempo máximo de uma execução segurando a trava (o Prisma desfaz a transação depois). */
const DEFAULT_JOB_TIMEOUT_MS = 55 * 60 * 1000;
/** Tamanho máximo do erro gravado em JobRun.error. */
export const JOB_RUN_ERROR_MAX = 500;

type JobRunDelegate = {
  create: (args: any) => PromiseLike<any>;
  update: (args: any) => PromiseLike<any>;
  deleteMany?: (args: any) => PromiseLike<any>;
};

type LockClient = {
  $transaction: (fn: (tx: any) => Promise<any>, options?: { maxWait?: number; timeout?: number }) => Promise<any>;
  /** Tabela job_runs. Ausente (specs com client falso) = não registra. */
  jobRun?: JobRunDelegate;
};

/**
 * Como a execução fica registrada em JobRun:
 *  • `always` (padrão): RUNNING ao pegar a trava → OK/ERROR no fim; SKIPPED
 *    quando outra réplica tem a trava ou não houve conexão para abri-la;
 *  • `activity`: para jobs de alta frequência (worker da outbox a cada 15 s) —
 *    só grava quando houve trabalho (items > 0) ou erro, sem RUNNING/SKIPPED,
 *    para não encher a tabela com milhares de linhas vazias por dia;
 *  • `off`: não grava.
 * A gravação é best-effort: falha ao gravar o JobRun nunca derruba o job.
 */
export type JobRunRecordMode = 'always' | 'activity' | 'off';

export interface RunExclusiveJobOptions<T> {
  logger?: Logger;
  timeoutMs?: number;
  maxWaitMs?: number;
  record?: JobRunRecordMode;
  /** Itens processados a partir do resultado do job; padrão: countJobItems. */
  countItems?: (result: T) => number | null | undefined;
  /** Não registra no log a execução pulada porque outra réplica tem a trava. */
  quietSkip?: boolean;
}

/** Chave estável do job no espaço de advisory locks (hashtext no Postgres). */
export function scheduledJobLockKey(jobName: string): string {
  return `parish:job:${jobName}`;
}

/**
 * Itens processados (JobRun.items) a partir do que o job devolveu:
 * número → ele mesmo; objeto → o primeiro campo numérico entre `items`,
 * `count`, `processed`, `sent`, `done`; qualquer outra coisa (void, boolean)
 * → null. Para outro formato, passe `countItems` nas opções.
 */
export function countJobItems(result: unknown): number | null {
  if (typeof result === 'number' && Number.isFinite(result)) return Math.trunc(result);
  if (result && typeof result === 'object') {
    for (const key of ['items', 'count', 'processed', 'sent', 'done']) {
      const value = (result as Record<string, unknown>)[key];
      if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
    }
  }
  return null;
}

/**
 * Erro como vai para JobRun.error: sem dado pessoal e no máximo 500 caracteres.
 * Erro do Prisma (com `code`) guarda só o código e a última linha (a mensagem
 * completa traz o trecho da consulta); os demais, a primeira linha. E-mails,
 * números longos (telefone, CPF) e tokens de push são mascarados.
 */
export function sanitizeJobError(error: unknown): string {
  let text: string;
  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code;
    const lines = error.message
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    text =
      typeof code === 'string' && code
        ? `${code}: ${lines[lines.length - 1] ?? ''}`
        : `${error.name}: ${lines[0] ?? ''}`;
  } else {
    text = String(error);
  }
  return text
    .replace(/Expo(?:nent)?PushToken\[[^\]]*\]/g, '[token]')
    .replace(/[^\s@'"`<>(),;:]+@[^\s@'"`<>(),;:]+\.[A-Za-z]{2,}/g, '[e-mail]')
    .replace(/\+?\d[\d\s().\/-]{6,}\d/g, '[número]')
    .slice(0, JOB_RUN_ERROR_MAX);
}

async function safeRecord(client: LockClient, op: (jobRun: JobRunDelegate) => PromiseLike<any>, logger?: Logger) {
  if (!client.jobRun) return null;
  try {
    return await op(client.jobRun);
  } catch (error) {
    logger?.warn(`Falha ao gravar JobRun: ${sanitizeJobError(error)}`);
    return null;
  }
}

/** Expurgo do histórico de execuções (rotina diária). Devolve quantas linhas saíram. */
export async function purgeJobRuns(client: Pick<LockClient, 'jobRun'>, before: Date): Promise<number> {
  if (!client.jobRun?.deleteMany) return 0;
  const result = await client.jobRun.deleteMany({ where: { startedAt: { lt: before } } });
  return result?.count ?? 0;
}

/**
 * Roda `work` só se esta réplica conseguir a trava do job. Devolve o
 * resultado de `work`, ou null quando outra réplica já está executando ou
 * quando não deu para abrir a transação da trava (pool cheio/banco fora).
 * Erro do próprio `work` continua sendo lançado (e fica no JobRun como ERROR).
 */
export async function runExclusiveJob<T>(
  prisma: LockClient,
  jobName: string,
  work: () => Promise<T>,
  options: RunExclusiveJobOptions<T> = {},
): Promise<T | null> {
  const key = scheduledJobLockKey(jobName);
  const mode: JobRunRecordMode = options.record ?? 'always';
  const logger = options.logger;
  let started = false;
  let skipped = false;
  let finished = false;
  let result: T | null = null;
  let runStartedAt: Date | null = null;
  let runId: string | null = null;

  const recordSkipped = async (error: string | null) => {
    if (mode !== 'always') return;
    const now = new Date();
    await safeRecord(
      prisma,
      (jobRun) => jobRun.create({ data: { name: jobName, startedAt: now, finishedAt: now, status: 'SKIPPED', error } }),
      logger,
    );
  };

  const recordFinish = async (status: 'OK' | 'ERROR', items: number | null, error: string | null) => {
    if (mode === 'off') return;
    const startedAt = runStartedAt ?? new Date();
    const finishedAt = new Date();
    if (runId) {
      const id = runId;
      await safeRecord(prisma, (jobRun) => jobRun.update({ where: { id }, data: { status, finishedAt, items, error } }), logger);
      return;
    }
    // `activity`: execução vazia não vira linha
    if (mode === 'activity' && status === 'OK' && !(items && items > 0)) return;
    await safeRecord(
      prisma,
      (jobRun) => jobRun.create({ data: { name: jobName, startedAt, finishedAt, status, items, error } }),
      logger,
    );
  };

  const itemsOf = (value: T | null): number | null => {
    if (value === null || value === undefined) return null;
    try {
      const counted = options.countItems ? options.countItems(value) : countJobItems(value);
      return typeof counted === 'number' && Number.isFinite(counted) ? Math.trunc(counted) : null;
    } catch {
      return null;
    }
  };

  try {
    const value = await prisma.$transaction(
      async (tx) => {
        started = true;
        // ::text explícito no parâmetro: o bind do Prisma chega sem tipo e o
        // hashtext() precisa de text (mesmo cuidado dos locks da catequese)
        const rows: Array<{ locked: boolean }> =
          await tx.$queryRaw`SELECT pg_try_advisory_xact_lock(hashtext(${key}::text)) AS locked`;
        if (!rows?.[0]?.locked) {
          skipped = true;
          if (!options.quietSkip) {
            logger?.log(`Job ${jobName} já está rodando em outra instância; pulando esta execução`);
          }
          return null;
        }
        const startedAt = new Date();
        runStartedAt = startedAt;
        if (mode === 'always') {
          // Pelo client principal (fora da transação da trava): o RUNNING
          // aparece na hora e não some se a transação expirar
          const run = await safeRecord(
            prisma,
            (jobRun) => jobRun.create({ data: { name: jobName, startedAt, status: 'RUNNING' }, select: { id: true } }),
            logger,
          );
          runId = run?.id ?? null;
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
    if (skipped) {
      await recordSkipped(null);
      return null;
    }
    await recordFinish('OK', itemsOf(value), null);
    return value;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!started) {
      // Nem chegou a abrir a transação (sem conexão no maxWait): pula esta vez
      logger?.warn(`Job ${jobName}: sem conexão para a trava (${message}); pulando esta execução`);
      await recordSkipped('Sem conexão para a trava');
      return null;
    }
    if (finished) {
      // O trabalho terminou, mas a transação da trava expirou antes do commit
      logger?.warn(`Job ${jobName} passou do tempo da trava; resultado mantido (${message})`);
      await recordFinish('OK', itemsOf(result), null);
      return result;
    }
    await recordFinish('ERROR', null, sanitizeJobError(error));
    throw error;
  }
}
