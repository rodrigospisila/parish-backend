import { countJobItems, purgeJobRuns, runExclusiveJob, sanitizeJobError, scheduledJobLockKey } from './scheduled-job-lock';

/**
 * Trava das rotinas agendadas (M45, R3#52): limites explícitos, pool cheio
 * pula a execução sem lançar, e o resultado do trabalho não se perde se a
 * transação da trava expirar no fim.
 */
describe('runExclusiveJob', () => {
  const logger = { log: jest.fn(), warn: jest.fn() } as any;
  const lockedTx = (locked: boolean) => ({ $queryRaw: jest.fn().mockResolvedValue([{ locked }]) });

  beforeEach(() => jest.clearAllMocks());

  it('com a trava: roda o trabalho e devolve o resultado, com maxWait/timeout explícitos', async () => {
    const tx = lockedTx(true);
    const prisma = { $transaction: jest.fn((fn: any, _options?: any) => fn(tx)) };
    await expect(runExclusiveJob(prisma, 'lembretes', async () => 42, { logger })).resolves.toBe(42);
    expect(prisma.$transaction.mock.calls[0][1]).toEqual({ maxWait: 5_000, timeout: 55 * 60 * 1000 });
    expect(scheduledJobLockKey('lembretes')).toBe('parish:job:lembretes');
  });

  it('timeout e maxWait por job quando informados', async () => {
    const prisma = { $transaction: jest.fn((fn: any, _options?: any) => fn(lockedTx(true))) };
    await runExclusiveJob(prisma, 'longo', async () => 1, { timeoutMs: 90 * 60 * 1000, maxWaitMs: 2_000 });
    expect(prisma.$transaction.mock.calls[0][1]).toEqual({ maxWait: 2_000, timeout: 90 * 60 * 1000 });
  });

  it('outra réplica com a trava: pula sem rodar', async () => {
    const work = jest.fn();
    const prisma = { $transaction: jest.fn((fn: any, _options?: any) => fn(lockedTx(false))) };
    await expect(runExclusiveJob(prisma, 'lembretes', work, { logger })).resolves.toBeNull();
    expect(work).not.toHaveBeenCalled();
  });

  it('pool cheio (sem conexão no maxWait): registra e pula, sem lançar', async () => {
    const work = jest.fn();
    const prisma = {
      $transaction: jest.fn().mockRejectedValue(
        Object.assign(new Error('Transaction API error: Unable to start a transaction in the given time.'), { code: 'P2028' }),
      ),
    };
    await expect(runExclusiveJob(prisma, 'lembretes', work, { logger })).resolves.toBeNull();
    expect(work).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('pulando esta execução'));
  });

  it('transação da trava expirou depois do trabalho: mantém o resultado e avisa', async () => {
    const prisma = {
      $transaction: jest.fn(async (fn: any) => {
        await fn(lockedTx(true));
        throw new Error('Transaction already closed: A commit cannot be executed on an expired transaction.');
      }),
    };
    await expect(runExclusiveJob(prisma, 'lembretes', async () => ({ sent: 3 }), { logger })).resolves.toEqual({ sent: 3 });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('passou do tempo da trava'));
  });

  it('erro do próprio trabalho continua sendo lançado', async () => {
    const prisma = { $transaction: jest.fn((fn: any, _options?: any) => fn(lockedTx(true))) };
    await expect(
      runExclusiveJob(prisma, 'lembretes', async () => {
        throw new Error('falhou no meio');
      }),
    ).rejects.toThrow('falhou no meio');
  });
});

/** JobRun (eng-qualidade-15, contrato C6): toda execução fica registrada. */
describe('runExclusiveJob — registro em JobRun', () => {
  const lockedTx = (locked: boolean) => ({ $queryRaw: jest.fn().mockResolvedValue([{ locked }]) });
  const client = (locked: boolean) => ({
    $transaction: jest.fn((fn: any, _options?: any) => fn(lockedTx(locked))),
    jobRun: {
      create: jest.fn().mockResolvedValue({ id: 'run-1' }),
      update: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 7 }),
    },
  });

  it('RUNNING ao pegar a trava → OK no fim, com os itens vindos do retorno', async () => {
    const prisma = client(true);
    await expect(runExclusiveJob(prisma, 'tithe-reminder', async () => 12)).resolves.toBe(12);
    expect(prisma.jobRun.create).toHaveBeenCalledWith({
      data: { name: 'tithe-reminder', startedAt: expect.any(Date), status: 'RUNNING' },
      select: { id: true },
    });
    expect(prisma.jobRun.update).toHaveBeenCalledWith({
      where: { id: 'run-1' },
      data: { status: 'OK', finishedAt: expect.any(Date), items: 12, error: null },
    });
  });

  it('itens: número, campo conhecido do objeto, ou countItems', async () => {
    expect(countJobItems(3)).toBe(3);
    expect(countJobItems({ count: 4 })).toBe(4);
    expect(countJobItems({ done: 2, failed: 1 })).toBe(2);
    expect(countJobItems(undefined)).toBeNull();
    expect(countJobItems(true)).toBeNull();
    const prisma = client(true);
    await runExclusiveJob(prisma, 'x', async () => ({ ok: 5, nok: 1 }), { countItems: (r) => r.ok + r.nok });
    expect(prisma.jobRun.update.mock.calls[0][0].data.items).toBe(6);
  });

  it('erro do trabalho → ERROR (sem dado pessoal, até 500 caracteres) e o erro continua subindo', async () => {
    const prisma = client(true);
    const longo = 'x'.repeat(800);
    await expect(
      runExclusiveJob(prisma, 'x', async () => {
        throw new Error(`falhou para maria@exemplo.com tel 41 99999-8888 ${longo}`);
      }),
    ).rejects.toThrow('falhou');
    const data = prisma.jobRun.update.mock.calls[0][0].data;
    expect(data.status).toBe('ERROR');
    expect(data.error).not.toContain('maria@exemplo.com');
    expect(data.error).not.toContain('99999');
    expect(data.error.length).toBeLessThanOrEqual(500);
  });

  it('erro do Prisma: só o código e a última linha (sem o trecho da consulta)', () => {
    const error = Object.assign(
      new Error(['Invalid `prisma.user.update()` invocation:', '{ where: { cpf: "123.456.789-00" } }', 'Unique constraint failed'].join('\n')),
      { code: 'P2002' },
    );
    expect(sanitizeJobError(error)).toBe('P2002: Unique constraint failed');
  });

  it('outra réplica com a trava → SKIPPED; pool cheio → SKIPPED com o motivo', async () => {
    const prisma = client(false);
    await runExclusiveJob(prisma, 'x', jest.fn());
    expect(prisma.jobRun.create).toHaveBeenCalledWith({
      data: { name: 'x', startedAt: expect.any(Date), finishedAt: expect.any(Date), status: 'SKIPPED', error: null },
    });
    const full = { ...client(true), $transaction: jest.fn().mockRejectedValue(new Error('P2028')) };
    await runExclusiveJob(full, 'x', jest.fn());
    expect(full.jobRun.create.mock.calls[0][0].data).toEqual(expect.objectContaining({ status: 'SKIPPED', error: 'Sem conexão para a trava' }));
  });

  it('modo activity (worker de 15 s): sem linha para execução vazia ou pulada; grava quando houve itens', async () => {
    const idle = client(true);
    await runExclusiveJob(idle, 'push-outbox', async () => ({ processed: 0 }), { record: 'activity' });
    expect(idle.jobRun.create).not.toHaveBeenCalled();
    const skipped = client(false);
    await runExclusiveJob(skipped, 'push-outbox', jest.fn(), { record: 'activity' });
    expect(skipped.jobRun.create).not.toHaveBeenCalled();
    const busy = client(true);
    await runExclusiveJob(busy, 'push-outbox', async () => ({ processed: 40 }), { record: 'activity' });
    expect(busy.jobRun.create).toHaveBeenCalledWith({
      data: { name: 'push-outbox', startedAt: expect.any(Date), finishedAt: expect.any(Date), status: 'OK', items: 40, error: null },
    });
  });

  it('falha ao gravar o JobRun nunca derruba o job', async () => {
    const prisma = client(true);
    prisma.jobRun.create.mockRejectedValue(new Error('tabela fora'));
    await expect(runExclusiveJob(prisma, 'x', async () => 1)).resolves.toBe(1);
  });

  it('expurgo do histórico', async () => {
    const prisma = client(true);
    const before = new Date('2026-07-01T00:00:00Z');
    await expect(purgeJobRuns(prisma, before)).resolves.toBe(7);
    expect(prisma.jobRun.deleteMany).toHaveBeenCalledWith({ where: { startedAt: { lt: before } } });
  });
});
