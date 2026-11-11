import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlanFeatureGuard } from '../plans/plan-feature.guard';
import { RequiresFeature } from '../plans/plan.decorators';
import { DashboardService } from './dashboard.service';

/**
 * Pendências consolidadas da coordenação (Onda 4). Sem @Roles: além de
 * PASTORAL_COORDINATOR e acima, quem COORDENA pastoral pelo vínculo (papel
 * VOLUNTEER/FAITHFUL — ux-dashboards-22) recebe o Início das suas pastorais.
 * O DashboardService decide e responde 403 a quem não coordena nada.
 *
 * Recurso PAGO da comunidade (`dashboard`): o plano sai do `communityId` da
 * query ou do usuário (paróquia/diocese: alguma comunidade com acesso).
 */
@Controller('dashboard')
@UseGuards(JwtAuthGuard, PlanFeatureGuard)
@RequiresFeature('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('coordinator')
  coordinator(@Request() req: any, @Query('communityId') communityId?: string) {
    return this.service.getCoordinatorOverview(req.user, communityId || undefined);
  }

  /** Indicadores e gráficos do painel "Início" (mesmo escopo do endpoint acima). */
  @Get('coordinator/insights')
  insights(@Request() req: any, @Query('communityId') communityId?: string) {
    return this.service.getCoordinatorInsights(req.user, communityId || undefined);
  }
}
