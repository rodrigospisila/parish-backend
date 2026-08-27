import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';
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
  imports: [CommonModule, NotificationsModule, PaymentsModule],
  providers: [TitheService, PdfService, TitheExpiryService, TitheThrottlerGuard, TitheReminderService, TitheCampaignsService, TitheAgentService, TitheRetentionService],
  controllers: [TitheController, TitheWebhookController, TitheCampaignsController, TitheAgentController, TitheRetentionController],
})
export class TitheModule {}
