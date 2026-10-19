import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushDispatcherService } from './push-dispatcher.service';
import { PushOutboxService } from './push-outbox.service';
import { MessagingModule } from '../messaging/messaging.module';
import { ConsentsModule } from '../consents/consents.module';

@Module({
  imports: [MessagingModule, ConsentsModule],
  controllers: [NotificationsController],
  // PushOutboxService: worker da outbox de push (cron a cada 15 s, no próprio processo)
  providers: [NotificationsService, PushDispatcherService, PushOutboxService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
