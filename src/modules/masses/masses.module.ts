import { Module } from '@nestjs/common';
import { MassesController } from './masses.controller';
import { MassesService } from './masses.service';
import { MassSchedulesModule } from '../mass-schedules/mass-schedules.module';

@Module({
  imports: [MassSchedulesModule],
  controllers: [MassesController],
  providers: [MassesService],
  exports: [MassesService],
})
export class MassesModule {}
