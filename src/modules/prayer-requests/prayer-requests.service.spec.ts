import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { UserRole, PrayerRequestStatus } from '@prisma/client';
import { PrayerRequestsService } from './prayer-requests.service';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';

describe('PrayerRequestsService (blindagem - Fase 0)', () => {
  let service: PrayerRequestsService;
  let prisma: {
    prayerRequest: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock };
    community: { findUnique: jest.Mock };
    member: { findUnique: jest.Mock; findFirst: jest.Mock };
  };
  let hierarchy: { isCommunityInScope: jest.Mock };
  let audit: { log: jest.Mock };

  beforeEach(async () => {
    prisma = {
      prayerRequest: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
      community: { findUnique: jest.fn() },
      member: { findUnique: jest.fn(), findFirst: jest.fn() },
    };
    hierarchy = { isCommunityInScope: jest.fn() };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrayerRequestsService,
        { provide: PrismaService, useValue: prisma },
        { provide: HierarchyService, useValue: hierarchy },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<PrayerRequestsService>(PrayerRequestsService);
  });

  describe('anonimato (item 0.3)', () => {
    const anonymousRequest = {
      id: 'pr-1',
      isAnonymous: true,
      member: { id: 'member-1', fullName: 'Maria da Silva' },
    };

    it('findApproved NUNCA expõe o autor de pedido anônimo', async () => {
      prisma.prayerRequest.findMany.mockResolvedValue([
        anonymousRequest,
        { id: 'pr-2', isAnonymous: false, member: { id: 'member-2', fullName: 'José' } },
      ]);

      const result = await service.findApproved();

      expect(result[0].member).toBeNull();
      expect(result[1].member).toEqual({ id: 'member-2', fullName: 'José' });
    });

    it('findOne mascara o autor para usuário comum (FAITHFUL)', async () => {
      prisma.prayerRequest.findUnique.mockResolvedValue({
        ...anonymousRequest,
        memberId: 'member-1',
        community: { id: 'c1' },
      });

      const result = await service.findOne('pr-1', { id: 'u1', role: UserRole.FAITHFUL } as any);

      expect(result.member).toBeNull();
      expect(result.memberId).toBeNull();
    });

    it('findOne preserva o autor para moderador (COMMUNITY_COORDINATOR+)', async () => {
      prisma.prayerRequest.findUnique.mockResolvedValue({
        ...anonymousRequest,
        memberId: 'member-1',
        community: { id: 'c1' },
      });

      const result = await service.findOne('pr-1', {
        id: 'u1',
        role: UserRole.COMMUNITY_COORDINATOR,
      } as any);

      expect(result.member).toEqual({ id: 'member-1', fullName: 'Maria da Silva' });
    });
  });

  describe('escopo na criação (item 0.1)', () => {
    it('nega criar pedido para comunidade fora do escopo do solicitante', async () => {
      prisma.community.findUnique.mockResolvedValue({ id: 'community-b' });
      hierarchy.isCommunityInScope.mockResolvedValue(false);

      const faithful = { id: 'u1', role: UserRole.FAITHFUL, communityId: 'community-a' } as any;

      await expect(
        service.create(
          { communityId: 'community-b', title: 't', description: 'd', category: 'HEALTH' } as any,
          faithful,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.prayerRequest.create).not.toHaveBeenCalled();
    });

    it('permite criar na própria comunidade, com status PENDING e auditoria', async () => {
      prisma.community.findUnique.mockResolvedValue({ id: 'community-a' });
      hierarchy.isCommunityInScope.mockResolvedValue(true);
      prisma.member.findFirst.mockResolvedValue({ id: 'member-own' });
      prisma.prayerRequest.create.mockResolvedValue({
        id: 'pr-1',
        isAnonymous: false,
        category: 'HEALTH',
      });

      const faithful = { id: 'u1', role: UserRole.FAITHFUL, communityId: 'community-a' } as any;
      await service.create(
        // memberId alheio no corpo é ignorado para fiel: autor é o próprio membro
        { communityId: 'community-a', title: 't', description: 'd', category: 'HEALTH', memberId: 'member-other' } as any,
        faithful,
      );

      const createCall = prisma.prayerRequest.create.mock.calls[0][0];
      expect(createCall.data.status).toBe(PrayerRequestStatus.PENDING);
      expect(createCall.data.memberId).toBe('member-own');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE', entity: 'PrayerRequest' }),
      );
    });
  });
});
