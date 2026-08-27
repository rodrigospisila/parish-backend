import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';
import { MessagingModule } from '../messaging/messaging.module';
import { TitheWhatsAppService } from './whatsapp.service';
import { TitheWhatsAppController } from './tithe-whatsapp.controller';
import { TitheGuestService } from './guest.service';
import { TitheGuestController } from './guest.controller';
import { TitheGuestPublicController } from './guest-public.controller';
import { PdfService } from '../pdf/pdf.service';
import { TitheService } from './tithe.service';
import { TitheController } from './tithe.controller';
import { TitheWebhookController } from './tithe-webhook.controller';
import { TitheExpiryService } from './tithe-expiry.service';
import { TitheThrottlerGuard } from './tithe-throttler.guard';
import { TitheReminderService } from './tithe-reminder.service';
import { TitheCampaignsService } from './campaigns.service';
import { TitheCampaignsController } from './campaigns.controller';
import { TitheAgentService } from './agent.service';
import { TitheAgentController } from './agent.controller';
import { TitheRetentionService } from './retention.service';
import { TitheRetentionController } from './retention.controller';

@Module({
  imports: [CommonModule, NotificationsModule, PaymentsModule, MessagingModule],
  providers: [TitheService, PdfService, TitheExpiryService, TitheThrottlerGuard, TitheReminderService, TitheCampaignsService, TitheAgentService, TitheRetentionService, TitheWhatsAppService, TitheGuestService],
  controllers: [TitheController, TitheWebhookController, TitheCampaignsController, TitheAgentController, TitheRetentionController, TitheWhatsAppController, TitheGuestController, TitheGuestPublicController],
})
export class TitheModule {}
