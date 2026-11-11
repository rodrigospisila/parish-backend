import { BadRequestException, ConflictException, ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { BillingService } from './billing.service';

const now = new Date('2026-10-20T15:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

const ENV_KEYS = ['PLATFORM_ASAAS_API_KEY', 'PLATFORM_ASAAS_ENV', 'PLATFORM_ASAAS_WEBHOOK_TOKEN', 'PLATFORM_NFSE_SERVICE_NAME', 'PLATFORM_NFSE_SERVICE_CODE'];

const tiers = [
  { id: 't_capela', key: 'capela', name: 'Capela', isActive: true, monthlyPriceCents: 4900, yearlyPriceCents: 49000 },
  { id: 't_matriz', key: 'matriz', name: 'Matriz', isActive: true, monthlyPriceCents: 16900, yearlyPriceCents: 169000 },
];

const account = {
  id: 'acc1',
  kind: 'PARISH',
  parishId: 'p1',
  legalName: 'Mitra — Paróquia Santo Antônio',
  document: '11222333000181',
  municipalRegistration: null,
  email: 'fin@paroquia.org',
  phone: null,
  responsibleName: null,
  zipCode: '84430000',
  street: 'Rua A',
  number: '1',
  complement: null,
  neighborhood: 'Centro',
  city: 'Imbituva',
  state: 'PR',
  providerCustomerId: null as string | null,
  providerSubscriptionId: null as string | null,
  billingCycle: null,
  valueCents: null,
  nextDueDate: null as Date | null,
  status: 'NONE',
  updatedAt: new Date('2026-10-19T00:00:00Z'),
};

const plan = (over: Record<string, unknown> = {}) => ({
  status: 'TRIAL',
  tierId: null,
  billingCycle: null,
  priceCents: null,
  trialEndsAt: null,
  currentPeriodEnd: null,
  graceDays: 15,
  billingAccountId: null,
  tier: null,
  ...over,
});

function setup(
  env: Record<string, string> = {},
  opts: { account?: any; canManage?: boolean; pilot?: boolean; trialEvent?: any; txCommunities?: any[] } = {},
) {
  const tx = {
    // pg_try_advisory_xact_lock da paróquia (trava do checkout)
    $queryRaw: jest.fn().mockResolvedValue([{ locked: true }]),
    billingAccount: { update: jest.fn().mockResolvedValue({}) },
    communityPlan: { updateMany: jest.fn().mockResolvedValue({ count: 0 }), upsert: jest.fn().mockResolvedValue({}) },
    communityPlanEvent: { create: jest.fn().mockResolvedValue({}), findFirst: jest.fn().mockResolvedValue(opts.trialEvent ?? null) },
    community: { findMany: jest.fn().mockResolvedValue(opts.txCommunities ?? []) },
  };
  const prisma: any = {
    parish: { findUnique: jest.fn().mockResolvedValue({ id: 'p1', name: 'Paróquia Santo Antônio', city: 'Imbituva', state: 'PR', cnpj: null, managedAt: null }) },
    billingAccount: {
      findUnique: jest.fn().mockResolvedValue(opts.account === undefined ? null : opts.account),
      upsert: jest.fn().mockImplementation(({ create }) => Promise.resolve({ ...account, ...create, id: 'acc1' })),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn().mockResolvedValue({}),
    },
    community: { findMany: jest.fn() },
    // Teste já usado pela paróquia? (AUTO_TRIAL / START_TRIAL / TRIAL_REQUESTED)
    communityPlanEvent: { findFirst: jest.fn().mockResolvedValue(opts.trialEvent ?? null) },
    planTier: { findMany: jest.fn().mockResolvedValue(tiers) },
    member: { count: jest.fn().mockResolvedValue(12) },
    platformPayment: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn((fn: (client: unknown) => Promise<unknown>) => fn(tx)),
  };
  const config: any = { get: (key: string) => env[key] };
  const hierarchy: any = { canManageParish: jest.fn().mockResolvedValue(opts.canManage ?? true) };
  const access: any = { enforcement: () => 'log', invalidate: jest.fn(), isPilotParish: jest.fn().mockResolvedValue(opts.pilot ?? false) };
  const audit: any = { log: jest.fn() };
  const service = new BillingService(prisma, config, hierarchy, access, audit);
  const provider = {
    savePlatformCustomer: jest.fn().mockResolvedValue({ providerCustomerId: 'cus_1' }),
    createPlatformSubscription: jest.fn().mockResolvedValue({ providerRef: 'sub_1', status: 'ACTIVE', nextDueDate: '2026-10-20' }),
    updatePlatformSubscription: jest.fn().mockResolvedValue({ providerRef: 'sub_1', status: 'ACTIVE', nextDueDate: '2026-11-20' }),
    setSubscriptionInvoiceSettings: jest.fn().mockResolvedValue(undefined),
    cancelSubscription: jest.fn().mockResolvedValue(undefined),
    listSubscriptionPayments: jest.fn().mockResolvedValue([
      {
        providerRef: 'pay_1',
        status: 'pending',
        paymentUrl: 'https://sandbox.asaas.com/i/pay1',
        dueDate: '2026-10-20',
        raw: { id: 'pay_1', status: 'PENDING', value: 0, dueDate: '2026-10-20', invoiceUrl: 'https://sandbox.asaas.com/i/pay1' },
      },
    ]),
  };
  return { service, prisma, tx, provider, hierarchy, audit, access };
}

const admin = { id: 'u1', role: 'PARISH_ADMIN' as const, parishId: 'p1' };
const fullEnv = { PLATFORM_ASAAS_API_KEY: 'k', PLATFORM_ASAAS_WEBHOOK_TOKEN: 'tok' };

describe('BillingService', () => {
  const saved: Record<string, string | undefined> = {};
  beforeAll(() => {
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });
  afterAll(() => {
    for (const key of ENV_KEYS) if (saved[key] !== undefined) process.env[key] = saved[key];
  });

  describe('GET /billing/me', () => {
    it('funciona sem conta de faturamento e sem env: checkoutAvailable=false, plano FREE por padrão', async () => {
      const ctx = setup();
      ctx.prisma.community.findMany.mockResolvedValue([
        { id: 'c1', name: 'Matriz', communityPlan: null },
        { id: 'c2', name: 'Capela', communityPlan: plan({ status: 'ACTIVE', tier: { ...tiers[1], maxMembers: null } }) },
      ]);
      const res = await ctx.service.me(admin);
      expect(res).toMatchObject({ checkoutAvailable: false, billingAccount: null, payments: [], trialDays: 30, enforcement: 'log' });
      expect(res.communities[0].plan).toMatchObject({ status: 'FREE', tierKey: null, activeMembers: 12, pilot: false });
      expect(res.communities[1].plan).toMatchObject({ status: 'ACTIVE', pilot: true, paidAccess: true });
      expect(res.tiers).toHaveLength(2);
      expect(ctx.prisma.platformPayment.findMany).not.toHaveBeenCalled();
    });

    it('trial: disponível enquanto a paróquia não usou o teste e tem comunidade sem acesso pago', async () => {
      const ctx = setup();
      ctx.prisma.community.findMany.mockResolvedValue([
        { id: 'c1', name: 'Matriz', communityPlan: null },
        { id: 'c2', name: 'Capela', communityPlan: plan({ status: 'FREE' }) },
      ]);
      const res = await ctx.service.me(admin);
      expect(res.trial).toEqual({ available: true, usedAt: null, endsAt: null });
      expect(ctx.prisma.communityPlanEvent.findFirst.mock.calls[0][0].where).toEqual({
        action: { in: ['AUTO_TRIAL', 'START_TRIAL', 'TRIAL_REQUESTED'] },
        community: { parishId: 'p1' },
      });
    });

    it('trial: já usado → indisponível, com usedAt e o fim do teste em curso', async () => {
      const usedAt = new Date('2026-10-10T12:00:00.000Z');
      const endsAt = new Date('2026-11-09T12:00:00.000Z');
      const ctx = setup({}, { trialEvent: { createdAt: usedAt, data: { trialEndsAt: '2026-11-09T12:00:00.000Z' } } });
      ctx.prisma.community.findMany.mockResolvedValue([
        { id: 'c1', name: 'Matriz', communityPlan: plan({ status: 'TRIAL', trialEndsAt: endsAt }) },
        { id: 'c2', name: 'Capela nova', communityPlan: null },
      ]);
      const res = await ctx.service.me(admin);
      expect(res.trial).toEqual({ available: false, usedAt: usedAt.toISOString(), endsAt: endsAt.toISOString() });

      // Teste já vencido e de volta ao grátis: endsAt vem do evento
      ctx.prisma.community.findMany.mockResolvedValue([{ id: 'c1', name: 'Matriz', communityPlan: plan({ status: 'FREE', trialEndsAt: endsAt }) }]);
      expect((await ctx.service.me(admin)).trial).toEqual({ available: false, usedAt: usedAt.toISOString(), endsAt: endsAt.toISOString() });
    });

    it('trial: piloto (acesso total) ou tudo já com acesso → indisponível; piloto marca paidAccess em toda comunidade', async () => {
      const pilot = setup({}, { pilot: true });
      pilot.prisma.community.findMany.mockResolvedValue([{ id: 'nova', name: 'Capela nova', communityPlan: null }]);
      const res = await pilot.service.me(admin);
      expect(res.trial).toEqual({ available: false, usedAt: null, endsAt: null });
      expect(res.communities[0].plan).toMatchObject({ status: 'FREE', paidAccess: true });

      const paid = setup();
      paid.prisma.community.findMany.mockResolvedValue([
        { id: 'c1', name: 'Matriz', communityPlan: plan({ status: 'ACTIVE', currentPeriodEnd: new Date(Date.now() + 10 * DAY) }) },
      ]);
      expect((await paid.service.me(admin)).trial.available).toBe(false);
    });

    it('com as envs: checkoutAvailable=true', async () => {
      const ctx = setup(fullEnv);
      ctx.prisma.community.findMany.mockResolvedValue([]);
      expect((await ctx.service.me(admin)).checkoutAvailable).toBe(true);
    });

    it('fora do escopo → 403; sem paróquia → 400', async () => {
      const ctx = setup({}, { canManage: false });
      await expect(ctx.service.me(admin, 'p2')).rejects.toBeInstanceOf(ForbiddenException);
      await expect(ctx.service.me({ id: 'u9', role: 'SYSTEM_ADMIN' })).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('PUT /billing/account', () => {
    const dto = { parishId: 'p1', legalName: 'Mitra', document: '11.222.333/0001-81', email: 'FIN@Paroquia.org', zipCode: '84430-000', state: 'pr' };

    it('CPF/CNPJ com dígito errado → 400', async () => {
      const ctx = setup();
      await expect(ctx.service.saveAccount(admin, { ...dto, document: '11.222.333/0001-80' })).rejects.toBeInstanceOf(BadRequestException);
      await expect(ctx.service.saveAccount(admin, { ...dto, document: '529.982.247-24' })).rejects.toBeInstanceOf(BadRequestException);
      expect(ctx.prisma.billingAccount.upsert).not.toHaveBeenCalled();
    });

    it('grava só dígitos, e-mail minúsculo e UF maiúscula; CPF também vale', async () => {
      const ctx = setup();
      const res = await ctx.service.saveAccount(admin, dto);
      const args = ctx.prisma.billingAccount.upsert.mock.calls[0][0];
      expect(args.create).toMatchObject({ kind: 'PARISH', parishId: 'p1', document: '11222333000181', email: 'fin@paroquia.org', zipCode: '84430000', state: 'PR' });
      expect(res.billingAccount).toMatchObject({ documentKind: 'CNPJ' });
      await expect(ctx.service.saveAccount(admin, { ...dto, document: '529.982.247-25' })).resolves.toBeDefined();
      expect(ctx.audit.log).toHaveBeenCalled();
    });

    it('DIOCESAN_ADMIN só lê: escrita → 403', async () => {
      const ctx = setup();
      await expect(ctx.service.saveAccount({ id: 'd1', role: 'DIOCESAN_ADMIN' }, dto)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('POST /billing/checkout', () => {
    const communities = [
      { id: 'matriz', name: 'Matriz', communityPlan: plan({ status: 'ACTIVE', currentPeriodEnd: null }) }, // piloto
      { id: 'cap1', name: 'Capela 1', communityPlan: plan({ trialEndsAt: new Date(now.getTime() - DAY) }) },
      { id: 'cap2', name: 'Capela 2', communityPlan: null },
    ];
    const items = [
      { communityId: 'matriz', tierKey: 'matriz' },
      { communityId: 'cap1', tierKey: 'capela' },
      { communityId: 'cap2', tierKey: 'matriz' },
    ];

    it('sem PLATFORM_ASAAS_API_KEY → 503 CHECKOUT_UNAVAILABLE (nada gravado)', async () => {
      const ctx = setup({}, { account });
      const error = await ctx.service.checkout(admin, { parishId: 'p1', cycle: 'MONTHLY', items }, now).catch((e) => e);
      expect(error).toBeInstanceOf(ServiceUnavailableException);
      expect(error.getResponse()).toMatchObject({ code: 'CHECKOUT_UNAVAILABLE' });
      expect(ctx.prisma.$transaction).not.toHaveBeenCalled();
      expect(ctx.prisma.billingAccount.update).not.toHaveBeenCalled();
    });

    it('sem conta de faturamento → 400 BILLING_ACCOUNT_REQUIRED', async () => {
      const ctx = setup(fullEnv, { account: null });
      const error = await ctx.service.checkout(admin, { parishId: 'p1', cycle: 'MONTHLY', items }, now).catch((e) => e);
      expect(error.getResponse()).toMatchObject({ code: 'BILLING_ACCOUNT_REQUIRED' });
    });

    it('mensal: soma das faixas, piloto fora, assinatura nova e link da fatura', async () => {
      const ctx = setup(fullEnv, { account });
      jest.spyOn(ctx.service, 'platformProvider').mockReturnValue(ctx.provider as any);
      ctx.prisma.community.findMany.mockResolvedValue(communities);
      const res = await ctx.service.checkout(admin, { parishId: 'p1', cycle: 'MONTHLY', items }, now);

      expect(res).toMatchObject({
        invoiceUrl: 'https://sandbox.asaas.com/i/pay1',
        valueCents: 4900 + 16900,
        nextDueDate: '2026-10-20',
        created: true,
        skippedCommunityIds: ['matriz'],
      });
      expect(ctx.provider.createPlatformSubscription).toHaveBeenCalledWith(
        expect.objectContaining({ providerCustomerId: 'cus_1', valueCents: 21800, cycle: 'MONTHLY', externalRef: expect.stringMatching(/^billing:acc1:[0-9a-z]+-[0-9a-f]+$/) }),
      );
      // Retrato da contratação: o mesmo checkoutRef vai no externalReference da assinatura e nos eventos CHECKOUT
      const externalRef: string = ctx.provider.createPlatformSubscription.mock.calls[0][0].externalRef;
      const checkoutRef = externalRef.split(':')[2];
      for (const call of ctx.tx.communityPlanEvent.create.mock.calls) {
        expect(call[0].data.data).toMatchObject({ billingAccountId: 'acc1', checkoutRef, billingCycle: 'MONTHLY', subscriptionValueCents: 21800 });
      }
      // Cliente do Asaas identificado pela conta (não pelo CPF/CNPJ)
      expect(ctx.provider.savePlatformCustomer).toHaveBeenCalledWith(expect.objectContaining({ externalRef: 'billing:acc1' }));
      // planos ligados à conta com faixa e preço; o piloto não é tocado
      const upserted = ctx.tx.communityPlan.upsert.mock.calls.map((call: any[]) => call[0].where.communityId);
      expect(upserted).toEqual(['cap1', 'cap2']);
      expect(ctx.tx.communityPlan.upsert.mock.calls[1][0].update).toMatchObject({ tierId: 't_matriz', priceCents: 16900, billingAccountId: 'acc1' });
      expect(ctx.tx.communityPlanEvent.create).toHaveBeenCalledTimes(2);
      expect(ctx.prisma.billingAccount.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { providerSubscriptionId: 'sub_1', status: 'PENDING' } }),
      );
      expect(ctx.prisma.platformPayment.create).toHaveBeenCalled();
    });

    it('anual: yearlyPriceCents', async () => {
      const ctx = setup(fullEnv, { account });
      jest.spyOn(ctx.service, 'platformProvider').mockReturnValue(ctx.provider as any);
      ctx.prisma.community.findMany.mockResolvedValue(communities);
      const res = await ctx.service.checkout(admin, { parishId: 'p1', cycle: 'YEARLY', items }, now);
      expect(res.valueCents).toBe(49000 + 169000);
      expect(ctx.provider.createPlatformSubscription).toHaveBeenCalledWith(expect.objectContaining({ cycle: 'YEARLY', valueCents: 218000 }));
    });

    it('assinatura viva: atualiza valor em vez de criar outra', async () => {
      const ctx = setup(fullEnv, { account: { ...account, providerCustomerId: 'cus_1', providerSubscriptionId: 'sub_1', status: 'ACTIVE' } });
      jest.spyOn(ctx.service, 'platformProvider').mockReturnValue(ctx.provider as any);
      ctx.prisma.community.findMany.mockResolvedValue(communities);
      const res = await ctx.service.checkout(admin, { parishId: 'p1', cycle: 'MONTHLY', items }, now);
      expect(ctx.provider.createPlatformSubscription).not.toHaveBeenCalled();
      expect(ctx.provider.updatePlatformSubscription).toHaveBeenCalledWith(
        'sub_1',
        expect.objectContaining({ valueCents: 21800, externalRef: expect.stringMatching(/^billing:acc1:/) }),
      );
      const checkoutRef = ctx.provider.updatePlatformSubscription.mock.calls[0][1].externalRef.split(':')[2];
      expect(ctx.tx.communityPlanEvent.create.mock.calls[0][0].data.data.checkoutRef).toBe(checkoutRef);
      expect(res).toMatchObject({ created: false, nextDueDate: '2026-11-20' });
    });

    it('só piloto → 400; comunidade de outra paróquia → 400; dois cliques → 409', async () => {
      const ctx = setup(fullEnv, { account });
      jest.spyOn(ctx.service, 'platformProvider').mockReturnValue(ctx.provider as any);
      ctx.prisma.community.findMany.mockResolvedValue([communities[0]]);
      await expect(
        ctx.service.checkout(admin, { parishId: 'p1', cycle: 'MONTHLY', items: [items[0]] }, now),
      ).rejects.toBeInstanceOf(BadRequestException);
      ctx.prisma.community.findMany.mockResolvedValue([communities[1]]);
      await expect(ctx.service.checkout(admin, { parishId: 'p1', cycle: 'MONTHLY', items: items.slice(1) }, now)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      ctx.prisma.community.findMany.mockResolvedValue(communities);
      ctx.tx.$queryRaw.mockResolvedValue([{ locked: false }]); // outra requisição segura a trava
      ctx.prisma.billingAccount.findUnique.mockClear();
      await expect(ctx.service.checkout(admin, { parishId: 'p1', cycle: 'MONTHLY', items }, now)).rejects.toMatchObject({ status: 409 });
      expect(ctx.provider.createPlatformSubscription).not.toHaveBeenCalled();
      expect(ctx.provider.savePlatformCustomer).not.toHaveBeenCalled();
      expect(ctx.prisma.billingAccount.findUnique).not.toHaveBeenCalled(); // conta só é lida com a trava
    });

    it('S7: trava por paróquia (advisory lock) antes de ler a conta; checkouts simultâneos criam UMA assinatura', async () => {
      const ctx = setup(fullEnv, { account });
      jest.spyOn(ctx.service, 'platformProvider').mockReturnValue(ctx.provider as any);
      ctx.prisma.community.findMany.mockResolvedValue(communities);
      // Banco simulado: conta com estado e advisory lock de transação (liberado no fim da transação)
      let row: any = { ...account };
      ctx.prisma.billingAccount.findUnique.mockImplementation(async () => ({ ...row }));
      ctx.prisma.billingAccount.update.mockImplementation(async ({ data }: any) => {
        row = { ...row, ...data };
        return row;
      });
      const held = new Set<string>();
      const lockKeys: string[] = [];
      ctx.prisma.$transaction.mockImplementation(async (fn: (client: unknown) => Promise<unknown>, options?: any) => {
        const mine: string[] = [];
        const lockTx = {
          ...ctx.tx,
          $queryRaw: jest.fn(async (strings: TemplateStringsArray, key: string) => {
            expect(strings.join('?')).toContain('pg_try_advisory_xact_lock(hashtext(?))');
            lockKeys.push(key);
            if (held.has(key)) return [{ locked: false }];
            held.add(key);
            mine.push(key);
            return [{ locked: true }];
          }),
        };
        if (options) expect(options).toMatchObject({ timeout: expect.any(Number) });
        try {
          return await fn(lockTx);
        } finally {
          for (const key of mine) held.delete(key);
        }
      });
      // Asaas lento: a 2ª requisição chega enquanto a 1ª cria a assinatura
      ctx.provider.createPlatformSubscription.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ providerRef: 'sub_1', status: 'ACTIVE', nextDueDate: '2026-10-20' }), 20)),
      );

      const results = await Promise.allSettled([
        ctx.service.checkout(admin, { parishId: 'p1', cycle: 'MONTHLY', items }, now),
        ctx.service.checkout({ ...admin, id: 'u2' }, { parishId: 'p1', cycle: 'MONTHLY', items }, now),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual(['fulfilled', 'rejected']);
      expect((results.find((r) => r.status === 'rejected') as PromiseRejectedResult).reason).toMatchObject({ status: 409 });
      expect(ctx.provider.createPlatformSubscription).toHaveBeenCalledTimes(1);
      expect(lockKeys).toEqual(['billing:p1', 'billing:p1']);

      // Depois que a 1ª termina, a próxima contratação ATUALIZA a assinatura gravada
      const again = await ctx.service.checkout(admin, { parishId: 'p1', cycle: 'YEARLY', items }, now);
      expect(again.created).toBe(false);
      expect(ctx.provider.createPlatformSubscription).toHaveBeenCalledTimes(1);
      expect(ctx.provider.updatePlatformSubscription).toHaveBeenCalledWith('sub_1', expect.objectContaining({ cycle: 'YEARLY' }));
    });
  });

  describe('POST /billing/trial — teste por pedido', () => {
    const communities = () => [
      { id: 'c1', communityPlan: null },
      { id: 'c2', communityPlan: plan({ status: 'FREE', tierId: 't_capela', tier: { ...tiers[0], maxMembers: 300 } }) },
      // Com acesso pago: fica de fora
      { id: 'c3', communityPlan: plan({ status: 'ACTIVE', currentPeriodEnd: new Date(now.getTime() + 10 * DAY) }) },
      // Suspensa pelo SYSTEM_ADMIN: o botão não desfaz
      { id: 'c4', communityPlan: plan({ status: 'SUSPENDED' }) },
      // Cancelada: pode testar
      { id: 'c5', communityPlan: plan({ status: 'CANCELED' }) },
    ];

    it('inicia TRIAL de 30 dias (START_TRIAL, evento TRIAL_REQUESTED) nas comunidades ativas sem acesso pago', async () => {
      const ctx = setup({}, { txCommunities: communities() });
      const res = await ctx.service.requestTrial(admin, { parishId: 'p1' }, now);
      const trialEndsAt = new Date(now.getTime() + 30 * DAY);
      expect(res).toEqual({ trialEndsAt, communities: 3 });

      // Só comunidades ATIVAS e não arquivadas da paróquia
      expect(ctx.tx.community.findMany.mock.calls[0][0].where).toEqual({ parishId: 'p1', deletedAt: null, status: 'ACTIVE' });
      expect(ctx.tx.communityPlan.upsert.mock.calls.map((call: any[]) => call[0].where.communityId)).toEqual(['c1', 'c2', 'c5']);
      const first = ctx.tx.communityPlan.upsert.mock.calls[0][0];
      expect(first.create).toEqual({ communityId: 'c1', status: 'TRIAL', trialEndsAt, suspendedAt: null });
      // A faixa já escolhida não é tocada
      expect(ctx.tx.communityPlan.upsert.mock.calls[1][0].update).toEqual({ status: 'TRIAL', trialEndsAt, suspendedAt: null });
      expect(ctx.tx.communityPlanEvent.create).toHaveBeenCalledTimes(3);
      expect(ctx.tx.communityPlanEvent.create.mock.calls[0][0].data).toMatchObject({
        communityId: 'c1',
        action: 'TRIAL_REQUESTED',
        fromStatus: 'FREE',
        toStatus: 'TRIAL',
        byUserId: 'u1',
        data: { trialDays: 30, trialEndsAt: trialEndsAt.toISOString() },
      });
      expect(ctx.tx.communityPlanEvent.create.mock.calls[2][0].data).toMatchObject({ communityId: 'c5', fromStatus: 'CANCELED' });
      expect(ctx.access.invalidate.mock.calls.map((call: any[]) => call[0])).toEqual(['c1', 'c2', 'c5']);
      expect(ctx.audit.log).toHaveBeenCalledWith(expect.objectContaining({ entity: 'Parish', entityId: 'p1' }));
      // Trava por paróquia antes de conferir se o teste já foi usado
      expect(String(ctx.tx.$queryRaw.mock.calls[0][0].join('?'))).toContain('pg_try_advisory_xact_lock');
      expect(ctx.tx.$queryRaw.mock.calls[0][1]).toBe('billing-trial:p1');
      expect(ctx.tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(ctx.tx.communityPlanEvent.findFirst.mock.invocationCallOrder[0]);
    });

    it('uma vez por paróquia: evento AUTO_TRIAL / START_TRIAL / TRIAL_REQUESTED em qualquer comunidade → 409 TRIAL_ALREADY_USED', async () => {
      const ctx = setup({}, { txCommunities: communities(), trialEvent: { createdAt: new Date(), data: null } });
      const error: any = await ctx.service.requestTrial(admin, { parishId: 'p1' }, now).catch((e) => e);
      expect(error).toBeInstanceOf(ConflictException);
      expect(error.getResponse()).toMatchObject({ code: 'TRIAL_ALREADY_USED' });
      expect(ctx.tx.communityPlanEvent.findFirst.mock.calls[0][0].where).toEqual({
        action: { in: ['AUTO_TRIAL', 'START_TRIAL', 'TRIAL_REQUESTED'] },
        community: { parishId: 'p1' },
      });
      expect(ctx.tx.communityPlan.upsert).not.toHaveBeenCalled();
      expect(ctx.tx.communityPlanEvent.create).not.toHaveBeenCalled();
    });

    it('piloto → 409 TRIAL_NOT_NEEDED (nada gravado); tudo já com acesso → 409 TRIAL_NOT_NEEDED sem gastar o teste', async () => {
      const pilot = setup({}, { pilot: true, txCommunities: communities() });
      const error: any = await pilot.service.requestTrial(admin, { parishId: 'p1' }, now).catch((e) => e);
      expect(error).toBeInstanceOf(ConflictException);
      expect(error.getResponse()).toMatchObject({ code: 'TRIAL_NOT_NEEDED' });
      expect(pilot.prisma.$transaction).not.toHaveBeenCalled();

      const paid = setup({}, { txCommunities: [communities()[2]] });
      const second: any = await paid.service.requestTrial(admin, { parishId: 'p1' }, now).catch((e) => e);
      expect(second.getResponse()).toMatchObject({ code: 'TRIAL_NOT_NEEDED' });
      expect(paid.tx.communityPlanEvent.create).not.toHaveBeenCalled();

      const empty = setup({}, { txCommunities: [] });
      await expect(empty.service.requestTrial(admin, { parishId: 'p1' }, now)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('dois cliques (trava ocupada) → 409; fora do escopo → 403; paróquia inexistente → 404', async () => {
      const busy = setup({}, { txCommunities: communities() });
      busy.tx.$queryRaw.mockResolvedValueOnce([{ locked: false }]);
      await expect(busy.service.requestTrial(admin, { parishId: 'p1' }, now)).rejects.toBeInstanceOf(ConflictException);
      expect(busy.tx.communityPlan.upsert).not.toHaveBeenCalled();

      const out = setup({}, { canManage: false });
      await expect(out.service.requestTrial(admin, { parishId: 'p2' }, now)).rejects.toBeInstanceOf(ForbiddenException);

      const missing = setup();
      missing.prisma.parish.findUnique.mockResolvedValue(null);
      await expect(missing.service.requestTrial(admin, { parishId: 'p9' }, now)).rejects.toThrow(/Paróquia não encontrada/);
    });

    it('DIOCESAN_ADMIN e SYSTEM_ADMIN no escopo também podem pedir', async () => {
      const ctx = setup({}, { txCommunities: [{ id: 'c1', communityPlan: null }] });
      const res = await ctx.service.requestTrial({ id: 'd1', role: 'DIOCESAN_ADMIN' }, { parishId: 'p1' }, now);
      expect(res.communities).toBe(1);
      expect(ctx.hierarchy.canManageParish).toHaveBeenCalledWith('d1', 'p1');
    });
  });

  describe('POST /billing/cancel', () => {
    it('cancela no provedor; planos seguem até o fim do período', async () => {
      const ctx = setup(fullEnv, { account: { ...account, providerSubscriptionId: 'sub_1', status: 'ACTIVE' } });
      jest.spyOn(ctx.service, 'platformProvider').mockReturnValue(ctx.provider as any);
      ctx.prisma.communityPlan = {
        findMany: jest.fn().mockResolvedValue([{ communityId: 'cap1', status: 'ACTIVE', currentPeriodEnd: new Date(now.getTime() + 10 * DAY) }]),
      };
      const res = await ctx.service.cancel(admin, { parishId: 'p1' });
      expect(ctx.provider.cancelSubscription).toHaveBeenCalledWith({ providerRef: 'sub_1' });
      expect(ctx.tx.billingAccount.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'CANCELED', nextDueDate: null } }));
      expect(ctx.tx.communityPlanEvent.create.mock.calls[0][0].data).toMatchObject({ action: 'BILLING_CANCEL', toStatus: 'ACTIVE' });
      expect(res.plans[0].status).toBe('ACTIVE');
    });

    it('sem assinatura → 400', async () => {
      const ctx = setup(fullEnv, { account });
      await expect(ctx.service.cancel(admin, { parishId: 'p1' })).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
