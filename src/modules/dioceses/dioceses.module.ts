import { Module } from '@nestjs/common';
import { DiocesesService } from './dioceses.service';
import { DiocesesController } from './dioceses.controller';

@Module({
  providers: [DiocesesService],
  controllers: [DiocesesController]
})
export class DiocesesModule {}
