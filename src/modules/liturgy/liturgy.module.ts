import { Module } from '@nestjs/common';
import { LiturgyService } from './liturgy.service';
import { LiturgyController } from './liturgy.controller';

@Module({
  providers: [LiturgyService],
  controllers: [LiturgyController]
})
export class LiturgyModule {}
