import { Module } from '@nestjs/common';
import { MassSchedulesService } from './mass-schedules.service';
import { MassSchedulesController } from './mass-schedules.controller';

@Module({
  providers: [MassSchedulesService],
  controllers: [MassSchedulesController]
})
export class MassSchedulesModule {}
