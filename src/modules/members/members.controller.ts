import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { ImportMembersDto } from './dto/import-members.dto';
import { AddMemberCommunityDto } from './dto/add-member-community.dto';
import { UpdateMemberAvailabilityDto } from './dto/update-member-availability.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, MemberStatus } from '@prisma/client';

@Controller('members')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Post()
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    // Coordenador de pastoral cadastra membros na própria comunidade
    UserRole.PASTORAL_COORDINATOR,
  )
  create(@Body() createMemberDto: CreateMemberDto, @CurrentUser() user: any) {
    return this.membersService.create(createMemberDto, user);
  }

  // ===== Vínculos multi-comunidade — self-service do membro logado =====

  @Get('me/communities')
  async listMyCommunities(@CurrentUser() user: any) {
    const member = await this.membersService.requireMemberForUser(user.id);
    return this.membersService.listCommunityLinks(member.id);
  }

  @Post('me/communities')
  async addMyCommunity(@Body() dto: AddMemberCommunityDto, @CurrentUser() user: any) {
    const member = await this.membersService.requireMemberForUser(user.id);
    return this.membersService.addCommunityLink(member.id, dto.communityId, dto.consentGiven, user);
  }

  @Delete('me/communities/:communityId')
  async removeMyCommunity(@Param('communityId') communityId: string, @CurrentUser() user: any) {
    const member = await this.membersService.requireMemberForUser(user.id);
    return this.membersService.removeCommunityLink(member.id, communityId, user);
  }

  // ===== Vínculos multi-comunidade — gestão =====

  @Get(':id/communities')
  async listMemberCommunities(@Param('id') id: string, @CurrentUser() user: any) {
    await this.membersService.findOne(id, user); // valida escopo de leitura
    return this.membersService.listCommunityLinks(id);
  }

  @Post(':id/communities')
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  addMemberCommunity(
    @Param('id') id: string,
    @Body() dto: AddMemberCommunityDto,
    @CurrentUser() user: any,
  ) {
    return this.membersService.addCommunityLink(id, dto.communityId, dto.consentGiven, user, {
      requireScope: true,
    });
  }

  @Delete(':id/communities/:communityId')
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  removeMemberCommunity(
    @Param('id') id: string,
    @Param('communityId') communityId: string,
    @CurrentUser() user: any,
  ) {
    return this.membersService.removeCommunityLink(id, communityId, user, { requireScope: true });
  }

  @Patch(':id/communities/:communityId/primary')
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  setMemberPrimaryCommunity(
    @Param('id') id: string,
    @Param('communityId') communityId: string,
    @CurrentUser() user: any,
  ) {
    return this.membersService.setPrimaryCommunity(id, communityId, user);
  }

  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('communityId') communityId?: string,
    @Query('status') status?: MemberStatus,
  ) {
    return this.membersService.findAll(user, communityId, status);
  }

  @Get('search')
  searchByName(
    @CurrentUser() user: any,
    @Query('name') name: string,
    @Query('communityId') communityId?: string,
  ) {
    return this.membersService.searchByName(name, communityId, user);
  }

  // Detecção de possíveis duplicados (nome + nascimento/telefone), respeitando escopo
  @Get('check-duplicates')
  checkDuplicates(
    @CurrentUser() user: any,
    @Query('fullName') fullName: string,
    @Query('birthDate') birthDate?: string,
    @Query('phone') phone?: string,
    @Query('communityId') communityId?: string,
    @Query('excludeId') excludeId?: string,
  ) {
    return this.membersService.findPotentialDuplicates(
      { fullName, birthDate, phone, communityId },
      user,
      excludeId,
    );
  }

  // Importação em massa (o cliente envia as linhas já parseadas do CSV)
  @Post('import')
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  importMembers(@Body() body: ImportMembersDto, @CurrentUser() user: any) {
    return this.membersService.importMembers(body.rows, body.communityId, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.membersService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    // Coordenador de pastoral edita membros da própria comunidade
    // (escopo validado em canManageMember no service)
    UserRole.PASTORAL_COORDINATOR,
  )
  update(@Param('id') id: string, @Body() updateMemberDto: UpdateMemberDto, @CurrentUser() user: any) {
    return this.membersService.update(id, updateMemberDto, user);
  }

  @Delete(':id')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.DIOCESAN_ADMIN, UserRole.PARISH_ADMIN, UserRole.COMMUNITY_COORDINATOR)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.membersService.remove(id, user);
  }

  // LGPD: Exportar dados (o próprio titular ou gestor com escopo)
  @Get(':id/export')
  exportData(@Param('id') id: string, @CurrentUser() user: any) {
    return this.membersService.exportMemberData(id, user);
  }

  // LGPD: Direito ao esquecimento
  @Post(':id/anonymize')
  @Roles(UserRole.COMMUNITY_COORDINATOR)
  anonymize(@Param('id') id: string, @CurrentUser() user: any) {
    return this.membersService.anonymizeMember(id, user);
  }

  // LGPD: Atualizar consentimento (o próprio titular ou gestor com escopo)
  @Patch(':id/consent')
  updateConsent(
    @Param('id') id: string,
    @Body('consentGiven') consentGiven: boolean,
    @CurrentUser() user: any,
  ) {
    return this.membersService.updateConsent(id, consentGiven, user);
  }

  @Get('me/availability')
  getMyAvailability(@CurrentUser() user: any) {
    return this.membersService.getMyAvailability(user.id);
  }

  @Put('me/availability')
  updateMyAvailability(@Body() body: UpdateMemberAvailabilityDto, @CurrentUser() user: any) {
    return this.membersService.updateMyAvailability(user.id, body);
  }

  @Get(':id/availability')
  getAvailability(@Param('id') id: string, @CurrentUser() user: any) {
    return this.membersService.getAvailability(id, user);
  }

  @Put(':id/availability')
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  updateAvailability(
    @Param('id') id: string,
    @Body() body: UpdateMemberAvailabilityDto,
    @CurrentUser() user: any,
  ) {
    return this.membersService.updateAvailability(id, body, user);
  }
}
