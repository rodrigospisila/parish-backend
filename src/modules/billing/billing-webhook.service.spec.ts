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
  nextDueDate: null as Date | null,
  providerSubscriptionId: 'sub_1',
};

/** Evento CHECKOUT (retrato da contratação) gravado pelo POST /billing/checkout. */
function checkoutEvent(communityId: string, ref: string, cycle: 'MONTHLY' | 'YEARLY', valueCents: number, createdAt: Date) {
  return {
    communityId,
    createdAt,
    data: { billingAccountId: 'acc1', checkoutRef: ref, billingCycle: cycle, subscriptionValueCents: valueCents, tierKey: 'capela' },
  };
}
const R1 = 'mgzr1-aaaa';
const defaultCheckout = [
  checkoutEvent('cap1', R1, 'MONTHLY', 4900, new Date(now.getTime() - 40 * DAY)),
  checkoutEvent('matriz', R1, 'MONTHLY', 4900, new Date(now.getTime() - 40 * DAY)),
];

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

function setup(
  opts: { env?: Record<string, string>; plans?: any[]; existingEvent?: any; checkouts?: any[]; paidEvents?: any[]; account?: any } = {},
) {
  const plans = opts.plans ?? [linked()];
  const env = opts.env ?? { PLATFORM_ASAAS_WEBHOOK_TOKEN: TOKEN };
  const tx = {
    communityPlan: { update: jest.fn().mockResolvedValue({}), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    communityPlanEvent: { create: jest.fn().mockResolvedValue({}) },
  };
  const prisma: any = {
    billingAccount: {
      findFirst: jest.fn().mockResolvedValue(opts.account ?? account),
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
    // Respeita o filtro por comunidade (cobertura da cobrança) e por conta (vencida)
    communityPlan: {
      findMany: jest.fn(async ({ where }: any) =>
        plans.filter((plan) => (where.communityId?.in ? where.communityId.in.includes(plan.communityId) : true)),
      ),
    },
    communityPlanEvent: {
      findMany: jest.fn(async ({ where }: any) => (where.action === 'CHECKOUT' ? (opts.checkouts ?? defaultCheckout) : (opts.paidEvents ?? []))),
    },
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
      // E-mail explícito abaixo: sem o e-mail/SMS de reserva do NotificationsService (S2)
      expect(ctx.notifications.notifyUsers).toHaveBeenCalledWith(
        ['sys1'],
        'URGENT_NOTICE',
        expect.any(String),
        expect.stringContaining(event),
        expect.any(Object),
        { skipFallback: true },
      );
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

  describe('cobertura da cobrança (revisão S5/S6)', () => {
    const R2 = 'mh0aa-bbbb';
    const before = new Date(now.getTime() - 40 * DAY);
    const after = new Date(now.getTime() - 5 * DAY);

    it('S5: mensalidade paga depois da troca para anual usa o ciclo DA COBRANÇA (vencimento + 1 mês)', async () => {
      const checkouts = [
        checkoutEvent('cap1', R1, 'MONTHLY', 4900, before),
        checkoutEvent('cap1', R2, 'YEARLY', 49000, after), // admin trocou para anual depois
      ];
      for (const externalReference of [`billing:acc1:${R1}`, undefined]) {
        const ctx = setup({
          checkouts,
          account: { ...account, billingCycle: 'YEARLY' },
          plans: [linked({ status: 'ACTIVE', billingCycle: 'YEARLY', priceCents: 49000, currentPeriodEnd: new Date('2026-10-21T02:59:59.000Z') })],
        });
        const res = await ctx.service.handle(headers, paymentEvent('PAYMENT_RECEIVED', { value: 49, externalReference }), now);
        expect(res).toMatchObject({ action: 'activated', communityIds: ['cap1'] });
        const data = ctx.tx.communityPlan.update.mock.calls[0][0].data;
        expect(data.currentPeriodEnd.toISOString()).toBe('2026-11-21T02:59:59.000Z'); // + 1 mês, não + 1 ano
        expect(data.billingCycle).toBe('YEARLY'); // a contratação atual continua anual
        expect(ctx.tx.communityPlanEvent.create.mock.calls[0][0].data.data).toMatchObject({ billingCycle: 'MONTHLY', checkoutRef: R1, paidPaymentId: 'pay_1' });
      }
    });

    it('S6: pagamento antigo não ativa comunidades incluídas depois dele', async () => {
      const checkouts = [
        checkoutEvent('cap1', R1, 'YEARLY', 49000, before),
        ...['cap1', 'cap2', 'cap3'].map((id) => checkoutEvent(id, R2, 'YEARLY', 147000, after)),
      ];
      const plans = [linked({ billingCycle: 'YEARLY' }), linked({ id: 'cp2', communityId: 'cap2' }), linked({ id: 'cp3', communityId: 'cap3', status: 'FREE' })];
      for (const externalReference of [`billing:acc1:${R1}`, undefined]) {
        const ctx = setup({ checkouts, plans });
        const res = await ctx.service.handle(headers, paymentEvent('PAYMENT_RECEIVED', { value: 490, externalReference }), now);
        expect(res).toMatchObject({ action: 'activated', communityIds: ['cap1'] });
        expect(ctx.tx.communityPlan.update).toHaveBeenCalledTimes(1);
        expect(ctx.prisma.communityPlan.findMany.mock.calls[0][0].where).toMatchObject({
          communityId: { in: ['cap1'] },
          OR: [{ billingAccountId: 'acc1' }, { billingAccountId: null }],
          community: { parishId: 'p1' },
        });
      }
      // A cobrança nova (valor das 3) ativa as 3
      const ctx = setup({ checkouts, plans });
      const res = await ctx.service.handle(
        headers,
        paymentEvent('PAYMENT_RECEIVED', { id: 'pay_2', value: 1470, externalReference: `billing:acc1:${R2}` }),
        now,
      );
      expect(res).toMatchObject({ communityIds: ['cap1', 'cap2', 'cap3'] });
    });

    it('cobrança em aberto reajustada (updatePendingPayments) segue a contratação nova pelo valor', async () => {
      const checkouts = [checkoutEvent('cap1', R1, 'MONTHLY', 4900, before), ...['cap1', 'cap2'].map((id) => checkoutEvent(id, R2, 'MONTHLY', 9800, after))];
      const ctx = setup({ checkouts, plans: [linked(), linked({ id: 'cp2', communityId: 'cap2' })] });
      const res = await ctx.service.handle(headers, paymentEvent('PAYMENT_RECEIVED', { value: 98, externalReference: `billing:acc1:${R1}` }), now);
      expect(res).toMatchObject({ communityIds: ['cap1', 'cap2'] });
    });

    it('mesma cobrança já ativou a comunidade (CONFIRMED → RECEIVED): não recalcula', async () => {
      const ctx = setup({ paidEvents: [{ communityId: 'cap1' }], plans: [linked({ status: 'ACTIVE', currentPeriodEnd: new Date(now.getTime() + 3 * DAY) })] });
      const res = await ctx.service.handle(headers, paymentEvent('PAYMENT_RECEIVED'), now);
      expect(res).toMatchObject({ action: 'activated', communityIds: [] });
      expect(ctx.tx.communityPlan.update).not.toHaveBeenCalled();
      const call = ctx.prisma.communityPlanEvent.findMany.mock.calls.find((args: any[]) => args[0].where.action === 'BILLING');
      expect(call[0].where).toMatchObject({ action: 'BILLING', data: { path: ['paidPaymentId'], equals: 'pay_1' } });
    });

    it('valor que não bate com nenhuma contratação: nada ativa e o SYSTEM_ADMIN é avisado', async () => {
      const ctx = setup();
      const res = await ctx.service.handle(headers, paymentEvent('PAYMENT_RECEIVED', { value: 12.34 }), now);
      expect(res).toMatchObject({ action: 'unmatched', communityIds: [] });
      expect(ctx.tx.communityPlan.update).not.toHaveBeenCalled();
      expect(ctx.notifications.notifyUsers).toHaveBeenCalledWith(
        ['sys1'],
        'URGENT_NOTICE',
        expect.stringContaining('sem contratação'),
        expect.any(String),
        expect.any(Object),
        { skipFallback: true },
      );
      expect(ctx.email.trySend).toHaveBeenCalledTimes(1);
    });

    it('retrato recém-criado ainda não gravado: 503 para o Asaas reenviar; antigo: regra do valor', async () => {
      const fresh = `${(now.getTime() - 30_000).toString(36)}-cccc`;
      const ctx = setup();
      await expect(
        ctx.service.handle(headers, paymentEvent('PAYMENT_CONFIRMED', { externalReference: `billing:acc1:${fresh}` }), now),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(ctx.prisma.paymentWebhookEvent.delete).toHaveBeenCalled();

      const old = `${(now.getTime() - 60 * 60_000).toString(36)}-dddd`;
      const late = setup();
      const res = await late.service.handle(headers, paymentEvent('PAYMENT_CONFIRMED', { externalReference: `billing:acc1:${old}` }), now);
      expect(res).toMatchObject({ action: 'activated', communityIds: ['cap1'] });
    });

    it('cobrança antiga paga depois não recua o próximo vencimento da conta', async () => {
      const nextDue = new Date(now.getTime() + 300 * DAY);
      const ctx = setup({ account: { ...account, status: 'ACTIVE', nextDueDate: nextDue } });
      await ctx.service.handle(headers, paymentEvent('PAYMENT_RECEIVED'), now);
      expect(ctx.prisma.billingAccount.update).toHaveBeenCalledWith({ where: { id: 'acc1' }, data: { status: 'ACTIVE', nextDueDate: nextDue } });
    });
  });

  describe('reenvio depois de queda no meio (revisão S10)', () => {
    it('registro sem processedAt (processo caiu): o reenvio processa usando o mesmo registro', async () => {
      const ctx = setup({ existingEvent: { id: 'ev-old', processedAt: null, error: null } });
      const res = await ctx.service.handle(headers, paymentEvent('PAYMENT_RECEIVED'), now);
      expect(res).toMatchObject({ processed: true, action: 'activated' });
      expect(ctx.prisma.paymentWebhookEvent.create).not.toHaveBeenCalled();
      expect(ctx.prisma.paymentWebhookEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'ev-old' }, data: expect.objectContaining({ processedAt: expect.any(Date), error: null }) }),
      );
    });

    it('registro marcado por terceiros (processedAt + erro, ex.: "evento descartado"): reprocessa, não vira duplicate', async () => {
      const ctx = setup({ existingEvent: { id: 'ev-old', processedAt: new Date(), error: 'Provedor da paróquia mudou — evento descartado' } });
      const res = await ctx.service.handle(headers, paymentEvent('PAYMENT_RECEIVED'), now);
      expect(res).toMatchObject({ processed: true, action: 'activated', communityIds: ['cap1'] });
      expect(ctx.tx.communityPlan.update).toHaveBeenCalledTimes(1);
    });
  });
});
