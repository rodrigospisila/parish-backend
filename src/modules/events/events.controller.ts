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
  update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto) {
    return this.eventsService.update(id, updateEventDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.DIOCESAN_ADMIN, UserRole.PARISH_ADMIN, UserRole.COMMUNITY_COORDINATOR)
  remove(@Param('id') id: string) {
    return this.eventsService.remove(id);
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
}

