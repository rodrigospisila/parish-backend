import { PushOutboxService, outboxBackoffMs, OUTBOX_MAX_ATTEMPTS, OUTBOX_CLAIM_LIMIT } from './push-outbox.service';
import { buildOutboxData, readOutboxData } from './push-outbox.data';
import { PushDispatcherService } from './push-dispatcher.service';

/**
 * Outbox de push (eng-qualidade-02, contrato C6): lote com claim condicional,
 * envio em blocos de 100, backoff na falha, fallback e-mail/SMS na falha
 * definitiva e recibos que limpam o token morto.
 */
describe('PushOutboxService', () => {
  const now = new Date('2026-10-19T12:00:00.000Z');
  let prisma: any;
  let dispatcher: { sendBatch: jest.Mock; getReceipts: jest.Mock };
  let notifications: { deliverFallback: jest.Mock };
  let service: PushOutboxService;

  const row = (id: string, extra: Partial<Record<string, unknown>> = {}) => ({
    id,
    userId: `u-${id}`,
    notificationId: `n-${id}`,
    title: 'Aviso',
    body: 'Corpo',
    data: buildOutboxData({ newsId: 'x' }, false),
    attempts: 1,
    ...extra,
  });

  /** Prepara o lote: candidatos PENDING → claim → linhas SENDING desta rodada. */
  const queue = (rows: any[], tokens: Record<string, string | null> = {}) => {
    prisma.notificationOutbox.findMany
      .mockResolvedValueOnce(rows.map((r) => ({ id: r.id })))
      .mockResolvedValueOnce(rows);
    prisma.notificationOutbox.updateMany.mockResolvedValue({ count: rows.length });
    prisma.user.findMany.mockResolvedValue(
      rows.map((r) => ({ id: r.userId, pushToken: r.userId in tokens ? tokens[r.userId] : `ExponentPushToken[${r.id}]` })),
    );
  };

  beforeEach(() => {
    prisma = {
      notificationOutbox: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        update: jest.fn((args) => ({ op: 'update', args })),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      notification: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      user: { findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      $transaction: jest.fn(async (arg: any) => (Array.isArray(arg) ? arg : arg({ $queryRaw: jest.fn().mockResolvedValue([{ locked: true }]) }))),
    };
    dispatcher = { sendBatch: jest.fn(), getReceipts: jest.fn().mockResolvedValue({}) };
    notifications = { deliverFallback: jest.fn().mockResolvedValue(true) };
    service = new PushOutboxService(prisma, dispatcher as any, notifications as any);
  });

  afterEach(() => {
    delete process.env.PUSH_OUTBOX_WORKER;
  });

  it('formato da outbox: payload + bulk, e leitura tolerante', () => {
    expect(buildOutboxData({ a: 1 }, true)).toEqual({ payload: { a: 1 }, bulk: true });
    expect(buildOutboxData(undefined)).toEqual({ payload: {}, bulk: false });
    expect(buildOutboxData(undefined, false, true)).toEqual({ payload: {}, bulk: false, skipFallback: true });
    expect(readOutboxData({ payload: { a: 1 }, bulk: true })).toEqual({ payload: { a: 1 }, bulk: true, skipFallback: false });
    expect(readOutboxData({ payload: {}, bulk: false, skipFallback: true })).toEqual({ payload: {}, bulk: false, skipFallback: true });
    expect(readOutboxData({ a: 1 })).toEqual({ payload: { a: 1 }, bulk: false, skipFallback: false });
    expect(readOutboxData(null)).toEqual({ payload: {}, bulk: false, skipFallback: false });
  });

  it('backoff cresce por tentativa (30 s, 1 min, 2 min, 4 min) com teto', () => {
    expect([1, 2, 3, 4].map(outboxBackoffMs)).toEqual([30_000, 60_000, 120_000, 240_000]);
    expect(outboxBackoffMs(20)).toBe(30 * 60 * 1000);
  });

  it('pega até 500 PENDING vencidas e marca SENDING com gravação condicional', async () => {
    queue([row('a')]);
    dispatcher.sendBatch.mockResolvedValue([{ status: 'ok', ticketId: 't-a' }]);

    await service.sendPending(now);

    expect(prisma.notificationOutbox.findMany.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        where: { status: 'PENDING', channel: 'PUSH', availableAt: { lte: now } },
        take: OUTBOX_CLAIM_LIMIT,
      }),
    );
    // Claim: só o que ainda está PENDING vira SENDING; availableAt = instante do claim
    expect(prisma.notificationOutbox.updateMany.mock.calls[0][0]).toEqual({
      where: { id: { in: ['a'] }, status: 'PENDING' },
      data: { status: 'SENDING', availableAt: now, attempts: { increment: 1 } },
    });
    // Só processa as linhas que ESTA rodada marcou
    expect(prisma.notificationOutbox.findMany.mock.calls[1][0].where).toEqual({
      id: { in: ['a'] },
      status: 'SENDING',
      availableAt: now,
    });
  });

  it('claim sem efeito (outra réplica levou): não envia nada', async () => {
    prisma.notificationOutbox.findMany.mockResolvedValueOnce([{ id: 'a' }]);
    prisma.notificationOutbox.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.sendPending(now)).resolves.toEqual({ claimed: 0, sent: 0, retried: 0, failed: 0 });
    expect(dispatcher.sendBatch).not.toHaveBeenCalled();
  });

  it('envia em blocos de 100, grava SENT + ticket e marca a Notification como entregue', async () => {
    const rows = Array.from({ length: 250 }, (_, i) => row(`r${i}`));
    queue(rows);
    dispatcher.sendBatch.mockImplementation(async (messages: any[]) =>
      messages.map((m: any) => ({ status: 'ok', ticketId: `t-${m.to}` })),
    );

    const result = await service.sendPending(now);

    expect(dispatcher.sendBatch).toHaveBeenCalledTimes(3);
    expect(dispatcher.sendBatch.mock.calls.map((c) => c[0].length)).toEqual([100, 100, 50]);
    expect(dispatcher.sendBatch.mock.calls[0][0][0]).toEqual({
      to: 'ExponentPushToken[r0]',
      title: 'Aviso',
      body: 'Corpo',
      data: { newsId: 'x' },
    });
    expect(result).toEqual({ claimed: 250, sent: 250, retried: 0, failed: 0 });
    expect(prisma.notificationOutbox.update).toHaveBeenCalledWith({
      where: { id: 'r0' },
      data: { status: 'SENT', sentAt: now, ticketId: 't-ExponentPushToken[r0]', lastError: null },
    });
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: { in: rows.map((r) => r.notificationId) } },
      data: { isSent: true, sentAt: now },
    });
    expect(notifications.deliverFallback).not.toHaveBeenCalled();
  });

  it('falha de rede/limite do Expo: volta para PENDING com espera crescente (sem fallback ainda)', async () => {
    queue([row('a', { attempts: 2 }), row('b', { attempts: 1 })]);
    dispatcher.sendBatch.mockResolvedValue([
      { status: 'retry', error: 'NETWORK' },
      { status: 'error', error: 'MessageRateExceeded' },
    ]);

    const result = await service.sendPending(now);

    expect(result.retried).toBe(2);
    const retryCalls = prisma.notificationOutbox.updateMany.mock.calls.map((c: any[]) => c[0]).filter((a: any) => a.data.status === 'PENDING');
    expect(retryCalls).toEqual(
      expect.arrayContaining([
        {
          where: { id: { in: ['a'] }, status: 'SENDING' },
          data: { status: 'PENDING', availableAt: new Date(now.getTime() + 60_000), lastError: 'NETWORK' },
        },
        {
          where: { id: { in: ['b'] }, status: 'SENDING' },
          data: { status: 'PENDING', availableAt: new Date(now.getTime() + 30_000), lastError: 'MessageRateExceeded' },
        },
      ]),
    );
    expect(notifications.deliverFallback).not.toHaveBeenCalled();
  });

  it('tentativas esgotadas: FAILED e segue a cadeia e-mail/SMS (bulk preservado)', async () => {
    queue([row('a', { attempts: OUTBOX_MAX_ATTEMPTS, data: buildOutboxData({}, true) })]);
    dispatcher.sendBatch.mockResolvedValue([{ status: 'retry', error: 'HTTP_503' }]);

    const result = await service.sendPending(now);

    expect(result.failed).toBe(1);
    expect(prisma.notificationOutbox.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['a'] }, status: 'SENDING' },
      data: { status: 'FAILED', lastError: 'HTTP_503' },
    });
    expect(notifications.deliverFallback).toHaveBeenCalledWith('u-a', 'n-a', 'Aviso', 'Corpo', { bulk: true });
  });

  it('DeviceNotRegistered no ticket: FAILED, tira o token (se ainda for o mesmo) e segue a cadeia', async () => {
    queue([row('a')]);
    dispatcher.sendBatch.mockResolvedValue([{ status: 'error', error: 'DeviceNotRegistered' }]);

    await service.sendPending(now);

    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'u-a', pushToken: 'ExponentPushToken[a]' },
      data: { pushToken: null, pushTokenUpdatedAt: expect.any(Date) },
    });
    expect(prisma.notificationOutbox.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['a'] }, status: 'SENDING' },
      data: { status: 'FAILED', lastError: 'DeviceNotRegistered' },
    });
    expect(prisma.notification.updateMany).not.toHaveBeenCalled();
    expect(notifications.deliverFallback).toHaveBeenCalledWith('u-a', 'n-a', 'Aviso', 'Corpo', { bulk: false });
  });

  it('conta sem token na hora do envio (logout): não chama o Expo, FAILED NO_TOKEN e fallback', async () => {
    queue([row('a')], { 'u-a': null });

    await service.sendPending(now);

    expect(dispatcher.sendBatch).not.toHaveBeenCalled();
    expect(prisma.notificationOutbox.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['a'] }, status: 'SENDING' },
      data: { status: 'FAILED', lastError: 'NO_TOKEN' },
    });
    expect(notifications.deliverFallback).toHaveBeenCalled();
  });

  it('S4: TIMEOUT = entrega incerta — FAILED INCERTO_TIMEOUT com sentAt, sem reenvio e sem e-mail', async () => {
    queue([row('a', { attempts: 1 }), row('b', { attempts: 1 })]);
    dispatcher.sendBatch.mockResolvedValue([
      { status: 'uncertain', error: 'TIMEOUT' },
      { status: 'ok', ticketId: 't-b' },
    ]);

    const result = await service.sendPending(now);

    expect(result).toEqual({ claimed: 2, sent: 1, retried: 0, failed: 1 });
    expect(prisma.notificationOutbox.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['a'] }, status: 'SENDING' },
      data: { status: 'FAILED', sentAt: now, lastError: 'INCERTO_TIMEOUT', receiptCheckedAt: now },
    });
    // Nunca volta para PENDING (reenvio duplicaria o push já aceito pelo Expo)
    const backToQueue = prisma.notificationOutbox.updateMany.mock.calls.filter((c: any[]) => c[0].data.status === 'PENDING');
    expect(backToQueue).toHaveLength(0);
    expect(notifications.deliverFallback).not.toHaveBeenCalled();
    // A notificação do incerto não é marcada como entregue
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({ where: { id: { in: ['n-b'] } }, data: { isSent: true, sentAt: now } });
  });

  it('S1: token fora do formato do Expo nem vai no lote — FAILED TOKEN_INVALIDO, sai da conta e segue o fallback', async () => {
    queue([row('a'), row('b')], { 'u-a': 'lixo-qualquer' });
    dispatcher.sendBatch.mockResolvedValue([{ status: 'ok', ticketId: 't-b' }]);

    const result = await service.sendPending(now);

    expect(dispatcher.sendBatch).toHaveBeenCalledTimes(1);
    expect(dispatcher.sendBatch.mock.calls[0][0].map((m: any) => m.to)).toEqual(['ExponentPushToken[b]']);
    expect(result).toEqual({ claimed: 2, sent: 1, retried: 0, failed: 1 });
    expect(prisma.notificationOutbox.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['a'] }, status: 'SENDING' },
      data: { status: 'FAILED', lastError: 'TOKEN_INVALIDO' },
    });
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'u-a', pushToken: 'lixo-qualquer' },
      data: { pushToken: null, pushTokenUpdatedAt: expect.any(Date) },
    });
    expect(notifications.deliverFallback).toHaveBeenCalledWith('u-a', 'n-a', 'Aviso', 'Corpo', { bulk: false });
  });

  it('S1: token de outro projeto (confirmado por EXPO_EXPERIENCE_ID) sai da conta', async () => {
    queue([row('a')]);
    dispatcher.sendBatch.mockResolvedValue([{ status: 'error', error: 'PUSH_OUTRO_PROJETO_EXPO' }]);

    await service.sendPending(now);

    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'u-a', pushToken: 'ExponentPushToken[a]' },
      data: { pushToken: null, pushTokenUpdatedAt: expect.any(Date) },
    });
    expect(prisma.notificationOutbox.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['a'] }, status: 'SENDING' },
      data: { status: 'FAILED', lastError: 'PUSH_OUTRO_PROJETO_EXPO' },
    });
  });

  it('S2: aviso gravado com skipFallback que falhou de vez não cai no e-mail/SMS', async () => {
    queue([
      row('a', { data: buildOutboxData({}, false, true) }),
      row('b', { data: buildOutboxData({}, false) }),
    ]);
    dispatcher.sendBatch.mockResolvedValue([
      { status: 'error', error: 'DeviceNotRegistered' },
      { status: 'error', error: 'DeviceNotRegistered' },
    ]);

    const result = await service.sendPending(now);

    expect(result.failed).toBe(2);
    expect(notifications.deliverFallback).toHaveBeenCalledTimes(1);
    expect(notifications.deliverFallback).toHaveBeenCalledWith('u-b', 'n-b', 'Aviso', 'Corpo', { bulk: false });
  });

  it('S1 de ponta a ponta: lote de 100 com um token de outro projeto — 99 SENT e 1 FAILED na mesma rodada', async () => {
    const realFetch = global.fetch;
    const alien = 'ExponentPushToken[alheio]';
    const rows = Array.from({ length: 100 }, (_, i) => row(`r${i}`));
    queue(rows, { 'u-r42': alien });
    global.fetch = jest.fn(async (_url: string, init: any) => {
      const parsed = JSON.parse(init.body);
      const messages: any[] = Array.isArray(parsed) ? parsed : [parsed];
      const tokens = messages.map((m) => m.to);
      if (tokens.includes(alien) && tokens.length > 1) {
        const body = {
          errors: [
            {
              code: 'PUSH_TOO_MANY_EXPERIENCE_IDS',
              details: { '@rodrigospisila/parish-mobile': tokens.filter((t) => t !== alien), '@outro/app': [alien] },
            },
          ],
        };
        return { ok: false, status: 400, json: async () => body };
      }
      const tickets = tokens.map((t) => (t === alien ? { status: 'error', details: { error: 'InvalidCredentials' } } : { status: 'ok', id: `t-${t}` }));
      return { ok: true, status: 200, json: async () => ({ data: tickets.length === 1 ? tickets[0] : tickets }) };
    }) as any;
    try {
      service = new PushOutboxService(prisma, new PushDispatcherService(), notifications as any);
      const result = await service.sendPending(now);

      expect(result).toEqual({ claimed: 100, sent: 99, retried: 0, failed: 1 });
      expect(prisma.notificationOutbox.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['r42'] }, status: 'SENDING' },
        data: { status: 'FAILED', lastError: 'InvalidCredentials' },
      });
      // Ninguém volta para a fila: os vizinhos não esperam
      const backToQueue = prisma.notificationOutbox.updateMany.mock.calls.filter((c: any[]) => c[0].data.status === 'PENDING');
      expect(backToQueue).toHaveLength(0);
      expect(notifications.deliverFallback).toHaveBeenCalledTimes(1);
      expect(notifications.deliverFallback).toHaveBeenCalledWith('u-r42', 'n-r42', 'Aviso', 'Corpo', { bulk: false });
    } finally {
      global.fetch = realFetch;
    }
  });

  it('linhas presas em SENDING (processo caiu) voltam para a fila', async () => {
    await service.releaseStuck(now);
    const cutoff = new Date(now.getTime() - 10 * 60 * 1000);
    expect(prisma.notificationOutbox.updateMany).toHaveBeenCalledWith({
      where: { status: 'SENDING', availableAt: { lt: cutoff } },
      data: { status: 'PENDING', availableAt: now, lastError: 'SENDING_EXPIRED' },
    });
  });

  describe('recibos (~15 min depois)', () => {
    const sentAt = new Date(now.getTime() - 20 * 60 * 1000);

    it('DeviceNotRegistered no recibo: FAILED e limpa o token se não foi registrado de novo depois do envio', async () => {
      prisma.notificationOutbox.findMany.mockResolvedValueOnce([
        { id: 'a', userId: 'u-a', ticketId: 't-a', sentAt },
        { id: 'b', userId: 'u-b', ticketId: 't-b', sentAt },
        { id: 'c', userId: 'u-c', ticketId: 't-c', sentAt },
      ]);
      dispatcher.getReceipts.mockResolvedValue({ 't-a': { status: 'error', error: 'DeviceNotRegistered' }, 't-b': { status: 'ok' } });

      const checked = await service.checkReceipts(now);

      expect(prisma.notificationOutbox.findMany.mock.calls[0][0].where).toEqual({
        status: 'SENT',
        ticketId: { not: null },
        receiptCheckedAt: null,
        sentAt: { lte: new Date(now.getTime() - 15 * 60 * 1000) },
      });
      expect(dispatcher.getReceipts).toHaveBeenCalledWith(['t-a', 't-b', 't-c']);
      expect(prisma.notificationOutbox.update).toHaveBeenCalledWith({
        where: { id: 'a' },
        data: { status: 'FAILED', lastError: 'RECEIPT_DeviceNotRegistered', receiptCheckedAt: now },
      });
      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'u-a',
          pushToken: { not: null },
          OR: [{ pushTokenUpdatedAt: null }, { pushTokenUpdatedAt: { lte: sentAt } }],
        },
        data: { pushToken: null, pushTokenUpdatedAt: now },
      });
      // ok → conferido; sem recibo ainda (c) → fica para a próxima
      expect(prisma.notificationOutbox.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['b'] } },
        data: { receiptCheckedAt: now },
      });
      expect(checked).toBe(2);
    });

    it('consulta de recibos falhou: nada é marcado', async () => {
      prisma.notificationOutbox.findMany.mockResolvedValueOnce([{ id: 'a', userId: 'u-a', ticketId: 't-a', sentAt }]);
      dispatcher.getReceipts.mockResolvedValue(null);

      await expect(service.checkReceipts(now)).resolves.toBe(0);
      expect(prisma.notificationOutbox.update).not.toHaveBeenCalled();
      expect(prisma.user.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('tick (cron a cada 15 s)', () => {
    it('roda com a trava distribuída e devolve o resumo', async () => {
      const result = await service.tick();
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ claimed: 0, processed: 0 }));
    });

    it('PUSH_OUTBOX_WORKER=off desliga o worker neste processo', async () => {
      process.env.PUSH_OUTBOX_WORKER = 'off';
      await expect(service.tick()).resolves.toBeNull();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('não sobrepõe rodadas no mesmo processo', async () => {
      let release: () => void = () => undefined;
      prisma.notificationOutbox.findMany.mockImplementationOnce(() => new Promise((resolve) => (release = () => resolve([]))));
      const first = service.tick();
      await new Promise((resolve) => setImmediate(resolve));
      await expect(service.tick()).resolves.toBeNull();
      release();
      await first;
    });
  });
});
