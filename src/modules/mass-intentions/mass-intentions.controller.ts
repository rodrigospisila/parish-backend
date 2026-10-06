import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { MassIntentionsService } from './mass-intentions.service';
import { CreateMassIntentionDto } from './dto/create-mass-intention.dto';
import { UpdateMassIntentionDto } from './dto/update-mass-intention.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, IntentionType } from '@prisma/client';

/**
 * Intenções de missa — SEM DONO no produto (nenhuma tela do painel ou do app usa;
 * 0 registros em produção). Até haver um fluxo definido (quem lê, quem cobra, o
 * que o fiel vê), o módulo inteiro fica restrito ao SYSTEM_ADMIN: a rota estava
 * publicada sem escopo nenhum (fiel lia e criava em qualquer comunidade do país;
 * pároco de qualquer lugar marcava pagamento e apagava). O @Roles fica SÓ na
 * classe — um @Roles por rota sobrescreveria este (getAllAndOverride).
 */
@Controller('mass-intentions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SYSTEM_ADMIN)
export class MassIntentionsController {
  constructor(private readonly massIntentionsService: MassIntentionsService) {}

  @Post()
  create(@Body() createMassIntentionDto: CreateMassIntentionDto, @CurrentUser() user: any) {
    return this.massIntentionsService.create(createMassIntentionDto, user);
  }

  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('communityId') communityId?: string,
    @Query('type') type?: IntentionType,
    @Query('isPaid') isPaid?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const isPaidBool = isPaid === 'true' ? true : isPaid === 'false' ? false : undefined;
    return this.massIntentionsService.findAll(
      user,
      communityId,
      type,
      isPaidBool,
      startDate,
      endDate,
    );
  }

  @Get('upcoming')
  findUpcoming(
    @CurrentUser() user: any,
    @Query('communityId') communityId?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit) : 10;
    return this.massIntentionsService.findUpcoming(user, communityId, limitNum);
  }

  @Get('pending')
  findPending(@CurrentUser() user: any, @Query('communityId') communityId?: string) {
    return this.massIntentionsService.findPending(user, communityId);
  }

  @Get('stats')
  getStats(@CurrentUser() user: any, @Query('communityId') communityId?: string) {
    return this.massIntentionsService.getStats(user, communityId);
  }

  @Get('date/:date')
  findByDate(
    @CurrentUser() user: any,
    @Param('date') date: string,
    @Query('communityId') communityId?: string,
  ) {
    return this.massIntentionsService.findByDate(user, date, communityId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.massIntentionsService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateMassIntentionDto: UpdateMassIntentionDto,
    @CurrentUser() user: any,
  ) {
    return this.massIntentionsService.update(id, updateMassIntentionDto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.massIntentionsService.remove(id, user);
  }

  // ========== PAGAMENTO ==========

  @Patch(':id/mark-paid')
  markAsPaid(
    @Param('id') id: string,
    @Body('paymentMethod') paymentMethod: string,
    @CurrentUser() user: any,
  ) {
    return this.massIntentionsService.markAsPaid(id, paymentMethod, user);
  }

  @Patch(':id/mark-unpaid')
  markAsUnpaid(@Param('id') id: string, @CurrentUser() user: any) {
    return this.massIntentionsService.markAsUnpaid(id, user);
  }
}

