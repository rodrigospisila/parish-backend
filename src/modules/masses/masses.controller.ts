import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseFloatPipe,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { MassesService } from './masses.service';
import { parseMassFocus, parseOptionalNumber, parseTypesCsv } from './map-search.utils';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserThrottlerGuard } from '../auth/guards/app-throttler.guard';

/**
 * Rota logada antiga do mapa (o app atual usa /public/map/*). Mesmo teto de
 * igrejas do mapa público e limite por usuário: o cadastro é aberto, e uma
 * chamada de raio 100 km × 30 dias pesava ~5 MB sem corte.
 */
@Controller('masses')
@UseGuards(JwtAuthGuard, UserThrottlerGuard)
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class MassesController {
  constructor(private readonly massesService: MassesService) {}

  /**
   * Missas mais próximas de uma coordenada (busca aberta entre comunidades).
   * GET /masses/nearby?lat=&lng=&radiusKm=&days=&types=MASS,CONFESSION&limit=&day=&from=&to=
   */
  @Get('nearby')
  nearby(
    @Query('lat', ParseFloatPipe) lat: number,
    @Query('lng', ParseFloatPipe) lng: number,
    @Query('radiusKm', new DefaultValuePipe(10), ParseFloatPipe) radiusKm: number,
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days: number,
    @Query('types') typesCsv?: string,
    @Query('limit') limit?: string,
    @Query('day') day?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.massesService.findNearby({
      lat,
      lng,
      radiusKm,
      days,
      types: parseTypesCsv(typesCsv),
      // Padrão 300, máx. 500 igrejas (clampMapLimit no serviço)
      limit: parseOptionalNumber(limit, 'limit'),
      focus: parseMassFocus(day, from, to),
    });
  }
}
