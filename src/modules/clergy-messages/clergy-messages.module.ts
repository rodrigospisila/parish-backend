import { Module } from '@nestjs/common';
import { ClergyMessagesController } from './clergy-messages.controller';
import { ClergyMessagesService } from './clergy-messages.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [ClergyMessagesController],
  providers: [ClergyMessagesService],
  exports: [ClergyMessagesService],
})
export class ClergyMessagesModule {}
