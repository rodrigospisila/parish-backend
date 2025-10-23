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
import { UserRole, IntentionType } from '@prisma/client';

@Controller('mass-intentions')
export class MassIntentionsController {
  constructor(private readonly massIntentionsService: MassIntentionsService) {}

  @Post()
  create(@Body() createMassIntentionDto: CreateMassIntentionDto) {
    return this.massIntentionsService.create(createMassIntentionDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  findAll(
    @Query('communityId') communityId?: string,
    @Query('type') type?: IntentionType,
    @Query('isPaid') isPaid?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const isPaidBool = isPaid === 'true' ? true : isPaid === 'false' ? false : undefined;
    return this.massIntentionsService.findAll(
      communityId,
      type,
      isPaidBool,
      startDate,
      endDate,
    );
  }

  @Get('upcoming')
  findUpcoming(
    @Query('communityId') communityId?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit) : 10;
    return this.massIntentionsService.findUpcoming(communityId, limitNum);
  }

  @Get('pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  findPending(@Query('communityId') communityId?: string) {
    return this.massIntentionsService.findPending(communityId);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  getStats(@Query('communityId') communityId?: string) {
    return this.massIntentionsService.getStats(communityId);
  }

  @Get('date/:date')
  findByDate(
    @Param('date') date: string,
    @Query('communityId') communityId?: string,
  ) {
    return this.massIntentionsService.findByDate(date, communityId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.massIntentionsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  update(
    @Param('id') id: string,
    @Body() updateMassIntentionDto: UpdateMassIntentionDto,
  ) {
    return this.massIntentionsService.update(id, updateMassIntentionDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DIOCESAN_ADMIN, UserRole.PARISH_ADMIN)
  remove(@Param('id') id: string) {
    return this.massIntentionsService.remove(id);
  }

  // ========== PAGAMENTO ==========

  @Patch(':id/mark-paid')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  markAsPaid(
    @Param('id') id: string,
    @Body('paymentMethod') paymentMethod: string,
  ) {
    return this.massIntentionsService.markAsPaid(id, paymentMethod);
  }

  @Patch(':id/mark-unpaid')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  markAsUnpaid(@Param('id') id: string) {
    return this.massIntentionsService.markAsUnpaid(id);
  }
}

