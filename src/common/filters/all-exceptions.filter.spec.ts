import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { AllExceptionsFilter, ERROR_MESSAGES, internalErrorMessage } from './all-exceptions.filter';
import { ensureRequestId, generateRequestId, pickRequestId, requestIdMiddleware } from '../request-id';
import * as sentry from './sentry';

/** eng-qualidade-04 / contrato 7: erros em português com código de rastreio. */
describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  const run = (exception: unknown, reqOver: Record<string, any> = {}) => {
    const headers: Record<string, string> = {};
    const res: any = {
      headersSent: false,
      setHeader: jest.fn((key: string, value: string) => (headers[key] = value)),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const req: any = { method: 'GET', path: '/api/v1/x', url: '/api/v1/x?busca=maria', headers: {}, ...reqOver };
    const host: any = {
      getType: () => 'http',
      switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
    };
    filter.catch(exception, host);
    return { status: res.status.mock.calls[0]?.[0], body: res.json.mock.calls[0]?.[0], headers, req };
  };

  beforeEach(() => jest.spyOn((filter as any).logger, 'error').mockImplementation(() => undefined));
  afterEach(() => jest.restoreAllMocks());

  it('todo erro leva requestId no corpo e X-Request-Id no cabeçalho (o mesmo)', () => {
    const { body, headers, status } = run(new BadRequestException('Informe o motivo da retificação'));
    expect(status).toBe(400);
    expect(body.requestId).toMatch(/^[0-9a-f]{12}$/);
    expect(headers['X-Request-Id']).toBe(body.requestId);
    // mensagem própria em português fica como está
    expect(body.message).toBe('Informe o motivo da retificação');
  });

  it('repassa o X-Request-Id do cliente quando é seguro', () => {
    const { body } = run(new NotFoundException(), { headers: { 'x-request-id': 'app-1234abcd' } });
    expect(body.requestId).toBe('app-1234abcd');
    const evil = run(new NotFoundException(), { headers: { 'x-request-id': '<script>' } });
    expect(evil.body.requestId).toMatch(/^[0-9a-f]{12}$/);
  });

  it('traduz as mensagens padrão (401, 403, 404 de rota, 429)', () => {
    expect(run(new UnauthorizedException()).body.message).toBe(ERROR_MESSAGES[401]);
    expect(run(new ForbiddenException()).body.message).toBe(ERROR_MESSAGES[403]);
    expect(run(new ForbiddenException('Forbidden resource')).body.message).toBe(ERROR_MESSAGES[403]);
    expect(run(new NotFoundException('Cannot GET /api/v1/nada')).body.message).toBe(ERROR_MESSAGES[404]);
    expect(run(new ThrottlerException()).body.message).toBe(ERROR_MESSAGES[429]);
    expect(run(new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS)).body.message).toBe(ERROR_MESSAGES[429]);
  });

  it('mensagens próprias e respostas estruturadas (code, retryAfter...) não são apagadas', () => {
    const { body } = run(
      new ForbiddenException({ statusCode: 403, code: 'PLAN_REQUIRED', feature: 'catechesis', message: 'Recurso do plano pago' }),
    );
    expect(body).toMatchObject({ statusCode: 403, code: 'PLAN_REQUIRED', feature: 'catechesis', message: 'Recurso do plano pago' });
    expect(body.requestId).toBeTruthy();

    const throttled = run(new HttpException({ statusCode: 429, message: 'Aguarde 30 s', retryAfter: 30 }, 429));
    expect(throttled.body).toMatchObject({ retryAfter: 30, message: 'Aguarde 30 s' });

    const sessao = run(new UnauthorizedException('Sessão encerrada — entre novamente'));
    expect(sessao.body.message).toBe('Sessão encerrada — entre novamente');
  });

  it('lista de validação fica como está', () => {
    const { body } = run(new BadRequestException(['nome é obrigatório', 'e-mail inválido']));
    expect(body.message).toEqual(['nome é obrigatório', 'e-mail inválido']);
    expect(body.error).toBe('Bad Request');
  });

  it('erro inesperado → 500 genérico com o código; log sem query nem dado pessoal; Sentry com as tags', () => {
    const capture = jest.spyOn(sentry, 'captureServerError').mockImplementation(() => undefined);
    const error = Object.assign(new Error('Invalid `prisma.user.findUnique()` where: { email: "maria@x.com" }'), {
      name: 'PrismaClientValidationError',
    });
    const { status, body } = run(error, { method: 'POST', baseUrl: '', route: { path: '/api/v1/users/:id' } });

    expect(status).toBe(500);
    expect(body.message).toBe(internalErrorMessage(body.requestId));
    expect(body.message).toContain('Erro interno. Se persistir, informe o código');
    const logged = ((filter as any).logger.error as jest.Mock).mock.calls[0][0] as string;
    expect(logged).toContain(body.requestId);
    expect(logged).toContain('POST /api/v1/users/:id');
    expect(logged).not.toContain('maria@x.com');
    expect(logged).not.toContain('busca=');
    expect(capture).toHaveBeenCalledWith(error, expect.objectContaining({ requestId: body.requestId, method: 'POST', status: 500 }));
  });

  it('5xx com mensagem própria em português fica; o padrão vira a genérica', () => {
    jest.spyOn(sentry, 'captureServerError').mockImplementation(() => undefined);
    expect(run(new ServiceUnavailableException('Envio de SMS indisponível no momento')).body.message).toBe(
      'Envio de SMS indisponível no momento',
    );
    const generic = run(new ServiceUnavailableException());
    expect(generic.body.message).toBe(internalErrorMessage(generic.body.requestId));
  });

  it('4xx não vai ao Sentry nem ao log de erro', () => {
    const capture = jest.spyOn(sentry, 'captureServerError').mockImplementation(() => undefined);
    run(new ForbiddenException());
    expect(capture).not.toHaveBeenCalled();
    expect((filter as any).logger.error).not.toHaveBeenCalled();
  });
});

describe('request id', () => {
  it('gera 12 hex; aceita do cliente só valor curto e seguro', () => {
    expect(generateRequestId()).toMatch(/^[0-9a-f]{12}$/);
    expect(pickRequestId('abc-123_XYZ')).toBe('abc-123_XYZ');
    expect(pickRequestId('a b')).toMatch(/^[0-9a-f]{12}$/);
    expect(pickRequestId('x'.repeat(65))).toMatch(/^[0-9a-f]{12}$/);
    expect(pickRequestId(undefined)).toMatch(/^[0-9a-f]{12}$/);
  });

  it('middleware publica o cabeçalho e o filtro reaproveita o mesmo id', () => {
    const req: any = { headers: {} };
    const res: any = { headersSent: false, setHeader: jest.fn() };
    const next = jest.fn();
    requestIdMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', req.requestId);
    expect(ensureRequestId(req, res)).toBe(req.requestId);
    expect(res.setHeader).toHaveBeenCalledTimes(1);
  });
});
