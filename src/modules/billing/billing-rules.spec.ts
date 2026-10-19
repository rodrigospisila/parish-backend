import {
  PricingItem,
  PricingTier,
  firstDueDate,
  isPilotPlan,
  nextPaymentStatus,
  periodEndFromDueDate,
  priceSubscription,
  ymdInBrazil,
} from './billing-rules';
import { documentKind, isValidCnpj, isValidCpf } from './document';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-10-20T15:00:00.000Z');

const capela: PricingTier = { id: 't_capela', key: 'capela', name: 'Capela', isActive: true, monthlyPriceCents: 4900, yearlyPriceCents: 49000 };
const matriz: PricingTier = { id: 't_matriz', key: 'matriz', name: 'Matriz', isActive: true, monthlyPriceCents: 16900, yearlyPriceCents: 169000 };

const plan = (over: Partial<NonNullable<PricingItem['plan']>> = {}): NonNullable<PricingItem['plan']> => ({
  status: 'TRIAL',
  tierId: null,
  billingCycle: null,
  priceCents: null,
  trialEndsAt: null,
  currentPeriodEnd: null,
  ...over,
});

describe('priceSubscription — valor da assinatura', () => {
  it('mensal: soma das faixas de várias comunidades', () => {
    const r = priceSubscription(
      [
        { communityId: 'matriz', tier: matriz, plan: null },
        { communityId: 'cap1', tier: capela, plan: plan() },
        { communityId: 'cap2', tier: capela, plan: plan({ status: 'FREE' }) },
      ],
      'MONTHLY',
    );
    expect(r.valueCents).toBe(16900 + 4900 + 4900);
    expect(r.lines.map((l) => l.priceCents)).toEqual([16900, 4900, 4900]);
    expect(r.skippedCommunityIds).toEqual([]);
  });

  it('anual: usa yearlyPriceCents (10× o mensal na tabela)', () => {
    const r = priceSubscription(
      [
        { communityId: 'matriz', tier: matriz, plan: null },
        { communityId: 'cap1', tier: capela, plan: null },
      ],
      'YEARLY',
    );
    expect(r.valueCents).toBe(169000 + 49000);
  });

  it('piloto (ACTIVE sem prazo) fica fora da cobrança', () => {
    const r = priceSubscription(
      [
        { communityId: 'imbituva', tier: matriz, plan: plan({ status: 'ACTIVE', currentPeriodEnd: null }) },
        { communityId: 'cap1', tier: capela, plan: null },
      ],
      'MONTHLY',
    );
    expect(r.skippedCommunityIds).toEqual(['imbituva']);
    expect(r.lines.map((l) => l.communityId)).toEqual(['cap1']);
    expect(r.valueCents).toBe(4900);
  });

  it('preço combinado (fundador) vale só na mesma faixa e ciclo, e nunca acima da tabela', () => {
    const fundador = plan({ status: 'ACTIVE', tierId: 't_matriz', billingCycle: 'MONTHLY', priceCents: 8450, currentPeriodEnd: new Date(now.getTime() + 5 * DAY) });
    expect(priceSubscription([{ communityId: 'm', tier: matriz, plan: fundador }], 'MONTHLY').lines[0]).toMatchObject({ priceCents: 8450, negotiated: true });
    // ciclo diferente: tabela
    expect(priceSubscription([{ communityId: 'm', tier: matriz, plan: fundador }], 'YEARLY').valueCents).toBe(169000);
    // preço antigo acima da tabela atual: tabela
    const caro = { ...fundador, priceCents: 20000 };
    expect(priceSubscription([{ communityId: 'm', tier: matriz, plan: caro }], 'MONTHLY').lines[0]).toMatchObject({ priceCents: 16900, negotiated: false });
  });

  it('isPilotPlan', () => {
    expect(isPilotPlan(plan({ status: 'ACTIVE' }))).toBe(true);
    expect(isPilotPlan(plan({ status: 'ACTIVE', currentPeriodEnd: now }))).toBe(false);
    expect(isPilotPlan(plan({ status: 'TRIAL' }))).toBe(false);
    expect(isPilotPlan(null)).toBe(false);
  });
});

describe('datas da assinatura', () => {
  it('primeira cobrança: hoje, ou o fim do acesso mais próximo (teste/período pago)', () => {
    expect(firstDueDate([{ plan: null }], now)).toBe('2026-10-20');
    expect(firstDueDate([{ plan: plan({ trialEndsAt: new Date('2026-11-23T12:00:00Z') }) }], now)).toBe('2026-11-23');
    expect(
      firstDueDate(
        [{ plan: plan({ trialEndsAt: new Date('2026-11-23T12:00:00Z') }) }, { plan: plan({ trialEndsAt: new Date('2026-11-01T12:00:00Z') }) }],
        now,
      ),
    ).toBe('2026-11-01');
    // uma sem acesso: cobra hoje
    expect(firstDueDate([{ plan: plan({ trialEndsAt: new Date('2026-11-23T12:00:00Z') }) }, { plan: null }], now)).toBe('2026-10-20');
    // teste vencido: hoje
    expect(firstDueDate([{ plan: plan({ trialEndsAt: new Date('2026-10-01T12:00:00Z') }) }], now)).toBe('2026-10-20');
  });

  it('período pago = vencimento + ciclo, até o fim do dia em Brasília', () => {
    const mensal = periodEndFromDueDate('2026-10-20', 'MONTHLY');
    expect(mensal.toISOString()).toBe('2026-11-21T02:59:59.000Z');
    expect(ymdInBrazil(mensal)).toBe('2026-11-20');
    expect(ymdInBrazil(periodEndFromDueDate('2026-10-20', 'YEARLY'))).toBe('2027-10-20');
  });

  it('cobrança paga não volta para pendente com evento antigo', () => {
    expect(nextPaymentStatus('RECEIVED', 'PENDING')).toBe('RECEIVED');
    expect(nextPaymentStatus('CONFIRMED', 'RECEIVED')).toBe('RECEIVED');
    expect(nextPaymentStatus('RECEIVED', 'REFUNDED')).toBe('REFUNDED');
    expect(nextPaymentStatus(null, 'PENDING')).toBe('PENDING');
  });
});

describe('CPF/CNPJ (dígitos verificadores)', () => {
  it('CPF', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('529.982.247-24')).toBe(false);
    expect(isValidCpf('111.111.111-11')).toBe(false);
    expect(isValidCpf('123')).toBe(false);
  });

  it('CNPJ', () => {
    expect(isValidCnpj('11.222.333/0001-81')).toBe(true);
    expect(isValidCnpj('11.222.333/0001-80')).toBe(false);
    expect(isValidCnpj('00.000.000/0000-00')).toBe(false);
  });

  it('documentKind', () => {
    expect(documentKind('52998224725')).toBe('CPF');
    expect(documentKind('11222333000181')).toBe('CNPJ');
    expect(documentKind('11222333000182')).toBeNull();
    expect(documentKind('')).toBeNull();
  });
});
