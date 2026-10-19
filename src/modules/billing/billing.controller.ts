import { Body, Controller, Get, Headers, HttpCode, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { BillingService } from './billing.service';
import { BillingWebhookService } from './billing-webhook.service';
import { CancelBillingDto, CheckoutDto, SaveBillingAccountDto } from './dto/billing.dto';

/**
 * Plano e assinatura da paróquia (Onda 1, C3). Leitura: PARISH_ADMIN da
 * paróquia, DIOCESAN_ADMIN e SYSTEM_ADMIN no escopo. Escrita (dados de
 * cobrança, contratar, cancelar): PARISH_ADMIN da paróquia ou SYSTEM_ADMIN.
 * A cobrança nunca acontece dentro do app (regra das lojas) — só no painel web.
 */
@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PARISH_ADMIN, UserRole.DIOCESAN_ADMIN, UserRole.SYSTEM_ADMIN)
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('me')
  me(@Request() req: any, @Query('parishId') parishId?: string) {
    return this.billing.me(req.user, parishId);
  }

  @Put('account')
  saveAccount(@Request() req: any, @Body() dto: SaveBillingAccountDto) {
    return this.billing.saveAccount(req.user, dto);
  }

  @Post('checkout')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  checkout(@Request() req: any, @Body() dto: CheckoutDto) {
    return this.billing.checkout(req.user, dto);
  }

  @Post('cancel')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  cancel(@Request() req: any, @Body() dto: CancelBillingDto) {
    return this.billing.cancel(req.user, dto);
  }
}

/**
 * Webhook da conta Asaas da EMPRESA (sem JWT — token no header
 * asaas-access-token). URL: <API>/api/v1/platform/billing/webhook.
 */
@Controller('platform/billing')
// Sem JWT: limite generoso por IP (o Asaas reenvia em lote) contra abuso anônimo
@Throttle({ default: { limit: 300, ttl: 60_000 } })
export class PlatformBillingWebhookController {
  constructor(private readonly webhook: BillingWebhookService) {}

  @Post('webhook')
  @HttpCode(200)
  receive(@Headers() headers: Record<string, string | string[] | undefined>, @Body() body: unknown) {
    return this.webhook.handle(headers, body);
  }
}
