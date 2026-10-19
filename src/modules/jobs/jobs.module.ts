import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { ScheduleRemindersService } from './schedule-reminders.service';
import { EventRemindersService } from './event-reminders.service';
import { DailyMaintenanceService } from './daily-maintenance.service';
import { PaymentsModule } from '../payments/payments.module';
import { TitheScheduleCancellationService } from '../tithe/tithe-schedule-cancellation.service';
import { MessagingModule } from '../messaging/messaging.module';
import { PlanLifecycleService } from './plan-lifecycle.service';

@Module({
  // AuditService e PlatformPlansService vêm dos módulos globais (Common/Plans);
  // o cancelamento do dízimo só precisa da fábrica de provedores (sem TitheModule)
  // MessagingModule: e-mail da régua de teste/cobrança (plan-lifecycle)
  imports: [NotificationsModule, PaymentsModule, MessagingModule],
  providers: [ScheduleRemindersService, EventRemindersService, DailyMaintenanceService, TitheScheduleCancellationService, PlanLifecycleService],
})
export class JobsModule {}
