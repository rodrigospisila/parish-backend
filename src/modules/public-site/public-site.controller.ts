import { Controller, Get, Header } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PublicSiteService } from './public-site.service';

/**
 * Site de vendas e app — rotas públicas (sem login), com limite por IP
 * (guard global AppThrottlerGuard + @Throttle abaixo). Nenhum dado pessoal.
 */
@Controller('public')
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class PublicSiteController {
  constructor(private readonly service: PublicSiteService) {}

  /** GET /public/plans → `{ trialDays: 30, tiers: [...], freeFeatures, paidFeatures }` (só faixas ativas) */
  @Get('plans')
  @Header('Cache-Control', 'public, max-age=300')
  plans() {
    return this.service.plans();
  }

  /** GET /public/app-config → `{ minSupportedVersion, latestVersion, iosUrl, androidUrl, supportEmail, supportWhatsapp }` */
  @Get('app-config')
  @Header('Cache-Control', 'public, max-age=300')
  appConfig() {
    return this.service.appConfig();
  }
}
