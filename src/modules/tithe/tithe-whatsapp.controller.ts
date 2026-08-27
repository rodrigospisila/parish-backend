import { Body, Controller, ForbiddenException, Get, Headers, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { MessagingService } from '../messaging/messaging.service';
import { TitheWhatsAppService } from './whatsapp.service';

const escapeXml = (value: string) => value.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c] as string);

/**
 * Webhook de mensagens recebidas do Twilio (WhatsApp). Sem JWT: autenticado
 * pela assinatura X-Twilio-Signature (auth token do servidor). Responde TwiML.
 */
@Controller('tithe/whatsapp')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 120, ttl: 60_000 } })
export class TitheWhatsAppController {
  constructor(
    private readonly service: TitheWhatsAppService,
    private readonly messaging: MessagingService,
  ) {}

  @Get('inbound')
  ping() {
    return { ok: true, channel: 'whatsapp', configured: this.service.serverConfigured() };
  }

  @Post('inbound')
  @HttpCode(200)
  async inbound(
    @Body() body: Record<string, unknown>,
    @Headers('x-twilio-signature') signature: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // A URL assinada é a configurada no console do Twilio: tenta a pública e a do proxy
    const path = req.originalUrl.split('?')[0];
    const candidates = new Set<string>();
    const publicBase = (process.env.PUBLIC_API_URL ?? '').replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
    if (publicBase) candidates.add(`${publicBase}${path}`);
    candidates.add(`${req.protocol}://${req.get('host')}${path}`);
    candidates.add(`https://${req.get('host')}${path}`);
    const valid = [...candidates].some((url) => this.messaging.validateTwilioSignature(url, body ?? {}, signature));
    if (!valid) throw new ForbiddenException('Assinatura do Twilio inválida');
    const from = String(body?.From ?? '').replace(/^whatsapp:/, '');
    const text = String(body?.Body ?? '');
    const reply = await this.service.handleInbound(from, text);
    res.setHeader('Content-Type', 'text/xml; charset=utf-8');
    res.send(reply ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(reply)}</Message></Response>` : '<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  }
}
