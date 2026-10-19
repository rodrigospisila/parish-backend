import type { NextFunction, Request, Response } from 'express';
import type { LoggerService } from '@nestjs/common';
import { ensureRequestId } from '../request-id';
import { requestContext } from './request-context';

/**
 * Log de requisição (eng-qualidade-15, contrato C6) — só com LOG_FORMAT=json.
 *
 * Uma linha por requisição, ao terminar: método, ROTA-PADRÃO (ex.:
 * `/api/v1/members/:id`, nunca a URL real — ids, tokens de convite e query
 * string ficam fora), status, duração em ms e requestId. Sem corpo, sem
 * cabeçalhos, sem usuário: nada de dado pessoal. O /health (healthcheck do
 * Railway) não entra. A requisição roda dentro do contexto (AsyncLocalStorage)
 * para os logs dos services também saírem com o requestId.
 */
export const REQUEST_LOG_CONTEXT = 'HTTP';

/** Rota-padrão casada pelo Express; sem rota (404) → marcador fixo. */
export function routePattern(req: Pick<Request, 'baseUrl' | 'route'>): string {
  const path = (req as any).route?.path;
  if (typeof path !== 'string' && !(path instanceof RegExp)) return '(sem rota)';
  return `${req.baseUrl ?? ''}${String(path)}`;
}

export function isHealthPath(url: string | undefined): boolean {
  const path = (url ?? '').split('?')[0];
  return path === '/health' || path.startsWith('/health/');
}

export function createRequestLoggingMiddleware(logger: LoggerService) {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = ensureRequestId(req as Request & { requestId?: string }, res);
    if (isHealthPath(req.originalUrl ?? req.url)) {
      next();
      return;
    }
    const startedAt = process.hrtime.bigint();
    res.on('finish', () => {
      const ms = Number(process.hrtime.bigint() - startedAt) / 1e6;
      const status = res.statusCode;
      const line = {
        message: 'request',
        method: req.method,
        route: routePattern(req),
        status,
        ms: Math.round(ms * 10) / 10,
        requestId,
      };
      if (status >= 500) logger.error(line, undefined, REQUEST_LOG_CONTEXT);
      else if (status >= 400) logger.warn(line, REQUEST_LOG_CONTEXT);
      else logger.log(line, REQUEST_LOG_CONTEXT);
    });
    requestContext.run({ requestId }, () => next());
  };
}
