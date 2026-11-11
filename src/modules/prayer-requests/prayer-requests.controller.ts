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
import { PrayerRequestsService } from './prayer-requests.service';
import { CreatePrayerRequestDto } from './dto/create-prayer-request.dto';
import { UpdatePrayerRequestDto } from './dto/update-prayer-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, PrayerRequestCategory, PrayerRequestStatus } from '@prisma/client';
import { PlanGated } from '../plans/plan-gates';

/**
 * Pedidos de oração: recurso PAGO da comunidade (`prayer-requests`). O plano
 * sai do pedido (rotas por id), do `communityId` da query/body, ou do usuário.
 */
@Controller('prayer-requests')
export class PrayerRequestsController {
  constructor(private readonly prayerRequestsService: PrayerRequestsService) {}

  @Post()
  @PlanGated('prayer-requests')
  @UseGuards(JwtAuthGuard)
  create(@Body() createPrayerRequestDto: CreatePrayerRequestDto, @CurrentUser() user: any) {
    return this.prayerRequestsService.create(createPrayerRequestDto, user);
  }

  @Get()
  @PlanGated('prayer-requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  findAll(
    @CurrentUser() user: any,
    @Query('communityId') communityId?: string,
    @Query('category') category?: PrayerRequestCategory,
    @Query('status') status?: PrayerRequestStatus,
  ) {
    // Só as comunidades que o usuário modera
    return this.prayerRequestsService.findAll(user, communityId, category, status);
  }

  @Get('approved')
  @PlanGated('prayer-requests')
  @UseGuards(JwtAuthGuard)
  findApproved(
    @CurrentUser() user: any,
    @Query('communityId') communityId?: string,
    @Query('category') category?: PrayerRequestCategory,
  ) {
    // Mural das comunidades do usuário (principal e vínculos)
    return this.prayerRequestsService.findApproved(user, communityId, category);
  }

  @Get('pending')
  @PlanGated('prayer-requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  findPending(@CurrentUser() user: any, @Query('communityId') communityId?: string) {
    return this.prayerRequestsService.findPending(communityId, user);
  }

  @Get('stats')
  @PlanGated('prayer-requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  getStats(@CurrentUser() user: any, @Query('communityId') communityId?: string) {
    return this.prayerRequestsService.getStats(user, communityId);
  }

  @Get(':id')
  @PlanGated('prayer-requests', 'prayerRequest')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.prayerRequestsService.findOne(id, user);
  }

  @Patch(':id')
  @PlanGated('prayer-requests', 'prayerRequest')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  update(
    @Param('id') id: string,
    @Body() updatePrayerRequestDto: UpdatePrayerRequestDto,
    @CurrentUser() user: any,
  ) {
    return this.prayerRequestsService.update(id, updatePrayerRequestDto, user);
  }

  @Delete(':id')
  @PlanGated('prayer-requests', 'prayerRequest')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DIOCESAN_ADMIN, UserRole.PARISH_ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.prayerRequestsService.remove(id, user);
  }

  // ========== MODERAÇÃO ==========

  @Patch(':id/approve')
  @PlanGated('prayer-requests', 'prayerRequest')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  approve(@Param('id') id: string, @CurrentUser() user: any) {
    return this.prayerRequestsService.approve(id, user);
  }

  @Patch(':id/reject')
  @PlanGated('prayer-requests', 'prayerRequest')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  reject(@Param('id') id: string, @CurrentUser() user: any) {
    return this.prayerRequestsService.reject(id, user);
  }

  // ========== CONTADOR DE ORAÇÕES ==========

  @Post(':id/pray')
  @PlanGated('prayer-requests', 'prayerRequest')
  @UseGuards(JwtAuthGuard)
  incrementPrayerCount(@Param('id') id: string, @CurrentUser() user: any) {
    return this.prayerRequestsService.incrementPrayerCount(id, user);
  }
}

