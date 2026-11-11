import 'reflect-metadata';
import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { PlanFeatureGuard } from '../plans/plan-feature.guard';
import { PLAN_FEATURE_KEY, PLAN_RESOURCE_KEY, PLAN_SKIP_KEY } from '../plans/plan.decorators';
import { SacramentsController } from './sacraments.controller';
import { SacramentProcessesController } from '../sacrament-processes/sacrament-processes.controller';
import { SacramentProcessesService } from '../sacrament-processes/sacrament-processes.service';
import { MassIntentionsController } from '../mass-intentions/mass-intentions.controller';

const routesOf = (controller: any): string[] =>
  Object.getOwnPropertyNames(controller.prototype).filter(
    (name) => name !== 'constructor' && Reflect.getMetadata(PATH_METADATA, controller.prototype[name]) !== undefined,
  );

/** Como o PlanFeatureGuard enxerga a rota: 'aberta' ou 'feature@nível [recurso]'. */
const gateOf = (controller: any, method: string): string => {
  const handler = controller.prototype[method];
  const meta = Reflect.getMetadata(PLAN_FEATURE_KEY, handler) ?? Reflect.getMetadata(PLAN_FEATURE_KEY, controller);
  const skip = Reflect.getMetadata(PLAN_SKIP_KEY, handler) ?? Reflect.getMetadata(PLAN_SKIP_KEY, controller);
  if (!meta || skip) return 'aberta';
  const resources = (Reflect.getMetadata(PLAN_RESOURCE_KEY, handler) ?? [])
    .map((r: any) => `${r.kind}:${r.from}.${r.key}`)
    .join(',');
  return `${meta.feature}@${meta.level}${resources ? ` ${resources}` : ''}`;
};

const gatesOf = (controller: any) => Object.fromEntries(routesOf(controller).map((m) => [m, gateOf(controller, m)]));

describe('sacramentos e processos — plano por rota', () => {
  it('guard do plano na classe, depois do JwtAuthGuard', () => {
    for (const controller of [SacramentsController, SacramentProcessesController]) {
      const guards = Reflect.getMetadata(GUARDS_METADATA, controller) as any[];
      expect(guards.indexOf(JwtAuthGuard)).toBeGreaterThanOrEqual(0);
      expect(guards.indexOf(PlanFeatureGuard)).toBeGreaterThan(guards.indexOf(JwtAuthGuard));
    }
  });

  it('/sacraments: feature sacraments; comunidade do membro (?memberId / body) ou do assento', () => {
    const record = 'sacraments@community sacrament:params.id';
    expect(gatesOf(SacramentsController)).toEqual({
      findByMember: 'sacraments@community member:query.memberId',
      create: 'sacraments@community member:body.memberId',
      update: record,
      remove: record,
      certificate: record,
    });
  });

  it('/sacraments: papéis de sempre (o plano só soma)', () => {
    const proto = SacramentsController.prototype as any;
    for (const method of ['create', 'update', 'certificate']) {
      expect(Reflect.getMetadata(GUARDS_METADATA, proto[method])).toContain(RolesGuard);
      expect(Reflect.getMetadata(ROLES_KEY, proto[method])).toEqual([UserRole.COMMUNITY_COORDINATOR]);
    }
    // Apagar assento: a regra (só SYSTEM_ADMIN, com mensagem própria) continua no service
    expect(Reflect.getMetadata(ROLES_KEY, proto.remove)).toBeUndefined();
    expect(Reflect.getMetadata(ROLES_KEY, proto.findByMember)).toBeUndefined();
  });

  it('/sacrament-processes: feature sacrament-processes; comunidade do processo, do body ou do usuário', () => {
    const process = 'sacrament-processes@community sacramentProcess:params.id';
    expect(gatesOf(SacramentProcessesController)).toEqual({
      create: 'sacrament-processes@community',
      list: 'sacrament-processes@community',
      updateStatus: process,
      updateChecklist: process,
      celebrate: process,
      certificate: process,
    });
    expect(Reflect.getMetadata(ROLES_KEY, SacramentProcessesController)).toEqual([UserRole.COMMUNITY_COORDINATOR]);
  });

  it('/mass-intentions: continua só SYSTEM_ADMIN (sem plano: o guard nem age para ele)', () => {
    expect(Reflect.getMetadata(ROLES_KEY, MassIntentionsController)).toEqual([UserRole.SYSTEM_ADMIN]);
    expect(Reflect.getMetadata(GUARDS_METADATA, MassIntentionsController)).toEqual([JwtAuthGuard, RolesGuard]);
    for (const method of routesOf(MassIntentionsController)) {
      // @Roles por rota sobrescreveria o da classe
      expect(Reflect.getMetadata(ROLES_KEY, (MassIntentionsController.prototype as any)[method])).toBeUndefined();
    }
  });
});

describe('processos sacramentais — lista agregada filtrada pelo plano (só no modo on)', () => {
  const parishAdmin = { id: 'u1', role: UserRole.PARISH_ADMIN, parishId: 'p1' } as any;
  const rows = [
    { id: 'sp1', communityId: 'c-paga' },
    { id: 'sp2', communityId: 'c-gratis' },
  ];
  const build = (mode: 'log' | 'on' | null) => {
    const prisma: any = { sacramentProcess: { findMany: jest.fn().mockResolvedValue(rows) } };
    const planAccess: any = mode && {
      enforcement: jest.fn().mockReturnValue(mode),
      filterByPlan: jest.fn(async (_user: any, items: any[], communityOf: (item: any) => string | null) =>
        items.filter((item) => communityOf(item) !== 'c-gratis'),
      ),
      markByPlan: jest.fn(),
    };
    return new SacramentProcessesService(prisma, {} as any, {} as any, {} as any, planAccess ?? undefined);
  };

  it('on: saem os processos das comunidades sem plano', async () => {
    await expect(build('on').list(parishAdmin)).resolves.toEqual([rows[0]]);
  });

  it('log e sem PlanAccessService: a resposta não muda', async () => {
    await expect(build('log').list(parishAdmin)).resolves.toEqual(rows);
    await expect(build(null).list(parishAdmin)).resolves.toEqual(rows);
  });
});
