import { Module } from '@nestjs/common';
import { MassIntentionsService } from './mass-intentions.service';
import { MassIntentionsController } from './mass-intentions.controller';

@Module({
  providers: [MassIntentionsService],
  controllers: [MassIntentionsController]
})
export class MassIntentionsModule {}
