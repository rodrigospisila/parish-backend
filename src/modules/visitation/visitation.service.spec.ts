import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole, VisitReason } from '@prisma/client';
import { VisitationService } from './visitation.service';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';

describe('VisitationService (4.5 — privacidade)', () => {
  let service: VisitationService;
  let prisma: any;
  let hierarchy: { isCommunityInScope: jest.Mock };

  beforeEach(async () => {
    prisma = {
      visitRequest: { create: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn() },
      member: { findFirst: jest.fn() },
      visit: { findMany: jest.fn().mockResolvedValue([]) },
    };
    hierarchy = { isCommunityInScope: jest.fn().mockResolvedValue(true) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisitationService,
        { provide: PrismaService, useValue: prisma },
        { provide: HierarchyService, useValue: hierarchy },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();
    service = module.get<VisitationService>(VisitationService);
  });

  it('exige consentimento explícito ao criar pedido de visita', async () => {
    await expect(
      service.createRequest(
        { communityId: 'c1', personName: 'Dona Maria', reason: VisitReason.SICK, consentGiven: false },
        { id: 'u1', role: UserRole.PASTORAL_COORDINATOR, communityId: 'c1' } as any,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('anotações são negadas a quem não é coordenador da pastoral nem visitador', async () => {
    prisma.visitRequest.findFirst.mockResolvedValue({ id: 'vr1', communityId: 'c1', communityPastoralId: 'pastoral-visita' });
    prisma.member.findFirst.mockResolvedValue({ id: 'algum-membro' }); // não é visitador
    prisma.visit.findMany.mockResolvedValue([{ visitorMemberIds: 'outro' }]);

    // usuário sem a pastoral e não visitador
    const stranger = { id: 'u9', role: UserRole.PARISH_ADMIN, parishId: 'p1', pastoralIds: [] } as any;
    await expect(service.getRequestWithVisits('vr1', stranger)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('coordenador da pastoral de visitação vê as anotações', async () => {
    prisma.visitRequest.findFirst.mockResolvedValue({ id: 'vr1', communityId: 'c1', communityPastoralId: 'pastoral-visita' });
    prisma.visitRequest.findUnique.mockResolvedValue({ id: 'vr1', visits: [] });

    const coordinator = { id: 'u1', role: UserRole.PASTORAL_COORDINATOR, communityId: 'c1', pastoralIds: ['pastoral-visita'] } as any;
    await expect(service.getRequestWithVisits('vr1', coordinator)).resolves.toBeDefined();
  });
});
