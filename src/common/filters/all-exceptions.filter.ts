import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ensureRequestId } from '../request-id';
import { captureServerError } from './sentry';

/**
 * Filtro global de erros (eng-qualidade-04 — contrato 7 da Onda 0).
 *
 * - Todo erro sai com `requestId` no corpo (e `X-Request-Id` no cabeçalho).
 * - As mensagens PADRÃO do Nest/Express em inglês viram português; mensagens
 *   próprias (já em português) e respostas estruturadas ficam como estão —
 *   `code`, `retryAfter` e qualquer outro campo nunca são apagados.
 * - 5xx: mensagem genérica com o código (o detalhe técnico não vai ao
 *   usuário), log com requestId, método e rota — sem corpo, query ou dado
 *   pessoal — e envio ao Sentry quando ligado.
 */
export const ERROR_MESSAGES = {
  401: 'Sessão expirada ou inválida. Entre novamente.',
  403: 'Você não tem permissão para fazer isso.',
  404: 'Recurso não encontrado.',
  429: 'Muitas tentativas. Aguarde um pouco e tente de novo.',
} as const;

export const internalErrorMessage = (requestId: string) =>
  `Erro interno. Se persistir, informe o código ${requestId}.`;

/** Mensagens padrão (em inglês) por status — só estas são traduzidas. */
const DEFAULT_MESSAGES: Record<number, RegExp> = {
  400: /^bad request$/i,
  401: /^unauthorized$/i,
  403: /^forbidden( resource)?$/i,
  404: /^(not found|cannot (get|post|put|patch|delete|head|options) .*)$/i,
  405: /^method not allowed$/i,
  409: /^conflict$/i,
  413: /^(payload|request entity) too large$/i,
  429: /too many requests/i,
};

const EXTRA_MESSAGES: Record<number, string> = {
  400: 'Requisição inválida.',
  405: 'Operação não permitida.',
  409: 'Conflito com o estado atual do registro.',
  413: 'Conteúdo grande demais.',
};

const isDefaultMessage = (status: number, message: unknown): boolean => {
  if (message === undefined || message === null || message === '') return true;
  if (typeof message !== 'string') return false;
  const pattern = DEFAULT_MESSAGES[status];
  return !!pattern && pattern.test(message.trim());
};

/** Mensagem final: traduz a padrão, preserva a própria (string ou lista de validação). */
export const translateMessage = (status: number, message: unknown, requestId: string): unknown => {
  if (status >= 500) return internalErrorMessage(requestId);
  if (!isDefaultMessage(status, message)) return message;
  return (ERROR_MESSAGES as Record<number, string>)[status] ?? EXTRA_MESSAGES[status] ?? message;
};

/**
 * 5xx com mensagem própria em português (ex.: 503 "SMS indisponível") é
 * mantida; só a padrão/inesperada vira a genérica com o código.
 */
const serverMessage = (status: number, message: unknown, requestId: string, handled: boolean): unknown => {
  if (handled && typeof message === 'string' && message && !/^(internal server error|bad gateway|service unavailable|gateway timeout|not implemented)$/i.test(message.trim())) {
    return message;
  }
  return internalErrorMessage(requestId);
};

/** Rota sem ids nem query: o padrão do Express ("/api/v1/users/:id") quando houver. */
const routeOf = (req: Request | undefined): string => {
  if (!req) return '-';
  const pattern = (req as any).route?.path;
  if (typeof pattern === 'string') return `${req.baseUrl ?? ''}${pattern}`;
  return String(req.path ?? req.url ?? '-').split('?')[0];
};

/** Descrição do erro para o log, sem dado pessoal (erros do Prisma podem trazer valores da consulta). */
const describeForLog = (exception: unknown): string => {
  if (!(exception instanceof Error)) return typeof exception;
  const frames = (exception.stack ?? '').split('\n').slice(1, 6).join('\n');
  const code = (exception as any).code ? ` code=${(exception as any).code}` : '';
  if (exception.name.startsWith('PrismaClient')) return `${exception.name}${code}\n${frames}`;
  return `${exception.name}${code}: ${exception.message.slice(0, 300)}\n${frames}`;
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpError');

  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() !== 'http') throw exception;
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const requestId = ensureRequestId(req as any, res);

    const handled = exception instanceof HttpException;
    const status = handled ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let body: Record<string, any>;
    if (handled) {
      const response = exception.getResponse();
      body =
        typeof response === 'string'
          ? { statusCode: status, message: response }
          : { ...(response as Record<string, any>) };
      if (body.statusCode === undefined) body.statusCode = status;
    } else {
      body = { statusCode: status, error: 'Internal Server Error' };
    }

    body.message =
      status >= 500
        ? serverMessage(status, body.message, requestId, handled)
        : translateMessage(status, body.message, requestId);
    body.requestId = requestId;

    if (status >= 500) {
      const route = routeOf(req);
      this.logger.error(`[${requestId}] ${req?.method ?? '-'} ${route} → ${status} ${describeForLog(exception)}`);
      captureServerError(exception, { requestId, method: req?.method, route, status });
    }

    if (res.headersSent) return;
    res.status(status).json(body);
  }
}
