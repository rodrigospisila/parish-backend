import { Module } from '@nestjs/common';
import { CommunitiesService } from './communities.service';
import { CommunitiesController } from './communities.controller';
import { CommunitiesMapService } from './communities-map.service';
import { CommunitiesReviewService } from './communities-review.service';

@Module({
  providers: [CommunitiesService, CommunitiesMapService, CommunitiesReviewService],
  controllers: [CommunitiesController]
})
export class CommunitiesModule {}
