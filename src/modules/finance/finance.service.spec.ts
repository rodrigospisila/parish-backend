import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { FinanceService, currentMonthBR } from './finance.service';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';

describe('FinanceService (4.3)', () => {
  let service: FinanceService;
  let prisma: any;
  let hierarchy: { isCommunityInScope: jest.Mock; canManageMember: jest.Mock; getCommunityScopeIds: jest.Mock };

  const coord = { id: 'u1', role: UserRole.COMMUNITY_COORDINATOR, communityId: 'c1', parishId: 'p1' } as any;
  const faithful = { id: 'u2', role: UserRole.FAITHFUL, communityId: 'c1' } as any;

  beforeEach(async () => {
    prisma = {
      financialTransaction: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      tither: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      titheContribution: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      // Diocese de PG: paróquias p1 e p2
      parish: { findMany: jest.fn(async ({ where }: any) => (where.dioceseId === 'dio-pg' ? [{ id: 'p1' }, { id: 'p2' }] : [])) },
      community: { findUnique: jest.fn(async ({ where }: any) => ({ parishId: where.id === 'c-longe' ? 'p-outra' : 'p1' })) },
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
      getCommunityScopeIds: jest.fn(async (u: any) => (u?.communityId ? [u.communityId] : [])),
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
        where: { member: expect.objectContaining({ communityId: { in: ['c1'] } }) },
      }),
    );
  });
  describe('escopo financeiro (A3/C4)', () => {
    const dioPG = { id: 'd1', role: UserRole.DIOCESAN_ADMIN, dioceseId: 'dio-pg' } as any;
    const dioSemDiocese = { id: 'd2', role: UserRole.DIOCESAN_ADMIN, dioceseId: null } as any;
    const parishAdminSemComunidade = { id: 'p1u', role: UserRole.PARISH_ADMIN, parishId: 'p1', communityId: null } as any;
    const parishAdminSemParoquia = { id: 'p2u', role: UserRole.PARISH_ADMIN, parishId: null, communityId: null } as any;
    const system = { id: 'sys', role: UserRole.SYSTEM_ADMIN } as any;

    it('A3: DIOCESAN_ADMIN lista lançamentos SÓ das paróquias da própria diocese', async () => {
      await service.listTransactions(dioPG, {});
      expect(prisma.financialTransaction.findMany.mock.calls[0][0].where).toEqual({ parishId: { in: ['p1', 'p2'] } });
    });

    it('A3: resumo do DIOCESAN_ADMIN usa o mesmo recorte', async () => {
      await service.summary(dioPG, {});
      expect(prisma.financialTransaction.findMany.mock.calls[0][0].where).toEqual({ parishId: { in: ['p1', 'p2'] } });
    });

    it('A3: DIOCESAN_ADMIN lista dizimistas só da própria diocese', async () => {
      await service.listTithers(dioPG);
      expect(prisma.tither.findMany.mock.calls[0][0].where).toEqual({
        member: { deletedAt: null, community: { parishId: { in: ['p1', 'p2'] } } },
      });
    });

    it('A3: administrador sem diocese/paróquia no cadastro recebe 403 (nunca "where vazio")', async () => {
      await expect(service.listTransactions(dioSemDiocese, {})).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.listTithers(parishAdminSemParoquia)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.contributionsByMonth('2026-08', parishAdminSemParoquia)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.financialTransaction.findMany).not.toHaveBeenCalled();
      expect(prisma.titheContribution.findMany).not.toHaveBeenCalled();
    });

    it('filtro por comunidade fora do escopo financeiro → 403', async () => {
      await expect(service.listTransactions(dioPG, { communityId: 'c-longe' })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await expect(service.listTransactions(coord, { communityId: 'c-outra' })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('filtro por comunidade da própria diocese segue (caminho legítimo)', async () => {
      await service.listTransactions(dioPG, { communityId: 'c1' });
      expect(prisma.financialTransaction.findMany.mock.calls[0][0].where).toEqual({
        parishId: { in: ['p1', 'p2'] },
        communityId: 'c1',
      });
    });

    it('C4: PARISH_ADMIN sem comunidade só recebe contribuições da PRÓPRIA paróquia, recortadas no banco', async () => {
      await service.contributionsByMonth('2026-08', parishAdminSemComunidade);
      expect(prisma.titheContribution.findMany.mock.calls[0][0].where).toEqual({
        referenceMonth: '2026-08',
        tither: { member: { community: { parishId: { in: ['p1'] } } } },
      });
    });

    it('C4: coordenador recebe só as da comunidade dele', async () => {
      await service.contributionsByMonth('2026-08', coord);
      expect(prisma.titheContribution.findMany.mock.calls[0][0].where).toEqual({
        referenceMonth: '2026-08',
        tither: { member: { communityId: { in: ['c1'] } } },
      });
    });

    it('C4: sem mês nunca devolve o histórico inteiro — vale o mês corrente', async () => {
      await service.contributionsByMonth(undefined, system);
      expect(prisma.titheContribution.findMany.mock.calls[0][0].where).toEqual({ referenceMonth: currentMonthBR() });
    });

    it('C4: mês fora do formato AAAA-MM → 400', async () => {
      await expect(service.contributionsByMonth('2026-13', coord)).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.contributionsByMonth('agosto', coord)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.titheContribution.findMany).not.toHaveBeenCalled();
    });

    it('lançar contribuição exige mês AAAA-MM', async () => {
      prisma.tither.findUnique.mockResolvedValue({ id: 't1', memberId: 'm1', member: { communityId: 'c1' } });
      await expect(
        service.addContribution({ titherId: 't1', amount: 50, date: '2026-07-10', referenceMonth: '07/2026', method: 'PIX' }, coord),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
