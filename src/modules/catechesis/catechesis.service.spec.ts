import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { SacramentType, UserRole } from '@prisma/client';
import { CatechesisService } from './catechesis.service';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PdfService } from '../pdf/pdf.service';

describe('CatechesisService (3.1)', () => {
  let service: CatechesisService;
  let prisma: any;
  let tx: any;
  let hierarchy: { isCommunityInScope: jest.Mock };

  // Coordenador ATUAL da pastoral da Catequese da comunidade c1
  const coord = { id: 'u1', role: UserRole.PASTORAL_COORDINATOR, communityId: 'c1' } as any;
  // Coordenador de OUTRA pastoral (Música) na mesma comunidade
  const musicCoord = { id: 'u20', role: UserRole.PASTORAL_COORDINATOR, communityId: 'c1' } as any;

  /** Simula a coordenação da catequese: só u1 coordena a Catequética de c1. */
  const catechesisCoordinationFor = (userIds: string[]) => (args: any) =>
    Promise.resolve(
      userIds.includes(args?.where?.member?.userId)
        ? [{ communityPastoral: { communityId: 'c1' } }]
        : [],
    );

  beforeEach(async () => {
    tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      catechesisEnrollment: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: 'en1' }),
        update: jest.fn().mockResolvedValue({ id: 'en1', status: 'COMPLETED' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      sacrament: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'sac1' }),
      },
    };
    prisma = {
      catechesisClass: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      catechesisCatechist: { findFirst: jest.fn().mockResolvedValue(null) },
      member: { findFirst: jest.fn() },
      memberCommunity: { findFirst: jest.fn().mockResolvedValue(null) },
      community: { findUnique: jest.fn() },
      pastoralCoordinator: { findMany: jest.fn(catechesisCoordinationFor(['u1'])) },
      pastoralMember: { findMany: jest.fn().mockResolvedValue([]) },
      catechesisEnrollment: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      catechesisDocument: { findMany: jest.fn().mockResolvedValue([]) },
      sacrament: { create: jest.fn() },
      $transaction: jest.fn(async (cb: any) => cb(tx)),
    };
    hierarchy = { isCommunityInScope: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatechesisService,
        { provide: PrismaService, useValue: prisma },
        { provide: HierarchyService, useValue: hierarchy },
        { provide: AuditService, useValue: { log: jest.fn() } },
        {
          provide: NotificationsService,
          useValue: { notifyUser: jest.fn(), notifyUsers: jest.fn() },
        },
        {
          provide: PdfService,
          useValue: {
            renderTableDocument: jest.fn().mockResolvedValue(Buffer.from('pdf')),
            renderCertificateDocument: jest.fn().mockResolvedValue(Buffer.from('pdf')),
          },
        },
      ],
    }).compile();
    service = module.get<CatechesisService>(CatechesisService);
  });

  describe('enroll — validação de batismo', () => {
    it('bloqueia matrícula em etapa de Crisma sem Batismo registrado', async () => {
      prisma.catechesisClass.findFirst.mockResolvedValue({
        id: 'cl1',
        communityId: 'c1',
        stage: { sacramentType: SacramentType.CONFIRMATION, name: 'Crisma' },
      });
      prisma.member.findFirst.mockResolvedValue({ id: 'm1', communityId: 'c1', sacraments: [] });

      await expect(
        service.enroll({ classId: 'cl1', memberId: 'm1' }, coord),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(tx.catechesisEnrollment.create).not.toHaveBeenCalled();
    });

    it('permite matrícula quando há Batismo (com lock por membro na transação)', async () => {
      prisma.catechesisClass.findFirst.mockResolvedValue({
        id: 'cl1',
        communityId: 'c1',
        capacity: null,
        stage: { sacramentType: SacramentType.CONFIRMATION, name: 'Crisma' },
      });
      prisma.member.findFirst.mockResolvedValue({
        id: 'm1',
        communityId: 'c1',
        sacraments: [{ type: SacramentType.BAPTISM }],
      });

      await service.enroll({ classId: 'cl1', memberId: 'm1' }, coord);
      expect(tx.catechesisEnrollment.create).toHaveBeenCalled();
      // FOR UPDATE da turma + pg_advisory_xact_lock do membro
      expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
    });

    it('não exige batismo para a própria etapa de Batismo', async () => {
      prisma.catechesisClass.findFirst.mockResolvedValue({
        id: 'cl1',
        communityId: 'c1',
        capacity: null,
        stage: { sacramentType: SacramentType.BAPTISM, name: 'Batismo' },
      });
      prisma.member.findFirst.mockResolvedValue({ id: 'm1', communityId: 'c1', sacraments: [] });

      await service.enroll({ classId: 'cl1', memberId: 'm1' }, coord);
      expect(tx.catechesisEnrollment.create).toHaveBeenCalled();
    });
  });

  describe('enroll — catequizando precisa ser da comunidade da turma', () => {
    const baptismClass = {
      id: 'cl1',
      communityId: 'c1',
      capacity: null,
      stage: { sacramentType: SacramentType.BAPTISM, name: 'Batismo' },
    };

    it('membro de OUTRA paróquia: 403, sem transação (não limpa filas nem entra no relatório)', async () => {
      prisma.catechesisClass.findFirst.mockResolvedValue(baptismClass);
      prisma.member.findFirst.mockResolvedValue({ id: 'm-alheio', communityId: 'c-outra', sacraments: [] });

      await expect(service.enroll({ classId: 'cl1', memberId: 'm-alheio' }, coord)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(tx.catechesisEnrollment.updateMany).not.toHaveBeenCalled();
    });

    it('membro sem comunidade: 403', async () => {
      prisma.catechesisClass.findFirst.mockResolvedValue(baptismClass);
      prisma.member.findFirst.mockResolvedValue({ id: 'm-solto', communityId: null, sacraments: [] });

      await expect(service.enroll({ classId: 'cl1', memberId: 'm-solto' }, coord)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('vínculo secundário ATIVO na comunidade da turma matricula', async () => {
      prisma.catechesisClass.findFirst.mockResolvedValue(baptismClass);
      prisma.member.findFirst.mockResolvedValue({ id: 'm2', communityId: 'c-capela', sacraments: [] });
      prisma.memberCommunity.findFirst.mockResolvedValue({ id: 'link1' });

      await service.enroll({ classId: 'cl1', memberId: 'm2' }, coord);
      expect(prisma.memberCommunity.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { memberId: 'm2', communityId: 'c1', isActive: true } }),
      );
      expect(tx.catechesisEnrollment.create).toHaveBeenCalled();
    });

    it('secretaria paroquial matricula criança de outra comunidade da MESMA paróquia', async () => {
      const parishAdmin = { id: 'adm', role: UserRole.PARISH_ADMIN, parishId: 'p1' } as any;
      prisma.catechesisClass.findFirst.mockResolvedValue(baptismClass);
      prisma.member.findFirst.mockResolvedValue({ id: 'm3', communityId: 'c-capela', sacraments: [] });
      prisma.community.findUnique.mockResolvedValue({ parishId: 'p1', parish: { dioceseId: 'd1' } });

      await service.enroll({ classId: 'cl1', memberId: 'm3' }, parishAdmin);
      expect(tx.catechesisEnrollment.create).toHaveBeenCalled();
    });

    it('secretaria paroquial NÃO matricula membro de comunidade de outra paróquia', async () => {
      const parishAdmin = { id: 'adm', role: UserRole.PARISH_ADMIN, parishId: 'p1' } as any;
      prisma.catechesisClass.findFirst.mockResolvedValue(baptismClass);
      prisma.member.findFirst.mockResolvedValue({ id: 'm4', communityId: 'c-p2', sacraments: [] });
      prisma.community.findUnique.mockImplementation(async ({ where }: any) =>
        where.id === 'c1'
          ? { parishId: 'p1', parish: { dioceseId: 'd1' } }
          : { parishId: 'p2', parish: { dioceseId: 'd1' } },
      );

      await expect(service.enroll({ classId: 'cl1', memberId: 'm4' }, parishAdmin)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('completeEnrollment — gera Sacrament', () => {
    const activeEnrollment = {
      id: 'en1',
      memberId: 'm1',
      status: 'ACTIVE',
      class: {
        communityId: 'c1',
        community: { name: 'Matriz' },
        stage: { sacramentType: SacramentType.FIRST_COMMUNION, name: '1ª Eucaristia' },
      },
    };

    it('conclui (CAS de status) e cria o Sacrament da etapa', async () => {
      prisma.catechesisEnrollment.findUnique.mockResolvedValue(activeEnrollment);

      await service.completeEnrollment('en1', {}, coord);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(tx.catechesisEnrollment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'en1', status: 'ACTIVE' } }),
      );
      expect(tx.sacrament.create).toHaveBeenCalled();
    });

    it('rejeita concluir matrícula já concluída', async () => {
      prisma.catechesisEnrollment.findUnique.mockResolvedValue({
        id: 'en1',
        status: 'COMPLETED',
        class: { communityId: 'c1', community: {}, stage: {} },
      });
      await expect(service.completeEnrollment('en1', {}, coord)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  // A7 — coordenador de OUTRA pastoral não tem acesso de coordenação à catequese
  describe('coordenação da catequese (A7)', () => {
    const klass = { id: 'cl1', communityId: 'c1', stage: { name: 'Eucaristia' } };

    it('coordenador da Música (não catequista) não lê as conversas família ↔ equipe', async () => {
      prisma.catechesisClass.findFirst.mockResolvedValue(klass);
      prisma.member.findFirst.mockResolvedValue({ id: 'm20' });

      await expect(service.listClassConversations('cl1', musicCoord)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.catechesisEnrollment.findMany).not.toHaveBeenCalled();
    });

    it('coordenador da Música não conclui matrícula (nem gera Sacrament)', async () => {
      prisma.catechesisEnrollment.findUnique.mockResolvedValue({
        id: 'en1',
        memberId: 'm1',
        status: 'ACTIVE',
        class: { communityId: 'c1', community: { name: 'Matriz' }, stage: { sacramentType: null, name: 'X' } },
      });

      await expect(service.completeEnrollment('en1', {}, musicCoord)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('coordenador da Música não matricula na turma', async () => {
      prisma.catechesisClass.findFirst.mockResolvedValue({ ...klass, stage: { sacramentType: SacramentType.BAPTISM } });

      await expect(service.enroll({ classId: 'cl1', memberId: 'm1' }, musicCoord)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('coordenador ATUAL da Catequese da comunidade lê as conversas', async () => {
      prisma.catechesisClass.findFirst.mockResolvedValue(klass);
      prisma.member.findFirst.mockResolvedValue({ id: 'm1' });

      await expect(service.listClassConversations('cl1', coord)).resolves.toEqual([]);
      expect(prisma.catechesisEnrollment.findMany).toHaveBeenCalled();
    });

    it('catequista da PRÓPRIA turma mantém o acesso operacional, mesmo sem coordenar a catequese', async () => {
      prisma.catechesisClass.findFirst.mockResolvedValue(klass);
      prisma.member.findFirst.mockResolvedValue({ id: 'm20' });
      prisma.catechesisCatechist.findFirst.mockResolvedValue({ id: 'cat1' });

      await expect(service.listClassConversations('cl1', musicCoord)).resolves.toEqual([]);
    });

    it('coordenação da catequese de OUTRA comunidade não vale aqui', async () => {
      prisma.catechesisClass.findFirst.mockResolvedValue({ ...klass, communityId: 'c2' });
      prisma.member.findFirst.mockResolvedValue({ id: 'm1' });
      // a consulta é filtrada pela comunidade da turma (c2): nada encontrado
      prisma.pastoralCoordinator.findMany.mockImplementation((args: any) =>
        Promise.resolve(args?.where?.communityPastoral?.communityId === 'c1' ? [{ communityPastoral: { communityId: 'c1' } }] : []),
      );

      await expect(service.listClassConversations('cl1', coord)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('COMMUNITY_COORDINATOR da própria comunidade opera sem ser da pastoral', async () => {
      prisma.catechesisClass.findFirst.mockResolvedValue(klass);
      prisma.member.findFirst.mockResolvedValue(null);
      const communityCoord = { id: 'u5', role: UserRole.COMMUNITY_COORDINATOR, communityId: 'c1' } as any;

      await expect(service.listClassConversations('cl1', communityCoord)).resolves.toEqual([]);
    });

    it('PARISH_ADMIN de outra paróquia é barrado', async () => {
      prisma.catechesisClass.findFirst.mockResolvedValue(klass);
      prisma.member.findFirst.mockResolvedValue(null);
      prisma.community.findUnique.mockResolvedValue({ parishId: 'p1', parish: { dioceseId: 'd1' } });
      const otherParish = { id: 'u7', role: UserRole.PARISH_ADMIN, parishId: 'p2' } as any;

      await expect(service.listClassConversations('cl1', otherParish)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  // A14 + A7 — listagem de turmas sem escopo e para coordenador de outra pastoral
  describe('listClasses — escopo', () => {
    it('diocesano sem diocese/paróquia/comunidade recebe lista vazia (sem consulta)', async () => {
      const dioc = { id: 'u8', role: UserRole.DIOCESAN_ADMIN } as any;
      await expect(service.listClasses(dioc)).resolves.toEqual([]);
      expect(prisma.catechesisClass.findMany).not.toHaveBeenCalled();
    });

    it('diocesano vê só as turmas da própria diocese', async () => {
      const dioc = { id: 'u8', role: UserRole.DIOCESAN_ADMIN, dioceseId: 'd1' } as any;
      await service.listClasses(dioc);
      expect(prisma.catechesisClass.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ community: { parish: { dioceseId: 'd1' } } }),
        }),
      );
    });

    it('coordenador da Música vê só as turmas em que é catequista', async () => {
      await service.listClasses(musicCoord, 'c1');
      const where = prisma.catechesisClass.findMany.mock.calls[0][0].where;
      expect(where.communityId).toBe('c1');
      expect(where.OR).toEqual([{ catechists: { some: { member: { userId: 'u20', deletedAt: null } } } }]);
    });

    it('coordenador da Catequese vê as turmas da comunidade que coordena', async () => {
      await service.listClasses(coord);
      const where = prisma.catechesisClass.findMany.mock.calls[0][0].where;
      expect(where.OR).toEqual(expect.arrayContaining([{ communityId: { in: ['c1'] } }]));
    });
  });
});
