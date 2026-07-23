import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { SaintsService } from './saints.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Catálogo de santos + padroeiros.
 * Leitura aberta a qualquer usuário logado; escrita validada no service
 * (catálogo: SYSTEM/DIOCESAN_ADMIN; vínculo: administrador do nível).
 */
@Controller('saints')
@UseGuards(JwtAuthGuard)
export class SaintsController {
  constructor(private readonly service: SaintsService) {}

  @Post()
  create(@Body() dto: any, @Request() req: any) {
    return this.service.create(dto, req.user);
  }

  @Get()
  list(@Query('search') search?: string, @Query('month') month?: string) {
    return this.service.list({ search, month: month ? Number(month) : undefined });
  }

  @Get('today')
  ofTheDay(@Query('date') date?: string) {
    return this.service.ofTheDay(date);
  }

  // Padroeiros de uma diocese/paróquia/comunidade (ou de todo um nível via ?level=)
  @Get('patronages')
  listByEntity(
    @Query('dioceseId') dioceseId?: string,
    @Query('parishId') parishId?: string,
    @Query('communityId') communityId?: string,
    @Query('level') level?: 'diocese' | 'parish' | 'community',
  ) {
    return this.service.listByEntity({ dioceseId, parishId, communityId, level });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.getWithPatronages(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    return this.service.update(id, dto, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.service.remove(id, req.user);
  }

  @Post(':id/patronages')
  addPatronage(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    return this.service.addPatronage(id, dto, req.user);
  }

  @Delete('patronages/:patronageId')
  removePatronage(@Param('patronageId') patronageId: string, @Request() req: any) {
    return this.service.removePatronage(patronageId, req.user);
  }
}
