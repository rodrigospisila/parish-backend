import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TitheThrottlerGuard } from './tithe-throttler.guard';
import { TitheAgentService } from './agent.service';

/** Modo agente (D4.2): contribuição presencial registrada na hora pela tesouraria. */
@Controller('tithe/agent')
@UseGuards(JwtAuthGuard, RolesGuard, TitheThrottlerGuard)
@Roles(UserRole.COMMUNITY_COORDINATOR)
export class TitheAgentController {
  constructor(private readonly service: TitheAgentService) {}

  @Get('members')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  search(@Query('q') q: string, @Request() req: any) {
    return this.service.searchMembers(req.user, q);
  }

  @Post('contributions')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  register(@Body() body: any, @Request() req: any) {
    return this.service.register(req.user, body ?? {});
  }

  @Get('recent')
  recent(@Request() req: any) {
    return this.service.recent(req.user);
  }

  @Post('contributions/:id/undo')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  undo(@Param('id') id: string, @Request() req: any) {
    return this.service.undo(req.user, id);
  }
}
