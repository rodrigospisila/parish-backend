import { Module } from '@nestjs/common';
import { SaintsController } from './saints.controller';
import { SaintsService } from './saints.service';

@Module({
  controllers: [SaintsController],
  providers: [SaintsService],
  exports: [SaintsService],
})
export class SaintsModule {}
