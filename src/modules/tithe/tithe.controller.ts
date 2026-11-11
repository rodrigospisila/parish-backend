import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Throttle } from '@nestjs/throttler';
import { TitheService } from './tithe.service';
import { TitheThrottlerGuard } from './tithe-throttler.guard';
import { PlanFeatureGuard } from '../plans/plan-feature.guard';
import { PlanResource, RequiresFeature, SkipPlanCheck } from '../plans/plan.decorators';

/**
 * Dízimo online (Fase 1: Pix da paróquia + conciliação pela tesouraria).
 *
 * Recurso PAGO de nível PARÓQUIA (`tithe`): passa se alguma comunidade da
 * paróquia tiver acesso. Regra: sem plano a paróquia não CRIA nada novo
 * (contribuição, recorrência, QR fixo, setup do provedor), mas dinheiro que já
 * entrou nunca fica preso — tudo que é VER, CONCILIAR e ENCERRAR o que já
 * existe fica aberto com `@SkipPlanCheck()`:
 *  - fiel: histórico (`GET my`), extrato anual, consultar/recibo/declarar/
 *    cancelar/contestar uma contribuição, ver/cancelar o dízimo automático;
 *  - tesouraria: listar, confirmar, recusar, reabrir e sincronizar as
 *    contribuições, relatório do mês (tela e CSV) e extrato do dizimista;
 *  - configuração: ler e alterar (`GET/PATCH config`) — para a paróquia poder
 *    DESLIGAR o recebimento/WhatsApp sem plano; LIGAR algo novo sem plano é
 *    recusado no service (`TitheService.updateConfig`, só com
 *    PLAN_ENFORCEMENT=on).
 * Nas rotas abertas o escopo (comunidade/paróquia) continua conferido no
 * service. Os webhooks (tithe-webhook, tithe-whatsapp) são outros controllers,
 * sem guard.
 */
@Controller('tithe')
@UseGuards(JwtAuthGuard, RolesGuard, TitheThrottlerGuard, PlanFeatureGuard)
@RequiresFeature('tithe', { level: 'parish' })
export class TitheController {
  constructor(private readonly service: TitheService) {}

  // ===== fiel =====

  // Aberta: histórico do que o fiel já contribuiu (criar segue pago)
  @Get('my')
  @SkipPlanCheck()
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

  // Aberta: extrato anual do que já foi pago (imposto de renda, prestação de contas)
  @Get('my/statement.pdf')
  @SkipPlanCheck()
  async myStatement(@Res() res: Response, @Request() req: any, @Query('year') year?: string) {
    const buffer = await this.service.annualStatement(req.user, Number(year) || new Date().getFullYear());
    this.sendPdf(res, buffer, `extrato-dizimo-${year || new Date().getFullYear()}.pdf`);
  }

  @Patch('my/preferences')
  preferences(@Body() body: { reminderDay?: number | null; whatsappOptIn?: boolean }, @Request() req: any) {
    return this.service.updatePreferences(req.user, body ?? {});
  }

  // ===== dízimo automático (recorrência pelo provedor) =====

  // Aberta: o fiel precisa enxergar a recorrência que já existe (e segue cobrando) para poder cancelar
  @Get('schedules/mine')
  @SkipPlanCheck()
  mySchedule(@Request() req: any) {
    return this.service.getMySchedule(req.user);
  }

  @Post('schedules')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  createSchedule(@Body() body: { amount: number; dayOfMonth: number; mode?: string }, @Request() req: any) {
    return this.service.createSchedule(req.user, body ?? ({} as any));
  }

  // Aberta: cancelar o dízimo automático nunca depende do plano (a cobrança continuaria)
  @Delete('schedules/:id')
  @SkipPlanCheck()
  cancelSchedule(@Param('id') id: string, @Request() req: any) {
    return this.service.cancelSchedule(req.user, id);
  }

  @Post('intents')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  createIntent(
    @Body() body: { amount: number; referenceMonth?: string; kind?: string; anonymous?: boolean; paymentMethod?: string; campaignId?: string | null },
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

  // ----- acompanhamento de contribuição JÁ criada: aberto mesmo sem plano -----

  // Aberta: comprovante de dinheiro já entregue
  @Get('intents/:id/receipt.pdf')
  @SkipPlanCheck()
  async receipt(@Param('id') id: string, @Res() res: Response, @Request() req: any) {
    const buffer = await this.service.receipt(id, req.user);
    this.sendPdf(res, buffer, 'comprovante-dizimo.pdf');
  }

  // Aberta: situação/QR de uma contribuição em andamento
  @Get('intents/:id')
  @SkipPlanCheck()
  getIntent(@Param('id') id: string, @Request() req: any) {
    return this.service.getIntent(id, req.user);
  }

  // Aberta: "já paguei" de um Pix que o fiel já fez
  @Post('intents/:id/declare')
  @SkipPlanCheck()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  declare(@Param('id') id: string, @Request() req: any) {
    return this.service.declareIntent(id, req.user);
  }

  // Aberta: desistir de uma contribuição em aberto
  @Post('intents/:id/cancel')
  @SkipPlanCheck()
  cancel(@Param('id') id: string, @Request() req: any) {
    return this.service.cancelIntent(id, req.user);
  }

  // Aberta: contestar a recusa de um pagamento que o fiel diz ter feito
  @Post('intents/:id/contest')
  @SkipPlanCheck()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  contest(@Param('id') id: string, @Body() body: { note?: string }, @Request() req: any) {
    return this.service.contestIntent(id, req.user, body?.note);
  }

  // ===== tesouraria (COMMUNITY_COORDINATOR e acima) =====
  // Conciliação do que JÁ existe: aberta mesmo sem plano (o escopo é do service)

  @Get('intents')
  @SkipPlanCheck()
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
  @SkipPlanCheck()
  @PlanResource('titheIntent')
  @Roles(UserRole.COMMUNITY_COORDINATOR)
  confirm(
    @Param('id') id: string,
    @Body() body: { receiptNumber?: string; date?: string; amountPaid?: number; referenceMonth?: string },
    @Request() req: any,
  ) {
    return this.service.confirmIntent(id, req.user, body ?? {});
  }

  @Post('intents/:id/reopen')
  @SkipPlanCheck()
  @PlanResource('titheIntent')
  @Roles(UserRole.COMMUNITY_COORDINATOR)
  reopen(@Param('id') id: string, @Request() req: any) {
    return this.service.reopenIntent(id, req.user);
  }

  /** Consulta o provedor sobre um Pix dinâmico (sem esperar o webhook). */
  @Post('intents/:id/sync')
  @SkipPlanCheck()
  @PlanResource('titheIntent')
  @Roles(UserRole.COMMUNITY_COORDINATOR)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  sync(@Param('id') id: string, @Request() req: any) {
    return this.service.syncIntentForFinance(id, req.user);
  }

  @Get('report')
  @SkipPlanCheck()
  @Roles(UserRole.COMMUNITY_COORDINATOR)
  report(@Request() req: any, @Query('referenceMonth') referenceMonth?: string, @Query('communityId') communityId?: string) {
    return this.service.monthlyReport(req.user, { referenceMonth, communityId });
  }

  @Get('report.csv')
  @SkipPlanCheck()
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

  // Aberta: extrato do que o dizimista já pagou
  @Get('tithers/:memberId/statement.pdf')
  @SkipPlanCheck()
  @PlanResource('member:params.memberId')
  @Roles(UserRole.COMMUNITY_COORDINATOR)
  async titherStatement(@Param('memberId') memberId: string, @Res() res: Response, @Request() req: any, @Query('year') year?: string) {
    const buffer = await this.service.annualStatement(req.user, Number(year) || new Date().getFullYear(), memberId);
    this.sendPdf(res, buffer, `extrato-dizimo-${year || new Date().getFullYear()}.pdf`);
  }

  @Post('intents/:id/reject')
  @SkipPlanCheck()
  @PlanResource('titheIntent')
  @Roles(UserRole.COMMUNITY_COORDINATOR)
  reject(@Param('id') id: string, @Body() body: { reason?: string }, @Request() req: any) {
    return this.service.rejectIntent(id, req.user, body?.reason);
  }

  // ===== configuração (PARISH_ADMIN e acima) =====

  // Aberta: a administração precisa VER a configuração para poder desligar
  @Get('config')
  @SkipPlanCheck()
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

  // Aberta para DESLIGAR/corrigir; ativar algo novo sem plano é recusado no service
  @Patch('config')
  @SkipPlanCheck()
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
      paymentProvider?: string | null;
      providerEnv?: string | null;
      providerApiKey?: string | null;
      providerWebhookSecret?: string | null;
      feePolicy?: string | null;
      feeFixed?: number | null;
      feePercent?: number | null;
      whatsappEnabled?: boolean;
    },
    @Request() req: any,
  ) {
    return this.service.updateConfig(req.user, body ?? {});
  }

  @Post('config/webhook-token')
  @Roles(UserRole.PARISH_ADMIN)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  rotateWebhookToken(@Body() body: { parishId?: string }, @Request() req: any) {
    return this.service.rotateWebhookToken(req.user, body?.parishId || undefined);
  }

  /** Confere/refaz o setup da conta no provedor (chave Pix, webhook). */
  @Post('config/provider-setup')
  @Roles(UserRole.PARISH_ADMIN)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  providerSetup(@Body() body: { parishId?: string }, @Request() req: any) {
    return this.service.providerSetup(req.user, body?.parishId || undefined);
  }
}
