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
});
