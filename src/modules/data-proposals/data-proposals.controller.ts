import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DataProposalsService, ProposalActor } from './data-proposals.service';
import { ApproveDataProposalDto } from './dto/approve-data-proposal.dto';
import { RejectDataProposalDto } from './dto/reject-data-proposal.dto';
import { BulkDataProposalsDto } from './dto/bulk-data-proposals.dto';

const actorOf = (user: any): ProposalActor | null =>
  user ? { id: user.id ?? user.userId ?? user.sub ?? null, email: user.email ?? null, role: user.role ?? null } : null;

/**
 * Fila de propostas de dados (fonte oficial) — só SYSTEM_ADMIN, revisada no
 * mapa do painel. Aprovar APLICA a mudança; rejeitar só marca.
 */
@Controller('platform/data-proposals')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SYSTEM_ADMIN)
export class DataProposalsController {
  constructor(private readonly service: DataProposalsService) {}

  @Get()
  list(
    @Query('status') status?: string,
    @Query('kind') kind?: string,
    @Query('batch') batch?: string,
    @Query('state') state?: string,
    @Query('city') city?: string,
    @Query('communityId') communityId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.list({ status, kind, batch, state, city, communityId, page, pageSize });
  }

  @Get('summary')
  summary() {
    return this.service.summary();
  }

  @Get('map')
  map(
    @Query('bbox') bbox?: string,
    @Query('status') status?: string,
    @Query('kind') kind?: string,
    @Query('batch') batch?: string,
  ) {
    return this.service.map({ bbox, status, kind, batch });
  }

  @Post('bulk')
  @HttpCode(200)
  bulk(@Body() dto: BulkDataProposalsDto, @CurrentUser() user: any) {
    return this.service.bulk(dto.ids, dto.action, dto.note, actorOf(user));
  }

  @Post(':id/approve')
  @HttpCode(200)
  approve(@Param('id') id: string, @Body() dto: ApproveDataProposalDto, @CurrentUser() user: any) {
    return this.service.approve(id, { note: dto.note, payload: dto.payload }, actorOf(user));
  }

  @Post(':id/reject')
  @HttpCode(200)
  reject(@Param('id') id: string, @Body() dto: RejectDataProposalDto, @CurrentUser() user: any) {
    return this.service.reject(id, { note: dto.note }, actorOf(user));
  }
}
