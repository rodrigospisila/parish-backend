import { Controller, Get, Res, UseGuards, Request } from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // Coordenação de comunidade ou superior (pároco/diocese)
  @Get('pastoral-overview')
  @Roles(UserRole.COMMUNITY_COORDINATOR)
  getPastoralOverview(@Request() req: any) {
    return this.reportsService.getPastoralOverview(req.user);
  }

  @Get('pastoral-overview.pdf')
  @Roles(UserRole.COMMUNITY_COORDINATOR)
  async exportPastoralOverviewPdf(@Res() res: Response, @Request() req: any) {
    const buffer = await this.reportsService.exportPastoralOverviewPdf(req.user);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="relatorio-pastoral.pdf"',
      'Content-Length': String(buffer.length),
    });
    res.end(buffer);
  }
}
