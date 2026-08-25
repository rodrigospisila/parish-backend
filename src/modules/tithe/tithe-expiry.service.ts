import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { TitheService } from './tithe.service';

const EXPIRE_CREATED_AFTER_DAYS = 7;

/**
 * Pix gerados e nunca informados expiram: evita fila infinita de códigos
 * antigos (e de abusos) sem tocar no que o fiel já declarou. Pix do provedor
 * expiram pelo prazo do QR e são cancelados também no provedor; autorizações
 * de Pix Automático vencidas encerram como FAILED; webhooks que falharam são
 * reprocessados a cada 10 minutos.
 */
@Injectable()
export class TitheExpiryService {
  private readonly logger = new Logger(TitheExpiryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly titheService: TitheService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleCron() {
    const now = new Date();
    const count = await this.expireStale(now);
    if (count > 0) this.logger.log(`Pix de dízimo expirados: ${count}`);
    try {
      const failed = await this.titheService.failExpiredAuthorizations(now);
      if (failed > 0) this.logger.log(`Autorizações de Pix Automático vencidas: ${failed}`);
    } catch (error) {
      this.logger.warn(`Autorizações vencidas: ${String(error)}`);
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async retryWebhooks() {
    try {
      const done = await this.titheService.reprocessFailedWebhooks(new Date());
      if (done > 0) this.logger.log(`Webhooks de pagamento reprocessados: ${done}`);
    } catch (error) {
      this.logger.warn(`Reprocessamento de webhooks: ${String(error)}`);
    }
  }

  async expireStale(now: Date): Promise<number> {
    const cutoff = new Date(now.getTime() - EXPIRE_CREATED_AFTER_DAYS * 24 * 60 * 60 * 1000);
    const result = await this.prisma.titheIntent.updateMany({
      where: { status: 'CREATED', method: 'PIX_STATIC', createdAt: { lt: cutoff } },
      data: { status: 'CANCELLED', note: 'Pix expirado — gere outro quando for contribuir' },
    });
    let gateway = 0;
    try {
      gateway = await this.titheService.expireGatewayIntents(now, cutoff);
    } catch (error) {
      this.logger.warn(`Expiração de Pix do provedor: ${String(error)}`);
    }
    return result.count + gateway;
  }
}
