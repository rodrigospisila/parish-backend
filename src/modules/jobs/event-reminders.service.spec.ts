import { Test, TestingModule } from '@nestjs/testing';
import { NotificationType } from '@prisma/client';
import { EventRemindersService } from './event-reminders.service';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('EventRemindersService (2.2)', () => {
  let service: EventRemindersService;
  let prisma: { event: { findMany: jest.Mock; updateMany: jest.Mock }; $transaction: jest.Mock };
  let notifications: { notifyUsers: jest.Mock };
  let tx: { $queryRaw: jest.Mock };

  beforeEach(async () => {
    tx = { $queryRaw: jest.fn().mockResolvedValue([{ locked: true }]) };
    prisma = {
      event: { findMany: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      $transaction: jest.fn((fn: (client: unknown) => Promise<unknown>) => fn(tx)),
    };
    notifications = { notifyUsers: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventRemindersService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();
    service = module.get<EventRemindersService>(EventRemindersService);
  });

  it('M45: janela "amanhã" é 00:00–23:59:59.999 de Brasília, em qualquer TZ do processo', async () => {
    prisma.event.findMany.mockResolvedValue([]);
    // 14/07 às 22:30 em Brasília (já 15/07 em UTC): amanhã é 15/07
    await service.remindTomorrowEvents(new Date('2026-07-15T01:30:00Z'));

    const where = prisma.event.findMany.mock.calls[0][0].where;
    expect(where.status).toBe('PUBLISHED');
    expect(where.deletedAt).toBeNull();
    expect(where.startDate.gte.toISOString()).toBe('2026-07-15T03:00:00.000Z');
    expect(where.startDate.lte.toISOString()).toBe('2026-07-16T02:59:59.999Z');
  });

  it('notifica os participantes com usuário vinculado, com o horário de Brasília', async () => {
    prisma.event.findMany.mockResolvedValue([
      {
        id: 'e1',
        title: 'Missa',
        startDate: new Date('2026-07-15T22:00:00Z'), // 19:00 em Brasília
        location: 'Matriz',
        reminderSentForStart: null,
        participants: [
          { member: { userId: 'u1' } },
          { member: { userId: null } },
          { member: { userId: 'u2' } },
        ],
      },
    ]);

    const sent = await service.remindTomorrowEvents(new Date('2026-07-14T11:00:00Z'));

    expect(notifications.notifyUsers).toHaveBeenCalledWith(
      ['u1', 'u2'],
      NotificationType.EVENT_REMINDER,
      'Lembrete de evento',
      'Amanhã: "Missa" em 15/07, 19:00 — Matriz.',
      { eventId: 'e1' },
    );
    expect(prisma.event.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'e1',
        OR: [
          { reminderSentForStart: null },
          { reminderSentForStart: { not: new Date('2026-07-15T22:00:00Z') } },
        ],
      },
      data: { reminderSentForStart: new Date('2026-07-15T22:00:00Z') },
    });
    expect(sent).toBe(2);
  });

  it('M45: já lembrado para este início (outra réplica) → não envia de novo', async () => {
    const start = new Date('2026-07-15T22:00:00Z');
    prisma.event.findMany.mockResolvedValue([
      { id: 'e1', title: 'Missa', startDate: start, location: null, reminderSentForStart: start, participants: [{ member: { userId: 'u1' } }] },
    ]);

    const sent = await service.remindTomorrowEvents(new Date('2026-07-14T11:00:00Z'));
    expect(sent).toBe(0);
    expect(notifications.notifyUsers).not.toHaveBeenCalled();
  });

  it('M45: claim perdido na corrida (count 0) → não envia', async () => {
    prisma.event.updateMany.mockResolvedValue({ count: 0 });
    prisma.event.findMany.mockResolvedValue([
      { id: 'e1', title: 'Missa', startDate: new Date('2026-07-15T22:00:00Z'), location: null, reminderSentForStart: null, participants: [{ member: { userId: 'u1' } }] },
    ]);

    const sent = await service.remindTomorrowEvents(new Date('2026-07-14T11:00:00Z'));
    expect(sent).toBe(0);
    expect(notifications.notifyUsers).not.toHaveBeenCalled();
  });

  it('evento remarcado (startDate novo) volta a ser lembrado', async () => {
    prisma.event.findMany.mockResolvedValue([
      {
        id: 'e1',
        title: 'Missa',
        startDate: new Date('2026-07-15T22:00:00Z'),
        location: null,
        reminderSentForStart: new Date('2026-07-10T22:00:00Z'),
        participants: [{ member: { userId: 'u1' } }],
      },
    ]);

    const sent = await service.remindTomorrowEvents(new Date('2026-07-14T11:00:00Z'));
    expect(sent).toBe(1);
  });

  it('não notifica evento sem participantes com conta', async () => {
    prisma.event.findMany.mockResolvedValue([
      { id: 'e2', title: 'X', startDate: new Date(), location: null, reminderSentForStart: null, participants: [{ member: { userId: null } }] },
    ]);

    const sent = await service.remindTomorrowEvents(new Date());
    expect(notifications.notifyUsers).not.toHaveBeenCalled();
    expect(prisma.event.updateMany).not.toHaveBeenCalled();
    expect(sent).toBe(0);
  });

  it('M45: sem a trava do job, outra instância não roda', async () => {
    tx.$queryRaw.mockResolvedValue([{ locked: false }]);
    await service.handleCron();
    expect(prisma.event.findMany).not.toHaveBeenCalled();
    expect(tx.$queryRaw.mock.calls[0][1]).toBe('parish:job:event-reminders');
  });
});
