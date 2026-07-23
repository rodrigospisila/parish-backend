import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { FinanceService } from './finance.service';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';

describe('FinanceService (4.3)', () => {
  let service: FinanceService;
  let prisma: any;
  let hierarchy: { isCommunityInScope: jest.Mock; canManageMember: jest.Mock };

  const coord = { id: 'u1', role: UserRole.COMMUNITY_COORDINATOR, communityId: 'c1', parishId: 'p1' } as any;
  const faithful = { id: 'u2', role: UserRole.FAITHFUL, communityId: 'c1' } as any;

  beforeEach(async () => {
    prisma = {
      financialTransaction: { create: jest.fn() },
      tither: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      titheContribution: { create: jest.fn() },
      $transaction: jest.fn(async (cb: any) =>
        cb({
          financialTransaction: { create: jest.fn().mockResolvedValue({ id: 'ft1' }) },
          titheContribution: { create: jest.fn().mockResolvedValue({ id: 'tc1' }) },
        }),
      ),
    };
    hierarchy = {
      isCommunityInScope: jest.fn().mockResolvedValue(true),
      canManageMember: jest.fn().mockResolvedValue(true),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinanceService,
        { provide: PrismaService, useValue: prisma },
        { provide: HierarchyService, useValue: hierarchy },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();
    service = module.get<FinanceService>(FinanceService);
  });

  it('FAITHFUL não acessa dados individuais de dízimo (LGPD)', async () => {
    await expect(service.contributionsByMonth('2026-07', faithful)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('contribuição de dízimo gera transação financeira (categoria Dízimo)', async () => {
    prisma.tither.findUnique.mockResolvedValue({ id: 't1', memberId: 'm1', member: { communityId: 'c1' } });

    const res: any = await service.addContribution(
      { titherId: 't1', amount: 50, date: '2026-07-10', referenceMonth: '2026-07', method: 'PIX' },
      coord,
    );
    expect(res.id).toBe('tc1');
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('FAITHFUL não lista dizimistas (LGPD)', async () => {
    await expect(service.listTithers(faithful)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('listTithers restringe ao escopo da comunidade do coordenador', async () => {
    await service.listTithers(coord);
    expect(prisma.tither.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { member: expect.objectContaining({ communityId: 'c1' }) },
      }),
    );
  });
});
