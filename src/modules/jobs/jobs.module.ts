import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { ScheduleRemindersService } from './schedule-reminders.service';
import { EventRemindersService } from './event-reminders.service';

@Module({
  imports: [NotificationsModule],
  providers: [ScheduleRemindersService, EventRemindersService],
})
export class JobsModule {}
