import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushDispatcherService } from './push-dispatcher.service';
import { MessagingModule } from '../messaging/messaging.module';
import { ConsentsModule } from '../consents/consents.module';

@Module({
  imports: [MessagingModule, ConsentsModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, PushDispatcherService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
