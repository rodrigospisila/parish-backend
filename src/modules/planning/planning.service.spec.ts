import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PlanningService } from './planning.service';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';

describe('PlanningService (3.2)', () => {
  let service: PlanningService;
  let prisma: any;
  let hierarchy: { isCommunityInScope: jest.Mock; canManageEvent: jest.Mock };

  const coord = { id: 'u1', role: UserRole.PASTORAL_COORDINATOR, parishId: 'p1' } as any;

  beforeEach(async () => {
    prisma = {
      pastoralPlan: { create: jest.fn(), findFirst: jest.fn() },
      pastoralObjective: { create: jest.fn(), findUnique: jest.fn() },
      event: { findFirst: jest.fn(), update: jest.fn() },
    };
    hierarchy = { isCommunityInScope: jest.fn().mockResolvedValue(true), canManageEvent: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanningService,
        { provide: PrismaService, useValue: prisma },
        { provide: HierarchyService, useValue: hierarchy },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();
    service = module.get<PlanningService>(PlanningService);
  });

  it('FAITHFUL não cria plano pastoral', async () => {
    await expect(
      service.createPlan({ title: 'Plano', year: 2026 }, { id: 'u', role: UserRole.FAITHFUL, parishId: 'p1' } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('coordenador cria plano na sua paróquia', async () => {
    prisma.pastoralPlan.create.mockResolvedValue({ id: 'pl1' });
    await service.createPlan({ title: 'Plano 2026', year: 2026 }, coord);
    const arg = prisma.pastoralPlan.create.mock.calls[0][0];
    expect(arg.data.parishId).toBe('p1');
  });

  describe('linkEventToObjective (elo atividade→objetivo)', () => {
    it('vincula evento a objetivo do escopo', async () => {
      prisma.event.findFirst.mockResolvedValue({ id: 'e1' });
      hierarchy.canManageEvent.mockResolvedValue(true);
      prisma.pastoralObjective.findUnique.mockResolvedValue({ id: 'o1', plan: { parishId: 'p1' } });
      prisma.event.update.mockResolvedValue({ id: 'e1', objectiveId: 'o1' });

      await service.linkEventToObjective('e1', 'o1', coord);
      expect(prisma.event.update).toHaveBeenCalledWith({ where: { id: 'e1' }, data: { objectiveId: 'o1' } });
    });

    it('nega quando o usuário não pode gerenciar o evento', async () => {
      prisma.event.findFirst.mockResolvedValue({ id: 'e1' });
      hierarchy.canManageEvent.mockResolvedValue(false);

      await expect(service.linkEventToObjective('e1', 'o1', coord)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
