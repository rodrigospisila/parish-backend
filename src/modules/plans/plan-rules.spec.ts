import {
  addCycle,
  defaultFeatureLevel,
  FREE_FEATURES,
  graceEndsAt,
  hasPaidAccess,
  isPaidFeature,
  isPeriodOverdue,
  monthlyEquivalentCents,
  parseEnforcement,
  PAID_FEATURES,
  PARISH_LEVEL_FEATURES,
} from './plan-rules';

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

  it('ACTIVE: em dia, ou vencido só até o fim da carência (M38)', () => {
    expect(hasPaidAccess({ status: 'ACTIVE' }, now)).toBe(true); // sem data de renovação
    expect(hasPaidAccess({ status: 'ACTIVE', currentPeriodEnd: at(10) }, now)).toBe(true);
    expect(hasPaidAccess({ status: 'ACTIVE', currentPeriodEnd: at(-10), graceDays: 15 }, now)).toBe(true); // carência
    expect(hasPaidAccess({ status: 'ACTIVE', currentPeriodEnd: at(-15), graceDays: 15 }, now)).toBe(false);
    expect(hasPaidAccess({ status: 'ACTIVE', currentPeriodEnd: at(-100) }, now)).toBe(false);
  });

  it('período vencido e fim da carência', () => {
    expect(isPeriodOverdue({ status: 'ACTIVE', currentPeriodEnd: at(-1) }, now)).toBe(true);
    expect(isPeriodOverdue({ status: 'PAST_DUE', currentPeriodEnd: at(-1) }, now)).toBe(true);
    expect(isPeriodOverdue({ status: 'ACTIVE', currentPeriodEnd: at(1) }, now)).toBe(false);
    expect(isPeriodOverdue({ status: 'ACTIVE', currentPeriodEnd: null }, now)).toBe(false);
    expect(isPeriodOverdue({ status: 'TRIAL', currentPeriodEnd: at(-1) }, now)).toBe(false);
    expect(graceEndsAt({ currentPeriodEnd: at(-1), graceDays: 15 })).toEqual(at(14));
    expect(graceEndsAt({ currentPeriodEnd: at(0) })).toEqual(at(15));
    expect(graceEndsAt({ currentPeriodEnd: null })).toBeNull();
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
      'events',
      'news',
      'prayer-requests',
      'clergy-messages',
      'planning',
      'sacraments',
      'sacrament-processes',
      'finance',
      'tithe',
      'dashboard',
    ]);
  });

  it('plano grátis enxuto (11/11/2026): só membros, horários, mapa, localização, liturgia e santos', () => {
    expect([...FREE_FEATURES]).toEqual(['members', 'mass-schedules', 'masses', 'map', 'location', 'liturgy', 'saints']);
    // Nenhum recurso nas duas listas
    for (const free of FREE_FEATURES) expect(isPaidFeature(free)).toBe(false);
  });

  it('nível: planning e tithe são da paróquia; os demais, da comunidade', () => {
    expect([...PARISH_LEVEL_FEATURES]).toEqual(['planning', 'tithe']);
    expect(defaultFeatureLevel('planning')).toBe('parish');
    expect(defaultFeatureLevel('tithe')).toBe('parish');
    for (const feature of PAID_FEATURES) {
      if (feature !== 'planning' && feature !== 'tithe') expect(defaultFeatureLevel(feature)).toBe('community');
    }
  });
});
