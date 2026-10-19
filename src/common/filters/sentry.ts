import type * as SentryNode from '@sentry/node';

/**
 * Rastreamento de erros no Sentry (eng-qualidade-03), LIGADO SÓ com
 * `SENTRY_DSN` definido: sem DSN o pacote nem é carregado e nada muda.
 *
 * LGPD: só vão erros 5xx e exceções não tratadas, com o código de rastreio
 * (`requestId`), o método e a rota como tags. Nada de dado pessoal:
 * `sendDefaultPii: false`, sem corpo, sem query string, sem cookies e sem os
 * cabeçalhos Authorization/Cookie; sem breadcrumbs (URLs de serviços externos
 * podem levar endereço/telefone). O DSN vem do ambiente real (Railway) — é
 * lido antes do ConfigModule carregar o .env.
 */

let sentry: typeof SentryNode | null = null;

const SENSITIVE_HEADERS = new Set(['authorization', 'cookie', 'set-cookie', 'x-api-key', 'proxy-authorization']);

/** Limpa o evento antes do envio (exportado para teste). */
export const scrubSentryEvent = <T extends Record<string, any>>(event: T): T => {
  const request = event?.request;
  if (request) {
    delete request.data;
    delete request.cookies;
    delete request.query_string;
    if (typeof request.url === 'string') request.url = request.url.split('?')[0];
    if (request.headers && typeof request.headers === 'object') {
      for (const key of Object.keys(request.headers)) {
        if (SENSITIVE_HEADERS.has(key.toLowerCase())) delete request.headers[key];
      }
    }
  }
  if (event?.user) {
    // Só o id (sem e-mail, nome ou IP)
    const id = event.user.id;
    (event as any).user = id ? { id } : undefined;
  }
  delete (event as any).breadcrumbs;
  return event;
};

/** Inicializa o Sentry se houver DSN. Nunca derruba o boot. */
export const initSentry = (env: NodeJS.ProcessEnv = process.env): boolean => {
  const dsn = env.SENTRY_DSN?.trim();
  if (!dsn || sentry) return !!sentry;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry: typeof SentryNode = require('@sentry/node');
    Sentry.init({
      dsn,
      environment: env.SENTRY_ENVIRONMENT || env.NODE_ENV || 'development',
      release: env.RAILWAY_GIT_COMMIT_SHA ? env.RAILWAY_GIT_COMMIT_SHA.slice(0, 7) : undefined,
      sendDefaultPii: false,
      maxBreadcrumbs: 0,
      beforeSend: (event) => scrubSentryEvent(event as any),
    });
    sentry = Sentry;
    return true;
  } catch (error) {
    console.error(`[Sentry] não inicializado: ${String((error as Error)?.message ?? error)}`);
    return false;
  }
};

export const isSentryEnabled = (): boolean => !!sentry;

/** Envia um erro de servidor (5xx/não tratado) com as tags da requisição. Sem Sentry, não faz nada. */
export const captureServerError = (
  exception: unknown,
  tags: { requestId: string; method?: string; route?: string; status?: number },
): void => {
  if (!sentry) return;
  try {
    sentry.withScope((scope) => {
      scope.setTag('requestId', tags.requestId);
      if (tags.method) scope.setTag('method', tags.method);
      if (tags.route) scope.setTag('route', tags.route);
      if (tags.status) scope.setTag('status', String(tags.status));
      sentry!.captureException(exception);
    });
  } catch {
    // Rastreamento nunca derruba a resposta
  }
};

/** Só para testes: desliga o Sentry carregado. */
export const resetSentryForTests = () => {
  sentry = null;
};
