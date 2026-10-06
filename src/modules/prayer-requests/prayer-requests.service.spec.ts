import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole, PrayerRequestStatus } from '@prisma/client';
import { PrayerRequestsService } from './prayer-requests.service';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';

describe('PrayerRequestsService (blindagem - Fase 0)', () => {
  let service: PrayerRequestsService;
  let prisma: any;
  let hierarchy: { isCommunityInScope: jest.Mock; canManageMember: jest.Mock; getCommunityScopeIds: jest.Mock };
  let audit: { log: jest.Mock };

  // Comunidades: c1 e c2 são da paróquia p1 (diocese PG); cX é de outra paróquia
  const faithful = { id: 'u-fiel', role: UserRole.FAITHFUL, communityId: 'c1', member: { id: 'm-fiel' } } as any;
  const coordC1 = { id: 'u-coord', role: UserRole.COMMUNITY_COORDINATOR, communityId: 'c1', member: { id: 'm-coord' } } as any;
  const parishAdmin = { id: 'u-par', role: UserRole.PARISH_ADMIN, parishId: 'p1' } as any;

  const row = (over: Partial<any> = {}) => ({
    id: 'pr-1',
    title: 'Saúde da mãe',
    description: 'Íntimo',
    category: 'HEALTH',
    isAnonymous: false,
    status: PrayerRequestStatus.APPROVED,
    prayerCount: 0,
    communityId: 'c1',
    memberId: 'm-autor',
    createdAt: new Date(),
    updatedAt: new Date(),
    community: { id: 'c1', name: 'Matriz' },
    member: { id: 'm-autor', fullName: 'Maria da Silva', email: 'maria@x.com' },
    ...over,
  });

  beforeEach(async () => {
    prisma = {
      prayerRequest: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(async ({ where }: any) => ({ id: where.id, communityId: 'c1' })),
        delete: jest.fn(async ({ where }: any) => ({ id: where.id })),
        count: jest.fn().mockResolvedValue(0),
        aggregate: jest.fn().mockResolvedValue({ _sum: { prayerCount: 0 } }),
      },
      community: {
        findUnique: jest.fn(),
        findMany: jest.fn(async ({ where }: any) =>
          where.parishId === 'p1' ? [{ id: 'c1' }, { id: 'c2' }] : [],
        ),
      },
      member: { findUnique: jest.fn(), findFirst: jest.fn() },
      memberCommunity: { findMany: jest.fn().mockResolvedValue([]) },
    };
    hierarchy = {
      isCommunityInScope: jest.fn(),
      canManageMember: jest.fn().mockResolvedValue(true),
      getCommunityScopeIds: jest.fn(async (u: any) => (u?.communityId ? [u.communityId] : [])),
    };
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
    it('findApproved NUNCA expõe o autor de pedido anônimo', async () => {
      prisma.prayerRequest.findMany.mockResolvedValue([
        { id: 'pr-1', isAnonymous: true, member: { fullName: 'Maria da Silva' } },
        { id: 'pr-2', isAnonymous: false, member: { fullName: 'José' } },
      ]);

      const result = await service.findApproved(faithful);

      expect(result[0].member).toBeNull();
      expect(result[1].member).toEqual({ fullName: 'José' });
    });

    it('findOne mascara o autor de pedido anônimo para fiel da comunidade', async () => {
      prisma.prayerRequest.findUnique.mockResolvedValue(row({ isAnonymous: true }));

      const result: any = await service.findOne('pr-1', faithful);

      expect(result.member).toBeNull();
      expect(result.memberId).toBeNull();
    });

    it('findOne preserva o autor para o moderador da comunidade', async () => {
      prisma.prayerRequest.findUnique.mockResolvedValue(row({ isAnonymous: true, status: PrayerRequestStatus.PENDING }));

      const result: any = await service.findOne('pr-1', coordC1);

      expect(result.member).toEqual(expect.objectContaining({ id: 'm-autor', fullName: 'Maria da Silva' }));
    });
  });

  describe('escopo na leitura (C9)', () => {
    it('fiel NÃO lê pedido PENDENTE de outra pessoa (nem na própria comunidade)', async () => {
      prisma.prayerRequest.findUnique.mockResolvedValue(row({ status: PrayerRequestStatus.PENDING }));
      await expect(service.findOne('pr-1', faithful)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('fiel NÃO lê pedido aprovado de comunidade fora do seu mural', async () => {
      prisma.prayerRequest.findUnique.mockResolvedValue(row({ communityId: 'cX', community: { id: 'cX', name: 'X' } }));
      await expect(service.findOne('pr-1', faithful)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('fiel lê pedido aprovado da própria comunidade — autor só pelo nome (sem id, e-mail ou cadastro)', async () => {
      prisma.prayerRequest.findUnique.mockResolvedValue(row());
      const result: any = await service.findOne('pr-1', faithful);
      expect(result.member).toEqual({ fullName: 'Maria da Silva' });
      expect(result.memberId).toBeNull();
      expect(JSON.stringify(result)).not.toContain('maria@x.com');
    });

    it('fiel lê o PRÓPRIO pedido pendente', async () => {
      prisma.prayerRequest.findUnique.mockResolvedValue(
        row({ status: PrayerRequestStatus.PENDING, memberId: 'm-fiel', member: { id: 'm-fiel', fullName: 'Eu', email: 'eu@x' } }),
      );
      const result: any = await service.findOne('pr-1', faithful);
      expect(result.isOwn).toBe(true);
      expect(result.member).toEqual({ fullName: 'Eu' });
    });

    it('fiel lê aprovado de comunidade secundária (vínculo de membro ativo)', async () => {
      prisma.memberCommunity.findMany.mockResolvedValue([{ communityId: 'c2' }]);
      prisma.prayerRequest.findUnique.mockResolvedValue(row({ communityId: 'c2', community: { id: 'c2', name: 'Capela' } }));
      await expect(service.findOne('pr-1', faithful)).resolves.toBeTruthy();
    });

    it('coordenador de outra comunidade NÃO vê pendente alheio', async () => {
      prisma.prayerRequest.findUnique.mockResolvedValue(
        row({ status: PrayerRequestStatus.PENDING, communityId: 'cX', community: { id: 'cX', name: 'X' } }),
      );
      await expect(service.findOne('pr-1', coordC1)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('findApproved sem comunidade recorta pelo mural do usuário; comunidade alheia → 403', async () => {
      await service.findApproved(faithful);
      expect(prisma.prayerRequest.findMany.mock.calls[0][0].where).toEqual(
        expect.objectContaining({ status: PrayerRequestStatus.APPROVED, communityId: { in: ['c1'] } }),
      );
      await expect(service.findApproved(faithful, 'cX')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('findAll (moderação) do coordenador recorta pela comunidade dele; comunidade alheia → 403', async () => {
      await service.findAll(coordC1);
      expect(prisma.prayerRequest.findMany.mock.calls[0][0].where).toEqual({ communityId: { in: ['c1'] } });
      await expect(service.findAll(coordC1, 'cX')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('findAll do PARISH_ADMIN recorta pelas comunidades da paróquia', async () => {
      await service.findAll(parishAdmin);
      expect(prisma.prayerRequest.findMany.mock.calls[0][0].where).toEqual({ communityId: { in: ['c1', 'c2'] } });
    });

    it('findAll/findPending sem usuário ou com papel de fiel não listam nada (negar por padrão)', async () => {
      await service.findAll(undefined as any);
      expect(prisma.prayerRequest.findMany.mock.calls[0][0].where).toEqual({ communityId: { in: [] } });
      await service.findPending(undefined, faithful);
      expect(prisma.prayerRequest.findMany.mock.calls[1][0].where).toEqual(
        expect.objectContaining({ communityId: { in: [] } }),
      );
    });

    it('getStats fica no escopo de moderação', async () => {
      await service.getStats(coordC1);
      expect(prisma.prayerRequest.count.mock.calls[0][0].where).toEqual({ communityId: { in: ['c1'] } });
      await expect(service.getStats(coordC1, 'cX')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('escopo na escrita (C9)', () => {
    it('PARISH_ADMIN NÃO apaga pedido de outra paróquia', async () => {
      prisma.prayerRequest.findUnique.mockResolvedValue(row({ communityId: 'cX' }));
      await expect(service.remove('pr-1', parishAdmin)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.prayerRequest.delete).not.toHaveBeenCalled();
    });

    it('coordenador NÃO edita pedido de outra comunidade', async () => {
      prisma.prayerRequest.findUnique.mockResolvedValue(row({ communityId: 'cX' }));
      await expect(service.update('pr-1', { title: 'x' } as any, coordC1)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.prayerRequest.update).not.toHaveBeenCalled();
    });

    it('coordenador NÃO move pedido para comunidade fora do seu escopo', async () => {
      prisma.prayerRequest.findUnique.mockResolvedValue(row());
      await expect(service.update('pr-1', { communityId: 'cX' } as any, coordC1)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('moderar sem usuário → 403 (antes passava direto)', async () => {
      prisma.prayerRequest.findUnique.mockResolvedValue(row({ status: PrayerRequestStatus.PENDING }));
      await expect(service.approve('pr-1', undefined as any)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('PARISH_ADMIN apaga pedido da própria paróquia (caminho legítimo) e audita', async () => {
      prisma.prayerRequest.findUnique.mockResolvedValue(row({ communityId: 'c2' }));
      await service.remove('pr-1', parishAdmin);
      expect(prisma.prayerRequest.delete).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'DELETE', entity: 'PrayerRequest' }));
    });

    it('coordenador edita o conteúdo do pedido da própria comunidade (autor nunca é trocado)', async () => {
      prisma.prayerRequest.findUnique.mockResolvedValue(row());
      await service.update('pr-1', { title: 'Novo', memberId: 'm-outro' } as any, coordC1);
      expect(prisma.prayerRequest.update.mock.calls[0][0].data).toEqual({ title: 'Novo' });
    });

    it('coordenador aprova pedido da própria comunidade', async () => {
      prisma.prayerRequest.findUnique.mockResolvedValue(row({ status: PrayerRequestStatus.PENDING }));
      await service.approve('pr-1', coordC1);
      expect(prisma.prayerRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: PrayerRequestStatus.APPROVED } }),
      );
    });

    it('"Rezei" só em pedido do mural do usuário', async () => {
      prisma.prayerRequest.findUnique.mockResolvedValue(row({ communityId: 'cX' }));
      await expect(service.incrementPrayerCount('pr-1', faithful)).rejects.toBeInstanceOf(NotFoundException);
      prisma.prayerRequest.findUnique.mockResolvedValue(row());
      await service.incrementPrayerCount('pr-1', faithful);
      expect(prisma.prayerRequest.update).toHaveBeenCalled();
    });
  });

  describe('escopo na criação (item 0.1)', () => {
    it('nega criar pedido para comunidade fora do escopo do solicitante', async () => {
      prisma.community.findUnique.mockResolvedValue({ id: 'community-b' });
      hierarchy.isCommunityInScope.mockResolvedValue(false);

      const user = { id: 'u1', role: UserRole.FAITHFUL, communityId: 'community-a' } as any;

      await expect(
        service.create(
          { communityId: 'community-b', title: 't', description: 'd', category: 'HEALTH' } as any,
          user,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.prayerRequest.create).not.toHaveBeenCalled();
    });

    it('sem usuário não cria (negar por padrão)', async () => {
      await expect(
        service.create({ communityId: 'c1', title: 't', description: 'd', category: 'HEALTH' } as any, undefined as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('coordenação não cadastra pedido em nome de membro fora do seu escopo', async () => {
      prisma.community.findUnique.mockResolvedValue({ id: 'c1' });
      hierarchy.isCommunityInScope.mockResolvedValue(true);
      prisma.member.findUnique.mockResolvedValue({ id: 'm-longe' });
      hierarchy.canManageMember.mockResolvedValue(false);
      await expect(
        service.create(
          { communityId: 'c1', title: 't', description: 'd', category: 'HEALTH', memberId: 'm-longe' } as any,
          coordC1,
        ),
      ).rejects.toThrow(ForbiddenException);
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

      const user = { id: 'u1', role: UserRole.FAITHFUL, communityId: 'community-a' } as any;
      await service.create(
        // memberId alheio no corpo é ignorado para fiel: autor é o próprio membro
        { communityId: 'community-a', title: 't', description: 'd', category: 'HEALTH', memberId: 'member-other' } as any,
        user,
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
