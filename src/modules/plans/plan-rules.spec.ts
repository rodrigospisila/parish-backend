import { addCycle, hasPaidAccess, monthlyEquivalentCents, parseEnforcement, PAID_FEATURES } from './plan-rules';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-09-24T12:00:00.000Z');
const at = (days: number) => new Date(now.getTime() + days * DAY);

describe('plan-rules — hasPaidAccess', () => {
  it('sem plano = FREE = sem acesso', () => {
    expect(hasPaidAccess(null, now)).toBe(false);
    expect(hasPaidAccess(undefined, now)).toBe(false);
    expect(hasPaidAccess({ status: 'FREE' }, now)).toBe(false);
  });

  it('TRIAL só enquanto trialEndsAt > agora', () => {
    expect(hasPaidAccess({ status: 'TRIAL', trialEndsAt: at(1) }, now)).toBe(true);
    expect(hasPaidAccess({ status: 'TRIAL', trialEndsAt: at(-1) }, now)).toBe(false);
    expect(hasPaidAccess({ status: 'TRIAL', trialEndsAt: now }, now)).toBe(false); // vence no instante
    expect(hasPaidAccess({ status: 'TRIAL', trialEndsAt: null }, now)).toBe(false);
    expect(hasPaidAccess({ status: 'TRIAL', trialEndsAt: at(3).toISOString() }, now)).toBe(true); // aceita string
  });

  it('ACTIVE sempre tem acesso', () => {
    expect(hasPaidAccess({ status: 'ACTIVE' }, now)).toBe(true);
    expect(hasPaidAccess({ status: 'ACTIVE', currentPeriodEnd: at(-100) }, now)).toBe(true);
  });

  it('PAST_DUE dentro da carência (currentPeriodEnd + graceDays)', () => {
    expect(hasPaidAccess({ status: 'PAST_DUE', currentPeriodEnd: at(-10), graceDays: 15 }, now)).toBe(true);
    expect(hasPaidAccess({ status: 'PAST_DUE', currentPeriodEnd: at(-16), graceDays: 15 }, now)).toBe(false);
    expect(hasPaidAccess({ status: 'PAST_DUE', currentPeriodEnd: at(-15), graceDays: 15 }, now)).toBe(false); // limite exato
    expect(hasPaidAccess({ status: 'PAST_DUE', currentPeriodEnd: at(-3), graceDays: 0 }, now)).toBe(false);
    expect(hasPaidAccess({ status: 'PAST_DUE', currentPeriodEnd: at(2), graceDays: 0 }, now)).toBe(true);
    // graceDays ausente = padrão 15
    expect(hasPaidAccess({ status: 'PAST_DUE', currentPeriodEnd: at(-14) }, now)).toBe(true);
    expect(hasPaidAccess({ status: 'PAST_DUE', currentPeriodEnd: null, graceDays: 15 }, now)).toBe(false);
  });

  it('SUSPENDED e CANCELED nunca têm acesso (mesmo com datas no futuro)', () => {
    expect(hasPaidAccess({ status: 'SUSPENDED', trialEndsAt: at(10), currentPeriodEnd: at(10) }, now)).toBe(false);
    expect(hasPaidAccess({ status: 'CANCELED', trialEndsAt: at(10), currentPeriodEnd: at(10) }, now)).toBe(false);
  });
});

describe('plan-rules — utilidades', () => {
  it('PLAN_ENFORCEMENT: padrão log; aceita off/on/log sem diferenciar maiúsculas', () => {
    expect(parseEnforcement(undefined)).toBe('log');
    expect(parseEnforcement('')).toBe('log');
    expect(parseEnforcement('xpto')).toBe('log');
    expect(parseEnforcement('ON')).toBe('on');
    expect(parseEnforcement(' off ')).toBe('off');
  });

  it('addCycle soma mês/ano do calendário', () => {
    expect(addCycle(new Date('2026-01-31T00:00:00Z'), 'YEARLY').toISOString()).toBe('2027-01-31T00:00:00.000Z');
    expect(addCycle(new Date('2026-09-24T00:00:00Z'), 'MONTHLY').toISOString()).toBe('2026-10-24T00:00:00.000Z');
  });

  it('MRR: anual dividido por 12', () => {
    expect(monthlyEquivalentCents(99000, 'YEARLY')).toBe(8250);
    expect(monthlyEquivalentCents(9900, 'MONTHLY')).toBe(9900);
    expect(monthlyEquivalentCents(0, 'MONTHLY')).toBe(0);
  });

  it('lista de recursos pagos combinada com o dono', () => {
    expect([...PAID_FEATURES]).toEqual([
      'pastorals',
      'schedules',
      'swaps',
      'catechesis',
      'formation',
      'rooms',
      'visitation',
      'documents',
    ]);
  });
});
