import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ScheduleStatus, UserRole } from '@prisma/client';
import { SchedulesService } from './schedules.service';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService } from '../../common/hierarchy.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PdfService } from '../pdf/pdf.service';
import { AuditService } from '../../common/audit.service';
import { ScheduleConflictsService } from '../../common/schedule-conflicts.service';

describe('SchedulesService', () => {
  let service: SchedulesService;
  let prisma: {
    member: { findFirst: jest.Mock; findUnique: jest.Mock };
    scheduleAssignment: { findUnique: jest.Mock; update: jest.Mock; findMany: jest.Mock };
    schedule: { findUnique: jest.Mock; update: jest.Mock };
    pastoralCoordinator: { findMany: jest.Mock };
    user: { findMany: jest.Mock };
  };
  let hierarchyService: { hasAccessToSchedule: jest.Mock };
  let notificationsService: {
    notifyUser: jest.Mock;
    notifyUsers: jest.Mock;
    notifyMemberWithoutAccountBySms: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      member: { findFirst: jest.fn(), findUnique: jest.fn() },
      scheduleAssignment: { findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
      schedule: { findUnique: jest.fn(), update: jest.fn() },
      pastoralCoordinator: { findMany: jest.fn() },
      user: { findMany: jest.fn() },
    };
    hierarchyService = { hasAccessToSchedule: jest.fn().mockResolvedValue(true) };
    notificationsService = {
      notifyUser: jest.fn(),
      notifyUsers: jest.fn(),
      notifyMemberWithoutAccountBySms: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulesService,
        { provide: PrismaService, useValue: prisma },
        { provide: HierarchyService, useValue: hierarchyService },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: PdfService, useValue: { renderTableDocument: jest.fn().mockResolvedValue(Buffer.from('pdf')) } },
        { provide: AuditService, useValue: { log: jest.fn() } },
        {
          provide: ScheduleConflictsService,
          useValue: { findConflicts: jest.fn().mockResolvedValue([]), summarize: jest.fn().mockReturnValue('') },
        },
      ],
    }).compile();

    service = module.get<SchedulesService>(SchedulesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('declineAssignment', () => {
    const ownerUser = { id: 'user-member-1', role: UserRole.VOLUNTEER } as any;

    const baseAssignment = {
      id: 'assignment-1',
      memberId: 'member-1',
      scheduleId: 'schedule-1',
      role: 'Leitor',
      communityPastoralId: 'cp-1',
      member: { id: 'member-1', userId: 'user-member-1', fullName: 'Joao Silva' },
    };

    const updatedAssignment = {
      ...baseAssignment,
      status: 'DECLINED',
      schedule: {
        id: 'schedule-1',
        title: 'Missa das 19h',
        date: new Date('2026-06-20T19:00:00Z'),
        event: { communityId: 'community-1' },
      },
    };

    beforeEach(() => {
      prisma.scheduleAssignment.findUnique.mockResolvedValue(baseAssignment);
      prisma.scheduleAssignment.update.mockResolvedValue(updatedAssignment);
    });

    it('notifica o coordenador atual da pastoral quando existe um', async () => {
      prisma.pastoralCoordinator.findMany.mockResolvedValue([
        { member: { userId: 'coordinator-user-1' } },
      ]);

      await service.declineAssignment('assignment-1', ownerUser);

      expect(prisma.pastoralCoordinator.findMany).toHaveBeenCalledWith({
        where: { communityPastoralId: 'cp-1', isCurrent: true },
        include: { member: { select: { userId: true } } },
      });
      expect(notificationsService.notifyUsers).toHaveBeenCalledWith(
        ['coordinator-user-1'],
        'ASSIGNMENT_DECLINED',
        expect.any(String),
        expect.stringContaining('Joao Silva'),
        { scheduleId: 'schedule-1', assignmentId: 'assignment-1' },
      );
      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });

    it('cai para os COMMUNITY_COORDINATOR da comunidade quando a pastoral nao tem coordenador atual', async () => {
      prisma.pastoralCoordinator.findMany.mockResolvedValue([]);
      prisma.user.findMany.mockResolvedValue([{ id: 'community-coordinator-1' }]);

      await service.declineAssignment('assignment-1', ownerUser);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { communityId: 'community-1', role: 'COMMUNITY_COORDINATOR', isActive: true },
        select: { id: true },
      });
      expect(notificationsService.notifyUsers).toHaveBeenCalledWith(
        ['community-coordinator-1'],
        'ASSIGNMENT_DECLINED',
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
    });

    it('nao chama notifyUsers quando nao ha nenhum responsavel para avisar', async () => {
      prisma.pastoralCoordinator.findMany.mockResolvedValue([]);
      prisma.user.findMany.mockResolvedValue([]);

      await service.declineAssignment('assignment-1', ownerUser);

      expect(notificationsService.notifyUsers).not.toHaveBeenCalled();
    });

    it('registra a resposta do proprio membro sem respondedByUserId', async () => {
      prisma.pastoralCoordinator.findMany.mockResolvedValue([]);
      prisma.user.findMany.mockResolvedValue([]);

      await service.declineAssignment('assignment-1', ownerUser);

      expect(prisma.scheduleAssignment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'DECLINED',
            respondedAt: expect.any(Date),
            respondedByUserId: null,
          }),
        }),
      );
    });
  });

  describe('confirmAssignment (confirmacao assistida)', () => {
    const baseAssignment = {
      id: 'assignment-1',
      memberId: 'member-1',
      scheduleId: 'schedule-1',
      role: 'Leitor',
      communityPastoralId: 'cp-1',
      member: { id: 'member-1', userId: 'user-member-1', fullName: 'Joao Silva' },
    };

    beforeEach(() => {
      prisma.scheduleAssignment.findUnique.mockResolvedValue(baseAssignment);
      prisma.scheduleAssignment.update.mockResolvedValue({ ...baseAssignment, status: 'CONFIRMED' });
    });

    it('proprio membro confirma sem respondedByUserId', async () => {
      await service.confirmAssignment('assignment-1', {
        id: 'user-member-1',
        role: UserRole.VOLUNTEER,
      } as any);

      expect(hierarchyService.hasAccessToSchedule).not.toHaveBeenCalled();
      expect(prisma.scheduleAssignment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'CONFIRMED',
            respondedByUserId: null,
          }),
        }),
      );
    });

    it('coordenador com acesso confirma em nome do membro e a auditoria registra quem respondeu', async () => {
      hierarchyService.hasAccessToSchedule.mockResolvedValue(true);

      await service.confirmAssignment('assignment-1', {
        id: 'coordinator-user-1',
        role: UserRole.PASTORAL_COORDINATOR,
      } as any);

      expect(hierarchyService.hasAccessToSchedule).toHaveBeenCalledWith('coordinator-user-1', 'schedule-1');
      expect(prisma.scheduleAssignment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'CONFIRMED',
            respondedAt: expect.any(Date),
            respondedByUserId: 'coordinator-user-1',
          }),
        }),
      );
    });

    it('usuario comum nao pode confirmar a escala de outro membro', async () => {
      await expect(
        service.confirmAssignment('assignment-1', {
          id: 'outro-user',
          role: UserRole.FAITHFUL,
        } as any),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.scheduleAssignment.update).not.toHaveBeenCalled();
    });

    it('coordenador sem acesso a escala e bloqueado', async () => {
      hierarchyService.hasAccessToSchedule.mockResolvedValue(false);

      await expect(
        service.confirmAssignment('assignment-1', {
          id: 'coordinator-user-2',
          role: UserRole.COMMUNITY_COORDINATOR,
        } as any),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.scheduleAssignment.update).not.toHaveBeenCalled();
    });
  });

  describe('updateScheduleStatus', () => {
    beforeEach(() => {
      prisma.schedule.findUnique.mockResolvedValue({
        id: 'schedule-1',
        title: 'Missa das 19h',
        date: new Date('2026-06-20T19:00:00Z'),
      });
      prisma.schedule.update.mockResolvedValue({ id: 'schedule-1', status: ScheduleStatus.CANCELLED });
    });

    it('notifica todos os membros escalados (com userId, sem duplicar) quando a escala e cancelada', async () => {
      prisma.scheduleAssignment.findMany.mockResolvedValue([
        { member: { userId: 'user-1' } },
        { member: { userId: 'user-2' } },
        { member: { userId: 'user-1' } },
        { member: { userId: null } },
      ]);

      await service.updateScheduleStatus('schedule-1', ScheduleStatus.CANCELLED);

      expect(notificationsService.notifyUsers).toHaveBeenCalledWith(
        ['user-1', 'user-2'],
        'SCHEDULE_CANCELLED',
        expect.any(String),
        expect.stringContaining('Missa das 19h'),
        { scheduleId: 'schedule-1' },
      );
    });

    it('nao notifica quando o novo status nao e CANCELLED', async () => {
      prisma.schedule.update.mockResolvedValue({ id: 'schedule-1', status: ScheduleStatus.CLOSED });

      await service.updateScheduleStatus('schedule-1', ScheduleStatus.CLOSED);

      expect(prisma.scheduleAssignment.findMany).not.toHaveBeenCalled();
      expect(notificationsService.notifyUsers).not.toHaveBeenCalled();
    });
  });

  describe('notifyMember (helper usado em createAssignment/replaceAssignment)', () => {
    it('membro sem usuário: não chama notifyUser e tenta SMS direto (roadmap 2.3)', async () => {
      prisma.member.findUnique.mockResolvedValue({ userId: null });

      await (service as any).notifyMember('member-1', 'ASSIGNMENT_CREATED', 'Titulo', 'Corpo');

      expect(notificationsService.notifyUser).not.toHaveBeenCalled();
      expect(notificationsService.notifyMemberWithoutAccountBySms).toHaveBeenCalledWith(
        'member-1',
        'Titulo',
        'Corpo',
      );
    });

    it('chama notificationsService.notifyUser quando o membro tem usuario vinculado', async () => {
      prisma.member.findUnique.mockResolvedValue({ userId: 'user-9' });

      await (service as any).notifyMember('member-1', 'ASSIGNMENT_CREATED', 'Titulo', 'Corpo', {
        scheduleId: 'schedule-1',
      });

      expect(notificationsService.notifyUser).toHaveBeenCalledWith(
        'user-9',
        'ASSIGNMENT_CREATED',
        'Titulo',
        'Corpo',
        { scheduleId: 'schedule-1' },
      );
    });
  });
});
