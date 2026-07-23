import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.COMMUNITY_COORDINATOR) // coordenação de comunidade ou superior
export class FinanceController {
  constructor(private readonly service: FinanceService) {}

  @Post('transactions')
  createTransaction(@Body() dto: any, @Request() req: any) {
    return this.service.createTransaction(dto, req.user);
  }

  @Get('transactions')
  listTransactions(
    @Request() req: any,
    @Query('communityId') communityId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.listTransactions(req.user, { communityId, from, to });
  }

  @Get('summary')
  summary(
    @Request() req: any,
    @Query('communityId') communityId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.summary(req.user, { communityId, from, to });
  }

  // ===== Dízimo =====

  @Post('tithers')
  registerTither(@Body() dto: any, @Request() req: any) {
    return this.service.registerTither(dto, req.user);
  }

  @Get('tithers')
  listTithers(@Request() req: any) {
    return this.service.listTithers(req.user);
  }

  @Post('tithe/contributions')
  addContribution(@Body() dto: any, @Request() req: any) {
    return this.service.addContribution(dto, req.user);
  }

  @Get('tithe/contributions')
  contributionsByMonth(@Query('referenceMonth') referenceMonth: string, @Request() req: any) {
    return this.service.contributionsByMonth(referenceMonth, req.user);
  }
}
