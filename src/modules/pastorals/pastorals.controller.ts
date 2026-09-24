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
import { NotifyMembersDto } from './dto/notify-members.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlanFeatureGuard } from '../plans/plan-feature.guard';
import { PlanResource, RequiresFeature, SkipPlanCheck } from '../plans/plan.decorators';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

// Recurso pago da comunidade (planos). Catálogo global e a lista de pastorais
// da comunidade seguem livres: telas grátis (eventos, agenda fixa, mensagens
// do clero, usuários) dependem delas.
@Controller('pastorals')
@UseGuards(JwtAuthGuard, PlanFeatureGuard)
@RequiresFeature('pastorals')
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
  @SkipPlanCheck()
  findAllGlobalPastorals() {
    return this.pastoralsService.findAllGlobalPastorals();
  }

  @Get('global/:id')
  @SkipPlanCheck()
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
  @SkipPlanCheck()
  findAllCommunityPastorals(
    @Query('communityId') communityId?: string,
    @Query('parishId') parishId?: string,
    @Request() req?,
  ) {
    return this.pastoralsService.findAllCommunityPastorals(communityId, req?.user, parishId);
  }

  // Pastorais em que o usuário é coordenador ATUAL — base dos vínculos
  // self-service (ex.: vincular a própria pastoral a um horário da Agenda
  // Fixa). Rota estática ANTES de community/:id para não colidir.
  @Get('community/coordinated-by-me')
  @SkipPlanCheck()
  findCoordinatedByMe(@Request() req) {
    return this.pastoralsService.findCoordinatedByMe(req.user.id);
  }

  @Get('community/:id/available-members')
  @PlanResource('communityPastoral')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  findAvailableMembersForCommunityPastoral(@Param('id') id: string, @Request() req?) {
    return this.pastoralsService.findAvailableMembersForCommunityPastoral(id, req?.user);
  }

  @Get('community/:id')
  @PlanResource('communityPastoral')
  findOneCommunityPastoral(@Param('id') id: string, @Request() req?) {
    return this.pastoralsService.findOneCommunityPastoral(id, req?.user);
  }

  /**
   * Envia um aviso (push) para todos os membros ativos desta pastoral.
   * POST /pastorals/community/:id/notify-members
   */
  @Post('community/:id/notify-members')
  @PlanResource('communityPastoral')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  notifyMembers(@Param('id') id: string, @Body() dto: NotifyMembersDto, @Request() req) {
    return this.pastoralsService.notifyMembers(id, dto.message, req.user);
  }

  @Patch('community/:id')
  @PlanResource('communityPastoral')
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
  @PlanResource('communityPastoral')
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
  @PlanResource('communityPastoral:body.communityPastoralId')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  createPastoralGroup(@Body() dto: CreatePastoralGroupDto, @Request() req) {
    return this.pastoralsService.createPastoralGroup(dto, req.user);
  }

  @Get('groups')
  @PlanResource('communityPastoral:query.communityPastoralId')
  findAllPastoralGroups(@Query('communityPastoralId') communityPastoralId?: string, @Request() req?) {
    return this.pastoralsService.findAllPastoralGroups(communityPastoralId, req?.user);
  }

  @Get('groups/:id')
  @PlanResource('pastoralGroup')
  findOnePastoralGroup(@Param('id') id: string, @Request() req?) {
    return this.pastoralsService.findOnePastoralGroup(id, req?.user);
  }

  @Patch('groups/:id')
  @PlanResource('pastoralGroup')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  updatePastoralGroup(@Param('id') id: string, @Body() dto: UpdatePastoralGroupDto, @Request() req) {
    return this.pastoralsService.updatePastoralGroup(id, dto, req.user);
  }

  @Delete('groups/:id')
  @PlanResource('pastoralGroup')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  removePastoralGroup(@Param('id') id: string, @Request() req) {
    return this.pastoralsService.removePastoralGroup(id, req.user);
  }

  // ============================================
  // PASTORAL MEMBERS
  // ============================================

  @Post('members')
  @PlanResource('communityPastoral:body.communityPastoralId', 'pastoralGroup:body.pastoralGroupId')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  addMemberToPastoral(@Body() dto: CreatePastoralMemberDto, @Request() req) {
    return this.pastoralsService.addMemberToPastoral(dto, req.user);
  }

  @Get('members')
  @PlanResource('communityPastoral:query.communityPastoralId', 'pastoralGroup:query.pastoralGroupId')
  findPastoralMembers(
    @Query('communityPastoralId') communityPastoralId?: string,
    @Query('pastoralGroupId') pastoralGroupId?: string,
    @Request() req?,
  ) {
    return this.pastoralsService.findPastoralMembers(communityPastoralId, pastoralGroupId, req?.user);
  }

  @Patch('members/:id')
  @PlanResource('pastoralMember')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  updateMember(@Param('id') id: string, @Body() dto: UpdatePastoralMemberDto, @Request() req) {
    return this.pastoralsService.updateMember(id, dto, req.user);
  }

  @Delete('members/:id')
  @PlanResource('pastoralMember')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  removeMemberFromPastoral(@Param('id') id: string, @Request() req) {
    return this.pastoralsService.removeMemberFromPastoral(id, req.user);
  }

  // Reuniões e atividades de pastoral são criadas via /events
  // (EventType.PASTORAL_MEETING / PASTORAL_ACTIVITY).
}
