import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JoinRequestsService } from './join-requests.service';

/** "Quero participar" — pedidos de ingresso em pastorais (Onda 4). */
@Controller('pastorals')
@UseGuards(JwtAuthGuard)
export class JoinRequestsController {
  constructor(private readonly service: JoinRequestsService) {}

  // Fiel pede para participar (escopo validado no service)
  @Post('community/:id/join-requests')
  requestJoin(@Param('id') id: string, @Body() body: { message?: string }, @Request() req: any) {
    return this.service.requestJoin(id, req.user, body?.message);
  }

  // Coordenação lista os pedidos da pastoral (?status=PENDING|APPROVED|REJECTED|ALL)
  @Get('community/:id/join-requests')
  list(@Param('id') id: string, @Request() req: any, @Query('status') status?: string) {
    return this.service.listForPastoral(id, req.user, status);
  }

  // Meus pedidos + pastorais das quais já participo
  @Get('join-requests/mine')
  mine(@Request() req: any) {
    return this.service.mine(req.user);
  }

  @Patch('join-requests/:id/approve')
  approve(@Param('id') id: string, @Request() req: any) {
    return this.service.review(id, true, req.user);
  }

  @Patch('join-requests/:id/reject')
  reject(@Param('id') id: string, @Body() body: { reason?: string }, @Request() req: any) {
    return this.service.review(id, false, req.user, body?.reason);
  }
}
