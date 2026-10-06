import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { SCHEDULE_CRON_OPTIONS } from '@nestjs/schedule/dist/schedule.constants';
import { CommonModule } from '../../common/common.module';
import { AuditService } from '../../common/audit.service';
import { PrismaModule } from '../../database/prisma.module';
import { PrismaService } from '../../database/prisma.service';
import { PlansModule } from '../plans/plans.module';
import { PlatformPlansService } from '../plans/platform-plans.service';
import { TitheScheduleCancellationService } from '../tithe/tithe-schedule-cancellation.service';
import { DailyMaintenanceService } from './daily-maintenance.service';
import { JobsModule } from './jobs.module';

/**
 * Integração da leva 2: os ganchos que a leva 1 deixou prontos (expurgo da
 * auditoria, vencimento de plano, nova tentativa do cancelamento do dízimo no
 * provedor) agora têm agenda diária, cada um com trava distribuída.
 */
describe('DailyMaintenanceService', () => {
  function setup(locked = true) {
    const tx = { $queryRaw: jest.fn().mockResolvedValue([{ locked }]) };
    const prisma: any = { $transaction: jest.fn((fn: (client: unknown) => Promise<unknown>) => fn(tx)) };
    const audit: any = { purgeExpired: jest.fn().mockResolvedValue({ access: 3, others: 1 }) };
    const plans: any = { markOverduePlans: jest.fn().mockResolvedValue({ dryRun: false, count: 2, communityIds: ['c1', 'c2'] }) };
    const tithe: any = { retryPendingProviderCancellations: jest.fn().mockResolvedValue({ done: 1, failed: 0 }) };
    return { service: new DailyMaintenanceService(prisma, audit, plans, tithe), prisma, tx, audit, plans, tithe };
  }

  const cronOf = (method: keyof DailyMaintenanceService) =>
    Reflect.getMetadata(SCHEDULE_CRON_OPTIONS, DailyMaintenanceService.prototype[method] as object);

  it('agenda no fuso de Brasília: 04:00 auditoria, 04:30 planos, 05:00 dízimo', () => {
    expect(cronOf('purgeAudit')).toEqual(expect.objectContaining({ cronTime: '0 4 * * *', timeZone: 'America/Sao_Paulo' }));
    expect(cronOf('markOverduePlans')).toEqual(expect.objectContaining({ cronTime: '30 4 * * *', timeZone: 'America/Sao_Paulo' }));
    expect(cronOf('retryTitheProviderCancellations')).toEqual(
      expect.objectContaining({ cronTime: '0 5 * * *', timeZone: 'America/Sao_Paulo' }),
    );
  });

  it('com a trava: expurga a auditoria, marca planos vencidos e tenta de novo os cancelamentos', async () => {
    const ctx = setup(true);
    await expect(ctx.service.purgeAudit()).resolves.toEqual({ access: 3, others: 1 });
    await expect(ctx.service.markOverduePlans()).resolves.toEqual(expect.objectContaining({ count: 2 }));
    await expect(ctx.service.retryTitheProviderCancellations()).resolves.toEqual({ done: 1, failed: 0 });
    expect(ctx.audit.purgeExpired).toHaveBeenCalledWith(expect.any(Date));
    expect(ctx.plans.markOverduePlans).toHaveBeenCalledWith({ now: expect.any(Date) });
    expect(ctx.tithe.retryPendingProviderCancellations).toHaveBeenCalledWith(expect.any(Date));
    // Uma trava por job, com chave própria
    const keys = ctx.tx.$queryRaw.mock.calls.map((call: any[]) => call[1]);
    expect(keys).toEqual(['parish:job:audit-purge', 'parish:job:plans-mark-overdue', 'parish:job:tithe-provider-cancel-retry']);
  });

  it('sem a trava (outra réplica rodando): não faz nada', async () => {
    const ctx = setup(false);
    await expect(ctx.service.purgeAudit()).resolves.toBeNull();
    await expect(ctx.service.markOverduePlans()).resolves.toBeNull();
    await expect(ctx.service.retryTitheProviderCancellations()).resolves.toBeNull();
    expect(ctx.audit.purgeExpired).not.toHaveBeenCalled();
    expect(ctx.plans.markOverduePlans).not.toHaveBeenCalled();
    expect(ctx.tithe.retryPendingProviderCancellations).not.toHaveBeenCalled();
  });

  it('o módulo de jobs monta com as dependências reais (sem ciclo de módulos)', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }), PrismaModule, CommonModule, PlansModule, JobsModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();
    const service = moduleRef.get(DailyMaintenanceService);
    expect((service as any).auditService).toBeInstanceOf(AuditService);
    expect((service as any).platformPlans).toBeInstanceOf(PlatformPlansService);
    expect((service as any).titheCancellations).toBeInstanceOf(TitheScheduleCancellationService);
    await moduleRef.close();
  });
});
