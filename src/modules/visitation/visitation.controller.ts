import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { VisitationService } from './visitation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { VisitRequestStatus, UserRole } from '@prisma/client';

@Controller('visitation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PASTORAL_COORDINATOR)
export class VisitationController {
  constructor(private readonly service: VisitationService) {}

  @Post('requests')
  createRequest(@Body() dto: any, @Request() req: any) {
    return this.service.createRequest(dto, req.user);
  }

  @Get('requests')
  listRequests(@Request() req: any, @Query('status') status?: VisitRequestStatus) {
    return this.service.listRequests(req.user, status);
  }

  @Get('requests/:id')
  getRequest(@Param('id') id: string, @Request() req: any) {
    return this.service.getRequestWithVisits(id, req.user);
  }

  @Post('requests/:id/visits')
  registerVisit(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    return this.service.registerVisit(id, dto, req.user);
  }
}
