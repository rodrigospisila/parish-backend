import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';

const EXPIRE_CREATED_AFTER_DAYS = 7;

/**
 * Pix gerados e nunca informados expiram: evita fila infinita de códigos
 * antigos (e de abusos) sem tocar no que o fiel já declarou.
 */
@Injectable()
export class TitheExpiryService {
  private readonly logger = new Logger(TitheExpiryService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleCron() {
    const count = await this.expireStale(new Date());
    if (count > 0) this.logger.log(`Pix de dízimo expirados: ${count}`);
  }

  async expireStale(now: Date): Promise<number> {
    const cutoff = new Date(now.getTime() - EXPIRE_CREATED_AFTER_DAYS * 24 * 60 * 60 * 1000);
    const result = await this.prisma.titheIntent.updateMany({
      where: { status: 'CREATED', createdAt: { lt: cutoff } },
      data: { status: 'CANCELLED', note: 'Pix expirado — gere outro quando for contribuir' },
    });
    return result.count;
  }
}
