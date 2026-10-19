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

/** Envio em lote e recibos (outbox, eng-qualidade-02). */
describe('PushDispatcherService (lote, timeout e recibos)', () => {
  const realFetch = global.fetch;
  const service = new PushDispatcherService();
  const msg = (i: number) => ({ to: `ExponentPushToken[${i}]`, title: 'T', body: 'B' });

  afterEach(() => {
    global.fetch = realFetch;
    delete process.env.EXPO_ACCESS_TOKEN;
  });

  it('lote vai como lista, com timeout (AbortSignal) e um ticket por mensagem na ordem', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ status: 'ok', id: 't1' }, { status: 'error', details: { error: 'DeviceNotRegistered' } }] }),
    });
    global.fetch = fetchMock as any;

    const tickets = await service.sendBatch([msg(1), msg(2)]);

    expect(tickets).toEqual([
      { status: 'ok', ticketId: 't1' },
      { status: 'error', error: 'DeviceNotRegistered' },
    ]);
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toHaveLength(2);
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('EXPO_ACCESS_TOKEN vai no Authorization', async () => {
    process.env.EXPO_ACCESS_TOKEN = 'tok';
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: { status: 'ok', id: 't' } }) });
    global.fetch = fetchMock as any;
    await service.sendBatch([msg(1)]);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer tok');
  });

  it('rede/timeout/HTTP de erro: o lote inteiro vira retry', async () => {
    global.fetch = jest.fn().mockRejectedValue(Object.assign(new Error('timeout'), { name: 'TimeoutError' })) as any;
    await expect(service.sendBatch([msg(1), msg(2)])).resolves.toEqual([
      { status: 'retry', error: 'TIMEOUT' },
      { status: 'retry', error: 'TIMEOUT' },
    ]);
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }) as any;
    await expect(service.sendBatch([msg(1)])).resolves.toEqual([{ status: 'retry', error: 'HTTP_503' }]);
  });

  it('mais de 100 mensagens num lote é erro de programação', async () => {
    await expect(service.sendBatch(Array.from({ length: 101 }, (_, i) => msg(i)))).rejects.toThrow('limite');
  });

  it('recibos: ok/erro por id; falha da consulta → null', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { a: { status: 'ok' }, b: { status: 'error', details: { error: 'DeviceNotRegistered' } } } }),
    }) as any;
    await expect(service.getReceipts(['a', 'b'])).resolves.toEqual({
      a: { status: 'ok' },
      b: { status: 'error', error: 'DeviceNotRegistered' },
    });
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as any;
    await expect(service.getReceipts(['a'])).resolves.toBeNull();
  });
});
