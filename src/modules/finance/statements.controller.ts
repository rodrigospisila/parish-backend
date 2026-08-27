import { Body, Controller, Get, Param, Patch, Post, Query, Request, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { UserRole } from '@prisma/client';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { StatementsService } from './statements.service';

/** Balancete mensal — gestão (gerar, aprovar em nome do CAEP, publicar, exportar). */
@Controller('finance/statements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StatementsController {
  constructor(private readonly service: StatementsService) {}

  // ===== fiel (publicados) — antes das rotas com :id =====

  @Get('published')
  published(@Request() req: any) {
    return this.service.listPublished(req.user);
  }

  @Get('published/:id/pdf')
  async publishedPdf(@Param('id') id: string, @Res() res: Response, @Request() req: any) {
    const pdf = await this.service.publishedPdf(req.user, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="balancete-${id}.pdf"`);
    res.send(pdf);
  }

  // ===== gestão =====

  @Get()
  @Roles(UserRole.COMMUNITY_COORDINATOR)
  list(@Request() req: any, @Query('parishId') parishId?: string, @Query('communityId') communityId?: string) {
    return this.service.list(req.user, { parishId: parishId || undefined, communityId: communityId || undefined });
  }

  @Get('cost-centers')
  @Roles(UserRole.COMMUNITY_COORDINATOR)
  costCenters(@Request() req: any, @Query('parishId') parishId?: string) {
    return this.service.costCenters(req.user, parishId || undefined);
  }

  @Post('generate')
  @Roles(UserRole.COMMUNITY_COORDINATOR)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  generate(@Body() body: { referenceMonth: string; parishId?: string; communityId?: string | null }, @Request() req: any) {
    return this.service.generate(req.user, body ?? ({} as any));
  }

  @Get(':id')
  @Roles(UserRole.COMMUNITY_COORDINATOR)
  get(@Param('id') id: string, @Request() req: any) {
    return this.service.get(req.user, id);
  }

  @Patch(':id')
  @Roles(UserRole.COMMUNITY_COORDINATOR)
  notes(@Param('id') id: string, @Body() body: { notes?: string | null }, @Request() req: any) {
    return this.service.updateNotes(req.user, id, body ?? {});
  }

  @Post(':id/approve')
  @Roles(UserRole.PARISH_ADMIN)
  approve(@Param('id') id: string, @Body() body: { approvedByName?: string | null }, @Request() req: any) {
    return this.service.approve(req.user, id, body ?? {});
  }

  @Post(':id/publish')
  @Roles(UserRole.PARISH_ADMIN)
  publish(@Param('id') id: string, @Request() req: any) {
    return this.service.publish(req.user, id);
  }

  @Post(':id/unpublish')
  @Roles(UserRole.PARISH_ADMIN)
  unpublish(@Param('id') id: string, @Request() req: any) {
    return this.service.unpublish(req.user, id);
  }

  @Get(':id/pdf')
  @Roles(UserRole.COMMUNITY_COORDINATOR)
  async pdf(@Param('id') id: string, @Res() res: Response, @Request() req: any) {
    const pdf = await this.service.pdfForManage(req.user, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="balancete-${id}.pdf"`);
    res.send(pdf);
  }

  @Get(':id/export.csv')
  @Roles(UserRole.COMMUNITY_COORDINATOR)
  async exportCsv(@Param('id') id: string, @Res() res: Response, @Request() req: any) {
    const { filename, csv } = await this.service.exportCsv(req.user, id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }
}
