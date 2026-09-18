import { Module } from '@nestjs/common';
import { CommunitiesService } from './communities.service';
import { CommunitiesController } from './communities.controller';
import { CommunitiesMapService } from './communities-map.service';

@Module({
  providers: [CommunitiesService, CommunitiesMapService],
  controllers: [CommunitiesController]
})
export class CommunitiesModule {}
