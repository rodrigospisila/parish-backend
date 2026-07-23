import { Injectable, Logger } from '@nestjs/common';

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Envia push notifications via Expo Push API.
 * Sem fila (BullMQ nao esta instalado no projeto): envio direto e best-effort,
 * falhas sao logadas e nao devem derrubar o fluxo que originou a notificacao.
 */
@Injectable()
export class PushDispatcherService {
  private readonly logger = new Logger(PushDispatcherService.name);
  private readonly expoPushUrl = 'https://exp.host/--/api/v2/push/send';

  async send(message: PushMessage): Promise<boolean> {
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
        return false;
      }

      return true;
    } catch (error) {
      this.logger.warn(`Erro ao enviar push notification: ${error}`);
      return false;
    }
  }
}
