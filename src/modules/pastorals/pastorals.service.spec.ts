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
    };
    hierarchy = { canManageCommunity: jest.fn().mockResolvedValue(false) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PastoralsService,
        JoinRequestsService,
        { provide: PrismaService, useValue: prisma },
        { provide: HierarchyService, useValue: hierarchy },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: NotificationsService, useValue: { notifyUsers: jest.fn() } },
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
