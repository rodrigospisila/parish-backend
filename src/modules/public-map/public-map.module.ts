import { Module } from '@nestjs/common';
import { GeocodingModule } from '../geocoding/geocoding.module';
import { MassesModule } from '../masses/masses.module';
import { PublicCommunitiesController, PublicMapController } from './public-map.controller';
import { PublicMapService } from './public-map.service';

/** Mapa público de igrejas e missas (app sem login). */
@Module({
  imports: [MassesModule, GeocodingModule],
  controllers: [PublicMapController, PublicCommunitiesController],
  providers: [PublicMapService],
})
export class PublicMapModule {}
