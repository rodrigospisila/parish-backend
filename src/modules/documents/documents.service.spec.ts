import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';

describe('DocumentsService (3.3)', () => {
  let service: DocumentsService;
  let prisma: any;

  const coord = { id: 'u1', role: UserRole.PARISH_ADMIN, parishId: 'p1' } as any;

  beforeEach(async () => {
    prisma = {
      pastoralDocument: { findFirst: jest.fn(), update: jest.fn() },
      documentVersion: { create: jest.fn() },
      $transaction: jest.fn().mockResolvedValue([{ id: 'd1', currentVersion: 2 }, { id: 'v2' }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: HierarchyService, useValue: { isCommunityInScope: jest.fn() } },
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
    await expect(
      service.getWithVersions('d1', coord),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('remove é soft delete (não apaga fisicamente)', async () => {
    prisma.pastoralDocument.findFirst.mockResolvedValue({ id: 'd1', parishId: 'p1' });
    prisma.pastoralDocument.update.mockResolvedValue({ id: 'd1', deletedAt: new Date() });

    await service.remove('d1', coord);
    const updateArg = prisma.pastoralDocument.update.mock.calls[0][0];
    expect(updateArg.data.deletedAt).toBeInstanceOf(Date);
  });
});
