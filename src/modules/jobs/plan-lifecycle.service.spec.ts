import { SCHEDULE_CRON_OPTIONS } from '@nestjs/schedule/dist/schedule.constants';
import { PlanLifecycleService } from './plan-lifecycle.service';
import { LifecyclePlan, dueNotice, noticeMessage, pilotParishWhere } from './plan-lifecycle-rules';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-10-20T12:00:00.000Z'); // 09:00 em Brasília
const at = (days: number) => new Date(now.getTime() + days * DAY);

const trial = (endsInDays: number, over: Partial<LifecyclePlan> = {}): LifecyclePlan => ({
  communityId: 'c1',
  status: 'TRIAL',
  trialEndsAt: at(endsInDays),
  currentPeriodEnd: null,
  graceDays: 15,
  ...over,
});
const paid = (endedDaysAgo: number, over: Partial<LifecyclePlan> = {}): LifecyclePlan => ({
  communityId: 'c1',
  status: 'PAST_DUE',
  trialEndsAt: null,
  currentPeriodEnd: at(-endedDaysAgo),
  graceDays: 15,
  ...over,
});

describe('dueNotice — régua de teste/cobrança', () => {
  it('teste: D7, D3, D1 e terminado (só na primeira semana)', () => {
    expect(dueNotice(trial(10), now)).toBeNull();
    expect(dueNotice(trial(7), now)?.kind).toBe('TRIAL_D7');
    expect(dueNotice(trial(5), now)?.kind).toBe('TRIAL_D7');
    expect(dueNotice(trial(3), now)?.kind).toBe('TRIAL_D3');
    expect(dueNotice(trial(0.5), now)?.kind).toBe('TRIAL_D1');
    expect(dueNotice(trial(-1), now)?.kind).toBe('TRIAL_ENDED');
    expect(dueNotice(trial(-8), now)).toBeNull();
    // refKey leva a data: teste estendido recomeça a régua
    expect(dueNotice(trial(7), now)?.refKey).toBe('c1:2026-10-27');
  });

  it('teste de quem já contratou: sem aviso de fim de teste', () => {
    expect(dueNotice(trial(3, { billingStatus: 'PENDING' }), now)).toBeNull();
    expect(dueNotice(trial(-1, { billingStatus: 'ACTIVE' }), now)).toBeNull();
  });

  it('S9: TRIAL_ENDED nunca vai a quem contratou ou pagou (boleto compensando = PENDING)', () => {
    // Contratou no teste, pagou o boleto no vencimento; a compensação ainda não chegou
    expect(dueNotice(trial(-1, { billingStatus: 'PENDING' }), now)).toBeNull();
    expect(dueNotice(trial(-3, { billingStatus: 'PENDING' }), now)).toBeNull();
    // Pago (webhook já chegou) ou cobrança vencida (o provedor cobra): nada de "contrate"
    expect(dueNotice(trial(-1, { billingStatus: 'ACTIVE' }), now)).toBeNull();
    expect(dueNotice(trial(-1, { billingStatus: 'PAST_DUE' }), now)).toBeNull();
    // Sem contratação (sem conta, conta sem assinatura ou cancelada): régua normal
    expect(dueNotice(trial(-1), now)?.kind).toBe('TRIAL_ENDED');
    expect(dueNotice(trial(-1, { billingStatus: null }), now)?.kind).toBe('TRIAL_ENDED');
    expect(dueNotice(trial(-1, { billingStatus: 'NONE' }), now)?.kind).toBe('TRIAL_ENDED');
    expect(dueNotice(trial(-1, { billingStatus: 'CANCELED' }), now)?.kind).toBe('TRIAL_ENDED');
    expect(dueNotice(trial(3, { billingStatus: 'NONE' }), now)?.kind).toBe('TRIAL_D3');
  });

  it('atraso: D1, D7, carência acabando (D-3) e suspensão', () => {
    expect(dueNotice(paid(-2, { status: 'ACTIVE' }), now)).toBeNull(); // em dia
    expect(dueNotice(paid(0.5), now)).toBeNull();
    expect(dueNotice(paid(1), now)?.kind).toBe('PAST_DUE_D1');
    expect(dueNotice(paid(7), now)?.kind).toBe('PAST_DUE_D7');
    expect(dueNotice(paid(12), now)?.kind).toBe('GRACE_D3');
    const suspended = dueNotice(paid(16), now)!;
    expect(suspended.kind).toBe('SUSPENDED');
    expect(suspended.date).toEqual(at(-1));
    expect(dueNotice(paid(30), now)).toBeNull();
  });

  it('piloto (ACTIVE sem prazo) nunca recebe aviso', () => {
    expect(dueNotice({ communityId: 'c1', status: 'ACTIVE', trialEndsAt: null, currentPeriodEnd: null, graceDays: 15 }, now)).toBeNull();
  });

  it('textos em português deixam claro que nada é apagado', () => {
    const msg = noticeMessage('SUSPENDED', {
      parishName: 'Paróquia Santo Antônio',
      communities: [{ name: 'Matriz', date: at(-1) }],
      planUrl: 'https://parish-web-three.vercel.app/admin/meu-plano',
    });
    expect(msg.subject).toBe('Parish: recursos pagos suspensos');
    expect(msg.text).toContain('Nenhum dado é apagado');
    expect(msg.text).toContain('https://parish-web-three.vercel.app/admin/meu-plano');
    expect(msg.text).toContain('- Matriz (19/10/2026)');
    const d1 = noticeMessage('TRIAL_D1', { parishName: 'P', communities: [{ name: 'A', date: at(1) }, { name: 'B', date: at(1) }], planUrl: 'u' });
    expect(d1.subject).toBe('Parish: o teste termina amanhã');
    expect(d1.text).toContain('nas comunidades');
  });

  it('plano grátis enxuto: os avisos dizem o que continua grátis (membros, horários, mapa, liturgia)', () => {
    const ended = noticeMessage('TRIAL_ENDED', { parishName: 'P', communities: [{ name: 'A', date: at(-1) }], planUrl: 'u' });
    expect(ended.text).toContain('O cadastro de membros, os horários de missa e de confissão, o mapa e a liturgia continuam grátis.');
    expect(ended.text).toContain('eventos');
    expect(ended.text).toContain('dízimo');
    // Eventos e calendário deixaram de ser grátis
    expect(ended.text).not.toContain('Calendário, eventos');
  });
});

describe('PlanLifecycleService', () => {
  function setup(opts: { plans?: any[]; communities?: any[]; admins?: any[]; claimed?: Set<string>; expiring?: any[] } = {}) {
    const claimed = opts.claimed ?? new Set<string>();
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ locked: true }]),
      communityPlan: { create: jest.fn().mockResolvedValue({}), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      communityPlanEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma: any = {
      community: { findMany: jest.fn().mockResolvedValue(opts.communities ?? []) },
      communityPlan: {
        // Régua (OR de status/datas com `community.deletedAt`) × testes vencidos (status TRIAL)
        findMany: jest.fn(async ({ where }: any) => (where.status === 'TRIAL' ? (opts.expiring ?? []) : (opts.plans ?? []))),
      },
      user: { findMany: jest.fn().mockResolvedValue(opts.admins ?? [{ id: 'a1', email: 'Padre@Paroquia.org' }]) },
      planNotice: {
        create: jest.fn(({ data }: any) => {
          const key = `${data.kind}|${data.refKey}`;
          if (claimed.has(key)) return Promise.reject(Object.assign(new Error('dup'), { code: 'P2002' }));
          claimed.add(key);
          return Promise.resolve({});
        }),
        findFirst: jest.fn(async ({ where }: any) => (claimed.has(`${where.kind}|${where.refKey}`) ? { id: 'n1' } : null)),
      },
      // runExclusiveJob pode registrar a execução (JobRun) — C6
      jobRun: { create: jest.fn().mockResolvedValue({ id: 'run1' }), update: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn((fn: (client: unknown) => Promise<unknown>) => fn(tx)),
    };
    const config: any = { get: (key: string) => ({ PUBLIC_WEB_URL: 'https://painel.exemplo/', SUPPORT_EMAIL: 'suporte@exemplo' } as any)[key] };
    const access: any = { invalidate: jest.fn() };
    const email: any = { trySend: jest.fn().mockResolvedValue(false) };
    const notifications: any = { notifyUsers: jest.fn().mockResolvedValue(undefined) };
    const service = new PlanLifecycleService(prisma, config, access, email, notifications);
    return { service, prisma, tx, email, notifications, access, claimed };
  }

  const planRow = (communityId: string, name: string, trialEndsInDays: number, parishId = 'p1') => ({
    communityId,
    status: 'TRIAL',
    trialEndsAt: at(trialEndsInDays),
    currentPeriodEnd: null,
    graceDays: 15,
    billingAccount: { status: 'NONE', email: 'fin@paroquia.org' },
    community: { name, parishId, parish: { name: 'Paróquia Santo Antônio' } },
  });

  it('agenda diária às 09:00 de Brasília, com trava própria', async () => {
    const options = Reflect.getMetadata(SCHEDULE_CRON_OPTIONS, PlanLifecycleService.prototype.run as object);
    expect(options).toEqual(expect.objectContaining({ cronTime: '0 9 * * *', timeZone: 'America/Sao_Paulo', name: 'plan-lifecycle' }));
    const ctx = setup();
    await ctx.service.run();
    expect(ctx.tx.$queryRaw.mock.calls[0][1]).toBe('parish:job:plan-lifecycle');
  });

  const expiringRow = (communityId: string, endedDaysAgo: number | null, over: Record<string, unknown> = {}) => ({
    id: `plan-${communityId}`,
    communityId,
    status: 'TRIAL',
    tierId: null,
    billingCycle: null,
    priceCents: null,
    trialEndsAt: endedDaysAgo === null ? null : at(-endedDaysAgo),
    currentPeriodEnd: null,
    graceDays: 15,
    billingAccount: null,
    ...over,
  });

  it('lançamento: o job NÃO inicia mais teste automático (sem startAutoTrials, nada criado)', async () => {
    const ctx = setup({ communities: [{ id: 'c1' }, { id: 'c2' }] });
    expect((ctx.service as any).startAutoTrials).toBeUndefined();
    expect(await ctx.service.execute(now)).toEqual({ notices: 0, messages: 0, expiredTrials: 0 });
    expect(ctx.prisma.community.findMany).not.toHaveBeenCalled();
    expect(ctx.tx.communityPlan.create).not.toHaveBeenCalled();
    expect(ctx.tx.communityPlanEvent.create).not.toHaveBeenCalled();
  });

  it('teste vencido → FREE (evento TRIAL_EXPIRED) DEPOIS do aviso TRIAL_ENDED, na mesma execução', async () => {
    const ended = { ...planRow('c1', 'Matriz', -1), id: 'plan-c1', tierId: null, billingCycle: null, priceCents: null };
    const ctx = setup({ plans: [ended], expiring: [{ ...expiringRow('c1', 1), billingAccount: { status: 'NONE' } }] });
    const result = await ctx.service.execute(now);
    expect(result).toEqual({ notices: 1, messages: 1, expiredTrials: 1 });
    // Ordem: o aviso é registrado antes de o plano mudar de status
    const noticeOrder = ctx.prisma.planNotice.create.mock.invocationCallOrder[0];
    const updateOrder = ctx.tx.communityPlan.updateMany.mock.invocationCallOrder[0];
    expect(noticeOrder).toBeLessThan(updateOrder);
    expect(ctx.prisma.planNotice.create.mock.calls[0][0].data.kind).toBe('TRIAL_ENDED');
    expect(ctx.email.trySend).toHaveBeenCalledWith('padre@paroquia.org', 'Parish: o teste terminou', expect.any(String));

    const update = ctx.tx.communityPlan.updateMany.mock.calls[0][0];
    // CAS: só se ainda for TRIAL vencido (prorrogado/contratado no meio-tempo fica)
    expect(update.where).toMatchObject({ id: 'plan-c1', status: 'TRIAL' });
    expect(update.data).toEqual({ status: 'FREE', suspendedAt: null });
    expect(ctx.tx.communityPlanEvent.create.mock.calls[0][0].data).toMatchObject({
      communityId: 'c1',
      action: 'TRIAL_EXPIRED',
      fromStatus: 'TRIAL',
      toStatus: 'FREE',
      byUserId: null,
    });
    expect(ctx.access.invalidate).toHaveBeenCalledWith('c1');
  });

  it('teste vencido: busca só TRIAL com trialEndsAt <= agora (ou sem data), fora do piloto', async () => {
    const ctx = setup();
    expect(await ctx.service.expireTrials(now)).toBe(0);
    const where = ctx.prisma.communityPlan.findMany.mock.calls[0][0].where;
    expect(where.status).toBe('TRIAL');
    expect(where.OR).toEqual([{ trialEndsAt: { lte: now } }, { trialEndsAt: null }]);
    expect(where.community).toEqual({ parish: { NOT: pilotParishWhere() } });
  });

  it('não quebra a régua: enquanto o aviso TRIAL_ENDED não saiu (ninguém para avisar), o teste vencido espera', async () => {
    const ctx = setup({ expiring: [expiringRow('c1', 1)] });
    expect(await ctx.service.expireTrials(now)).toBe(0);
    expect(ctx.tx.communityPlan.updateMany).not.toHaveBeenCalled();
    // Aviso já registrado (execução anterior) → expira
    const refKey = `c1:${at(-1).toISOString().slice(0, 10)}`;
    const sent = setup({ expiring: [expiringRow('c1', 1)], claimed: new Set([`TRIAL_ENDED|${refKey}`]) });
    expect(await sent.service.expireTrials(now)).toBe(1);
  });

  it('sem aviso a receber (já contratou, venceu há mais de uma semana ou sem data) → expira direto', async () => {
    const ctx = setup({
      expiring: [
        expiringRow('c1', 1, { billingAccount: { status: 'PENDING' } }),
        expiringRow('c2', 30),
        expiringRow('c3', null),
      ],
    });
    expect(await ctx.service.expireTrials(now)).toBe(3);
    expect(ctx.prisma.planNotice.findFirst).not.toHaveBeenCalled();
    expect(ctx.tx.communityPlanEvent.create).toHaveBeenCalledTimes(3);
  });

  it('teste prorrogado/contratado durante a execução (CAS não casa): sem evento, sem contar', async () => {
    const ctx = setup({ expiring: [expiringRow('c1', 30)] });
    ctx.tx.communityPlan.updateMany.mockResolvedValueOnce({ count: 0 });
    expect(await ctx.service.expireTrials(now)).toBe(0);
    expect(ctx.tx.communityPlanEvent.create).not.toHaveBeenCalled();
    expect(ctx.access.invalidate).not.toHaveBeenCalled();
  });

  it('régua: uma mensagem por paróquia e tipo, e-mail + in-app; na segunda execução não repete', async () => {
    const plans = [planRow('c1', 'Matriz', 3), planRow('c2', 'Capela', 3), planRow('c3', 'Outra', 7, 'p2')];
    const ctx = setup({ plans });
    const first = await ctx.service.sendNotices(now);
    expect(first).toEqual({ notices: 3, messages: 2 });
    // p1: e-mail do admin (minúsculo) e de cobrança; p2 idem
    expect(ctx.email.trySend).toHaveBeenCalledWith('padre@paroquia.org', 'Parish: o teste termina em 3 dias', expect.stringContaining('- Capela'));
    expect(ctx.email.trySend).toHaveBeenCalledWith('fin@paroquia.org', expect.any(String), expect.stringContaining('https://painel.exemplo/admin/meu-plano'));
    expect(ctx.email.trySend.mock.calls[0][2]).toContain('suporte@exemplo');
    expect(ctx.notifications.notifyUsers).toHaveBeenCalledWith(
      ['a1'],
      'URGENT_NOTICE',
      'o teste termina em 3 dias',
      expect.stringContaining('Capela, Matriz'),
      expect.objectContaining({ kind: 'PLAN_NOTICE', notice: 'TRIAL_D3', url: '/admin/meu-plano' }),
      // S2: o e-mail já saiu acima — a notificação não manda outro (nem SMS)
      { skipFallback: true },
    );
    // Um e-mail por endereço e por aviso: admin + cobrança de p1, admin + cobrança de p2
    const p1Admin = ctx.email.trySend.mock.calls.filter((c: any[]) => c[0] === 'padre@paroquia.org' && c[1].includes('3 dias'));
    expect(p1Admin).toHaveLength(1);

    ctx.email.trySend.mockClear();
    ctx.notifications.notifyUsers.mockClear();
    const second = await ctx.service.sendNotices(now);
    expect(second).toEqual({ notices: 0, messages: 0 });
    expect(ctx.email.trySend).not.toHaveBeenCalled();
    expect(ctx.notifications.notifyUsers).not.toHaveBeenCalled();
  });

  it('sem ninguém para avisar: não marca o aviso (fica para quem assumir)', async () => {
    const row = { ...planRow('c1', 'Matriz', 3), billingAccount: null };
    const ctx = setup({ plans: [row], admins: [] });
    expect(await ctx.service.sendNotices(now)).toEqual({ notices: 0, messages: 0 });
    expect(ctx.prisma.planNotice.create).not.toHaveBeenCalled();
  });

  it('S11: critério explícito de paróquia piloto (nota de piloto em ACTIVE sem prazo, ou evento PILOT_FULL_ACCESS)', () => {
    expect(pilotParishWhere()).toEqual({
      communities: {
        some: {
          OR: [
            {
              communityPlan: {
                is: { status: 'ACTIVE', currentPeriodEnd: null, notes: { contains: 'piloto', mode: 'insensitive' } },
              },
            },
            { communityPlanEvents: { some: { action: 'PILOT_FULL_ACCESS' } } },
          ],
        },
      },
    });
  });

  it('S11: a régua não busca planos de paróquia piloto', async () => {
    const ctx = setup();
    await ctx.service.sendNotices(now);
    const where = ctx.prisma.communityPlan.findMany.mock.calls[0][0].where;
    expect(where.community).toEqual({ deletedAt: null, parish: { NOT: pilotParishWhere() } });
  });

  it('a busca da régua não inclui o piloto (ACTIVE sem currentPeriodEnd)', async () => {
    const ctx = setup();
    await ctx.service.sendNotices(now);
    const where = ctx.prisma.communityPlan.findMany.mock.calls[0][0].where;
    const paidBranch = where.OR[1];
    expect(paidBranch.currentPeriodEnd.not).toBeNull();
  });
});
