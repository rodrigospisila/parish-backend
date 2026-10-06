import { PushDispatcherService } from './push-dispatcher.service';

/** B44 — o Expo responde HTTP 200 mesmo quando o envio falhou: vale o ticket. */
describe('PushDispatcherService (tickets do Expo)', () => {
  const realFetch = global.fetch;
  const service = new PushDispatcherService();
  const message = { to: 'ExponentPushToken[x]', title: 'T', body: 'B' };

  const respond = (status: number, body: unknown) => {
    global.fetch = jest.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body }) as any;
  };

  afterEach(() => {
    global.fetch = realFetch;
  });

  it('ticket ok → entregue', async () => {
    respond(200, { data: { status: 'ok', id: 'ticket-1' } });
    await expect(service.sendWithResult(message)).resolves.toEqual({ sent: true, invalidToken: false });
    await expect(service.send(message)).resolves.toBe(true);
  });

  it('ticket de erro com HTTP 200 → falha; DeviceNotRegistered marca o token como inválido', async () => {
    respond(200, { data: { status: 'error', message: 'not registered', details: { error: 'DeviceNotRegistered' } } });
    await expect(service.sendWithResult(message)).resolves.toEqual({ sent: false, invalidToken: true });
  });

  it('outros erros do ticket (MessageRateExceeded) → falha, token mantido', async () => {
    respond(200, { data: [{ status: 'error', details: { error: 'MessageRateExceeded' } }] });
    await expect(service.sendWithResult(message)).resolves.toEqual({ sent: false, invalidToken: false });
  });

  it('HTTP de erro ou rede → falha', async () => {
    respond(500, {});
    await expect(service.send(message)).resolves.toBe(false);
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as any;
    await expect(service.send(message)).resolves.toBe(false);
  });
});
