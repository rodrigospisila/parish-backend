import { Module } from '@nestjs/common';
import { MassSchedulesService } from './mass-schedules.service';
import { MassSchedulesController } from './mass-schedules.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  // Push para quem favoritou o horário quando uma data é suspensa/reativada
  imports: [NotificationsModule],
  providers: [MassSchedulesService],
  controllers: [MassSchedulesController],
  exports: [MassSchedulesService],
})
export class MassSchedulesModule {}
