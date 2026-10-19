import { randomBytes } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

/**
 * Código de rastreio da requisição (eng-qualidade-04). Vai no cabeçalho
 * `X-Request-Id` de toda resposta e no corpo de todo erro: quem liga para o
 * suporte informa o código e ele localiza a linha no log (e o evento no Sentry).
 *
 * O cliente pode mandar o próprio `X-Request-Id` (o app/painel ligam a tela
 * ao log); só é aceito um valor curto e sem caracteres especiais — o resto
 * é trocado por um gerado aqui.
 */
export const REQUEST_ID_HEADER = 'X-Request-Id';

const CLIENT_ID_PATTERN = /^[A-Za-z0-9._-]{6,64}$/;

/** 12 caracteres hexadecimais: curto para ler ao telefone, suficiente para achar no log. */
export const generateRequestId = (): string => randomBytes(6).toString('hex');

export const pickRequestId = (incoming: unknown): string => {
  const value = Array.isArray(incoming) ? incoming[0] : incoming;
  return typeof value === 'string' && CLIENT_ID_PATTERN.test(value) ? value : generateRequestId();
};

type RequestWithId = Request & { requestId?: string };

/** Id já atribuído à requisição; atribui (e publica no cabeçalho) se ainda não houver. */
export const ensureRequestId = (req: RequestWithId | undefined, res?: Response): string => {
  if (req?.requestId) return req.requestId;
  const id = pickRequestId(req?.headers?.['x-request-id']);
  if (req) req.requestId = id;
  if (res && !res.headersSent && typeof res.setHeader === 'function') res.setHeader(REQUEST_ID_HEADER, id);
  return id;
};

/** Middleware global (main.ts): antes de qualquer rota, guarda e o filtro de erros. */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  ensureRequestId(req as RequestWithId, res);
  next();
};
