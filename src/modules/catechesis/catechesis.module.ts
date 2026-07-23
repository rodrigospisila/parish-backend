import { Module } from '@nestjs/common';
import { CatechesisService } from './catechesis.service';
import { CatechesisController } from './catechesis.controller';

@Module({
  controllers: [CatechesisController],
  providers: [CatechesisService],
})
export class CatechesisModule {}
