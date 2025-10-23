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
import { UserRole, PrayerRequestCategory, PrayerRequestStatus } from '@prisma/client';

@Controller('prayer-requests')
export class PrayerRequestsController {
  constructor(private readonly prayerRequestsService: PrayerRequestsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createPrayerRequestDto: CreatePrayerRequestDto) {
    return this.prayerRequestsService.create(createPrayerRequestDto);
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
    @Query('category') category?: PrayerRequestCategory,
    @Query('status') status?: PrayerRequestStatus,
  ) {
    return this.prayerRequestsService.findAll(communityId, category, status);
  }

  @Get('approved')
  findApproved(
    @Query('communityId') communityId?: string,
    @Query('category') category?: PrayerRequestCategory,
  ) {
    return this.prayerRequestsService.findApproved(communityId, category);
  }

  @Get('pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  findPending(@Query('communityId') communityId?: string) {
    return this.prayerRequestsService.findPending(communityId);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  getStats(@Query('communityId') communityId?: string) {
    return this.prayerRequestsService.getStats(communityId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.prayerRequestsService.findOne(id);
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
    @Body() updatePrayerRequestDto: UpdatePrayerRequestDto,
  ) {
    return this.prayerRequestsService.update(id, updatePrayerRequestDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DIOCESAN_ADMIN, UserRole.PARISH_ADMIN)
  remove(@Param('id') id: string) {
    return this.prayerRequestsService.remove(id);
  }

  // ========== MODERAÇÃO ==========

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  approve(@Param('id') id: string) {
    return this.prayerRequestsService.approve(id);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  reject(@Param('id') id: string) {
    return this.prayerRequestsService.reject(id);
  }

  // ========== CONTADOR DE ORAÇÕES ==========

  @Post(':id/pray')
  incrementPrayerCount(@Param('id') id: string) {
    return this.prayerRequestsService.incrementPrayerCount(id);
  }
}

