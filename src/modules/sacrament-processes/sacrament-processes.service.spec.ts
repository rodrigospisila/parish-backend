import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
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

describe('SacramentProcessesService — membro do processo (create/celebrate)', () => {
  let service: SacramentProcessesService;
  let prisma: any;
  let tx: any;
  let hierarchy: { isCommunityInScope: jest.Mock };

  // Secretaria da paróquia p1: comunidades c1 (Matriz) e c2 (capela)
  const parishAdmin = { id: 'adm', role: UserRole.PARISH_ADMIN, parishId: 'p1' } as any;
  const inP1 = new Set(['c1', 'c2']);

  beforeEach(async () => {
    tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      sacramentProcess: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({ id: 'sp1', status: SacramentProcessStatus.CELEBRATED }),
      },
      sacrament: { create: jest.fn().mockResolvedValue({ id: 'sac1' }) },
    };
    prisma = {
      sacramentProcess: {
        create: jest.fn().mockResolvedValue({ id: 'sp1' }),
        findFirst: jest.fn(),
      },
      member: { findFirst: jest.fn() },
      memberCommunity: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(async (cb: any) => cb(tx)),
    };
    hierarchy = { isCommunityInScope: jest.fn(async (_user: any, communityId: string) => inP1.has(communityId)) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SacramentProcessesService,
        { provide: PrismaService, useValue: prisma },
        { provide: HierarchyService, useValue: hierarchy },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: PdfService, useValue: {} },
      ],
    }).compile();
    service = module.get(SacramentProcessesService);
  });

  const createDto = (memberId: string) => ({ type: 'BAPTISM' as any, memberId, communityId: 'c1' });

  it('create com membro de OUTRA paróquia: 403, nada gravado', async () => {
    prisma.member.findFirst.mockResolvedValue({ id: 'm-x', communityId: 'c-p2' });
    await expect(service.create(createDto('m-x'), parishAdmin)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.sacramentProcess.create).not.toHaveBeenCalled();
  });

  it('create com membro inexistente/excluído: 404, nada gravado', async () => {
    prisma.member.findFirst.mockResolvedValue(null);
    await expect(service.create(createDto('m-?'), parishAdmin)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.sacramentProcess.create).not.toHaveBeenCalled();
  });

  it('create com membro da comunidade do processo grava', async () => {
    prisma.member.findFirst.mockResolvedValue({ id: 'm1', communityId: 'c1' });
    await service.create(createDto('m1'), parishAdmin);
    expect(prisma.sacramentProcess.create).toHaveBeenCalled();
  });

  it('create com membro de outra comunidade da MESMA paróquia (escopo do ator) grava', async () => {
    prisma.member.findFirst.mockResolvedValue({ id: 'm2', communityId: 'c2' });
    await service.create(createDto('m2'), parishAdmin);
    expect(prisma.sacramentProcess.create).toHaveBeenCalled();
  });

  it('create com vínculo secundário ATIVO na comunidade do processo grava', async () => {
    const communityCoord = { id: 'cc', role: UserRole.COMMUNITY_COORDINATOR, communityId: 'c1' } as any;
    hierarchy.isCommunityInScope.mockImplementation(async (_u: any, communityId: string) => communityId === 'c1');
    prisma.member.findFirst.mockResolvedValue({ id: 'm3', communityId: 'c-p2' });
    prisma.memberCommunity.findFirst.mockResolvedValue({ id: 'link' });
    await service.create(createDto('m3'), communityCoord);
    expect(prisma.sacramentProcess.create).toHaveBeenCalled();
  });

  it('celebrate de processo antigo com membro de fora: 403, nenhum Sacrament', async () => {
    prisma.sacramentProcess.findFirst.mockResolvedValue({
      id: 'sp-old',
      memberId: 'm-x',
      communityId: 'c1',
      type: 'BAPTISM',
      status: SacramentProcessStatus.SCHEDULED,
    });
    prisma.member.findFirst.mockResolvedValue({ id: 'm-x', communityId: 'c-p2' });
    await expect(service.celebrate('sp-old', {}, parishAdmin)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('celebrate legítimo: lock por membro + CAS do status antes do Sacrament', async () => {
    prisma.sacramentProcess.findFirst.mockResolvedValue({
      id: 'sp1',
      memberId: 'm1',
      communityId: 'c1',
      type: 'BAPTISM',
      status: SacramentProcessStatus.SCHEDULED,
    });
    prisma.member.findFirst.mockResolvedValue({ id: 'm1', communityId: 'c1' });
    await service.celebrate('sp1', { book: '1' }, parishAdmin);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.sacramentProcess.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sp1', deletedAt: null, status: { not: SacramentProcessStatus.CELEBRATED } },
      }),
    );
    expect(tx.sacrament.create).toHaveBeenCalled();
  });

  it('celebrate concorrente (CAS perdeu): 400 e nenhum Sacrament duplicado', async () => {
    prisma.sacramentProcess.findFirst.mockResolvedValue({
      id: 'sp1',
      memberId: 'm1',
      communityId: 'c1',
      type: 'BAPTISM',
      status: SacramentProcessStatus.SCHEDULED,
    });
    prisma.member.findFirst.mockResolvedValue({ id: 'm1', communityId: 'c1' });
    tx.sacramentProcess.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.celebrate('sp1', {}, parishAdmin)).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.sacrament.create).not.toHaveBeenCalled();
  });
});
