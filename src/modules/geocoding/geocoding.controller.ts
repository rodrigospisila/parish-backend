import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { GeocodingService } from './geocoding.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserThrottlerGuard } from '../auth/guards/app-throttler.guard';

@Controller('geocoding')
@UseGuards(JwtAuthGuard, UserThrottlerGuard)
export class GeocodingController {
  constructor(private readonly service: GeocodingService) {}

  /**
   * Endereço → coordenadas (para posicionar a comunidade no mapa).
   * GET /geocoding/search?q=  (busca livre)
   * GET /geocoding/search?street=&city=&state=  (estruturada; o painel do território)
   * 30 por minuto por usuário — o provedor por trás aceita 1 por segundo no total.
   */
  @Get('search')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  search(
    @Query('q') q?: string,
    @Query('street') street?: string,
    @Query('city') city?: string,
    @Query('state') state?: string,
  ) {
    if (street != null && String(street).trim() !== '') {
      return this.service.searchStructured({ street: String(street), city: String(city ?? ''), state: String(state ?? '') });
    }
    return this.service.search(String(q ?? ''));
  }
}
