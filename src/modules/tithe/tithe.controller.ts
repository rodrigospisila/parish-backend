import { Body, Controller, Get, Param, Patch, Post, Query, Request, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Throttle } from '@nestjs/throttler';
import { TitheService } from './tithe.service';
import { TitheThrottlerGuard } from './tithe-throttler.guard';

/** Dízimo online (Fase 1: Pix da paróquia + conciliação pela tesouraria). */
@Controller('tithe')
@UseGuards(JwtAuthGuard, RolesGuard, TitheThrottlerGuard)
export class TitheController {
  constructor(private readonly service: TitheService) {}

  // ===== fiel =====

  @Get('my')
  my(@Request() req: any) {
    return this.service.getMyTithe(req.user);
  }

  @Get('my/qr')
  persistentQr(@Request() req: any) {
    return this.service.getPersistentQr(req.user);
  }

  @Get('my/qr.pdf')
  async persistentQrPdf(@Res() res: Response, @Request() req: any) {
    const buffer = await this.service.persistentQrPdf(req.user);
    this.sendPdf(res, buffer, 'meu-pix-dizimo.pdf');
  }

  @Get('my/statement.pdf')
  async myStatement(@Res() res: Response, @Request() req: any, @Query('year') year?: string) {
    const buffer = await this.service.annualStatement(req.user, Number(year) || new Date().getFullYear());
    this.sendPdf(res, buffer, `extrato-dizimo-${year || new Date().getFullYear()}.pdf`);
  }

  @Patch('my/preferences')
  preferences(@Body() body: { reminderDay?: number | null }, @Request() req: any) {
    return this.service.updatePreferences(req.user, body ?? {});
  }

  @Post('intents')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  createIntent(
    @Body() body: { amount: number; referenceMonth?: string; kind?: string; anonymous?: boolean },
    @Request() req: any,
  ) {
    return this.service.createIntent(req.user, body ?? ({} as any));
  }

  private sendPdf(res: Response, buffer: Buffer, filename: string) {
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    });
    res.end(buffer);
  }

  @Get('intents/:id/receipt.pdf')
  async receipt(@Param('id') id: string, @Res() res: Response, @Request() req: any) {
    const buffer = await this.service.receipt(id, req.user);
    this.sendPdf(res, buffer, 'comprovante-dizimo.pdf');
  }

  @Get('intents/:id')
  getIntent(@Param('id') id: string, @Request() req: any) {
    return this.service.getIntent(id, req.user);
  }

  @Post('intents/:id/declare')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  declare(@Param('id') id: string, @Request() req: any) {
    return this.service.declareIntent(id, req.user);
  }

  @Post('intents/:id/cancel')
  cancel(@Param('id') id: string, @Request() req: any) {
    return this.service.cancelIntent(id, req.user);
  }

  @Post('intents/:id/contest')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  contest(@Param('id') id: string, @Body() body: { note?: string }, @Request() req: any) {
    return this.service.contestIntent(id, req.user, body?.note);
  }

  // ===== tesouraria (COMMUNITY_COORDINATOR e acima) =====

  @Get('intents')
  @Roles(UserRole.COMMUNITY_COORDINATOR)
  list(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('communityId') communityId?: string,
    @Query('referenceMonth') referenceMonth?: string,
  ) {
    return this.service.listIntents(req.user, { status, communityId, referenceMonth });
  }

  @Post('intents/:id/confirm')
  @Roles(UserRole.COMMUNITY_COORDINATOR)
  confirm(
    @Param('id') id: string,
    @Body() body: { receiptNumber?: string; date?: string; amountPaid?: number; referenceMonth?: string },
    @Request() req: any,
  ) {
    return this.service.confirmIntent(id, req.user, body ?? {});
  }

  @Post('intents/:id/reopen')
  @Roles(UserRole.COMMUNITY_COORDINATOR)
  reopen(@Param('id') id: string, @Request() req: any) {
    return this.service.reopenIntent(id, req.user);
  }

  @Get('report')
  @Roles(UserRole.COMMUNITY_COORDINATOR)
  report(@Request() req: any, @Query('referenceMonth') referenceMonth?: string, @Query('communityId') communityId?: string) {
    return this.service.monthlyReport(req.user, { referenceMonth, communityId });
  }

  @Get('report.csv')
  @Roles(UserRole.COMMUNITY_COORDINATOR)
  async reportCsv(
    @Res() res: Response,
    @Request() req: any,
    @Query('referenceMonth') referenceMonth?: string,
    @Query('communityId') communityId?: string,
  ) {
    const csv = await this.service.monthlyReportCsv(req.user, { referenceMonth, communityId });
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="dizimo-mes.csv"' });
    res.end(csv);
  }

  @Get('tithers/:memberId/statement.pdf')
  @Roles(UserRole.COMMUNITY_COORDINATOR)
  async titherStatement(@Param('memberId') memberId: string, @Res() res: Response, @Request() req: any, @Query('year') year?: string) {
    const buffer = await this.service.annualStatement(req.user, Number(year) || new Date().getFullYear(), memberId);
    this.sendPdf(res, buffer, `extrato-dizimo-${year || new Date().getFullYear()}.pdf`);
  }

  @Post('intents/:id/reject')
  @Roles(UserRole.COMMUNITY_COORDINATOR)
  reject(@Param('id') id: string, @Body() body: { reason?: string }, @Request() req: any) {
    return this.service.rejectIntent(id, req.user, body?.reason);
  }

  // ===== configuração (PARISH_ADMIN e acima) =====

  @Get('config')
  @Roles(UserRole.PARISH_ADMIN)
  getConfig(@Request() req: any, @Query('parishId') parishId?: string) {
    return this.service.getConfig(req.user, parishId || undefined);
  }

  @Get('config/institutional-qr')
  @Roles(UserRole.PARISH_ADMIN)
  institutionalQr(@Request() req: any, @Query('parishId') parishId?: string) {
    return this.service.getInstitutionalQr(req.user, parishId || undefined);
  }

  @Get('config/institutional-qr.pdf')
  @Roles(UserRole.PARISH_ADMIN)
  async institutionalQrPdf(@Res() res: Response, @Request() req: any, @Query('parishId') parishId?: string) {
    const buffer = await this.service.institutionalQrPdf(req.user, parishId || undefined);
    this.sendPdf(res, buffer, 'pix-paroquia.pdf');
  }

  @Patch('config')
  @Roles(UserRole.PARISH_ADMIN)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  updateConfig(
    @Body()
    body: {
      parishId?: string;
      titheEnabled?: boolean;
      pixKey?: string | null;
      pixKeyType?: string | null;
      pixMerchantName?: string | null;
      pixMerchantCity?: string | null;
      titheMessage?: string | null;
      currentPassword?: string;
    },
    @Request() req: any,
  ) {
    return this.service.updateConfig(req.user, body ?? {});
  }
}
