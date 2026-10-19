import { Module } from '@nestjs/common';
import { ParishesService } from './parishes.service';
import { ParishesController } from './parishes.controller';
import { ParishAccountService } from './parish-account.service';
import { ParishAccountController } from './parish-account.controller';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  // AuthModule: confirmação de senha (SessionSecurityService) da exportação/encerramento
  imports: [AuthModule, NotificationsModule, MessagingModule],
  providers: [ParishesService, ParishAccountService],
  controllers: [ParishesController, ParishAccountController],
})
export class ParishesModule {}
