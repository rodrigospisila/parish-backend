import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const twilio = require('twilio') as (sid: string, token: string) => {
  messages: { create(opts: { body?: string; from: string; to: string; contentSid?: string; contentVariables?: string }): Promise<unknown> };
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
  private readonly authToken: string | undefined;
  /** Remetente WhatsApp (ex.: whatsapp:+14155238886 no sandbox) */
  private readonly whatsappFrom: string | undefined;
  /** Templates aprovados (Content SID) para mensagens iniciadas pela paróquia fora da janela de 24h */
  private readonly whatsappContentSid: string | undefined;
  private readonly whatsappContentSids: Record<string, string | undefined> = {};

  constructor(private readonly configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.authToken = authToken;
    this.fromNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER');
    const wa = this.configService.get<string>('TWILIO_WHATSAPP_FROM');
    this.whatsappFrom = wa ? (wa.startsWith('whatsapp:') ? wa : `whatsapp:${wa}`) : undefined;
    this.whatsappContentSid = this.configService.get<string>('TWILIO_WHATSAPP_CONTENT_SID') || undefined;
    this.whatsappContentSids = {
      pix: this.whatsappContentSid,
      reminder: this.configService.get<string>('TWILIO_WHATSAPP_CONTENT_SID_REMINDER') || undefined,
      thanks: this.configService.get<string>('TWILIO_WHATSAPP_CONTENT_SID_THANKS') || undefined,
    };
    if (accountSid && authToken) {
      this.twilioClient = twilio(accountSid, authToken);
    }
  }

  /** Indica se o envio de SMS esta configurado (credenciais + numero de origem). */
  get smsConfigured(): boolean {
    return !!(this.twilioClient && this.fromNumber);
  }

  /** WhatsApp configurado (credenciais + remetente WhatsApp). */
  get whatsappConfigured(): boolean {
    return !!(this.twilioClient && this.whatsappFrom);
  }

  /**
   * Envia WhatsApp em modo best-effort. Com TWILIO_WHATSAPP_CONTENT_SID
   * definido e `variables` informadas, usa o template aprovado (obrigatório
   * fora da janela de 24h em produção); senão manda texto (sandbox/janela).
   */
  async trySendWhatsApp(to: string, body: string, variables?: Record<string, string>, purpose: 'pix' | 'reminder' | 'thanks' = 'pix'): Promise<boolean> {
    const e164 = this.normalizePhone(to);
    if (!e164) return false;
    if (!this.whatsappConfigured) {
      this.logger.log(`[WHATSAPP DEV] ${e164} -> ${body.slice(0, 120)}`);
      return false;
    }
    try {
      const target = `whatsapp:${e164}`;
      const contentSid = this.whatsappContentSids[purpose];
      if (contentSid && variables) {
        await this.twilioClient!.messages.create({ from: this.whatsappFrom!, to: target, contentSid, contentVariables: JSON.stringify(variables) });
      } else {
        await this.twilioClient!.messages.create({ body, from: this.whatsappFrom!, to: target });
      }
      return true;
    } catch (error) {
      this.logger.warn(`Falha ao enviar WhatsApp para ${e164}: ${error}`);
      return false;
    }
  }

  /**
   * Valida a assinatura X-Twilio-Signature de um webhook: HMAC-SHA1 (auth token)
   * da URL completa + parâmetros POST ordenados por nome, em base64.
   */
  validateTwilioSignature(url: string, params: Record<string, unknown>, signature: string | undefined): boolean {
    if (!this.authToken || !signature) return false;
    const data = url + Object.keys(params).sort().map((k) => `${k}${String(params[k] ?? '')}`).join('');
    const expected = createHmac('sha1', this.authToken).update(data, 'utf8').digest('base64');
    const a = Buffer.from(expected);
    const b = Buffer.from(String(signature));
    return a.length === b.length && timingSafeEqual(a, b);
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
