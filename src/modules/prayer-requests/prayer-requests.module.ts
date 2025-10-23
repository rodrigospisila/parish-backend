import { Module } from '@nestjs/common';
import { PrayerRequestsService } from './prayer-requests.service';
import { PrayerRequestsController } from './prayer-requests.controller';

@Module({
  providers: [PrayerRequestsService],
  controllers: [PrayerRequestsController]
})
export class PrayerRequestsModule {}
