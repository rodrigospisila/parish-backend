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
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
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
    UserRole.PASTORAL_COORDINATOR,
  )
  create(@Body() createEventDto: CreateEventDto, @CurrentUser() user: any) {
    return this.eventsService.create(createEventDto, user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Query('communityId') communityId?: string,
    @Query('type') type?: EventType,
    @Query('q') q?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('onlyMyPastorals') onlyMyPastorals?: string,
    @CurrentUser() user?: any,
  ) {
    return this.eventsService.findAll(
      communityId,
      type,
      q,
      startDate,
      endDate,
      user,
      onlyMyPastorals === 'true',
    );
  }

  // Exporta a agenda em iCalendar (.ics) para Google Calendar/Outlook/Apple
  @Get('export.ics')
  @UseGuards(JwtAuthGuard)
  async exportIcs(
    @Res() res: Response,
    @Query('communityId') communityId?: string,
    @CurrentUser() user?: any,
  ) {
    const ics = await this.eventsService.exportIcs(user, communityId);
    res.set({
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="agenda-paroquial.ics"',
    });
    res.send(ics);
  }

  @Get('upcoming')
  @UseGuards(JwtAuthGuard)
  findUpcoming(
    @Query('communityId') communityId?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit) : 10;
    return this.eventsService.findUpcoming(communityId, limitNum);
  }

  @Get('recurring')
  @UseGuards(JwtAuthGuard)
  findRecurring(@Query('communityId') communityId?: string) {
    return this.eventsService.findRecurring(communityId);
  }

  @Get('type/:type')
  @UseGuards(JwtAuthGuard)
  findByType(
    @Param('type') type: EventType,
    @Query('communityId') communityId?: string,
  ) {
    return this.eventsService.findByType(type, communityId);
  }

  @Get('range')
  @UseGuards(JwtAuthGuard)
  findByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('communityId') communityId?: string,
  ) {
    return this.eventsService.findByDateRange(startDate, endDate, communityId);
  }

  @Get('favorites')
  @UseGuards(JwtAuthGuard)
  getFavorites(@CurrentUser() user: any) {
    return this.eventsService.getFavorites(user);
  }

  @Post(':id/favorite')
  @UseGuards(JwtAuthGuard)
  addFavorite(@Param('id') id: string, @CurrentUser() user: any) {
    return this.eventsService.addFavorite(id, user);
  }

  @Delete(':id/favorite')
  @UseGuards(JwtAuthGuard)
  removeFavorite(@Param('id') id: string, @CurrentUser() user: any) {
    return this.eventsService.removeFavorite(id, user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string, @CurrentUser() user?: any) {
    return this.eventsService.findOne(id, user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto, @CurrentUser() user: any) {
    return this.eventsService.update(id, updateEventDto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
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
    UserRole.PASTORAL_COORDINATOR,
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
  @UseGuards(JwtAuthGuard)
  getParticipants(@Param('id') eventId: string, @CurrentUser() user: any) {
    return this.eventsService.getParticipants(eventId, user);
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
    @CurrentUser() user: any,
  ) {
    return this.eventsService.addPastoralToEvent(eventId, dto, user);
  }

  @Get(':id/pastorals')
  @UseGuards(JwtAuthGuard)
  getEventPastorals(@Param('id') eventId: string, @CurrentUser() user: any) {
    return this.eventsService.getEventPastorals(eventId, user);
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
    @CurrentUser() user: any,
  ) {
    return this.eventsService.removePastoralFromEvent(eventId, pastoralId, user);
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
    @CurrentUser() user: any,
  ) {
    return this.eventsService.createAssignment(eventId, pastoralId, dto, user);
  }

  @Get(':id/pastorals/:pastoralId/assignments')
  @UseGuards(JwtAuthGuard)
  getAssignments(
    @Param('id') eventId: string,
    @Param('pastoralId') pastoralId: string,
    @CurrentUser() user: any,
  ) {
    return this.eventsService.getAssignments(eventId, pastoralId, user);
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
    @CurrentUser() user: any,
  ) {
    return this.eventsService.checkinAssignment(assignmentId, dto, user);
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
  removeAssignment(@Param('assignmentId') assignmentId: string, @CurrentUser() user: any) {
    return this.eventsService.removeAssignment(assignmentId, user);
  }
}
