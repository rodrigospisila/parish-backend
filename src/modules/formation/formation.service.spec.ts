import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { FormationService } from './formation.service';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';
import { PdfService } from '../pdf/pdf.service';

describe('FormationService (3.4)', () => {
  let service: FormationService;
  let prisma: any;

  const coord = { id: 'u1', role: UserRole.PARISH_ADMIN, parishId: 'p1' } as any;

  beforeEach(async () => {
    prisma = {
      formationTrack: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn() },
      formationCourse: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn().mockResolvedValue({ id: 'cur9' }) },
      formationEnrollment: {
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({ id: 'en1' }),
      },
      member: { findFirst: jest.fn() },
      community: { findUnique: jest.fn().mockResolvedValue(null) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormationService,
        { provide: PrismaService, useValue: prisma },
        { provide: HierarchyService, useValue: {} },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: PdfService, useValue: { renderTableDocument: jest.fn() } },
      ],
    }).compile();
    service = module.get<FormationService>(FormationService);
  });

  describe('checkPrerequisite', () => {
    beforeEach(() => prisma.member.findFirst.mockResolvedValue({ id: 'm1' }));

    it('membro fora do escopo de quem consulta → 404, sem ler cursos', async () => {
      prisma.member.findFirst.mockResolvedValue(null);
      await expect(service.checkPrerequisite('m-outra', 'Ministro', coord)).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.formationCourse.findMany).not.toHaveBeenCalled();
    });

    it('sem escopo resolvido (usuário sem paróquia/comunidade) → 404', async () => {
      const semEscopo = { id: 'u9', role: UserRole.PASTORAL_COORDINATOR } as any;
      await expect(service.checkPrerequisite('m1', 'Ministro', semEscopo)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('cursos exigidos só da paróquia do membro', async () => {
      prisma.formationCourse.findMany.mockResolvedValue([]);
      await service.checkPrerequisite('m1', 'Ministro', coord);
      expect(prisma.formationCourse.findMany.mock.calls[0][0].where).toMatchObject({ parishId: 'p1', requiredForRole: 'Ministro' });
    });

    it('apto quando nenhum curso é exigido para a função', async () => {
      prisma.formationCourse.findMany.mockResolvedValue([]);
      await expect(service.checkPrerequisite('m1', 'Leitor', coord)).resolves.toEqual({
        eligible: true,
        missing: [],
      });
    });

    it('inapto quando falta curso exigido (não concluído)', async () => {
      prisma.formationCourse.findMany.mockResolvedValue([{ id: 'cur1', name: 'Curso MESC', validityMonths: 12 }]);
      prisma.formationEnrollment.findUnique.mockResolvedValue(null);

      const res = await service.checkPrerequisite('m1', 'Ministro', coord);
      expect(res.eligible).toBe(false);
      expect(res.missing).toContain('Curso MESC');
    });

    it('inapto quando a formação exigida está vencida', async () => {
      prisma.formationCourse.findMany.mockResolvedValue([{ id: 'cur1', name: 'Curso MESC', validityMonths: 12 }]);
      prisma.formationEnrollment.findUnique.mockResolvedValue({
        status: 'COMPLETED',
        expiresAt: new Date(Date.now() - 1000),
      });

      const res = await service.checkPrerequisite('m1', 'Ministro', coord);
      expect(res.eligible).toBe(false);
    });

    it('apto quando a formação exigida está concluída e válida', async () => {
      prisma.formationCourse.findMany.mockResolvedValue([{ id: 'cur1', name: 'Curso MESC', validityMonths: 12 }]);
      prisma.formationEnrollment.findUnique.mockResolvedValue({
        status: 'COMPLETED',
        expiresAt: new Date(Date.now() + 1000000),
      });

      const res = await service.checkPrerequisite('m1', 'Ministro', coord);
      expect(res.eligible).toBe(true);
    });
  });

  describe('complete — validade', () => {
    it('define expiresAt = conclusão + validityMonths', async () => {
      prisma.formationEnrollment.findUnique.mockResolvedValue({
        id: 'en1',
        course: { parishId: 'p1', validityMonths: 24 },
      });
      prisma.formationEnrollment.update.mockImplementation(({ data }: any) => data);

      const res: any = await service.complete('en1', { date: '2026-06-15T12:00:00' }, coord);
      expect(res.status).toBe('COMPLETED');
      // 2026-06 + 24 meses = 2028-06
      expect(new Date(res.expiresAt).getFullYear()).toBe(2028);
      expect(new Date(res.expiresAt).getMonth()).toBe(new Date(res.completedAt).getMonth());
    });
  });

  describe('listagens de apoio à UI', () => {
    it('listTracks restringe à paróquia do usuário', async () => {
      await service.listTracks(coord);
      expect(prisma.formationTrack.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null, parishId: 'p1' } }),
      );
    });

    it('listEnrollments valida o escopo do curso antes de listar', async () => {
      prisma.formationCourse.findFirst.mockResolvedValue({ id: 'cur1', parishId: 'outra-paroquia' });
      await expect(service.listEnrollments('cur1', coord)).rejects.toThrow('Curso fora do seu escopo');
    });

    it('listEnrollments devolve inscrições do curso em escopo', async () => {
      prisma.formationCourse.findFirst.mockResolvedValue({ id: 'cur1', parishId: 'p1' });
      await service.listEnrollments('cur1', coord);
      expect(prisma.formationEnrollment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { courseId: 'cur1' } }),
      );
    });
  });

  // A14 — usuário sem parishId (diocesano, coordenador sem paróquia) não vê o país inteiro
  describe('escopo das listagens (A14)', () => {
    const diocesanNoScope = { id: 'd0', role: UserRole.DIOCESAN_ADMIN } as any;
    const diocesan = { id: 'd1u', role: UserRole.DIOCESAN_ADMIN, dioceseId: 'd1' } as any;

    it('diocesano sem diocese → trilhas, cursos e pendências vazios, sem consulta', async () => {
      await expect(service.listTracks(diocesanNoScope)).resolves.toEqual([]);
      await expect(service.listCourses(diocesanNoScope)).resolves.toEqual([]);
      await expect(service.getPendingOrExpired(diocesanNoScope)).resolves.toEqual([]);
      expect(prisma.formationTrack.findMany).not.toHaveBeenCalled();
      expect(prisma.formationCourse.findMany).not.toHaveBeenCalled();
      expect(prisma.formationEnrollment.findMany).not.toHaveBeenCalled();
    });

    it('diocesano vê só a própria diocese', async () => {
      prisma.formationCourse.findMany.mockResolvedValue([]);
      await service.listTracks(diocesan);
      await service.listCourses(diocesan);
      await service.getPendingOrExpired(diocesan);
      expect(prisma.formationTrack.findMany.mock.calls[0][0].where).toEqual({
        deletedAt: null,
        parish: { dioceseId: 'd1' },
      });
      expect(prisma.formationCourse.findMany.mock.calls[0][0].where).toEqual({
        deletedAt: null,
        parish: { dioceseId: 'd1' },
      });
      expect(prisma.formationEnrollment.findMany.mock.calls[0][0].where.course).toEqual({
        parish: { dioceseId: 'd1' },
      });
    });

    it('coordenador sem paróquia e sem comunidade → vazio', async () => {
      const lost = { id: 'u20', role: UserRole.PASTORAL_COORDINATOR } as any;
      await expect(service.getPendingOrExpired(lost)).resolves.toEqual([]);
      expect(prisma.formationEnrollment.findMany).not.toHaveBeenCalled();
    });

    it('coordenador sem parishId usa a paróquia da própria comunidade', async () => {
      prisma.community.findUnique.mockResolvedValue({ parishId: 'p9' });
      const coordNoParish = { id: 'u21', role: UserRole.PASTORAL_COORDINATOR, communityId: 'c9' } as any;
      await service.getPendingOrExpired(coordNoParish);
      expect(prisma.formationEnrollment.findMany.mock.calls[0][0].where.course).toEqual({ parishId: 'p9' });
    });

    it('SYSTEM_ADMIN sem filtro de paróquia', async () => {
      await service.listTracks({ id: 's', role: UserRole.SYSTEM_ADMIN } as any);
      expect(prisma.formationTrack.findMany.mock.calls[0][0].where).toEqual({ deletedAt: null });
    });
  });
  describe('ids do body (enroll/createCourse)', () => {
    it('enroll: membro de outra paróquia não é inscrito (404, nada gravado)', async () => {
      prisma.formationCourse.findFirst.mockResolvedValue({ id: 'cur1', parishId: 'p1' });
      prisma.member.findFirst.mockResolvedValue(null);
      await expect(service.enroll('cur1', 'm-alheio', coord)).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.member.findFirst.mock.calls[0][0].where).toEqual({
        id: 'm-alheio',
        deletedAt: null,
        OR: [
          { community: { parishId: 'p1' } },
          { communityLinks: { some: { isActive: true, community: { parishId: 'p1' } } } },
        ],
      });
      expect(prisma.formationEnrollment.upsert).not.toHaveBeenCalled();
    });

    it('enroll: membro da paróquia do curso é inscrito', async () => {
      prisma.formationCourse.findFirst.mockResolvedValue({ id: 'cur1', parishId: 'p1' });
      prisma.member.findFirst.mockResolvedValue({ id: 'm1' });
      await service.enroll('cur1', 'm1', coord);
      expect(prisma.formationEnrollment.upsert).toHaveBeenCalled();
    });

    it('createCourse: trilha de outra paróquia é recusada; da própria, aceita', async () => {
      prisma.formationTrack.findFirst.mockResolvedValue(null);
      await expect(service.createCourse({ name: 'MESC', trackId: 'tr-alheia' }, coord)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.formationTrack.findFirst.mock.calls[0][0].where).toEqual({
        id: 'tr-alheia',
        parishId: 'p1',
        deletedAt: null,
      });
      expect(prisma.formationCourse.create).not.toHaveBeenCalled();

      prisma.formationTrack.findFirst.mockResolvedValue({ id: 'tr1' });
      await service.createCourse({ name: 'MESC', trackId: 'tr1' }, coord);
      expect(prisma.formationCourse.create).toHaveBeenCalled();
    });
  });
});
