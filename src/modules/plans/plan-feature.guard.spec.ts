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

// Lançamento (11/11/2026): recursos novos pagos e os resolvedores deles
@RequiresFeature('news')
class NewsDummy {
  @PlanResource('news')
  one() {}
  @PlanResource('prayerRequest')
  prayer() {}
  @PlanResource('sacrament')
  sacrament() {}
  @PlanResource('sacramentProcess')
  process() {}
  @PlanResource('clergyMessage')
  clergy() {}
  @PlanResource('financialStatement')
  statement() {}
  @PlanResource('member:params.memberId')
  byMember() {}
  list() {}
}

@RequiresFeature('planning')
class PlanningDummy {
  @PlanResource('pastoralPlan')
  plan() {}
  @PlanResource('planObjective')
  objective() {}
  @PlanResource('planGoal')
  goal() {}
  @PlanResource('planAction')
  action() {}
  list() {}
}

@RequiresFeature('tithe')
class TitheDummy {
  @PlanResource('titheIntent')
  intent() {}
  @PlanResource('titheCampaign')
  campaign() {}
  @PlanResource('titheCampaignEntry:params.entryId')
  entry() {}
  @PlanResource('titheGuestGift')
  gift() {}
  @PlanResource('member:params.memberId')
  byMember() {}
  list() {}
}

// Rota "minhas" de uma feature sem recursos pessoais mapeados
@RequiresFeature('news')
class JoinRequestsController {
  mine() {}
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
  /** Paróquias do piloto (pilotParishWhere) e as comunidades delas */
  let pilotParishes: Set<string>;

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
    pilotParishes = new Set();
    const byId = (rows: Record<string, any>) => ({
      findUnique: jest.fn(async ({ where }: any) => rows[where.id] ?? null),
    });
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
        // Piloto: comunidade de paróquia do piloto (PlanAccessService.isPilotCommunity)
        count: jest.fn(async ({ where }) => (pilotParishes.has(communities[where.id]?.parishId) ? 1 : 0)),
        findMany: jest.fn(async ({ where }) => {
          // Piloto: todas as comunidades da paróquia do piloto (paidCommunityIdsIn)
          if (!where.OR && where.parish) {
            return Object.values(communities)
              .filter((c: any) => pilotParishes.has(c.parishId) && (!where.parishId || c.parishId === where.parishId))
              .map((c: any) => ({ id: c.id }));
          }
          const json = JSON.stringify(where.OR ?? []);
          const memberId = Object.keys(resources).find((id) => json.includes(`"${id}"`));
          const kind = json.includes('catechesisClasses') ? 'catechesis' : json.includes('schedules') ? 'schedules' : 'other';
          return (memberId ? (resources[memberId][kind] ?? []) : []).map((id: string) => ({ id }));
        }),
        // HierarchyService.isCommunityInScope (admins)
        findUnique: jest.fn(async ({ where }) => communities[where.id] ?? null),
      },
      parish: {
        findUnique: jest.fn(async ({ where }) => (where.id === 'P-PAID' ? { dioceseId: 'D-PAID' } : { dioceseId: 'D-OUTRA' })),
        count: jest.fn(async ({ where }) => (pilotParishes.has(where.AND?.[0]?.id) ? 1 : 0)),
      },
      // Recursos do lançamento (11/11/2026)
      news: byId({ 'n-paid': { communityId: 'paid-com' }, 'n-free': { communityId: 'free-com' } }),
      prayerRequest: byId({ 'pr-free': { communityId: 'free-com' }, 'pr-paid': { communityId: 'paid-com' } }),
      sacrament: byId({ 'sac-free': { member: { communityId: 'free-com' } }, 'sac-paid': { member: { communityId: 'paid-com' } } }),
      sacramentProcess: byId({ 'sp-free': { communityId: 'free-com' }, 'sp-paid': { communityId: 'paid-com' } }),
      clergyMessage: byId({
        'cm-com-free': { communityId: 'free-com', parishId: 'P-PAID', dioceseId: null, communityPastoral: null, member: null },
        'cm-pastoral-paid': { communityId: null, parishId: null, dioceseId: null, communityPastoral: { communityId: 'paid-com' }, member: null },
        'cm-member-free': { communityId: null, parishId: null, dioceseId: null, communityPastoral: null, member: { communityId: 'free-com' } },
        'cm-parish-paid': { communityId: null, parishId: 'P-PAID', dioceseId: null, communityPastoral: null, member: null },
        'cm-diocese-free': { communityId: null, parishId: null, dioceseId: 'D-FREE', communityPastoral: null, member: null },
      }),
      financialStatement: byId({
        'fs-com-free': { communityId: 'free-com', parishId: 'P-PAID' },
        'fs-parish-paid': { communityId: null, parishId: 'P-PAID' },
        'fs-parish-free': { communityId: null, parishId: 'P-FREE' },
      }),
      pastoralPlan: byId({ 'pp-paid': { parishId: 'P-PAID' }, 'pp-free': { parishId: 'P-FREE' } }),
      pastoralObjective: byId({ 'po-paid': { plan: { parishId: 'P-PAID' } }, 'po-free': { plan: { parishId: 'P-FREE' } } }),
      pastoralGoal: byId({ 'pg-free': { objective: { plan: { parishId: 'P-FREE' } } }, 'pg-paid': { objective: { plan: { parishId: 'P-PAID' } } } }),
      pastoralAction: byId({ 'pa-free': { objective: { plan: { parishId: 'P-FREE' } } }, 'pa-paid': { objective: { plan: { parishId: 'P-PAID' } } } }),
      titheIntent: byId({ 'ti-paid': { parishId: 'P-PAID' }, 'ti-free': { parishId: 'P-FREE' } }),
      titheCampaign: byId({ 'tc-paid': { parishId: 'P-PAID' }, 'tc-free': { parishId: 'P-FREE' } }),
      titheGuestGift: byId({ 'tg-paid': { parishId: 'P-PAID' }, 'tg-free': { parishId: 'P-FREE' } }),
      financialTransaction: byId({
        'ft-campaign-paid': { parishId: null, communityId: 'free-com', campaign: { parishId: 'P-PAID' } },
        'ft-parish-free': { parishId: 'P-FREE', communityId: null, campaign: null },
        'ft-only-community': { parishId: null, communityId: 'free-com', campaign: null },
      }),
    };
    const config = { get: jest.fn(() => mode) } as any;
    access = new PlanAccessService(prisma, config);
    guard = new PlanFeatureGuard(new Reflector(), access);
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => warn.mockRestore());

  describe('contagem em enforcement_hits (eng-qualidade-10)', () => {
    let hits: { record: jest.Mock };
    beforeEach(() => {
      hits = { record: jest.fn() };
      guard = new PlanFeatureGuard(new Reflector(), access, hits as any);
    });

    it('log: conta quem SERIA barrado (PLAN_FEATURE + feature + comunidade)', async () => {
      mode = 'log';
      await expect(guard.canActivate(ctx(CatechesisDummy, 'plain', { user: faithful() }))).resolves.toBe(true);
      expect(hits.record).toHaveBeenCalledWith({
        kind: 'PLAN_FEATURE',
        feature: 'catechesis',
        communityId: 'free-com',
        userId: 'u1',
        mode: 'log',
      });
    });

    it('on: conta o bloqueio real antes do 403', async () => {
      await expect(guard.canActivate(ctx(CatechesisDummy, 'plain', { user: faithful() }))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(hits.record).toHaveBeenCalledWith(expect.objectContaining({ kind: 'PLAN_FEATURE', feature: 'catechesis', mode: 'on' }));
    });

    it('com acesso, off ou SYSTEM_ADMIN: não conta nada', async () => {
      await guard.canActivate(ctx(CatechesisDummy, 'plain', { user: faithful({ communityId: 'paid-com' }) }));
      await guard.canActivate(ctx(CatechesisDummy, 'plain', { user: { id: 's', role: 'SYSTEM_ADMIN' } }));
      mode = 'off';
      await guard.canActivate(ctx(CatechesisDummy, 'plain', { user: faithful() }));
      expect(hits.record).not.toHaveBeenCalled();
    });

    it('id fora do escopo conta à parte (não infla a feature)', async () => {
      mode = 'log';
      await guard.canActivate(ctx(CatechesisDummy, 'plain', { user: faithful(), query: { communityId: 'paid-com' } }));
      expect(hits.record).toHaveBeenCalledWith(expect.objectContaining({ feature: 'catechesis:fora-do-escopo' }));
    });
  });

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

  describe('Lançamento (11/11/2026) — recursos novos pagos', () => {
    const allowed = (cls: any, handler: string, id: string, user: any = faithful(), key = 'id') =>
      guard.canActivate(ctx(cls, handler, { params: { [key]: id }, user }));

    it('nível padrão: planning e tithe são da paróquia; os demais, da comunidade', () => {
      const level = (cls: any) => Reflect.getMetadata('plan:feature', cls).level;
      expect(level(PlanningDummy)).toBe('parish');
      expect(level(TitheDummy)).toBe('parish');
      expect(level(NewsDummy)).toBe('community');
      expect(level(CatechesisDummy)).toBe('community');
      expect(level(FormationDummy)).toBe('parish');
    });

    it('notícia, pedido de oração, processo e sacramento: comunidade do recurso (sacramento = a do membro)', async () => {
      for (const [handler, paid, free] of [
        ['one', 'n-paid', 'n-free'],
        ['prayer', 'pr-paid', 'pr-free'],
        ['process', 'sp-paid', 'sp-free'],
        ['sacrament', 'sac-paid', 'sac-free'],
      ] as const) {
        await expect(allowed(NewsDummy, handler, paid)).resolves.toBe(true);
        await expect(allowed(NewsDummy, handler, free, faithful({ communityId: 'paid-com' }))).rejects.toMatchObject({
          response: { code: 'PLAN_REQUIRED', feature: 'news', communityId: 'free-com' },
        });
      }
    });

    it('mensagem do clero: comunidade → pastoral → destinatário → paróquia → diocese', async () => {
      await expect(allowed(NewsDummy, 'clergy', 'cm-com-free')).rejects.toBeInstanceOf(ForbiddenException);
      await expect(allowed(NewsDummy, 'clergy', 'cm-pastoral-paid')).resolves.toBe(true);
      await expect(allowed(NewsDummy, 'clergy', 'cm-member-free')).rejects.toBeInstanceOf(ForbiddenException);
      await expect(allowed(NewsDummy, 'clergy', 'cm-parish-paid')).resolves.toBe(true);
      await expect(allowed(NewsDummy, 'clergy', 'cm-diocese-free')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('balancete: da comunidade quando tem; senão, da paróquia', async () => {
      await expect(allowed(NewsDummy, 'statement', 'fs-com-free')).rejects.toBeInstanceOf(ForbiddenException);
      await expect(allowed(NewsDummy, 'statement', 'fs-parish-paid')).resolves.toBe(true);
      await expect(allowed(NewsDummy, 'statement', 'fs-parish-free')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('planejamento pastoral (plano/objetivo/meta/ação): responde a PARÓQUIA', async () => {
      for (const [handler, paid, free] of [
        ['plan', 'pp-paid', 'pp-free'],
        ['objective', 'po-paid', 'po-free'],
        ['goal', 'pg-paid', 'pg-free'],
        ['action', 'pa-paid', 'pa-free'],
      ] as const) {
        await expect(allowed(PlanningDummy, handler, paid)).resolves.toBe(true);
        await expect(allowed(PlanningDummy, handler, free, faithful({ communityId: 'paid-com' }))).rejects.toMatchObject({
          response: { code: 'PLAN_REQUIRED', feature: 'planning', communityId: null },
        });
      }
    });

    it('dízimo (intenção, campanha, lançamento, oferta de visitante): responde a PARÓQUIA', async () => {
      for (const [handler, paid, free] of [
        ['intent', 'ti-paid', 'ti-free'],
        ['campaign', 'tc-paid', 'tc-free'],
        ['gift', 'tg-paid', 'tg-free'],
      ] as const) {
        await expect(allowed(TitheDummy, handler, paid)).resolves.toBe(true);
        await expect(allowed(TitheDummy, handler, free)).rejects.toBeInstanceOf(ForbiddenException);
      }
      // Lançamento de campanha: paróquia da campanha > paróquia do lançamento > comunidade
      await expect(allowed(TitheDummy, 'entry', 'ft-campaign-paid', faithful(), 'entryId')).resolves.toBe(true);
      await expect(allowed(TitheDummy, 'entry', 'ft-parish-free', faithful(), 'entryId')).rejects.toBeInstanceOf(ForbiddenException);
      await expect(allowed(TitheDummy, 'entry', 'ft-only-community', faithful(), 'entryId')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('recurso inexistente: libera (o service responde 404)', async () => {
      await expect(allowed(NewsDummy, 'one', 'nao-existe')).resolves.toBe(true);
      await expect(allowed(TitheDummy, 'campaign', 'nao-existe')).resolves.toBe(true);
    });

    it('feature de nível paróquia sem alvo: fiel da capela grátis passa se a paróquia tem comunidade com acesso', async () => {
      const user = faithful({ parishId: 'P-PAID' });
      await expect(guard.canActivate(ctx(TitheDummy, 'list', { user }))).resolves.toBe(true);
      await expect(guard.canActivate(ctx(PlanningDummy, 'list', { user }))).resolves.toBe(true);
      // Nível comunidade: vale a comunidade dele (sem plano)
      await expect(guard.canActivate(ctx(NewsDummy, 'list', { user }))).rejects.toBeInstanceOf(ForbiddenException);
      await expect(guard.canActivate(ctx(TitheDummy, 'list', { user: faithful({ parishId: 'P-FREE' }) }))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('rota "minhas" de feature sem recursos pessoais mapeados: cai com segurança na regra do usuário', async () => {
      memberOf = { u1: 'm1' };
      resources = { m1: { catechesis: ['paid-com'] } }; // recurso de OUTRA feature não conta
      await expect(access.resourceCommunityIds({ id: 'u1', role: 'FAITHFUL' }, 'news')).resolves.toEqual([]);
      await expect(guard.canActivate(ctx(JoinRequestsController, 'mine', { user: faithful() }))).rejects.toMatchObject({
        response: { code: 'PLAN_REQUIRED', feature: 'news', communityId: 'free-com' },
      });
      await expect(
        guard.canActivate(ctx(JoinRequestsController, 'mine', { user: faithful({ communityId: 'paid-com' }) })),
      ).resolves.toBe(true);
      // Nenhuma consulta de recursos para feature desconhecida
      expect(prisma.community.findMany).not.toHaveBeenCalled();
    });

    it('log (padrão): recurso novo pago nunca bloqueia, só registra', async () => {
      mode = 'log';
      await expect(allowed(NewsDummy, 'one', 'n-free')).resolves.toBe(true);
      expect(warn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Piloto — acesso total sempre', () => {
    beforeEach(() => {
      // Paróquia do piloto com uma comunidade NOVA, sem linha em CommunityPlan
      pilotParishes = new Set(['P-PILOTO']);
      communities['nova-com'] = { id: 'nova-com', parishId: 'P-PILOTO', parish: { dioceseId: 'D-PILOTO' } };
    });

    it('comunidade nova (sem plano) de paróquia do piloto tem acesso', async () => {
      await expect(access.getPlan('nova-com')).resolves.toBeNull();
      await expect(access.communityHasAccess('nova-com')).resolves.toBe(true);
      await expect(access.communityHasAccess('free-com')).resolves.toBe(false);
      const user = faithful({ communityId: 'nova-com' });
      await expect(guard.canActivate(ctx(CatechesisDummy, 'plain', { user }))).resolves.toBe(true);
      await expect(guard.canActivate(ctx(NewsDummy, 'list', { user }))).resolves.toBe(true);
    });

    it('critério é o pilotParishWhere, com cache de 60 s', async () => {
      await access.communityHasAccess('nova-com');
      await access.communityHasAccess('nova-com');
      expect(prisma.community.count).toHaveBeenCalledTimes(1);
      const where = prisma.community.count.mock.calls[0][0].where;
      expect(where.id).toBe('nova-com');
      expect(JSON.stringify(where.parish)).toContain('PILOT_FULL_ACCESS');
      // Comunidade com plano em dia nem consulta o piloto
      prisma.community.count.mockClear();
      await access.communityHasAccess('paid-com');
      expect(prisma.community.count).not.toHaveBeenCalled();
    });

    it('PARISH_ADMIN do piloto: recursos da paróquia e lista de comunidades com acesso incluem a nova', async () => {
      const admin = { id: 'adm', role: 'PARISH_ADMIN', parishId: 'P-PILOTO' };
      await expect(guard.canActivate(ctx(TitheDummy, 'list', { user: admin }))).resolves.toBe(true);
      await expect(access.paidCommunityIdsInScope(admin as any)).resolves.toEqual(['nova-com']);
      await expect(access.isPilotParish('P-PILOTO')).resolves.toBe(true);
      await expect(access.isPilotParish('P-FREE')).resolves.toBe(false);
    });

    it('listas (filterByPlan/markByPlan) não escondem a comunidade nova do piloto', async () => {
      const items = [{ id: 'a', communityId: 'nova-com' }, { id: 'b', communityId: 'free-com' }];
      const kept = await access.filterByPlan({ role: 'PARISH_ADMIN' }, items, (i) => i.communityId);
      expect(kept.map((i) => i.id)).toEqual(['a']);
    });
  });

  describe('B12 removida — escalas de um evento deixaram de ser leitura grátis (evento é pago)', () => {
    it('GET /schedules?eventId= de evento de comunidade sem plano: 403 pela comunidade do evento', async () => {
      const req = { query: { eventId: 'ev-free' }, user: faithful({ communityId: 'paid-com' }) };
      await expect(guard.canActivate(ctx(SchedulesController, 'findAllSchedules', req))).rejects.toMatchObject({
        response: { code: 'PLAN_REQUIRED', feature: 'schedules', communityId: 'free-com' },
      });
      expect(prisma.event.findUnique).toHaveBeenCalled();
    });

    it('sem eventId (lista de escalas) continua pago', async () => {
      await expect(guard.canActivate(ctx(SchedulesController, 'findAllSchedules', { query: {}, user: faithful() }))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('nível paróquia com alvo de comunidade → avalia a PARÓQUIA da comunidade', () => {
    beforeEach(() => {
      // Capela SEM plano na paróquia que tem a Matriz paga; membros das duas
      communities['capela-com'] = { id: 'capela-com', parishId: 'P-PAID', parish: { dioceseId: 'D-PAID' } };
      prisma.member.findUnique = jest.fn(async ({ where }: any) =>
        where.id === 'm-capela' ? { communityId: 'capela-com' } : where.id === 'm-free' ? { communityId: 'free-com' } : null,
      );
    });

    it('dízimo por membro (extrato, retenção): membro da capela sem plano passa pela paróquia', async () => {
      const user = faithful({ communityId: 'capela-com', parishId: 'P-PAID' });
      await expect(guard.canActivate(ctx(TitheDummy, 'byMember', { params: { memberId: 'm-capela' }, user }))).resolves.toBe(true);
      // Paróquia sem nenhuma comunidade com acesso: barrado, e o 403 não aponta comunidade
      await expect(
        guard.canActivate(ctx(TitheDummy, 'byMember', { params: { memberId: 'm-free' }, user: faithful() })),
      ).rejects.toMatchObject({ response: { code: 'PLAN_REQUIRED', feature: 'tithe', communityId: null } });
    });

    it('communityId explícito (body/query) em feature de paróquia: vale a paróquia; o escopo continua conferido', async () => {
      const coord = { id: 'co', role: 'COMMUNITY_COORDINATOR', communityId: 'capela-com', parishId: 'P-PAID' };
      await expect(guard.canActivate(ctx(TitheDummy, 'list', { body: { communityId: 'capela-com' }, user: coord }))).resolves.toBe(true);
      await expect(guard.canActivate(ctx(PlanningDummy, 'list', { query: { communityId: 'capela-com' }, user: coord }))).resolves.toBe(true);
      await expect(guard.canActivate(ctx(FormationDummy, 'list', { query: { communityId: 'capela-com' }, user: coord }))).resolves.toBe(true);
      // Fora do escopo: negado sem olhar o plano (M43), mesmo a paróquia sendo paga
      const outsider = { id: 'x', role: 'COMMUNITY_COORDINATOR', communityId: 'free-com', parishId: 'P-FREE' };
      await expect(
        guard.canActivate(ctx(TitheDummy, 'list', { body: { communityId: 'capela-com' }, user: outsider })),
      ).rejects.toMatchObject({ response: { code: 'PLAN_SCOPE' } });
    });

    it('feature de nível comunidade NÃO sobe para a paróquia', async () => {
      const user = faithful({ communityId: 'capela-com', parishId: 'P-PAID' });
      await expect(
        guard.canActivate(ctx(NewsDummy, 'byMember', { params: { memberId: 'm-capela' }, user })),
      ).rejects.toMatchObject({ response: { code: 'PLAN_REQUIRED', feature: 'news', communityId: 'capela-com' } });
    });

    it('paróquia da comunidade em cache (uma consulta)', async () => {
      const user = faithful({ communityId: 'capela-com', parishId: 'P-PAID' });
      const req = () => ctx(TitheDummy, 'byMember', { params: { memberId: 'm-capela' }, user });
      await guard.canActivate(req());
      const calls = prisma.community.findUnique.mock.calls.length;
      await guard.canActivate(req());
      expect(prisma.community.findUnique.mock.calls.length).toBe(calls);
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
