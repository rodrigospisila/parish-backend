import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { TitheService } from './tithe.service';
import { TitheGuestService } from './guest.service';
import { TitheAgentService } from './agent.service';
import { AsaasProvider } from '../payments/asaas.provider';
import { PROVIDER_FEE_CATEGORY, isRevenueReversal } from '../finance/money';

/**
 * B33 da auditoria: liquidação, webhook e estorno do dízimo com o provedor
 * simulado (nenhuma chamada real ao Asaas: o fetch do provedor falha se for
 * usado) e um Prisma em memória que respeita as transições condicionais
 * (updateMany com status/refundedAmount) — é delas que vem a idempotência.
 */

// ===== Prisma em memória =====

type Row = Record<string, any>;
const OPS = ['in', 'notIn', 'not', 'lt', 'lte', 'gt', 'gte', 'equals', 'contains'];
const isPlain = (v: unknown): v is Row => !!v && typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v);
const same = (a: unknown, b: unknown) => (a instanceof Date && b instanceof Date ? a.getTime() === b.getTime() : (a ?? null) === (b ?? null));
const cmp = (a: any, b: any) => (a instanceof Date ? a.getTime() : a) - (b instanceof Date ? b.getTime() : b);

function matches(row: Row, where: Row = {}): boolean {
  return Object.entries(where).every(([key, cond]) => {
    if (cond === undefined) return true;
    if (key === 'OR') return (cond as Row[]).some((w) => matches(row, w));
    if (key === 'AND') return (cond as Row[]).every((w) => matches(row, w));
    if (isPlain(cond)) {
      const ops = Object.keys(cond).filter((k) => OPS.includes(k));
      if (!ops.length) {
        // Chave composta (provider_eventId…) ou filtro de relação (member: {...}): relação é ignorada
        if (row[key] === undefined && Object.keys(cond).every((k) => k in row)) return matches(row, cond);
        return true;
      }
      const v = row[key];
      return ops.every((op) => {
        const c = cond[op];
        if (op === 'in') return (c as unknown[]).some((x) => same(v, x));
        if (op === 'notIn') return !(c as unknown[]).some((x) => same(v, x));
        if (op === 'not') return isPlain(c) ? !matches(row, { [key]: c }) : !same(v, c);
        if (op === 'equals') return same(v, c);
        if (op === 'contains') return String(v ?? '').includes(String(c));
        if (v === null || v === undefined) return false;
        if (op === 'lt') return cmp(v, c) < 0;
        if (op === 'lte') return cmp(v, c) <= 0;
        if (op === 'gt') return cmp(v, c) > 0;
        return cmp(v, c) >= 0;
      });
    }
    return same(row[key], cond);
  });
}

function makePrisma(seed: Partial<Record<string, Row[]>> = {}) {
  const tables: Record<string, Row[]> = {};
  let seq = 0;
  const defaults: Record<string, () => Row> = {
    titheIntent: () => ({ status: 'CREATED', kind: 'TITHE', method: 'PIX_STATIC', paymentMethod: 'PIX', anonymous: false, feeAmount: 0, refundedAmount: 0, chargedAmount: null, amountPaid: null, note: null, providerRef: null, providerStatus: null, scheduleId: null, campaignId: null, contributionId: null, declaredAt: null, confirmedAt: null, qrExpiresAt: null, contestedAt: null }),
    titheGuestGift: () => ({ status: 'CREATED', method: 'GATEWAY', paymentMethod: 'PIX', feeAmount: 0, refundedAmount: 0, amountPaid: null, providerStatus: null, financialTransactionId: null, campaignId: null, note: null }),
    financialTransaction: () => ({ costCenter: null, campaignId: null, titheIntentId: null, reversalOfId: null, guestGiftId: null, communityId: null }),
    paymentWebhookEvent: () => ({ processedAt: null, error: null, attempts: 0, receivedAt: new Date() }),
  };
  const applyData = (row: Row, data: Row) => {
    for (const [k, v] of Object.entries(data)) {
      if (v === undefined) continue;
      if (isPlain(v) && 'increment' in v) row[k] = (row[k] ?? 0) + (v as any).increment;
      else row[k] = v;
    }
    if (!('updatedAt' in data)) row.updatedAt = new Date();
  };
  const withInclude = (name: string, row: Row | undefined, args: Row = {}) => {
    if (!row) return row ?? null;
    const out: Row = { ...row };
    const inc = args.include ?? {};
    if (name === 'titheIntent' || name === 'titheGuestGift') {
      if (inc.member) out.member = tables.member?.find((m) => m.id === row.memberId) ?? null;
      if (inc.parish) out.parish = tables.parish?.find((p) => p.id === row.parishId) ?? null;
      if (inc.campaign) out.campaign = row.campaignId ? tables.titheCampaign?.find((c) => c.id === row.campaignId) ?? null : null;
    }
    return out;
  };
  const model = (name: string) => {
    tables[name] = tables[name] ?? (seed[name] ?? []).map((r) => ({ ...(defaults[name]?.() ?? {}), createdAt: new Date(), updatedAt: new Date(), ...r }));
    const rows = () => tables[name];
    const findOne = (args: Row) => rows().find((r) => matches(r, args.where));
    return {
      findUnique: jest.fn(async (args: Row) => withInclude(name, findOne(args), args)),
      findUniqueOrThrow: jest.fn(async (args: Row) => {
        const r = findOne(args);
        if (!r) throw new Error(`${name} não encontrado`);
        return withInclude(name, r, args);
      }),
      findFirst: jest.fn(async (args: Row = {}) => withInclude(name, findOne(args), args)),
      findFirstOrThrow: jest.fn(async (args: Row) => {
        const r = findOne(args);
        if (!r) throw new Error(`${name} não encontrado`);
        return withInclude(name, r, args);
      }),
      findMany: jest.fn(async (args: Row = {}) => rows().filter((r) => matches(r, args.where)).map((r) => withInclude(name, r, args))),
      count: jest.fn(async (args: Row = {}) => rows().filter((r) => matches(r, args.where)).length),
      create: jest.fn(async (args: Row) => {
        const row: Row = { ...(defaults[name]?.() ?? {}), id: `${name}-${++seq}`, createdAt: new Date(), updatedAt: new Date() };
        applyData(row, args.data);
        rows().push(row);
        return withInclude(name, row, args);
      }),
      update: jest.fn(async (args: Row) => {
        const r = findOne(args);
        if (!r) throw new Error(`${name} não encontrado para update`);
        applyData(r, args.data);
        return withInclude(name, r, args);
      }),
      updateMany: jest.fn(async (args: Row) => {
        const hit = rows().filter((r) => matches(r, args.where));
        hit.forEach((r) => applyData(r, args.data));
        return { count: hit.length };
      }),
      deleteMany: jest.fn(async (args: Row) => {
        const before = rows().length;
        tables[name] = rows().filter((r) => !matches(r, args.where));
        return { count: before - tables[name].length };
      }),
      upsert: jest.fn(async (args: Row) => {
        const r = findOne(args);
        if (r) {
          applyData(r, args.update);
          return r;
        }
        const row: Row = { id: `${name}-${++seq}`, createdAt: new Date(), updatedAt: new Date(), ...args.create };
        rows().push(row);
        return row;
      }),
    };
  };
  const names = ['titheIntent', 'titheGuestGift', 'financialTransaction', 'titheContribution', 'tither', 'paymentWebhookEvent', 'parish', 'member', 'titheCampaign', 'user', 'memberProviderCustomer', 'titheSchedule'];
  const prisma: Row = { tables };
  for (const n of names) prisma[n] = model(n);
  prisma.$transaction = jest.fn(async (cb: (tx: unknown) => unknown) => cb(prisma));
  return prisma as any;
}

// ===== Cenário =====

const TOKEN = 'tok-webhook-super-secreto-1234567890';
const parishRow = (over: Row = {}) => ({
  id: 'p1',
  name: 'Paróquia São José',
  city: 'Ponta Grossa',
  dioceseId: 'd1',
  logoUrl: null,
  titheEnabled: true,
  pixKey: 'chave@paroquia.org',
  pixKeyType: 'EMAIL',
  pixMerchantName: 'PAROQUIA SAO JOSE',
  pixMerchantCity: 'PONTA GROSSA',
  titheMessage: null,
  pixKeyChangedAt: null,
  pixKeyChangedByUserId: null,
  paymentProvider: 'ASAAS',
  providerEnv: 'sandbox',
  providerApiKeyEnc: 'cifrada',
  providerWebhookToken: TOKEN,
  providerConfiguredAt: new Date(),
  feePolicy: 'ABSORB',
  feeFixed: 0,
  feePercent: 0,
  whatsappEnabled: false,
  ...over,
});
const memberRow = { id: 'm1', fullName: 'Maria Dizimista', userId: 'u-fiel', communityId: 'c1', deletedAt: null, community: { parishId: 'p1', name: 'Matriz' } };

const admin = { id: 'u-admin', role: UserRole.PARISH_ADMIN, parishId: 'p1', email: 'admin@x' } as any;
const coordOutra = { id: 'u-coord', role: UserRole.COMMUNITY_COORDINATOR, parishId: 'p1', communityId: 'c-outra' } as any;

function setup(opts: { parish?: Row; intents?: Row[]; gifts?: Row[] } = {}) {
  const prisma = makePrisma({
    parish: [parishRow(opts.parish)],
    member: [memberRow],
    titheIntent: opts.intents ?? [],
    titheGuestGift: opts.gifts ?? [],
    user: [],
  });
  // Provedor real (parse/verify do Asaas) com fetch que falha: nada sai para a rede
  const provider = new AsaasProvider({ apiKey: 'x', env: 'sandbox' }, async () => {
    throw new Error('rede proibida no teste');
  });
  const getCharge = jest.spyOn(provider, 'getCharge');
  const getRefundedAmount = jest.spyOn(provider, 'getRefundedAmount').mockResolvedValue(null);
  jest.spyOn(provider, 'cancelCharge').mockResolvedValue(undefined);
  const payments = { hasProvider: (p: Row) => !!p?.paymentProvider && !!p?.providerApiKeyEnc, forParish: () => provider } as any;
  const audit = { log: jest.fn() } as any;
  const notifications = { notifyUsers: jest.fn() } as any;
  const hierarchy = { getCommunityScopeIds: jest.fn(async (u: any) => (u?.communityId ? [u.communityId] : [])) } as any;
  const whatsapp = { tryThank: jest.fn() } as any;
  let guest: TitheGuestService;
  const tithe = new TitheService(prisma, hierarchy, audit, notifications, {} as any, payments, whatsapp, {
    settleByProvider: (...args: any[]) => (guest as any).settleByProvider(...args),
  } as any);
  const email = { trySend: jest.fn().mockResolvedValue(true) } as any;
  guest = new TitheGuestService(prisma, tithe, audit, email, {} as any, payments);
  const agent = new TitheAgentService(prisma, tithe, audit, notifications);
  return { prisma, provider, getCharge, getRefundedAmount, tithe, guest, agent, notifications, audit };
}

const gatewayIntent = (over: Row = {}) => ({
  id: 'i1',
  memberId: 'm1',
  parishId: 'p1',
  communityId: 'c1',
  amount: 100,
  referenceMonth: '2026-10',
  kind: 'TITHE',
  method: 'GATEWAY',
  txid: 'TX1',
  providerRef: 'pay_1',
  providerStatus: 'pending',
  chargedAmount: 100,
  ...over,
});

/** Cobrança como o Asaas devolve em GET /payments/{id} (sem `refunds`, salvo quando informado). */
const asaasPayment = (over: Row = {}) => ({ id: 'pay_1', status: 'RECEIVED', value: 100, netValue: 98.01, externalReference: 'i1', paymentDate: '2026-10-05', billingType: 'PIX', ...over });
const webhook = (event: string, id: string, payment: Row = { id: 'pay_1', externalReference: 'i1', status: 'RECEIVED' }) => ({
  headers: { 'asaas-access-token': TOKEN },
  body: { id, event, payment },
});
const mockCharge = (ctx: ReturnType<typeof setup>, payment: Row) =>
  ctx.getCharge.mockImplementation(async () => (ctx.provider as any).mapCharge({ ...asaasPayment(), ...payment }));

const lines = (ctx: ReturnType<typeof setup>) => ctx.prisma.tables.financialTransaction as Row[];

describe('Dízimo — liquidação pelo provedor (webhook)', () => {
  it('webhook com token errado é recusado antes de qualquer efeito', async () => {
    const ctx = setup({ intents: [gatewayIntent()] });
    await expect(ctx.tithe.handleWebhook('ASAAS', 'p1', { headers: { 'asaas-access-token': 'errado' }, body: {} })).rejects.toBeInstanceOf(ForbiddenException);
    expect(ctx.getCharge).not.toHaveBeenCalled();
  });

  it('webhook duplicado: um lançamento de receita, uma contribuição e uma despesa de taxa (M46)', async () => {
    const ctx = setup({ intents: [gatewayIntent()] });
    mockCharge(ctx, {});
    const first = await ctx.tithe.handleWebhook('ASAAS', 'p1', webhook('PAYMENT_RECEIVED', 'evt_1'));
    const again = await ctx.tithe.handleWebhook('ASAAS', 'p1', webhook('PAYMENT_RECEIVED', 'evt_1'));
    // Outro evento da mesma cobrança (CONFIRMED depois de RECEIVED): a transição condicional segura
    await ctx.tithe.handleWebhook('ASAAS', 'p1', webhook('PAYMENT_CONFIRMED', 'evt_2'));
    expect(first).toEqual({ received: true, processed: true });
    expect(again).toEqual({ received: true, duplicate: true });
    const intent = ctx.prisma.tables.titheIntent[0];
    expect(intent).toMatchObject({ status: 'CONFIRMED', amountPaid: 100, feeAmount: 1.99 });
    const income = lines(ctx).filter((t) => t.type === 'INCOME');
    const fees = lines(ctx).filter((t) => t.category === PROVIDER_FEE_CATEGORY);
    expect(income).toHaveLength(1);
    expect(income[0]).toMatchObject({ amount: 100, category: 'Dízimo', titheIntentId: 'i1' });
    expect(fees).toHaveLength(1);
    expect(fees[0]).toMatchObject({ type: 'EXPENSE', amount: 1.99, costCenter: 'Administrativo', titheIntentId: 'i1', campaignId: null });
    // Taxa é despesa no balancete, não estorno de receita
    expect(isRevenueReversal(fees[0] as any)).toBe(false);
    expect(ctx.prisma.tables.titheContribution).toHaveLength(1);
    expect(ctx.prisma.tables.titheContribution[0].amount).toBe(100);
  });

  it('PASS_THROUGH: o Financeiro leva só a diferença entre a taxa real e a repassada', async () => {
    const ctx = setup({ intents: [gatewayIntent({ chargedAmount: 102 })], parish: { feePolicy: 'PASS_THROUGH' } });
    mockCharge(ctx, { value: 102, netValue: 99.97 });
    await ctx.tithe.handleWebhook('ASAAS', 'p1', webhook('PAYMENT_RECEIVED', 'evt_pt'));
    const fee = lines(ctx).find((t) => t.category === PROVIDER_FEE_CATEGORY)!;
    expect(fee).toMatchObject({ type: 'EXPENSE', amount: 0.03 });
    // Receita (dízimo) 100 − taxa 0,03 = 99,97 = o que caiu na conta
    expect(lines(ctx).find((t) => t.type === 'INCOME' && t.category === 'Dízimo')!.amount).toBe(100);

    const ctx2 = setup({ intents: [gatewayIntent({ chargedAmount: 102 })], parish: { feePolicy: 'PASS_THROUGH' } });
    mockCharge(ctx2, { value: 102, netValue: 100.5 });
    await ctx2.tithe.handleWebhook('ASAAS', 'p1', webhook('PAYMENT_RECEIVED', 'evt_pt2'));
    expect(lines(ctx2).find((t) => t.category === PROVIDER_FEE_CATEGORY)).toMatchObject({ type: 'INCOME', amount: 0.5 });
  });

  it('pagamento depois do cancelamento local é receita real: liquida e avisa a tesouraria', async () => {
    const ctx = setup({ intents: [gatewayIntent({ status: 'CANCELLED', note: 'Cancelado pelo fiel' })] });
    ctx.prisma.tables.user.push({ id: 'u-admin', isActive: true, parishId: 'p1', role: UserRole.PARISH_ADMIN });
    mockCharge(ctx, {});
    await ctx.tithe.handleWebhook('ASAAS', 'p1', webhook('PAYMENT_RECEIVED', 'evt_late'));
    expect(ctx.prisma.tables.titheIntent[0].status).toBe('CONFIRMED');
    expect(ctx.notifications.notifyUsers).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'Pix pago após o encerramento', expect.any(String), expect.anything());
  });

  it('divergência de valor: nada é lançado; a tesouraria concilia à mão', async () => {
    const ctx = setup({ intents: [gatewayIntent({ status: 'DECLARED' })] });
    mockCharge(ctx, { value: 80, netValue: 78 });
    await ctx.tithe.handleWebhook('ASAAS', 'p1', webhook('PAYMENT_RECEIVED', 'evt_mm'));
    expect(ctx.prisma.tables.titheIntent[0]).toMatchObject({ status: 'DECLARED', providerStatus: 'mismatch' });
    expect(lines(ctx)).toHaveLength(0);
    await ctx.tithe.confirmIntent('i1', admin, { amountPaid: 80 });
    expect(ctx.prisma.tables.titheIntent[0]).toMatchObject({ status: 'CONFIRMED', amountPaid: 80 });
    expect(lines(ctx).filter((t) => t.type === 'INCOME')).toHaveLength(1);
  });

  it('evento antes do Pix existir fica pendente e o reprocessamento liquida depois', async () => {
    const ctx = setup({ intents: [] });
    mockCharge(ctx, { externalReference: 'i-novo' });
    const out = await ctx.tithe.handleWebhook('ASAAS', 'p1', webhook('PAYMENT_RECEIVED', 'evt_cedo', { id: 'pay_9', externalReference: 'i-novo', status: 'RECEIVED' }));
    expect(out).toEqual({ received: true, processed: false });
    expect(ctx.prisma.tables.paymentWebhookEvent[0].error).toContain('sem Pix correspondente');
    ctx.prisma.tables.titheIntent.push({ ...gatewayIntent({ id: 'i-novo', providerRef: 'pay_9', txid: 'TX9' }), status: 'CREATED', refundedAmount: 0, feeAmount: 0, createdAt: new Date(), updatedAt: new Date() });
    expect(await ctx.tithe.reprocessFailedWebhooks(new Date())).toBe(1);
    expect(ctx.prisma.tables.titheIntent.find((i: Row) => i.id === 'i-novo').status).toBe('CONFIRMED');
  });
});

describe('Dízimo — estorno total e parcial (B20)', () => {
  const settled = async () => {
    const ctx = setup({ intents: [gatewayIntent()] });
    mockCharge(ctx, {});
    await ctx.tithe.handleWebhook('ASAAS', 'p1', webhook('PAYMENT_RECEIVED', 'evt_pago'));
    return ctx;
  };
  const reversals = (ctx: ReturnType<typeof setup>) => lines(ctx).filter((t) => t.type === 'EXPENSE' && t.category === 'Dízimo');

  it('estorno total: reverte o valor pago uma vez só e tira a contribuição', async () => {
    const ctx = await settled();
    mockCharge(ctx, { status: 'REFUNDED' });
    await ctx.tithe.handleWebhook('ASAAS', 'p1', webhook('PAYMENT_REFUNDED', 'evt_ref'));
    await ctx.tithe.handleWebhook('ASAAS', 'p1', webhook('PAYMENT_REFUNDED', 'evt_ref_bis'));
    expect(ctx.prisma.tables.titheIntent[0]).toMatchObject({ status: 'CANCELLED', providerStatus: 'refunded', refundedAmount: 100, contributionId: null });
    expect(reversals(ctx)).toHaveLength(1);
    expect(reversals(ctx)[0].amount).toBe(100);
    expect(isRevenueReversal(reversals(ctx)[0] as any)).toBe(true);
    expect(ctx.prisma.tables.titheContribution).toHaveLength(0);
    // Pix estornado não pode ser reaberto
    await expect(ctx.tithe.reopenIntent('i1', admin)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('estorno parcial: só a diferença, de forma idempotente, até o total', async () => {
    const ctx = await settled();
    mockCharge(ctx, { refunds: [{ value: 30, status: 'DONE' }] });
    await ctx.tithe.handleWebhook('ASAAS', 'p1', webhook('PAYMENT_PARTIALLY_REFUNDED', 'evt_p1'));
    // Mesmo total chegando de novo (outro evento, consulta da tesouraria): nada novo
    await ctx.tithe.handleWebhook('ASAAS', 'p1', webhook('PAYMENT_UPDATED', 'evt_p1_bis'));
    await ctx.tithe.syncIntentForFinance('i1', admin);
    let intent = ctx.prisma.tables.titheIntent[0];
    expect(intent).toMatchObject({ status: 'CONFIRMED', providerStatus: 'partially_refunded', refundedAmount: 30 });
    expect(reversals(ctx).map((t) => t.amount)).toEqual([30]);
    expect(ctx.prisma.tables.titheContribution[0].amount).toBe(70);

    // Segundo estorno parcial (total acumulado 50): lança 20
    mockCharge(ctx, { refunds: [{ value: 30, status: 'DONE' }, { value: 20, status: 'DONE' }, { value: 10, status: 'PENDING' }] });
    await ctx.tithe.handleWebhook('ASAAS', 'p1', webhook('PAYMENT_PARTIALLY_REFUNDED', 'evt_p2'));
    expect(reversals(ctx).map((t) => t.amount)).toEqual([30, 20]);
    expect(ctx.prisma.tables.titheContribution[0].amount).toBe(50);

    // Estorno do resto: encerra e lança só o que faltava
    mockCharge(ctx, { status: 'REFUNDED', refunds: [{ value: 30, status: 'DONE' }, { value: 20, status: 'DONE' }, { value: 50, status: 'DONE' }] });
    await ctx.tithe.handleWebhook('ASAAS', 'p1', webhook('PAYMENT_REFUNDED', 'evt_p3'));
    intent = ctx.prisma.tables.titheIntent[0];
    expect(intent).toMatchObject({ status: 'CANCELLED', refundedAmount: 100 });
    expect(reversals(ctx).map((t) => t.amount)).toEqual([30, 20, 50]);
    expect(ctx.prisma.tables.titheContribution).toHaveLength(0);
  });

  it('estorno total com a cobrança ainda "recebida" no provedor não volta a liquidar', async () => {
    const ctx = await settled();
    mockCharge(ctx, { refunds: [{ value: 100, status: 'DONE' }] });
    await ctx.tithe.handleWebhook('ASAAS', 'p1', webhook('PAYMENT_PARTIALLY_REFUNDED', 'evt_tot'));
    expect(ctx.prisma.tables.titheIntent[0]).toMatchObject({ status: 'CANCELLED', refundedAmount: 100 });
    // Novo evento/consulta com status RECEIVED: nada de segunda receita
    await ctx.tithe.handleWebhook('ASAAS', 'p1', webhook('PAYMENT_UPDATED', 'evt_tot_bis'));
    await ctx.tithe.syncIntentForFinance('i1', admin);
    expect(lines(ctx).filter((t) => t.type === 'INCOME')).toHaveLength(1);
    expect(ctx.prisma.tables.titheIntent[0].status).toBe('CANCELLED');
  });

  it('status REFUNDED com estorno de só parte do valor não apaga a contribuição inteira', async () => {
    const ctx = await settled();
    mockCharge(ctx, { status: 'REFUNDED' });
    ctx.getRefundedAmount.mockResolvedValue(30);
    await ctx.tithe.handleWebhook('ASAAS', 'p1', webhook('PAYMENT_REFUNDED', 'evt_x'));
    expect(ctx.getRefundedAmount).toHaveBeenCalledWith('pay_1');
    expect(ctx.prisma.tables.titheIntent[0]).toMatchObject({ status: 'CONFIRMED', refundedAmount: 30 });
    expect(reversals(ctx).map((t) => t.amount)).toEqual([30]);
  });
});

describe('Dízimo — Pix do provedor reaberto (B45)', () => {
  const expired = () =>
    setup({ intents: [gatewayIntent({ status: 'CANCELLED', note: 'Cobrança expirada — gere outra quando for contribuir', providerStatus: 'pending' })] });

  it('cobrança morta no provedor: reabre para conferência e a tesouraria confirma à mão', async () => {
    const ctx = expired();
    mockCharge(ctx, { status: 'PENDING', deleted: true, netValue: null });
    const reopened = await ctx.tithe.reopenIntent('i1', admin);
    expect(reopened.status).toBe('DECLARED');
    expect(ctx.prisma.tables.titheIntent[0].providerStatus).toBe('cancelled');
    const confirmed = await ctx.tithe.confirmIntent('i1', admin, { date: '2026-10-05' });
    expect(confirmed.status).toBe('CONFIRMED');
    expect(lines(ctx).filter((t) => t.type === 'INCOME')).toHaveLength(1);
    // Conferência manual: sem taxa do provedor
    expect(lines(ctx).some((t) => t.category === PROVIDER_FEE_CATEGORY)).toBe(false);
  });

  it('cobrança paga no provedor: reabrir liquida pelo provedor (sem ficar em DECLARED)', async () => {
    const ctx = expired();
    mockCharge(ctx, {});
    const out = await ctx.tithe.reopenIntent('i1', admin);
    expect(out.status).toBe('CONFIRMED');
    expect(lines(ctx).filter((t) => t.type === 'INCOME')).toHaveLength(1);
  });

  it('cobrança ainda viva no provedor: confirmação manual continua bloqueada', async () => {
    const ctx = setup({ intents: [gatewayIntent({ status: 'DECLARED' })] });
    mockCharge(ctx, { status: 'PENDING', netValue: null });
    await expect(ctx.tithe.confirmIntent('i1', admin, {})).rejects.toThrow('Consultar provedor');
    expect(lines(ctx)).toHaveLength(0);
  });

  it('reaberto e esquecido: a expiração encerra depois de 7 dias sem movimento', async () => {
    const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    const ctx = setup({
      intents: [
        gatewayIntent({ id: 'velho', txid: 'TXV', providerRef: 'pay_v', status: 'DECLARED', providerStatus: 'cancelled', updatedAt: old }),
        gatewayIntent({ id: 'novo', txid: 'TXN', providerRef: 'pay_n', status: 'DECLARED', providerStatus: 'cancelled' }),
      ],
    });
    mockCharge(ctx, { status: 'PENDING', deleted: true });
    const now = new Date();
    const count = await ctx.tithe.expireGatewayIntents(now, new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
    expect(count).toBe(1);
    const byId = (id: string) => ctx.prisma.tables.titheIntent.find((i: Row) => i.id === id);
    expect(byId('velho')).toMatchObject({ status: 'CANCELLED' });
    expect(byId('velho').note).toMatch(/^Cobrança expirada/);
    expect(byId('novo').status).toBe('DECLARED');
  });

  it('escopo financeiro: coordenação de outra comunidade não confirma nem reabre', async () => {
    const ctx = expired();
    await expect(ctx.tithe.reopenIntent('i1', coordOutra)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(ctx.tithe.confirmIntent('i1', coordOutra, {})).rejects.toBeInstanceOf(ForbiddenException);
    await expect(ctx.tithe.syncIntentForFinance('i1', { id: 'u-fiel', role: UserRole.FAITHFUL } as any)).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('Oferta de visitante pelo provedor (M11, M46, B20)', () => {
  const guestDto = { name: 'Visitante Curioso', email: 'visitante@exemplo.org', cpf: '529.982.247-25', amount: 50, paymentMethod: 'BOLETO' };

  it('M11: nunca reaproveita o cliente do provedor achado pelo CPF digitado', async () => {
    const ctx = setup();
    const ensure = jest.spyOn(ctx.provider, 'ensureCustomer').mockResolvedValue({ providerCustomerId: 'cus_visitante' });
    jest.spyOn(ctx.provider, 'createCharge').mockResolvedValue({ providerRef: 'pay_g', status: 'pending', paymentUrl: 'https://sandbox.asaas.com/i/x', boletoUrl: 'https://sandbox.asaas.com/b/x' });
    const out = await ctx.guest.create('p1', guestDto, '10.0.0.1');
    expect(ensure).toHaveBeenCalledWith(expect.objectContaining({ reuseExisting: false, name: 'Visitante Curioso', cpfCnpj: '52998224725' }));
    expect(out.boletoUrl).toBe('https://sandbox.asaas.com/b/x');
  });

  it('M11 no provedor: com reuseExisting=false o Asaas não consulta /customers?cpfCnpj', async () => {
    const calls: string[] = [];
    const p = new AsaasProvider({ apiKey: 'x', env: 'sandbox' }, async (url: string, init?: RequestInit) => {
      calls.push(`${init?.method} ${url}`);
      return new Response(JSON.stringify({ id: 'cus_novo', data: [{ id: 'cus_do_dizimista' }] }), { status: 200 });
    });
    expect(await p.ensureCustomer({ cpfCnpj: '52998224725', name: 'Visitante', externalRef: 'guest-1', reuseExisting: false })).toEqual({ providerCustomerId: 'cus_novo' });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatch(/^POST .*\/customers$/);
  });

  const paidGift = () => ({ id: 'g1', parishId: 'p1', name: 'Visitante', email: 'v@x.org', amount: 50, txid: 'VS1', providerRef: 'pay_g', receiptToken: 'tokentokentokentoken', status: 'CREATED' });

  it('liquidação com taxa (M46) e estorno parcial idempotente (B20)', async () => {
    const ctx = setup({ gifts: [paidGift()] });
    mockCharge(ctx, { id: 'pay_g', value: 50, netValue: 49.01, externalReference: 'guest-g1' });
    await ctx.tithe.handleWebhook('ASAAS', 'p1', webhook('PAYMENT_RECEIVED', 'evt_g1', { id: 'pay_g', externalReference: 'guest-g1' }));
    const gift = ctx.prisma.tables.titheGuestGift[0];
    expect(gift).toMatchObject({ status: 'CONFIRMED', feeAmount: 0.99 });
    expect(lines(ctx).find((t) => t.type === 'INCOME')).toMatchObject({ amount: 50, guestGiftId: 'g1' });
    expect(lines(ctx).find((t) => t.category === PROVIDER_FEE_CATEGORY)).toMatchObject({ type: 'EXPENSE', amount: 0.99, guestGiftId: 'g1' });

    mockCharge(ctx, { id: 'pay_g', value: 50, refunds: [{ value: 10, status: 'DONE' }] });
    await ctx.tithe.handleWebhook('ASAAS', 'p1', webhook('PAYMENT_PARTIALLY_REFUNDED', 'evt_g2', { id: 'pay_g' }));
    await ctx.tithe.handleWebhook('ASAAS', 'p1', webhook('PAYMENT_PARTIALLY_REFUNDED', 'evt_g2_bis', { id: 'pay_g' }));
    const refunds = lines(ctx).filter((t) => t.type === 'EXPENSE' && t.category === 'Ofertas');
    expect(refunds.map((t) => t.amount)).toEqual([10]);
    expect(refunds[0].reversalOfId).toBe(gift.financialTransactionId);
    expect(ctx.prisma.tables.titheGuestGift[0]).toMatchObject({ status: 'CONFIRMED', refundedAmount: 10, providerStatus: 'partially_refunded' });

    mockCharge(ctx, { id: 'pay_g', value: 50, status: 'REFUNDED' });
    await ctx.tithe.handleWebhook('ASAAS', 'p1', webhook('PAYMENT_REFUNDED', 'evt_g3', { id: 'pay_g' }));
    expect(lines(ctx).filter((t) => t.type === 'EXPENSE' && t.category === 'Ofertas').map((t) => t.amount)).toEqual([10, 40]);
    expect(ctx.prisma.tables.titheGuestGift[0]).toMatchObject({ status: 'CANCELLED', refundedAmount: 50 });
  });
});

describe('Modo agente — desfazer (B33)', () => {
  it('registra, desfaz uma vez e respeita quem pode desfazer', async () => {
    const ctx = setup();
    const agentUser = { id: 'u-agente', role: UserRole.COMMUNITY_COORDINATOR, parishId: 'p1', communityId: 'c1' } as any;
    const out = await ctx.agent.register(agentUser, { memberId: 'm1', amount: 40, method: 'CASH' });
    expect(out.status).toBe('CONFIRMED');
    expect(lines(ctx).filter((t) => t.type === 'INCOME').map((t) => t.amount)).toEqual([40]);
    expect(ctx.prisma.tables.titheContribution).toHaveLength(1);
    // Outro coordenador (não registrou, não é admin): proibido
    await expect(ctx.agent.undo({ ...agentUser, id: 'u-outro' }, out.id)).rejects.toBeInstanceOf(ForbiddenException);
    await ctx.agent.undo(agentUser, out.id);
    await expect(ctx.agent.undo(agentUser, out.id)).rejects.toBeInstanceOf(BadRequestException);
    expect(lines(ctx).filter((t) => t.type === 'EXPENSE').map((t) => t.amount)).toEqual([40]);
    expect(ctx.prisma.tables.titheContribution).toHaveLength(0);
    expect(ctx.prisma.tables.titheIntent[0].status).toBe('CANCELLED');
  });
});
