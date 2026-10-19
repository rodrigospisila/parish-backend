import { Injectable, Logger } from '@nestjs/common';

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/** Resultado do envio: `invalidToken` = o Expo diz que o aparelho não está mais registrado. */
export interface PushResult {
  sent: boolean;
  invalidToken: boolean;
}

/**
 * Ticket de UMA mensagem de um envio em lote, na mesma ordem das mensagens.
 * - `ok`: aceito pelo Expo (`ticketId` serve para conferir o recibo depois);
 * - `error`: recusado (`error` = código do Expo, ex.: DeviceNotRegistered);
 * - `retry`: o lote inteiro não chegou (rede, timeout, HTTP de erro) — tentar de novo.
 */
export type PushTicket =
  | { status: 'ok'; ticketId: string | null }
  | { status: 'error'; error: string }
  | { status: 'retry'; error: string };

/** Recibo de um ticket (consultado ~15 min depois do envio). */
export type PushReceipt = { status: 'ok' } | { status: 'error'; error: string };

/** Máximo de mensagens por chamada à API do Expo. */
export const EXPO_BATCH_LIMIT = 100;
/** Máximo de ids por consulta de recibos (o Expo aceita até 1000). */
export const EXPO_RECEIPTS_LIMIT = 300;
/** Nenhuma chamada ao Expo segura o worker por mais que isso. */
export const EXPO_TIMEOUT_MS = 10_000;

/**
 * Envia push notifications via Expo Push API.
 *
 * O envio em massa passa pela outbox (NotificationOutbox + PushOutboxService):
 * a requisição só grava e o worker chama `sendBatch` em lotes de até 100.
 * `sendWithResult` (uma mensagem) continua disponível para envios pontuais.
 * Toda chamada tem timeout (AbortSignal) — um Expo lento não prende o processo.
 *
 * O Expo responde HTTP 200 mesmo quando o envio falhou: o que vale é o ticket
 * (`data.status`). `error` conta como falha (a cadeia segue para e-mail/SMS) e
 * `DeviceNotRegistered` avisa que o token morreu (app desinstalado/reinstalado).
 *
 * `EXPO_ACCESS_TOKEN` (opcional): só é necessário com a "segurança reforçada de
 * push" ligada no projeto Expo; sem ele o envio segue como sempre foi.
 */
@Injectable()
export class PushDispatcherService {
  private readonly logger = new Logger(PushDispatcherService.name);
  private readonly expoPushUrl = 'https://exp.host/--/api/v2/push/send';
  private readonly expoReceiptsUrl = 'https://exp.host/--/api/v2/push/getReceipts';

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    };
    const token = process.env.EXPO_ACCESS_TOKEN?.trim();
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  private toExpo(message: PushMessage) {
    return {
      to: message.to,
      title: message.title,
      body: message.body,
      data: message.data || {},
      sound: 'default',
    };
  }

  async send(message: PushMessage): Promise<boolean> {
    return (await this.sendWithResult(message)).sent;
  }

  async sendWithResult(message: PushMessage): Promise<PushResult> {
    const [ticket] = await this.sendBatch([message]);
    if (ticket.status === 'ok') return { sent: true, invalidToken: false };
    return { sent: false, invalidToken: ticket.status === 'error' && ticket.error === 'DeviceNotRegistered' };
  }

  /**
   * Envia até 100 mensagens numa chamada. Devolve um ticket por mensagem, na
   * mesma ordem. Nunca lança: falha do lote inteiro vira `retry` em todas.
   */
  async sendBatch(messages: PushMessage[]): Promise<PushTicket[]> {
    if (messages.length === 0) return [];
    if (messages.length > EXPO_BATCH_LIMIT) {
      throw new Error(`Lote de push acima do limite do Expo (${messages.length} > ${EXPO_BATCH_LIMIT})`);
    }
    const retryAll = (error: string): PushTicket[] => messages.map(() => ({ status: 'retry', error }));
    try {
      const response = await fetch(this.expoPushUrl, {
        method: 'POST',
        headers: this.headers(),
        // Uma mensagem vai como objeto (formato de sempre); lote vai como lista
        body: JSON.stringify(messages.length === 1 ? this.toExpo(messages[0]) : messages.map((m) => this.toExpo(m))),
        signal: AbortSignal.timeout(EXPO_TIMEOUT_MS),
      });

      if (!response.ok) {
        this.logger.warn(`Expo push falhou com status ${response.status}`);
        return retryAll(`HTTP_${response.status}`);
      }

      const payload: any = await response.json().catch(() => null);
      const tickets: any[] = Array.isArray(payload?.data) ? payload.data : payload?.data ? [payload.data] : [];
      if (payload?.errors?.length && tickets.length === 0) {
        // Erro do pedido inteiro (ex.: validação): nenhum ticket individual
        const code = String(payload.errors[0]?.code ?? 'erro');
        this.logger.warn(`Expo push recusado: ${code}`);
        return messages.map(() => ({ status: 'error', error: code }));
      }

      return messages.map((_, index): PushTicket => {
        const ticket = tickets[index];
        if (ticket?.status === 'error') {
          const reason = String(ticket?.details?.error ?? 'erro');
          this.logger.warn(`Expo push recusado: ${reason}`);
          return { status: 'error', error: reason };
        }
        // Resposta sem ticket legível: mantém o comportamento antigo (aceito pelo Expo)
        return { status: 'ok', ticketId: typeof ticket?.id === 'string' ? ticket.id : null };
      });
    } catch (error) {
      const timeout = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
      this.logger.warn(`Erro ao enviar push notification: ${timeout ? 'tempo esgotado' : String(error)}`);
      return retryAll(timeout ? 'TIMEOUT' : 'NETWORK');
    }
  }

  /**
   * Recibos dos tickets (até 300 por chamada). Devolve só os que o Expo já
   * tem; `null` quando a consulta falhou (tentar de novo depois).
   */
  async getReceipts(ticketIds: string[]): Promise<Record<string, PushReceipt> | null> {
    if (ticketIds.length === 0) return {};
    try {
      const response = await fetch(this.expoReceiptsUrl, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ ids: ticketIds.slice(0, EXPO_RECEIPTS_LIMIT) }),
        signal: AbortSignal.timeout(EXPO_TIMEOUT_MS),
      });
      if (!response.ok) {
        this.logger.warn(`Recibos do Expo falharam com status ${response.status}`);
        return null;
      }
      const payload: any = await response.json().catch(() => null);
      const data = payload?.data;
      if (!data || typeof data !== 'object') return null;
      const receipts: Record<string, PushReceipt> = {};
      for (const [id, receipt] of Object.entries<any>(data)) {
        receipts[id] =
          receipt?.status === 'error'
            ? { status: 'error', error: String(receipt?.details?.error ?? 'erro') }
            : { status: 'ok' };
      }
      return receipts;
    } catch (error) {
      this.logger.warn(`Erro ao consultar recibos do Expo: ${String(error)}`);
      return null;
    }
  }
}
