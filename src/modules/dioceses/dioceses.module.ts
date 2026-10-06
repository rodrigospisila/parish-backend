import { Module } from '@nestjs/common';
import { DiocesesService } from './dioceses.service';
import { DiocesesController } from './dioceses.controller';
import { TerritoryController } from './territory.controller';
import { TerritoryService } from './territory.service';

@Module({
  providers: [DiocesesService, TerritoryService],
  controllers: [DiocesesController, TerritoryController],
})
export class DiocesesModule {}
