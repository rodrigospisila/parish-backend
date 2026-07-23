import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { HierarchyService, CurrentUser } from './hierarchy.service';
import { PrismaService } from '../database/prisma.service';

/**
 * Testa os filtros de escopo (núcleo do isolamento de dados). São funções puras
 * que traduzem o papel do usuário em cláusulas `where` do Prisma.
 */
describe('HierarchyService (filtros de escopo)', () => {
  let service: HierarchyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HierarchyService, { provide: PrismaService, useValue: {} }],
    }).compile();
    service = module.get<HierarchyService>(HierarchyService);
  });

  const user = (partial: Partial<CurrentUser>): CurrentUser =>
    ({ id: 'u1', role: UserRole.FAITHFUL, ...partial } as CurrentUser);

  describe('applyMemberFilter', () => {
    it('SYSTEM_ADMIN não tem filtro (vê tudo)', () => {
      expect(service.applyMemberFilter(user({ role: UserRole.SYSTEM_ADMIN }))).toEqual({});
    });

    it('DIOCESAN_ADMIN restringe pela diocese', () => {
      const where = service.applyMemberFilter(
        user({ role: UserRole.DIOCESAN_ADMIN, dioceseId: 'd1' }),
      );
      expect(where).toEqual({ community: { parish: { dioceseId: 'd1' } } });
    });

    it('PARISH_ADMIN restringe pela paróquia', () => {
      const where = service.applyMemberFilter(user({ role: UserRole.PARISH_ADMIN, parishId: 'p1' }));
      expect(where).toEqual({ community: { parishId: 'p1' } });
    });

    it('COMMUNITY_COORDINATOR restringe pela comunidade', () => {
      const where = service.applyMemberFilter(
        user({ role: UserRole.COMMUNITY_COORDINATOR, communityId: 'c1' }),
      );
      expect(where).toEqual({ communityId: 'c1' });
    });

    it('FAITHFUL restringe pela própria comunidade', () => {
      const where = service.applyMemberFilter(user({ role: UserRole.FAITHFUL, communityId: 'c1' }));
      expect(where).toEqual({ communityId: 'c1' });
    });

    it('PASTORAL_COORDINATOR restringe pelas pastorais que coordena', () => {
      const where = service.applyMemberFilter(
        user({ role: UserRole.PASTORAL_COORDINATOR, pastoralIds: ['pa1', 'pa2'] }),
      );
      expect(where).toEqual({
        pastoralMemberships: {
          some: { communityPastoralId: { in: ['pa1', 'pa2'] }, isActive: true },
        },
      });
    });
  });

  describe('applyEventFilter', () => {
    it('PARISH_ADMIN vê eventos da própria paróquia', () => {
      const where = service.applyEventFilter(user({ role: UserRole.PARISH_ADMIN, parishId: 'p1' }));
      expect(where).toEqual({ community: { parishId: 'p1' } });
    });

    it('VOLUNTEER vê apenas eventos da sua comunidade', () => {
      const where = service.applyEventFilter(user({ role: UserRole.VOLUNTEER, communityId: 'c1' }));
      expect(where).toEqual({ communityId: 'c1' });
    });
  });

  describe('isCommunityInScope', () => {
    it('SYSTEM_ADMIN sempre em escopo', async () => {
      await expect(
        service.isCommunityInScope(user({ role: UserRole.SYSTEM_ADMIN }), 'qualquer'),
      ).resolves.toBe(true);
    });

    it('usuário na própria comunidade está em escopo', async () => {
      await expect(
        service.isCommunityInScope(
          user({ role: UserRole.FAITHFUL, communityId: 'c1' }),
          'c1',
        ),
      ).resolves.toBe(true);
    });

    it('usuário de comunidade diferente NÃO está em escopo', async () => {
      await expect(
        service.isCommunityInScope(
          user({ role: UserRole.FAITHFUL, communityId: 'c1', communities: [] }),
          'c2',
        ),
      ).resolves.toBe(false);
    });
  });
});
