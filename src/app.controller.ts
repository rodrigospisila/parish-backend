import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './database/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Healthcheck para o Railway (fora do prefixo global — ver main.ts).
   * Confirma que a API subiu E que o banco responde. Expõe o commit em produção
   * para sabermos qual deploy está no ar.
   */
  @Get('health')
  async health() {
    let database = 'up';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'down';
    }
    return {
      status: database === 'up' ? 'ok' : 'degraded',
      database,
      commit: (process.env.RAILWAY_GIT_COMMIT_SHA ?? 'dev').slice(0, 7),
      timestamp: new Date().toISOString(),
    };
  }
}
