import { TitheReminderService } from './tithe-reminder.service';
import { TitheExpiryService } from './tithe-expiry.service';

/**
 * M45 da auditoria: com duas réplicas o lembrete mensal (WhatsApp pago + push)
 * saía em dobro. Trava por job (runExclusiveJob) + claim atômico do mês por
 * membro antes de enviar; a marca volta se nada chegou ao fiel.
 */
describe('TitheReminderService — claim do mês (M45)', () => {
  // 10/10/2026 09:00 em Brasília
  const now = new Date('2026-10-10T12:00:00.000Z');

  function setup(over: { whatsappOk?: boolean; pushFails?: boolean; members?: any[] } = {}) {
    const sentMonth: Record<string, string | null> = { m1: null, m2: '2026-09' };
    const prisma: any = {
      member: {
        findMany: jest.fn(async () =>
          over.members ?? [
            { id: 'm1', userId: 'u1', fullName: 'Maria', whatsappOptIn: true, titheReminderSentMonth: null, tither: null },
            { id: 'm2', userId: null, fullName: 'José', whatsappOptIn: true, titheReminderSentMonth: '2026-09', tither: null },
          ],
        ),
        updateMany: jest.fn(async ({ where, data }: any) => {
          const current = sentMonth[where.id] ?? null;
          if (where.OR) {
            const month = where.OR[1].titheReminderSentMonth.not;
            if (current === month) return { count: 0 };
          } else if (where.titheReminderSentMonth !== undefined && current !== where.titheReminderSentMonth) {
            return { count: 0 };
          }
          sentMonth[where.id] = data.titheReminderSentMonth;
          return { count: 1 };
        }),
      },
      titheIntent: { count: jest.fn().mockResolvedValue(0) },
      titheContribution: { count: jest.fn().mockResolvedValue(0) },
      $transaction: jest.fn(async (fn: any) => fn({ $queryRaw: jest.fn().mockResolvedValue([{ locked: true }]) })),
    };
    const notifications: any = {
      notifyUsers: over.pushFails ? jest.fn().mockRejectedValue(new Error('push fora')) : jest.fn().mockResolvedValue(undefined),
    };
    const whatsapp: any = { sendMonthlyPix: jest.fn().mockResolvedValue(over.whatsappOk ?? true) };
    const service = new TitheReminderService(prisma, notifications, whatsapp);
    return { service, prisma, notifications, whatsapp, sentMonth };
  }

  it('usa o dia/mês de Brasília e marca o mês antes de enviar', async () => {
    const ctx = setup();
    expect(await ctx.service.sendReminders(now)).toBe(1);
    expect(ctx.prisma.member.findMany.mock.calls[0][0].where.titheReminderDay).toBe(10);
    expect(ctx.sentMonth).toEqual({ m1: '2026-10', m2: '2026-10' });
    expect(ctx.whatsapp.sendMonthlyPix).toHaveBeenCalledTimes(2);
  });

  it('segunda execução (outra réplica, mesma lista) não reenvia nada', async () => {
    const ctx = setup();
    await ctx.service.sendReminders(now);
    await ctx.service.sendReminders(now);
    expect(ctx.whatsapp.sendMonthlyPix).toHaveBeenCalledTimes(2);
    expect(ctx.notifications.notifyUsers).toHaveBeenCalledTimes(1);
  });

  it('nada chegou ao fiel: a marca volta ao valor anterior', async () => {
    const ctx = setup({ whatsappOk: false, pushFails: true });
    await ctx.service.sendReminders(now);
    expect(ctx.sentMonth).toEqual({ m1: null, m2: '2026-09' });
  });

  it('o cron só roda com a trava do job', async () => {
    const ctx = setup();
    ctx.prisma.$transaction.mockImplementation(async (fn: any) => fn({ $queryRaw: jest.fn().mockResolvedValue([{ locked: false }]) }));
    await ctx.service.handleCron();
    expect(ctx.prisma.member.findMany).not.toHaveBeenCalled();
  });
});

describe('TitheExpiryService — trava dos crons (M45)', () => {
  it('sem a trava, nem a expiração nem o reprocessamento rodam', async () => {
    const prisma: any = {
      titheIntent: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      $transaction: jest.fn(async (fn: any) => fn({ $queryRaw: jest.fn().mockResolvedValue([{ locked: false }]) })),
    };
    const tithe: any = { expireGatewayIntents: jest.fn(), failExpiredAuthorizations: jest.fn(), reprocessFailedWebhooks: jest.fn() };
    const service = new TitheExpiryService(prisma, tithe);
    await service.handleCron();
    await service.retryWebhooks();
    expect(prisma.titheIntent.updateMany).not.toHaveBeenCalled();
    expect(tithe.reprocessFailedWebhooks).not.toHaveBeenCalled();

    prisma.$transaction.mockImplementation(async (fn: any) => fn({ $queryRaw: jest.fn().mockResolvedValue([{ locked: true }]) }));
    tithe.expireGatewayIntents.mockResolvedValue(0);
    tithe.failExpiredAuthorizations.mockResolvedValue(0);
    tithe.reprocessFailedWebhooks.mockResolvedValue(2);
    await service.handleCron();
    await service.retryWebhooks();
    expect(prisma.titheIntent.updateMany).toHaveBeenCalledTimes(1);
    expect(tithe.reprocessFailedWebhooks).toHaveBeenCalledTimes(1);
  });
});
