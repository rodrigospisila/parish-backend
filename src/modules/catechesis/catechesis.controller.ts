import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { CatechesisService } from './catechesis.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('catechesis')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CatechesisController {
  constructor(private readonly service: CatechesisService) {}

  // Etapas (catálogo por paróquia)
  @Post('stages')
  @Roles(UserRole.PARISH_ADMIN)
  createStage(@Body() dto: any, @Request() req: any) {
    return this.service.createStage(dto, req.user);
  }

  @Get('stages')
  listStages(@Request() req: any) {
    return this.service.listStages(req.user);
  }

  // Turmas
  @Post('classes')
  @Roles(UserRole.COMMUNITY_COORDINATOR)
  createClass(@Body() dto: any, @Request() req: any) {
    return this.service.createClass(dto, req.user);
  }

  @Get('classes')
  listClasses(@Request() req: any, @Query('communityId') communityId?: string) {
    return this.service.listClasses(req.user, communityId);
  }

  @Get('classes/:id/report')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  classReport(@Param('id') id: string, @Request() req: any) {
    return this.service.getClassReport(id, req.user);
  }

  @Post('classes/:id/catechists')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  addCatechist(@Param('id') id: string, @Body() body: { memberId: string; role?: string }, @Request() req: any) {
    return this.service.addCatechist(id, body.memberId, body.role, req.user);
  }

  // Matrícula
  @Post('enrollments')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  enroll(@Body() dto: any, @Request() req: any) {
    return this.service.enroll(dto, req.user);
  }

  @Patch('enrollments/:id/transfer')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  transfer(@Param('id') id: string, @Body() body: { targetClassId: string }, @Request() req: any) {
    return this.service.transferEnrollment(id, body.targetClassId, req.user);
  }

  @Patch('enrollments/:id/complete')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  complete(@Param('id') id: string, @Body() dto: { date?: string; minister?: string }, @Request() req: any) {
    return this.service.completeEnrollment(id, dto, req.user);
  }

  // Encontros e chamada
  @Post('classes/:id/sessions')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  createSession(@Param('id') id: string, @Body() dto: { date: string; topic?: string }, @Request() req: any) {
    return this.service.createSession(id, dto, req.user);
  }

  @Post('sessions/:id/attendance')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  markAttendance(
    @Param('id') id: string,
    @Body() body: { entries: Array<{ enrollmentId: string; present: boolean }> },
    @Request() req: any,
  ) {
    return this.service.markAttendance(id, body.entries, req.user);
  }
}
