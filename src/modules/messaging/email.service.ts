import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { isProductionEnv, maskEmail } from './log-mask';

/**
 * Canal de e-mail transacional (roadmap 2.2).
 *
 * Configuração por ambiente (SMTP):
 * - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
 * - Em desenvolvimento aponta para o MailHog (docker-compose: host `localhost`, porta 1025).
 * - Sem SMTP configurado, cai em fallback de log (nunca quebra o fluxo que originou o envio);
 *   em produção o log leva só o e-mail mascarado e o assunto, nunca o corpo.
 *
 * Para SendGrid, usar SMTP: host `smtp.sendgrid.net`, user `apikey`, pass = SENDGRID_API_KEY.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    this.from = this.configService.get<string>('EMAIL_FROM') || 'no-reply@parish.local';

    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<string>('SMTP_PORT'));

    if (host && port) {
      const user = this.configService.get<string>('SMTP_USER');
      const pass = this.configService.get<string>('SMTP_PASS');
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: user && pass ? { user, pass } : undefined,
      });
    }
  }

  get configured(): boolean {
    return this.transporter !== null;
  }

  /**
   * Envio best-effort: nunca lança exceção. Retorna se foi enviado.
   */
  async trySend(to: string, subject: string, text: string, html?: string): Promise<boolean> {
    if (!this.transporter) {
      if (isProductionEnv()) this.logger.warn(`SMTP não configurado — e-mail para ${maskEmail(to)} descartado ("${subject}")`);
      else this.logger.log(`[EMAIL DEV] para=${to} assunto="${subject}"`);
      return false;
    }

    try {
      await this.transporter.sendMail({ from: this.from, to, subject, text, html });
      return true;
    } catch (error) {
      this.logger.warn(`Falha ao enviar e-mail para ${maskEmail(to)}: ${error}`);
      return false;
    }
  }
}
