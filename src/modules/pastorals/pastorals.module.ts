import { Module } from '@nestjs/common';
import { PastoralsService } from './pastorals.service';
import { PastoralsController } from './pastorals.controller';
import { HierarchyService } from '../../common/hierarchy.service';

@Module({
  providers: [PastoralsService, HierarchyService],
  controllers: [PastoralsController],
})
export class PastoralsModule {}
