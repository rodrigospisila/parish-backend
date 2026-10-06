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

    const communityScope = (communityId: string) => ({
      OR: [
        { communityId },
        { communityLinks: { some: { communityId, isActive: true } } },
      ],
    });

    it('COMMUNITY_COORDINATOR restringe pela comunidade (principal ou vínculo secundário ativo)', () => {
      const where = service.applyMemberFilter(
        user({ role: UserRole.COMMUNITY_COORDINATOR, communityId: 'c1' }),
      );
      expect(where).toEqual(communityScope('c1'));
    });

    it('FAITHFUL NÃO lista a comunidade: só o próprio cadastro e os dependentes (C6)', () => {
      const where = service.applyMemberFilter(
        user({ role: UserRole.FAITHFUL, communityId: 'c1', member: { id: 'm-self' } }),
      );
      expect(where).toEqual({ OR: [{ id: 'm-self' }, { responsibleId: 'm-self' }] });
    });

    it('VOLUNTEER também só enxerga o próprio cadastro e os dependentes (C6)', () => {
      const where = service.applyMemberFilter(
        user({ role: UserRole.VOLUNTEER, communityId: 'c1', member: { id: 'm-vol' } }),
      );
      expect(where).toEqual({ OR: [{ id: 'm-vol' }, { responsibleId: 'm-vol' }] });
    });

    it('PASTORAL_COORDINATOR enxerga todos os membros da comunidade (edição segue por canManageMember)', () => {
      const where = service.applyMemberFilter(
        user({ role: UserRole.PASTORAL_COORDINATOR, communityId: 'c1', pastoralIds: ['pa1', 'pa2'] }),
      );
      expect(where).toEqual(communityScope('c1'));
    });

    describe('negar por padrão (escopo não resolvido nunca vira {})', () => {
      const none = { id: '__none__' };
      it.each([
        ['FAITHFUL sem cadastro de membro', { role: UserRole.FAITHFUL, communityId: 'c1' }],
        ['FAITHFUL sem comunidade nem membro', { role: UserRole.FAITHFUL }],
        ['VOLUNTEER sem membro', { role: UserRole.VOLUNTEER }],
        ['COMMUNITY_COORDINATOR sem comunidade', { role: UserRole.COMMUNITY_COORDINATOR }],
        ['PASTORAL_COORDINATOR sem comunidade', { role: UserRole.PASTORAL_COORDINATOR, pastoralIds: ['pa1'] }],
        ['PARISH_ADMIN sem paróquia', { role: UserRole.PARISH_ADMIN }],
        ['DIOCESAN_ADMIN sem diocese', { role: UserRole.DIOCESAN_ADMIN }],
        ['papel desconhecido', { role: 'HACKER' as UserRole, communityId: 'c1' }],
      ])('%s → filtro impossível', (_label, partial) => {
        expect(service.applyMemberFilter(user(partial as Partial<CurrentUser>))).toEqual(none);
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

    it('PASTORAL_COORDINATOR sem comunidade mas com pastorais vê os eventos das pastorais', () => {
      const where = service.applyEventFilter(
        user({ role: UserRole.PASTORAL_COORDINATOR, pastoralIds: ['pa1'] }),
      );
      expect(where).toEqual({
        OR: [{ eventPastorals: { some: { communityPastoralId: { in: ['pa1'] } } } }],
      });
    });

    it.each([
      ['FAITHFUL sem comunidade', { role: UserRole.FAITHFUL }],
      ['VOLUNTEER sem comunidade', { role: UserRole.VOLUNTEER }],
      ['COMMUNITY_COORDINATOR sem comunidade', { role: UserRole.COMMUNITY_COORDINATOR }],
      ['PASTORAL_COORDINATOR sem comunidade e sem pastorais', { role: UserRole.PASTORAL_COORDINATOR }],
      ['PARISH_ADMIN sem paróquia', { role: UserRole.PARISH_ADMIN }],
      ['DIOCESAN_ADMIN sem diocese', { role: UserRole.DIOCESAN_ADMIN }],
      ['papel desconhecido', { role: 'HACKER' as UserRole }],
    ])('%s → filtro impossível (A5)', (_label, partial) => {
      expect(service.applyEventFilter(user(partial as Partial<CurrentUser>))).toEqual({ id: '__none__' });
    });
  });

  describe('applyScheduleFilter', () => {
    it('SYSTEM_ADMIN sem filtro', () => {
      expect(service.applyScheduleFilter(user({ role: UserRole.SYSTEM_ADMIN }))).toEqual({});
    });

    it('FAITHFUL com comunidade: escalas com evento ou avulsas da comunidade', () => {
      expect(service.applyScheduleFilter(user({ role: UserRole.FAITHFUL, communityId: 'c1' }))).toEqual({
        OR: [
          { event: { communityId: 'c1' } },
          { AND: [{ eventId: null }, { communityId: 'c1' }] },
        ],
      });
    });

    it('PASTORAL_COORDINATOR com pastorais: pelas pastorais (mesmo sem comunidade)', () => {
      expect(
        service.applyScheduleFilter(user({ role: UserRole.PASTORAL_COORDINATOR, pastoralIds: ['pa1'] })),
      ).toEqual({
        OR: [
          { event: { eventPastorals: { some: { communityPastoralId: { in: ['pa1'] } } } } },
          { AND: [{ eventId: null }, { pastorals: { some: { communityPastoralId: { in: ['pa1'] } } } }] },
        ],
      });
    });

    it.each([
      ['FAITHFUL sem comunidade', { role: UserRole.FAITHFUL }],
      ['VOLUNTEER sem comunidade', { role: UserRole.VOLUNTEER }],
      ['COMMUNITY_COORDINATOR sem comunidade', { role: UserRole.COMMUNITY_COORDINATOR }],
      ['PASTORAL_COORDINATOR sem comunidade e sem pastorais', { role: UserRole.PASTORAL_COORDINATOR }],
      ['PARISH_ADMIN sem paróquia', { role: UserRole.PARISH_ADMIN }],
      ['DIOCESAN_ADMIN sem diocese', { role: UserRole.DIOCESAN_ADMIN }],
      ['papel desconhecido', { role: 'HACKER' as UserRole }],
    ])('%s → filtro impossível (A5)', (_label, partial) => {
      expect(service.applyScheduleFilter(user(partial as Partial<CurrentUser>))).toEqual({ id: '__none__' });
    });
  });

  describe('applyParishFilter', () => {
    it('papel de comunidade sem paróquia → filtro impossível', () => {
      expect(service.applyParishFilter(user({ role: UserRole.FAITHFUL }))).toEqual({ id: '__none__' });
    });

    it('PARISH_ADMIN com paróquia → a própria', () => {
      expect(service.applyParishFilter(user({ role: UserRole.PARISH_ADMIN, parishId: 'p1' }))).toEqual({ id: 'p1' });
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
