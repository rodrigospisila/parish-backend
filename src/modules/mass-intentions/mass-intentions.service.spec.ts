import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Reflector } from '@nestjs/core';
import { MassIntentionsService } from './mass-intentions.service';
import { MassIntentionsController } from './mass-intentions.controller';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

/**
 * A9 (auditoria): intenções de missa publicadas sem escopo nenhum. Sem dono no
 * produto (0 registros, nenhuma tela usa) → módulo restrito ao SYSTEM_ADMIN.
 */
describe('MassIntentions (restrito ao SYSTEM_ADMIN — A9)', () => {
  let service: MassIntentionsService;
  let prisma: any;

  const system = { id: 'sys', role: UserRole.SYSTEM_ADMIN } as any;
  const faithful = { id: 'f', role: UserRole.FAITHFUL, communityId: 'c1' } as any;
  const parishAdmin = { id: 'p', role: UserRole.PARISH_ADMIN, parishId: 'p1' } as any;

  beforeEach(() => {
    prisma = {
      community: { findUnique: jest.fn().mockResolvedValue({ id: 'c1' }) },
      massIntention: {
        create: jest.fn().mockResolvedValue({ id: 'mi1' }),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue({ id: 'mi1', communityId: 'c1' }),
        update: jest.fn().mockResolvedValue({ id: 'mi1' }),
        delete: jest.fn().mockResolvedValue({ id: 'mi1' }),
        count: jest.fn().mockResolvedValue(0),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
      },
    };
    service = new MassIntentionsService(prisma);
  });

  it('nenhuma rota sobrescreve o @Roles(SYSTEM_ADMIN) da classe', () => {
    expect(Reflect.getMetadata(ROLES_KEY, MassIntentionsController)).toEqual([UserRole.SYSTEM_ADMIN]);
    const handlers = Object.getOwnPropertyNames(MassIntentionsController.prototype).filter((n) => n !== 'constructor');
    expect(handlers.length).toBeGreaterThan(5);
    for (const name of handlers) {
      expect(Reflect.getMetadata(ROLES_KEY, (MassIntentionsController.prototype as any)[name])).toBeUndefined();
    }
  });

  it('o RolesGuard barra fiel e pároco em toda rota do módulo', () => {
    const guard = new RolesGuard(new Reflector());
    const ctx = (user: any, handler: any) =>
      ({
        getHandler: () => handler,
        getClass: () => MassIntentionsController,
        switchToHttp: () => ({ getRequest: () => ({ user }) }),
      }) as any;
    for (const name of ['create', 'findOne', 'findByDate', 'findUpcoming', 'markAsPaid', 'remove', 'getStats']) {
      const handler = (MassIntentionsController.prototype as any)[name];
      expect(guard.canActivate(ctx(faithful, handler))).toBe(false);
      expect(guard.canActivate(ctx(parishAdmin, handler))).toBe(false);
      expect(guard.canActivate(ctx(system, handler))).toBe(true);
    }
  });

  it('o service também nega quem não é SYSTEM_ADMIN (defesa em profundidade)', async () => {
    await expect(
      service.create({ communityId: 'c1', intentionFor: 'x', type: 'DECEASED', requestedDate: '2026-10-10', requestedBy: 'y' } as any, faithful),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.findOne('mi1', faithful)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.findUpcoming(faithful)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.findByDate(faithful, '2026-10-10')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.markAsPaid('mi1', 'PIX', parishAdmin)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.remove('mi1', parishAdmin)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.getStats(parishAdmin)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.findAll(undefined as any)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.massIntention.create).not.toHaveBeenCalled();
    expect(prisma.massIntention.update).not.toHaveBeenCalled();
    expect(prisma.massIntention.delete).not.toHaveBeenCalled();
  });

  it('SYSTEM_ADMIN segue operando o módulo', async () => {
    await service.findOne('mi1', system);
    await service.markAsPaid('mi1', 'PIX', system);
    expect(prisma.massIntention.update).toHaveBeenCalled();
  });
});
