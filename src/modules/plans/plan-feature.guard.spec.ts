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

// Mesmos nomes dos controllers reais: as regras de plan-routes.ts são por Classe.método
@RequiresFeature('catechesis')
class CatechesisController {
  myFamily() {}
  myClasses() {}
}

@RequiresFeature('schedules')
class SchedulesController {
  @PlanResource('event:query.eventId')
  findAllSchedules() {}
  findMyAssignments() {}
  @PlanResource('schedule:body.scheduleIds')
  generateRotation() {}
}

describe('PlanFeatureGuard', () => {
  let mode: string | undefined;
  let plans: Record<string, any>;
  let prisma: any;
  let access: PlanAccessService;
  let guard: PlanFeatureGuard;
  let warn: jest.SpyInstance;
  let memberOf: Record<string, string>;
  let memberLinks: Record<string, string[]>;
  let resources: Record<string, Record<string, string[]>>;
  let communities: Record<string, any>;

  const ctx = (cls: any, handler: string, req: any): ExecutionContext =>
    ({
      getClass: () => cls,
      getHandler: () => cls.prototype[handler],
      switchToHttp: () => ({ getRequest: () => req }),
    }) as unknown as ExecutionContext;

  const faithful = (over: any = {}) => ({ id: 'u1', role: 'FAITHFUL', communityId: 'free-com', ...over });

  beforeEach(() => {
    mode = 'on';
    memberOf = {};
    memberLinks = {};
    resources = {};
    communities = {
      'paid-com': { id: 'paid-com', parishId: 'P-PAID', parish: { dioceseId: 'D-PAID' } },
      'free-com': { id: 'free-com', parishId: 'P-FREE', parish: { dioceseId: 'D-FREE' } },
      'trial-com': { id: 'trial-com', parishId: 'P-PAID', parish: { dioceseId: 'D-PAID' } },
    };
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
      schedule: {
        findUnique: jest.fn(async ({ where }) =>
          where.id === 's-paid' ? { communityId: 'paid-com', event: null } : where.id === 's-free' ? { communityId: 'free-com', event: null } : null,
        ),
      },
      event: { findUnique: jest.fn(async ({ where }) => (where.id === 'ev-free' ? { communityId: 'free-com' } : null)) },
      member: { findFirst: jest.fn(async ({ where }) => (memberOf[where.userId] ? { id: memberOf[where.userId] } : null)) },
      // Vínculos do CADASTRO de membro (MemberCommunity)
      memberCommunity: {
        findMany: jest.fn(async ({ where }) => (memberLinks[where.memberId] ?? []).map((communityId) => ({ communityId }))),
      },
      // Comunidades dos recursos do membro (turmas, escalas, pastorais)
      community: {
        findMany: jest.fn(async ({ where }) => {
          const json = JSON.stringify(where.OR ?? []);
          const memberId = Object.keys(resources).find((id) => json.includes(`"${id}"`));
          const kind = json.includes('catechesisClasses') ? 'catechesis' : json.includes('schedules') ? 'schedules' : 'other';
          return (memberId ? (resources[memberId][kind] ?? []) : []).map((id: string) => ({ id }));
        }),
        // HierarchyService.isCommunityInScope (admins)
        findUnique: jest.fn(async ({ where }) => communities[where.id] ?? null),
      },
      parish: { findUnique: jest.fn(async ({ where }) => (where.id === 'P-PAID' ? { dioceseId: 'D-PAID' } : { dioceseId: 'D-OUTRA' })) },
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

    it('communityId explícito (no escopo): params > query > body', async () => {
      const linked = (communityId: string) =>
        faithful({ communities: ['paid-com', 'trial-com', 'expired-com'].map((id) => ({ communityId: id, isActive: true })), communityId });
      await expect(
        guard.canActivate(ctx(CatechesisDummy, 'plain', { params: { communityId: 'paid-com' }, query: { communityId: 'free-com' }, user: linked('free-com') })),
      ).resolves.toBe(true);
      await expect(
        guard.canActivate(ctx(CatechesisDummy, 'plain', { query: { communityId: 'trial-com' }, body: { communityId: 'free-com' }, user: linked('free-com') })),
      ).resolves.toBe(true);
      await expect(
        guard.canActivate(ctx(CatechesisDummy, 'plain', { body: { communityId: 'expired-com' }, user: linked('paid-com') })),
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

  describe('M43 — id explícito precisa estar no escopo', () => {
    const scopeError = async (promise: Promise<unknown>) => {
      try {
        await promise;
      } catch (error: any) {
        return error.getResponse();
      }
      throw new Error('esperava 403');
    };

    it('fiel de comunidade sem plano com ?communityId= de comunidade paga de fora: 403 PLAN_SCOPE', async () => {
      const req = { query: { communityId: 'paid-com' }, user: faithful() };
      expect(await scopeError(guard.canActivate(ctx(CatechesisDummy, 'plain', req)))).toEqual({
        code: 'PLAN_SCOPE',
        feature: 'catechesis',
        message: 'Comunidade fora do seu escopo',
      });
      // nem chegou a consultar o plano da comunidade paga
      expect(prisma.communityPlan.findUnique).not.toHaveBeenCalled();
    });

    it('modo log: libera, mas registra "fora do escopo"', async () => {
      mode = 'log';
      const req = { method: 'GET', route: { path: '/schedules/coordinator-overview' }, query: { communityId: 'paid-com' }, user: faithful() };
      await expect(guard.canActivate(ctx(CatechesisDummy, 'plain', req))).resolves.toBe(true);
      expect(warn.mock.calls[0][0]).toContain('fora do escopo');
    });

    it('fiel com vínculo de MEMBRO na Matriz paga (turmas abertas): passa', async () => {
      memberOf = { u1: 'm1' };
      memberLinks = { m1: ['paid-com'] };
      const req = { query: { communityId: 'paid-com' }, user: faithful() };
      await expect(guard.canActivate(ctx(CatechesisDummy, 'plain', req))).resolves.toBe(true);
    });

    it('PARISH_ADMIN: ?communityId= de outra paróquia → 403; da própria → avalia o plano dela', async () => {
      const admin = { id: 'p', role: 'PARISH_ADMIN', parishId: 'P-FREE' };
      await expect(
        scopeError(guard.canActivate(ctx(CatechesisDummy, 'plain', { query: { communityId: 'paid-com' }, user: admin }))),
      ).resolves.toMatchObject({ code: 'PLAN_SCOPE' });
      await expect(
        guard.canActivate(ctx(CatechesisDummy, 'plain', { query: { communityId: 'paid-com' }, user: { ...admin, parishId: 'P-PAID' } })),
      ).resolves.toBe(true);
    });

    it('?parishId= de outra paróquia → 403 PLAN_SCOPE (diocese: só as paróquias dela)', async () => {
      const coord = faithful({ role: 'COMMUNITY_COORDINATOR', parishId: 'P-FREE' });
      await expect(
        scopeError(guard.canActivate(ctx(CatechesisDummy, 'plain', { query: { parishId: 'P-PAID' }, user: coord }))),
      ).resolves.toMatchObject({ code: 'PLAN_SCOPE' });
      const dioc = { id: 'd', role: 'DIOCESAN_ADMIN', dioceseId: 'D-PAID' };
      await expect(guard.canActivate(ctx(CatechesisDummy, 'plain', { query: { parishId: 'P-PAID' }, user: dioc }))).resolves.toBe(true);
      await expect(
        scopeError(guard.canActivate(ctx(CatechesisDummy, 'plain', { query: { parishId: 'P-OUTRA' }, user: dioc }))),
      ).resolves.toMatchObject({ code: 'PLAN_SCOPE' });
    });

    it('lista de ids (scheduleIds): TODOS precisam de acesso, não só o 1º', async () => {
      const user = faithful({ role: 'COMMUNITY_COORDINATOR', communityId: 'paid-com' });
      await expect(
        guard.canActivate(ctx(SchedulesController, 'generateRotation', { body: { scheduleIds: ['s-paid', 's-free'] }, user })),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        guard.canActivate(ctx(SchedulesController, 'generateRotation', { body: { scheduleIds: ['s-paid', 's-paid'] }, user })),
      ).resolves.toBe(true);
    });
  });

  describe('A21 — rotas "minhas" decidem pela comunidade do recurso', () => {
    it('família da capela (sem plano) com o filho em turma da Matriz paga: my-family passa', async () => {
      memberOf = { u1: 'm-pai' };
      resources = { 'm-pai': { catechesis: ['paid-com'] } };
      await expect(guard.canActivate(ctx(CatechesisController, 'myFamily', { user: faithful() }))).resolves.toBe(true);
    });

    it('catequista de capela com turma na Matriz paga: my-classes passa', async () => {
      memberOf = { u1: 'm-cat' };
      resources = { 'm-cat': { catechesis: ['paid-com'] } };
      const user = faithful({ role: 'VOLUNTEER' });
      await expect(guard.canActivate(ctx(CatechesisController, 'myClasses', { user }))).resolves.toBe(true);
    });

    it('escalado da capela em escala da Matriz paga: my-assignments passa', async () => {
      memberOf = { u1: 'm-esc' };
      resources = { 'm-esc': { schedules: ['paid-com'] } };
      await expect(guard.canActivate(ctx(SchedulesController, 'findMyAssignments', { user: faithful() }))).resolves.toBe(true);
    });

    it('inverso: comunidade principal paga, mas recursos só em comunidade sem plano → 403', async () => {
      memberOf = { u1: 'm-x' };
      resources = { 'm-x': { catechesis: ['free-com'] } };
      await expect(
        guard.canActivate(ctx(CatechesisController, 'myFamily', { user: faithful({ communityId: 'paid-com' }) })),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('sem recurso nenhum: cai na regra do usuário', async () => {
      memberOf = { u1: 'm-vazio' };
      await expect(
        guard.canActivate(ctx(CatechesisController, 'myFamily', { user: faithful({ communityId: 'paid-com' }) })),
      ).resolves.toBe(true);
      await expect(guard.canActivate(ctx(CatechesisController, 'myFamily', { user: faithful() }))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('B12 — leitura grátis do calendário', () => {
    it('GET /schedules?eventId= de evento de comunidade sem plano: liberado', async () => {
      const req = { query: { eventId: 'ev-free' }, user: faithful() };
      await expect(guard.canActivate(ctx(SchedulesController, 'findAllSchedules', req))).resolves.toBe(true);
      expect(prisma.event.findUnique).not.toHaveBeenCalled();
    });

    it('sem eventId (lista de escalas) continua pago', async () => {
      await expect(guard.canActivate(ctx(SchedulesController, 'findAllSchedules', { query: {}, user: faithful() }))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('M35 — filtrar/marcar itens de lista por comunidade', () => {
    const items = [
      { id: 'a', communityId: 'paid-com' },
      { id: 'b', communityId: 'free-com' },
      { id: 'c', communityId: null },
    ];
    const admin = { role: 'PARISH_ADMIN' as const };

    it('on: tira (ou marca) os itens das comunidades sem acesso', async () => {
      const kept = await access.filterByPlan(admin, items, (i) => i.communityId);
      expect(kept.map((i) => i.id)).toEqual(['a', 'c']);
      const marked = await access.markByPlan(admin, items, (i) => i.communityId);
      expect(marked.map((i) => i.planLocked)).toEqual([false, true, false]);
    });

    it('log/off ou SYSTEM_ADMIN: não mexe na lista', async () => {
      mode = 'log';
      expect(await access.filterByPlan(admin, items, (i) => i.communityId)).toHaveLength(3);
      expect((await access.markByPlan(admin, items, (i) => i.communityId)).every((i) => !i.planLocked)).toBe(true);
      mode = 'on';
      expect(await access.filterByPlan({ role: 'SYSTEM_ADMIN' }, items, (i) => i.communityId)).toHaveLength(3);
    });

    it('paidCommunityIdsInScope: comunidades pagas da paróquia do PARISH_ADMIN', async () => {
      prisma.communityPlan.findMany.mockResolvedValueOnce([
        { communityId: 'paid-com', status: 'ACTIVE', trialEndsAt: null, currentPeriodEnd: null, graceDays: 15 },
        { communityId: 'expired-com', status: 'TRIAL', trialEndsAt: past(), currentPeriodEnd: null, graceDays: 15 },
      ]);
      await expect(access.paidCommunityIdsInScope({ id: 'p', role: 'PARISH_ADMIN', parishId: 'P-PAID' })).resolves.toEqual(['paid-com']);
    });
  });
});
