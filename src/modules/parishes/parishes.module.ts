import { Module } from '@nestjs/common';
import { ParishesService } from './parishes.service';
import { ParishesController } from './parishes.controller';

@Module({
  providers: [ParishesService],
  controllers: [ParishesController]
})
export class ParishesModule {}
