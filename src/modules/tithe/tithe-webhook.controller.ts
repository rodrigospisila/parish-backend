import { Body, Controller, Headers, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { TitheService } from './tithe.service';

/**
 * Webhooks dos provedores de pagamento (sem JWT — autenticados pelo token/assinatura
 * do próprio provedor, validado no service). Sempre responde 200 depois de
 * registrar o evento: o reprocessamento é feito a partir do evento gravado.
 */
@Controller('tithe/webhooks')
// Sem JWT: limite generoso por IP (os provedores reenviam em lote) contra abuso anônimo
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 300, ttl: 60_000 } })
export class TitheWebhookController {
  constructor(private readonly service: TitheService) {}

  @Post(':provider/:parishId')
  @HttpCode(200)
  async receive(
    @Param('provider') provider: string,
    @Param('parishId') parishId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: unknown,
    @Query() query: Record<string, string | undefined>,
    @Req() req: Request,
  ) {
    return this.service.handleWebhook(provider.toUpperCase(), parishId, {
      headers,
      body,
      query,
      rawBody: (req as any).rawBody,
    });
  }
}
