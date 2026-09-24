import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseFloatPipe,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MassesService } from './masses.service';
import { parseTypesCsv } from './map-search.utils';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('masses')
@UseGuards(JwtAuthGuard)
export class MassesController {
  constructor(private readonly massesService: MassesService) {}

  /**
   * Missas mais próximas de uma coordenada (busca aberta entre comunidades).
   * GET /masses/nearby?lat=&lng=&radiusKm=&days=&types=MASS,CONFESSION
   */
  @Get('nearby')
  nearby(
    @Query('lat', ParseFloatPipe) lat: number,
    @Query('lng', ParseFloatPipe) lng: number,
    @Query('radiusKm', new DefaultValuePipe(10), ParseFloatPipe) radiusKm: number,
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days: number,
    @Query('types') typesCsv?: string,
  ) {
    return this.massesService.findNearby({ lat, lng, radiusKm, days, types: parseTypesCsv(typesCsv) });
  }
}
