import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { PlanningService } from './planning.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PlanFeatureGuard } from '../plans/plan-feature.guard';
import { PlanResource, RequiresFeature } from '../plans/plan.decorators';
import { ActionStatus, PlanStatus, UserRole } from '@prisma/client';

/**
 * Planejamento pastoral: recurso PAGO de nível PARÓQUIA (`planning`) — passa
 * se alguma comunidade da paróquia tiver acesso.
 */
@Controller('planning')
@UseGuards(JwtAuthGuard, RolesGuard, PlanFeatureGuard)
@RequiresFeature('planning', { level: 'parish' })
@Roles(UserRole.PASTORAL_COORDINATOR) // coordenação (pastoral) ou superior
export class PlanningController {
  constructor(private readonly service: PlanningService) {}

  @Post('plans')
  createPlan(@Body() dto: any, @Request() req: any) {
    return this.service.createPlan(dto, req.user);
  }

  @Get('plans')
  listPlans(@Request() req: any) {
    return this.service.listPlans(req.user);
  }

  @Get('plans/:id')
  @PlanResource('pastoralPlan')
  getPlan(@Param('id') id: string, @Request() req: any) {
    return this.service.getPlan(id, req.user);
  }

  @Patch('plans/:id/status')
  @PlanResource('pastoralPlan')
  updateStatus(@Param('id') id: string, @Body() body: { status: PlanStatus }, @Request() req: any) {
    return this.service.updatePlanStatus(id, body.status, req.user);
  }

  @Post('plans/:id/objectives')
  @PlanResource('pastoralPlan')
  addObjective(@Param('id') id: string, @Body() body: { description: string }, @Request() req: any) {
    return this.service.addObjective(id, body.description, req.user);
  }

  @Post('objectives/:id/goals')
  @PlanResource('planObjective')
  addGoal(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    return this.service.addGoal(id, dto, req.user);
  }

  @Patch('goals/:id/progress')
  @PlanResource('planGoal')
  updateGoal(@Param('id') id: string, @Body() body: { currentValue: string }, @Request() req: any) {
    return this.service.updateGoalProgress(id, body.currentValue, req.user);
  }

  @Post('objectives/:id/actions')
  @PlanResource('planObjective')
  addAction(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    return this.service.addAction(id, dto, req.user);
  }

  @Patch('actions/:id')
  @PlanResource('planAction')
  updateAction(
    @Param('id') id: string,
    @Body() dto: { status?: ActionStatus; resultNotes?: string; dueDate?: string; title?: string },
    @Request() req: any,
  ) {
    return this.service.updateAction(id, dto, req.user);
  }

  @Patch('events/:eventId/objective')
  @PlanResource('event:params.eventId')
  linkEvent(
    @Param('eventId') eventId: string,
    @Body() body: { objectiveId: string | null },
    @Request() req: any,
  ) {
    return this.service.linkEventToObjective(eventId, body.objectiveId, req.user);
  }
}
