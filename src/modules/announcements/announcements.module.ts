import { Module } from '@nestjs/common';
import { AnnouncementsController, PlatformAnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';

/** Avisos da plataforma (novidades, manutenção, incidentes). */
@Module({
  controllers: [AnnouncementsController, PlatformAnnouncementsController],
  providers: [AnnouncementsService],
})
export class AnnouncementsModule {}
