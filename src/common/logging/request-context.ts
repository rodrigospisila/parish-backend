import { AsyncLocalStorage } from 'async_hooks';

/**
 * Contexto da requisição em andamento (só o código de rastreio). Com
 * LOG_FORMAT=json, o middleware de log de requisição abre o contexto e o
 * JsonLogger inclui o `requestId` em toda linha escrita durante a requisição —
 * inclusive as dos services, sem passar o id de mão em mão.
 */
export interface RequestContext {
  requestId: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export const currentRequestId = (): string | undefined => requestContext.getStore()?.requestId;
