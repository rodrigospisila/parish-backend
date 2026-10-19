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

  it('rede ao conectar e HTTP 5xx/429: o lote inteiro vira retry', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('fetch failed')) as any;
    await expect(service.sendBatch([msg(1), msg(2)])).resolves.toEqual([
      { status: 'retry', error: 'NETWORK' },
      { status: 'retry', error: 'NETWORK' },
    ]);
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }) as any;
    await expect(service.sendBatch([msg(1)])).resolves.toEqual([{ status: 'retry', error: 'HTTP_503' }]);
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) }) as any;
    await expect(service.sendBatch([msg(1), msg(2)])).resolves.toEqual([
      { status: 'retry', error: 'HTTP_429' },
      { status: 'retry', error: 'HTTP_429' },
    ]);
  });

  it('S4: tempo esgotado = entrega incerta (o Expo pode ter aceitado) — não pede reenvio', async () => {
    const fetchMock = jest.fn().mockRejectedValue(Object.assign(new Error('timeout'), { name: 'TimeoutError' }));
    global.fetch = fetchMock as any;
    await expect(service.sendBatch([msg(1), msg(2)])).resolves.toEqual([
      { status: 'uncertain', error: 'TIMEOUT' },
      { status: 'uncertain', error: 'TIMEOUT' },
    ]);
    // Uma única chamada: nada de reenviar dentro do dispatcher
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await expect(service.send(msg(1))).resolves.toBe(false);
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

/**
 * S1 — uma mensagem ruim não derruba o lote: recusa do pedido inteiro (HTTP 400)
 * é isolada na hora, sem `retry` para as outras.
 */
describe('PushDispatcherService (isolamento de mensagem recusada — S1)', () => {
  const realFetch = global.fetch;
  const service = new PushDispatcherService();
  const ours = (i: number) => ({ to: `ExponentPushToken[nosso-${i}]`, title: 'T', body: 'B' });
  const foreign = { to: 'ExponentPushToken[alheio]', title: 'T', body: 'B' };
  const bad = { to: 'ExponentPushToken[ruim]', title: 'T', body: 'B' };

  const asList = (body: string): any[] => {
    const parsed = JSON.parse(body);
    return Array.isArray(parsed) ? parsed : [parsed];
  };
  /** Expo simulado: recebe as mensagens do pedido e decide a resposta. */
  const expo = (handler: (messages: any[]) => { status: number; body: unknown }) => {
    const fetchMock = jest.fn(async (_url: string, init: any) => {
      const { status, body } = handler(asList(init.body));
      return { ok: status >= 200 && status < 300, status, json: async () => body };
    });
    global.fetch = fetchMock as any;
    return fetchMock;
  };
  const okTickets = (messages: any[]) => ({
    status: 200,
    body: {
      data:
        messages.length === 1
          ? { status: 'ok', id: `t-${messages[0].to}` }
          : messages.map((m) => ({ status: 'ok', id: `t-${m.to}` })),
    },
  });
  const sentTokens = (fetchMock: jest.Mock): string[][] =>
    fetchMock.mock.calls.map(([, init]) => asList(init.body).map((m: any) => m.to));

  afterEach(() => {
    global.fetch = realFetch;
    delete process.env.EXPO_EXPERIENCE_ID;
  });

  /** Recusa do Expo para lote com projetos misturados (details = projeto → tokens). */
  const mixedProjects = (messages: any[]) => {
    const tokens = messages.map((m) => m.to);
    const alien = tokens.filter((t) => t === foreign.to);
    if (!alien.length || alien.length === tokens.length) return okTickets(messages);
    return {
      status: 400,
      body: {
        errors: [
          {
            code: 'PUSH_TOO_MANY_EXPERIENCE_IDS',
            message: 'All push notification messages in the same request must be for the same project',
            details: { '@rodrigospisila/parish-mobile': tokens.filter((t) => t !== foreign.to), '@outro/app': alien },
          },
        ],
      },
    };
  };

  it('token de outro projeto: cada projeto vai num pedido — os 99 vizinhos saem na mesma rodada', async () => {
    const batch = [...Array.from({ length: 50 }, (_, i) => ours(i)), foreign, ...Array.from({ length: 49 }, (_, i) => ours(50 + i))];
    const fetchMock = expo(mixedProjects);

    const tickets = await service.sendBatch(batch);

    expect(tickets).toHaveLength(100);
    // Ordem preservada: cada ticket corresponde à sua mensagem
    batch.forEach((message, index) => expect(tickets[index]).toEqual({ status: 'ok', ticketId: `t-${message.to}` }));
    // 1 pedido recusado + 1 por projeto
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(sentTokens(fetchMock)[1]).toHaveLength(99);
    expect(sentTokens(fetchMock)[2]).toEqual([foreign.to]);
  });

  it('com EXPO_EXPERIENCE_ID: o token de outro projeto nem é enviado e falha com motivo', async () => {
    process.env.EXPO_EXPERIENCE_ID = '@rodrigospisila/parish-mobile';
    const fetchMock = expo(mixedProjects);

    const tickets = await service.sendBatch([ours(1), foreign, ours(2)]);

    expect(tickets).toEqual([
      { status: 'ok', ticketId: `t-${ours(1).to}` },
      { status: 'error', error: 'PUSH_OUTRO_PROJETO_EXPO' },
      { status: 'ok', ticketId: `t-${ours(2).to}` },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sentTokens(fetchMock)[1]).toEqual([ours(1).to, ours(2).to]);
  });

  it('recusa sem detalhe (ex.: validação): divide ao meio até isolar a mensagem ruim', async () => {
    const batch = [...Array.from({ length: 70 }, (_, i) => ours(i)), bad, ...Array.from({ length: 29 }, (_, i) => ours(70 + i))];
    const fetchMock = expo((messages) =>
      messages.some((m) => m.to === bad.to)
        ? { status: 400, body: { errors: [{ code: 'VALIDATION_ERROR', message: 'to inválido' }] } }
        : okTickets(messages),
    );

    const tickets = await service.sendBatch(batch);

    expect(tickets[70]).toEqual({ status: 'error', error: 'VALIDATION_ERROR' });
    batch.forEach((message, index) => {
      if (index !== 70) expect(tickets[index]).toEqual({ status: 'ok', ticketId: `t-${message.to}` });
    });
    // Busca binária: ~2 pedidos por nível (log2 100 ≈ 7), nunca um por mensagem
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(16);
  });

  it('recusa com HTTP 200 e sem tickets também é isolada', async () => {
    expo((messages) =>
      messages.some((m) => m.to === bad.to) ? { status: 200, body: { errors: [{ code: 'VALIDATION_ERROR' }] } } : okTickets(messages),
    );
    await expect(service.sendBatch([ours(1), bad])).resolves.toEqual([
      { status: 'ok', ticketId: `t-${ours(1).to}` },
      { status: 'error', error: 'VALIDATION_ERROR' },
    ]);
  });

  it('mensagem única recusada: erro definitivo com o código do Expo (sem retry)', async () => {
    expo(() => ({ status: 400, body: { errors: [{ code: 'VALIDATION_ERROR' }] } }));
    await expect(service.sendBatch([ours(1)])).resolves.toEqual([{ status: 'error', error: 'VALIDATION_ERROR' }]);
    expo(() => ({ status: 400, body: null }));
    await expect(service.sendBatch([ours(1)])).resolves.toEqual([{ status: 'error', error: 'HTTP_400' }]);
  });

  it('timeout no meio do isolamento: só o pedaço afetado fica incerto', async () => {
    let call = 0;
    global.fetch = jest.fn(async (_url: string, init: any) => {
      call++;
      const messages = asList(init.body);
      if (call === 1) return { ok: false, status: 400, json: async () => ({ errors: [{ code: 'VALIDATION_ERROR' }] }) };
      if (messages.some((m: any) => m.to === bad.to)) throw Object.assign(new Error('timeout'), { name: 'TimeoutError' });
      const { body } = okTickets(messages);
      return { ok: true, status: 200, json: async () => body };
    }) as any;

    const tickets = await service.sendBatch([ours(1), ours(2), bad, ours(3)]);

    expect(tickets).toEqual([
      { status: 'ok', ticketId: `t-${ours(1).to}` },
      { status: 'ok', ticketId: `t-${ours(2).to}` },
      { status: 'uncertain', error: 'TIMEOUT' },
      { status: 'uncertain', error: 'TIMEOUT' },
    ]);
  });
});
