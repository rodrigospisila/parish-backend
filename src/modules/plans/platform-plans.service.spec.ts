import { BadRequestException, NotFoundException } from '@nestjs/common';
import { planTransition, CurrentPlan, TierInfo } from './plan-transitions';
import { PlatformPlansService } from './platform-plans.service';
import { PlanAccessService } from './plan-access.service';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-09-24T12:00:00.000Z');
const at = (days: number) => new Date(now.getTime() + days * DAY);

const capela: TierInfo = { id: 'tier_capela', key: 'capela', isActive: true, monthlyPriceCents: 4900, yearlyPriceCents: 49000 };
const inativa: TierInfo = { ...capela, id: 'tier_x', key: 'velha', isActive: false };

const plan = (over: Partial<CurrentPlan> = {}): CurrentPlan => ({
  status: 'FREE',
  tierId: null,
  tier: null,
  billingCycle: null,
  priceCents: null,
  trialEndsAt: null,
  currentPeriodEnd: null,
  ...over,
});

describe('planTransition — ações do PATCH /platform/plans/:communityId', () => {
  it('START_TRIAL sem registro: FREE → TRIAL por 30 dias', () => {
    const r = planTransition(null, { action: 'START_TRIAL' }, null, now);
    expect(r.fromStatus).toBe('FREE');
    expect(r.toStatus).toBe('TRIAL');
    expect(r.data.trialEndsAt).toEqual(at(30));
    expect(r.data.suspendedAt).toBeNull();
  });

  it('START_TRIAL com until e faixa', () => {
    const r = planTransition(plan({ status: 'CANCELED' }), { action: 'START_TRIAL', until: at(45).toISOString() }, capela, now);
    expect(r.data.trialEndsAt).toEqual(at(45));
    expect(r.data.tierId).toBe('tier_capela');
  });

  it('START_TRIAL recusado em plano pago (ACTIVE/PAST_DUE)', () => {
    expect(() => planTransition(plan({ status: 'ACTIVE' }), { action: 'START_TRIAL' }, null, now)).toThrow(BadRequestException);
    expect(() => planTransition(plan({ status: 'PAST_DUE' }), { action: 'START_TRIAL' }, null, now)).toThrow(BadRequestException);
  });

  it('until no passado ou inválido → 400', () => {
    expect(() => planTransition(null, { action: 'START_TRIAL', until: at(-1).toISOString() }, null, now)).toThrow(BadRequestException);
    expect(() => planTransition(null, { action: 'START_TRIAL', until: 'amanhã' }, null, now)).toThrow(BadRequestException);
  });

  it('ACTIVATE exige faixa (ativa) e ciclo; preço e período padrão', () => {
    expect(() => planTransition(null, { action: 'ACTIVATE', billingCycle: 'MONTHLY' }, null, now)).toThrow(BadRequestException);
    expect(() => planTransition(null, { action: 'ACTIVATE' }, capela, now)).toThrow(BadRequestException);
    expect(() => planTransition(null, { action: 'ACTIVATE', billingCycle: 'MONTHLY' }, inativa, now)).toThrow(BadRequestException);

    const mensal = planTransition(plan({ status: 'TRIAL' }), { action: 'ACTIVATE', billingCycle: 'MONTHLY' }, capela, now);
    expect(mensal.fromStatus).toBe('TRIAL');
    expect(mensal.toStatus).toBe('ACTIVE');
    expect(mensal.data).toMatchObject({ tierId: 'tier_capela', billingCycle: 'MONTHLY', priceCents: 4900 });
    expect(mensal.data.currentPeriodEnd!.toISOString()).toBe('2026-10-24T12:00:00.000Z');

    const anual = planTransition(null, { action: 'ACTIVATE', billingCycle: 'YEARLY', priceCents: 40000 }, capela, now);
    expect(anual.data.priceCents).toBe(40000);
    expect(anual.data.currentPeriodEnd!.toISOString()).toBe('2027-09-24T12:00:00.000Z');
  });

  it('SUSPEND só de TRIAL/ACTIVE/PAST_DUE; marca suspendedAt', () => {
    const r = planTransition(plan({ status: 'ACTIVE' }), { action: 'SUSPEND' }, null, now);
    expect(r.toStatus).toBe('SUSPENDED');
    expect(r.data.suspendedAt).toEqual(now);
    expect(() => planTransition(null, { action: 'SUSPEND' }, null, now)).toThrow(BadRequestException);
    expect(() => planTransition(plan({ status: 'CANCELED' }), { action: 'SUSPEND' }, null, now)).toThrow(BadRequestException);
  });

  it('REACTIVATE volta a ACTIVE mantendo faixa, ciclo, preço e período vigente', () => {
    const current = plan({
      status: 'SUSPENDED',
      tierId: capela.id,
      tier: capela,
      billingCycle: 'MONTHLY',
      priceCents: 3900,
      currentPeriodEnd: at(10),
    });
    const r = planTransition(current, { action: 'REACTIVATE' }, null, now);
    expect(r.toStatus).toBe('ACTIVE');
    expect(r.data).toMatchObject({ tierId: capela.id, billingCycle: 'MONTHLY', priceCents: 3900, suspendedAt: null });
    expect(r.data.currentPeriodEnd).toEqual(at(10));

    // Período vencido: novo ciclo a partir de agora
    const vencido = planTransition({ ...current, currentPeriodEnd: at(-5) }, { action: 'REACTIVATE' }, null, now);
    expect(vencido.data.currentPeriodEnd!.toISOString()).toBe('2026-10-24T12:00:00.000Z');
  });

  it('REACTIVATE sem faixa/ciclo (ex.: teste suspenso) → 400; não se aplica a ACTIVE', () => {
    expect(() => planTransition(plan({ status: 'SUSPENDED' }), { action: 'REACTIVATE' }, null, now)).toThrow(BadRequestException);
    expect(() => planTransition(plan({ status: 'ACTIVE', tier: capela, billingCycle: 'MONTHLY' }), { action: 'REACTIVATE' }, null, now)).toThrow(
      BadRequestException,
    );
  });

  it('CANCEL e SET_FREE', () => {
    expect(planTransition(plan({ status: 'TRIAL' }), { action: 'CANCEL' }, null, now).toStatus).toBe('CANCELED');
    expect(() => planTransition(null, { action: 'CANCEL' }, null, now)).toThrow(BadRequestException);
    expect(planTransition(plan({ status: 'CANCELED' }), { action: 'SET_FREE' }, null, now).toStatus).toBe('FREE');
    expect(() => planTransition(null, { action: 'SET_FREE' }, null, now)).toThrow(BadRequestException);
  });

  it('EXTEND: teste ganha +30 dias a partir do fim (ou de agora, se já venceu)', () => {
    const vigente = planTransition(plan({ status: 'TRIAL', trialEndsAt: at(5) }), { action: 'EXTEND' }, null, now);
    expect(vigente.toStatus).toBe('TRIAL');
    expect(vigente.data.trialEndsAt).toEqual(at(35));
    const vencido = planTransition(plan({ status: 'TRIAL', trialEndsAt: at(-5) }), { action: 'EXTEND' }, null, now);
    expect(vencido.data.trialEndsAt).toEqual(at(30));
    const ate = planTransition(plan({ status: 'TRIAL', trialEndsAt: at(5) }), { action: 'EXTEND', until: at(90).toISOString() }, null, now);
    expect(ate.data.trialEndsAt).toEqual(at(90));
  });

  it('EXTEND: plano pago ganha um ciclo; status não muda', () => {
    const r = planTransition(
      plan({ status: 'PAST_DUE', billingCycle: 'YEARLY', currentPeriodEnd: new Date('2026-09-01T00:00:00Z') }),
      { action: 'EXTEND' },
      null,
      now,
    );
    expect(r.toStatus).toBe('PAST_DUE');
    expect(r.data.currentPeriodEnd!.toISOString()).toBe('2027-09-24T12:00:00.000Z');
    expect(() => planTransition(plan({ status: 'SUSPENDED' }), { action: 'EXTEND' }, null, now)).toThrow(BadRequestException);
  });
});

describe('PlatformPlansService.update — grava plano + evento', () => {
  let prisma: any;
  let access: { invalidate: jest.Mock };
  let service: PlatformPlansService;

  beforeEach(() => {
    prisma = {
      community: { findUnique: jest.fn().mockResolvedValue({ id: 'com1' }) },
      communityPlan: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn(async ({ create }) => ({
          status: create.status,
          billingCycle: create.billingCycle ?? null,
          priceCents: create.priceCents ?? null,
          trialEndsAt: create.trialEndsAt ?? null,
          currentPeriodEnd: create.currentPeriodEnd ?? null,
          graceDays: 15,
          suspendedAt: null,
          notes: null,
          updatedAt: new Date(),
          tier: create.tierId ? { key: 'capela', name: 'Capela', monthlyPriceCents: 4900, yearlyPriceCents: 49000 } : null,
        })),
      },
      communityPlanEvent: { create: jest.fn().mockResolvedValue({ id: 'ev1' }) },
      planTier: { findUnique: jest.fn(async ({ where }) => (where.key === 'capela' ? capela : null)) },
    };
    prisma.$transaction = jest.fn((fn: any) => fn(prisma));
    access = { invalidate: jest.fn() };
    service = new PlatformPlansService(prisma, access as unknown as PlanAccessService);
  });

  it('cria o CommunityPlan que não existia, registra START_TRIAL (from FREE → TRIAL) e limpa o cache', async () => {
    const result = await service.update('com1', { action: 'START_TRIAL', note: '  piloto  ' }, 'admin1');

    expect(prisma.communityPlan.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { communityId: 'com1' }, create: expect.objectContaining({ communityId: 'com1', status: 'TRIAL' }) }),
    );
    const event = prisma.communityPlanEvent.create.mock.calls[0][0].data;
    expect(event).toMatchObject({
      communityId: 'com1',
      action: 'START_TRIAL',
      fromStatus: 'FREE',
      toStatus: 'TRIAL',
      byUserId: 'admin1',
      note: 'piloto',
    });
    expect(event.data.created).toBe(true);
    expect(access.invalidate).toHaveBeenCalledWith('com1');
    expect(result.plan?.status).toBe('TRIAL');
    expect(result.paidAccess).toBe(true);
  });

  it('ACTIVATE com faixa: preço padrão da faixa no evento', async () => {
    prisma.communityPlan.findUnique.mockResolvedValue({ ...plan({ status: 'TRIAL', trialEndsAt: at(3) }), tier: null });
    const result = await service.update('com1', { action: 'ACTIVATE', tierKey: 'capela', billingCycle: 'MONTHLY' }, 'admin1');
    const event = prisma.communityPlanEvent.create.mock.calls[0][0].data;
    expect(event).toMatchObject({ action: 'ACTIVATE', fromStatus: 'TRIAL', toStatus: 'ACTIVE' });
    expect(event.data).toMatchObject({ created: false, tierKey: 'capela', billingCycle: 'MONTHLY', priceCents: 4900 });
    expect(result.plan?.effectivePriceCents).toBe(4900);
  });

  it('faixa desconhecida → 400; comunidade inexistente → 404; nada gravado', async () => {
    await expect(service.update('com1', { action: 'ACTIVATE', tierKey: 'ouro', billingCycle: 'MONTHLY' }, 'a')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    prisma.community.findUnique.mockResolvedValue(null);
    await expect(service.update('nada', { action: 'START_TRIAL' }, 'a')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.communityPlan.upsert).not.toHaveBeenCalled();
    expect(prisma.communityPlanEvent.create).not.toHaveBeenCalled();
  });

  it('transição inválida não grava evento', async () => {
    await expect(service.update('com1', { action: 'SUSPEND' }, 'a')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.communityPlanEvent.create).not.toHaveBeenCalled();
    expect(access.invalidate).not.toHaveBeenCalled();
  });
});
