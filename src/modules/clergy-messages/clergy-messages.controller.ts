import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ClergyMessagesService } from './clergy-messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Palavra do Pastor — mensagens/vídeos do clero.
 * Feed aberto a qualquer usuário logado (filtrado pelo alcance);
 * publicação restrita a clero/coordenação (validado no service).
 */
@Controller('clergy-messages')
@UseGuards(JwtAuthGuard)
export class ClergyMessagesController {
  constructor(private readonly service: ClergyMessagesService) {}

  @Post()
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
  remove(@Param('id') id: string, @Request() req: any) {
    return this.service.remove(id, req.user);
  }
}
