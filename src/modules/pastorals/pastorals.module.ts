import { Module } from '@nestjs/common';
import { PastoralsService } from './pastorals.service';
import { PastoralsController } from './pastorals.controller';

@Module({
  providers: [PastoralsService],
  controllers: [PastoralsController]
})
export class PastoralsModule {}
