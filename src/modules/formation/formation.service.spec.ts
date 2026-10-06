import { Test, TestingModule } from '@nestjs/testing';
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
      formationTrack: { findMany: jest.fn().mockResolvedValue([]) },
      formationCourse: { findFirst: jest.fn(), findMany: jest.fn() },
      formationEnrollment: { findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
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
    it('apto quando nenhum curso é exigido para a função', async () => {
      prisma.formationCourse.findMany.mockResolvedValue([]);
      await expect(service.checkPrerequisite('m1', 'Leitor')).resolves.toEqual({
        eligible: true,
        missing: [],
      });
    });

    it('inapto quando falta curso exigido (não concluído)', async () => {
      prisma.formationCourse.findMany.mockResolvedValue([{ id: 'cur1', name: 'Curso MESC', validityMonths: 12 }]);
      prisma.formationEnrollment.findUnique.mockResolvedValue(null);

      const res = await service.checkPrerequisite('m1', 'Ministro');
      expect(res.eligible).toBe(false);
      expect(res.missing).toContain('Curso MESC');
    });

    it('inapto quando a formação exigida está vencida', async () => {
      prisma.formationCourse.findMany.mockResolvedValue([{ id: 'cur1', name: 'Curso MESC', validityMonths: 12 }]);
      prisma.formationEnrollment.findUnique.mockResolvedValue({
        status: 'COMPLETED',
        expiresAt: new Date(Date.now() - 1000),
      });

      const res = await service.checkPrerequisite('m1', 'Ministro');
      expect(res.eligible).toBe(false);
    });

    it('apto quando a formação exigida está concluída e válida', async () => {
      prisma.formationCourse.findMany.mockResolvedValue([{ id: 'cur1', name: 'Curso MESC', validityMonths: 12 }]);
      prisma.formationEnrollment.findUnique.mockResolvedValue({
        status: 'COMPLETED',
        expiresAt: new Date(Date.now() + 1000000),
      });

      const res = await service.checkPrerequisite('m1', 'Ministro');
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
});
