import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PastoralsService } from './pastorals.service';
import { JoinRequestsService } from './join-requests.service';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { pickCoordinatedPastoralIds, resolveCoordinatedPastoralIds } from './coordination-scope';

describe('PastoralsService — escopo e coordenação (C7, C8, A13)', () => {
  let service: PastoralsService;
  let joinRequests: JoinRequestsService;
  let prisma: any;
  let hierarchy: { canManageCommunity: jest.Mock };
  let notifications: { notifyUsers: jest.Mock };

  // Pastoral Catequética da Matriz (paróquia p1, diocese d1)
  const catequetica = {
    id: 'cp-cat',
    communityId: 'c1',
    globalPastoralId: 'gp-cat',
    deletedAt: null,
    community: { id: 'c1', parishId: 'p1', parish: { dioceseId: 'd1' } },
  };

  const parishAdminP1 = { id: 'adm1', role: UserRole.PARISH_ADMIN, parishId: 'p1' } as any;
  const parishAdminP2 = { id: 'adm2', role: UserRole.PARISH_ADMIN, parishId: 'p2' } as any;
  const faithful = { id: 'f16', role: UserRole.FAITHFUL, communityId: 'c1', pastoralIds: [] } as any;
  // fiel20: coordena a Música; é só MEMBRO (catequista) da Catequética
  const fiel20 = {
    id: 'u20',
    role: UserRole.PASTORAL_COORDINATOR,
    communityId: 'c1',
    pastoralIds: ['cp-musica', 'cp-cat'],
    coordinatedPastoralIds: ['cp-musica'],
  } as any;
  const catCoordinator = {
    id: 'u1',
    role: UserRole.PASTORAL_COORDINATOR,
    communityId: 'c1',
    pastoralIds: ['cp-cat'],
    coordinatedPastoralIds: ['cp-cat'],
  } as any;

  beforeEach(async () => {
    prisma = {
      communityPastoral: {
        findUnique: jest.fn(async ({ where }: any) => (where.id === 'cp-cat' ? catequetica : null)),
        findFirst: jest.fn(async ({ where }: any) => (where.id === 'cp-cat' ? { ...catequetica, members: [], subGroups: [] } : null)),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: 'nova' }),
        update: jest.fn().mockResolvedValue({ id: 'cp-cat' }),
      },
      community: { findUnique: jest.fn().mockResolvedValue({ id: 'c9', parishId: 'p2' }) },
      globalPastoral: { findUnique: jest.fn().mockResolvedValue({ id: 'gp-cat' }) },
      user: { findUnique: jest.fn(async ({ where }: any) => ({ id: where.id, role: UserRole.PARISH_ADMIN })) },
      pastoralGroup: {
        findUnique: jest.fn().mockResolvedValue({ communityPastoralId: 'cp-cat' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      pastoralMember: { findMany: jest.fn().mockResolvedValue([]) },
      pastoralCoordinator: { findMany: jest.fn().mockResolvedValue([]) },
      pastoralJoinRequest: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn() },
      auditLog: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: 'aud1' }),
        update: jest.fn().mockResolvedValue({}),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    // Transação da cota de avisos: o próprio mock faz o papel do cliente
    prisma.$transaction = jest.fn(async (cb: any) => cb(prisma));
    hierarchy = { canManageCommunity: jest.fn().mockResolvedValue(false) };
    notifications = { notifyUsers: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PastoralsService,
        JoinRequestsService,
        { provide: PrismaService, useValue: prisma },
        { provide: HierarchyService, useValue: hierarchy },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();
    service = module.get(PastoralsService);
    joinRequests = module.get(JoinRequestsService);
  });

  describe('C7 — GET /pastorals/members e /pastorals/groups', () => {
    it('sem communityPastoralId nem pastoralGroupId responde 400 e não consulta', async () => {
      await expect(service.findPastoralMembers(undefined, undefined, faithful)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.pastoralMember.findMany).not.toHaveBeenCalled();
    });

    it('fiel não lista os membros de uma pastoral', async () => {
      await expect(service.findPastoralMembers('cp-cat', undefined, faithful)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.pastoralMember.findMany).not.toHaveBeenCalled();
    });

    it('coordenação da pastoral lista com select mínimo do membro (sem cadastro completo)', async () => {
      await service.findPastoralMembers('cp-cat', undefined, catCoordinator);
      const args = prisma.pastoralMember.findMany.mock.calls[0][0];
      expect(args.where).toEqual({ communityPastoralId: 'cp-cat', member: { deletedAt: null } });
      expect(args.include.member).toEqual({
        select: { id: true, fullName: true, photoUrl: true, phone: true, email: true },
      });
    });

    it('grupos exigem a pastoral (400 sem ela) e passam pelo escopo', async () => {
      await expect(service.findAllPastoralGroups(undefined, catCoordinator)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(service.findAllPastoralGroups('cp-cat', faithful)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.pastoralGroup.findMany).not.toHaveBeenCalled();

      await service.findAllPastoralGroups('cp-cat', catCoordinator);
      const args = prisma.pastoralGroup.findMany.mock.calls[0][0];
      expect(args.where).toEqual({ deletedAt: null, communityPastoralId: 'cp-cat' });
      expect(args.include.members.include.member).toEqual({
        select: { id: true, fullName: true, photoUrl: true, phone: true, email: true },
      });
    });

    it('sem usuário identificado, o acesso é negado (não sai liberado)', async () => {
      await expect(service.ensurePastoralAccess('cp-cat', undefined)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('C8 — criar/editar/excluir pastoral comunitária', () => {
    it('PARISH_ADMIN de outra paróquia não edita a pastoral (nada é gravado)', async () => {
      await expect(
        service.updateCommunityPastoral('cp-cat', { description: 'x' } as any, parishAdminP2),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.communityPastoral.update).not.toHaveBeenCalled();
    });

    it('PARISH_ADMIN de outra paróquia não exclui a pastoral', async () => {
      await expect(service.removeCommunityPastoral('cp-cat', parishAdminP2)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.communityPastoral.update).not.toHaveBeenCalled();
    });

    it('não permite mover a pastoral para outra comunidade nem trocar a pastoral do catálogo', async () => {
      await expect(
        service.updateCommunityPastoral('cp-cat', { communityId: 'c-outra' } as any, parishAdminP1),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.updateCommunityPastoral('cp-cat', { globalPastoralId: 'gp-outra' } as any, parishAdminP1),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.communityPastoral.update).not.toHaveBeenCalled();
    });

    it('PARISH_ADMIN da paróquia edita (o painel reenvia communityId/globalPastoralId iguais)', async () => {
      await service.updateCommunityPastoral(
        'cp-cat',
        { communityId: 'c1', globalPastoralId: 'gp-cat', description: 'Nova' } as any,
        parishAdminP1,
      );
      const args = prisma.communityPastoral.update.mock.calls[0][0];
      expect(args.data.description).toBe('Nova');
      expect(args.data).not.toHaveProperty('communityId');
      expect(args.data).not.toHaveProperty('globalPastoralId');
    });

    it('PARISH_ADMIN da paróquia exclui (soft delete)', async () => {
      await service.removeCommunityPastoral('cp-cat', parishAdminP1);
      expect(prisma.communityPastoral.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'cp-cat' }, data: { deletedAt: expect.any(Date) } }),
      );
    });

    it('não cria pastoral em comunidade fora do escopo', async () => {
      hierarchy.canManageCommunity.mockResolvedValue(false);
      await expect(
        service.createCommunityPastoral({ communityId: 'c9', globalPastoralId: 'gp-cat' } as any, 'adm1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.communityPastoral.create).not.toHaveBeenCalled();
    });

    it('cria pastoral na comunidade que gerencia', async () => {
      hierarchy.canManageCommunity.mockResolvedValue(true);
      prisma.communityPastoral.findFirst.mockResolvedValue(null);
      await service.createCommunityPastoral({ communityId: 'c1', globalPastoralId: 'gp-cat' } as any, 'adm1');
      expect(hierarchy.canManageCommunity).toHaveBeenCalledWith('adm1', 'c1');
      expect(prisma.communityPastoral.create).toHaveBeenCalled();
    });

    it('M36: pastoral excluída é REATIVADA ao cadastrar de novo (o índice único inclui as excluídas)', async () => {
      hierarchy.canManageCommunity.mockResolvedValue(true);
      prisma.communityPastoral.findFirst.mockResolvedValue({ ...catequetica, deletedAt: new Date('2026-09-01') });
      await service.createCommunityPastoral(
        { communityId: 'c1', globalPastoralId: 'gp-cat', mission: 'Evangelizar' } as any,
        'adm1',
      );
      expect(prisma.communityPastoral.create).not.toHaveBeenCalled();
      const args = prisma.communityPastoral.update.mock.calls[0][0];
      expect(args.where).toEqual({ id: 'cp-cat' });
      expect(args.data).toMatchObject({ deletedAt: null, status: 'ACTIVE', mission: 'Evangelizar' });
      expect(args.data).not.toHaveProperty('globalPastoralId');
    });

    it('M36: pastoral ATIVA repetida continua recusada', async () => {
      hierarchy.canManageCommunity.mockResolvedValue(true);
      prisma.communityPastoral.findFirst.mockResolvedValue({ ...catequetica, deletedAt: null });
      await expect(
        service.createCommunityPastoral({ communityId: 'c1', globalPastoralId: 'gp-cat' } as any, 'adm1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.communityPastoral.update).not.toHaveBeenCalled();
    });
  });

  describe('B8 — teto do aviso aos membros da pastoral', () => {
    beforeEach(() => {
      prisma.pastoralMember.findMany.mockResolvedValue([{ member: { userId: 'm-user' } }]);
      prisma.communityPastoral.findUnique.mockResolvedValue({ ...catequetica, globalPastoral: { name: 'Catequese' } });
    });

    it('além de 5 avisos no dia da pastoral: 400 e nenhum envio', async () => {
      prisma.auditLog.count.mockResolvedValueOnce(5).mockResolvedValueOnce(5);
      await expect(service.notifyMembers('cp-cat', 'Reunião', parishAdminP1)).rejects.toThrow(/Limite/);
      expect(notifications.notifyUsers).not.toHaveBeenCalled();
    });

    it('dentro do teto: envia e conta pela trilha PastoralBroadcast', async () => {
      await service.notifyMembers('cp-cat', 'Reunião', parishAdminP1);
      expect(notifications.notifyUsers).toHaveBeenCalledTimes(1);
      expect(prisma.auditLog.count.mock.calls[0][0].where).toMatchObject({ entity: 'PastoralBroadcast', entityId: 'cp-cat' });
    });

    it('R5#5: trava grupo e autor, conta e GRAVA a trilha antes do envio (corrida não fura o teto)', async () => {
      const order: string[] = [];
      prisma.$queryRaw.mockImplementation(async (sql: any, key: string) => order.push(`lock:${key}`));
      prisma.auditLog.count.mockImplementation(async () => {
        order.push('conta');
        return 0;
      });
      prisma.auditLog.create.mockImplementation(async () => {
        order.push('grava');
        return { id: 'aud1' };
      });
      notifications.notifyUsers.mockImplementation(async () => order.push('envia'));
      prisma.auditLog.update.mockImplementation(async () => order.push('anota'));
      await service.notifyMembers('cp-cat', 'Reunião', parishAdminP1);
      expect(order).toEqual([
        'lock:parish:broadcast:group:PastoralBroadcast:cp-cat',
        `lock:parish:broadcast:author:${parishAdminP1.id}`,
        'conta',
        'conta',
        'grava',
        'envia',
        'anota',
      ]);
      expect(prisma.$queryRaw.mock.calls[0][0].join('?')).toContain('::text');
      expect(prisma.auditLog.create.mock.calls[0][0].data).toMatchObject({
        actorUserId: parishAdminP1.id,
        entity: 'PastoralBroadcast',
        entityId: 'cp-cat',
      });
      expect(prisma.auditLog.update).toHaveBeenCalledWith({ where: { id: 'aud1' }, data: { metadata: { notified: 1, length: 7 } } });
    });

    it('R5#5: duas requisições simultâneas com 1 vaga — só uma envia', async () => {
      // Simula o lock serializando: a 2ª conta já vê a trilha gravada pela 1ª
      let recorded = 4;
      prisma.auditLog.count.mockImplementation(async ({ where }: any) => (where.entityId ? recorded : 0));
      prisma.auditLog.create.mockImplementation(async () => {
        recorded++;
        return { id: `aud${recorded}` };
      });
      let chain = Promise.resolve();
      prisma.$transaction = jest.fn((cb: any) => {
        const run = chain.then(() => cb(prisma));
        chain = run.then(
          () => undefined,
          () => undefined,
        );
        return run;
      });
      const results = await Promise.allSettled([
        service.notifyMembers('cp-cat', 'Reunião', parishAdminP1),
        service.notifyMembers('cp-cat', 'Reunião', parishAdminP1),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual(['fulfilled', 'rejected']);
      expect(notifications.notifyUsers).toHaveBeenCalledTimes(1);
    });
  });

  describe('A13 — ser membro não é coordenar', () => {
    it('PASTORAL_COORDINATOR que é só membro da Catequética não abre a pastoral', async () => {
      await expect(service.findOneCommunityPastoral('cp-cat', fiel20)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('nem os pedidos "quero participar" (telefone/e-mail) dela', async () => {
      await expect(joinRequests.listForPastoral('cp-cat', fiel20, 'ALL')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.pastoralJoinRequest.findMany).not.toHaveBeenCalled();
    });

    it('nem aprova pedidos dela', async () => {
      prisma.pastoralJoinRequest.findUnique.mockResolvedValue({
        id: 'jr1',
        communityPastoralId: 'cp-cat',
        status: 'PENDING',
        member: { id: 'm9', fullName: 'X', userId: null },
        communityPastoral: { communityId: 'c1', globalPastoral: { name: 'Catequética' } },
      });
      await expect(joinRequests.review('jr1', true, fiel20)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('o coordenador atual da Catequética abre a pastoral e os pedidos', async () => {
      await expect(service.findOneCommunityPastoral('cp-cat', catCoordinator)).resolves.toBeDefined();
      await expect(joinRequests.listForPastoral('cp-cat', catCoordinator)).resolves.toEqual([]);
    });

    it('sessão no formato antigo (sem coordinatedPastoralIds) não herda pastoralIds: consulta só coordenação', async () => {
      const legacy = { id: 'u20', role: UserRole.PASTORAL_COORDINATOR, communityId: 'c1', pastoralIds: ['cp-cat'] } as any;
      await expect(service.findOneCommunityPastoral('cp-cat', legacy)).rejects.toBeInstanceOf(ForbiddenException);
      // A consulta ao banco filtra papel de coordenação / coordenação vigente
      expect(prisma.pastoralMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: { in: ['COORDINATOR', 'Coordenador'] }, isActive: true }),
        }),
      );
      expect(prisma.pastoralCoordinator.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ isCurrent: true }) }),
      );
    });

    it('sessão antiga de quem coordena de fato continua com acesso (via banco)', async () => {
      prisma.pastoralCoordinator.findMany.mockResolvedValue([{ communityPastoralId: 'cp-cat' }]);
      const legacy = { id: 'u1', role: UserRole.PASTORAL_COORDINATOR, communityId: 'c1', pastoralIds: ['cp-cat'] } as any;
      await expect(service.findOneCommunityPastoral('cp-cat', legacy)).resolves.toBeDefined();
    });
  });

  describe('dados dos membros nas respostas de pastoral (LGPD)', () => {
    const TEAM_SELECT = { select: { id: true, fullName: true, photoUrl: true, phone: true, email: true } };
    const teamLink = (id: string, fullName: string) => ({
      id: `pm-${id}`,
      memberId: id,
      role: 'MEMBER',
      isActive: true,
      member: { id, fullName, photoUrl: null, phone: '42999990000', email: `${id}@x.com` },
    });
    const listed = [
      { id: 'cp-cat', communityId: 'c1', members: [teamLink('m1', 'Ana Souza')] },
      { id: 'cp-musica', communityId: 'c1', members: [teamLink('m2', 'Bruno Lima')] },
      { id: 'cp-capela', communityId: 'c2', members: [teamLink('m3', 'Carla Dias')] },
    ];

    beforeEach(() => {
      prisma.communityPastoral.findMany.mockResolvedValue(listed);
    });

    it('GET /pastorals/community nunca pede o cadastro completo do membro (member: true)', async () => {
      await service.findAllCommunityPastorals('c1', faithful);
      const args = prisma.communityPastoral.findMany.mock.calls[0][0];
      expect(args.include.members.include.member).toEqual(TEAM_SELECT);
    });

    it('fiel vê nome dos membros, sem telefone/e-mail (aba Pastorais do app)', async () => {
      const result = await service.findAllCommunityPastorals('c1', faithful);
      for (const pastoral of result) {
        for (const link of pastoral.members as any[]) {
          expect(link.member.fullName).toBeDefined();
          expect(link.member).not.toHaveProperty('phone');
          expect(link.member).not.toHaveProperty('email');
          // o vínculo continua (papel de coordenação, contagem)
          expect(link.role).toBe('MEMBER');
        }
      }
    });

    it('coordenador de pastoral vê contato só da pastoral que COORDENA', async () => {
      const result: any[] = await service.findAllCommunityPastorals('c1', fiel20);
      const byId = Object.fromEntries(result.map((pastoral) => [pastoral.id, pastoral]));
      expect(byId['cp-musica'].members[0].member.phone).toBe('42999990000');
      // fiel20 é só MEMBRO da Catequética: sem contato
      expect(byId['cp-cat'].members[0].member).not.toHaveProperty('phone');
      expect(byId['cp-capela'].members[0].member).not.toHaveProperty('email');
    });

    it('coordenador de comunidade vê contato só da própria comunidade', async () => {
      const communityCoord = { id: 'cc1', role: UserRole.COMMUNITY_COORDINATOR, communityId: 'c1' } as any;
      prisma.community.findUnique.mockResolvedValue({ parishId: 'p1' });
      const result: any[] = await service.findAllCommunityPastorals(undefined, communityCoord, 'p1');
      const byId = Object.fromEntries(result.map((pastoral) => [pastoral.id, pastoral]));
      expect(byId['cp-cat'].members[0].member.email).toBe('m1@x.com');
      expect(byId['cp-capela'].members[0].member).not.toHaveProperty('phone');
    });

    it('PARISH_ADMIN (lista já filtrada pela paróquia) vê o contato da equipe', async () => {
      const result: any[] = await service.findAllCommunityPastorals(undefined, parishAdminP1);
      expect(prisma.communityPastoral.findMany.mock.calls[0][0].where.community).toEqual({ parishId: 'p1' });
      expect(result[2].members[0].member.phone).toBe('42999990000');
    });

    it('sem usuário identificado: lista vazia, sem consulta', async () => {
      await expect(service.findAllCommunityPastorals('c1', undefined)).resolves.toEqual([]);
      expect(prisma.communityPastoral.findMany).not.toHaveBeenCalled();
    });

    it('GET /pastorals/community/:id usa o select de equipe (membros e sub-grupos)', async () => {
      await service.findOneCommunityPastoral('cp-cat', catCoordinator);
      const args = prisma.communityPastoral.findFirst.mock.calls[0][0];
      expect(args.include.members.include.member).toEqual(TEAM_SELECT);
      expect(args.include.subGroups.include.members.include.member).toEqual(TEAM_SELECT);
    });

    it('GET /pastorals/groups/:id usa o select de equipe', async () => {
      prisma.pastoralGroup.findFirst = jest.fn().mockResolvedValue({ id: 'g1', members: [] });
      await service.findOnePastoralGroup('g1', catCoordinator);
      expect(prisma.pastoralGroup.findFirst.mock.calls[0][0].include.members.include.member).toEqual(TEAM_SELECT);
    });

    it('POST e PATCH /pastorals/members respondem com o select de equipe', async () => {
      prisma.member = {
        findUnique: jest.fn().mockResolvedValue({ id: 'm1', communityId: 'c1', status: 'ACTIVE', userId: null }),
      };
      prisma.pastoralMember.findFirst = jest.fn().mockResolvedValue(null);
      prisma.pastoralMember.create = jest.fn().mockResolvedValue({ id: 'pm1' });
      await service.addMemberToPastoral({ memberId: 'm1', communityPastoralId: 'cp-cat' } as any, catCoordinator);
      expect(prisma.pastoralMember.create.mock.calls[0][0].include.member).toEqual(TEAM_SELECT);

      prisma.pastoralMember.findUnique = jest.fn().mockResolvedValue({
        id: 'pm1',
        memberId: 'm1',
        communityPastoralId: 'cp-cat',
        pastoralGroupId: null,
        role: 'MEMBER',
        isActive: true,
      });
      prisma.pastoralMember.update = jest.fn().mockResolvedValue({ id: 'pm1', role: 'MEMBER', isActive: true });
      await service.updateMember('pm1', { role: 'MEMBER' } as any, catCoordinator);
      expect(prisma.pastoralMember.update.mock.calls[0][0].include.member).toEqual(TEAM_SELECT);
    });

    it('available-members: coordenador de OUTRA pastoral é barrado; quem coordena recebe nome/e-mail, sem telefone', async () => {
      prisma.member = { findMany: jest.fn().mockResolvedValue([]) };
      await expect(service.findAvailableMembersForCommunityPastoral('cp-cat', fiel20)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.member.findMany).not.toHaveBeenCalled();

      await service.findAvailableMembersForCommunityPastoral('cp-cat', catCoordinator);
      expect(prisma.member.findMany.mock.calls[0][0].select).toEqual({ id: true, fullName: true, email: true });
    });
  });

  describe('coordination-scope', () => {
    it('pickCoordinatedPastoralIds: só papel de coordenação ativo ou coordenação vigente', () => {
      expect(
        pickCoordinatedPastoralIds(
          [
            { communityPastoralId: 'a', role: 'COORDINATOR' },
            { communityPastoralId: 'b', role: 'Catequista' },
            { communityPastoralId: 'c', role: 'Coordenador', isActive: false },
            { communityPastoralId: 'd', role: 'Coordenador' },
            { communityPastoralId: 'e', role: 'MEMBER' },
          ],
          [{ communityPastoralId: 'e' }],
        ).sort(),
      ).toEqual(['a', 'd', 'e']);
    });

    it('resolveCoordinatedPastoralIds sem usuário → nada', async () => {
      await expect(resolveCoordinatedPastoralIds(prisma, undefined)).resolves.toEqual([]);
    });
  });
});
