import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';

describe('DocumentsService (3.3)', () => {
  let service: DocumentsService;
  let prisma: any;
  let hierarchy: { isCommunityInScope: jest.Mock };

  const coord = { id: 'u1', role: UserRole.PARISH_ADMIN, parishId: 'p1' } as any;
  // Coordena a Liturgia (cp-lit) da comunidade c1, paróquia p1
  const pastoralCoord = {
    id: 'u2',
    role: UserRole.PASTORAL_COORDINATOR,
    parishId: 'p1',
    communityId: 'c1',
    coordinatedPastoralIds: ['cp-lit'],
  } as any;
  const communityCoord = { id: 'u3', role: UserRole.COMMUNITY_COORDINATOR, parishId: 'p1', communityId: 'c1' } as any;

  beforeEach(async () => {
    prisma = {
      pastoralDocument: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue({ id: 'd1', versions: [] }),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue({ id: 'novo' }),
        update: jest.fn(),
      },
      communityPastoral: {
        findMany: jest.fn().mockResolvedValue([{ id: 'cp-lit' }, { id: 'cp-cat' }]),
        findFirst: jest.fn(),
      },
      community: { findUnique: jest.fn().mockResolvedValue({ parishId: 'p1' }) },
      member: { findFirst: jest.fn() },
      pastoralMember: { findMany: jest.fn().mockResolvedValue([]) },
      pastoralCoordinator: { findMany: jest.fn().mockResolvedValue([]) },
      documentVersion: { create: jest.fn() },
      $transaction: jest.fn().mockResolvedValue([{ id: 'd1', currentVersion: 2 }, { id: 'v2' }]),
    };
    hierarchy = { isCommunityInScope: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: HierarchyService, useValue: hierarchy },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();
    service = module.get<DocumentsService>(DocumentsService);
  });

  it('addVersion incrementa a versão e persiste histórico', async () => {
    prisma.pastoralDocument.findFirst.mockResolvedValue({ id: 'd1', parishId: 'p1', currentVersion: 1, storageKey: null, fileUrl: null });

    await service.addVersion('d1', { notes: 'revisão', fileUrl: 'http://x/v2' }, coord);

    expect(prisma.$transaction).toHaveBeenCalled();
    const versionCreate = prisma.documentVersion.create.mock.calls[0][0];
    expect(versionCreate.data.version).toBe(2);
  });

  it('nega acesso a documento de outra paróquia', async () => {
    prisma.pastoralDocument.findFirst.mockResolvedValue({ id: 'd1', parishId: 'OUTRA', currentVersion: 1 });
    prisma.pastoralDocument.count.mockResolvedValue(0);
    await expect(service.getWithVersions('d1', coord)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.pastoralDocument.count.mock.calls[0][0].where.AND).toEqual([{ parishId: 'p1' }]);
  });

  it('remove é soft delete (não apaga fisicamente)', async () => {
    prisma.pastoralDocument.findFirst.mockResolvedValue({ id: 'd1', parishId: 'p1' });
    prisma.pastoralDocument.update.mockResolvedValue({ id: 'd1', deletedAt: new Date() });

    await service.remove('d1', coord);
    const updateArg = prisma.pastoralDocument.update.mock.calls[0][0];
    expect(updateArg.data.deletedAt).toBeInstanceOf(Date);
  });

  describe('escopo da listagem (negar por padrão)', () => {
    it('coordenação sem paróquia nem pastoral coordenada: lista vazia, sem consulta (antes: todos do país)', async () => {
      const semAncora = { id: 'u9', role: UserRole.PASTORAL_COORDINATOR, coordinatedPastoralIds: [] } as any;
      await expect(service.list(semAncora, {})).resolves.toEqual([]);
      expect(prisma.pastoralDocument.findMany).not.toHaveBeenCalled();
    });

    it('diocesano sem diocese: vazio; com diocese: só a diocese', async () => {
      await expect(service.list({ id: 'd', role: UserRole.DIOCESAN_ADMIN } as any, {})).resolves.toEqual([]);
      expect(prisma.pastoralDocument.findMany).not.toHaveBeenCalled();

      await service.list({ id: 'd', role: UserRole.DIOCESAN_ADMIN, dioceseId: 'd1' } as any, {});
      expect(prisma.pastoralDocument.findMany.mock.calls[0][0].where.AND).toEqual([{ parish: { dioceseId: 'd1' } }]);
    });

    it('fiel/voluntário (papel desconhecido para documentos): vazio', async () => {
      await expect(service.list({ id: 'f', role: UserRole.FAITHFUL, parishId: 'p1' } as any, {})).resolves.toEqual([]);
    });

    it('coordenador de pastoral: só as pastorais que COORDENA + o que ele mesmo cadastrou', async () => {
      await service.list(pastoralCoord, {});
      expect(prisma.pastoralDocument.findMany.mock.calls[0][0].where.AND).toEqual([
        {
          OR: [
            { communityPastoralId: { in: ['cp-lit'] } },
            { parishId: 'p1', versions: { some: { version: 1, createdByUserId: 'u2' } } },
          ],
        },
      ]);
    });

    it('coordenador de comunidade: a comunidade, as pastorais dela e o que cadastrou', async () => {
      await service.list(communityCoord, {});
      expect(prisma.pastoralDocument.findMany.mock.calls[0][0].where.AND).toEqual([
        {
          OR: [
            { communityId: 'c1' },
            { communityPastoralId: { in: ['cp-lit', 'cp-cat'] } },
            { parishId: 'p1', versions: { some: { version: 1, createdByUserId: 'u3' } } },
          ],
        },
      ]);
    });

    it('PARISH_ADMIN: a paróquia', async () => {
      await service.list(coord, { category: 'ata' });
      const where = prisma.pastoralDocument.findMany.mock.calls[0][0].where;
      expect(where.category).toBe('ata');
      expect(where.AND).toEqual([{ parishId: 'p1' }]);
    });
  });

  describe('GET /documents/:id — escopo de gestão', () => {
    it('coordenador de OUTRA pastoral da mesma paróquia não abre o documento', async () => {
      prisma.pastoralDocument.findFirst.mockResolvedValue({ id: 'd1', parishId: 'p1', communityPastoralId: 'cp-cat' });
      prisma.pastoralDocument.count.mockResolvedValue(0);
      await expect(service.getWithVersions('d1', pastoralCoord)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.pastoralDocument.findUnique).not.toHaveBeenCalled();
    });

    it('coordenador da pastoral do documento abre', async () => {
      prisma.pastoralDocument.findFirst.mockResolvedValue({ id: 'd1', parishId: 'p1', communityPastoralId: 'cp-lit' });
      prisma.pastoralDocument.count.mockResolvedValue(1);
      await expect(service.getWithVersions('d1', pastoralCoord)).resolves.toEqual({ id: 'd1', versions: [] });
    });

    it('sem escopo resolvido: 403 sem consulta extra', async () => {
      prisma.pastoralDocument.findFirst.mockResolvedValue({ id: 'd1', parishId: 'p1' });
      const semAncora = { id: 'u9', role: UserRole.PASTORAL_COORDINATOR, coordinatedPastoralIds: [] } as any;
      await expect(service.getWithVersions('d1', semAncora)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.pastoralDocument.count).not.toHaveBeenCalled();
    });
  });

  describe('create — ids do body', () => {
    it('pastoral de outra paróquia: 403, nada gravado', async () => {
      prisma.communityPastoral.findFirst.mockResolvedValue({ id: 'cp-x', communityId: 'c9', community: { parishId: 'p2' } });
      await expect(
        service.create({ title: 'Ata', category: 'ata', communityPastoralId: 'cp-x' }, coord),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.pastoralDocument.create).not.toHaveBeenCalled();
    });

    it('coordenador de pastoral não vincula documento a pastoral que não coordena', async () => {
      prisma.communityPastoral.findFirst.mockResolvedValue({ id: 'cp-cat', communityId: 'c1', community: { parishId: 'p1' } });
      await expect(
        service.create({ title: 'Ata', category: 'ata', communityPastoralId: 'cp-cat' }, pastoralCoord),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.pastoralDocument.create).not.toHaveBeenCalled();
    });

    it('comunidade de outra paróquia: 403', async () => {
      prisma.community.findUnique.mockResolvedValue({ parishId: 'p2' });
      await expect(
        service.create({ title: 'Ata', category: 'ata', communityId: 'c9' }, coord),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.pastoralDocument.create).not.toHaveBeenCalled();
    });

    it('responsável de outra paróquia: 400', async () => {
      prisma.member.findFirst.mockResolvedValue(null);
      await expect(
        service.create({ title: 'Ata', category: 'ata', responsibleMemberId: 'm-x' }, coord),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.member.findFirst.mock.calls[0][0].where.OR).toEqual([
        { community: { parishId: 'p1' } },
        { communityLinks: { some: { isActive: true, community: { parishId: 'p1' } } } },
      ]);
      expect(prisma.pastoralDocument.create).not.toHaveBeenCalled();
    });

    it('caminho legítimo: coordenador cadastra na pastoral que coordena (como o painel envia)', async () => {
      prisma.communityPastoral.findFirst.mockResolvedValue({ id: 'cp-lit', communityId: 'c1', community: { parishId: 'p1' } });
      await service.create({ title: 'Ata', category: 'ata', communityId: 'c1', communityPastoralId: 'cp-lit' }, pastoralCoord);
      expect(prisma.pastoralDocument.create.mock.calls[0][0].data).toMatchObject({
        parishId: 'p1',
        communityId: 'c1',
        communityPastoralId: 'cp-lit',
      });
    });
  });
});
