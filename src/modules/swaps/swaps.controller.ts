import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { SwapsService } from './swaps.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlanFeatureGuard } from '../plans/plan-feature.guard';
import { PlanResource, RequiresFeature } from '../plans/plan.decorators';

// Recurso pago da comunidade (planos) — comunidade da escala da troca
@Controller('swaps')
@UseGuards(JwtAuthGuard, PlanFeatureGuard)
@RequiresFeature('swaps')
export class SwapsController {
  constructor(private readonly service: SwapsService) {}

  @Post()
  @PlanResource('assignment:body.assignmentId')
  request(@Body() dto: any, @Request() req: any) {
    return this.service.requestSwap(dto, req.user);
  }

  @Get('mine')
  mine(@Request() req: any) {
    return this.service.listMine(req.user);
  }

  @Patch(':id/accept')
  @PlanResource('swap')
  accept(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.service.accept(id, req.user, body?.overrideConflict === true);
  }

  @Patch(':id/reject')
  @PlanResource('swap')
  reject(@Param('id') id: string, @Request() req: any) {
    return this.service.reject(id, req.user);
  }

  @Patch(':id/cancel')
  @PlanResource('swap')
  cancel(@Param('id') id: string, @Request() req: any) {
    return this.service.cancel(id, req.user);
  }
}
