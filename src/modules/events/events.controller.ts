import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { DuplicateEventDto } from './dto/duplicate-event.dto';
import { AddPastoralToEventDto } from './dto/add-pastoral-to-event.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { CheckinAssignmentDto } from './dto/checkin-assignment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, EventType } from '@prisma/client';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  create(@Body() createEventDto: CreateEventDto, @CurrentUser() user: any) {
    return this.eventsService.create(createEventDto, user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Query('communityId') communityId?: string,
    @Query('type') type?: EventType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: any,
  ) {
    return this.eventsService.findAll(communityId, type, startDate, endDate, user);
  }

  @Get('upcoming')
  findUpcoming(
    @Query('communityId') communityId?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit) : 10;
    return this.eventsService.findUpcoming(communityId, limitNum);
  }

  @Get('recurring')
  findRecurring(@Query('communityId') communityId?: string) {
    return this.eventsService.findRecurring(communityId);
  }

  @Get('type/:type')
  findByType(
    @Param('type') type: EventType,
    @Query('communityId') communityId?: string,
  ) {
    return this.eventsService.findByType(type, communityId);
  }

  @Get('range')
  findByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('communityId') communityId?: string,
  ) {
    return this.eventsService.findByDateRange(startDate, endDate, communityId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto, @CurrentUser() user: any) {
    return this.eventsService.update(id, updateEventDto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.DIOCESAN_ADMIN, UserRole.PARISH_ADMIN, UserRole.COMMUNITY_COORDINATOR)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.eventsService.remove(id, user);
  }

  @Post(':id/duplicate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  duplicate(
    @Param('id') id: string,
    @Body() duplicateEventDto: DuplicateEventDto,
    @CurrentUser() user: any,
  ) {
    return this.eventsService.duplicate(id, duplicateEventDto, user);
  }

  // Participant management
  @Post(':id/participants')
  @UseGuards(JwtAuthGuard)
  addParticipant(
    @Param('id') eventId: string,
    @Body('memberId') memberId: string,
  ) {
    return this.eventsService.addParticipant(eventId, memberId);
  }

  @Delete(':id/participants/:memberId')
  @UseGuards(JwtAuthGuard)
  removeParticipant(
    @Param('id') eventId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.eventsService.removeParticipant(eventId, memberId);
  }

  @Get(':id/participants')
  getParticipants(@Param('id') eventId: string) {
    return this.eventsService.getParticipants(eventId);
  }

  // ============================================
  // PASTORAL MANAGEMENT
  // ============================================

  @Post(':id/pastorals')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  addPastoralToEvent(
    @Param('id') eventId: string,
    @Body() dto: AddPastoralToEventDto,
  ) {
    return this.eventsService.addPastoralToEvent(eventId, dto);
  }

  @Get(':id/pastorals')
  getEventPastorals(@Param('id') eventId: string) {
    return this.eventsService.getEventPastorals(eventId);
  }

  @Delete(':id/pastorals/:pastoralId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  removePastoralFromEvent(
    @Param('id') eventId: string,
    @Param('pastoralId') pastoralId: string,
  ) {
    return this.eventsService.removePastoralFromEvent(eventId, pastoralId);
  }

  // ============================================
  // ASSIGNMENT MANAGEMENT (ESCALA)
  // ============================================

  @Post(':id/pastorals/:pastoralId/assignments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  createAssignment(
    @Param('id') eventId: string,
    @Param('pastoralId') pastoralId: string,
    @Body() dto: CreateAssignmentDto,
  ) {
    return this.eventsService.createAssignment(eventId, pastoralId, dto);
  }

  @Get(':id/pastorals/:pastoralId/assignments')
  getAssignments(
    @Param('id') eventId: string,
    @Param('pastoralId') pastoralId: string,
  ) {
    return this.eventsService.getAssignments(eventId, pastoralId);
  }

  @Patch('assignments/:assignmentId/checkin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  checkinAssignment(
    @Param('assignmentId') assignmentId: string,
    @Body() dto: CheckinAssignmentDto,
  ) {
    return this.eventsService.checkinAssignment(assignmentId, dto);
  }

  @Delete('assignments/:assignmentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  removeAssignment(@Param('assignmentId') assignmentId: string) {
    return this.eventsService.removeAssignment(assignmentId);
  }
}

