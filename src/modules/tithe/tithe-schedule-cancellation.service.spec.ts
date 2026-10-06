import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from '../../common/common.module';
import { PrismaModule } from '../../database/prisma.module';
import { PrismaService } from '../../database/prisma.service';
import { MembersModule } from '../members/members.module';
import { MembersService } from '../members/members.service';
import { PlansModule } from '../plans/plans.module';
import { MAX_PROVIDER_CANCEL_ATTEMPTS, TitheScheduleCancellationService } from './tithe-schedule-cancellation.service';

/**
 * Pedido da F7b: anonimizar o membro (gestão ou exclusão da própria conta)
 * deixava o dízimo automático vivo no provedor — o banco seguia debitando.
 * Leva 2: o provedor só é chamado depois do commit (transação que falha não
 * cancela nada lá fora) e o job diário tenta de novo o que falhou.
 */
describe('TitheScheduleCancellationService', () => {
  const open = [
    { id: 's1', parishId: 'p1', provider: 'ASAAS', providerSubscriptionRef: 'sub_1', providerAuthorizationRef: 'auth_1' },
    { id: 's2', parishId: 'p1', provider: 'ASAAS', providerSubscriptionRef: null, providerAuthorizationRef: null },
  ];
  const pending = [{ ...open[0], providerCancelAttempts: 0 }];
  const parish = { paymentProvider: 'ASAAS', providerEnv: 'sandbox', providerApiKeyEnc: 'cifrada', providerWebhookToken: 't' };

  function setup(cancelSubscription = jest.fn().mockResolvedValue(undefined)) {
    const prisma: any = {
      titheSchedule: {
        findMany: jest.fn().mockResolvedValue(pending),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({}),
      },
      parish: { findUnique: jest.fn().mockResolvedValue(parish) },
    };
    // Provedor simulado: nenhuma chamada real ao Asaas
    const payments: any = { hasProvider: () => true, forParish: jest.fn(() => ({ cancelSubscription })) };
    return { service: new TitheScheduleCancellationService(prisma, payments), prisma, payments, cancelSubscription };
  }

  const makeTx = () => ({
    titheSchedule: { findMany: jest.fn().mockResolvedValue(open), updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
  });

  it('etapa 1 (na transação): marca cancelado + pendente no provedor, SEM chamar o provedor', async () => {
    const ctx = setup();
    const tx: any = makeTx();
    const out = await ctx.service.cancelSchedulesForMember('m1', tx);
    expect(out).toEqual({ cancelled: 2, providerPendingIds: ['s1'] });
    expect(tx.titheSchedule.updateMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ data: expect.objectContaining({ status: 'CANCELLED', authorizationPayload: null }) }),
    );
    // Só o que tem referência no provedor fica pendente
    expect(tx.titheSchedule.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: { in: ['s1'] }, status: 'CANCELLED' },
      data: { providerCancelPendingAt: expect.any(Date), providerCancelAttempts: 0 },
    });
    expect(ctx.prisma.titheSchedule.updateMany).not.toHaveBeenCalled();
    expect(ctx.payments.forParish).not.toHaveBeenCalled();
    expect(ctx.cancelSubscription).not.toHaveBeenCalled();
  });

  it('etapa 2 (pós-commit): cancela no provedor e limpa a marca', async () => {
    const ctx = setup();
    const out = await ctx.service.cancelPendingAtProvider({ memberId: 'm1' });
    expect(out).toEqual({ done: 1, failed: 0 });
    const where = ctx.prisma.titheSchedule.findMany.mock.calls[0][0].where;
    expect(where).toEqual(
      expect.objectContaining({
        memberId: 'm1',
        status: 'CANCELLED',
        providerCancelPendingAt: { not: null },
        providerCancelAttempts: { lt: MAX_PROVIDER_CANCEL_ATTEMPTS },
      }),
    );
    expect(ctx.cancelSubscription).toHaveBeenCalledWith({ providerRef: 'sub_1', authorizationRef: 'auth_1' });
    expect(ctx.prisma.titheSchedule.updateMany).toHaveBeenCalledWith({
      where: { id: 's1', providerCancelPendingAt: { not: null } },
      data: expect.objectContaining({ providerCancelPendingAt: null, providerCancelAttempts: { increment: 1 } }),
    });
  });

  it('falha do provedor não lança: conta a tentativa, mantém a marca e avisa no dízimo automático', async () => {
    const ctx = setup(jest.fn().mockRejectedValue(new Error('Asaas indisponível')));
    await expect(ctx.service.cancelPendingAtProvider({ memberId: 'm1' })).resolves.toEqual({ done: 0, failed: 1 });
    const data = ctx.prisma.titheSchedule.updateMany.mock.calls[0][0].data;
    expect(data).toEqual({ providerCancelAttempts: { increment: 1 }, lastError: expect.stringContaining('painel do provedor') });
    expect(data).not.toHaveProperty('providerCancelPendingAt');
  });

  it('job de nova tentativa: só os pendentes há mais de 10 min e abaixo do teto de tentativas', async () => {
    const ctx = setup();
    const now = new Date('2026-10-07T08:00:00.000Z');
    await ctx.service.retryPendingProviderCancellations(now);
    const where = ctx.prisma.titheSchedule.findMany.mock.calls[0][0].where;
    expect(where.providerCancelPendingAt).toEqual({ not: null, lte: new Date('2026-10-07T07:50:00.000Z') });
    expect(where.providerCancelAttempts).toEqual({ lt: MAX_PROVIDER_CANCEL_ATTEMPTS });
    expect(where).not.toHaveProperty('memberId');
    expect(ctx.cancelSubscription).toHaveBeenCalledTimes(1);
  });

  it('idempotente: sem dízimo automático aberto, nada a fazer', async () => {
    const ctx = setup();
    ctx.prisma.titheSchedule.findMany.mockResolvedValue([]);
    const out = await ctx.service.cancelSchedulesForMember('m1');
    expect(out).toEqual({ cancelled: 0, providerPendingIds: [] });
    expect(ctx.prisma.titheSchedule.updateMany).not.toHaveBeenCalled();
    await expect(ctx.service.cancelPendingAtProvider({ memberId: 'm1' })).resolves.toEqual({ done: 0, failed: 0 });
    expect(ctx.payments.forParish).not.toHaveBeenCalled();
  });

  it('o módulo de membros sobe com o gancho (sem ciclo com o TitheModule)', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }), PrismaModule, CommonModule, PlansModule, MembersModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();
    const members = moduleRef.get(MembersService);
    expect((members as any).titheSchedules).toBeInstanceOf(TitheScheduleCancellationService);
    await moduleRef.close();
  });

  it('anonymizePersonalData chama só a etapa 1, dentro da transação', async () => {
    const cancel = {
      cancelSchedulesForMember: jest.fn().mockResolvedValue({ cancelled: 1, providerPendingIds: ['s1'] }),
      cancelPendingAtProvider: jest.fn(),
    };
    const members = new MembersService({} as any, {} as any, {} as any, cancel as any);
    const model = () => ({ updateMany: jest.fn().mockResolvedValue({ count: 0 }), deleteMany: jest.fn().mockResolvedValue({ count: 0 }), update: jest.fn().mockResolvedValue({ id: 'm1' }) });
    const db: any = new Proxy({}, { get: (target: any, key: string | symbol) => (typeof key === 'symbol' ? undefined : (target[key] = target[key] ?? model())) });
    await members.anonymizePersonalData(db, 'm1');
    expect(cancel.cancelSchedulesForMember).toHaveBeenCalledTimes(1);
    expect(cancel.cancelSchedulesForMember.mock.calls[0][0]).toBe('m1');
    expect(cancel.cancelSchedulesForMember.mock.calls[0][1]).toBe(db);
    expect(cancel.cancelPendingAtProvider).not.toHaveBeenCalled();
  });

  describe('anonymizeMember: provedor só depois do commit', () => {
    function membersWith(transaction: (cb: any) => Promise<any>) {
      const cancel = {
        cancelSchedulesForMember: jest.fn().mockResolvedValue({ cancelled: 1, providerPendingIds: ['s1'] }),
        cancelPendingAtProvider: jest.fn().mockResolvedValue({ done: 1, failed: 0 }),
      };
      const prisma: any = { $transaction: jest.fn(transaction) };
      const audit: any = { log: jest.fn().mockResolvedValue(undefined), pseudonymizeSubject: jest.fn().mockResolvedValue(0) };
      const members = new MembersService(prisma, {} as any, audit, cancel as any);
      jest.spyOn(members, 'findOne').mockResolvedValue({ id: 'm1', status: 'ACTIVE' } as any);
      return { members, cancel };
    }

    it('transação confirmada → dispara o cancelamento no provedor por memberId', async () => {
      const order: string[] = [];
      const { members, cancel } = membersWith(async (cb) => {
        order.push('tx:start');
        const out = await cb({});
        order.push('tx:commit');
        return out;
      });
      jest.spyOn(members, 'anonymizePersonalData').mockResolvedValue({ id: 'm1' } as any);
      cancel.cancelPendingAtProvider.mockImplementation(async () => {
        order.push('provider');
        return { done: 1, failed: 0 };
      });
      await members.anonymizeMember('m1');
      await new Promise((resolve) => setImmediate(resolve));
      expect(cancel.cancelPendingAtProvider).toHaveBeenCalledWith({ memberId: 'm1' });
      expect(order).toEqual(['tx:start', 'tx:commit', 'provider']);
    });

    it('transação falhou → o provedor NÃO é chamado', async () => {
      const { members, cancel } = membersWith(async () => {
        throw new Error('deadlock');
      });
      await expect(members.anonymizeMember('m1')).rejects.toThrow('deadlock');
      await new Promise((resolve) => setImmediate(resolve));
      expect(cancel.cancelPendingAtProvider).not.toHaveBeenCalled();
    });

    it('erro no pós-commit não derruba a anonimização', async () => {
      const { members, cancel } = membersWith(async (cb) => cb({}));
      jest.spyOn(members, 'anonymizePersonalData').mockResolvedValue({ id: 'm1' } as any);
      cancel.cancelPendingAtProvider.mockRejectedValue(new Error('banco fora'));
      await expect(members.anonymizeMember('m1')).resolves.toEqual({ id: 'm1' });
      await expect(members.cancelTitheAtProviderAfterCommit('m1')).resolves.toBeUndefined();
    });
  });
});

/**
 * R4#20: a anonimização encerrava o dízimo automático, mas o Pix/boleto avulso
 * ainda aberto do membro seguia pagável no provedor.
 */
describe('TitheScheduleCancellationService — cobranças avulsas na anonimização (R4#20)', () => {
  const parish = { paymentProvider: 'ASAAS', providerEnv: 'sandbox', providerApiKeyEnc: 'cifrada', providerWebhookToken: 't' };
  const intents = [
    { id: 'i-vivo', parishId: 'p1', providerRef: 'pay_vivo' },
    { id: 'i-pago', parishId: 'p1', providerRef: 'pay_pago' },
    { id: 'i-falha', parishId: 'p1', providerRef: 'pay_falha' },
  ];

  function setup() {
    const prisma: any = {
      titheIntent: { findMany: jest.fn().mockResolvedValue(intents), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      parish: { findUnique: jest.fn().mockResolvedValue(parish) },
    };
    const status: Record<string, string> = { pay_vivo: 'pending', pay_pago: 'received', pay_falha: 'pending' };
    // Provedor simulado: nenhuma chamada real
    const provider = {
      getCharge: jest.fn(async (ref: string) => ({ providerRef: ref, status: status[ref] })),
      cancelCharge: jest.fn(async (ref: string) => {
        if (ref === 'pay_falha') throw new Error('provedor recusou');
      }),
    };
    const payments: any = { hasProvider: () => true, forParish: jest.fn(() => provider) };
    return { service: new TitheScheduleCancellationService(prisma, payments), prisma, provider };
  }

  it('cancela no provedor e encerra só o que não foi pago; falha fica aberta para a expiração', async () => {
    const ctx = setup();
    const out = await ctx.service.cancelOpenChargesForMember('m1');
    expect(out).toEqual({ done: 1, failed: 1 });
    expect(ctx.prisma.titheIntent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ memberId: 'm1', status: { in: ['CREATED', 'DECLARED'] }, method: 'GATEWAY' }) }),
    );
    expect(ctx.provider.cancelCharge).toHaveBeenCalledWith('pay_vivo');
    // Já pago no provedor: o webhook liquida, nada é cancelado
    expect(ctx.provider.cancelCharge).not.toHaveBeenCalledWith('pay_pago');
    expect(ctx.prisma.titheIntent.updateMany).toHaveBeenCalledTimes(1);
    expect(ctx.prisma.titheIntent.updateMany).toHaveBeenCalledWith({
      where: { id: 'i-vivo', status: { in: ['CREATED', 'DECLARED'] } },
      data: { status: 'CANCELLED', note: 'Cancelado na remoção do cadastro (LGPD)', providerStatus: 'cancelled' },
    });
  });

  it('o gancho pós-commit da anonimização também encerra as cobranças avulsas', async () => {
    const cancel = {
      cancelSchedulesForMember: jest.fn(),
      cancelPendingAtProvider: jest.fn().mockRejectedValue(new Error('banco fora')),
      cancelOpenChargesForMember: jest.fn().mockResolvedValue({ done: 1, failed: 0 }),
    };
    const members = new MembersService({} as any, {} as any, {} as any, cancel as any);
    await expect(members.cancelTitheAtProviderAfterCommit('m1')).resolves.toBeUndefined();
    // Mesmo com o dízimo automático falhando, as avulsas são tratadas
    expect(cancel.cancelOpenChargesForMember).toHaveBeenCalledWith('m1');
  });
});
