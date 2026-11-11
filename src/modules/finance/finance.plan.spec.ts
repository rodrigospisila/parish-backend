import 'reflect-metadata';
import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlanFeatureGuard } from '../plans/plan-feature.guard';
import { PLAN_FEATURE_KEY, PLAN_RESOURCE_KEY, PLAN_SKIP_KEY } from '../plans/plan.decorators';
import { FinanceController } from './finance.controller';
import { StatementsController } from './statements.controller';
import { FinanceService } from './finance.service';
import { StatementsService } from './statements.service';

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

describe('financeiro — plano por rota', () => {
  it.each([FinanceController, StatementsController])('%p: PlanFeatureGuard na classe, depois do JwtAuthGuard', (controller) => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, controller) as any[];
    expect(guards.indexOf(JwtAuthGuard)).toBeGreaterThanOrEqual(0);
    expect(guards.indexOf(PlanFeatureGuard)).toBeGreaterThan(guards.indexOf(JwtAuthGuard));
    expect(Reflect.getMetadata(PLAN_FEATURE_KEY, controller)).toEqual({ feature: 'finance', level: 'community' });
  });

  it('/finance: lançamentos = finance; dizimistas e cadernos = tithe (nível paróquia)', () => {
    expect(gatesOf(FinanceController)).toEqual({
      createTransaction: 'finance@community',
      listTransactions: 'finance@community',
      summary: 'finance@community',
      registerTither: 'tithe@parish member:body.memberId',
      listTithers: 'tithe@parish',
      addContribution: 'tithe@parish',
      contributionsByMonth: 'tithe@parish',
    });
  });

  it('/finance/statements: tudo pago, inclusive a leitura dos publicados pelo fiel', () => {
    const statement = 'finance@community financialStatement:params.id';
    expect(gatesOf(StatementsController)).toEqual({
      published: 'finance@community',
      publishedPdf: statement,
      list: 'finance@community',
      costCenters: 'finance@community',
      generate: 'finance@community',
      get: statement,
      notes: statement,
      approve: statement,
      publish: statement,
      unpublish: statement,
      pdf: statement,
      exportCsv: statement,
    });
  });
});

describe('financeiro — listas agregadas filtradas pelo plano (só no modo on)', () => {
  const parishAdmin = { id: 'u1', role: UserRole.PARISH_ADMIN, parishId: 'p1' } as any;
  const rows = [
    { id: 't1', communityId: 'c-paga' },
    { id: 't2', communityId: 'c-gratis' },
    { id: 't3', communityId: null }, // da paróquia
  ];
  const planAccess = (mode: 'off' | 'log' | 'on') =>
    ({
      enforcement: jest.fn().mockReturnValue(mode),
      filterByPlan: jest.fn(async (_user: any, items: any[], communityOf: (item: any) => string | null) =>
        items.filter((item) => communityOf(item) !== 'c-gratis'),
      ),
      markByPlan: jest.fn(),
    }) as any;

  it('lançamentos: on tira os das comunidades sem plano (os da paróquia ficam); log/off/sem serviço não mudam nada', async () => {
    const prisma: any = { financialTransaction: { findMany: jest.fn().mockResolvedValue(rows) } };
    const on = new FinanceService(prisma, {} as any, {} as any, planAccess('on'));
    await expect(on.listTransactions(parishAdmin, {})).resolves.toEqual([rows[0], rows[2]]);

    for (const mode of ['log', 'off'] as const) {
      const access = planAccess(mode);
      const service = new FinanceService(prisma, {} as any, {} as any, access);
      await expect(service.listTransactions(parishAdmin, {})).resolves.toEqual(rows);
      expect(access.filterByPlan).not.toHaveBeenCalled();
    }
    await expect(new FinanceService(prisma, {} as any, {} as any).listTransactions(parishAdmin, {})).resolves.toEqual(rows);
  });

  it('balancetes: on tira os das comunidades sem plano; log não muda', async () => {
    const statements = rows.map((row) => ({
      ...row,
      parishId: 'p1',
      referenceMonth: '2026-10',
      status: 'DRAFT',
      community: row.communityId ? { id: row.communityId, name: row.communityId } : null,
    }));
    const prisma: any = { financialStatement: { findMany: jest.fn().mockResolvedValue(statements) } };
    const build = (mode: 'log' | 'on') => {
      const service = new StatementsService(prisma, {} as any, {} as any, {} as any, {} as any, planAccess(mode));
      // Escopo e apresentação não são o assunto aqui
      jest.spyOn(service as any, 'resolveParish').mockResolvedValue('p1');
      jest.spyOn(service as any, 'assertScope').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'present').mockImplementation((r: any) => r.id);
      return service;
    };
    await expect(build('on').list(parishAdmin, {})).resolves.toEqual(['t1', 't3']);
    await expect(build('log').list(parishAdmin, {})).resolves.toEqual(['t1', 't2', 't3']);
  });
});
