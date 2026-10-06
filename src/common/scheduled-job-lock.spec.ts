import { runExclusiveJob, scheduledJobLockKey } from './scheduled-job-lock';

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
