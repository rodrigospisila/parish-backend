import { Body, Controller, Get, Param, Post, Query, Request, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { UserRole } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TitheThrottlerGuard } from './tithe-throttler.guard';
import { TitheRetentionService } from './retention.service';

/** Retenção e inadimplência (D4.4): estágios, tendência e ações pastorais — dado individual, só tesouraria. */
@Controller('tithe/retention')
@UseGuards(JwtAuthGuard, RolesGuard, TitheThrottlerGuard)
@Roles(UserRole.COMMUNITY_COORDINATOR)
export class TitheRetentionController {
  constructor(private readonly service: TitheRetentionService) {}

  @Get('summary')
  summary(@Request() req: any, @Query('communityId') communityId?: string) {
    return this.service.summary(req.user, { communityId: communityId || undefined });
  }

  @Get()
  list(@Request() req: any, @Query('communityId') communityId?: string, @Query('stage') stage?: string, @Query('q') q?: string) {
    return this.service.list(req.user, { communityId: communityId || undefined, stage, q });
  }

  @Get('export.csv')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async csv(@Res() res: Response, @Request() req: any, @Query('communityId') communityId?: string, @Query('stage') stage?: string) {
    const csv = await this.service.csv(req.user, { communityId: communityId || undefined, stage });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="dizimistas-retencao.csv"');
    res.send(csv);
  }

  @Get(':memberId/actions')
  actions(@Param('memberId') memberId: string, @Request() req: any) {
    return this.service.actions(req.user, memberId);
  }

  @Post(':memberId/actions')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  addAction(@Param('memberId') memberId: string, @Body() body: { type?: string; note?: string | null }, @Request() req: any) {
    return this.service.addAction(req.user, memberId, body ?? {});
  }
}
