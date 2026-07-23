import { Test, TestingModule } from '@nestjs/testing';
import { NotificationType } from '@prisma/client';
import { EventRemindersService } from './event-reminders.service';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('EventRemindersService (2.2)', () => {
  let service: EventRemindersService;
  let prisma: { event: { findMany: jest.Mock } };
  let notifications: { notifyUsers: jest.Mock };

  beforeEach(async () => {
    prisma = { event: { findMany: jest.fn() } };
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

  it('busca eventos do dia seguinte (janela amanhã 00:00–23:59)', async () => {
    prisma.event.findMany.mockResolvedValue([]);
    const now = new Date('2026-07-14T10:00:00Z');

    await service.remindTomorrowEvents(now);

    const where = prisma.event.findMany.mock.calls[0][0].where;
    expect(where.status).toBe('PUBLISHED');
    expect(where.deletedAt).toBeNull();
    expect(where.startDate.gte.getDate()).toBe(15);
  });

  it('notifica os participantes com usuário vinculado', async () => {
    prisma.event.findMany.mockResolvedValue([
      {
        id: 'e1',
        title: 'Missa',
        startDate: new Date('2026-07-15T19:00:00Z'),
        location: 'Matriz',
        participants: [
          { member: { userId: 'u1' } },
          { member: { userId: null } },
          { member: { userId: 'u2' } },
        ],
      },
    ]);

    const sent = await service.remindTomorrowEvents(new Date('2026-07-14T08:00:00Z'));

    expect(notifications.notifyUsers).toHaveBeenCalledWith(
      ['u1', 'u2'],
      NotificationType.EVENT_REMINDER,
      'Lembrete de evento',
      expect.stringContaining('Missa'),
      { eventId: 'e1' },
    );
    expect(sent).toBe(2);
  });

  it('não notifica evento sem participantes com conta', async () => {
    prisma.event.findMany.mockResolvedValue([
      { id: 'e2', title: 'X', startDate: new Date(), location: null, participants: [{ member: { userId: null } }] },
    ]);

    const sent = await service.remindTomorrowEvents(new Date());
    expect(notifications.notifyUsers).not.toHaveBeenCalled();
    expect(sent).toBe(0);
  });
});
