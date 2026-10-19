import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { UsersModule } from '../users/users.module';
import { InvitesModule } from '../invites/invites.module';
import { MessagingModule } from '../messaging/messaging.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ClaimsService } from './claims.service';
import { PlatformClaimsController, PublicClaimsController } from './claims.controller';

/** Reivindicação de paróquia (C1). PlanAccessService vem do PlansModule (global). */
@Module({
  imports: [PrismaModule, UsersModule, InvitesModule, MessagingModule, NotificationsModule],
  providers: [ClaimsService],
  controllers: [PublicClaimsController, PlatformClaimsController],
})
export class ClaimsModule {}
