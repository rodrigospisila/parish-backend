import { Module } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { EmailService } from './email.service';

@Module({
  providers: [MessagingService, EmailService],
  exports: [MessagingService, EmailService],
})
export class MessagingModule {}
