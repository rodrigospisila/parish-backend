import 'reflect-metadata';
import { ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlanFeatureGuard } from './plan-feature.guard';
import { PlanAccessService } from './plan-access.service';
import { PlanResource, RequiresFeature, SkipPlanCheck } from './plan.decorators';

const DAY = 24 * 60 * 60 * 1000;
const future = () => new Date(Date.now() + 10 * DAY);
const past = () => new Date(Date.now() - 10 * DAY);

@RequiresFeature('catechesis')
class CatechesisDummy {
  @PlanResource('catechesisClass')
  byClass() {}
  @PlanResource('catechesisClass:body.classId')
  apply() {}
  plain() {}
  @SkipPlanCheck()
  skipped() {}
}

@RequiresFeature('formation', { level: 'parish' })
class FormationDummy {
  list() {}
}

class FreeDummy {
  open() {}
}

describe('PlanFeatureGuard', () => {
  let mode: string | undefined;
  let plans: Record<string, any>;
  let prisma: any;
  let access: PlanAccessService;
  let guard: PlanFeatureGuard;
  let warn: jest.SpyInstance;

  const ctx = (cls: any, handler: string, req: any): ExecutionContext =>
    ({
      getClass: () => cls,
      getHandler: () => cls.prototype[handler],
      switchToHttp: () => ({ getRequest: () => req }),
    }) as unknown as ExecutionContext;

  const faithful = (over: any = {}) => ({ id: 'u1', role: 'FAITHFUL', communityId: 'free-com', ...over });

  beforeEach(() => {
    mode = 'on';
    plans = {
      'paid-com': { status: 'ACTIVE', trialEndsAt: null, currentPeriodEnd: null, graceDays: 15, tier: { key: 'capela' } },
      'trial-com': { status: 'TRIAL', trialEndsAt: future(), currentPeriodEnd: null, graceDays: 15, tier: null },
      'expired-com': { status: 'TRIAL', trialEndsAt: past(), currentPeriodEnd: null, graceDays: 15, tier: null },
    };
    prisma = {
      communityPlan: {
        findUnique: jest.fn(async ({ where }) => plans[where.communityId] ?? null),
        // Escopo: paróquia P-PAID tem uma comunidade paga; diocese D-FREE não
        findMany: jest.fn(async ({ where }) => {
          const parishId = where.community?.parishId;
          const dioceseId = where.community?.parish?.dioceseId;
          if (parishId === 'P-PAID' || dioceseId === 'D-PAID') return [plans['paid-com']];
          return [];
        }),
      },
      catechesisClass: {
        findUnique: jest.fn(async ({ where }) =>
          where.id === 'class-paid' ? { communityId: 'paid-com' } : where.id === 'class-free' ? { communityId: 'free-com' } : null,
        ),
      },
    };
    const config = { get: jest.fn(() => mode) } as any;
    access = new PlanAccessService(prisma, config);
    guard = new PlanFeatureGuard(new Reflector(), access);
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => warn.mockRestore());

  describe('modos', () => {
    it('off: não consulta nada e libera', async () => {
      mode = 'off';
      await expect(guard.canActivate(ctx(CatechesisDummy, 'plain', { user: faithful() }))).resolves.toBe(true);
      expect(prisma.communityPlan.findUnique).not.toHaveBeenCalled();
    });

    it('log: libera, mas registra quem seria barrado (uma vez por chave)', async () => {
      mode = 'log';
      const req = { method: 'GET', route: { path: '/api/v1/catechesis/classes' }, user: faithful() };
      await expect(guard.canActivate(ctx(CatechesisDummy, 'plain', req))).resolves.toBe(true);
      await expect(guard.canActivate(ctx(CatechesisDummy, 'plain', req))).resolves.toBe(true);
      expect(warn).toHaveBeenCalledTimes(1);
      const msg = warn.mock.calls[0][0] as string;
      expect(msg).toContain('feature=catechesis');
      expect(msg).toContain('user=u1');
      expect(msg).toContain('community=free-com');
      expect(msg).toContain('GET /api/v1/catechesis/classes');
    });

    it('log: com acesso, não registra', async () => {
      mode = 'log';
      await guard.canActivate(ctx(CatechesisDummy, 'plain', { user: faithful({ communityId: 'paid-com' }) }));
      expect(warn).not.toHaveBeenCalled();
    });

    it('on: 403 PLAN_REQUIRED com feature e comunidade', async () => {
      const promise = guard.canActivate(ctx(CatechesisDummy, 'plain', { user: faithful() }));
      await expect(promise).rejects.toBeInstanceOf(ForbiddenException);
      try {
        await guard.canActivate(ctx(CatechesisDummy, 'plain', { user: faithful() }));
      } catch (error: any) {
        expect(error.getResponse()).toEqual({
          code: 'PLAN_REQUIRED',
          feature: 'catechesis',
          communityId: 'free-com',
          message: 'Disponível no plano da comunidade',
        });
      }
    });

    it('PLAN_ENFORCEMENT ausente = log (não bloqueia)', async () => {
      mode = undefined;
      const prev = process.env.PLAN_ENFORCEMENT;
      delete process.env.PLAN_ENFORCEMENT;
      await expect(guard.canActivate(ctx(CatechesisDummy, 'plain', { user: faithful() }))).resolves.toBe(true);
      expect(warn).toHaveBeenCalled();
      if (prev !== undefined) process.env.PLAN_ENFORCEMENT = prev;
    });
  });

  describe('quem passa sempre', () => {
    it('rota sem @RequiresFeature', async () => {
      await expect(guard.canActivate(ctx(FreeDummy, 'open', { user: faithful() }))).resolves.toBe(true);
    });

    it('@SkipPlanCheck', async () => {
      await expect(guard.canActivate(ctx(CatechesisDummy, 'skipped', { user: faithful() }))).resolves.toBe(true);
    });

    it('SYSTEM_ADMIN', async () => {
      const req = { user: { id: 'adm', role: 'SYSTEM_ADMIN' } };
      await expect(guard.canActivate(ctx(CatechesisDummy, 'plain', req))).resolves.toBe(true);
      expect(prisma.communityPlan.findUnique).not.toHaveBeenCalled();
    });

    it('falha no banco libera (e registra erro)', async () => {
      const error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      prisma.communityPlan.findUnique.mockRejectedValueOnce(new Error('db fora'));
      await expect(guard.canActivate(ctx(CatechesisDummy, 'plain', { user: faithful() }))).resolves.toBe(true);
      expect(error).toHaveBeenCalled();
      error.mockRestore();
    });
  });

  describe('resolução da comunidade', () => {
    it('recurso da rota (params.id) vence a comunidade do usuário', async () => {
      const req = { params: { id: 'class-paid' }, user: faithful() };
      await expect(guard.canActivate(ctx(CatechesisDummy, 'byClass', req))).resolves.toBe(true);
      const req2 = { params: { id: 'class-free' }, user: faithful({ communityId: 'paid-com' }) };
      await expect(guard.canActivate(ctx(CatechesisDummy, 'byClass', req2))).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('recurso no corpo (body.classId): família de comunidade grátis inscreve em turma paga', async () => {
      const req = { body: { classId: 'class-paid' }, user: faithful() };
      await expect(guard.canActivate(ctx(CatechesisDummy, 'apply', req))).resolves.toBe(true);
    });

    it('recurso inexistente: libera (o service responde 404)', async () => {
      const req = { params: { id: 'nao-existe' }, user: faithful() };
      await expect(guard.canActivate(ctx(CatechesisDummy, 'byClass', req))).resolves.toBe(true);
    });

    it('communityId explícito: params > query > body', async () => {
      await expect(
        guard.canActivate(ctx(CatechesisDummy, 'plain', { params: { communityId: 'paid-com' }, query: { communityId: 'free-com' }, user: faithful() })),
      ).resolves.toBe(true);
      await expect(
        guard.canActivate(ctx(CatechesisDummy, 'plain', { query: { communityId: 'trial-com' }, body: { communityId: 'free-com' }, user: faithful() })),
      ).resolves.toBe(true);
      await expect(
        guard.canActivate(ctx(CatechesisDummy, 'plain', { body: { communityId: 'expired-com' }, user: faithful({ communityId: 'paid-com' }) })),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('sem alvo explícito: comunidade do usuário ou algum vínculo ativo', async () => {
      await expect(
        guard.canActivate(ctx(CatechesisDummy, 'plain', { user: faithful({ communityId: 'trial-com' }) })),
      ).resolves.toBe(true);
      await expect(
        guard.canActivate(
          ctx(CatechesisDummy, 'plain', {
            user: faithful({ communities: [{ communityId: 'paid-com', isActive: true }] }),
          }),
        ),
      ).resolves.toBe(true);
      await expect(
        guard.canActivate(
          ctx(CatechesisDummy, 'plain', {
            user: faithful({ communities: [{ communityId: 'paid-com', isActive: false }] }),
          }),
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('usuário sem comunidade: sem acesso', async () => {
      await expect(
        guard.canActivate(ctx(CatechesisDummy, 'plain', { user: faithful({ communityId: null }) })),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('PARISH_ADMIN sem alvo: passa se ALGUMA comunidade da paróquia tiver acesso', async () => {
      await expect(
        guard.canActivate(ctx(CatechesisDummy, 'plain', { user: { id: 'p', role: 'PARISH_ADMIN', parishId: 'P-PAID' } })),
      ).resolves.toBe(true);
      await expect(
        guard.canActivate(ctx(CatechesisDummy, 'plain', { user: { id: 'p', role: 'PARISH_ADMIN', parishId: 'P-FREE', communityId: 'paid-com' } })),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('DIOCESAN_ADMIN sem alvo: escopo da diocese', async () => {
      await expect(
        guard.canActivate(ctx(CatechesisDummy, 'plain', { user: { id: 'd', role: 'DIOCESAN_ADMIN', dioceseId: 'D-PAID' } })),
      ).resolves.toBe(true);
      await expect(
        guard.canActivate(ctx(CatechesisDummy, 'plain', { user: { id: 'd', role: 'DIOCESAN_ADMIN', dioceseId: 'D-FREE' } })),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('recurso de nível paróquia (formação): coordenador vale pela paróquia dele', async () => {
      await expect(
        guard.canActivate(ctx(FormationDummy, 'list', { user: faithful({ role: 'PASTORAL_COORDINATOR', parishId: 'P-PAID' }) })),
      ).resolves.toBe(true);
    });

    it('cache de 60 s: a segunda consulta da mesma comunidade não vai ao banco; invalidate limpa', async () => {
      const req = { user: faithful({ communityId: 'paid-com' }) };
      await guard.canActivate(ctx(CatechesisDummy, 'plain', req));
      await guard.canActivate(ctx(CatechesisDummy, 'plain', req));
      expect(prisma.communityPlan.findUnique).toHaveBeenCalledTimes(1);
      access.invalidate('paid-com');
      await guard.canActivate(ctx(CatechesisDummy, 'plain', req));
      expect(prisma.communityPlan.findUnique).toHaveBeenCalledTimes(2);
    });
  });
});
