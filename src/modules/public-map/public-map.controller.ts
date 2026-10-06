import { Controller, Get, Header, Param, Query, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { GeocodingService } from '../geocoding/geocoding.service';
import { MassesService } from '../masses/masses.service';
import { clampMapLimit, parseFlag, parseMassFocus, parseOptionalNumber, parseTypesCsv, parseZoom } from '../masses/map-search.utils';
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
    private readonly geocodingService: GeocodingService,
  ) {}

  /**
   * GET /public/map/geocode?q= — busca de cidade/bairro/endereço para o mapa sem login (o mesmo proxy da rota logada
   * /geocoding/search: cache em memória, fila global de 1 req/s ao Nominatim e timeout). Limite mais apertado: 20 por
   * minuto por IP — o provedor por trás também tem limites.
   */
  @Get('geocode')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  geocode(@Query('q') q?: string) {
    const texto = String(q ?? '').trim().slice(0, 120);
    if (texto.length < 3) return [];
    return this.geocodingService.search(texto);
  }

  /** GET /public/map/config — provedor de tiles (env MAP_TILE_*). */
  @Get('config')
  @Header('Cache-Control', 'public, max-age=3600')
  config() {
    return this.publicMapService.mapConfig();
  }

  /**
   * GET /public/map/nearby?lat&lng&radiusKm&days&types&approx=0|1&limit&day=today|sunday&from=HH:MM&to=HH:MM
   * Igrejas no raio, da mais perto à mais longe, com as próximas celebrações.
   * `day`/`from`/`to` (filtros do app) só priorizam as ocorrências antes do teto por igreja — não filtram.
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
    @Query('day') day?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
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
      focus: parseMassFocus(day, from, to),
    });
  }

  /**
   * GET /public/map/area?bbox=minLng,minLat,maxLng,maxLat&zoom&days&types&approx=0|1&limit&day&from&to
   * Retângulo de qualquer tamanho, recortado ao Brasil (lat -35..7, lng -75..-28).
   * - zoom < 11 (ou mais pinos que `limit`): `{ mode:'clusters', bbox, zoom, total, clusters:[{lat,lng,count,bbox,id?,name?}] }`
   * - senão: `{ mode:'pins', zoom, origin:null, bbox, radiusKm:null, days, count, truncated, communities }`
   * - sem zoom (app antigo): sempre pinos, `truncated` se havia mais que `limit`.
   * - `day`/`from`/`to`: como em /nearby (prioridade antes do teto por igreja).
   */
  @Get('area')
  area(
    @Query('bbox') bbox?: string,
    @Query('zoom') zoom?: string,
    @Query('days') days?: string,
    @Query('types') types?: string,
    @Query('approx') approx?: string,
    @Query('limit') limit?: string,
    @Query('day') day?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.massesService.findInArea({
      bbox: bbox ?? '',
      zoom: parseZoom(zoom),
      days: parseOptionalNumber(days, 'days'),
      types: parseTypesCsv(types),
      approx: parseFlag(approx),
      limit: parseOptionalNumber(limit, 'limit'),
      focus: parseMassFocus(day, from, to),
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
