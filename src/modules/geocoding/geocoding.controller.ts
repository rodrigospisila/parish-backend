import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { GeocodingService } from './geocoding.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('geocoding')
@UseGuards(JwtAuthGuard)
export class GeocodingController {
  constructor(private readonly service: GeocodingService) {}

  // Endereço → coordenadas (para posicionar a comunidade no mapa)
  @Get('search')
  search(@Query('q') q: string) {
    return this.service.search(q);
  }
}
