import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
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
      pastoralPlan: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      pastoralObjective: { create: jest.fn(), findUnique: jest.fn() },
      pastoralAction: { create: jest.fn().mockResolvedValue({ id: 'ac1' }) },
      community: { findUnique: jest.fn().mockResolvedValue({ parishId: 'p1' }) },
      member: { findFirst: jest.fn() },
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
  describe('GET /planning/plans — escopo (negar por padrão)', () => {
    it('sem paróquia: lista vazia, sem consulta (antes: planos do país)', async () => {
      await expect(
        service.listPlans({ id: 'd', role: UserRole.DIOCESAN_ADMIN, dioceseId: 'd1' } as any),
      ).resolves.toEqual([]);
      await expect(
        service.listPlans({ id: 'c', role: UserRole.COMMUNITY_COORDINATOR, communityId: 'c1' } as any),
      ).resolves.toEqual([]);
      expect(prisma.pastoralPlan.findMany).not.toHaveBeenCalled();
    });

    it('com paróquia: só os planos dela; SYSTEM_ADMIN sem filtro', async () => {
      await service.listPlans(coord);
      expect(prisma.pastoralPlan.findMany.mock.calls[0][0].where).toEqual({ deletedAt: null, parishId: 'p1' });
      await service.listPlans({ id: 's', role: UserRole.SYSTEM_ADMIN } as any);
      expect(prisma.pastoralPlan.findMany.mock.calls[1][0].where).toEqual({ deletedAt: null });
    });
  });

  describe('ids do body', () => {
    it('createPlan: comunidade de outra paróquia é recusada', async () => {
      prisma.community.findUnique.mockResolvedValue({ parishId: 'p2' });
      await expect(
        service.createPlan({ title: 'Plano', year: 2026, communityId: 'c9' }, coord),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.pastoralPlan.create).not.toHaveBeenCalled();
    });

    it('createPlan: comunidade da própria paróquia é aceita', async () => {
      prisma.pastoralPlan.create.mockResolvedValue({ id: 'pl2' });
      await service.createPlan({ title: 'Plano', year: 2026, communityId: 'c1' }, coord);
      expect(prisma.pastoralPlan.create.mock.calls[0][0].data).toMatchObject({ parishId: 'p1', communityId: 'c1' });
    });

    it('addAction: responsável de outra paróquia é recusado; da paróquia, aceito', async () => {
      prisma.pastoralObjective.findUnique.mockResolvedValue({ id: 'o1', plan: { parishId: 'p1' } });
      prisma.member.findFirst.mockResolvedValue(null);
      await expect(
        service.addAction('o1', { title: 'Visitar famílias', responsibleMemberId: 'm-x' }, coord),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.pastoralAction.create).not.toHaveBeenCalled();

      prisma.member.findFirst.mockResolvedValue({ id: 'm1' });
      await service.addAction('o1', { title: 'Visitar famílias', responsibleMemberId: 'm1' }, coord);
      expect(prisma.member.findFirst.mock.calls[1][0].where.OR[0]).toEqual({ community: { parishId: 'p1' } });
      expect(prisma.pastoralAction.create).toHaveBeenCalled();
    });
  });
});
