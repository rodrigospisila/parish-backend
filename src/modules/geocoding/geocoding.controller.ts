import { Controller, ExecutionContext, Get, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { GeocodingService } from './geocoding.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserThrottlerGuard } from '../auth/guards/app-throttler.guard';

/** Buscas por minuto por usuário: a gestão comum e o SYSTEM_ADMIN do /admin/map. */
export const GEOCODING_SEARCH_LIMIT = 30;
export const GEOCODING_SEARCH_LIMIT_SYSTEM_ADMIN = 120;

/**
 * Limite por papel (R3#59): a revisão de pinos do /admin/map dispara uma
 * sugestão automática por comunidade (estruturada + buscas livres) e os
 * 30/min cortavam o SYSTEM_ADMIN no meio da fila. O provedor continua
 * protegido pela fila global de 1 chamada/s e pelo cache do serviço.
 */
export function geocodingSearchLimit(context: ExecutionContext): number {
  const role = context.switchToHttp().getRequest()?.user?.role;
  return role === 'SYSTEM_ADMIN' ? GEOCODING_SEARCH_LIMIT_SYSTEM_ADMIN : GEOCODING_SEARCH_LIMIT;
}

@Controller('geocoding')
@UseGuards(JwtAuthGuard, UserThrottlerGuard)
export class GeocodingController {
  constructor(private readonly service: GeocodingService) {}

  /**
   * Endereço → coordenadas (para posicionar a comunidade no mapa).
   * GET /geocoding/search?q=  (busca livre)
   * GET /geocoding/search?street=&city=&state=  (estruturada; o painel do território)
   * 30 por minuto por usuário (120 para o SYSTEM_ADMIN) — o provedor por trás
   * aceita 1 por segundo no total (fila global no serviço).
   */
  @Get('search')
  @Throttle({ default: { limit: geocodingSearchLimit, ttl: 60_000 } })
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
