import { ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { MemberLimitGuard } from './member-limit.guard';
import { PlanAccessService } from './plan-access.service';

const DAY = 24 * 60 * 60 * 1000;

describe('MemberLimitGuard — limite de membros da faixa (B32)', () => {
  let mode: string;
  let plans: Record<string, any>;
  let members: Record<string, number>;
  let prisma: any;
  let guard: MemberLimitGuard;
  let hierarchy: { isCommunityInScope: jest.Mock };
  let warn: jest.SpyInstance;

  const ctx = (req: any) => ({ switchToHttp: () => ({ getRequest: () => req }) }) as unknown as ExecutionContext;
  const coord = { id: 'u1', role: 'COMMUNITY_COORDINATOR', communityId: 'capela' };

  beforeEach(() => {
    mode = 'on';
    plans = {
      capela: { status: 'ACTIVE', trialEndsAt: null, currentPeriodEnd: new Date(Date.now() + 10 * DAY), graceDays: 15, tier: { key: 'capela', maxMembers: 300 } },
      matriz: { status: 'ACTIVE', trialEndsAt: null, currentPeriodEnd: null, graceDays: 15, tier: { key: 'matriz', maxMembers: null } },
      suspensa: { status: 'SUSPENDED', trialEndsAt: null, currentPeriodEnd: null, graceDays: 15, tier: { key: 'capela', maxMembers: 300 } },
    };
    members = { capela: 300, matriz: 5000, suspensa: 900 };
    prisma = {
      communityPlan: { findUnique: jest.fn(async ({ where }) => plans[where.communityId] ?? null) },
      member: { count: jest.fn(async ({ where }) => members[where.OR[0].communityId] ?? 0) },
    };
    const access = new PlanAccessService(prisma, { get: jest.fn(() => mode) } as any);
    // Escopo do coordenador: as comunidades do teste (a de outra paróquia, não)
    hierarchy = { isCommunityInScope: jest.fn(async (_user: any, id: string) => id !== 'outra-paroquia') };
    guard = new MemberLimitGuard(access, hierarchy as any);
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => warn.mockRestore());

  it('on: faixa capela (300) já com 300 membros ativos → 403 PLAN_MEMBER_LIMIT', async () => {
    try {
      await guard.canActivate(ctx({ body: { communityId: 'capela' }, user: coord }));
      throw new Error('esperava 403');
    } catch (error: any) {
      expect(error).toBeInstanceOf(ForbiddenException);
      expect(error.getResponse()).toMatchObject({ code: 'PLAN_MEMBER_LIMIT', communityId: 'capela', maxMembers: 300, activeMembers: 300 });
    }
    // Conta membros ativos (principal ou vínculo ativo), sem os apagados
    const where = prisma.member.count.mock.calls[0][0].where;
    expect(where).toMatchObject({ deletedAt: null, status: 'ACTIVE' });
  });

  it('on: abaixo do limite, faixa sem limite ou plano suspenso/sem plano → cria', async () => {
    members.capela = 299;
    await expect(guard.canActivate(ctx({ body: { communityId: 'capela' }, user: coord }))).resolves.toBe(true);
    await expect(guard.canActivate(ctx({ body: { communityId: 'matriz' }, user: coord }))).resolves.toBe(true);
    await expect(guard.canActivate(ctx({ body: { communityId: 'suspensa' }, user: coord }))).resolves.toBe(true);
    await expect(guard.canActivate(ctx({ body: { communityId: 'sem-plano' }, user: coord }))).resolves.toBe(true);
  });

  it('log (padrão): passou da faixa → cria e registra uma vez', async () => {
    mode = 'log';
    const req = { body: { communityId: 'capela' }, user: coord };
    await expect(guard.canActivate(ctx(req))).resolves.toBe(true);
    await expect(guard.canActivate(ctx(req))).resolves.toBe(true);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('limite=300');
  });

  it('off e SYSTEM_ADMIN: não consulta nada', async () => {
    mode = 'off';
    await expect(guard.canActivate(ctx({ body: { communityId: 'capela' }, user: coord }))).resolves.toBe(true);
    mode = 'on';
    await expect(guard.canActivate(ctx({ body: { communityId: 'capela' }, user: { id: 'a', role: 'SYSTEM_ADMIN' } }))).resolves.toBe(true);
    expect(prisma.communityPlan.findUnique).not.toHaveBeenCalled();
  });

  it('#33 — comunidade FORA do escopo: libera sem consultar plano nem contar membros (o serviço dá o 403 de escopo)', async () => {
    plans['outra-paroquia'] = plans.capela;
    members['outra-paroquia'] = 5000;
    await expect(guard.canActivate(ctx({ body: { communityId: 'outra-paroquia' }, user: coord }))).resolves.toBe(true);
    expect(hierarchy.isCommunityInScope).toHaveBeenCalledWith(coord, 'outra-paroquia');
    expect(prisma.communityPlan.findUnique).not.toHaveBeenCalled();
    expect(prisma.member.count).not.toHaveBeenCalled();
  });

  it('falha no banco libera', async () => {
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    prisma.communityPlan.findUnique.mockRejectedValueOnce(new Error('db fora'));
    await expect(guard.canActivate(ctx({ body: { communityId: 'capela' }, user: coord }))).resolves.toBe(true);
    error.mockRestore();
  });
});
