import { Controller, Get, Post, Patch, Body, Param, Query, Res, UseGuards, Request } from '@nestjs/common';
import type { Response } from 'express';
import { SacramentProcessesService } from './sacrament-processes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SacramentProcessStatus, UserRole } from '@prisma/client';

@Controller('sacrament-processes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.COMMUNITY_COORDINATOR)
export class SacramentProcessesController {
  constructor(private readonly service: SacramentProcessesService) {}

  @Post()
  create(@Body() dto: any, @Request() req: any) {
    return this.service.create(dto, req.user);
  }

  @Get()
  list(@Request() req: any, @Query('status') status?: SacramentProcessStatus) {
    return this.service.list(req.user, status);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: SacramentProcessStatus }, @Request() req: any) {
    return this.service.updateStatus(id, body.status, req.user);
  }

  @Patch(':id/checklist')
  updateChecklist(@Param('id') id: string, @Body() body: { documentsChecklist: unknown }, @Request() req: any) {
    return this.service.updateChecklist(id, body.documentsChecklist, req.user);
  }

  @Patch(':id/celebrate')
  celebrate(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    return this.service.celebrate(id, dto, req.user);
  }

  @Get(':id/certificate.pdf')
  async certificate(@Param('id') id: string, @Res() res: Response, @Request() req: any) {
    const buffer = await this.service.certificate(id, req.user);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="certidao.pdf"',
      'Content-Length': String(buffer.length),
    });
    res.end(buffer);
  }
}
