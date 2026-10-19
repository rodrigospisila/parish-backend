import { UserRole } from '@prisma/client';
import { CurrentUser, HierarchyService } from './hierarchy.service';

/**
 * Onda 2 da auditoria:
 * - isCommunityInScope aceitava qualquer vínculo ativo de UserCommunity antes
 *   de olhar o papel — o "vínculo de fé" do gestor virava escopo de ESCRITA
 *   (mural, escalas, finanças, salas...) em comunidade de outra paróquia;
 * - applyEventFilter/applyScheduleFilter davam ao coordenador de pastoral os
 *   eventos/escalas das pastorais em que só PARTICIPA.
 */
describe('HierarchyService — escopo de gestão x vínculo de fé (onda 2)', () => {
  // c1, c2 na paróquia p1 (diocese d1); cX na paróquia pX (diocese dX)
  const communities: Record<string, any> = {
    c1: { id: 'c1', parishId: 'p1', parish: { dioceseId: 'd1' } },
    c2: { id: 'c2', parishId: 'p1', parish: { dioceseId: 'd1' } },
    cX: { id: 'cX', parishId: 'pX', parish: { dioceseId: 'dX' } },
  };
  const prisma: any = {
    community: {
      findUnique: jest.fn(async ({ where }: any) => communities[where.id] ?? null),
      findMany: jest.fn(async ({ where }: any) =>
        Object.values(communities).filter((c: any) => where.id.in.includes(c.id) && c.parishId === where.parishId),
      ),
    },
  };
  const service = new HierarchyService(prisma);
  const user = (partial: Partial<CurrentUser>): CurrentUser => ({ id: 'u', role: UserRole.FAITHFUL, ...partial }) as CurrentUser;
  const faithLink = (communityId: string, role: UserRole = UserRole.FAITHFUL) => ({ communityId, isActive: true, role });

  describe('isCommunityInScope', () => {
    it.each([
      ['PARISH_ADMIN', { role: UserRole.PARISH_ADMIN, dioceseId: 'd1', parishId: 'p1' }],
      ['DIOCESAN_ADMIN', { role: UserRole.DIOCESAN_ADMIN, dioceseId: 'd1' }],
      ['COMMUNITY_COORDINATOR', { role: UserRole.COMMUNITY_COORDINATOR, parishId: 'p1', communityId: 'c1' }],
      ['PASTORAL_COORDINATOR', { role: UserRole.PASTORAL_COORDINATOR, parishId: 'p1', communityId: 'c1' }],
    ])('%s: vínculo de fé em comunidade de outra paróquia NÃO amplia escopo', async (_label, partial) => {
      const actor = user({ ...(partial as any), communities: [faithLink('cX'), faithLink('cX', (partial as any).role)] });
      await expect(service.isCommunityInScope(actor, 'cX')).resolves.toBe(false);
    });

    it('caminho legítimo: admins dentro da própria paróquia/diocese', async () => {
      await expect(
        service.isCommunityInScope(user({ role: UserRole.PARISH_ADMIN, parishId: 'p1' }), 'c2'),
      ).resolves.toBe(true);
      await expect(
        service.isCommunityInScope(user({ role: UserRole.DIOCESAN_ADMIN, dioceseId: 'd1' }), 'c2'),
      ).resolves.toBe(true);
    });

    it('admin sem âncora (paróquia/diocese) → fora de escopo mesmo com vínculos', async () => {
      await expect(
        service.isCommunityInScope(user({ role: UserRole.PARISH_ADMIN, communities: [faithLink('c1')] }), 'c1'),
      ).resolves.toBe(false);
    });

    it('coordenador de comunidade: outra comunidade ATRIBUÍDA (vínculo com o mesmo papel, mesma paróquia) vale', async () => {
      const coord = user({
        role: UserRole.COMMUNITY_COORDINATOR,
        parishId: 'p1',
        communityId: 'c1',
        communities: [faithLink('c2', UserRole.COMMUNITY_COORDINATOR)],
      });
      await expect(service.isCommunityInScope(coord, 'c1')).resolves.toBe(true);
      await expect(service.isCommunityInScope(coord, 'c2')).resolves.toBe(true);
    });

    it('coordenador de comunidade: vínculo de fé (papel FAITHFUL ou sem papel) na mesma paróquia não vale', async () => {
      const coord = user({
        role: UserRole.COMMUNITY_COORDINATOR,
        parishId: 'p1',
        communityId: 'c1',
        communities: [faithLink('c2'), { communityId: 'c2', isActive: true }],
      });
      await expect(service.isCommunityInScope(coord, 'c2')).resolves.toBe(false);
    });

    it('fiel/voluntário: principal e vínculos ativos continuam valendo (mural, agenda — vínculo aberto)', async () => {
      const faithful = user({ role: UserRole.FAITHFUL, communityId: 'c1', communities: [faithLink('cX')] });
      await expect(service.isCommunityInScope(faithful, 'c1')).resolves.toBe(true);
      await expect(service.isCommunityInScope(faithful, 'cX')).resolves.toBe(true);
      await expect(
        service.isCommunityInScope(
          user({ role: UserRole.VOLUNTEER, communities: [{ communityId: 'cX', isActive: false }] }),
          'cX',
        ),
      ).resolves.toBe(false);
    });

    it('papel desconhecido → negado', async () => {
      await expect(
        service.isCommunityInScope(user({ role: 'HACKER' as UserRole, communityId: 'c1' }), 'c1'),
      ).resolves.toBe(false);
    });
  });

  describe('getCommunityScopeIds (finanças, painel, moderação, balancetes)', () => {
    it('coordenador de comunidade: vínculo de fé não entra; vínculo de gestão só na própria paróquia', async () => {
      const cc = user({
        role: UserRole.COMMUNITY_COORDINATOR,
        parishId: 'p1',
        communityId: 'c1',
        communities: [
          faithLink('cX'),
          faithLink('c2', UserRole.COMMUNITY_COORDINATOR),
          faithLink('cX', UserRole.COMMUNITY_COORDINATOR),
        ],
      });
      await expect(service.getCommunityScopeIds(cc)).resolves.toEqual(['c1', 'c2']);
    });

    it('coordenador de pastoral: só a principal, mesmo com vínculos', async () => {
      const pcu = user({ role: UserRole.PASTORAL_COORDINATOR, communityId: 'c1', communities: [faithLink('cX')] });
      await expect(service.getCommunityScopeIds(pcu)).resolves.toEqual(['c1']);
    });

    it('fiel: principal + vínculos ativos (leitura)', async () => {
      const f = user({ communityId: 'c1', communities: [faithLink('cX'), { communityId: 'c2', isActive: false }] });
      await expect(service.getCommunityScopeIds(f)).resolves.toEqual(['c1', 'cX']);
    });

    it('admin sem âncora ou papel desconhecido → vazio', async () => {
      await expect(service.getCommunityScopeIds(user({ role: UserRole.PARISH_ADMIN, communityId: 'c1' }))).resolves.toEqual([]);
      await expect(service.getCommunityScopeIds(user({ role: 'HACKER' as UserRole, communityId: 'c1' }))).resolves.toEqual([]);
    });
  });

  describe('coordenador de pastoral: coordenação, não participação', () => {
    const pc = (partial: Partial<CurrentUser>) =>
      user({ role: UserRole.PASTORAL_COORDINATOR, communityId: 'c1', ...partial });

    it('applyEventFilter ignora pastoralIds (participação)', () => {
      expect(service.applyEventFilter(pc({ pastoralIds: ['pa-participa'] }))).toEqual({ communityId: 'c1' });
      expect(service.applyEventFilter(pc({ pastoralIds: ['pa-participa'], coordinatedPastoralIds: [] }))).toEqual({
        communityId: 'c1',
      });
    });

    it('applyEventFilter usa coordinatedPastoralIds', () => {
      expect(service.applyEventFilter(pc({ pastoralIds: ['pa1', 'pa2'], coordinatedPastoralIds: ['pa1'] }))).toEqual({
        OR: [{ communityId: 'c1' }, { eventPastorals: { some: { communityPastoralId: { in: ['pa1'] } } } }],
      });
    });

    it('applyScheduleFilter: participação não abre escalas de outras comunidades', () => {
      expect(service.applyScheduleFilter(pc({ pastoralIds: ['pa-participa'] }))).toEqual({
        OR: [{ event: { communityId: 'c1' } }, { AND: [{ eventId: null }, { communityId: 'c1' }] }],
      });
      expect(service.applyScheduleFilter(pc({ communityId: undefined, pastoralIds: ['pa-participa'] }))).toEqual({
        id: '__none__',
      });
    });

    it('applyScheduleFilter usa coordinatedPastoralIds', () => {
      expect(service.applyScheduleFilter(pc({ coordinatedPastoralIds: ['pa1'] }))).toEqual({
        OR: [
          { event: { eventPastorals: { some: { communityPastoralId: { in: ['pa1'] } } } } },
          { AND: [{ eventId: null }, { pastorals: { some: { communityPastoralId: { in: ['pa1'] } } } }] },
        ],
      });
    });
  });

  describe('coordenador de várias comunidades (eng-acessos-06): listas seguem o escopo de gestão', () => {
    const cc = (partial: Partial<CurrentUser>) =>
      user({ role: UserRole.COMMUNITY_COORDINATOR, parishId: 'p1', communityId: 'c1', ...partial });
    const managed = { communityId: { in: ['c2'] }, community: { parishId: 'p1' } };
    const withLink = () => cc({ communities: [faithLink('c2', UserRole.COMMUNITY_COORDINATOR)] });

    it('sem comunidade atribuída: formato antigo (só a principal)', () => {
      expect(service.applyEventFilter(cc({}))).toEqual({ communityId: 'c1' });
      expect(service.applyScheduleFilter(cc({}))).toEqual({
        OR: [{ event: { communityId: 'c1' } }, { AND: [{ eventId: null }, { communityId: 'c1' }] }],
      });
      expect(service.applyMemberFilter(cc({}))).toEqual({
        OR: [{ communityId: 'c1' }, { communityLinks: { some: { communityId: 'c1', isActive: true } } }],
      });
    });

    it('eventos: principal + comunidade atribuída, presa à própria paróquia', () => {
      expect(service.applyEventFilter(withLink())).toEqual({ OR: [{ communityId: 'c1' }, managed] });
    });

    it('escalas (com e sem evento): principal + comunidade atribuída', () => {
      const clause = { OR: [{ communityId: 'c1' }, managed] };
      expect(service.applyScheduleFilter(withLink())).toEqual({
        OR: [{ event: clause }, { AND: [{ eventId: null }, clause] }],
      });
    });

    it('membros: principal e atribuída, inclusive vínculo secundário', () => {
      expect(service.applyMemberFilter(withLink())).toEqual({
        OR: [
          { communityId: 'c1' },
          { communityLinks: { some: { communityId: 'c1', isActive: true } } },
          managed,
          { communityLinks: { some: { ...managed, isActive: true } } },
        ],
      });
    });

    it('vínculo de fé (outro papel) não amplia nenhuma lista', () => {
      const actor = cc({ communities: [faithLink('c2'), faithLink('cX')] });
      expect(service.applyEventFilter(actor)).toEqual({ communityId: 'c1' });
      expect(JSON.stringify(service.applyScheduleFilter(actor))).not.toContain('c2');
      expect(JSON.stringify(service.applyMemberFilter(actor))).not.toContain('c2');
    });

    it('sem paróquia na sessão: só a principal (o vínculo não vale fora da paróquia)', () => {
      const actor = cc({ parishId: undefined, communities: [faithLink('c2', UserRole.COMMUNITY_COORDINATOR)] });
      expect(service.applyEventFilter(actor)).toEqual({ communityId: 'c1' });
    });

    it('coordenador de pastoral com vínculo de gestão: continua só a principal nos membros', () => {
      const actor = user({
        role: UserRole.PASTORAL_COORDINATOR,
        parishId: 'p1',
        communityId: 'c1',
        communities: [faithLink('c2', UserRole.PASTORAL_COORDINATOR)],
      });
      expect(JSON.stringify(service.applyMemberFilter(actor))).not.toContain('c2');
    });

    it('sem comunidade principal: negado (nunca "tudo")', () => {
      const actor = cc({ communityId: undefined, communities: [faithLink('c2', UserRole.COMMUNITY_COORDINATOR)] });
      expect(service.applyEventFilter(actor)).toEqual({ id: '__none__' });
      expect(service.applyScheduleFilter(actor)).toEqual({ id: '__none__' });
      expect(service.applyMemberFilter(actor)).toEqual({ id: '__none__' });
    });
  });

  describe('coordenador de várias comunidades: checagens de detalhe (resíduo eng-acessos-06)', () => {
    // Coordenador da c1 (paróquia p1) com a c2 atribuída; vínculo de FÉ na cX (outra paróquia) e na c3 (mesma paróquia)
    const dbUser = { id: 'coord', role: UserRole.COMMUNITY_COORDINATOR, communityId: 'c1', parishId: 'p1' };
    const links = [
      { userId: 'coord', communityId: 'c2', role: UserRole.COMMUNITY_COORDINATOR, isActive: true, parishId: 'p1' },
      { userId: 'coord', communityId: 'c3', role: UserRole.FAITHFUL, isActive: true, parishId: 'p1' },
      { userId: 'coord', communityId: 'cX', role: UserRole.COMMUNITY_COORDINATOR, isActive: true, parishId: 'pX' },
      { userId: 'coord', communityId: 'c4', role: UserRole.COMMUNITY_COORDINATOR, isActive: false, parishId: 'p1' },
    ];
    const parishOf: Record<string, string> = { c1: 'p1', c2: 'p1', c3: 'p1', c4: 'p1', cX: 'pX' };
    const db: any = {
      user: { findUnique: jest.fn(async () => ({ ...dbUser, member: { id: 'm-coord' } })) },
      userCommunity: {
        findFirst: jest.fn(async ({ where }: any) =>
          links.find(
            (l) =>
              l.userId === where.userId &&
              l.communityId === where.communityId &&
              l.isActive === where.isActive &&
              l.role === where.role &&
              l.parishId === where.community.parishId,
          ) ?? null,
        ),
      },
      community: {
        findUnique: jest.fn(async ({ where }: any) => ({ id: where.id, parishId: parishOf[where.id], parish: { id: parishOf[where.id] } })),
      },
      event: {
        findUnique: jest.fn(async ({ where }: any) => {
          const communityId = where.id.replace('ev-', '');
          return { id: where.id, communityId, eventPastorals: [], community: { parishId: parishOf[communityId], parish: {} } };
        }),
      },
      member: {
        findUnique: jest.fn(async ({ where }: any) => {
          const communityId = where.id.replace('m-', '');
          return { id: where.id, communityId, community: { parishId: parishOf[communityId], parish: {} }, pastoralMemberships: [] };
        }),
      },
      schedule: { findUnique: jest.fn(async ({ where }: any) => ({ eventId: null, communityId: where.id.replace('s-', '') })) },
      schedulePastoral: { findFirst: jest.fn(async () => null) },
      pastoralMember: { findMany: jest.fn(async () => []) },
    };
    const svc = new HierarchyService(db);

    it.each(['c1', 'c2'])('comunidade %s (principal ou atribuída): detalhe liberado', async (id) => {
      await expect(svc.canManageCommunity('coord', id)).resolves.toBe(true);
      await expect(svc.canManageEvent('coord', `ev-${id}`)).resolves.toBe(true);
      await expect(svc.hasAccessToEvent('coord', `ev-${id}`)).resolves.toBe(true);
      await expect(svc.canManageMember('coord', `m-${id}`)).resolves.toBe(true);
      await expect(svc.hasAccessToSchedule('coord', `s-${id}`)).resolves.toBe(true);
    });

    it.each([
      ['c3', 'vínculo de fé na mesma paróquia'],
      ['cX', 'vínculo de gestão em OUTRA paróquia'],
      ['c4', 'vínculo de gestão inativo'],
    ])('comunidade %s (%s): negado', async (id) => {
      await expect(svc.canManageCommunity('coord', id)).resolves.toBe(false);
      await expect(svc.canManageEvent('coord', `ev-${id}`)).resolves.toBe(false);
      await expect(svc.hasAccessToEvent('coord', `ev-${id}`)).resolves.toBe(false);
      await expect(svc.canManageMember('coord', `m-${id}`)).resolves.toBe(false);
      await expect(svc.hasAccessToSchedule('coord', `s-${id}`)).resolves.toBe(false);
    });

    it('applyCommunityFilter: principal + atribuídas na paróquia; vínculo de fé fica de fora', () => {
      const actor = user({
        role: UserRole.COMMUNITY_COORDINATOR,
        parishId: 'p1',
        communityId: 'c1',
        communities: [faithLink('c2', UserRole.COMMUNITY_COORDINATOR), faithLink('c3')],
      });
      expect(service.applyCommunityFilter(actor)).toEqual({ OR: [{ id: 'c1' }, { id: { in: ['c2'] }, parishId: 'p1' }] });
      expect(
        service.applyCommunityFilter(user({ role: UserRole.COMMUNITY_COORDINATOR, parishId: 'p1', communityId: 'c1', communities: [faithLink('c3')] })),
      ).toEqual({ id: 'c1' });
    });
  });
});
