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
import { EnforceMemberLimit } from '../plans/plan-gates';
import { parsePaging } from '../communities/list-paging';
import { MemberImportService } from './member-import.service';

@Controller('members')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MembersController {
  constructor(
    private readonly membersService: MembersService,
    private readonly memberImport: MemberImportService,
  ) {}

  @Post()
  @EnforceMemberLimit() // limite de membros da faixa do plano (log: só avisa; on: 403)
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

  // Dependentes do usuário logado (inscrição na catequese, etc.)
  @Get('me/dependents')
  async myDependents(@CurrentUser() user: any) {
    return this.membersService.listMyDependents(user.id);
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

  // Coordenação: membros do escopo. Fiel/voluntário: só o próprio cadastro e
  // os dependentes, com colunas básicas (o painel usa nos seletores da
  // catequese e das trocas) — regra no service.
  //
  // `?page=&pageSize=&search=` (C5 / ux-web-04): lista paginada
  // `{ items, total, page, pageSize }` com busca sem acento (nome, telefone por
  // dígitos, CPF) e `access` de cada item. Sem `page`: a resposta de sempre.
  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('communityId') communityId?: string,
    @Query('status') status?: MemberStatus,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    const paging = parsePaging(page, pageSize, search);
    if (paging) {
      return this.membersService.findPage(user, paging, {
        communityId: communityId || undefined,
        status: status || undefined,
      });
    }
    return this.membersService.findAll(user, communityId, status);
  }

  // Busca no cadastro: ferramenta da coordenação (piso: coordenador de pastoral)
  @Get('search')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  searchByName(
    @CurrentUser() user: any,
    @Query('name') name: string,
    @Query('communityId') communityId?: string,
  ) {
    return this.membersService.searchByName(name, communityId, user);
  }

  // Detecção de possíveis duplicados (nome + nascimento/telefone), respeitando escopo
  @Get('check-duplicates')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  checkDuplicates(
    @CurrentUser() user: any,
    @Query('fullName') fullName: string,
    @Query('birthDate') birthDate?: string,
    @Query('phone') phone?: string,
    @Query('communityId') communityId?: string,
    @Query('excludeId') excludeId?: string,
    @Query('cpf') cpf?: string,
  ) {
    return this.membersService.findPotentialDuplicates(
      { fullName, birthDate, phone, communityId, cpf },
      user,
      excludeId,
    );
  }

  // Importação de planilhas (C5): o navegador lê o CSV/XLSX e envia as linhas;
  // `dryRun` devolve a prévia por linha; `kind: 'TITHERS'` = membro + dizimista.
  // Limite de membros da faixa: mesmo guard do POST /members (log: só avisa)
  // e, com PLAN_ENFORCEMENT=on, o service recusa o lote que passaria da faixa.
  @Post('import')
  @EnforceMemberLimit()
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  importMembers(@Body() body: ImportMembersDto, @CurrentUser() user: any) {
    return this.memberImport.run(body, user);
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
