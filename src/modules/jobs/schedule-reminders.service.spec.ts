import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleRemindersService } from './schedule-reminders.service';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('ScheduleRemindersService', () => {
  let service: ScheduleRemindersService;
  let prisma: {
    scheduleAssignment: { findMany: jest.Mock; updateMany: jest.Mock };
    massScheduleCancellation: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let notificationsService: { notifyUser: jest.Mock };
  let tx: { $queryRaw: jest.Mock };

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

  // Missa fixa de sábado 05/09/2026 às 18:00 (agenda fixa: date só-dia 00:00Z)
  const fixedMassAssignment = (overrides: Partial<Record<string, unknown>> = {}) =>
    buildAssignment({
      schedule: {
        id: 'schedule-fixa',
        title: 'Missa 18:00',
        date: new Date('2026-09-05T00:00:00.000Z'),
        startTime: '18:00',
        endTime: '19:00',
        massScheduleId: 'mass-1',
        event: null,
      },
      ...overrides,
    });

  beforeEach(async () => {
    tx = { $queryRaw: jest.fn().mockResolvedValue([{ locked: true }]) };
    prisma = {
      scheduleAssignment: { findMany: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      massScheduleCancellation: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((fn: (client: unknown) => Promise<unknown>) => fn(tx)),
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
    it('envia lembrete D-1 e marca reminder24hSentAt (claim atômico) para escala ~20h no futuro', async () => {
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
      expect(prisma.scheduleAssignment.updateMany).toHaveBeenCalledWith({
        where: { id: 'assignment-1', reminder24hSentAt: null },
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
      expect(prisma.scheduleAssignment.updateMany).toHaveBeenCalledWith({
        where: { id: 'assignment-1', reminder2hSentAt: null },
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
      expect(prisma.scheduleAssignment.updateMany).not.toHaveBeenCalled();
    });

    it('M45: outra instância já reivindicou o lembrete (count 0) → não envia de novo', async () => {
      prisma.scheduleAssignment.findMany.mockResolvedValue([buildAssignment()]);
      prisma.scheduleAssignment.updateMany.mockResolvedValue({ count: 0 });

      const sent = await service.sendUpcomingReminders(now);

      expect(sent).toBe(0);
      expect(notificationsService.notifyUser).not.toHaveBeenCalled();
    });

    it('marca o lembrete mesmo quando o membro nao tem usuario (nao notifica, mas nao varre de novo)', async () => {
      prisma.scheduleAssignment.findMany.mockResolvedValue([
        buildAssignment({ member: { id: 'member-1', fullName: 'Maria', userId: null } }),
      ]);

      const sent = await service.sendUpcomingReminders(now);

      expect(sent).toBe(0);
      expect(notificationsService.notifyUser).not.toHaveBeenCalled();
      expect(prisma.scheduleAssignment.updateMany).toHaveBeenCalled();
    });

    it('busca apenas atribuicoes de escalas OPEN nao recusadas', async () => {
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

    describe('A17: agenda fixa no fuso da paróquia (qualquer TZ do processo)', () => {
      it('sexta 04/09 às 9h (SP): Missa de sábado às 18h ainda está a 33h — nada sai', async () => {
        // Antes: setHours sobre 04/09 21:00 (00:00Z em SP) → "amanhã" saía 2 dias antes
        prisma.scheduleAssignment.findMany.mockResolvedValue([fixedMassAssignment()]);
        const sent = await service.sendUpcomingReminders(new Date('2026-09-04T12:00:00Z'));
        expect(sent).toBe(0);
        expect(notificationsService.notifyUser).not.toHaveBeenCalled();
      });

      it('sexta 04/09 às 20h (SP): sai o "amanhã" com dia e hora certos', async () => {
        prisma.scheduleAssignment.findMany.mockResolvedValue([fixedMassAssignment()]);
        const sent = await service.sendUpcomingReminders(new Date('2026-09-04T23:00:00Z'));
        expect(sent).toBe(1);
        expect(notificationsService.notifyUser).toHaveBeenCalledWith(
          'user-1',
          'SCHEDULE_REMINDER',
          'Lembrete de escala',
          expect.stringContaining('amanhã: "Missa 18:00" em 05/09/2026 às 18:00'),
          expect.any(Object),
        );
      });

      it('sábado 05/09 às 16h (SP): sai o "começa em breve" no dia da Missa', async () => {
        prisma.scheduleAssignment.findMany.mockResolvedValue([fixedMassAssignment()]);
        const sent = await service.sendUpcomingReminders(new Date('2026-09-05T19:00:00Z'));
        expect(sent).toBe(1);
        expect(notificationsService.notifyUser).toHaveBeenCalledWith(
          'user-1',
          'SCHEDULE_REMINDER',
          'Lembrete de escala',
          expect.stringContaining('começa em breve (05/09/2026 às 18:00)'),
          expect.any(Object),
        );
      });

      it('a busca no banco abre 36h para trás (date só-dia 00:00Z do dia seguinte entra)', async () => {
        prisma.scheduleAssignment.findMany.mockResolvedValue([]);
        const at = new Date('2026-09-05T19:00:00Z');
        await service.sendUpcomingReminders(at);
        const where = prisma.scheduleAssignment.findMany.mock.calls[0][0].where;
        expect(where.schedule.date.gt.getTime()).toBe(at.getTime() - 36 * 60 * 60 * 1000);
      });
    });

    it('B18: escala da agenda fixa em data suspensa ("não haverá") não recebe lembrete', async () => {
      prisma.scheduleAssignment.findMany.mockResolvedValue([fixedMassAssignment()]);
      prisma.massScheduleCancellation.findMany.mockResolvedValue([
        { massScheduleId: 'mass-1', date: new Date('2026-09-05T00:00:00.000Z') },
      ]);

      const sent = await service.sendUpcomingReminders(new Date('2026-09-04T23:00:00Z'));

      expect(sent).toBe(0);
      expect(notificationsService.notifyUser).not.toHaveBeenCalled();
      // Não marca: se a data for reativada, o lembrete ainda sai
      expect(prisma.scheduleAssignment.updateMany).not.toHaveBeenCalled();
      expect(prisma.massScheduleCancellation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ massScheduleId: { in: ['mass-1'] } }),
        }),
      );
    });

    it('B18: suspensão de OUTRO dia não bloqueia', async () => {
      prisma.scheduleAssignment.findMany.mockResolvedValue([fixedMassAssignment()]);
      prisma.massScheduleCancellation.findMany.mockResolvedValue([
        { massScheduleId: 'mass-1', date: new Date('2026-09-12T00:00:00.000Z') },
      ]);

      const sent = await service.sendUpcomingReminders(new Date('2026-09-04T23:00:00Z'));
      expect(sent).toBe(1);
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
      expect(prisma.scheduleAssignment.updateMany).toHaveBeenCalledWith({
        where: { id: 'assignment-1', pendingNudgeSentAt: null },
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

    it('B18: não cobra resposta de escala em data suspensa', async () => {
      prisma.scheduleAssignment.findMany.mockResolvedValue([fixedMassAssignment({ status: 'PENDING' })]);
      prisma.massScheduleCancellation.findMany.mockResolvedValue([
        { massScheduleId: 'mass-1', date: new Date('2026-09-05T00:00:00.000Z') },
      ]);

      const sent = await service.sendPendingNudges(new Date('2026-09-04T12:00:00Z'));
      expect(sent).toBe(0);
      expect(notificationsService.notifyUser).not.toHaveBeenCalled();
    });
  });

  describe('handleCron (M45: trava distribuída)', () => {
    it('pega pg_try_advisory_xact_lock do job antes de rodar', async () => {
      prisma.scheduleAssignment.findMany.mockResolvedValue([]);

      await service.handleCron();

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      const sql = (tx.$queryRaw.mock.calls[0][0] as TemplateStringsArray).join('?');
      expect(sql).toContain('pg_try_advisory_xact_lock(hashtext(');
      expect(sql).toContain('::text');
      expect(tx.$queryRaw.mock.calls[0][1]).toBe('parish:job:schedule-reminders');
      expect(prisma.scheduleAssignment.findMany).toHaveBeenCalledTimes(2);
    });

    it('outra instância com a trava: não varre nem envia', async () => {
      tx.$queryRaw.mockResolvedValue([{ locked: false }]);

      await service.handleCron();

      expect(prisma.scheduleAssignment.findMany).not.toHaveBeenCalled();
      expect(notificationsService.notifyUser).not.toHaveBeenCalled();
    });
  });
});
