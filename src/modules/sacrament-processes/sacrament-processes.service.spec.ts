import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SacramentProcessStatus, UserRole } from '@prisma/client';
import { SacramentProcessesService } from './sacrament-processes.service';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';
import { PdfService } from '../pdf/pdf.service';
import { SacramentCertificateService } from '../sacraments/sacrament-certificate.service';

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
        { provide: SacramentCertificateService, useValue: {} },
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
      sacrament: { create: jest.fn().mockResolvedValue({ id: 'sac1' }), findMany: jest.fn().mockResolvedValue([]) },
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
        { provide: SacramentCertificateService, useValue: {} },
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
  let pdf: { renderCertificateDocument: jest.Mock };
  let audit: { log: jest.Mock };
  const parishAdmin = { id: 'adm', role: UserRole.PARISH_ADMIN, parishId: 'p1' } as any;
  const coordinator = { id: 'cc', role: UserRole.COMMUNITY_COORDINATOR, communityId: 'c1' } as any;
  const scheduled = {
    id: 'sp1',
    memberId: 'm1',
    communityId: 'c1',
    type: 'BAPTISM',
    status: SacramentProcessStatus.SCHEDULED,
    scheduledDate: new Date('2026-11-10T00:00:00Z'),
    celebrant: 'Pe. Agendado',
  };
  const person = {
    id: 'm1',
    communityId: 'c1',
    status: 'ACTIVE',
    fullName: 'Ana Souza',
    birthDate: new Date('2026-01-05T15:00:00.000Z'),
    fatherName: 'Paulo Souza',
    motherName: 'Lia Souza',
  };
  const parish = {
    name: 'Paróquia Santa Rita',
    address: 'Rua A, 10',
    city: 'Ponta Grossa',
    state: 'PR',
    zipCode: '84000-000',
    phone: null,
    email: null,
    priestName: null,
    diocese: { name: 'Diocese de Ponta Grossa' },
  };
  let laySacramentRecords: boolean;

  beforeEach(async () => {
    laySacramentRecords = false;
    tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      sacramentProcess: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({ id: 'sp1', status: SacramentProcessStatus.CELEBRATED }),
      },
      sacrament: {
        create: jest.fn().mockResolvedValue({ id: 'sac1' }),
        update: jest.fn(async ({ where, data }: any) => ({ id: where.id, ...data })),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    prisma = {
      sacramentProcess: {
        create: jest.fn().mockResolvedValue({ id: 'sp1' }),
        findFirst: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      sacrament: { findUnique: jest.fn() },
      member: {
        findFirst: jest.fn().mockResolvedValue(person),
        findUnique: jest.fn().mockResolvedValue(person),
      },
      community: {
        findUnique: jest.fn(async ({ select }: any) =>
          select.laySacramentRecords ? { laySacramentRecords } : { name: 'Matriz', parish },
        ),
      },
      memberCommunity: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(async (cb: any) => cb(tx)),
    };
    pdf = { renderCertificateDocument: jest.fn().mockResolvedValue(Buffer.from('pdf')) };
    audit = { log: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SacramentProcessesService,
        { provide: PrismaService, useValue: prisma },
        { provide: HierarchyService, useValue: { isCommunityInScope: jest.fn().mockResolvedValue(true) } },
        { provide: AuditService, useValue: audit },
        SacramentCertificateService,
        { provide: PdfService, useValue: pdf },
      ],
    }).compile();
    service = module.get(SacramentProcessesService);
  });

  const celebrated = (extra: Record<string, unknown> = {}) => ({
    ...scheduled,
    status: SacramentProcessStatus.CELEBRATED,
    member: { communityId: 'c1' },
    ...extra,
  });
  const field = (label: string) =>
    pdf.renderCertificateDocument.mock.calls[0][0].pages[0].fields.find((f: any) => f.label === label)?.value;

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

  it('celebrar grava o assento (RECORD) com o snapshot da pessoa (cat-gestao-09)', async () => {
    prisma.sacramentProcess.findFirst.mockResolvedValue(scheduled);
    await service.celebrate('sp1', { book: '1', page: '2', term: '3' }, parishAdmin);
    const data = tx.sacrament.create.mock.calls[0][0].data;
    expect(data.recordKind).toBe('RECORD');
    expect(data.personSnapshot).toEqual({
      fullName: 'Ana Souza',
      birthDate: '2026-01-05T15:00:00.000Z',
      fatherName: 'Paulo Souza',
      motherName: 'Lia Souza',
      capturedAt: expect.any(String),
    });
  });

  it('eng-acessos-08: coordenador leigo só celebra/emite com a comunidade do membro liberada', async () => {
    prisma.sacramentProcess.findFirst.mockResolvedValue(scheduled);
    await expect(service.celebrate('sp1', {}, coordinator)).rejects.toThrow(
      'Nesta comunidade, só a secretaria paroquial registra sacramentos',
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();

    prisma.sacramentProcess.findFirst.mockResolvedValue(celebrated({ sacramentId: 'sac1' }));
    prisma.sacrament.findUnique.mockResolvedValue({ date: new Date('2026-11-17T15:00:00.000Z'), recordKind: 'RECORD' });
    await expect(service.certificate('sp1', coordinator)).rejects.toBeInstanceOf(ForbiddenException);
    expect(pdf.renderCertificateDocument).not.toHaveBeenCalled();

    laySacramentRecords = true;
    prisma.sacramentProcess.findFirst.mockResolvedValue(scheduled);
    await service.celebrate('sp1', {}, coordinator);
    expect(tx.sacrament.create).toHaveBeenCalled();
    prisma.sacramentProcess.findFirst.mockResolvedValue(celebrated({ sacramentId: 'sac1' }));
    await service.certificate('sp1', coordinator);
    expect(pdf.renderCertificateDocument).toHaveBeenCalled();
  });

  it('certidão usa data, celebrante e local do Sacrament da celebração, não do agendamento', async () => {
    prisma.sacramentProcess.findFirst.mockResolvedValue(
      celebrated({
        sacramentId: 'sac1',
        book: '3',
        page: '12',
        term: '45',
        involved: [{ role: 'Madrinha', name: 'Rita' }, { role: 'Padrinho', name: 'Carlos' }],
      }),
    );
    prisma.sacrament.findUnique.mockResolvedValue({
      type: 'BAPTISM',
      date: new Date('2026-11-17T15:00:00.000Z'),
      minister: 'Pe. Celebrante',
      place: 'Capela São José',
      book: '3',
      page: '12',
      term: '45',
      recordKind: 'RECORD',
      personSnapshot: null,
    });
    const result = await service.certificate('sp1', parishAdmin, 'Crisma');
    expect(result.kind).toBe('CERTIDAO');
    const input = pdf.renderCertificateDocument.mock.calls[0][0];
    expect(input.title).toBe('Certidão de Batismo');
    expect(field('Data da celebração')).toBe('17/11/2026');
    expect(field('Ministro')).toBe('Pe. Celebrante');
    expect(field('Local')).toBe('Capela São José');
    expect(field('Registro')).toBe('Livro 3, folha 12, termo 45');
    expect(field('Padrinhos')).toBe('Rita e Carlos');
    expect(field('Filiação')).toBe('Paulo Souza e Lia Souza');
    expect(input.pages[0].closingParagraphs).toContain('Finalidade: Crisma.');
    expect(input.pages[0].signatureLines).toEqual(['Pároco', 'Secretaria Paroquial']);
  });

  it('R2: assento retificado depois da celebração — a certidão do processo usa tipo e numeração do ASSENTO', async () => {
    // Celebração copiou 3/12/45 para o processo; a secretaria retificou o assento
    prisma.sacramentProcess.findFirst.mockResolvedValue(
      celebrated({ sacramentId: 'sac1', book: '3', page: '12', term: '45' }),
    );
    prisma.sacrament.findUnique.mockResolvedValue({
      type: 'CONFIRMATION',
      date: new Date('2026-11-17T15:00:00.000Z'),
      minister: 'Dom Bispo',
      place: 'Matriz',
      book: '4',
      page: '7',
      term: '19',
      recordKind: 'RECORD',
      personSnapshot: null,
    });
    const result = await service.certificate('sp1', parishAdmin);
    expect(result.kind).toBe('CERTIDAO');
    expect(result.filename).toBe('certidao-crisma.pdf');
    expect(pdf.renderCertificateDocument.mock.calls[0][0].title).toBe('Certidão de Crisma');
    expect(field('Registro')).toBe('Livro 4, folha 7, termo 19');
    expect(prisma.sacrament.findUnique.mock.calls[0][0].select.type).toBe(true);
  });

  it('R2: numeração apagada na retificação — sai "Declaração", não a "Certidão" com o número antigo do processo', async () => {
    prisma.sacramentProcess.findFirst.mockResolvedValue(
      celebrated({ sacramentId: 'sac1', book: '3', page: '12', term: '45' }),
    );
    prisma.sacrament.findUnique.mockResolvedValue({
      type: 'BAPTISM',
      date: new Date('2026-11-17T15:00:00.000Z'),
      minister: null,
      place: null,
      book: null,
      page: null,
      term: null,
      recordKind: 'RECORD',
    });
    const result = await service.certificate('sp1', parishAdmin);
    expect(result.kind).toBe('DECLARACAO');
    expect(pdf.renderCertificateDocument.mock.calls[0][0].title).toBe('Declaração para conferência — Batismo');
  });

  it('celebrado LEGADO sem Sacrament: declaração com os dados do processo e o aviso de agendamento', async () => {
    prisma.sacramentProcess.findFirst.mockResolvedValue(
      celebrated({ sacramentId: null, book: '7', page: '8', term: '21' }),
    );
    const result = await service.certificate('sp1', parishAdmin);
    // Dados do agendamento: nunca sai como "Certidão", mesmo com livro/folha/termo
    expect(result.kind).toBe('DECLARACAO');
    const page = pdf.renderCertificateDocument.mock.calls[0][0].pages[0];
    expect(page.closingParagraphs.join(' ')).toMatch(/agendamento/);
    expect(field('Data da celebração')).toBe('10/11/2026');
    expect(field('Ministro')).toBe('Pe. Agendado');
    expect(field('Local')).toBe('Não informado');
    expect(prisma.sacrament.findUnique).not.toHaveBeenCalled();
  });

  it('legado sem data agendada: declaração sai com "Não informada" na data, sem 500', async () => {
    prisma.sacramentProcess.findFirst.mockResolvedValue(
      celebrated({ scheduledDate: null, celebrant: null, sacramentId: 'sumiu' }),
    );
    prisma.sacrament.findUnique.mockResolvedValue(null);
    await service.certificate('sp1', parishAdmin);
    expect(field('Data da celebração')).toBe('Não informada');
  });

  it('assento sem livro/folha/termo: declaração para conferência, sem o aviso de agendamento', async () => {
    prisma.sacramentProcess.findFirst.mockResolvedValue(celebrated({ sacramentId: 'sac1' }));
    prisma.sacrament.findUnique.mockResolvedValue({
      date: new Date('2026-11-17T15:00:00.000Z'),
      minister: null,
      place: null,
      recordKind: 'RECORD',
    });
    const result = await service.certificate('sp1', parishAdmin);
    expect(result.kind).toBe('DECLARACAO');
    const input = pdf.renderCertificateDocument.mock.calls[0][0];
    expect(input.title).toBe('Declaração para conferência — Batismo');
    expect(input.pages[0].notice).toMatch(/não substitui a certidão/);
    expect(input.pages[0].closingParagraphs.join(' ')).not.toMatch(/agendamento/);
  });

  it('celebrar Batismo/Crisma/Ordem de quem já tem o ASSENTO: 409, nada gravado (checado sob o lock)', async () => {
    for (const type of ['BAPTISM', 'CONFIRMATION', 'HOLY_ORDERS']) {
      tx.sacrament.create.mockClear();
      tx.$queryRaw.mockClear();
      prisma.sacramentProcess.findFirst.mockResolvedValue({ ...scheduled, type });
      tx.sacrament.findMany.mockResolvedValue([{ id: 'antigo', recordKind: 'RECORD', notes: null }]);
      await expect(service.celebrate('sp1', {}, parishAdmin)).rejects.toBeInstanceOf(ConflictException);
      expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
      expect(tx.sacrament.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ where: { memberId: 'm1', type } }),
      );
      expect(tx.sacrament.create).not.toHaveBeenCalled();
    }
  });

  it('R3: INFORMED convivendo com RECORD do mesmo tipo — o ASSENTO barra (409), o informado não é promovido', async () => {
    prisma.sacramentProcess.findFirst.mockResolvedValue(scheduled);
    tx.sacrament.findMany.mockResolvedValue([
      { id: 'informado', recordKind: 'INFORMED', notes: 'Concluído na catequese: Batismo' },
      { id: 'assento', recordKind: 'RECORD', notes: null },
    ]);
    await expect(service.celebrate('sp1', {}, parishAdmin)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.sacrament.update).not.toHaveBeenCalled();
    expect(tx.sacrament.create).not.toHaveBeenCalled();
  });

  const informedRow = (extra: Record<string, unknown> = {}) => ({
    id: 'informado',
    recordKind: 'INFORMED',
    date: new Date('2026-06-01T15:00:00.000Z'),
    place: 'Matriz',
    minister: null,
    book: null,
    page: null,
    term: null,
    notes: null,
    ...extra,
  });

  it('INFORMADO da conclusão da catequese: a celebração lavra o assento nele, com antes/depois na auditoria', async () => {
    prisma.sacramentProcess.findFirst.mockResolvedValue({ ...scheduled, type: 'CONFIRMATION' });
    tx.sacrament.findMany.mockResolvedValue([informedRow({ notes: 'Concluído na catequese: Crisma' })]);
    await service.celebrate('sp1', { date: '2026-09-17', book: '5', page: '6', term: '7' }, parishAdmin);
    expect(tx.sacrament.create).not.toHaveBeenCalled();
    const call = tx.sacrament.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: 'informado' });
    expect(call.data).toMatchObject({ recordKind: 'RECORD', book: '5', page: '6', term: '7' });
    expect(call.data.notes).toMatch(/^Concluído na catequese: Crisma\nAssento lavrado/);
    expect(tx.sacramentProcess.update.mock.calls[0][0].data.sacramentId).toBe('informado');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'Sacrament',
        entityId: 'informado',
        before: expect.objectContaining({ recordKind: 'INFORMED', place: 'Matriz', book: null }),
        after: expect.objectContaining({ recordKind: 'RECORD', book: '5', date: '2026-09-17T15:00:00.000Z' }),
      }),
    );
  });

  it('R4: batismo INFORMADO de outra denominação não vira assento — 409 com code e só a opção "sob condição"', async () => {
    prisma.sacramentProcess.findFirst.mockResolvedValue(scheduled);
    tx.sacrament.findMany.mockResolvedValue([
      informedRow({
        place: 'Outra denominação: Luterana',
        notes: 'Batismo em outra denominação (Luterana) — aceito pela coordenação da catequese',
      }),
    ]);
    const error: any = await service.celebrate('sp1', {}, parishAdmin).catch((e) => e);
    expect(error).toBeInstanceOf(ConflictException);
    expect(error.getResponse()).toMatchObject({
      code: 'SACRAMENT_INFORMED_DECISION_REQUIRED',
      options: ['CONDITIONAL'],
      message: expect.stringMatching(/não se repete/),
    });
    // Nem com a decisão de lavrar sobre o informado
    await expect(
      service.celebrate(
        'sp1',
        { informedResolution: 'RECORD_INFORMED', resolutionReason: 'Família pediu o registro aqui' },
        parishAdmin,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.sacrament.update).not.toHaveBeenCalled();
    expect(tx.sacrament.create).not.toHaveBeenCalled();
  });

  it('R4: decisão "sob condição" com motivo — assento NOVO anotado, o informado fica intacto', async () => {
    prisma.sacramentProcess.findFirst.mockResolvedValue(scheduled);
    tx.sacrament.findMany.mockResolvedValue([informedRow({ place: 'Outra denominação: Mórmon' })]);
    await service.celebrate(
      'sp1',
      { informedResolution: 'CONDITIONAL', resolutionReason: 'Fórmula não trinitária — dúvida séria (cân. 869)' },
      parishAdmin,
    );
    expect(tx.sacrament.update).not.toHaveBeenCalled();
    const data = tx.sacrament.create.mock.calls[0][0].data;
    expect(data.recordKind).toBe('RECORD');
    expect(data.notes).toBe('Celebrado sob condição (cân. 845 §2 e 869) — Fórmula não trinitária — dúvida séria (cân. 869)');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'SacramentProcess',
        metadata: expect.objectContaining({ informedResolution: 'CONDITIONAL' }),
      }),
    );
  });

  it('R4: INFORMADO de outra origem (outra paróquia/histórico) exige decisão; lavrar sobre ele só com motivo', async () => {
    prisma.sacramentProcess.findFirst.mockResolvedValue(scheduled);
    tx.sacrament.findMany.mockResolvedValue([informedRow({ place: 'Paróquia São José (Curitiba)' })]);
    const error: any = await service.celebrate('sp1', {}, parishAdmin).catch((e) => e);
    expect(error).toBeInstanceOf(ConflictException);
    expect(error.getResponse()).toMatchObject({
      code: 'SACRAMENT_INFORMED_DECISION_REQUIRED',
      options: ['RECORD_INFORMED', 'CONDITIONAL'],
    });
    expect(tx.sacrament.update).not.toHaveBeenCalled();

    await expect(
      service.celebrate('sp1', { informedResolution: 'RECORD_INFORMED', resolutionReason: 'curto' }, parishAdmin),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.celebrate('sp1', { informedResolution: 'OUTRA', resolutionReason: 'motivo suficiente' }, parishAdmin),
    ).rejects.toBeInstanceOf(BadRequestException);

    await service.celebrate(
      'sp1',
      { informedResolution: 'RECORD_INFORMED', resolutionReason: 'Celebrado aqui em 2026, assento não lavrado' },
      parishAdmin,
    );
    const call = tx.sacrament.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: 'informado' });
    expect(call.data.notes).toBe(
      'Assento lavrado na celebração do processo de preparação — Celebrado aqui em 2026, assento não lavrado',
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'Sacrament',
        entityId: 'informado',
        metadata: expect.objectContaining({ informedResolution: 'RECORD_INFORMED' }),
      }),
    );
  });

  it('R4: "lavrar sobre o informado" sem informado algum → 400', async () => {
    prisma.sacramentProcess.findFirst.mockResolvedValue(scheduled);
    await expect(
      service.celebrate(
        'sp1',
        { informedResolution: 'RECORD_INFORMED', resolutionReason: 'motivo bem explicado' },
        parishAdmin,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.sacrament.create).not.toHaveBeenCalled();
  });

  it('R6: celebração sem data às 22h30 de Brasília grava o dia civil de Brasília ao meio-dia', async () => {
    jest.useFakeTimers({ now: new Date('2026-10-20T01:30:00.000Z'), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    try {
      prisma.sacramentProcess.findFirst.mockResolvedValue({ ...scheduled, type: 'FIRST_COMMUNION' });
      await service.celebrate('sp1', {}, parishAdmin);
      expect(tx.sacrament.create.mock.calls[0][0].data.date.toISOString()).toBe('2026-10-19T15:00:00.000Z');
    } finally {
      jest.useRealTimers();
    }
  });

  it('Matrimônio/Eucaristia/Unção não são barrados por registro anterior do mesmo tipo', async () => {
    tx.sacrament.findMany.mockResolvedValue([{ id: 'antigo', recordKind: 'RECORD' }]);
    for (const type of ['MARRIAGE', 'FIRST_COMMUNION', 'ANOINTING_OF_THE_SICK']) {
      prisma.sacramentProcess.findFirst.mockResolvedValue({ ...scheduled, type });
      await service.celebrate('sp1', {}, parishAdmin);
    }
    expect(tx.sacrament.findMany).not.toHaveBeenCalled();
    expect(tx.sacrament.create).toHaveBeenCalledTimes(3);
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
