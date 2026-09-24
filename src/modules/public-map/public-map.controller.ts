import { Controller, Get, Header, Param, Query, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { MassesService } from '../masses/masses.service';
import { clampMapLimit, parseFlag, parseOptionalNumber, parseTypesCsv } from '../masses/map-search.utils';
import { PublicMapService } from './public-map.service';

/**
 * Mapa de igrejas e missas — rotas públicas (sem login), limitadas por IP.
 * Só dados públicos das comunidades; o contrato é consumido pelo app mobile.
 */
@Controller('public/map')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class PublicMapController {
  constructor(
    private readonly massesService: MassesService,
    private readonly publicMapService: PublicMapService,
  ) {}

  /** GET /public/map/config — provedor de tiles (env MAP_TILE_*). */
  @Get('config')
  @Header('Cache-Control', 'public, max-age=3600')
  config() {
    return this.publicMapService.mapConfig();
  }

  /**
   * GET /public/map/nearby?lat&lng&radiusKm&days&types&approx=0|1&limit
   * Igrejas no raio, da mais perto à mais longe, com as próximas celebrações.
   */
  @Get('nearby')
  nearby(
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radiusKm') radiusKm?: string,
    @Query('days') days?: string,
    @Query('types') types?: string,
    @Query('approx') approx?: string,
    @Query('limit') limit?: string,
  ) {
    return this.massesService.findNearby({
      lat: parseOptionalNumber(lat, 'lat') ?? NaN,
      lng: parseOptionalNumber(lng, 'lng') ?? NaN,
      radiusKm: parseOptionalNumber(radiusKm, 'radiusKm'),
      days: parseOptionalNumber(days, 'days'),
      types: parseTypesCsv(types),
      approx: parseFlag(approx),
      // No mapa público a busca por raio também tem teto (padrão 300, máx. 500)
      limit: clampMapLimit(parseOptionalNumber(limit, 'limit')),
    });
  }

  /**
   * GET /public/map/area?bbox=minLng,minLat,maxLng,maxLat&days&types&approx=0|1&limit
   * Igrejas dentro do retângulo visível, a partir do centro; `truncated` se havia mais.
   */
  @Get('area')
  area(
    @Query('bbox') bbox?: string,
    @Query('days') days?: string,
    @Query('types') types?: string,
    @Query('approx') approx?: string,
    @Query('limit') limit?: string,
  ) {
    return this.massesService.findInArea({
      bbox: bbox ?? '',
      days: parseOptionalNumber(days, 'days'),
      types: parseTypesCsv(types),
      approx: parseFlag(approx),
      limit: parseOptionalNumber(limit, 'limit'),
    });
  }
}

/** Página pública da comunidade (sem login). */
@Controller('public/communities')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class PublicCommunitiesController {
  constructor(private readonly publicMapService: PublicMapService) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.publicMapService.communityDetail(id);
  }
}
