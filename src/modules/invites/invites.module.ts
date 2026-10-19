import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { MessagingModule } from '../messaging/messaging.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ConsentsModule } from '../consents/consents.module';
import { InvitesService } from './invites.service';
import { InvitesController, PublicInvitesController } from './invites.controller';

/** Convites de equipe por link (C2). Exporta o serviço para a reivindicação (C1). */
@Module({
  imports: [PrismaModule, UsersModule, AuthModule, MessagingModule, NotificationsModule, ConsentsModule],
  providers: [InvitesService],
  controllers: [InvitesController, PublicInvitesController],
  exports: [InvitesService],
})
export class InvitesModule {}
