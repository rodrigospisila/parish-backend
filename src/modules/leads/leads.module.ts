import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { MessagingModule } from '../messaging/messaging.module';
import { LeadsService } from './leads.service';
import { PlatformLeadsController, PublicLeadsController } from './leads.controller';

/** Leads comerciais: formulário público + funil no painel da Plataforma. */
@Module({
  imports: [NotificationsModule, MessagingModule],
  controllers: [PublicLeadsController, PlatformLeadsController],
  providers: [LeadsService],
  // Exportado para quem gera lead em outros fluxos (ex.: reivindicação) reaproveitar o aviso
  exports: [LeadsService],
})
export class LeadsModule {}
