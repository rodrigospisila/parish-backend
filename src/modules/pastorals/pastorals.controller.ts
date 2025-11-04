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
import { CreatePastoralMemberDto } from './dto/create-pastoral-member.dto';
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
}
