import { Body, Controller, Get, HttpCode, Post, Query, Request, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';
import { ProductEventsService } from './product-events.service';
import { TrackEventsDto } from './dto/track-events.dto';

/**
 * Coleta de eventos de uso (web e app). Bearer OPCIONAL: com sessão válida o
 * PAPEL vem do token (nunca do corpo); sem sessão, conta como anônimo.
 *
 * Rota `POST /product-events` (e não `POST /events`, que já é a criação de
 * eventos da paróquia no EventsController).
 */
@Controller('product-events')
export class ProductEventsController {
  constructor(private readonly service: ProductEventsService) {}

  /** POST /product-events `{ events: [{ name, platform, appVersion?, communityId? }] }` (máx. 50) → `{ accepted, ignored }` */
  @Post()
  @HttpCode(200)
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  track(@Body() dto: TrackEventsDto, @Request() req: any) {
    const user = req.user ?? null;
    return this.service.track(dto.events, { userId: user?.id ?? null, role: user?.role ?? null, ip: req.ip ?? null });
  }
}

/** Relatório de uso — só SYSTEM_ADMIN. */
@Controller('platform/usage')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SYSTEM_ADMIN)
export class PlatformUsageController {
  constructor(private readonly service: ProductEventsService) {}

  /** GET /platform/usage?days=30 (1 a 180) */
  @Get()
  usage(@Query('days') days?: string) {
    return this.service.usage(Number(days) || undefined);
  }
}
