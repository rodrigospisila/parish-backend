import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './database/prisma.service';

/** Tempo máximo do SELECT 1 do healthcheck (banco travado não pode prender o /health). */
const HEALTH_DB_TIMEOUT_MS = Number(process.env.HEALTH_DB_TIMEOUT_MS) || 3000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timeout de ${ms} ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

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
   *
   * Banco fora (ou lento além do timeout) → HTTP 503 com o mesmo corpo
   * (status "degraded", database "down", commit). Antes respondia 200 e monitores
   * que olham só o código HTTP davam a API por saudável. O Railway só consulta o
   * /health durante o deploy e repete até receber 200 (healthcheckTimeout 300 s):
   * uma oscilação do banco atrasa o deploy, não o derruba; banco fora por 5 min
   * mantém a versão antiga no ar, que é o comportamento desejado.
   */
  @Get('health')
  async health() {
    let database = 'up';
    try {
      await withTimeout(this.prisma.$queryRaw`SELECT 1`, HEALTH_DB_TIMEOUT_MS);
    } catch {
      database = 'down';
    }
    const body = {
      status: database === 'up' ? 'ok' : 'degraded',
      database,
      commit: (process.env.RAILWAY_GIT_COMMIT_SHA ?? 'dev').slice(0, 7),
      timestamp: new Date().toISOString(),
    };
    if (database !== 'up') throw new ServiceUnavailableException(body);
    return body;
  }
}
