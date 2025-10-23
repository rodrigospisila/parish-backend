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
import { PastoralsService } from './pastorals.service';
import { CreatePastoralDto } from './dto/create-pastoral.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('pastorals')
@UseGuards(JwtAuthGuard)
export class PastoralsController {
  constructor(private readonly pastoralsService: PastoralsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  create(@Body() createPastoralDto: CreatePastoralDto) {
    return this.pastoralsService.create(createPastoralDto);
  }

  @Get()
  findAll(@Query('communityId') communityId?: string) {
    return this.pastoralsService.findAll(communityId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pastoralsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  update(@Param('id') id: string, @Body() updateData: Partial<CreatePastoralDto>) {
    return this.pastoralsService.update(id, updateData);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DIOCESAN_ADMIN, UserRole.PARISH_ADMIN)
  remove(@Param('id') id: string) {
    return this.pastoralsService.remove(id);
  }

  // ========== GESTÃO DE MEMBROS ==========

  @Post('members')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  addMember(@Body() addMemberDto: AddMemberDto) {
    return this.pastoralsService.addMember(addMemberDto);
  }

  @Delete(':pastoralId/members/:memberId')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
    UserRole.PASTORAL_COORDINATOR,
  )
  removeMember(
    @Param('pastoralId') pastoralId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.pastoralsService.removeMember(pastoralId, memberId);
  }

  @Patch(':pastoralId/members/:memberId/coordinator')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  setCoordinator(
    @Param('pastoralId') pastoralId: string,
    @Param('memberId') memberId: string,
    @Body('isCoordinator') isCoordinator: boolean,
  ) {
    return this.pastoralsService.setCoordinator(pastoralId, memberId, isCoordinator);
  }

  // ========== RELATÓRIOS ==========

  @Get(':id/coordinators')
  getCoordinators(@Param('id') id: string) {
    return this.pastoralsService.getCoordinators(id);
  }

  @Get(':id/members')
  getMembersByPastoral(@Param('id') id: string) {
    return this.pastoralsService.getMembersByPastoral(id);
  }
}

