import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ClergyMessagesService } from './clergy-messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlanFeatureGuard } from '../plans/plan-feature.guard';
import { PlanResource, RequiresFeature } from '../plans/plan.decorators';

/**
 * Palavra do Pastor — mensagens/vídeos do clero.
 * Feed aberto a qualquer usuário logado (filtrado pelo alcance);
 * publicação restrita a clero/coordenação (validado no service).
 *
 * Recurso PAGO da comunidade (`clergy-messages`), inclusive o feed do fiel:
 * o plano sai do alvo da mensagem (comunidade/paróquia/pastoral), do
 * `communityId` da query, ou do usuário.
 */
@Controller('clergy-messages')
@UseGuards(JwtAuthGuard, PlanFeatureGuard)
@RequiresFeature('clergy-messages')
export class ClergyMessagesController {
  constructor(private readonly service: ClergyMessagesService) {}

  // communityId/parishId do body o guard acha sozinho; pastoral → comunidade dela
  @Post()
  @PlanResource('communityPastoral:body.communityPastoralId')
  create(@Body() dto: any, @Request() req: any) {
    return this.service.create(dto, req.user);
  }

  @Get()
  feed(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('communityId') communityId?: string,
  ) {
    return this.service.feed(req.user, limit ? Math.min(Number(limit) || 50, 100) : 50, communityId);
  }

  @Get('mine')
  mine(@Request() req: any) {
    return this.service.listMine(req.user);
  }

  @Delete(':id')
  @PlanResource('clergyMessage')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.service.remove(id, req.user);
  }
}
