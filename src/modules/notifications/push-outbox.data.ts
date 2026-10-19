/**
 * Formato do campo `data` (Json) de NotificationOutbox para o canal PUSH:
 * `{ payload, bulk }` — `payload` é o `data` que vai ao aparelho (o mesmo de
 * antes da outbox) e `bulk` guarda a opção do aviso em massa para o fallback
 * (B8: aviso em massa não cai para SMS). `skipFallback` (S2): o aviso já vai
 * por e-mail pelo próprio fluxo — push que falhar não segue para e-mail/SMS.
 * Nenhum dado pessoal além do que já ia no push.
 */
export interface OutboxPushData {
  payload: Record<string, unknown>;
  bulk: boolean;
  skipFallback: boolean;
}

export function buildOutboxData(
  data: Record<string, unknown> | undefined,
  bulk?: boolean,
  skipFallback?: boolean,
): any {
  // JSON puro (mesmo cuidado do Notification.data: Date/undefined viram texto/somem)
  const payload = data ? JSON.parse(JSON.stringify(data)) : {};
  // skipFallback só é gravado quando ligado (linhas antigas seguem idênticas)
  return skipFallback ? { payload, bulk: Boolean(bulk), skipFallback: true } : { payload, bulk: Boolean(bulk) };
}

export function readOutboxData(raw: unknown): OutboxPushData {
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'payload' in raw) {
    const value = raw as { payload?: unknown; bulk?: unknown; skipFallback?: unknown };
    const payload =
      value.payload && typeof value.payload === 'object' && !Array.isArray(value.payload)
        ? (value.payload as Record<string, unknown>)
        : {};
    return { payload, bulk: value.bulk === true, skipFallback: value.skipFallback === true };
  }
  // Linha gravada em outro formato: o próprio objeto é o payload
  return {
    payload: raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {},
    bulk: false,
    skipFallback: false,
  };
}
