import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { DEFAULT_COST_CENTERS, StatementsService } from './statements.service';

/** Revisão da onda 1: /finance/statements/cost-centers?parishId= abria os centros de custo de qualquer paróquia. */
describe('StatementsService.costCenters — escopo financeiro', () => {
  let service: StatementsService;
  let prisma: any;

  const parishes: Record<string, { dioceseId: string }> = { 'p-pg': { dioceseId: 'd-pg' }, 'p-ctba': { dioceseId: 'd-ctba' } };
  const user = (role: UserRole, over: Record<string, unknown> = {}) => ({ id: `u-${role}`, role, ...over }) as any;

  beforeEach(() => {
    prisma = {
      parish: { findUnique: jest.fn(async ({ where }: any) => parishes[where.id] ?? null) },
      financialTransaction: { findMany: jest.fn().mockResolvedValue([{ costCenter: 'Festa da padroeira' }]) },
    };
    service = new StatementsService(prisma, {} as any, { log: jest.fn() } as any, {} as any, {} as any);
  });

  it('PARISH_ADMIN e coordenação NÃO leem os centros de custo de outra paróquia', async () => {
    await expect(service.costCenters(user(UserRole.PARISH_ADMIN, { parishId: 'p-pg' }), 'p-ctba')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.costCenters(user(UserRole.COMMUNITY_COORDINATOR, { parishId: 'p-pg', communityId: 'c1' }), 'p-ctba'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.costCenters(user(UserRole.COMMUNITY_COORDINATOR), 'p-ctba')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.financialTransaction.findMany).not.toHaveBeenCalled();
  });

  it('DIOCESAN_ADMIN não lê paróquia de outra diocese (nem sem diocese no cadastro)', async () => {
    await expect(service.costCenters(user(UserRole.DIOCESAN_ADMIN, { dioceseId: 'd-pg' }), 'p-ctba')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.costCenters(user(UserRole.DIOCESAN_ADMIN), 'p-pg')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('caminho legítimo: a própria paróquia, a paróquia da diocese e a plataforma', async () => {
    const own = await service.costCenters(user(UserRole.PARISH_ADMIN, { parishId: 'p-pg' }));
    expect(own).toContain('Festa da padroeira');
    expect(prisma.financialTransaction.findMany.mock.calls[0][0].where.parishId).toBe('p-pg');
    await expect(service.costCenters(user(UserRole.PARISH_ADMIN, { parishId: 'p-pg' }), 'p-pg')).resolves.toContain('Festa da padroeira');
    await expect(service.costCenters(user(UserRole.DIOCESAN_ADMIN, { dioceseId: 'd-pg' }), 'p-pg')).resolves.toContain('Festa da padroeira');
    await expect(service.costCenters(user(UserRole.SYSTEM_ADMIN), 'p-ctba')).resolves.toContain('Festa da padroeira');
  });

  it('sem paróquia (nem no cadastro nem na consulta): só as sugestões padrão', async () => {
    const list = await service.costCenters(user(UserRole.DIOCESAN_ADMIN, { dioceseId: 'd-pg' }));
    expect(list).toEqual([...DEFAULT_COST_CENTERS].sort((a, b) => a.localeCompare(b, 'pt-BR')));
    expect(prisma.financialTransaction.findMany).not.toHaveBeenCalled();
  });

  it('fiel continua sem acesso financeiro', async () => {
    await expect(service.costCenters(user(UserRole.FAITHFUL, { parishId: 'p-pg' }), 'p-pg')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
