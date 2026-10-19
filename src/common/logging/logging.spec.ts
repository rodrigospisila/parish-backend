import { EventEmitter } from 'events';
import { Logger } from '@nestjs/common';
import { formatJsonLog, isJsonLogFormat, JsonLogger } from './json-logger';
import { createRequestLoggingMiddleware, isHealthPath, routePattern } from './request-logging.middleware';
import { currentRequestId, requestContext } from './request-context';
import { describeSlowQuery, slowQueryThresholdMs } from './slow-query';

/** Logs estruturados (eng-qualidade-15, contrato C6). */
describe('logs estruturados', () => {
  describe('JsonLogger', () => {
    const capture = () => {
      const lines: Array<{ line: any; level: string }> = [];
      const logger = new JsonLogger((line, level) => lines.push({ line: JSON.parse(line), level }));
      return { lines, logger };
    };

    it('só liga com LOG_FORMAT=json', () => {
      expect(isJsonLogFormat({ LOG_FORMAT: 'json' } as any)).toBe(true);
      expect(isJsonLogFormat({ LOG_FORMAT: ' JSON ' } as any)).toBe(true);
      expect(isJsonLogFormat({} as any)).toBe(false);
      expect(isJsonLogFormat({ LOG_FORMAT: 'text' } as any)).toBe(false);
    });

    it('uma linha JSON com nível, contexto, mensagem e requestId (dentro da requisição)', () => {
      const { lines, logger } = capture();
      logger.log('fora', 'Ctx');
      requestContext.run({ requestId: 'abc123def456' }, () => logger.warn('dentro', 'Escalas'));
      expect(lines[0].line).toEqual({ time: expect.any(String), level: 'info', context: 'Ctx', message: 'fora' });
      expect(lines[1].line).toEqual(
        expect.objectContaining({ level: 'warn', context: 'Escalas', message: 'dentro', requestId: 'abc123def456' }),
      );
    });

    it('error com stack (como o Logger do Nest chama) vai para o stderr', () => {
      const { lines, logger } = capture();
      logger.error('quebrou', 'Error: x\n    at y', 'Ctx');
      expect(lines[0]).toEqual({
        level: 'error',
        line: expect.objectContaining({ level: 'error', message: 'quebrou', context: 'Ctx', stack: 'Error: x\n    at y' }),
      });
    });

    it('funciona como logger global do Nest (new Logger(ctx))', () => {
      const { lines, logger } = capture();
      Logger.overrideLogger(logger);
      try {
        new Logger('Teste').log('oi');
        new Logger('Teste').error('falhou');
      } finally {
        Logger.overrideLogger(false as any);
        Logger.overrideLogger(true as any);
      }
      expect(lines.map((l) => [l.line.level, l.line.context, l.line.message])).toEqual([
        ['info', 'Teste', 'oi'],
        ['error', 'Teste', 'falhou'],
      ]);
    });

    it('mensagem-objeto vira campos, sem sobrescrever os reservados; respeita os níveis', () => {
      const line = formatJsonLog('info', { message: 'request', status: 200, level: 'hack' }, 'HTTP', { now: new Date(0) });
      expect(line).toEqual({ time: '1970-01-01T00:00:00.000Z', level: 'info', context: 'HTTP', message: 'request', status: 200 });
      const { lines, logger } = capture();
      logger.setLogLevels(['error', 'warn']);
      logger.log('some');
      logger.warn('fica');
      expect(lines).toHaveLength(1);
    });
  });

  describe('log de requisição', () => {
    const fakeRes = () => {
      const res: any = new EventEmitter();
      res.statusCode = 200;
      res.headersSent = false;
      res.setHeader = jest.fn();
      return res;
    };

    it('rota-padrão (nunca a URL com ids/query), status, ms e requestId; sem corpo nem usuário', () => {
      const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
      const middleware = createRequestLoggingMiddleware(logger as any);
      const req: any = {
        method: 'GET',
        originalUrl: '/api/v1/members/123?cpf=00000000000',
        url: '/api/v1/members/123?cpf=00000000000',
        headers: { 'x-request-id': 'cliente-abc-123' },
        body: { password: 'segredo' },
        user: { id: 'u1', email: 'a@b.com' },
        baseUrl: '',
      };
      const res = fakeRes();
      let idInside: string | undefined;
      middleware(req, res, () => {
        idInside = currentRequestId();
      });
      req.route = { path: '/api/v1/members/:id' };
      res.statusCode = 404;
      res.emit('finish');

      expect(idInside).toBe('cliente-abc-123');
      const [line, context] = logger.warn.mock.calls[0];
      expect(context).toBe('HTTP');
      expect(line).toEqual({
        message: 'request',
        method: 'GET',
        route: '/api/v1/members/:id',
        status: 404,
        ms: expect.any(Number),
        requestId: 'cliente-abc-123',
      });
      expect(JSON.stringify(line)).not.toMatch(/123\?|cpf|segredo|a@b\.com/);
    });

    it('5xx sai como error; /health não entra', () => {
      const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
      const middleware = createRequestLoggingMiddleware(logger as any);
      const res = fakeRes();
      middleware({ method: 'POST', originalUrl: '/api/v1/x', headers: {} } as any, res, () => undefined);
      res.statusCode = 500;
      res.emit('finish');
      expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ status: 500, route: '(sem rota)' }), undefined, 'HTTP');

      const health = fakeRes();
      const next = jest.fn();
      middleware({ method: 'GET', originalUrl: '/health', headers: {} } as any, health, next);
      health.emit('finish');
      expect(next).toHaveBeenCalled();
      expect(logger.log).not.toHaveBeenCalled();
      expect(isHealthPath('/health?x=1')).toBe(true);
      expect(isHealthPath('/api/v1/healthy')).toBe(false);
      expect(routePattern({ baseUrl: '/api', route: { path: '/x/:id' } } as any)).toBe('/api/x/:id');
    });
  });

  describe('consulta lenta do Prisma', () => {
    it('limite padrão 500 ms, configurável, 0 desliga', () => {
      expect(slowQueryThresholdMs({} as any)).toBe(500);
      expect(slowQueryThresholdMs({ PRISMA_SLOW_QUERY_MS: '1200' } as any)).toBe(1200);
      expect(slowQueryThresholdMs({ PRISMA_SLOW_QUERY_MS: '0' } as any)).toBe(0);
      expect(slowQueryThresholdMs({ PRISMA_SLOW_QUERY_MS: 'abc' } as any)).toBe(500);
    });

    it('aviso com o início do SQL (120 caracteres), nunca os parâmetros', () => {
      const query = `SELECT "public"."members"."id" FROM   "public"."members" WHERE "public"."members"."cpf" = $1 ${'AND 1=1 '.repeat(30)}`;
      const text = describeSlowQuery({ query, duration: 812.4, params: '["123.456.789-00"]' } as any);
      expect(text.startsWith('Consulta lenta (812 ms): SELECT "public"."members"."id" FROM "public"."members"')).toBe(true);
      expect(text).not.toContain('123.456.789-00');
      expect(text.length).toBeLessThanOrEqual('Consulta lenta (812 ms): '.length + 120);
    });
  });
});
