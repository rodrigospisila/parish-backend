import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Logger,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserThrottlerGuard } from '../auth/guards/app-throttler.guard';
import { ParishAccountService } from './parish-account.service';
import { ClosureRequestDto, ConfirmPasswordDto } from './dto/parish-account.dto';

/**
 * Dados da conta da paróquia (C5 — saas-implantacao-19): exportação completa e
 * pedido de encerramento. Piso PARISH_ADMIN no RolesGuard; o service exige o
 * TITULAR da paróquia (parishHolder) ou SYSTEM_ADMIN, lido do banco.
 */
@Controller('parishes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PARISH_ADMIN)
export class ParishAccountController {
  private readonly logger = new Logger(ParishAccountController.name);

  constructor(private readonly parishAccount: ParishAccountService) {}

  /**
   * Exportação de TODOS os dados da paróquia (C5 — saas-implantacao-19): ZIP
   * com um CSV (UTF-8 com BOM, `;`) por entidade + LEIA-ME.txt, escrito em
   * stream. Titular da paróquia ou SYSTEM_ADMIN, com a senha; auditado.
   * Erros de autorização/senha saem como JSON (antes de começar o arquivo).
   */
  @Post(':id/export')
  @HttpCode(200)
  @UseGuards(UserThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async exportData(
    @Param('id') id: string,
    @Body() body: ConfirmPasswordDto,
    @CurrentUser() user: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const ctx = await this.parishAccount.assertHolder(id, user, body.password, req.ip);
    res.status(200);
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${this.parishAccount.exportFileName(ctx)}"`,
      'Cache-Control': 'no-store',
    });
    try {
      await this.parishAccount.streamExport(ctx, res);
      res.end();
    } catch (error) {
      // Cabeçalho já enviado: não há como mandar JSON — corta a conexão (o
      // navegador acusa download incompleto em vez de um ZIP truncado "válido")
      this.logger.error(`Exportação da paróquia ${id} interrompida: ${error}`);
      res.destroy();
    }
  }

  /**
   * Pedido de encerramento da conta (efetivo em 30 dias; nada é apagado
   * automaticamente; a plataforma é avisada). Titular ou SYSTEM_ADMIN, com senha.
   */
  @Post(':id/closure-request')
  @UseGuards(UserThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  requestClosure(
    @Param('id') id: string,
    @Body() body: ClosureRequestDto,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.parishAccount.requestClosure(id, user, body.password, body.reason ?? '', req.ip);
  }

  /** Cancela o pedido de encerramento (limpa os campos). */
  @Delete(':id/closure-request')
  cancelClosure(@Param('id') id: string, @CurrentUser() user: any) {
    return this.parishAccount.cancelClosure(id, user);
  }
}
