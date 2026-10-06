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
        where: {
          id: 'sp1',
          deletedAt: null,
          status: { notIn: [SacramentProcessStatus.CELEBRATED, SacramentProcessStatus.CANCELLED] },
        },
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

describe('SacramentProcessesService — status, celebração e certidão (M9/M40/B64)', () => {
  let service: SacramentProcessesService;
  let prisma: any;
  let tx: any;
  let pdf: { renderTableDocument: jest.Mock };
  const parishAdmin = { id: 'adm', role: UserRole.PARISH_ADMIN, parishId: 'p1' } as any;
  const scheduled = {
    id: 'sp1',
    memberId: 'm1',
    communityId: 'c1',
    type: 'BAPTISM',
    status: SacramentProcessStatus.SCHEDULED,
    scheduledDate: new Date('2026-11-10T00:00:00Z'),
    celebrant: 'Pe. Agendado',
  };

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
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      sacrament: { findUnique: jest.fn() },
      member: { findFirst: jest.fn().mockResolvedValue({ id: 'm1', communityId: 'c1' }) },
      memberCommunity: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(async (cb: any) => cb(tx)),
    };
    pdf = { renderTableDocument: jest.fn().mockResolvedValue(Buffer.from('pdf')) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SacramentProcessesService,
        { provide: PrismaService, useValue: prisma },
        { provide: HierarchyService, useValue: { isCommunityInScope: jest.fn().mockResolvedValue(true) } },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: PdfService, useValue: pdf },
      ],
    }).compile();
    service = module.get(SacramentProcessesService);
  });

  it('PATCH status CELEBRATED (sem celebrar) ou fora do enum: 400, nada gravado', async () => {
    prisma.sacramentProcess.findFirst.mockResolvedValue(scheduled);
    await expect(service.updateStatus('sp1', SacramentProcessStatus.CELEBRATED, parishAdmin)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.updateStatus('sp1', 'X' as any, parishAdmin)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.sacramentProcess.updateMany).not.toHaveBeenCalled();
  });

  it('processo celebrado não sai de CELEBRATED (nem pelo CAS concorrente)', async () => {
    prisma.sacramentProcess.findFirst.mockResolvedValue({ ...scheduled, status: SacramentProcessStatus.CELEBRATED });
    await expect(service.updateStatus('sp1', SacramentProcessStatus.REQUESTED, parishAdmin)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    prisma.sacramentProcess.findFirst.mockResolvedValue(scheduled);
    prisma.sacramentProcess.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.updateStatus('sp1', SacramentProcessStatus.COURSE, parishAdmin)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.sacramentProcess.updateMany.mock.calls[0][0].where).toEqual({
      id: 'sp1',
      deletedAt: null,
      status: { not: SacramentProcessStatus.CELEBRATED },
    });
  });

  it('celebrar: data civil validada e gravada ao meio-dia de Brasília; cancelado não celebra', async () => {
    prisma.sacramentProcess.findFirst.mockResolvedValue(scheduled);
    await expect(service.celebrate('sp1', { date: 'abc' }, parishAdmin)).rejects.toBeInstanceOf(BadRequestException);
    await service.celebrate('sp1', { date: '2026-09-17', minister: 'Pe. X', place: 'Matriz' }, parishAdmin);
    const data = tx.sacrament.create.mock.calls[0][0].data;
    expect(data.date.toISOString()).toBe('2026-09-17T15:00:00.000Z');
    expect(data).toMatchObject({ minister: 'Pe. X', place: 'Matriz' });

    prisma.sacramentProcess.findFirst.mockResolvedValue({ ...scheduled, status: SacramentProcessStatus.CANCELLED });
    await expect(service.celebrate('sp1', {}, parishAdmin)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('certidão usa data, celebrante e local do Sacrament da celebração, não do agendamento', async () => {
    prisma.sacramentProcess.findFirst.mockResolvedValue({
      ...scheduled,
      status: SacramentProcessStatus.CELEBRATED,
      sacramentId: 'sac1',
      book: '3',
      page: '12',
      term: '45',
      member: { fullName: 'Ana Souza' },
      community: { name: 'Matriz', parish: { name: 'Santa Rita' } },
    });
    prisma.sacrament.findUnique.mockResolvedValue({
      date: new Date('2026-11-17T15:00:00.000Z'),
      minister: 'Pe. Celebrante',
      place: 'Capela São José',
      book: null,
      page: null,
      term: null,
    });
    await service.certificate('sp1', parishAdmin);
    const rows: string[][] = pdf.renderTableDocument.mock.calls[0][0].sections[0].rows;
    expect(rows).toContainEqual(['Data', '17/11/2026']);
    expect(rows).toContainEqual(['Celebrante', 'Pe. Celebrante']);
    expect(rows).toContainEqual(['Local', 'Capela São José']);
    expect(rows).toContainEqual(['Livro', '3']);
  });

  it('celebrado sem Sacrament (status trocado à mão antes da trava): sem certidão', async () => {
    prisma.sacramentProcess.findFirst.mockResolvedValue({
      ...scheduled,
      status: SacramentProcessStatus.CELEBRATED,
      sacramentId: null,
      member: { fullName: 'Ana' },
      community: { name: 'Matriz', parish: { name: 'Santa Rita' } },
    });
    await expect(service.certificate('sp1', parishAdmin)).rejects.toBeInstanceOf(BadRequestException);
    expect(pdf.renderTableDocument).not.toHaveBeenCalled();
  });

  it('create: tipo fora do enum ou data agendada inválida → 400', async () => {
    await expect(
      service.create({ type: 'X' as any, memberId: 'm1', communityId: 'c1' }, parishAdmin),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create({ type: 'BAPTISM' as any, memberId: 'm1', communityId: 'c1', scheduledDate: '10/11/2026' }, parishAdmin),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.sacramentProcess.create).not.toHaveBeenCalled();
  });
});
