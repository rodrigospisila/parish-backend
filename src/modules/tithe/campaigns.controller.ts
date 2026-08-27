import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { UserRole } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TitheThrottlerGuard } from './tithe-throttler.guard';
import { TitheCampaignsService } from './campaigns.service';

/** Fundos e campanhas do dízimo (D4.1). */
@Controller('tithe/campaigns')
@UseGuards(JwtAuthGuard, RolesGuard, TitheThrottlerGuard)
export class TitheCampaignsController {
  constructor(private readonly service: TitheCampaignsService) {}

  // ===== fiel =====

  @Get()
  list(@Request() req: any) {
    return this.service.listForMember(req.user);
  }

  @Post(':id/pledge')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  pledge(@Param('id') id: string, @Body() body: { amount: number; note?: string | null }, @Request() req: any) {
    return this.service.setPledge(req.user, id, body ?? ({} as any));
  }

  @Delete(':id/pledge')
  cancelPledge(@Param('id') id: string, @Request() req: any) {
    return this.service.cancelPledge(req.user, id);
  }

  @Get(':id/qr')
  qr(@Param('id') id: string, @Request() req: any) {
    return this.service.shareQr(req.user, id);
  }

  // ===== tesouraria =====

  @Get('manage')
  @Roles(UserRole.COMMUNITY_COORDINATOR)
  manage(@Request() req: any, @Query('parishId') parishId?: string, @Query('status') status?: string) {
    return this.service.listManage(req.user, { parishId: parishId || undefined, status });
  }

  @Post()
  @Roles(UserRole.COMMUNITY_COORDINATOR)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(@Body() body: any, @Request() req: any) {
    return this.service.create(req.user, body ?? {});
  }

  @Patch(':id')
  @Roles(UserRole.COMMUNITY_COORDINATOR)
  update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.service.update(req.user, id, body ?? {});
  }

  @Post(':id/activate')
  @Roles(UserRole.COMMUNITY_COORDINATOR)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  activate(@Param('id') id: string, @Request() req: any) {
    return this.service.activate(req.user, id);
  }

  @Post(':id/close')
  @Roles(UserRole.COMMUNITY_COORDINATOR)
  close(@Param('id') id: string, @Request() req: any) {
    return this.service.close(req.user, id);
  }

  @Post(':id/entries')
  @Roles(UserRole.COMMUNITY_COORDINATOR)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  addEntry(
    @Param('id') id: string,
    @Body() body: { amount: number; date?: string; description?: string | null; communityId?: string | null; method?: string | null },
    @Request() req: any,
  ) {
    return this.service.addEntry(req.user, id, body ?? ({} as any));
  }

  @Get(':id/report')
  @Roles(UserRole.COMMUNITY_COORDINATOR)
  report(@Param('id') id: string, @Request() req: any) {
    return this.service.report(req.user, id);
  }

  @Get(':id/report.csv')
  @Roles(UserRole.COMMUNITY_COORDINATOR)
  async reportCsv(@Param('id') id: string, @Res() res: Response, @Request() req: any) {
    const csv = await this.service.reportCsv(req.user, id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="campanha-${id}.csv"`);
    res.send(csv);
  }

  @Get(':id/qr.pdf')
  @Roles(UserRole.COMMUNITY_COORDINATOR)
  async qrPdf(@Param('id') id: string, @Res() res: Response, @Request() req: any) {
    const pdf = await this.service.qrPdf(req.user, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="campanha-${id}-qr.pdf"`);
    res.send(pdf);
  }
}
