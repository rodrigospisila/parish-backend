import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlanFeatureGuard } from '../plans/plan-feature.guard';
import { PlanResource, RequiresFeature } from '../plans/plan.decorators';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ReservationStatus, UserRole } from '@prisma/client';

// Recurso pago da comunidade (planos)
@Controller('rooms')
@UseGuards(JwtAuthGuard, RolesGuard, PlanFeatureGuard)
@RequiresFeature('rooms')
export class RoomsController {
  constructor(private readonly service: RoomsService) {}

  @Post()
  @Roles(UserRole.COMMUNITY_COORDINATOR)
  createRoom(@Body() dto: any, @Request() req: any) {
    return this.service.createRoom(dto, req.user);
  }

  @Get()
  @Roles(UserRole.PASTORAL_COORDINATOR)
  listRooms(@Request() req: any, @Query('communityId') communityId?: string) {
    return this.service.listRooms(req.user, communityId);
  }

  @Post('reservations')
  @PlanResource('room:body.roomId')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  reserve(@Body() dto: any, @Request() req: any) {
    return this.service.reserve(dto, req.user);
  }

  @Patch('reservations/:id/status')
  @PlanResource('roomReservation')
  @Roles(UserRole.COMMUNITY_COORDINATOR)
  setStatus(@Param('id') id: string, @Body() body: { status: ReservationStatus }, @Request() req: any) {
    return this.service.setReservationStatus(id, body.status, req.user);
  }

  @Get(':id/agenda')
  @PlanResource('room')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  agenda(@Param('id') id: string, @Query('from') from: string, @Request() req: any) {
    return this.service.weeklyAgenda(id, from, req.user);
  }
}
