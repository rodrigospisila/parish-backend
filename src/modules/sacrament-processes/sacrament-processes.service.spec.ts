import { Test, TestingModule } from '@nestjs/testing';
import { SacramentProcessStatus, UserRole } from '@prisma/client';
import { SacramentProcessesService } from './sacrament-processes.service';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';
import { PdfService } from '../pdf/pdf.service';

describe('SacramentProcessesService — escopo da listagem (A14)', () => {
  let service: SacramentProcessesService;
  let prisma: any;

  beforeEach(async () => {
    prisma = { sacramentProcess: { findMany: jest.fn().mockResolvedValue([]) } };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SacramentProcessesService,
        { provide: PrismaService, useValue: prisma },
        { provide: HierarchyService, useValue: {} },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: PdfService, useValue: {} },
      ],
    }).compile();
    service = module.get(SacramentProcessesService);
  });

  it('diocesano sem diocese (communityId/parishId nulos) → vazio, nunca todas as dioceses', async () => {
    await expect(service.list({ id: 'd', role: UserRole.DIOCESAN_ADMIN } as any)).resolves.toEqual([]);
    expect(prisma.sacramentProcess.findMany).not.toHaveBeenCalled();
  });

  it('diocesano vê só a própria diocese', async () => {
    await service.list({ id: 'd', role: UserRole.DIOCESAN_ADMIN, dioceseId: 'd1' } as any);
    expect(prisma.sacramentProcess.findMany.mock.calls[0][0].where).toEqual({
      deletedAt: null,
      community: { parish: { dioceseId: 'd1' } },
    });
  });

  it('coordenador de comunidade sem comunidade → vazio', async () => {
    await expect(
      service.list({ id: 'c', role: UserRole.COMMUNITY_COORDINATOR, parishId: 'p1' } as any),
    ).resolves.toEqual([]);
    expect(prisma.sacramentProcess.findMany).not.toHaveBeenCalled();
  });

  it('coordenador de comunidade vê a própria comunidade; PARISH_ADMIN, a paróquia', async () => {
    await service.list(
      { id: 'c', role: UserRole.COMMUNITY_COORDINATOR, communityId: 'c1' } as any,
      SacramentProcessStatus.SCHEDULED,
    );
    expect(prisma.sacramentProcess.findMany.mock.calls[0][0].where).toEqual({
      deletedAt: null,
      status: SacramentProcessStatus.SCHEDULED,
      community: { id: 'c1' },
    });
    await service.list({ id: 'a', role: UserRole.PARISH_ADMIN, parishId: 'p1' } as any);
    expect(prisma.sacramentProcess.findMany.mock.calls[1][0].where).toEqual({
      deletedAt: null,
      community: { parishId: 'p1' },
    });
  });

  it('SYSTEM_ADMIN sem filtro de comunidade', async () => {
    await service.list({ id: 's', role: UserRole.SYSTEM_ADMIN } as any);
    expect(prisma.sacramentProcess.findMany.mock.calls[0][0].where).toEqual({ deletedAt: null });
  });
});
