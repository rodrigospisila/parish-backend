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
 * - `retry`: o lote com certeza não foi processado (rede antes de conectar,
 *   HTTP 5xx/429, credencial) — tentar de novo;
 * - `uncertain`: o pedido saiu e a resposta não voltou a tempo (TIMEOUT). O
 *   Expo pode ter aceitado: reenviar duplicaria o push (S4) e não há como
 *   perguntar — a API não tem chave de idempotência nem consulta por
 *   mensagem, e o ticket (único caminho para o recibo) vinha na resposta
 *   perdida. Quem chama não reenvia.
 */
export type PushTicket =
  | { status: 'ok'; ticketId: string | null }
  | { status: 'error'; error: string }
  | { status: 'retry'; error: string }
  | { status: 'uncertain'; error: string };

/** Recibo de um ticket (consultado ~15 min depois do envio). */
export type PushReceipt = { status: 'ok' } | { status: 'error'; error: string };

/** Máximo de mensagens por chamada à API do Expo. */
export const EXPO_BATCH_LIMIT = 100;
/** Máximo de ids por consulta de recibos (o Expo aceita até 1000). */
export const EXPO_RECEIPTS_LIMIT = 300;
/** Nenhuma chamada ao Expo segura o worker por mais que isso. */
export const EXPO_TIMEOUT_MS = 10_000;
/** Erro do Expo quando o lote mistura tokens de projetos (experiências) diferentes. */
export const EXPO_MIXED_PROJECTS_ERROR = 'PUSH_TOO_MANY_EXPERIENCE_IDS';
/** Token de outro projeto Expo (só com EXPO_EXPERIENCE_ID configurado): nunca vai funcionar aqui. */
export const PUSH_FOREIGN_PROJECT_ERROR = 'PUSH_OUTRO_PROJETO_EXPO';
/** HTTP em que o Expo recusa o PEDIDO pelo conteúdo — dividir o lote isola a mensagem culpada. */
const CONTENT_REJECTION_STATUSES = new Set([400, 413]);

/** Resultado de UMA chamada ao Expo (antes de isolar mensagens recusadas). */
type PostOutcome =
  | { kind: 'tickets'; tickets: PushTicket[] }
  | { kind: 'rejected'; code: string; details: unknown }
  | { kind: 'retry'; error: string }
  | { kind: 'uncertain'; error: string };

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
 * `EXPO_EXPERIENCE_ID` (opcional, ex.: "@rodrigospisila/parish-mobile"): o
 * projeto do app. Com ele, token de OUTRO projeto que aparecer num lote misto
 * nem é enviado (PUSH_OUTRO_PROJETO_EXPO) e sai da conta; sem ele, cada
 * projeto vai num pedido separado (S1).
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
   * mesma ordem. Nunca lança.
   *
   * Recusa do pedido inteiro pelo conteúdo (HTTP 400/413, S1) não vira
   * `retry` para o lote: uma única mensagem ruim (token de outro projeto Expo,
   * token malformado) derrubaria as outras 99 a cada tentativa. O lote é
   * dividido e reenviado na hora, até isolar a culpada, que sai como `error`
   * com o código do Expo:
   * - PUSH_TOO_MANY_EXPERIENCE_IDS: o Expo diz quais tokens são de qual
   *   projeto (`details`); cada projeto vai num pedido separado. Com
   *   `EXPO_EXPERIENCE_ID` (ex.: "@dono/parish-mobile") configurado, os tokens
   *   de outros projetos nem são enviados (`PUSH_OUTRO_PROJETO_EXPO`);
   * - qualquer outra recusa: o lote é partido ao meio até sobrar a mensagem
   *   recusada (cerca de 2·log2(100) ≈ 14 pedidos extras por mensagem ruim).
   */
  async sendBatch(messages: PushMessage[]): Promise<PushTicket[]> {
    if (messages.length === 0) return [];
    if (messages.length > EXPO_BATCH_LIMIT) {
      throw new Error(`Lote de push acima do limite do Expo (${messages.length} > ${EXPO_BATCH_LIMIT})`);
    }
    return this.sendIsolating(messages);
  }

  private async sendIsolating(messages: PushMessage[]): Promise<PushTicket[]> {
    const outcome = await this.post(messages);
    if (outcome.kind === 'tickets') return outcome.tickets;
    if (outcome.kind === 'retry') return messages.map(() => ({ status: 'retry', error: outcome.error }));
    if (outcome.kind === 'uncertain') return messages.map(() => ({ status: 'uncertain', error: outcome.error }));

    // Recusa do pedido inteiro: uma mensagem sozinha é a culpada
    if (messages.length === 1) {
      this.logger.warn(`Expo push recusado: ${outcome.code}`);
      return [{ status: 'error', error: outcome.code }];
    }

    if (outcome.code === EXPO_MIXED_PROJECTS_ERROR) {
      const groups = this.groupByProject(messages, outcome.details);
      if (groups && groups.length > 1) {
        const expected = (process.env.EXPO_EXPERIENCE_ID ?? '').trim();
        const knowsOwn = Boolean(expected) && groups.some((group) => group.project === expected);
        const tickets: PushTicket[] = new Array(messages.length);
        for (const group of groups) {
          let groupTickets: PushTicket[];
          if (knowsOwn && group.project !== null && group.project !== expected) {
            this.logger.warn(`Push: ${group.indexes.length} token(s) de outro projeto Expo descartado(s)`);
            groupTickets = group.indexes.map(() => ({ status: 'error', error: PUSH_FOREIGN_PROJECT_ERROR }));
          } else {
            groupTickets = await this.sendIsolating(group.indexes.map((index) => messages[index]));
          }
          group.indexes.forEach((index, position) => (tickets[index] = groupTickets[position]));
        }
        return tickets;
      }
    }

    // Recusa sem detalhe aproveitável: parte ao meio até isolar a mensagem ruim
    const middle = Math.ceil(messages.length / 2);
    const first = await this.sendIsolating(messages.slice(0, middle));
    const second = await this.sendIsolating(messages.slice(middle));
    return [...first, ...second];
  }

  /**
   * `details` do PUSH_TOO_MANY_EXPERIENCE_IDS: { "@dono/projeto": [tokens] }.
   * Devolve os índices das mensagens por projeto (token não listado fica num
   * grupo próprio, `project: null`). `null` quando o detalhe não é legível.
   */
  private groupByProject(
    messages: PushMessage[],
    details: unknown,
  ): Array<{ project: string | null; indexes: number[] }> | null {
    if (!details || typeof details !== 'object' || Array.isArray(details)) return null;
    const projectOf = new Map<string, string>();
    for (const [project, tokens] of Object.entries(details as Record<string, unknown>)) {
      if (!Array.isArray(tokens)) continue;
      for (const token of tokens) if (typeof token === 'string') projectOf.set(token, project);
    }
    if (projectOf.size === 0) return null;
    const groups = new Map<string | null, number[]>();
    messages.forEach((message, index) => {
      const project = projectOf.get(message.to) ?? null;
      groups.set(project, [...(groups.get(project) ?? []), index]);
    });
    return [...groups.entries()].map(([project, indexes]) => ({ project, indexes }));
  }

  /** Uma chamada ao Expo, sem dividir nada. Nunca lança. */
  private async post(messages: PushMessage[]): Promise<PostOutcome> {
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
        if (CONTENT_REJECTION_STATUSES.has(response.status)) {
          const payload: any = await response.json().catch(() => null);
          const error = Array.isArray(payload?.errors) ? payload.errors[0] : null;
          return { kind: 'rejected', code: String(error?.code ?? `HTTP_${response.status}`), details: error?.details };
        }
        return { kind: 'retry', error: `HTTP_${response.status}` };
      }

      const payload: any = await response.json().catch(() => null);
      const tickets: any[] = Array.isArray(payload?.data) ? payload.data : payload?.data ? [payload.data] : [];
      if (payload?.errors?.length && tickets.length === 0) {
        // Erro do pedido inteiro (ex.: validação) com HTTP 200: nenhum ticket individual
        const error = payload.errors[0];
        return { kind: 'rejected', code: String(error?.code ?? 'erro'), details: error?.details };
      }

      return {
        kind: 'tickets',
        tickets: messages.map((_, index): PushTicket => {
          const ticket = tickets[index];
          if (ticket?.status === 'error') {
            const reason = String(ticket?.details?.error ?? 'erro');
            this.logger.warn(`Expo push recusado: ${reason}`);
            return { status: 'error', error: reason };
          }
          // Resposta sem ticket legível: mantém o comportamento antigo (aceito pelo Expo)
          return { status: 'ok', ticketId: typeof ticket?.id === 'string' ? ticket.id : null };
        }),
      };
    } catch (error) {
      const timeout = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
      this.logger.warn(`Erro ao enviar push notification: ${timeout ? 'tempo esgotado' : String(error)}`);
      // Tempo esgotado: o pedido saiu e o Expo pode ter aceitado — entrega incerta (S4)
      return timeout ? { kind: 'uncertain', error: 'TIMEOUT' } : { kind: 'retry', error: 'NETWORK' };
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
