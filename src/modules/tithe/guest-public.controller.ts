import { Body, Controller, Get, HttpCode, Ip, Param, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { TitheGuestService } from './guest.service';

/** Doação de visitante — rotas públicas (sem login), limitadas por IP. */
@Controller('public/tithe')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class TitheGuestPublicController {
  constructor(private readonly service: TitheGuestService) {}

  @Get(':parishId')
  page(@Param('parishId') parishId: string) {
    return this.service.parishPage(parishId);
  }

  @Post(':parishId/gifts')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(@Param('parishId') parishId: string, @Body() body: Record<string, unknown>, @Ip() ip: string) {
    return this.service.create(parishId, body ?? {}, ip ?? null);
  }

  @Get('gifts/:token')
  status(@Param('token') token: string) {
    return this.service.status(token);
  }

  @Post('gifts/:token/declare')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  declare(@Param('token') token: string) {
    return this.service.declare(token);
  }

  @Get('gifts/:token/receipt.pdf')
  async receipt(@Param('token') token: string, @Res() res: Response) {
    const pdf = await this.service.receiptPdf(token);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="comprovante-oferta.pdf"');
    res.send(pdf);
  }
}
