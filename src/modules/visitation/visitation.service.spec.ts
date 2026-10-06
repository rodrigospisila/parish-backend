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
      visitRequest: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      member: { findFirst: jest.fn() },
      visit: { findMany: jest.fn().mockResolvedValue([]) },
      pastoralMember: { findMany: jest.fn().mockResolvedValue([]) },
      pastoralCoordinator: { findMany: jest.fn().mockResolvedValue([]) },
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
    const stranger = { id: 'u9', role: UserRole.PARISH_ADMIN, parishId: 'p1', pastoralIds: [], coordinatedPastoralIds: [] } as any;
    await expect(service.getRequestWithVisits('vr1', stranger)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('coordenador da pastoral de visitação vê as anotações', async () => {
    prisma.visitRequest.findFirst.mockResolvedValue({ id: 'vr1', communityId: 'c1', communityPastoralId: 'pastoral-visita' });
    prisma.visitRequest.findUnique.mockResolvedValue({ id: 'vr1', visits: [] });

    const coordinator = {
      id: 'u1',
      role: UserRole.PASTORAL_COORDINATOR,
      communityId: 'c1',
      pastoralIds: ['pastoral-visita'],
      coordinatedPastoralIds: ['pastoral-visita'],
    } as any;
    await expect(service.getRequestWithVisits('vr1', coordinator)).resolves.toBeDefined();
  });

  // A13 — membro (não coordenador) da pastoral de visitação
  it('ser só MEMBRO da pastoral de visitação não abre as anotações (saúde/luto)', async () => {
    prisma.visitRequest.findFirst.mockResolvedValue({ id: 'vr1', communityId: 'c1', communityPastoralId: 'pastoral-visita' });
    prisma.member.findFirst.mockResolvedValue({ id: 'm20' });
    prisma.visit.findMany.mockResolvedValue([{ visitorMemberIds: 'outro' }]);

    const memberOnly = {
      id: 'u20',
      role: UserRole.PASTORAL_COORDINATOR,
      communityId: 'c1',
      pastoralIds: ['pastoral-visita', 'cp-musica'],
      coordinatedPastoralIds: ['cp-musica'],
    } as any;
    await expect(service.getRequestWithVisits('vr1', memberOnly)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.registerVisit('vr1', { date: '2026-10-01', notes: 'x' }, memberOnly),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('sessão antiga (sem coordinatedPastoralIds) não usa pastoralIds para liberar anotações', async () => {
    prisma.visitRequest.findFirst.mockResolvedValue({ id: 'vr1', communityId: 'c1', communityPastoralId: 'pastoral-visita' });
    prisma.member.findFirst.mockResolvedValue(null);
    const legacy = { id: 'u20', role: UserRole.PASTORAL_COORDINATOR, communityId: 'c1', pastoralIds: ['pastoral-visita'] } as any;
    await expect(service.getRequestWithVisits('vr1', legacy)).rejects.toBeInstanceOf(ForbiddenException);
  });

  // A14 — listagem com escopo hierárquico
  describe('listRequests — escopo', () => {
    it('diocesano sem diocese → lista vazia, sem consulta', async () => {
      await expect(service.listRequests({ id: 'd', role: UserRole.DIOCESAN_ADMIN } as any)).resolves.toEqual([]);
      expect(prisma.visitRequest.findMany).not.toHaveBeenCalled();
    });

    it('diocesano vê só a própria diocese', async () => {
      await service.listRequests({ id: 'd', role: UserRole.DIOCESAN_ADMIN, dioceseId: 'd1' } as any);
      expect(prisma.visitRequest.findMany.mock.calls[0][0].where).toEqual({
        deletedAt: null,
        community: { parish: { dioceseId: 'd1' } },
      });
    });

    it('coordenador de comunidade sem comunidade → vazio', async () => {
      await expect(
        service.listRequests({ id: 'c', role: UserRole.COMMUNITY_COORDINATOR, parishId: 'p1' } as any),
      ).resolves.toEqual([]);
      expect(prisma.visitRequest.findMany).not.toHaveBeenCalled();
    });

    it('PASTORAL_COORDINATOR sem coordenação vigente → vazio; com coordenação → só as pastorais coordenadas', async () => {
      const memberOnly = { id: 'u20', role: UserRole.PASTORAL_COORDINATOR, pastoralIds: ['pv'], coordinatedPastoralIds: [] } as any;
      await expect(service.listRequests(memberOnly)).resolves.toEqual([]);
      expect(prisma.visitRequest.findMany).not.toHaveBeenCalled();

      const coord = { id: 'u1', role: UserRole.PASTORAL_COORDINATOR, pastoralIds: ['pv', 'px'], coordinatedPastoralIds: ['pv'] } as any;
      await service.listRequests(coord);
      expect(prisma.visitRequest.findMany.mock.calls[0][0].where).toEqual({
        deletedAt: null,
        communityPastoralId: { in: ['pv'] },
      });
    });

    it('PARISH_ADMIN vê a própria paróquia', async () => {
      await service.listRequests({ id: 'a', role: UserRole.PARISH_ADMIN, parishId: 'p1' } as any);
      expect(prisma.visitRequest.findMany.mock.calls[0][0].where).toEqual({
        deletedAt: null,
        community: { parishId: 'p1' },
      });
    });
  });
});
