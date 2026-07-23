import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { PlanningService } from './planning.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ActionStatus, PlanStatus, UserRole } from '@prisma/client';

@Controller('planning')
@UseGuards(JwtAuthGuard, RolesGuard)
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
  getPlan(@Param('id') id: string, @Request() req: any) {
    return this.service.getPlan(id, req.user);
  }

  @Patch('plans/:id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: PlanStatus }, @Request() req: any) {
    return this.service.updatePlanStatus(id, body.status, req.user);
  }

  @Post('plans/:id/objectives')
  addObjective(@Param('id') id: string, @Body() body: { description: string }, @Request() req: any) {
    return this.service.addObjective(id, body.description, req.user);
  }

  @Post('objectives/:id/goals')
  addGoal(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    return this.service.addGoal(id, dto, req.user);
  }

  @Patch('goals/:id/progress')
  updateGoal(@Param('id') id: string, @Body() body: { currentValue: string }, @Request() req: any) {
    return this.service.updateGoalProgress(id, body.currentValue, req.user);
  }

  @Post('objectives/:id/actions')
  addAction(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    return this.service.addAction(id, dto, req.user);
  }

  @Patch('actions/:id')
  updateAction(
    @Param('id') id: string,
    @Body() dto: { status?: ActionStatus; resultNotes?: string; dueDate?: string; title?: string },
    @Request() req: any,
  ) {
    return this.service.updateAction(id, dto, req.user);
  }

  @Patch('events/:eventId/objective')
  linkEvent(
    @Param('eventId') eventId: string,
    @Body() body: { objectiveId: string | null },
    @Request() req: any,
  ) {
    return this.service.linkEventToObjective(eventId, body.objectiveId, req.user);
  }
}
