import { Body, Controller, Get, Param, Patch, Post, Query, Request, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TitheService } from './tithe.service';

/** Dízimo online (Fase 1: Pix da paróquia + conciliação pela tesouraria). */
@Controller('tithe')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TitheController {
  constructor(private readonly service: TitheService) {}

  // ===== fiel =====

  @Get('my')
  my(@Request() req: any) {
    return this.service.getMyTithe(req.user);
  }

  @Post('intents')
  createIntent(
    @Body() body: { amount: number; referenceMonth?: string; kind?: string },
    @Request() req: any,
  ) {
    return this.service.createIntent(req.user, body ?? ({} as any));
  }

  @Get('intents/:id/receipt.pdf')
  async receipt(@Param('id') id: string, @Res() res: Response, @Request() req: any) {
    const buffer = await this.service.receipt(id, req.user);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="comprovante-dizimo.pdf"',
      'Content-Length': String(buffer.length),
    });
    res.end(buffer);
  }

  @Get('intents/:id')
  getIntent(@Param('id') id: string, @Request() req: any) {
    return this.service.getIntent(id, req.user);
  }

  @Post('intents/:id/declare')
  declare(@Param('id') id: string, @Request() req: any) {
    return this.service.declareIntent(id, req.user);
  }

  @Post('intents/:id/cancel')
  cancel(@Param('id') id: string, @Request() req: any) {
    return this.service.cancelIntent(id, req.user);
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
  confirm(@Param('id') id: string, @Body() body: { receiptNumber?: string; date?: string }, @Request() req: any) {
    return this.service.confirmIntent(id, req.user, body ?? {});
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

  @Patch('config')
  @Roles(UserRole.PARISH_ADMIN)
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
    },
    @Request() req: any,
  ) {
    return this.service.updateConfig(req.user, body ?? {});
  }
}
