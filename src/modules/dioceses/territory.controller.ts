import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TerritoryService } from './territory.service';

/**
 * Cascata leve para escolher a comunidade (app e painel) — qualquer usuário
 * logado. Respostas pequenas (dezenas a centenas de linhas por nível); limite
 * próprio folgado, acima do teto geral, porque cada toque no seletor é uma
 * chamada e muitos fiéis saem pelo mesmo IP (Wi-Fi da paróquia).
 */
@Controller('territory')
@UseGuards(JwtAuthGuard)
@Throttle({ default: { limit: 1000, ttl: 60_000 } })
export class TerritoryController {
  constructor(private readonly territory: TerritoryService) {}

  @Get('dioceses')
  dioceses() {
    return this.territory.dioceses();
  }

  @Get('dioceses/:id/parishes')
  parishes(@Param('id') dioceseId: string) {
    return this.territory.parishes(dioceseId);
  }

  @Get('parishes/:id/communities')
  communities(@Param('id') parishId: string) {
    return this.territory.communities(parishId);
  }
}
