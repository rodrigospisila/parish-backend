import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Query,
  Patch,
  Request,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { CreateStandaloneScheduleDto } from './dto/create-standalone-schedule.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { ReplaceAssignmentDto } from './dto/replace-assignment.dto';
import { UpdateScheduleStatusDto } from './dto/update-schedule-status.dto';
import { UpdateSchedulePastoralsDto } from './dto/update-schedule-pastorals.dto';
import { NotifyTeamDto } from './dto/notify-team.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('schedules')
@UseGuards(JwtAuthGuard)
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  // ========== MINHAS ESCALAS (USUÁRIO LOGADO) ==========

  /**
   * Busca as escalas do usuário logado
   * GET /schedules/my-assignments
   */
  @Get('my-assignments')
  async findMyAssignments(@Request() req: any) {
    return this.schedulesService.findMyAssignments(req.user.id);
  }

  /**
   * Confirma participação em uma escala
   * (o próprio membro, ou coordenador em nome dele — confirmação assistida)
   * PATCH /schedules/assignments/:id/confirm
   */
  @Patch('assignments/:id/confirm')
  async confirmAssignment(@Param('id') id: string, @Request() req: any) {
    return this.schedulesService.confirmAssignment(id, req.user);
  }

  /**
   * Recusa participação em uma escala
   * (o próprio membro, ou coordenador em nome dele — confirmação assistida)
   * PATCH /schedules/assignments/:id/decline
   */
  @Patch('assignments/:id/decline')
  async declineAssignment(@Param('id') id: string, @Body() body: { reason?: string }, @Request() req: any) {
    return this.schedulesService.declineAssignment(id, req.user, body?.reason);
  }

  // ========== SCHEDULES ==========

  @Post()
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  createSchedule(@Body() createScheduleDto: CreateScheduleDto, @Request() req: any) {
    return this.schedulesService.createSchedule(createScheduleDto, req.user);
  }

  // Escala de serviço contínuo, sem evento (Fase 4.1)
  @Post('standalone')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  createStandalone(@Body() dto: CreateStandaloneScheduleDto, @Request() req: any) {
    return this.schedulesService.createStandaloneSchedule(dto, req.user);
  }

  // Gerador de rodízio (Fase 4.6): prévia (dryRun) ou publicação em lote
  @Post('generate')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  generateRotation(
    @Body()
    dto: {
      scheduleIds: string[];
      dryRun?: boolean;
      slotOverrides?: Array<{
        scheduleId: string;
        settings: Array<{ communityPastoralId: string; requiredPeople: number }>;
      }>;
      couplesTogether?: boolean;
    },
    @Request() req: any,
  ) {
    return this.schedulesService.generateRotation(dto, req.user);
  }

  // Ajusta as vagas (requiredPeople) das pastorais vinculadas à escala
  @Patch(':id/pastorals')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  updateSchedulePastorals(
    @Param('id') id: string,
    @Body() dto: UpdateSchedulePastoralsDto,
    @Request() req: any,
  ) {
    return this.schedulesService.updateSchedulePastorals(id, dto, req.user);
  }

  @Get()
  findAllSchedules(@Query('eventId') eventId?: string, @Request() req?: any) {
    return this.schedulesService.findAllSchedules(eventId, req?.user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  removeSchedule(@Param('id') id: string, @Request() req: any) {
    return this.schedulesService.removeSchedule(id, req.user);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  updateScheduleStatus(@Param('id') id: string, @Body() body: UpdateScheduleStatusDto, @Request() req: any) {
    return this.schedulesService.updateScheduleStatus(id, body.status, req.user);
  }

  // ========== ASSIGNMENTS ==========

  @Post('assignments')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  createAssignment(@Body() createAssignmentDto: CreateAssignmentDto, @Request() req: any) {
    return this.schedulesService.createAssignment(createAssignmentDto, req.user);
  }

  @Post('assignments/group')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  createGroupAssignment(
    @Body()
    dto: {
      scheduleId: string;
      pastoralGroupId: string;
      role?: string;
      overrideConflict?: boolean;
      replaceGroupId?: string;
    },
    @Request() req: any,
  ) {
    return this.schedulesService.createGroupAssignment(dto, req.user);
  }

  @Delete('assignments/group')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  removeGroupAssignment(
    @Query('scheduleId') scheduleId: string,
    @Query('pastoralGroupId') pastoralGroupId: string,
    @Request() req: any,
  ) {
    return this.schedulesService.removeGroupAssignment(scheduleId, pastoralGroupId, req.user);
  }

  // Líder do grupo (ou coordenação) responde a escala em nome de toda a equipe
  @Patch('assignments/group/respond')
  respondGroupAssignment(
    @Body() dto: { scheduleId: string; pastoralGroupId: string; action: 'confirm' | 'decline'; reason?: string },
    @Request() req: any,
  ) {
    return this.schedulesService.respondGroupAssignment(dto, req.user);
  }

  @Get('assignments/all')
  findAllAssignments(
    @Query('scheduleId') scheduleId?: string,
    @Query('memberId') memberId?: string,
    @Request() req?: any,
  ) {
    return this.schedulesService.findAllAssignments(scheduleId, memberId, req?.user);
  }

  @Get('assignments/:id')
  findOneAssignment(@Param('id') id: string, @Request() req?: any) {
    return this.schedulesService.findOneAssignment(id, req?.user);
  }

  @Delete('assignments/:id')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  removeAssignment(@Param('id') id: string, @Request() req: any) {
    return this.schedulesService.removeAssignment(id, req.user);
  }

  @Patch('assignments/:id/replace')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  replaceAssignment(@Param('id') id: string, @Body() body: ReplaceAssignmentDto, @Request() req: any) {
    return this.schedulesService.replaceAssignment(id, body.memberId, req.user, body.overrideConflict);
  }

  // ========== CHECK-IN ==========

  @Patch('assignments/:id/checkin')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  checkIn(@Param('id') id: string, @Request() req: any) {
    return this.schedulesService.checkIn(id, req.user);
  }

  @Patch('assignments/:id/undo-checkin')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  undoCheckIn(@Param('id') id: string, @Request() req: any) {
    return this.schedulesService.undoCheckIn(id, req.user);
  }

  // ========== COMUNICACAO DO COORDENADOR ==========

  /**
   * Envia um aviso (push) para todos os membros escalados nesta escala.
   * POST /schedules/:id/notify-team
   */
  @Post(':id/notify-team')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  notifyTeam(@Param('id') id: string, @Body() body: NotifyTeamDto, @Request() req: any) {
    return this.schedulesService.notifyTeam(id, body.message, req.user);
  }

  // ========== MEMBROS ELEGÍVEIS ==========

  /**
   * Busca membros elegíveis para uma escala baseado nas pastorais vinculadas ao evento
   * GET /schedules/events/:eventId/eligible-members
   */
  @Get('events/:eventId/eligible-members')
  findEligibleMembers(@Param('eventId') eventId: string, @Request() req: any) {
    return this.schedulesService.findEligibleMembers(eventId, req.user);
  }

  /**
   * Busca candidatos para preenchimento da escala com conflitos e historico
   * GET /schedules/:id/candidates
   */
  @Get(':id/candidates')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  findScheduleCandidates(@Param('id') id: string, @Request() req: any) {
    return this.schedulesService.findScheduleCandidates(id, req.user);
  }

  // ========== RELATÓRIOS ==========

  @Get('members/:memberId/stats')
  getMemberStats(@Param('memberId') memberId: string, @Request() req: any) {
    return this.schedulesService.getMemberStats(memberId, req.user);
  }

  // ========== VISÃO DO COORDENADOR ==========

  /**
   * Visão consolidada das escalas com status por atribuição
   * Ideal para painéis de coordenação (web/mobile)
   * GET /schedules/coordinator-overview?from=2026-01-01&to=2026-12-31
   */
  @Get('coordinator-overview')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  getCoordinatorOverview(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Request() req?: any,
  ) {
    return this.schedulesService.getCoordinatorOverview(req?.user, from, to);
  }

  /**
   * Exporta as escalas do período em PDF (impressão para o mural)
   * GET /schedules/export.pdf?from=2026-07-01&to=2026-07-31
   */
  @Get('export.pdf')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  async exportSchedulesPdf(
    @Res() res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Request() req?: any,
  ) {
    const buffer = await this.schedulesService.exportSchedulesPdf(req?.user, from, to);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="escala.pdf"',
      'Content-Length': String(buffer.length),
    });
    res.end(buffer);
  }

  @Get(':id')
  findOneSchedule(@Param('id') id: string, @Request() req?: any) {
    return this.schedulesService.findOneSchedule(id, req?.user);
  }
}
