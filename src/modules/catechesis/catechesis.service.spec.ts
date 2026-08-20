import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
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
  let hierarchy: { isCommunityInScope: jest.Mock };

  const coord = { id: 'u1', role: UserRole.PASTORAL_COORDINATOR, communityId: 'c1' } as any;

  beforeEach(async () => {
    prisma = {
      catechesisClass: { findFirst: jest.fn() },
      member: { findFirst: jest.fn() },
      catechesisEnrollment: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      sacrament: { create: jest.fn() },
      $transaction: jest.fn(async (cb: any) =>
        cb({
          catechesisEnrollment: { update: jest.fn().mockResolvedValue({ id: 'en1', status: 'COMPLETED' }) },
          sacrament: { create: jest.fn().mockResolvedValue({ id: 'sac1' }) },
        }),
      ),
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
      prisma.member.findFirst.mockResolvedValue({ id: 'm1', sacraments: [] });

      await expect(
        service.enroll({ classId: 'cl1', memberId: 'm1' }, coord),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.catechesisEnrollment.create).not.toHaveBeenCalled();
    });

    it('permite matrícula quando há Batismo', async () => {
      prisma.catechesisClass.findFirst.mockResolvedValue({
        id: 'cl1',
        communityId: 'c1',
        stage: { sacramentType: SacramentType.CONFIRMATION, name: 'Crisma' },
      });
      prisma.member.findFirst.mockResolvedValue({
        id: 'm1',
        sacraments: [{ type: SacramentType.BAPTISM }],
      });
      prisma.catechesisEnrollment.create.mockResolvedValue({ id: 'en1' });

      await service.enroll({ classId: 'cl1', memberId: 'm1' }, coord);
      expect(prisma.catechesisEnrollment.create).toHaveBeenCalled();
    });

    it('não exige batismo para a própria etapa de Batismo', async () => {
      prisma.catechesisClass.findFirst.mockResolvedValue({
        id: 'cl1',
        communityId: 'c1',
        stage: { sacramentType: SacramentType.BAPTISM, name: 'Batismo' },
      });
      prisma.member.findFirst.mockResolvedValue({ id: 'm1', sacraments: [] });
      prisma.catechesisEnrollment.create.mockResolvedValue({ id: 'en1' });

      await service.enroll({ classId: 'cl1', memberId: 'm1' }, coord);
      expect(prisma.catechesisEnrollment.create).toHaveBeenCalled();
    });
  });

  describe('completeEnrollment — gera Sacrament', () => {
    it('conclui e cria o Sacrament da etapa', async () => {
      prisma.catechesisEnrollment.findUnique.mockResolvedValue({
        id: 'en1',
        memberId: 'm1',
        status: 'ACTIVE',
        class: {
          communityId: 'c1',
          community: { name: 'Matriz' },
          stage: { sacramentType: SacramentType.FIRST_COMMUNION, name: '1ª Eucaristia' },
        },
      });

      await service.completeEnrollment('en1', {}, coord);
      expect(prisma.$transaction).toHaveBeenCalled();
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
});
