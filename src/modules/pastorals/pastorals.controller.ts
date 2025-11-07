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
  Request,
} from '@nestjs/common';
import { PastoralsService } from './pastorals.service';
import { CreateGlobalPastoralDto } from './dto/create-global-pastoral.dto';
import { UpdateGlobalPastoralDto } from './dto/update-global-pastoral.dto';
import { CreateCommunityPastoralDto } from './dto/create-community-pastoral.dto';
import { UpdateCommunityPastoralDto } from './dto/update-community-pastoral.dto';
import { CreatePastoralGroupDto } from './dto/create-pastoral-group.dto';
import { UpdatePastoralGroupDto } from './dto/update-pastoral-group.dto';
import { CreatePastoralMemberDto } from './dto/create-pastoral-member.dto';
import { UpdatePastoralMemberDto } from './dto/update-pastoral-member.dto';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('pastorals')
@UseGuards(JwtAuthGuard)
export class PastoralsController {
  constructor(private readonly pastoralsService: PastoralsService) {}

  // ============================================
  // GLOBAL PASTORALS (SYSTEM_ADMIN only)
  // ============================================

  @Post('global')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN)
  createGlobalPastoral(@Body() dto: CreateGlobalPastoralDto, @Request() req) {
    return this.pastoralsService.createGlobalPastoral(dto, req.user.role);
  }

  @Get('global')
  findAllGlobalPastorals() {
    return this.pastoralsService.findAllGlobalPastorals();
  }

  @Get('global/:id')
  findOneGlobalPastoral(@Param('id') id: string) {
    return this.pastoralsService.findOneGlobalPastoral(id);
  }

  @Patch('global/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN)
  updateGlobalPastoral(
    @Param('id') id: string,
    @Body() dto: UpdateGlobalPastoralDto,
    @Request() req,
  ) {
    return this.pastoralsService.updateGlobalPastoral(id, dto, req.user.role);
  }

  @Delete('global/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN)
  removeGlobalPastoral(@Param('id') id: string, @Request() req) {
    return this.pastoralsService.removeGlobalPastoral(id, req.user.role);
  }

  // ============================================
  // COMMUNITY PASTORALS
  // ============================================

  @Post('community')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  createCommunityPastoral(@Body() dto: CreateCommunityPastoralDto, @Request() req) {
    return this.pastoralsService.createCommunityPastoral(dto, req.user.id);
  }

  @Get('community')
  findAllCommunityPastorals(@Query('communityId') communityId?: string) {
    return this.pastoralsService.findAllCommunityPastorals(communityId);
  }

  @Get('community/:id')
  findOneCommunityPastoral(@Param('id') id: string) {
    return this.pastoralsService.findOneCommunityPastoral(id);
  }

  @Patch('community/:id')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  updateCommunityPastoral(
    @Param('id') id: string,
    @Body() dto: UpdateCommunityPastoralDto,
    @Request() req,
  ) {
    return this.pastoralsService.updateCommunityPastoral(id, dto, req.user.id);
  }

  @Delete('community/:id')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  removeCommunityPastoral(@Param('id') id: string, @Request() req) {
    return this.pastoralsService.removeCommunityPastoral(id, req.user.id);
  }

  // ============================================
  // PASTORAL GROUPS (Sub-grupos)
  // ============================================

  @Post('groups')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  createPastoralGroup(@Body() dto: CreatePastoralGroupDto) {
    return this.pastoralsService.createPastoralGroup(dto);
  }

  @Get('groups')
  findAllPastoralGroups(@Query('communityPastoralId') communityPastoralId?: string) {
    return this.pastoralsService.findAllPastoralGroups(communityPastoralId);
  }

  @Get('groups/:id')
  findOnePastoralGroup(@Param('id') id: string) {
    return this.pastoralsService.findOnePastoralGroup(id);
  }

  @Patch('groups/:id')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  updatePastoralGroup(@Param('id') id: string, @Body() dto: UpdatePastoralGroupDto) {
    return this.pastoralsService.updatePastoralGroup(id, dto);
  }

  @Delete('groups/:id')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  removePastoralGroup(@Param('id') id: string) {
    return this.pastoralsService.removePastoralGroup(id);
  }

  // ============================================
  // PASTORAL MEMBERS
  // ============================================

  @Post('members')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  addMemberToPastoral(@Body() dto: CreatePastoralMemberDto) {
    return this.pastoralsService.addMemberToPastoral(dto);
  }

  @Get('members')
  findPastoralMembers(
    @Query('communityPastoralId') communityPastoralId?: string,
    @Query('pastoralGroupId') pastoralGroupId?: string,
  ) {
    return this.pastoralsService.findPastoralMembers(communityPastoralId, pastoralGroupId);
  }

  @Patch('members/:id')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  updateMember(@Param('id') id: string, @Body() dto: UpdatePastoralMemberDto) {
    return this.pastoralsService.updateMember(id, dto);
  }

  @Delete('members/:id')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  removeMemberFromPastoral(@Param('id') id: string) {
    return this.pastoralsService.removeMemberFromPastoral(id);
  }

  // ============================================
  // MEETINGS & ACTIVITIES (DEPRECATED)
  // ============================================
  /*
   * ENDPOINTS DEPRECADOS - Use /events para criar eventos
   * Tipo PASTORAL_MEETING ou PASTORAL_ACTIVITY
   *

  @Post('meetings')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  createMeeting(@Body() dto: CreateMeetingDto) {
    return this.pastoralsService.createMeeting(dto);
  }

  @Get('meetings')
  findAllMeetings(@Query('communityPastoralId') communityPastoralId?: string) {
    return this.pastoralsService.findAllMeetings(communityPastoralId);
  }

  @Get('meetings/:id')
  findOneMeeting(@Param('id') id: string) {
    return this.pastoralsService.findOneMeeting(id);
  }

  @Patch('meetings/:id')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  updateMeeting(@Param('id') id: string, @Body() dto: UpdateMeetingDto) {
    return this.pastoralsService.updateMeeting(id, dto);
  }

  @Delete('meetings/:id')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  removeMeeting(@Param('id') id: string) {
    return this.pastoralsService.removeMeeting(id);
  }

  @Post('meetings/attendance')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  markAttendance(@Body() dto: MarkAttendanceDto) {
    return this.pastoralsService.markAttendance(dto);
  }

  // ============================================
  // ACTIVITIES
  // ============================================

  @Post('activities')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  createActivity(@Body() dto: CreateActivityDto) {
    return this.pastoralsService.createActivity(dto);
  }

  @Get('activities')
  findAllActivities(@Query('communityPastoralId') communityPastoralId?: string) {
    return this.pastoralsService.findAllActivities(communityPastoralId);
  }

  @Get('activities/:id')
  findOneActivity(@Param('id') id: string) {
    return this.pastoralsService.findOneActivity(id);
  }

  @Delete('activities/:id')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  removeActivity(@Param('id') id: string) {
    return this.pastoralsService.removeActivity(id);
  }
  */
}
