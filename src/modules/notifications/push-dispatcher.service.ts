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
 * Envia push notifications via Expo Push API.
 * Sem fila (BullMQ nao esta instalado no projeto): envio direto e best-effort,
 * falhas sao logadas e nao devem derrubar o fluxo que originou a notificacao.
 *
 * O Expo responde HTTP 200 mesmo quando o envio falhou: o que vale é o ticket
 * (`data.status`). `error` conta como falha (a cadeia segue para e-mail/SMS) e
 * `DeviceNotRegistered` avisa que o token morreu (app desinstalado/reinstalado).
 */
@Injectable()
export class PushDispatcherService {
  private readonly logger = new Logger(PushDispatcherService.name);
  private readonly expoPushUrl = 'https://exp.host/--/api/v2/push/send';

  async send(message: PushMessage): Promise<boolean> {
    return (await this.sendWithResult(message)).sent;
  }

  async sendWithResult(message: PushMessage): Promise<PushResult> {
    try {
      const response = await fetch(this.expoPushUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: message.to,
          title: message.title,
          body: message.body,
          data: message.data || {},
          sound: 'default',
        }),
      });

      if (!response.ok) {
        this.logger.warn(`Expo push falhou com status ${response.status}`);
        return { sent: false, invalidToken: false };
      }

      const payload: any = await response.json().catch(() => null);
      // Envio unitário: `data` é o ticket; em lote viria uma lista
      const ticket = Array.isArray(payload?.data) ? payload.data[0] : payload?.data;
      if (payload?.errors?.length || ticket?.status === 'error') {
        const reason = ticket?.details?.error ?? payload?.errors?.[0]?.code ?? 'erro';
        this.logger.warn(`Expo push recusado: ${reason}`);
        return { sent: false, invalidToken: reason === 'DeviceNotRegistered' };
      }
      // Resposta sem ticket legível: mantém o comportamento antigo (aceito pelo Expo)
      return { sent: true, invalidToken: false };
    } catch (error) {
      this.logger.warn(`Erro ao enviar push notification: ${error}`);
      return { sent: false, invalidToken: false };
    }
  }
}
