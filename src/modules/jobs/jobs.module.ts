import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { ScheduleRemindersService } from './schedule-reminders.service';
import { EventRemindersService } from './event-reminders.service';
import { DailyMaintenanceService } from './daily-maintenance.service';
import { PaymentsModule } from '../payments/payments.module';
import { TitheScheduleCancellationService } from '../tithe/tithe-schedule-cancellation.service';

@Module({
  // AuditService e PlatformPlansService vêm dos módulos globais (Common/Plans);
  // o cancelamento do dízimo só precisa da fábrica de provedores (sem TitheModule)
  imports: [NotificationsModule, PaymentsModule],
  providers: [ScheduleRemindersService, EventRemindersService, DailyMaintenanceService, TitheScheduleCancellationService],
})
export class JobsModule {}
