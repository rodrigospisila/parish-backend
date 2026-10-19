import { Module } from '@nestjs/common';
import { MessagingModule } from '../messaging/messaging.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BillingController, PlatformBillingWebhookController } from './billing.controller';
import { BillingService } from './billing.service';
import { BillingWebhookService } from './billing-webhook.service';

/**
 * Faturamento da plataforma (Onda 1, C3). HierarchyService/AuditService
 * (CommonModule) e PlanAccessService (PlansModule) vêm dos módulos globais.
 */
@Module({
  imports: [MessagingModule, NotificationsModule],
  controllers: [BillingController, PlatformBillingWebhookController],
  providers: [BillingService, BillingWebhookService],
  exports: [BillingService],
})
export class BillingModule {}
