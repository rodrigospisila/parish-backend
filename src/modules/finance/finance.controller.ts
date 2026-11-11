import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { PlanFeatureGuard } from '../plans/plan-feature.guard';
import { PlanResource, RequiresFeature } from '../plans/plan.decorators';

// Recurso pago da comunidade (`finance`). A comunidade vem de `communityId`/
// `parishId` em query/body (o guard procura sozinho) ou, sem eles, do usuário.
@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard, PlanFeatureGuard)
@RequiresFeature('finance')
@Roles(UserRole.COMMUNITY_COORDINATOR) // coordenação de comunidade ou superior
export class FinanceController {
  constructor(private readonly service: FinanceService) {}

  @Post('transactions')
  createTransaction(@Body() dto: CreateTransactionDto, @Request() req: any) {
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

  // ===== Dízimo (cadastro de dizimista e cadernos): feature `tithe`, nível
  // paróquia — a mesma da importação de dizimistas e do módulo /tithe =====

  @Post('tithers')
  @RequiresFeature('tithe', { level: 'parish' })
  @PlanResource('member:body.memberId')
  registerTither(@Body() dto: any, @Request() req: any) {
    return this.service.registerTither(dto, req.user);
  }

  @Get('tithers')
  @RequiresFeature('tithe', { level: 'parish' })
  listTithers(@Request() req: any) {
    return this.service.listTithers(req.user);
  }

  @Post('tithe/contributions')
  @RequiresFeature('tithe', { level: 'parish' })
  addContribution(@Body() dto: any, @Request() req: any) {
    return this.service.addContribution(dto, req.user);
  }

  @Get('tithe/contributions')
  @RequiresFeature('tithe', { level: 'parish' })
  contributionsByMonth(@Query('referenceMonth') referenceMonth: string, @Request() req: any) {
    return this.service.contributionsByMonth(referenceMonth, req.user);
  }
}
