import { ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { BillingWebhookService, PLATFORM_WEBHOOK_PROVIDER } from './billing-webhook.service';

const now = new Date('2026-10-21T15:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;
const TOKEN = 'tok-plataforma-1234567890';

const tier = { id: 't_capela', key: 'capela', isActive: true, monthlyPriceCents: 4900, yearlyPriceCents: 49000 };
const account = {
  id: 'acc1',
  parishId: 'p1',
  legalName: 'Mitra',
  billingCycle: 'MONTHLY',
  status: 'PENDING',
  providerSubscriptionId: 'sub_1',
};

function linked(over: Record<string, unknown> = {}) {
  return {
    id: 'cp1',
    communityId: 'cap1',
    status: 'TRIAL',
    tierId: 't_capela',
    billingCycle: 'MONTHLY',
    priceCents: 4900,
    trialEndsAt: new Date(now.getTime() - DAY),
    currentPeriodEnd: null as Date | null,
    tier,
    ...over,
  };
}

function setup(opts: { env?: Record<string, string>; plans?: any[]; existingEvent?: any } = {}) {
  const env = opts.env ?? { PLATFORM_ASAAS_WEBHOOK_TOKEN: TOKEN };
  const tx = {
    communityPlan: { update: jest.fn().mockResolvedValue({}), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    communityPlanEvent: { create: jest.fn().mockResolvedValue({}) },
  };
  const prisma: any = {
    billingAccount: {
      findFirst: jest.fn().mockResolvedValue(account),
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
    },
    platformPayment: { findUnique: jest.fn().mockResolvedValue(null), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    paymentWebhookEvent: {
      findUnique: jest.fn().mockResolvedValue(opts.existingEvent ?? null),
      create: jest.fn().mockResolvedValue({ id: 'ev1' }),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
    },
    communityPlan: { findMany: jest.fn().mockResolvedValue(opts.plans ?? [linked()]) },
    user: { findMany: jest.fn().mockResolvedValue([{ id: 'sys1', email: 'sys@parish.app' }]) },
    parish: { findUnique: jest.fn().mockResolvedValue({ name: 'Paróquia Santo Antônio' }) },
    $transaction: jest.fn((fn: (client: unknown) => Promise<unknown>) => fn(tx)),
  };
  const billing: any = { env: () => env, upsertPayment: jest.fn().mockResolvedValue({}) };
  const access: any = { invalidate: jest.fn() };
  const email: any = { trySend: jest.fn().mockResolvedValue(true) };
  const notifications: any = { notifyUsers: jest.fn().mockResolvedValue(undefined) };
  const service = new BillingWebhookService(prisma, billing, access, email, notifications);
  return { service, prisma, tx, billing, access, email, notifications };
}

const headers = { 'asaas-access-token': TOKEN };
const paymentEvent = (event: string, payment: Record<string, unknown> = {}) => ({
  id: `evt_${event}_pay_1`,
  event,
  payment: { id: 'pay_1', status: 'RECEIVED', value: 49, dueDate: '2026-10-20', subscription: 'sub_1', customer: 'cus_1', ...payment },
});

describe('BillingWebhookService — POST /platform/billing/webhook', () => {
  it('sem PLATFORM_ASAAS_WEBHOOK_TOKEN → 503; token errado → 403 (nada gravado)', async () => {
    const off = setup({ env: {} });
    await expect(off.service.handle(headers, paymentEvent('PAYMENT_RECEIVED'), now)).rejects.toBeInstanceOf(ServiceUnavailableException);
    const ctx = setup();
    await expect(ctx.service.handle({ 'asaas-access-token': 'errado' }, paymentEvent('PAYMENT_RECEIVED'), now)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(ctx.service.handle({}, paymentEvent('PAYMENT_RECEIVED'), now)).rejects.toBeInstanceOf(ForbiddenException);
    expect(ctx.prisma.paymentWebhookEvent.create).not.toHaveBeenCalled();
  });

  it('PAYMENT_RECEIVED: TRIAL → ACTIVE, período = vencimento + ciclo, evento BILLING sem usuário', async () => {
    const ctx = setup();
    const res = await ctx.service.handle(headers, paymentEvent('PAYMENT_RECEIVED'), now);
    expect(res).toMatchObject({ received: true, processed: true, action: 'activated', communityIds: ['cap1'] });
    expect(ctx.prisma.paymentWebhookEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ provider: PLATFORM_WEBHOOK_PROVIDER, parishId: 'p1', eventId: 'evt_PAYMENT_RECEIVED_pay_1' }) }),
    );
    const update = ctx.tx.communityPlan.update.mock.calls[0][0];
    expect(update.data).toMatchObject({ status: 'ACTIVE', tierId: 't_capela', billingCycle: 'MONTHLY', priceCents: 4900 });
    expect(update.data.currentPeriodEnd.toISOString()).toBe('2026-11-21T02:59:59.000Z'); // 20/11 23:59 em Brasília
    expect(ctx.tx.communityPlanEvent.create.mock.calls[0][0].data).toMatchObject({
      action: 'BILLING',
      fromStatus: 'TRIAL',
      toStatus: 'ACTIVE',
      byUserId: null,
    });
    expect(ctx.billing.upsertPayment).toHaveBeenCalledWith('acc1', expect.objectContaining({ id: 'pay_1' }), 'PAYMENT_RECEIVED');
    expect(ctx.prisma.billingAccount.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'ACTIVE' }) }));
    expect(ctx.prisma.paymentWebhookEvent.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ processedAt: expect.any(Date) }) }));
    expect(ctx.access.invalidate).toHaveBeenCalledWith('cap1');
  });

  it('idempotente: evento já processado não reprocessa; entrega simultânea (P2002) também não', async () => {
    const ctx = setup({ existingEvent: { id: 'ev1', processedAt: new Date() } });
    await expect(ctx.service.handle(headers, paymentEvent('PAYMENT_RECEIVED'), now)).resolves.toEqual({ received: true, duplicate: true });
    expect(ctx.tx.communityPlan.update).not.toHaveBeenCalled();

    const race = setup();
    race.prisma.paymentWebhookEvent.create.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));
    await expect(race.service.handle(headers, paymentEvent('PAYMENT_RECEIVED'), now)).resolves.toEqual({ received: true, duplicate: true });
    expect(race.tx.communityPlan.update).not.toHaveBeenCalled();
  });

  it('CONFIRMED e depois RECEIVED do mesmo pagamento: o segundo não muda nada', async () => {
    const end = new Date('2026-11-21T02:59:59.000Z');
    const ctx = setup({ plans: [linked({ status: 'ACTIVE', currentPeriodEnd: end })] });
    const res = await ctx.service.handle(headers, paymentEvent('PAYMENT_RECEIVED'), now);
    expect(res).toMatchObject({ action: 'activated', communityIds: [] });
    expect(ctx.tx.communityPlan.update).not.toHaveBeenCalled();
  });

  it('pagamento antigo não recua o período; piloto (ACTIVE sem prazo) nunca é tocado', async () => {
    const later = new Date(now.getTime() + 60 * DAY);
    const ctx = setup({
      plans: [linked({ status: 'PAST_DUE', currentPeriodEnd: later }), linked({ id: 'cp2', communityId: 'matriz', status: 'ACTIVE', currentPeriodEnd: null })],
    });
    await ctx.service.handle(headers, paymentEvent('PAYMENT_CONFIRMED'), now);
    expect(ctx.tx.communityPlan.update).toHaveBeenCalledTimes(1);
    expect(ctx.tx.communityPlan.update.mock.calls[0][0].data.currentPeriodEnd).toEqual(later);
    expect(ctx.tx.communityPlan.update.mock.calls[0][0].where).toEqual({ id: 'cp1' });
  });

  it('PAYMENT_OVERDUE: ACTIVE vencido → PAST_DUE (MARK_PAST_DUE); teste e período em dia não mudam', async () => {
    const ctx = setup({
      plans: [
        linked({ status: 'ACTIVE', currentPeriodEnd: new Date(now.getTime() - DAY) }),
        linked({ id: 'cp2', communityId: 'cap2', status: 'ACTIVE', currentPeriodEnd: new Date(now.getTime() + 5 * DAY) }),
        linked({ id: 'cp3', communityId: 'cap3', status: 'TRIAL' }),
        linked({ id: 'cp4', communityId: 'matriz', status: 'ACTIVE', currentPeriodEnd: null }),
      ],
    });
    const res = await ctx.service.handle(headers, paymentEvent('PAYMENT_OVERDUE', { status: 'OVERDUE' }), now);
    expect(res).toMatchObject({ action: 'past_due', communityIds: ['cap1'] });
    expect(ctx.tx.communityPlan.updateMany).toHaveBeenCalledWith({ where: { id: 'cp1', status: 'ACTIVE' }, data: { status: 'PAST_DUE' } });
    expect(ctx.tx.communityPlanEvent.create.mock.calls[0][0].data).toMatchObject({ action: 'BILLING', toStatus: 'PAST_DUE', byUserId: null });
    expect(ctx.prisma.billingAccount.update).toHaveBeenCalledWith({ where: { id: 'acc1' }, data: { status: 'PAST_DUE' } });
  });

  it('PAYMENT_REFUNDED / CHARGEBACK: alerta o SYSTEM_ADMIN (in-app + e-mail) e não mexe nos planos', async () => {
    for (const event of ['PAYMENT_REFUNDED', 'PAYMENT_CHARGEBACK_REQUESTED']) {
      const ctx = setup();
      const res = await ctx.service.handle(headers, paymentEvent(event, { status: 'REFUNDED' }), now);
      expect(res).toMatchObject({ action: 'alerted' });
      expect(ctx.notifications.notifyUsers).toHaveBeenCalledWith(['sys1'], 'URGENT_NOTICE', expect.any(String), expect.stringContaining(event), expect.any(Object));
      expect(ctx.email.trySend).toHaveBeenCalledWith('sys@parish.app', expect.any(String), expect.any(String));
      expect(ctx.tx.communityPlan.update).not.toHaveBeenCalled();
    }
  });

  it('INVOICE_AUTHORIZED: guarda o link da NFS-e', async () => {
    const ctx = setup();
    ctx.prisma.billingAccount.findFirst.mockResolvedValue(account);
    await ctx.service.handle(
      headers,
      { id: 'evt_inv', event: 'INVOICE_AUTHORIZED', invoice: { id: 'inv_1', payment: 'pay_1', subscription: 'sub_1', pdfUrl: 'https://www.asaas.com/nf/1.pdf' } },
      now,
    );
    expect(ctx.prisma.platformPayment.updateMany).toHaveBeenCalledWith({ where: { providerPaymentId: 'pay_1' }, data: { nfseUrl: 'https://www.asaas.com/nf/1.pdf' } });
  });

  it('cobrança sem conta de faturamento: 200 ignorado, sem gravar evento', async () => {
    const ctx = setup();
    ctx.prisma.billingAccount.findFirst.mockResolvedValue(null);
    await expect(ctx.service.handle(headers, paymentEvent('PAYMENT_RECEIVED'), now)).resolves.toEqual({ received: true, ignored: true });
    expect(ctx.prisma.paymentWebhookEvent.create).not.toHaveBeenCalled();
  });

  it('falha no processamento: apaga o registro e responde 503 para o Asaas reenviar', async () => {
    const ctx = setup();
    ctx.tx.communityPlan.update.mockRejectedValue(new Error('banco fora'));
    await expect(ctx.service.handle(headers, paymentEvent('PAYMENT_RECEIVED'), now)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(ctx.prisma.paymentWebhookEvent.delete).toHaveBeenCalledWith({ where: { id: 'ev1' } });
    expect(ctx.prisma.paymentWebhookEvent.update).not.toHaveBeenCalled();
  });
});
