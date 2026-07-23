import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleRemindersService } from './schedule-reminders.service';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('ScheduleRemindersService', () => {
  let service: ScheduleRemindersService;
  let prisma: {
    scheduleAssignment: { findMany: jest.Mock; update: jest.Mock };
  };
  let notificationsService: { notifyUser: jest.Mock };

  const now = new Date('2026-07-10T12:00:00Z');

  const buildAssignment = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 'assignment-1',
    role: 'Leitor',
    status: 'CONFIRMED',
    reminder24hSentAt: null,
    reminder2hSentAt: null,
    pendingNudgeSentAt: null,
    schedule: {
      id: 'schedule-1',
      title: 'Missa das 19h',
      date: new Date('2026-07-11T08:00:00Z'), // 20h no futuro
    },
    member: { id: 'member-1', fullName: 'Joao Silva', userId: 'user-1' },
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      scheduleAssignment: { findMany: jest.fn(), update: jest.fn() },
    };
    notificationsService = { notifyUser: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleRemindersService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get<ScheduleRemindersService>(ScheduleRemindersService);
  });

  describe('sendUpcomingReminders', () => {
    it('envia lembrete D-1 e marca reminder24hSentAt para escala ~20h no futuro', async () => {
      prisma.scheduleAssignment.findMany.mockResolvedValue([buildAssignment()]);

      const sent = await service.sendUpcomingReminders(now);

      expect(sent).toBe(1);
      expect(notificationsService.notifyUser).toHaveBeenCalledWith(
        'user-1',
        'SCHEDULE_REMINDER',
        'Lembrete de escala',
        expect.stringContaining('Missa das 19h'),
        { scheduleId: 'schedule-1', assignmentId: 'assignment-1' },
      );
      expect(prisma.scheduleAssignment.update).toHaveBeenCalledWith({
        where: { id: 'assignment-1' },
        data: { reminder24hSentAt: now },
      });
    });

    it('envia lembrete final e marca os dois campos para escala ~2h no futuro', async () => {
      prisma.scheduleAssignment.findMany.mockResolvedValue([
        buildAssignment({
          schedule: {
            id: 'schedule-1',
            title: 'Missa das 19h',
            date: new Date('2026-07-10T14:00:00Z'), // 2h no futuro
          },
        }),
      ]);

      await service.sendUpcomingReminders(now);

      expect(notificationsService.notifyUser).toHaveBeenCalledWith(
        'user-1',
        'SCHEDULE_REMINDER',
        'Lembrete de escala',
        expect.stringContaining('começa em breve'),
        expect.any(Object),
      );
      expect(prisma.scheduleAssignment.update).toHaveBeenCalledWith({
        where: { id: 'assignment-1' },
        data: { reminder2hSentAt: now, reminder24hSentAt: now },
      });
    });

    it('nao envia D-1 duplicado quando reminder24hSentAt ja esta marcado', async () => {
      prisma.scheduleAssignment.findMany.mockResolvedValue([
        buildAssignment({ reminder24hSentAt: new Date('2026-07-10T08:00:00Z') }),
      ]);

      const sent = await service.sendUpcomingReminders(now);

      expect(sent).toBe(0);
      expect(notificationsService.notifyUser).not.toHaveBeenCalled();
      expect(prisma.scheduleAssignment.update).not.toHaveBeenCalled();
    });

    it('marca o lembrete mesmo quando o membro nao tem usuario (nao notifica, mas nao varre de novo)', async () => {
      prisma.scheduleAssignment.findMany.mockResolvedValue([
        buildAssignment({ member: { id: 'member-1', fullName: 'Maria', userId: null } }),
      ]);

      const sent = await service.sendUpcomingReminders(now);

      expect(sent).toBe(0);
      expect(notificationsService.notifyUser).not.toHaveBeenCalled();
      expect(prisma.scheduleAssignment.update).toHaveBeenCalled();
    });

    it('busca apenas atribuicoes de escalas OPEN nao recusadas na janela de 25h', async () => {
      prisma.scheduleAssignment.findMany.mockResolvedValue([]);

      await service.sendUpcomingReminders(now);

      expect(prisma.scheduleAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { not: 'DECLINED' },
            schedule: expect.objectContaining({ status: 'OPEN' }),
          }),
        }),
      );
    });
  });

  describe('sendPendingNudges', () => {
    it('cobra confirmacao de atribuicao PENDING e marca pendingNudgeSentAt', async () => {
      prisma.scheduleAssignment.findMany.mockResolvedValue([
        buildAssignment({ status: 'PENDING' }),
      ]);

      const sent = await service.sendPendingNudges(now);

      expect(sent).toBe(1);
      expect(notificationsService.notifyUser).toHaveBeenCalledWith(
        'user-1',
        'SCHEDULE_REMINDER',
        'Confirme sua participação',
        expect.stringContaining('Missa das 19h'),
        { scheduleId: 'schedule-1', assignmentId: 'assignment-1' },
      );
      expect(prisma.scheduleAssignment.update).toHaveBeenCalledWith({
        where: { id: 'assignment-1' },
        data: { pendingNudgeSentAt: now },
      });
    });

    it('busca apenas PENDING sem cobranca anterior em escala OPEN', async () => {
      prisma.scheduleAssignment.findMany.mockResolvedValue([]);

      await service.sendPendingNudges(now);

      expect(prisma.scheduleAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PENDING',
            pendingNudgeSentAt: null,
          }),
        }),
      );
    });
  });
});
