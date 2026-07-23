import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { MassSchedulesModule } from '../mass-schedules/mass-schedules.module';

@Module({
  imports: [MassSchedulesModule],
  providers: [EventsService],
  controllers: [EventsController],
})
export class EventsModule {}
