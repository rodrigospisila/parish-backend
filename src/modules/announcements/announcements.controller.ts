import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from './dto/announcement.dto';

/** Avisos vigentes para quem está logado (painel e app). */
@Controller('announcements')
@UseGuards(JwtAuthGuard)
export class AnnouncementsController {
  constructor(private readonly service: AnnouncementsService) {}

  /** GET /announcements/active → `[{ id, title, body, kind, audience, startsAt, endsAt }]` */
  @Get('active')
  active(@Request() req: any) {
    return this.service.active(req.user);
  }
}

/** CRUD dos avisos — só SYSTEM_ADMIN. */
@Controller('platform/announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SYSTEM_ADMIN)
export class PlatformAnnouncementsController {
  constructor(private readonly service: AnnouncementsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@Body() dto: CreateAnnouncementDto, @Request() req: any) {
    return this.service.create(dto, req.user?.id ?? null);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAnnouncementDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
