import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const twilio = require('twilio') as (sid: string, token: string) => {
  messages: { create(opts: { body: string; from: string; to: string }): Promise<unknown> };
};

/**
 * Servico compartilhado de mensageria (SMS via Twilio).
 * Centraliza o client Twilio usado pelo OTP e pelos fallbacks de notificacao.
 */
@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);
  private twilioClient: ReturnType<typeof twilio> | null = null;
  private readonly fromNumber: string | undefined;

  constructor(private readonly configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.fromNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER');
    if (accountSid && authToken) {
      this.twilioClient = twilio(accountSid, authToken);
    }
  }

  /** Indica se o envio de SMS esta configurado (credenciais + numero de origem). */
  get smsConfigured(): boolean {
    return !!(this.twilioClient && this.fromNumber);
  }

  /**
   * Normaliza telefone brasileiro para E.164 (+5511999999999).
   * Retorna null quando o numero e invalido (nao lanca exception).
   */
  normalizePhone(raw: string): string | null {
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('55') && digits.length >= 12) return `+${digits}`;
    if (digits.length === 11 || digits.length === 10) return `+55${digits}`;
    return null;
  }

  /**
   * Envia SMS e propaga erros de entrega (usado em fluxos que precisam falhar alto, ex.: OTP).
   * Sem Twilio configurado, loga o conteudo (fallback de desenvolvimento).
   */
  async sendSms(to: string, body: string): Promise<void> {
    if (!this.smsConfigured) {
      this.logger.log(`[SMS DEV] ${to} -> ${body}`);
      return;
    }

    await this.twilioClient!.messages.create({
      body,
      from: this.fromNumber!,
      to,
    });
  }

  /**
   * Envia SMS em modo best-effort: nunca lanca exception, retorna se foi enviado.
   * Usado pelos fallbacks de notificacao.
   */
  async trySendSms(to: string, body: string): Promise<boolean> {
    if (!this.smsConfigured) {
      return false;
    }

    try {
      await this.twilioClient!.messages.create({
        body,
        from: this.fromNumber!,
        to,
      });
      return true;
    } catch (error) {
      this.logger.warn(`Falha ao enviar SMS para ${to}: ${error}`);
      return false;
    }
  }
}
