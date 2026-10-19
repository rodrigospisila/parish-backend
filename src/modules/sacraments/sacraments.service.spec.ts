import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MemberStatus, SacramentRecordKind, SacramentType, UserRole } from '@prisma/client';
import { SacramentsService } from './sacraments.service';
import { SacramentCertificateService } from './sacrament-certificate.service';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';
import { PdfService } from '../pdf/pdf.service';

const member = {
  id: 'm1',
  userId: null,
  communityId: 'c1',
  status: MemberStatus.ACTIVE,
  fullName: 'Maria da Silva',
  birthDate: new Date('2010-03-04T15:00:00.000Z'),
  fatherName: 'José da Silva',
  motherName: 'Ana da Silva',
};

const record = {
  id: 's1',
  memberId: 'm1',
  type: SacramentType.BAPTISM,
  date: new Date('2011-05-01T15:00:00.000Z'),
  place: 'Matriz',
  minister: 'Pe. João',
  notes: null,
  book: '3',
  page: '12',
  term: '45',
  recordKind: SacramentRecordKind.RECORD,
  personSnapshot: null,
};

const coordinator = { id: 'coord', role: UserRole.COMMUNITY_COORDINATOR, communityId: 'c1' } as any;
const parishAdmin = { id: 'adm', role: UserRole.PARISH_ADMIN, parishId: 'p1' } as any;
const systemAdmin = { id: 'sys', role: UserRole.SYSTEM_ADMIN } as any;

describe('SacramentsService (2.1)', () => {
  let service: SacramentsService;
  let prisma: any;
  let hierarchy: { canManageMember: jest.Mock };
  let audit: { log: jest.Mock };
  let pdf: { renderCertificateDocument: jest.Mock };

  beforeEach(async () => {
    prisma = {
      member: { findFirst: jest.fn(), findUnique: jest.fn() },
      community: { findUnique: jest.fn().mockResolvedValue({ laySacramentRecords: false }) },
      sacrament: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(async ({ data }: any) => ({ ...record, ...data })),
        delete: jest.fn(),
      },
      sacramentProcess: { updateMany: jest.fn().mockResolvedValue({ count: 0 }), findFirst: jest.fn() },
    };
    hierarchy = { canManageMember: jest.fn() };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    pdf = { renderCertificateDocument: jest.fn().mockResolvedValue(Buffer.from('%PDF')) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SacramentsService,
        SacramentCertificateService,
        { provide: PrismaService, useValue: prisma },
        { provide: HierarchyService, useValue: hierarchy },
        { provide: AuditService, useValue: audit },
        { provide: PdfService, useValue: pdf },
      ],
    }).compile();
    service = module.get<SacramentsService>(SacramentsService);
  });

  it('nega criar sacramento para membro fora do escopo', async () => {
    prisma.member.findFirst.mockResolvedValue({ ...member, userId: 'outro' });
    hierarchy.canManageMember.mockResolvedValue(false);

    await expect(
      service.create(
        { memberId: 'm1', type: SacramentType.BAPTISM, date: '2020-01-01' } as any,
        { id: 'intruso', role: UserRole.COMMUNITY_COORDINATOR } as any,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.sacrament.create).not.toHaveBeenCalled();
  });

  it('lança NotFound quando membro não existe', async () => {
    prisma.member.findFirst.mockResolvedValue(null);
    await expect(
      service.findByMember('inexistente', { id: 'u', role: UserRole.SYSTEM_ADMIN } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('SYSTEM_ADMIN acessa sacramentos sem checar hierarquia', async () => {
    prisma.member.findFirst.mockResolvedValue(member);
    prisma.sacrament.findMany.mockResolvedValue([]);

    await service.findByMember('m1', systemAdmin);

    expect(hierarchy.canManageMember).not.toHaveBeenCalled();
  });

  describe('parametrização por comunidade (eng-acessos-08)', () => {
    beforeEach(() => {
      prisma.member.findFirst.mockResolvedValue(member);
      hierarchy.canManageMember.mockResolvedValue(true);
      prisma.sacrament.create.mockImplementation(async ({ data }: any) => ({ id: 'novo', ...data }));
    });

    it('coordenador leigo sem laySacramentRecords: 403 com a mensagem do contrato, nada gravado', async () => {
      await expect(
        service.create({ memberId: 'm1', type: SacramentType.CONFIRMATION, date: '2021-05-01' } as any, coordinator),
      ).rejects.toThrow('Nesta comunidade, só a secretaria paroquial registra sacramentos');
      expect(prisma.community.findUnique).toHaveBeenCalledWith({
        where: { id: 'c1' },
        select: { laySacramentRecords: true },
      });
      expect(prisma.sacrament.create).not.toHaveBeenCalled();
    });

    it('coordenador com a comunidade liberada registra o assento com snapshot da pessoa', async () => {
      prisma.community.findUnique.mockResolvedValue({ laySacramentRecords: true });
      await service.create(
        { memberId: 'm1', type: SacramentType.CONFIRMATION, date: '2021-05-01', book: ' 2 ' } as any,
        coordinator,
      );
      const data = prisma.sacrament.create.mock.calls[0][0].data;
      expect(data.recordKind).toBe(SacramentRecordKind.RECORD);
      expect(data.book).toBe('2');
      // AAAA-MM-DD ancorado ao meio-dia de Brasília (dia civil estável)
      expect(data.date.toISOString()).toBe('2021-05-01T15:00:00.000Z');
      expect(data.personSnapshot).toEqual({
        fullName: 'Maria da Silva',
        birthDate: '2010-03-04T15:00:00.000Z',
        fatherName: 'José da Silva',
        motherName: 'Ana da Silva',
        capturedAt: expect.any(String),
      });
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'CREATE', entity: 'Sacrament' }));
    });

    it('PARISH_ADMIN registra sem depender da comunidade', async () => {
      await service.create({ memberId: 'm1', type: SacramentType.BAPTISM, date: '2021-05-01' } as any, parishAdmin);
      expect(prisma.community.findUnique).not.toHaveBeenCalled();
      expect(prisma.sacrament.create).toHaveBeenCalled();
    });

    it('sacramento só INFORMADO (sem assento) o coordenador registra mesmo sem a comunidade liberada, sem snapshot', async () => {
      await service.create(
        {
          memberId: 'm1',
          type: SacramentType.BAPTISM,
          date: '2021-05-01',
          recordKind: SacramentRecordKind.INFORMED,
        } as any,
        coordinator,
      );
      const data = prisma.sacrament.create.mock.calls[0][0].data;
      expect(data.recordKind).toBe(SacramentRecordKind.INFORMED);
      expect(data).not.toHaveProperty('personSnapshot');
    });

    it('coordenador sem a comunidade liberada não edita assento', async () => {
      prisma.sacrament.findUnique.mockResolvedValue(record);
      await expect(service.update('s1', { notes: 'x' } as any, coordinator)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.sacrament.update).not.toHaveBeenCalled();
    });
  });

  describe('retificação do assento (cat-gestao-08)', () => {
    beforeEach(() => {
      prisma.member.findFirst.mockResolvedValue(member);
      hierarchy.canManageMember.mockResolvedValue(true);
      prisma.sacrament.findUnique.mockResolvedValue(record);
    });

    it('mudar data/ministro/livro de um RECORD sem motivo: 400 "Informe o motivo da retificação"', async () => {
      for (const dto of [
        { date: '2011-05-02' },
        { minister: 'Pe. Outro' },
        { book: '4' },
        { type: SacramentType.CONFIRMATION },
        { minister: 'Pe. Outro', rectificationReason: 'curto' },
      ]) {
        await expect(service.update('s1', dto as any, parishAdmin)).rejects.toThrow('Informe o motivo da retificação');
      }
      expect(prisma.sacrament.update).not.toHaveBeenCalled();
    });

    it('reenvio dos mesmos valores (o painel manda tudo) não é retificação', async () => {
      await service.update(
        's1',
        { date: '2011-05-01T00:00:00.000Z', minister: 'Pe. João', place: 'Matriz', book: '3', page: '12', term: '45', notes: 'obs' } as any,
        parishAdmin,
      );
      const data = prisma.sacrament.update.mock.calls[0][0].data;
      expect(Object.keys(data).sort()).toEqual(['notes', 'personSnapshot']);
    });

    it('retificação com motivo: grava, anota no assento e audita antes/depois + motivo', async () => {
      await service.update(
        's1',
        { minister: 'Pe. Antônio', rectificationReason: 'Erro de transcrição do livro' } as any,
        parishAdmin,
      );
      const data = prisma.sacrament.update.mock.calls[0][0].data;
      expect(data.minister).toBe('Pe. Antônio');
      expect(data.notes).toMatch(/^Retificação em \d{2}\/\d{2}\/\d{4}: Erro de transcrição do livro$/);
      expect(data.personSnapshot).toEqual(expect.objectContaining({ fullName: 'Maria da Silva' }));
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE',
          entity: 'Sacrament',
          before: { minister: 'Pe. João' },
          after: { minister: 'Pe. Antônio' },
          metadata: expect.objectContaining({
            rectification: true,
            rectificationReason: 'Erro de transcrição do livro',
          }),
        }),
      );
    });

    it('cadastro anonimizado: retificação mantém o snapshot que existe', async () => {
      prisma.member.findFirst.mockResolvedValue({ ...member, status: MemberStatus.ANONYMIZED, fullName: 'Usuário Anônimo' });
      prisma.sacrament.findUnique.mockResolvedValue({ ...record, personSnapshot: { fullName: 'Maria da Silva' } });
      await service.update('s1', { place: 'Capela', rectificationReason: 'Local registrado errado' } as any, parishAdmin);
      expect(prisma.sacrament.update.mock.calls[0][0].data).not.toHaveProperty('personSnapshot');
    });

    it('INFORMED: edição livre (não é assento) e lavrar o assento (→ RECORD) não pede motivo', async () => {
      prisma.sacrament.findUnique.mockResolvedValue({ ...record, recordKind: SacramentRecordKind.INFORMED, book: null });
      await service.update('s1', { minister: 'Pe. Outro' } as any, coordinator);
      expect(prisma.community.findUnique).not.toHaveBeenCalled();

      await service.update('s1', { recordKind: SacramentRecordKind.RECORD, book: '9' } as any, parishAdmin);
      const data = prisma.sacrament.update.mock.calls[1][0].data;
      expect(data.recordKind).toBe(SacramentRecordKind.RECORD);
      expect(data.personSnapshot).toEqual(expect.objectContaining({ fullName: 'Maria da Silva' }));
    });
  });

  describe('DELETE (cat-gestao-08)', () => {
    it('ninguém além do SYSTEM_ADMIN apaga: 403 com a mensagem do contrato', async () => {
      for (const user of [coordinator, parishAdmin, { id: 'd', role: UserRole.DIOCESAN_ADMIN }]) {
        await expect(service.remove('s1', user as any)).rejects.toThrow(
          'Assento sacramental não se apaga. Use a retificação.',
        );
      }
      expect(prisma.sacrament.findUnique).not.toHaveBeenCalled();
      expect(prisma.sacrament.delete).not.toHaveBeenCalled();
    });

    it('SYSTEM_ADMIN remove com o assento inteiro na auditoria e solta o processo', async () => {
      prisma.sacrament.findUnique.mockResolvedValue(record);
      await service.remove('s1', systemAdmin);
      expect(prisma.sacramentProcess.updateMany).toHaveBeenCalledWith({
        where: { sacramentId: 's1' },
        data: { sacramentId: null },
      });
      expect(prisma.sacrament.delete).toHaveBeenCalledWith({ where: { id: 's1' } });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DELETE',
          before: expect.objectContaining({ book: '3', page: '12', term: '45', recordKind: 'RECORD' }),
        }),
      );
    });
  });

  describe('listagem (cat-gestao-09)', () => {
    it('cadastro anonimizado: personName vem do snapshot do assento', async () => {
      prisma.member.findFirst.mockResolvedValue({ ...member, status: MemberStatus.ANONYMIZED, fullName: 'Usuário Anônimo' });
      prisma.sacrament.findMany.mockResolvedValue([
        { ...record, personSnapshot: { fullName: 'Maria da Silva' } },
        { ...record, id: 's2', personSnapshot: null },
      ]);
      const rows: any[] = await service.findByMember('m1', systemAdmin);
      expect(rows[0].personName).toBe('Maria da Silva');
      expect(rows[1].personName).toBe('Usuário Anônimo');
      expect(rows[0].recordKind).toBe(SacramentRecordKind.RECORD);
    });
  });

  describe('certidão (cat-gestao-03)', () => {
    const parish = {
      name: 'Paróquia Santa Rita',
      address: 'Rua A, 10',
      city: 'Ponta Grossa',
      state: 'PR',
      zipCode: '84000-000',
      phone: null,
      email: null,
      priestName: 'Pe. João',
      diocese: { name: 'Diocese de Ponta Grossa' },
    };

    beforeEach(() => {
      prisma.sacrament.findUnique.mockResolvedValue(record);
      prisma.member.findUnique.mockImplementation(async ({ select }: any) =>
        select.fullName ? member : { id: 'm1', communityId: 'c1' },
      );
      hierarchy.canManageMember.mockResolvedValue(true);
      prisma.community.findUnique.mockImplementation(async ({ select }: any) =>
        select.laySacramentRecords ? { laySacramentRecords: false } : { name: 'Matriz', parish },
      );
      prisma.sacramentProcess.findFirst.mockResolvedValue({
        communityId: 'c1',
        involved: [
          { role: 'padrinho', name: 'Carlos Souza' },
          { role: 'madrinha', name: 'Rita Souza' },
          { role: 'mãe', name: 'Ana da Silva' },
        ],
      });
    });

    it('livro+folha+termo: "Certidão de Batismo" com filiação, nascimento, padrinhos, finalidade e assinaturas', async () => {
      const result = await service.certificate('s1', 'Casamento na Paróquia São José', parishAdmin);
      expect(result.kind).toBe('CERTIDAO');
      expect(result.filename).toBe('certidao-batismo.pdf');
      const input = pdf.renderCertificateDocument.mock.calls[0][0];
      expect(input.title).toBe('Certidão de Batismo');
      expect(input.organization).toContain('Paróquia Santa Rita');
      const page = input.pages[0];
      expect(page.recipientName).toBe('Maria da Silva');
      expect(page.notice).toBeUndefined();
      expect(page.fields).toEqual(
        expect.arrayContaining([
          { label: 'Nascimento', value: '04/03/2010' },
          { label: 'Filiação', value: 'José da Silva e Ana da Silva' },
          { label: 'Data da celebração', value: '01/05/2011' },
          { label: 'Ministro', value: 'Pe. João' },
          { label: 'Padrinhos', value: 'Carlos Souza e Rita Souza' },
          { label: 'Registro', value: 'Livro 3, folha 12, termo 45' },
        ]),
      );
      expect(page.closingParagraphs).toContain('Finalidade: Casamento na Paróquia São José.');
      expect(page.signatureLines).toEqual(['Pe. João\nPároco', 'Secretaria Paroquial']);
      expect(input.footer).toMatch(/^Emitido em /);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'EXPORT', metadata: expect.objectContaining({ kind: 'CERTIDAO' }) }),
      );
    });

    it('sem livro/folha/termo completos: "Declaração para conferência" com o aviso', async () => {
      prisma.sacrament.findUnique.mockResolvedValue({ ...record, term: null });
      const result = await service.certificate('s1', undefined, parishAdmin);
      expect(result.kind).toBe('DECLARACAO');
      const input = pdf.renderCertificateDocument.mock.calls[0][0];
      expect(input.title).toBe('Declaração para conferência — Batismo');
      expect(input.pages[0].notice).toMatch(/não substitui a certidão/);
    });

    it('INFORMED: 409 com a mensagem do contrato', async () => {
      prisma.sacrament.findUnique.mockResolvedValue({ ...record, recordKind: SacramentRecordKind.INFORMED });
      await expect(service.certificate('s1', undefined, parishAdmin)).rejects.toThrow(
        'Sacramento informado não gera certidão; registre o assento',
      );
      await expect(service.certificate('s1', undefined, parishAdmin)).rejects.toBeInstanceOf(ConflictException);
      expect(pdf.renderCertificateDocument).not.toHaveBeenCalled();
    });

    it('coordenador sem a comunidade liberada não emite (403); fora do escopo também não', async () => {
      await expect(service.certificate('s1', undefined, coordinator)).rejects.toThrow(
        'Nesta comunidade, só a secretaria paroquial registra sacramentos',
      );
      hierarchy.canManageMember.mockResolvedValue(false);
      await expect(service.certificate('s1', undefined, parishAdmin)).rejects.toBeInstanceOf(ForbiddenException);
      expect(pdf.renderCertificateDocument).not.toHaveBeenCalled();
    });

    it('finalidade acima de 120 caracteres: 400', async () => {
      await expect(service.certificate('s1', 'x'.repeat(121), parishAdmin)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('cadastro anonimizado: a certidão usa o snapshot do assento', async () => {
      prisma.member.findUnique.mockImplementation(async ({ select }: any) =>
        select.fullName
          ? { ...member, status: MemberStatus.ANONYMIZED, fullName: 'Usuário Anônimo', fatherName: null, motherName: null, birthDate: null }
          : { id: 'm1', communityId: 'c1' },
      );
      prisma.sacrament.findUnique.mockResolvedValue({
        ...record,
        personSnapshot: {
          fullName: 'Maria da Silva',
          birthDate: '2010-03-04T15:00:00.000Z',
          fatherName: 'José da Silva',
          motherName: 'Ana da Silva',
          capturedAt: '2026-10-19T12:00:00.000Z',
        },
      });
      const result = await service.certificate('s1', undefined, parishAdmin);
      expect(result.fromSnapshot).toBe(true);
      const page = pdf.renderCertificateDocument.mock.calls[0][0].pages[0];
      expect(page.recipientName).toBe('Maria da Silva');
      expect(page.fields).toContainEqual({ label: 'Filiação', value: 'José da Silva e Ana da Silva' });
    });

    it('cadastro anonimizado SEM snapshot: 409 (não emite certidão de "Usuário Anônimo")', async () => {
      prisma.member.findUnique.mockImplementation(async ({ select }: any) =>
        select.fullName
          ? { ...member, status: MemberStatus.ANONYMIZED, fullName: 'Usuário Anônimo' }
          : { id: 'm1', communityId: 'c1' },
      );
      await expect(service.certificate('s1', undefined, parishAdmin)).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
