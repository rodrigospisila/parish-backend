import { Module } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { PdfModule } from '../pdf/pdf.module';

@Module({
  imports: [NotificationsModule, PdfModule],
  providers: [SchedulesService],
  controllers: [SchedulesController]
})
export class SchedulesModule {}
