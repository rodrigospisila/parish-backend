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
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
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
  )
  create(@Body() createMemberDto: CreateMemberDto) {
    return this.membersService.create(createMemberDto);
  }

  @Get()
  findAll(
    @Query('communityId') communityId?: string,
    @Query('status') status?: MemberStatus,
  ) {
    return this.membersService.findAll(communityId, status);
  }

  @Get('search')
  searchByName(
    @Query('name') name: string,
    @Query('communityId') communityId?: string,
  ) {
    return this.membersService.searchByName(name, communityId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.membersService.findOne(id);
  }

  @Patch(':id')
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  update(@Param('id') id: string, @Body() updateMemberDto: UpdateMemberDto) {
    return this.membersService.update(id, updateMemberDto);
  }

  @Delete(':id')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.DIOCESAN_ADMIN, UserRole.PARISH_ADMIN)
  remove(@Param('id') id: string) {
    return this.membersService.remove(id);
  }

  // LGPD: Exportar dados
  @Get(':id/export')
  exportData(@Param('id') id: string) {
    return this.membersService.exportMemberData(id);
  }

  // LGPD: Direito ao esquecimento
  @Post(':id/anonymize')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.DIOCESAN_ADMIN, UserRole.PARISH_ADMIN)
  anonymize(@Param('id') id: string) {
    return this.membersService.anonymizeMember(id);
  }

  // LGPD: Atualizar consentimento
  @Patch(':id/consent')
  updateConsent(
    @Param('id') id: string,
    @Body('consentGiven') consentGiven: boolean,
  ) {
    return this.membersService.updateConsent(id, consentGiven);
  }
}

