import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { purgeJobRuns, runExclusiveJob } from '../../common/scheduled-job-lock';
import { DEFAULT_PARISH_TIME_ZONE } from '../../common/schedule-time';
import { NotificationsService } from './notifications.service';
import {
  EXPO_BATCH_LIMIT,
  EXPO_RECEIPTS_LIMIT,
  PUSH_FOREIGN_PROJECT_ERROR,
  PushDispatcherService,
  PushMessage,
  PushTicket,
} from './push-dispatcher.service';
import { readOutboxData } from './push-outbox.data';

/** Linhas PENDING pegas por rodada do worker. */
export const OUTBOX_CLAIM_LIMIT = 500;
/** Tentativas de envio de uma linha (a 5ª falha vira FAILED e segue a cadeia e-mail/SMS). */
export const OUTBOX_MAX_ATTEMPTS = 5;
/** Lotes de 100 enviados ao Expo ao mesmo tempo. */
export const OUTBOX_SEND_CONCURRENCY = 3;
/** Fallbacks (e-mail/SMS) ao mesmo tempo depois de um push que falhou de vez. */
export const OUTBOX_FALLBACK_CONCURRENCY = 5;
/** O Expo recomenda conferir os recibos ~15 min depois do envio. */
export const OUTBOX_RECEIPT_DELAY_MS = 15 * 60 * 1000;
/** O Expo apaga os recibos depois de ~24 h: sem recibo até lá, encerra a conferência. */
export const OUTBOX_RECEIPT_GIVE_UP_MS = 24 * 60 * 60 * 1000;
/** Linha presa em SENDING (processo caiu no meio do envio) volta para a fila depois disso. */
export const OUTBOX_SENDING_LEASE_MS = 10 * 60 * 1000;
/** Recibos consultados no máximo uma vez por minuto (o worker roda a cada 15 s). */
const RECEIPTS_EVERY_MS = 60 * 1000;
/** Linhas SENT/FAILED ficam 30 dias (trilha de entrega, eng-qualidade-18); JobRun, 90. */
export const OUTBOX_RETENTION_DAYS = 30;
export const JOB_RUN_RETENTION_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Erros do ticket que valem nova tentativa (o resto é definitivo). */
const RETRYABLE_TICKET_ERRORS = new Set(['MessageRateExceeded']);
/** Recusas que provam que o token nunca vai funcionar aqui: o token sai da conta. */
const DEAD_TOKEN_ERRORS = new Set(['DeviceNotRegistered', PUSH_FOREIGN_PROJECT_ERROR]);
/** Formato de token do Expo; outro texto nem vai ao Expo (derrubaria o lote — S1). */
export const EXPO_PUSH_TOKEN_PATTERN = /^Expo(nent)?PushToken\[[^\]]+\]$/;
/** Token gravado fora do formato do Expo. */
export const OUTBOX_INVALID_TOKEN_ERROR = 'TOKEN_INVALIDO';
/**
 * lastError da linha cujo envio estourou o tempo (S4): FAILED sem reenvio e
 * sem fallback, com sentAt marcado — "saiu, entrega não confirmada".
 */
export const OUTBOX_UNCERTAIN_ERROR = 'INCERTO_TIMEOUT';

/** Espera antes da próxima tentativa: 30 s, 1 min, 2 min, 4 min (teto 30 min). */
export function outboxBackoffMs(attempts: number): number {
  return Math.min(30_000 * 2 ** Math.max(0, attempts - 1), 30 * 60 * 1000);
}

export interface OutboxRunResult {
  claimed: number;
  sent: number;
  retried: number;
  failed: number;
  receipts: number;
  processed: number;
}

type ClaimedRow = {
  id: string;
  userId: string;
  notificationId: string | null;
  title: string;
  body: string;
  data: unknown;
  attempts: number;
};

type FinalFailure = { row: ClaimedRow; error: string };

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let index = 0; index < items.length; index += size) out.push(items.slice(index, index + size));
  return out;
}

/**
 * Worker da outbox de push (eng-qualidade-02, contrato C6).
 *
 * A requisição só grava (NotificationsService.notifyUser → NotificationOutbox);
 * este worker, no próprio processo, a cada 15 s e com a trava distribuída
 * (runExclusiveJob — uma réplica por vez):
 *  1. devolve à fila linhas presas em SENDING há mais de 10 min (processo caiu);
 *  2. pega até 500 PENDING com availableAt <= agora e as marca SENDING com
 *     gravação condicional (updateMany ... WHERE status = PENDING) — o
 *     `availableAt` vira o instante do "claim" e identifica o lote desta rodada;
 *  3. envia ao Expo em lotes de 100 (3 lotes por vez, timeout de 10 s cada);
 *  4. ticket ok → SENT + ticketId e a Notification marcada como entregue;
 *     falha de rede/HTTP/MessageRateExceeded → PENDING com espera crescente
 *     (attempts; na 5ª, FAILED); recusa definitiva (DeviceNotRegistered etc.)
 *     → FAILED; DeviceNotRegistered também tira o token da conta. Falha
 *     definitiva segue a cadeia antiga (e-mail → SMS, sem SMS em aviso em massa),
 *     salvo aviso gravado com `skipFallback` (o fluxo já mandou o e-mail, S2).
 *     Recusa do pedido inteiro por UMA mensagem (token de outro projeto Expo,
 *     S1) é isolada pelo dispatcher na mesma rodada: só a culpada falha;
 *     token fora do formato do Expo nem é enviado (TOKEN_INVALIDO, sai da conta);
 *  4b. TIMEOUT (S4): o Expo pode ter aceitado o lote e a API não tem chave de
 *     idempotência nem consulta por mensagem — reenviar duplicaria o push. A
 *     linha vira FAILED `INCERTO_TIMEOUT` com sentAt (saiu, sem confirmação),
 *     sem reenvio e sem e-mail; a notificação in-app continua no histórico.
 *     Falha de rede ao conectar e HTTP 5xx/429 seguem com nova tentativa;
 *  5. ~15 min depois do envio confere os recibos (getReceipts): erro vira
 *     FAILED com o motivo e DeviceNotRegistered limpa o User.pushToken — só se
 *     o aparelho não registrou token de novo depois do envio.
 * A tabela é a trilha de entrega do push (eng-qualidade-18): status, tentativas,
 * erro, ticket e recibo por notificação.
 *
 * `PUSH_OUTBOX_WORKER=off` desliga o worker neste processo (as linhas esperam).
 */
@Injectable()
export class PushOutboxService {
  private readonly logger = new Logger(PushOutboxService.name);
  private running = false;
  private lastReceiptsAt = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly pushDispatcher: PushDispatcherService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private get enabled(): boolean {
    return (process.env.PUSH_OUTBOX_WORKER ?? '').trim().toLowerCase() !== 'off';
  }

  @Cron('*/15 * * * * *', { name: 'push-outbox' })
  async tick(): Promise<OutboxRunResult | null> {
    // Uma rodada por vez neste processo (a anterior pode passar de 15 s)
    if (!this.enabled || this.running) return null;
    this.running = true;
    try {
      return await runExclusiveJob(this.prisma, 'push-outbox', () => this.processOnce(new Date()), {
        logger: this.logger,
        record: 'activity',
        quietSkip: true,
        timeoutMs: 10 * 60 * 1000,
        countItems: (result) => result.processed,
      });
    } catch (error) {
      this.logger.warn(`Worker da outbox de push falhou: ${String(error)}`);
      return null;
    } finally {
      this.running = false;
    }
  }

  /** Expurgo diário da trilha antiga (outbox SENT/FAILED) e do histórico de jobs. */
  @Cron('15 4 * * *', { name: 'outbox-purge', timeZone: DEFAULT_PARISH_TIME_ZONE })
  async purge() {
    return runExclusiveJob(
      this.prisma,
      'outbox-purge',
      async () => {
        const now = Date.now();
        const outbox = await this.prisma.notificationOutbox.deleteMany({
          where: { status: { in: ['SENT', 'FAILED'] }, createdAt: { lt: new Date(now - OUTBOX_RETENTION_DAYS * DAY_MS) } },
        });
        const jobRuns = await purgeJobRuns(this.prisma, new Date(now - JOB_RUN_RETENTION_DAYS * DAY_MS));
        return { count: outbox.count + jobRuns };
      },
      { logger: this.logger },
    );
  }

  /** Uma rodada completa (exposta para os testes e para o tick). */
  async processOnce(now: Date): Promise<OutboxRunResult> {
    await this.releaseStuck(now);
    const send = await this.sendPending(now);
    let receipts = 0;
    if (now.getTime() - this.lastReceiptsAt >= RECEIPTS_EVERY_MS) {
      this.lastReceiptsAt = now.getTime();
      receipts = await this.checkReceipts(now);
    }
    return { ...send, receipts, processed: send.sent + send.retried + send.failed + receipts };
  }

  /** SENDING há mais que o lease: o processo caiu no meio — volta para a fila (ou FAILED se esgotou). */
  async releaseStuck(now: Date) {
    const cutoff = new Date(now.getTime() - OUTBOX_SENDING_LEASE_MS);
    await this.prisma.notificationOutbox.updateMany({
      where: { status: 'SENDING', availableAt: { lt: cutoff }, attempts: { gte: OUTBOX_MAX_ATTEMPTS } },
      data: { status: 'FAILED', lastError: 'SENDING_EXPIRED' },
    });
    await this.prisma.notificationOutbox.updateMany({
      where: { status: 'SENDING', availableAt: { lt: cutoff } },
      data: { status: 'PENDING', availableAt: now, lastError: 'SENDING_EXPIRED' },
    });
  }

  /** Pega o lote (claim condicional) e envia. */
  async sendPending(now: Date): Promise<Omit<OutboxRunResult, 'receipts' | 'processed'>> {
    const empty = { claimed: 0, sent: 0, retried: 0, failed: 0 };
    const candidates = await this.prisma.notificationOutbox.findMany({
      where: { status: 'PENDING', channel: 'PUSH', availableAt: { lte: now } },
      select: { id: true },
      orderBy: { availableAt: 'asc' },
      take: OUTBOX_CLAIM_LIMIT,
    });
    if (candidates.length === 0) return empty;

    // Gravação condicional: só vira SENDING o que ainda está PENDING. O
    // availableAt recebe o instante do claim (lease) e marca as linhas DESTA rodada.
    const claimAt = new Date(now.getTime());
    const ids = candidates.map((row) => row.id);
    const claim = await this.prisma.notificationOutbox.updateMany({
      where: { id: { in: ids }, status: 'PENDING' },
      data: { status: 'SENDING', availableAt: claimAt, attempts: { increment: 1 } },
    });
    if (claim.count === 0) return empty;

    const rows: ClaimedRow[] = await this.prisma.notificationOutbox.findMany({
      where: { id: { in: ids }, status: 'SENDING', availableAt: claimAt },
      select: { id: true, userId: true, notificationId: true, title: true, body: true, data: true, attempts: true },
    });
    if (rows.length === 0) return empty;

    // Token lido na hora do envio (o aparelho pode ter trocado desde o enfileiramento)
    const users = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(rows.map((row) => row.userId))] } },
      select: { id: true, pushToken: true },
    });
    const tokenOf = new Map(users.map((user) => [user.id, user.pushToken]));

    const sendable: Array<{ row: ClaimedRow; message: PushMessage }> = [];
    const finalFailures: FinalFailure[] = [];
    const deadTokens: Array<{ userId: string; token: string }> = [];
    for (const row of rows) {
      const token = tokenOf.get(row.userId);
      if (!token) {
        // Saiu do app (logout) ou o token morreu depois de enfileirar: segue a cadeia
        finalFailures.push({ row, error: 'NO_TOKEN' });
        continue;
      }
      if (!EXPO_PUSH_TOKEN_PATTERN.test(token)) {
        // Texto que não é token do Expo: não vai no lote (derrubaria os vizinhos) e sai da conta
        finalFailures.push({ row, error: OUTBOX_INVALID_TOKEN_ERROR });
        deadTokens.push({ userId: row.userId, token });
        continue;
      }
      const { payload } = readOutboxData(row.data);
      sendable.push({ row, message: { to: token, title: row.title, body: row.body, data: payload } });
    }

    const batches = chunk(sendable, EXPO_BATCH_LIMIT);
    const ticketsPerBatch = await mapWithConcurrency(batches, OUTBOX_SEND_CONCURRENCY, (batch) =>
      this.pushDispatcher.sendBatch(batch.map((item) => item.message)),
    );

    const sent: Array<{ row: ClaimedRow; ticketId: string | null }> = [];
    const retries: Array<{ row: ClaimedRow; error: string }> = [];
    const uncertain: ClaimedRow[] = [];
    batches.forEach((batch, batchIndex) => {
      batch.forEach((item, index) => {
        const ticket: PushTicket = ticketsPerBatch[batchIndex][index] ?? { status: 'retry', error: 'SEM_TICKET' };
        if (ticket.status === 'ok') {
          sent.push({ row: item.row, ticketId: ticket.ticketId });
        } else if (ticket.status === 'uncertain') {
          // S4: pode ter chegado — não reenvia nem manda e-mail
          uncertain.push(item.row);
        } else if (ticket.status === 'retry' || RETRYABLE_TICKET_ERRORS.has(ticket.error)) {
          if (item.row.attempts >= OUTBOX_MAX_ATTEMPTS) finalFailures.push({ row: item.row, error: ticket.error });
          else retries.push({ row: item.row, error: ticket.error });
        } else {
          if (DEAD_TOKEN_ERRORS.has(ticket.error)) deadTokens.push({ userId: item.row.userId, token: item.message.to });
          finalFailures.push({ row: item.row, error: ticket.error });
        }
      });
    });

    await this.recordSent(sent, now);
    await this.recordRetries(retries, now);
    await this.recordFailures(finalFailures);
    await this.recordUncertain(uncertain, now);

    // Token morto (B44): sai da conta — só se ainda for o mesmo token
    for (const dead of deadTokens) {
      await this.prisma.user
        .updateMany({
          where: { id: dead.userId, pushToken: dead.token },
          data: { pushToken: null, pushTokenUpdatedAt: new Date() },
        })
        .catch(() => undefined);
    }

    // Cadeia antiga depois do push que falhou de vez: e-mail → SMS (sem SMS em massa)
    // Aviso com skipFallback (S2): o fluxo de origem já mandou o e-mail
    const fallbacks = finalFailures.filter(({ row }) => !readOutboxData(row.data).skipFallback);
    await mapWithConcurrency(fallbacks, OUTBOX_FALLBACK_CONCURRENCY, async ({ row }) => {
      const { bulk } = readOutboxData(row.data);
      await this.notificationsService.deliverFallback(row.userId, row.notificationId, row.title, row.body, { bulk });
    });

    return {
      claimed: rows.length,
      sent: sent.length,
      retried: retries.length,
      failed: finalFailures.length + uncertain.length,
    };
  }

  private async recordSent(sent: Array<{ row: ClaimedRow; ticketId: string | null }>, now: Date) {
    if (sent.length === 0) return;
    const withTicket = sent.filter((item) => item.ticketId);
    const withoutTicket = sent.filter((item) => !item.ticketId);
    // ticketId é diferente por linha: um update por linha, numa transação em lote (1 conexão)
    for (const part of chunk(withTicket, 100)) {
      await this.prisma.$transaction(
        part.map((item) =>
          this.prisma.notificationOutbox.update({
            where: { id: item.row.id },
            data: { status: 'SENT', sentAt: now, ticketId: item.ticketId, lastError: null },
          }),
        ),
      );
    }
    if (withoutTicket.length) {
      // Sem ticket legível: entregue, mas não há recibo a conferir
      await this.prisma.notificationOutbox.updateMany({
        where: { id: { in: withoutTicket.map((item) => item.row.id) } },
        data: { status: 'SENT', sentAt: now, lastError: null, receiptCheckedAt: now },
      });
    }
    const notificationIds = sent.map((item) => item.row.notificationId).filter((id): id is string => Boolean(id));
    if (notificationIds.length) {
      await this.prisma.notification.updateMany({
        where: { id: { in: notificationIds } },
        data: { isSent: true, sentAt: now },
      });
    }
  }

  private async recordRetries(retries: Array<{ row: ClaimedRow; error: string }>, now: Date) {
    // Mesma espera para o mesmo número de tentativas: um updateMany por grupo
    const groups = new Map<string, { attempts: number; error: string; ids: string[] }>();
    for (const { row, error } of retries) {
      const key = `${row.attempts}|${error}`;
      const group = groups.get(key) ?? { attempts: row.attempts, error, ids: [] };
      group.ids.push(row.id);
      groups.set(key, group);
    }
    for (const group of groups.values()) {
      await this.prisma.notificationOutbox.updateMany({
        where: { id: { in: group.ids }, status: 'SENDING' },
        data: {
          status: 'PENDING',
          availableAt: new Date(now.getTime() + outboxBackoffMs(group.attempts)),
          lastError: group.error.slice(0, 200),
        },
      });
    }
  }

  /**
   * TIMEOUT (S4): o pedido saiu e a resposta se perdeu. FAILED com sentAt
   * marcado e `INCERTO_TIMEOUT` — sem reenvio, sem recibo (o ticket vinha na
   * resposta perdida) e sem fallback. A notificação continua no app.
   */
  private async recordUncertain(rows: ClaimedRow[], now: Date) {
    if (rows.length === 0) return;
    await this.prisma.notificationOutbox.updateMany({
      where: { id: { in: rows.map((row) => row.id) }, status: 'SENDING' },
      data: { status: 'FAILED', sentAt: now, lastError: OUTBOX_UNCERTAIN_ERROR, receiptCheckedAt: now },
    });
  }

  private async recordFailures(failures: FinalFailure[]) {
    const groups = new Map<string, string[]>();
    for (const { row, error } of failures) groups.set(error, [...(groups.get(error) ?? []), row.id]);
    for (const [error, ids] of groups) {
      await this.prisma.notificationOutbox.updateMany({
        where: { id: { in: ids }, status: 'SENDING' },
        data: { status: 'FAILED', lastError: error.slice(0, 200) },
      });
    }
  }

  /**
   * Recibos dos envios com mais de 15 min (até 1000 por rodada). Recibo de
   * erro → FAILED com o motivo; DeviceNotRegistered limpa o token da conta,
   * a menos que o aparelho tenha registrado token depois do envio.
   */
  async checkReceipts(now: Date): Promise<number> {
    const rows = await this.prisma.notificationOutbox.findMany({
      where: {
        status: 'SENT',
        ticketId: { not: null },
        receiptCheckedAt: null,
        sentAt: { lte: new Date(now.getTime() - OUTBOX_RECEIPT_DELAY_MS) },
      },
      select: { id: true, userId: true, ticketId: true, sentAt: true },
      orderBy: { sentAt: 'asc' },
      take: EXPO_RECEIPTS_LIMIT * 3,
    });
    if (rows.length === 0) return 0;

    let checked = 0;
    for (const part of chunk(rows, EXPO_RECEIPTS_LIMIT)) {
      const receipts = await this.pushDispatcher.getReceipts(part.map((row) => row.ticketId as string));
      if (!receipts) continue; // consulta falhou: tenta na próxima rodada

      const okIds: string[] = [];
      for (const row of part) {
        const receipt = receipts[row.ticketId as string];
        if (!receipt) {
          // Ainda não pronto; passadas 24 h o Expo já apagou: encerra
          if (row.sentAt && now.getTime() - row.sentAt.getTime() >= OUTBOX_RECEIPT_GIVE_UP_MS) okIds.push(row.id);
          continue;
        }
        if (receipt.status === 'ok') {
          okIds.push(row.id);
          continue;
        }
        checked++;
        await this.prisma.notificationOutbox.update({
          where: { id: row.id },
          data: { status: 'FAILED', lastError: `RECEIPT_${receipt.error}`.slice(0, 200), receiptCheckedAt: now },
        });
        if (receipt.error === 'DeviceNotRegistered' && row.sentAt) {
          await this.prisma.user
            .updateMany({
              where: {
                id: row.userId,
                pushToken: { not: null },
                OR: [{ pushTokenUpdatedAt: null }, { pushTokenUpdatedAt: { lte: row.sentAt } }],
              },
              data: { pushToken: null, pushTokenUpdatedAt: now },
            })
            .catch(() => undefined);
        }
      }
      if (okIds.length) {
        checked += okIds.length;
        await this.prisma.notificationOutbox.updateMany({
          where: { id: { in: okIds } },
          data: { receiptCheckedAt: now },
        });
      }
    }
    return checked;
  }
}
