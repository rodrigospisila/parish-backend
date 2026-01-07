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

  // ========== SCHEDULES ==========

  @Post()
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  createSchedule(@Body() createScheduleDto: CreateScheduleDto) {
    return this.schedulesService.createSchedule(createScheduleDto);
  }

  @Get()
  findAllSchedules(@Query('eventId') eventId?: string) {
    return this.schedulesService.findAllSchedules(eventId);
  }

  @Get(':id')
  findOneSchedule(@Param('id') id: string) {
    return this.schedulesService.findOneSchedule(id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  removeSchedule(@Param('id') id: string) {
    return this.schedulesService.removeSchedule(id);
  }

  // ========== ASSIGNMENTS ==========

  @Post('assignments')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  createAssignment(@Body() createAssignmentDto: CreateAssignmentDto) {
    return this.schedulesService.createAssignment(createAssignmentDto);
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
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  removeAssignment(@Param('id') id: string) {
    return this.schedulesService.removeAssignment(id);
  }

  // ========== CHECK-IN ==========

  @Patch('assignments/:id/checkin')
  checkIn(@Param('id') id: string) {
    return this.schedulesService.checkIn(id);
  }

  @Patch('assignments/:id/undo-checkin')
  undoCheckIn(@Param('id') id: string) {
    return this.schedulesService.undoCheckIn(id);
  }

  // ========== MEMBROS ELEGÍVEIS ==========

  /**
   * Busca membros elegíveis para uma escala baseado nas pastorais vinculadas ao evento
   * GET /schedules/events/:eventId/eligible-members
   */
  @Get('events/:eventId/eligible-members')
  findEligibleMembers(@Param('eventId') eventId: string) {
    return this.schedulesService.findEligibleMembers(eventId);
  }

  // ========== RELATÓRIOS ==========

  @Get('members/:memberId/stats')
  getMemberStats(@Param('memberId') memberId: string) {
    return this.schedulesService.getMemberStats(memberId);
  }
}

