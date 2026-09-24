import { Controller, Get, Post, Patch, Body, Param, Query, Res, UseGuards, Request } from '@nestjs/common';
import type { Response } from 'express';
import { FormationService } from './formation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlanFeatureGuard } from '../plans/plan-feature.guard';
import { PlanResource, RequiresFeature } from '../plans/plan.decorators';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

// Recurso pago (planos). Formação é da PARÓQUIA: passa se alguma comunidade dela tiver acesso
@Controller('formation')
@UseGuards(JwtAuthGuard, RolesGuard, PlanFeatureGuard)
@RequiresFeature('formation', { level: 'parish' })
export class FormationController {
  constructor(private readonly service: FormationService) {}

  @Post('tracks')
  @Roles(UserRole.PARISH_ADMIN)
  createTrack(@Body() dto: any, @Request() req: any) {
    return this.service.createTrack(dto, req.user);
  }

  @Get('tracks')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  listTracks(@Request() req: any) {
    return this.service.listTracks(req.user);
  }

  @Post('courses')
  @PlanResource('formationTrack:body.trackId')
  @Roles(UserRole.COMMUNITY_COORDINATOR)
  createCourse(@Body() dto: any, @Request() req: any) {
    return this.service.createCourse(dto, req.user);
  }

  @Get('courses')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  listCourses(@Request() req: any) {
    return this.service.listCourses(req.user);
  }

  @Get('courses/:id/enrollments')
  @PlanResource('formationCourse')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  listEnrollments(@Param('id') id: string, @Request() req: any) {
    return this.service.listEnrollments(id, req.user);
  }

  @Post('courses/:id/enroll')
  @PlanResource('formationCourse')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  enroll(@Param('id') id: string, @Body() body: { memberId: string }, @Request() req: any) {
    return this.service.enroll(id, body.memberId, req.user);
  }

  @Patch('enrollments/:id/complete')
  @PlanResource('formationEnrollment')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  complete(@Param('id') id: string, @Body() dto: { date?: string }, @Request() req: any) {
    return this.service.complete(id, dto, req.user);
  }

  @Get('pending')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  pending(@Request() req: any) {
    return this.service.getPendingOrExpired(req.user);
  }

  @Get('check')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  check(@Query('memberId') memberId: string, @Query('role') role: string) {
    return this.service.checkPrerequisite(memberId, role);
  }

  @Get('enrollments/:id/certificate.pdf')
  @PlanResource('formationEnrollment')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  async certificate(@Param('id') id: string, @Res() res: Response, @Request() req: any) {
    const buffer = await this.service.generateCertificate(id, req.user);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="certificado.pdf"',
      'Content-Length': String(buffer.length),
    });
    res.end(buffer);
  }
}
