import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PLAN_SKIP_KEY } from '../plans/plan.decorators';
import { CatechesisController } from './catechesis.controller';
import { SacramentType, UserRole } from '@prisma/client';
import { CatechesisService } from './catechesis.service';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PdfService } from '../pdf/pdf.service';
import { civilDayOrNull, formatCivilDate, parseCivilDate } from './civil-date';
import { CURRENT_POLICY_VERSION } from '../consents/consent.constants';

/**
 * Ondas 2–4 da auditoria (F8): data do certificado (A15), termo LGPD do
 * responsável (M8), nome completo no auto-check (B7), teto dos avisos (B8),
 * leitura dos requisitos de documento (B31), nascimento sem ano (B49) e
 * validação do encontro avulso (B64).
 */
describe('CatechesisService — ondas 2–4 (F8)', () => {
  let service: CatechesisService;
  let prisma: any;
  let tx: any;
  let notifications: { notifyUser: jest.Mock; notifyUsers: jest.Mock };
  let audit: { log: jest.Mock };

  // COMMUNITY_COORDINATOR da própria comunidade: coordena a catequese de c1
  const coord = { id: 'u1', role: UserRole.COMMUNITY_COORDINATOR, communityId: 'c1' } as any;
  const outsider = { id: 'u9', role: UserRole.FAITHFUL, communityId: 'c-p2' } as any;

  beforeEach(async () => {
    tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      member: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'child1' }),
        update: jest.fn().mockResolvedValue({}),
      },
      consent: { upsert: jest.fn().mockResolvedValue({}) },
      sacrament: { findFirst: jest.fn().mockResolvedValue({ id: 'bap' }), create: jest.fn().mockResolvedValue({ id: 'sac1' }) },
      catechesisEnrollment: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(async ({ data }: any) => ({ id: 'en1', ...data })),
        update: jest.fn(async ({ data }: any) => ({ id: 'en1', ...data })),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    prisma = {
      catechesisClass: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      catechesisCatechist: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]) },
      catechesisSession: {
        findFirst: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(async ({ data }: any) => ({ id: 's1', ...data })),
      },
      catechesisMessage: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(async ({ data }: any) => ({ id: 'msg1', ...data, createdAt: new Date(), author: { name: 'Equipe' } })),
        update: jest.fn(),
      },
      member: {
        findFirst: jest.fn(),
        findUnique: jest.fn().mockResolvedValue({ fullName: 'Fulano' }),
        update: jest.fn().mockResolvedValue({}),
      },
      sacrament: { findMany: jest.fn().mockResolvedValue([]) },
      memberCommunity: { findFirst: jest.fn().mockResolvedValue(null) },
      community: { findUnique: jest.fn() },
      pastoralCoordinator: { findMany: jest.fn().mockResolvedValue([]) },
      pastoralMember: { findMany: jest.fn().mockResolvedValue([]) },
      catechesisEnrollment: {
        findUnique: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(async ({ data }: any) => ({ id: 'en1', ...data })),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      catechesisClassDocRequirement: { findMany: jest.fn().mockResolvedValue([]) },
      consent: { upsert: jest.fn().mockResolvedValue({}), findUnique: jest.fn().mockResolvedValue(null) },
      auditLog: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: 'aud1' }),
        update: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn(async (cb: any) => cb(tx)),
    };
    // A cota de avisos conta/grava a trilha DENTRO da transação
    tx.auditLog = prisma.auditLog;
    notifications = { notifyUser: jest.fn(), notifyUsers: jest.fn() };
    audit = { log: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatechesisService,
        { provide: PrismaService, useValue: prisma },
        { provide: HierarchyService, useValue: { isCommunityInScope: jest.fn().mockResolvedValue(true) } },
        { provide: AuditService, useValue: audit },
        { provide: NotificationsService, useValue: notifications },
        {
          provide: PdfService,
          useValue: {
            renderTableDocument: jest.fn().mockResolvedValue(Buffer.from('pdf')),
            renderCertificateDocument: jest.fn().mockResolvedValue(Buffer.from('pdf')),
          },
        },
      ],
    }).compile();
    service = module.get(CatechesisService);
  });

  describe('A15 — data civil da conclusão', () => {
    it('conclusão em 05/10 sai como 05/10 no certificado (fuso de Brasília e UTC)', () => {
      const date = (service as any).parseCompletionDate('2026-10-05') as Date;
      expect(date.toISOString()).toBe('2026-10-05T15:00:00.000Z');
      expect(date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })).toBe('05/10/2026');
      expect(formatCivilDate(date)).toBe('05/10/2026');
    });

    it('conclusões antigas gravadas em meia-noite UTC também saem com o dia certo', () => {
      expect(formatCivilDate(new Date('2026-10-05T00:00:00.000Z'))).toBe('05/10/2026');
    });

    it('certificateBody imprime o dia civil', () => {
      const body = (service as any).certificateBody({
        completedAt: (service as any).parseCompletionDate('2026-10-05'),
        class: { name: 'Turma A', year: 2026, stage: { name: 'Eucaristia' }, community: { name: 'Matriz', parish: { name: 'Santa Rita' } } },
      }) as string[];
      expect(body.join(' ')).toContain('em 05/10/2026.');
    });

    it('data inválida, impossível ou futura: 400', () => {
      expect(() => parseCivilDate('abc', 'Data')).toThrow(BadRequestException);
      expect(() => parseCivilDate('2026-02-30', 'Data')).toThrow(BadRequestException);
      expect(() => parseCivilDate('2999-01-01', 'Data')).toThrow(BadRequestException);
      expect(civilDayOrNull('2026-02-29')).toBeNull();
      expect(civilDayOrNull('2028-02-29')).toBe('2028-02-29');
    });

    it('conclusão em lote grava completedAt ao meio-dia de Brasília', async () => {
      prisma.catechesisClass.findFirst.mockResolvedValue({
        id: 'cl1',
        communityId: 'c1',
        stage: { name: 'Eucaristia', sacramentType: SacramentType.FIRST_COMMUNION },
      });
      prisma.community.findUnique.mockResolvedValue({ name: 'Matriz' });
      prisma.catechesisEnrollment.findMany.mockResolvedValue([
        { id: 'en1', memberId: 'm1', status: 'ACTIVE', member: { fullName: 'Ana Maria Souza' } },
      ]);
      tx.sacrament.findFirst.mockResolvedValue(null);
      await service.completeClassBatch('cl1', { enrollmentIds: ['en1'], date: '2026-10-05' }, coord);
      const completedAt: Date = tx.catechesisEnrollment.updateMany.mock.calls[0][0].data.completedAt;
      expect(completedAt.toISOString()).toBe('2026-10-05T15:00:00.000Z');
      expect(tx.sacrament.create.mock.calls[0][0].data.date.toISOString()).toBe('2026-10-05T15:00:00.000Z');
    });
  });

  describe('B7 — "nome confere" exige o nome completo', () => {
    it('um nome só ou parte do nome não confere', () => {
      expect(CatechesisService.sameFullName('Maria', 'Maria Eduarda Souza')).toBe(false);
      expect(CatechesisService.sameFullName('Maria Eduarda', 'Maria Eduarda Souza')).toBe(false);
      // Documento com MENOS nomes que o cadastro continua não conferindo
      expect(CatechesisService.sameFullName('Maria Souza', 'Maria Eduarda Souza Lima')).toBe(false);
    });

    it('R5#6: cadastro abreviado contido na certidão completa confere (1º nome igual, ≥2 nomes inteiros)', () => {
      expect(CatechesisService.sameFullName('Maria Eduarda Souza Lima', 'Maria Eduarda Souza')).toBe(true);
      expect(CatechesisService.sameFullName('Maria Eduarda Souza Lima', 'Maria Lima')).toBe(true);
      expect(CatechesisService.sameFullName('João Pedro de Oliveira Santos', 'João Santos')).toBe(true);
    });

    it('R5#6: iniciais, Jr./Júnior e Mª', () => {
      expect(CatechesisService.sameFullName('Maria Eduarda Souza Lima', 'Maria Eduarda S. Lima')).toBe(true);
      expect(CatechesisService.sameFullName('Maria Eduarda Souza Lima', 'Maria Eduarda S.')).toBe(true);
      expect(CatechesisService.sameFullName('Maria Eduarda Souza Lima', 'Maria Eduarda P.')).toBe(false);
      expect(CatechesisService.sameFullName('Carlos Alberto Silva Júnior', 'Carlos Alberto Silva Jr.')).toBe(true);
      expect(CatechesisService.sameFullName('Carlos Alberto Silva Jr', 'Carlos Silva Junior')).toBe(true);
      expect(CatechesisService.sameFullName('Mª Aparecida dos Santos', 'Maria Aparecida Santos')).toBe(true);
      expect(CatechesisService.sameFullName('Maria Aparecida dos Santos', 'M.ª Aparecida Santos')).toBe(true);
    });

    it('R5#6: 1º nome diferente, só iniciais ou 1 nome inteiro não conferem', () => {
      expect(CatechesisService.sameFullName('Ana Maria Souza Lima', 'Maria Souza Lima')).toBe(false);
      expect(CatechesisService.sameFullName('Maria Eduarda Souza', 'Maria S.')).toBe(false);
      expect(CatechesisService.sameFullName('Maria Eduarda Souza', 'M. Eduarda Souza')).toBe(false);
      // Cada nome do documento casa uma vez só
      expect(CatechesisService.sameFullName('Maria Souza', 'Maria Souza Souza')).toBe(false);
      expect(CatechesisService.sameFullName('Maria Souza', 'Maria Souza S.')).toBe(false);
    });

    it('mesmo nome sem acento, caixa ou partículas confere', () => {
      expect(CatechesisService.sameFullName('MARIA EDUARDA DE SOUZA', 'Maria Eduarda Souza')).toBe(true);
      expect(CatechesisService.sameFullName('José da Conceição', 'Jose Conceicao')).toBe(true);
    });

    it('nome de uma palavra (ou vazio) não identifica ninguém', () => {
      expect(CatechesisService.nameTokens('Maria')).toHaveLength(1);
      expect(CatechesisService.sameFullName('', 'Maria Souza')).toBe(false);
    });
  });

  describe('B49 — nascimento só com dia/mês (ano 1900)', () => {
    const klass = { id: 'cl1', communityId: 'c1', capacity: null, stage: { sacramentType: SacramentType.BAPTISM, name: 'Batismo' } };
    const member = { id: 'm1', communityId: 'c1', birthDate: new Date('1900-05-03T00:00:00Z'), responsibleId: null, sacraments: [] };

    it('sem responsável e sem confirmação de maioridade: 400, nada gravado', async () => {
      prisma.catechesisClass.findFirst.mockResolvedValue(klass);
      prisma.member.findFirst.mockResolvedValue(member);
      await expect(service.enroll({ classId: 'cl1', memberId: 'm1' }, coord)).rejects.toThrow(/sem o ano/);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('com a maioridade confirmada pela equipe: matricula e registra no audit', async () => {
      prisma.catechesisClass.findFirst.mockResolvedValue(klass);
      prisma.member.findFirst.mockResolvedValue(member);
      await service.enroll({ classId: 'cl1', memberId: 'm1', confirmAdult: true }, coord);
      expect(tx.catechesisEnrollment.create).toHaveBeenCalled();
      expect(audit.log.mock.calls.at(-1)[0].metadata).toEqual({ confirmedAdult: true });
    });

    it('com responsável vinculado: matricula sem confirmação', async () => {
      prisma.catechesisClass.findFirst.mockResolvedValue(klass);
      prisma.member.findFirst.mockResolvedValue({ ...member, responsibleId: 'resp1' });
      await service.enroll({ classId: 'cl1', memberId: 'm1' }, coord);
      expect(tx.catechesisEnrollment.create).toHaveBeenCalled();
    });
  });

  describe('M8 — termo LGPD do responsável', () => {
    const openClass = {
      id: 'cl1',
      communityId: 'c1',
      capacity: null,
      status: 'ACTIVE',
      enrollmentOpen: true,
      enrollmentOpensAt: null,
      enrollmentClosesAt: null,
      fullBehavior: 'WAITLIST',
      name: 'Turma A',
      stage: { sacramentType: SacramentType.FIRST_COMMUNION, name: 'Eucaristia' },
    };
    const guardian = { id: 'ug', role: UserRole.FAITHFUL, communityId: 'c1' } as any;

    it('inscrição online de filho novo grava quem consentiu, quando e a versão + Consent do dependente', async () => {
      prisma.member.findFirst.mockResolvedValue({ id: 'mg', communityId: 'c1' });
      prisma.catechesisClass.findFirst.mockResolvedValue(openClass);
      await service.apply(
        { classId: 'cl1', newChild: { fullName: 'Ana Clara Souza', birthDate: '2016-04-10' }, consentGiven: true, imageConsent: false },
        guardian,
      );
      const data = tx.catechesisEnrollment.create.mock.calls[0][0].data;
      expect(data).toMatchObject({
        guardianConsentChannel: 'APP',
        guardianConsentVersion: CURRENT_POLICY_VERSION,
        guardianConsentByUserId: 'ug',
        guardianConsentMemberId: 'mg',
        imageConsent: false,
        imageConsentByUserId: 'ug',
      });
      expect(data.guardianConsentAt).toBeInstanceOf(Date);
      const types = tx.consent.upsert.mock.calls.map((call: any) => [call[0].create.type, call[0].create.granted]);
      expect(types).toEqual([
        ['DATA_PROCESSING', true],
        ['IMAGE_USE', false],
      ]);
      expect(tx.consent.upsert.mock.calls[0][0].create.grantedByUserId).toBe('ug');
      // Espelho legado no Member (como o consents.setConsent)
      expect(tx.member.update).toHaveBeenCalledWith({
        where: { id: 'child1' },
        data: { consentGiven: true, consentDate: expect.any(Date) },
      });
    });

    it('adulto que se inscreve: termo registrado, sem mexer nos Consents dele', async () => {
      prisma.member.findFirst.mockResolvedValue({ id: 'mg', communityId: 'c1', birthDate: new Date('1985-04-10'), responsibleId: null });
      prisma.catechesisClass.findFirst.mockResolvedValue(openClass);
      await service.apply({ classId: 'cl1', consentGiven: true }, guardian);
      expect(tx.catechesisEnrollment.create.mock.calls[0][0].data.guardianConsentMemberId).toBe('mg');
      expect(tx.consent.upsert).not.toHaveBeenCalled();
    });

    const enrollmentRow = {
      id: 'en1',
      member: { id: 'kid', userId: null, deletedAt: null, responsibleId: 'mg', responsible: { userId: 'ug' } },
      class: { id: 'cl1', communityId: 'c1' },
    };

    it('responsável aceita pelo app uma matrícula antiga (sem termo)', async () => {
      prisma.catechesisEnrollment.findUnique.mockResolvedValue(enrollmentRow);
      prisma.member.findFirst.mockResolvedValue({ id: 'mg' });
      await service.recordEnrollmentConsent('en1', { consentGiven: true, imageConsent: true }, guardian);
      const data = prisma.catechesisEnrollment.update.mock.calls[0][0].data;
      expect(data).toMatchObject({ guardianConsentChannel: 'APP', guardianConsentMemberId: 'mg', imageConsent: true });
      expect(prisma.consent.upsert).toHaveBeenCalledTimes(2);
    });

    it('equipe lança o termo em PAPEL com a data assinada; não pode "aceitar" pelo responsável', async () => {
      prisma.catechesisEnrollment.findUnique.mockResolvedValue(enrollmentRow);
      await service.recordEnrollmentConsent('en1', { paperSignedAt: '2026-03-02', imageConsent: false }, coord);
      const data = prisma.catechesisEnrollment.update.mock.calls[0][0].data;
      expect(data).toMatchObject({ guardianConsentChannel: 'PAPER', guardianConsentMemberId: 'mg', imageConsent: false });
      expect(data.guardianConsentAt.toISOString()).toBe('2026-03-02T15:00:00.000Z');
      // Consent IMAGE_USE do dependente acompanha o papel; DATA_PROCESSING não
      const types = prisma.consent.upsert.mock.calls.map((call: any) => [call[0].create.type, call[0].create.granted]);
      expect(types).toEqual([['IMAGE_USE', false]]);
      await expect(service.recordEnrollmentConsent('en1', { consentGiven: true }, coord)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('quem não é da família nem da coordenação: 403', async () => {
      prisma.catechesisEnrollment.findUnique.mockResolvedValue(enrollmentRow);
      await expect(
        service.recordEnrollmentConsent('en1', { paperSignedAt: '2026-03-02' }, outsider),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.catechesisEnrollment.update).not.toHaveBeenCalled();
    });

    it('matrícula manual com termo em papel grava o canal e o responsável', async () => {
      prisma.catechesisClass.findFirst.mockResolvedValue({
        id: 'cl1',
        communityId: 'c1',
        capacity: null,
        stage: { sacramentType: SacramentType.BAPTISM, name: 'Batismo' },
      });
      prisma.member.findFirst.mockResolvedValue({ id: 'kid', communityId: 'c1', birthDate: null, responsibleId: 'mg', sacraments: [] });
      await service.enroll({ classId: 'cl1', memberId: 'kid', paperConsentSignedAt: '2026-02-10', imageConsent: true }, coord);
      expect(tx.catechesisEnrollment.create.mock.calls[0][0].data).toMatchObject({
        guardianConsentChannel: 'PAPER',
        guardianConsentMemberId: 'mg',
        guardianConsentByUserId: 'u1',
        imageConsent: true,
      });
    });
  });

  describe('B8 — teto dos avisos da equipe', () => {
    const klass = { id: 'cl1', communityId: 'c1', name: 'Turma A', time: null, stage: {} };

    it('aviso à turma além do teto do dia: 400 e nenhum envio', async () => {
      prisma.catechesisClass.findFirst.mockResolvedValue(klass);
      prisma.auditLog.count.mockResolvedValueOnce(5).mockResolvedValueOnce(5);
      await expect(service.notifyClassFamilies('cl1', 'Reunião amanhã', coord)).rejects.toThrow(/Limite de 5 avisos/);
      expect(notifications.notifyUsers).not.toHaveBeenCalled();
    });

    it('autor que passou do teto em várias turmas: 400', async () => {
      prisma.catechesisClass.findFirst.mockResolvedValue(klass);
      prisma.auditLog.count.mockResolvedValueOnce(0).mockResolvedValueOnce(20);
      await expect(service.notifyClassFamilies('cl1', 'Reunião amanhã', coord)).rejects.toThrow(/por pessoa/);
    });

    it('dentro do teto: envia e conta pela trilha (entidade + turma)', async () => {
      prisma.catechesisClass.findFirst.mockResolvedValue(klass);
      prisma.catechesisEnrollment.findMany.mockResolvedValue([{ member: { userId: 'fam1', responsible: null } }]);
      await service.notifyClassFamilies('cl1', 'Reunião amanhã', coord);
      expect(prisma.auditLog.count.mock.calls[0][0].where).toMatchObject({ entity: 'CatechesisClassMessage', entityId: 'cl1' });
      expect(notifications.notifyUsers).toHaveBeenCalledTimes(1);
    });

    it('encontro novo além do teto de avisos automáticos: grava o encontro, sem push', async () => {
      prisma.catechesisClass.findFirst.mockResolvedValue(klass);
      prisma.auditLog.count.mockResolvedValue(10);
      prisma.catechesisEnrollment.findMany.mockResolvedValue([{ member: { userId: 'fam1', responsible: null } }]);
      const year = new Date().getFullYear() + 1;
      await service.createSession('cl1', { date: `${year}-03-10` }, coord);
      expect(prisma.catechesisSession.create).toHaveBeenCalled();
      expect(notifications.notifyUsers).not.toHaveBeenCalled();
    });

    it('mensagem da equipe na conversa também tem teto', async () => {
      jest.spyOn(service as any, 'resolveConversationSide').mockResolvedValue({
        isTeam: true,
        enrollment: { status: 'ACTIVE', classId: 'cl1', class: { communityId: 'c1' }, member: { fullName: 'Ana', userId: null, responsible: { userId: 'fam1' } } },
      });
      prisma.catechesisMessage.count.mockResolvedValueOnce(30).mockResolvedValueOnce(30);
      await expect(service.sendMessage('en1', 'Oi', coord)).rejects.toThrow(/30 mensagens/);
      expect(prisma.catechesisMessage.create).not.toHaveBeenCalled();
    });
  });

  describe('B64 — encontro avulso', () => {
    beforeEach(() => {
      prisma.catechesisClass.findFirst.mockResolvedValue({ id: 'cl1', communityId: 'c1', name: 'Turma A', time: null, stage: {} });
    });

    it("data 'abc' ou impossível: 400 (antes 500)", async () => {
      await expect(service.createSession('cl1', { date: 'abc' }, coord)).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.createSession('cl1', { date: '2026-02-30' }, coord)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.catechesisSession.create).not.toHaveBeenCalled();
    });

    it('encontro já existente no dia: 409', async () => {
      prisma.catechesisSession.findFirst.mockResolvedValue({ id: 's0' });
      await expect(service.createSession('cl1', { date: '2026-03-10' }, coord)).rejects.toBeInstanceOf(ConflictException);
    });

    it('corrida no índice único (P2002): 409', async () => {
      prisma.catechesisSession.create.mockRejectedValue({ code: 'P2002' });
      await expect(service.createSession('cl1', { date: '2026-03-10' }, coord)).rejects.toBeInstanceOf(ConflictException);
    });

    it('grava o dia na convenção dos encontros (meia-noite UTC)', async () => {
      await service.createSession('cl1', { date: '2026-03-10', topic: '  Criação ' }, coord);
      expect(prisma.catechesisSession.create.mock.calls[0][0].data).toEqual({
        classId: 'cl1',
        date: new Date('2026-03-10T00:00:00Z'),
        topic: 'Criação',
      });
    });
  });

  describe('B31 — requisitos de documento da turma', () => {
    const klass = { id: 'cl1', communityId: 'c1', enrollmentOpen: false, enrollmentOpensAt: null, enrollmentClosesAt: null };

    it('autenticado de outra paróquia, sem matrícula na turma: 403', async () => {
      prisma.catechesisClass.findFirst.mockResolvedValue(klass);
      prisma.member.findFirst.mockResolvedValue({ id: 'mx', communityId: 'c-p2' });
      await expect(service.getClassDocRequirements('cl1', outsider)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('família com matrícula (própria ou de dependente) lê', async () => {
      prisma.catechesisClass.findFirst.mockResolvedValue(klass);
      prisma.member.findFirst.mockResolvedValue({ id: 'mg', communityId: 'c1' });
      prisma.catechesisEnrollment.findFirst.mockResolvedValue({ id: 'en1' });
      const rows = await service.getClassDocRequirements('cl1', { id: 'ug', role: UserRole.FAITHFUL } as any);
      expect(rows.length).toBeGreaterThan(0);
    });

    it('inscrições abertas: quem tem vínculo com a comunidade lê (tela de inscrição)', async () => {
      prisma.catechesisClass.findFirst.mockResolvedValue({ ...klass, enrollmentOpen: true });
      prisma.member.findFirst.mockResolvedValue({ id: 'mg', communityId: 'c1' });
      const rows = await service.getClassDocRequirements('cl1', { id: 'ug', role: UserRole.FAITHFUL } as any);
      expect(rows.length).toBeGreaterThan(0);
    });
  });

  describe('Revisão adversarial R5/R2 — termo e imagem (K1)', () => {
    const guardian = { id: 'ug', role: UserRole.FAITHFUL, communityId: 'c1' } as any;
    const kidRow = {
      id: 'en1',
      imageConsent: null,
      imageConsentByUserId: null,
      member: { id: 'kid', userId: null, deletedAt: null, responsibleId: 'mg', birthDate: new Date('2016-04-10'), responsible: { userId: 'ug' } },
      class: { id: 'cl1', communityId: 'c1' },
    };
    const teenRow = {
      ...kidRow,
      id: 'en2',
      member: { ...kidRow.member, id: 'teen', userId: 'uteen' },
    };

    it('R5#1/R2#21: responsável responde SÓ a imagem → DATA_PROCESSING não é regravado (revogação preservada)', async () => {
      prisma.catechesisEnrollment.findUnique.mockResolvedValue(kidRow);
      prisma.member.findFirst.mockResolvedValue({ id: 'mg' });
      await service.recordEnrollmentConsent('en1', { imageConsent: false }, guardian);
      const calls = prisma.consent.upsert.mock.calls.map((c: any) => [c[0].where.memberId_type.type, c[0].update.granted]);
      expect(calls).toEqual([['IMAGE_USE', false]]);
      expect(prisma.member.update).not.toHaveBeenCalled();
    });

    it('R5#1: termo aceito pelo responsável grava DATA_PROCESSING e espelha Member.consentGiven', async () => {
      prisma.catechesisEnrollment.findUnique.mockResolvedValue(kidRow);
      prisma.member.findFirst.mockResolvedValue({ id: 'mg' });
      await service.recordEnrollmentConsent('en1', { consentGiven: true, imageConsent: true }, guardian);
      expect(prisma.consent.upsert.mock.calls[0][0].where.memberId_type.type).toBe('DATA_PROCESSING');
      expect(prisma.member.update).toHaveBeenCalledWith({
        where: { id: 'kid' },
        data: { consentGiven: true, consentDate: expect.any(Date) },
      });
    });

    it('R5#2/R2#23: catequizando com responsável, pela própria conta: 403 no termo e na imagem, nada gravado', async () => {
      prisma.catechesisEnrollment.findUnique.mockResolvedValue(teenRow);
      prisma.member.findFirst.mockResolvedValue({ id: 'teen' });
      const teen = { id: 'uteen', role: UserRole.FAITHFUL } as any;
      await expect(service.recordEnrollmentConsent('en2', { consentGiven: true }, teen)).rejects.toThrow(/respondidos pelo responsável/);
      await expect(service.recordEnrollmentConsent('en2', { imageConsent: true }, teen)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.catechesisEnrollment.update).not.toHaveBeenCalled();
      expect(prisma.consent.upsert).not.toHaveBeenCalled();
    });

    it('R5#2: menor SEM responsável vinculado (nascimento < 18, ano 1900 ou sem data) também não responde', async () => {
      const teen = { id: 'uteen', role: UserRole.FAITHFUL } as any;
      const thisYear = Number(new Date().toISOString().slice(0, 4));
      for (const birthDate of [new Date(`${thisYear - 15}-01-01`), new Date('1900-05-03'), null]) {
        prisma.catechesisEnrollment.findUnique.mockResolvedValue({
          ...teenRow,
          member: { ...teenRow.member, responsibleId: null, responsible: null, birthDate },
        });
        await expect(service.recordEnrollmentConsent('en2', { consentGiven: true }, teen)).rejects.toBeInstanceOf(
          ForbiddenException,
        );
      }
      expect(prisma.catechesisEnrollment.update).not.toHaveBeenCalled();
    });

    it('R5#2: adulto sem responsável dá o próprio termo (e imagem), sem mexer nos Consents dele', async () => {
      prisma.catechesisEnrollment.findUnique.mockResolvedValue({
        ...teenRow,
        member: { ...teenRow.member, responsibleId: null, responsible: null, birthDate: new Date('1990-02-01') },
      });
      prisma.member.findFirst.mockResolvedValue({ id: 'teen' });
      await service.recordEnrollmentConsent('en2', { consentGiven: true, imageConsent: false }, { id: 'uteen', role: UserRole.FAITHFUL } as any);
      expect(prisma.catechesisEnrollment.update.mock.calls[0][0].data).toMatchObject({
        guardianConsentChannel: 'APP',
        guardianConsentMemberId: 'teen',
        imageConsent: false,
      });
      expect(prisma.consent.upsert).not.toHaveBeenCalled();
    });

    it('R5#2: responsável do adolescente com conta própria responde por ele', async () => {
      prisma.catechesisEnrollment.findUnique.mockResolvedValue(teenRow);
      prisma.member.findFirst.mockResolvedValue({ id: 'mg' });
      await service.recordEnrollmentConsent('en2', { consentGiven: true }, guardian);
      expect(prisma.catechesisEnrollment.update.mock.calls[0][0].data).toMatchObject({ guardianConsentMemberId: 'mg' });
    });

    it('R5#2: needsGuardian — 18 anos completos no dia civil', () => {
      const today = new Date().toISOString().slice(0, 10);
      const [y, m, d] = today.split('-').map(Number);
      const iso = (year: number, month: number, day: number) =>
        new Date(Date.UTC(year, month - 1, day));
      expect(CatechesisService.needsGuardian({ responsibleId: null, birthDate: iso(y - 30, m, d) })).toBe(false);
      expect(CatechesisService.needsGuardian({ responsibleId: null, birthDate: iso(y - 10, m, d) })).toBe(true);
      expect(CatechesisService.needsGuardian({ responsibleId: 'mg', birthDate: iso(y - 30, m, d) })).toBe(true);
      expect(CatechesisService.needsGuardian({ responsibleId: null, birthDate: null })).toBe(true);
      expect(CatechesisService.needsGuardian({ responsibleId: null, birthDate: new Date('1900-01-15') })).toBe(true);
    });

    it('R5#2: menor que se inscreve pela própria conta → inscrição entra com termo e imagem PENDENTES', async () => {
      const thisYear = Number(new Date().toISOString().slice(0, 4));
      prisma.member.findFirst.mockResolvedValue({ id: 'teen', communityId: 'c1', birthDate: new Date(`${thisYear - 14}-03-01`), responsibleId: null });
      prisma.catechesisClass.findFirst.mockResolvedValue({
        id: 'cl1',
        communityId: 'c1',
        capacity: null,
        status: 'ACTIVE',
        enrollmentOpen: true,
        enrollmentOpensAt: null,
        enrollmentClosesAt: null,
        fullBehavior: 'WAITLIST',
        name: 'Turma A',
        stage: { sacramentType: SacramentType.CONFIRMATION, name: 'Crisma' },
      });
      await service.apply({ classId: 'cl1', consentGiven: true, imageConsent: true }, { id: 'uteen', role: UserRole.FAITHFUL, communityId: 'c1' } as any);
      const data = tx.catechesisEnrollment.create.mock.calls[0][0].data;
      expect(data.guardianConsentAt).toBeUndefined();
      expect(data.guardianConsentChannel).toBeUndefined();
      expect(data.imageConsent).toBeNull();
    });

    it('R2#22: equipe não grava imagem sem o termo em papel (paperSignedAt)', async () => {
      prisma.catechesisEnrollment.findUnique.mockResolvedValue(kidRow);
      await expect(service.recordEnrollmentConsent('en1', { imageConsent: true }, coord)).rejects.toThrow(/termo em papel/);
      expect(prisma.catechesisEnrollment.update).not.toHaveBeenCalled();
      expect(prisma.consent.upsert).not.toHaveBeenCalled();
    });

    it('R2#22: equipe não sobrescreve o "não autorizo" que o responsável deu pelo app (409)', async () => {
      prisma.catechesisEnrollment.findUnique.mockResolvedValue({ ...kidRow, imageConsent: false, imageConsentByUserId: 'ug' });
      await expect(
        service.recordEnrollmentConsent('en1', { paperSignedAt: '2026-03-02', imageConsent: true }, coord),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.catechesisEnrollment.update).not.toHaveBeenCalled();
    });

    it('R2#22: "não autorizo" dado em Meus dados (Consent do responsável) também prevalece', async () => {
      prisma.catechesisEnrollment.findUnique.mockResolvedValue(kidRow);
      prisma.consent.findUnique.mockResolvedValue({ granted: false, grantedByUserId: 'ug' });
      await expect(
        service.recordEnrollmentConsent('en1', { paperSignedAt: '2026-03-02', imageConsent: true }, coord),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('R2#22: papel com a MESMA resposta do app: grava o termo e mantém o registro do app', async () => {
      prisma.catechesisEnrollment.findUnique.mockResolvedValue({ ...kidRow, imageConsent: false, imageConsentByUserId: 'ug' });
      await service.recordEnrollmentConsent('en1', { paperSignedAt: '2026-03-02', imageConsent: false }, coord);
      const data = prisma.catechesisEnrollment.update.mock.calls[0][0].data;
      expect(data.guardianConsentChannel).toBe('PAPER');
      expect(data.imageConsent).toBeUndefined();
      expect(data.imageConsentByUserId).toBeUndefined();
      expect(prisma.consent.upsert).not.toHaveBeenCalled();
    });

    it('R2#22: resposta anterior lançada pela EQUIPE pode ser corrigida pelo papel; Consent IMAGE_USE sincronizado', async () => {
      prisma.catechesisEnrollment.findUnique.mockResolvedValue({ ...kidRow, imageConsent: true, imageConsentByUserId: 'u1' });
      await service.recordEnrollmentConsent('en1', { paperSignedAt: '2026-03-02', imageConsent: false }, coord);
      expect(prisma.catechesisEnrollment.update.mock.calls[0][0].data).toMatchObject({ imageConsent: false, imageConsentByUserId: 'u1' });
      const upsert = prisma.consent.upsert.mock.calls[0][0];
      expect(upsert.where.memberId_type).toEqual({ memberId: 'kid', type: 'IMAGE_USE' });
      expect(upsert.update).toMatchObject({ granted: false, grantedByUserId: 'u1' });
    });

    it('R2#22: matrícula manual com imagem e sem termo em papel: 400', async () => {
      prisma.catechesisClass.findFirst.mockResolvedValue({
        id: 'cl1',
        communityId: 'c1',
        capacity: null,
        stage: { sacramentType: SacramentType.BAPTISM, name: 'Batismo' },
      });
      await expect(service.enroll({ classId: 'cl1', memberId: 'kid', imageConsent: true }, coord)).rejects.toThrow(/termo em papel/);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('my-family diz se a conta pode responder o termo (menor vê, mas não responde)', async () => {
      const thisYear = Number(new Date().toISOString().slice(0, 4));
      prisma.member.findFirst.mockResolvedValue({ id: 'teen', birthDate: new Date(`${thisYear - 13}-01-01`), responsibleId: 'mg' });
      prisma.catechesisEnrollment.findMany.mockResolvedValue([
        {
          id: 'en2',
          classId: 'cl1',
          status: 'ACTIVE',
          member: { id: 'teen', fullName: 'Teen' },
          class: { id: 'cl1', communityId: 'c1', name: 'Turma', year: 2026, stage: {}, community: {} },
          attendances: [],
          documents: [],
          _count: { assessments: 0, messages: 0 },
        },
      ]);
      prisma.catechesisSession.findMany = jest.fn().mockResolvedValue([]);
      prisma.catechesisFee = { findMany: jest.fn().mockResolvedValue([]) };
      const rows: any[] = await service.getMyFamilyCatechesis({ id: 'uteen', role: UserRole.FAITHFUL } as any);
      expect(rows[0].canAnswerConsent).toBe(false);
    });

    it('R2#34: PATCH enrollments/:id/consent fora do plano (@SkipPlanCheck)', () => {
      const handler = CatechesisController.prototype.recordConsent;
      expect(Reflect.getMetadata(PLAN_SKIP_KEY, handler)).toBe(true);
    });
  });

  describe('R5#3 — transferência e renovação levam o termo e a imagem', () => {
    const consentFields = {
      imageConsent: false,
      imageConsentAt: new Date('2026-02-01T12:00:00Z'),
      imageConsentByUserId: 'ug',
      guardianConsentAt: new Date('2026-02-01T12:00:00Z'),
      guardianConsentChannel: 'APP',
      guardianConsentVersion: CURRENT_POLICY_VERSION,
      guardianConsentByUserId: 'ug',
      guardianConsentMemberId: 'mg',
    };

    it('transferência copia guardianConsent* e imageConsent* para a matrícula nova', async () => {
      prisma.catechesisEnrollment.findUnique.mockResolvedValue({
        id: 'en1',
        classId: 'cl1',
        memberId: 'kid',
        status: 'ACTIVE',
        pendingDocuments: null,
        unbaptized: false,
        class: { id: 'cl1', communityId: 'c1' },
        ...consentFields,
      });
      prisma.catechesisClass.findFirst.mockResolvedValue({ id: 'cl2', communityId: 'c1', status: 'ACTIVE', stage: {} });
      tx.$queryRaw.mockResolvedValue([{ status: 'ACTIVE', capacity: null }]);
      tx.catechesisEnrollment.create.mockImplementation(async ({ data }: any) => ({ id: 'en9', ...data }));
      await service.transferEnrollment('en1', 'cl2', coord);
      expect(tx.catechesisEnrollment.create.mock.calls[0][0].data).toMatchObject({ classId: 'cl2', ...consentFields });
    });

    it('transferência para matrícula já existente no destino também copia (reativação)', async () => {
      prisma.catechesisEnrollment.findUnique.mockResolvedValue({
        id: 'en1',
        classId: 'cl1',
        memberId: 'kid',
        status: 'ACTIVE',
        pendingDocuments: null,
        unbaptized: false,
        class: { id: 'cl1', communityId: 'c1' },
        ...consentFields,
      });
      prisma.catechesisClass.findFirst.mockResolvedValue({ id: 'cl2', communityId: 'c1', status: 'ACTIVE', stage: {} });
      tx.$queryRaw.mockResolvedValue([{ status: 'ACTIVE', capacity: null }]);
      tx.catechesisEnrollment.findUnique.mockResolvedValue({ id: 'en-old', status: 'DROPPED_OUT' });
      await service.transferEnrollment('en1', 'cl2', coord);
      expect(tx.catechesisEnrollment.update.mock.calls[0][0].data).toMatchObject({ status: 'ACTIVE', ...consentFields });
    });

    it('renovação copia o termo e a imagem; origem sem resposta não apaga a do destino', async () => {
      prisma.catechesisClass.findFirst
        .mockResolvedValueOnce({ id: 'cl1', communityId: 'c1', status: 'ACTIVE', stage: { ordering: 1, parishId: 'p1', sacramentType: null } })
        .mockResolvedValueOnce({ id: 'cl2', communityId: 'c1', status: 'ACTIVE', capacity: null, stage: { ordering: 2, sacramentType: null } });
      prisma.catechesisEnrollment.findMany.mockResolvedValue([
        { id: 'en1', memberId: 'kid', unbaptized: false, member: { fullName: 'Ana' }, ...consentFields },
        {
          id: 'en2',
          memberId: 'kid2',
          unbaptized: false,
          member: { fullName: 'Bia' },
          imageConsent: null,
          guardianConsentAt: null,
        },
      ]);
      prisma.sacrament.findMany.mockResolvedValue([{ memberId: 'kid' }, { memberId: 'kid2' }]);
      tx.$queryRaw.mockResolvedValue([{ status: 'ACTIVE', capacity: null }]);
      tx.catechesisEnrollment.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 'en-old', memberId: 'kid2', status: 'DROPPED_OUT' }]);
      await service.renewClass('cl1', { targetClassId: 'cl2', enrollmentIds: ['en1', 'en2'] }, coord);
      expect(tx.catechesisEnrollment.create.mock.calls[0][0].data).toMatchObject({ classId: 'cl2', memberId: 'kid', ...consentFields });
      const reactivated = tx.catechesisEnrollment.update.mock.calls[0][0].data;
      expect(reactivated.status).toBe('ACTIVE');
      expect('imageConsent' in reactivated).toBe(false);
      expect('guardianConsentAt' in reactivated).toBe(false);
    });
  });
});
