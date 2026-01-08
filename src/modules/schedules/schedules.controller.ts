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
} from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
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
   * PATCH /schedules/assignments/:id/confirm
   */
  @Patch('assignments/:id/confirm')
  async confirmAssignment(@Param('id') id: string, @Request() req: any) {
    return this.schedulesService.confirmAssignment(id, req.user.id);
  }

  /**
   * Recusa participação em uma escala
   * PATCH /schedules/assignments/:id/decline
   */
  @Patch('assignments/:id/decline')
  async declineAssignment(@Param('id') id: string, @Request() req: any) {
    return this.schedulesService.declineAssignment(id, req.user.id);
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

  @Get()
  findAllSchedules(@Query('eventId') eventId?: string, @Request() req?: any) {
    return this.schedulesService.findAllSchedules(eventId, req?.user);
  }

  @Get(':id')
  findOneSchedule(@Param('id') id: string) {
    return this.schedulesService.findOneSchedule(id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  removeSchedule(@Param('id') id: string, @Request() req: any) {
    return this.schedulesService.removeSchedule(id, req.user);
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

  @Get('assignments/all')
  findAllAssignments(
    @Query('scheduleId') scheduleId?: string,
    @Query('memberId') memberId?: string,
  ) {
    return this.schedulesService.findAllAssignments(scheduleId, memberId);
  }

  @Get('assignments/:id')
  findOneAssignment(@Param('id') id: string) {
    return this.schedulesService.findOneAssignment(id);
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

  // ========== MEMBROS ELEGÍVEIS ==========

  /**
   * Busca membros elegíveis para uma escala baseado nas pastorais vinculadas ao evento
   * GET /schedules/events/:eventId/eligible-members
   */
  @Get('events/:eventId/eligible-members')
  findEligibleMembers(@Param('eventId') eventId: string, @Request() req: any) {
    return this.schedulesService.findEligibleMembers(eventId, req.user);
  }

  // ========== RELATÓRIOS ==========

  @Get('members/:memberId/stats')
  getMemberStats(@Param('memberId') memberId: string) {
    return this.schedulesService.getMemberStats(memberId);
  }
}
