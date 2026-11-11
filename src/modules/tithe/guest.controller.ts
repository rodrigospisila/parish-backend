import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TitheThrottlerGuard } from './tithe-throttler.guard';
import { PlanFeatureGuard } from '../plans/plan-feature.guard';
import { PlanResource, RequiresFeature, SkipPlanCheck } from '../plans/plan.decorators';
import { TitheGuestService } from './guest.service';

/**
 * Ofertas de visitante — conciliação pela administração paroquial. O dízimo é
 * recurso pago (`tithe`, nível paróquia), mas TODAS as rotas daqui tratam de
 * oferta que JÁ existe (listar, confirmar, recusar, sincronizar, reenviar o
 * recibo): ficam abertas com `@SkipPlanCheck()` — dinheiro que já entrou nunca
 * fica preso atrás do plano. A oferta NOVA é barrada na página pública
 * (`TitheGuestService.offersBlockedByPlan`). O escopo é conferido no service.
 */
@Controller('tithe/guests')
@UseGuards(JwtAuthGuard, RolesGuard, TitheThrottlerGuard, PlanFeatureGuard)
@RequiresFeature('tithe', { level: 'parish' })
@Roles(UserRole.PARISH_ADMIN)
export class TitheGuestController {
  constructor(private readonly service: TitheGuestService) {}

  @Get()
  @SkipPlanCheck()
  list(@Request() req: any, @Query('parishId') parishId?: string, @Query('status') status?: string) {
    return this.service.list(req.user, { parishId: parishId || undefined, status });
  }

  @Post(':id/confirm')
  @SkipPlanCheck()
  @PlanResource('titheGuestGift')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  confirm(@Param('id') id: string, @Body() body: { date?: string; amountPaid?: number }, @Request() req: any) {
    return this.service.confirm(req.user, id, body ?? {});
  }

  @Post(':id/reject')
  @SkipPlanCheck()
  @PlanResource('titheGuestGift')
  reject(@Param('id') id: string, @Body() body: { reason?: string }, @Request() req: any) {
    return this.service.reject(req.user, id, body?.reason);
  }

  @Post(':id/sync')
  @SkipPlanCheck()
  @PlanResource('titheGuestGift')
  sync(@Param('id') id: string, @Request() req: any) {
    return this.service.syncForFinance(req.user, id);
  }

  @Post(':id/resend-receipt')
  @SkipPlanCheck()
  @PlanResource('titheGuestGift')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  resend(@Param('id') id: string, @Request() req: any) {
    return this.service.resendReceipt(req.user, id);
  }
}
