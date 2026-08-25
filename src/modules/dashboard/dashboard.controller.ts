import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DashboardService } from './dashboard.service';

/** Pendências consolidadas da coordenação (Onda 4). */
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  // PASTORAL_COORDINATOR e acima (RolesGuard respeita a hierarquia)
  @Get('coordinator')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  coordinator(@Request() req: any, @Query('communityId') communityId?: string) {
    return this.service.getCoordinatorOverview(req.user, communityId || undefined);
  }
}
