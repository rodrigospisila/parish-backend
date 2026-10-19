import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PlatformOverviewService } from './platform-overview.service';

/** Início do painel da Plataforma — só SYSTEM_ADMIN. */
@Controller('platform/overview')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SYSTEM_ADMIN)
export class PlatformOverviewController {
  constructor(private readonly service: PlatformOverviewService) {}

  /**
   * GET /platform/overview → `{ parishesManaged, claimsPending, leadsNew,
   * plans: { trial, active, pastDue, suspended }, mrrCents, trialsEndingIn7d,
   * usage7d: [{ name, count, uniques }], jobs: [{ name, lastStatus, lastStartedAt,
   * lastFinishedAt, lastItems, lastError, errors24h }], enforcement30d: { total, byKind } }`
   */
  @Get()
  overview() {
    return this.service.overview();
  }
}
