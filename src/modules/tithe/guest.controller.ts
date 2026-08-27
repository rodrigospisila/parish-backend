import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TitheThrottlerGuard } from './tithe-throttler.guard';
import { TitheGuestService } from './guest.service';

/** Ofertas de visitante — conciliação pela administração paroquial. */
@Controller('tithe/guests')
@UseGuards(JwtAuthGuard, RolesGuard, TitheThrottlerGuard)
@Roles(UserRole.PARISH_ADMIN)
export class TitheGuestController {
  constructor(private readonly service: TitheGuestService) {}

  @Get()
  list(@Request() req: any, @Query('parishId') parishId?: string, @Query('status') status?: string) {
    return this.service.list(req.user, { parishId: parishId || undefined, status });
  }

  @Post(':id/confirm')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  confirm(@Param('id') id: string, @Body() body: { date?: string; amountPaid?: number }, @Request() req: any) {
    return this.service.confirm(req.user, id, body ?? {});
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @Body() body: { reason?: string }, @Request() req: any) {
    return this.service.reject(req.user, id, body?.reason);
  }

  @Post(':id/sync')
  sync(@Param('id') id: string, @Request() req: any) {
    return this.service.syncForFinance(req.user, id);
  }

  @Post(':id/resend-receipt')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  resend(@Param('id') id: string, @Request() req: any) {
    return this.service.resendReceipt(req.user, id);
  }
}
