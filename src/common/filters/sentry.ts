import type * as SentryNode from '@sentry/node';

/**
 * Rastreamento de erros no Sentry (eng-qualidade-03), LIGADO SÓ com
 * `SENTRY_DSN` definido: sem DSN o pacote nem é carregado e nada muda.
 *
 * LGPD: só vão erros 5xx e exceções não tratadas, com o código de rastreio
 * (`requestId`), o método e a rota como tags. Nada de dado pessoal:
 * `sendDefaultPii: false`, sem corpo, sem query string, sem cookies e sem os
 * cabeçalhos Authorization/Cookie; sem breadcrumbs (URLs de serviços externos
 * podem levar endereço/telefone). A mensagem da exceção também é limpa: a dos
 * erros do Prisma (traz os valores da consulta) vira texto genérico com o
 * code; nas demais, e-mail, CPF, telefone e números longos são mascarados.
 * O DSN vem do ambiente real (Railway) — é lido antes do ConfigModule
 * carregar o .env.
 */

let sentry: typeof SentryNode | null = null;

const SENSITIVE_HEADERS = new Set(['authorization', 'cookie', 'set-cookie', 'x-api-key', 'proxy-authorization']);

/** Tamanho máximo da mensagem de erro enviada (o resto é cortado). */
const MAX_MESSAGE = 500;

/** Código de erro do Prisma (P2002, P2025…) — vai como tag, nunca a mensagem. */
const PRISMA_CODE = /^P\d{4}$/;

/**
 * Mascara dado pessoal no texto de uma exceção: e-mails, CPF/CNPJ, telefones
 * e qualquer sequência longa de dígitos (exportado para teste).
 */
export const maskPersonalData = (text: string): string =>
  String(text ?? '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[e-mail]')
    .replace(/(?<!\d)\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}(?!\d)/g, '[cnpj]')
    .replace(/(?<!\d)\d{3}\.\d{3}\.\d{3}-\d{2}(?!\d)/g, '[cpf]')
    // +55 (42) 99999-8888, (42) 9999-8888, 42 99999 8888, +5542999998888
    .replace(/(?<!\w)(?:\+?55[\s-]?)?\(?\d{2}\)?[\s-]?9?\d{4}[\s-]?\d{4}(?!\d)/g, '[telefone]')
    .replace(/(?<!\d)\d{11}(?!\d)/g, '[cpf]')
    .replace(/(?<!\d)\d{8,}(?!\d)/g, '[número]')
    .slice(0, MAX_MESSAGE);

/**
 * Mensagens das exceções do evento. Erros do Prisma trazem os valores da
 * consulta (nome, CPF, telefone) — a mensagem vira um texto genérico com o
 * code, como no log (`describeForLog`). As demais são mascaradas.
 */
const scrubExceptionValues = (event: Record<string, any>) => {
  const values = event?.exception?.values;
  if (Array.isArray(values)) {
    const code = typeof event.tags?.errorCode === 'string' ? event.tags.errorCode : '';
    for (const item of values) {
      if (!item || typeof item !== 'object') continue;
      if (String(item.type ?? '').startsWith('PrismaClient')) {
        item.value = `Erro do banco de dados (${item.type}${code ? ` code=${code}` : ''}); mensagem omitida`;
      } else if (typeof item.value === 'string') {
        item.value = maskPersonalData(item.value);
      }
    }
  }
  if (typeof event?.message === 'string') event.message = maskPersonalData(event.message);
  // Valor lançado que não é Error: o SDK serializa as chaves/valores em `extra`
  if (event?.extra && typeof event.extra === 'object') delete event.extra.__serialized__;
};

/** Limpa o evento antes do envio (exportado para teste). */
export const scrubSentryEvent = <T extends Record<string, any>>(event: T): T => {
  scrubExceptionValues(event);
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
      // Só o code do Prisma (P2002…): a mensagem dele é trocada no beforeSend
      const code = (exception as any)?.code;
      if (typeof code === 'string' && PRISMA_CODE.test(code)) scope.setTag('errorCode', code);
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
