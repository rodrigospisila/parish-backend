import { BadRequestException } from '@nestjs/common';
import { SchedulesService } from './schedules.service';

/**
 * A17: janela, dia da semana e rótulos das escalas no fuso da paróquia —
 * em qualquer TZ do processo (rode com TZ=UTC e TZ=America/Sao_Paulo).
 */
describe('SchedulesService — datas da agenda fixa (A17)', () => {
  let service: any;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      schedule: { create: jest.fn().mockResolvedValue({ id: 's1', pastorals: [] }) },
    };
    const hierarchy = { isCommunityInScope: jest.fn().mockResolvedValue(true) };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    service = new SchedulesService(prisma, hierarchy as any, {} as any, {} as any, audit as any, {} as any);
  });

  // Missa fixa de sábado 05/09/2026 às 18:00 (date só-dia 00:00Z)
  const fixedMass = { date: new Date('2026-09-05T00:00:00.000Z'), startTime: '18:00', endTime: '19:00' };

  it('janela da escala sem evento: 18:00–19:00 de Brasília do próprio dia', () => {
    const window = service.getScheduleWindow(fixedMass);
    expect(window.start.toISOString()).toBe('2026-09-05T21:00:00.000Z');
    expect(window.end.toISOString()).toBe('2026-09-05T22:00:00.000Z');
  });

  it('disponibilidade olha o SÁBADO (não a sexta) e os minutos locais', () => {
    const result = service.evaluateAvailability({
      scheduleWindow: service.getScheduleWindow(fixedMass),
      rules: [{ dayOfWeek: 6, startMinutes: 17 * 60, endMinutes: 20 * 60, isActive: true }],
      exceptions: [],
    });
    expect(result.status).toBe('AVAILABLE');
    expect(result.summary[0]).toContain('sabado');
  });

  it('rótulo da notificação: dia da agenda fixa sem voltar um dia', () => {
    expect(service.formatDateLabel(fixedMass)).toBe('05/09/2026');
    // Instante real (escala de evento) usa o dia de Brasília
    const at = new Date('2026-09-06T01:30:00Z');
    expect(service.formatDateLabel({ date: at, event: { startDate: at, endDate: null } })).toBe('05/09/2026');
  });

  it('R3#46: Missa do Natal 24/12 às 21:00 (00:00Z) é rotulada 24/12, não 25/12', () => {
    const natal = new Date('2026-12-25T00:00:00.000Z');
    const schedule = { date: natal, startTime: null, event: { startDate: natal, endDate: new Date('2026-12-25T01:30:00Z') } };
    expect(service.formatDateLabel(schedule)).toBe('24/12/2026');
    // Sem o evento, a mesma data seria só-dia (25/12): por isso a escala inteira
    expect(service.formatDateLabel({ date: natal })).toBe('25/12/2026');
  });

  describe('R3#46: avisos e trava de "passada" decidem pela escala inteira (com evento)', () => {
    const natal = new Date('2026-12-25T00:00:00.000Z'); // 24/12 21:00 em Brasília
    const eventSchedule = {
      id: 'sch-natal',
      title: 'Missa do Natal',
      status: 'OPEN',
      date: natal,
      startTime: null,
      endTime: null,
      eventId: 'ev-natal',
      event: { startDate: natal, endDate: new Date('2026-12-25T01:30:00Z') },
      pastorals: [],
    };
    const admin = { id: 'u1', role: 'PARISH_ADMIN' };

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2026-12-25T01:00:00Z')); // 24/12 22:00 — a Missa já começou
      service.requireCoordinatedPastoralIds = jest.fn().mockResolvedValue([]);
    });
    afterEach(() => jest.useRealTimers());

    it('createAssignment busca o evento e recusa a Missa que já começou', async () => {
      prisma.schedule.findFirst = jest.fn().mockResolvedValue(eventSchedule);
      await expect(
        service.createAssignment({ scheduleId: 'sch-natal', memberId: 'm1', role: 'Leitor' }, admin),
      ).rejects.toThrow('data/hora passada');
      expect(prisma.schedule.findFirst.mock.calls[0][0].include.event).toEqual({ select: { startDate: true, endDate: true } });
    });

    it('replaceAssignment busca o evento e recusa a Missa que já começou', async () => {
      service.findOneAssignment = jest.fn().mockResolvedValue({ id: 'a1', memberId: 'm1', scheduleId: 'sch-natal', checkedIn: false });
      prisma.schedule.findUnique = jest.fn().mockResolvedValue(eventSchedule);
      await expect(service.replaceAssignment('a1', 'm2', admin)).rejects.toThrow('data/hora passada');
      expect(prisma.schedule.findUnique.mock.calls[0][0].include.event).toEqual({ select: { startDate: true, endDate: true } });
    });

    it('push da nova escala: "em 24/12/2026"', async () => {
      service.notifyMember = jest.fn().mockResolvedValue(undefined);
      await service.notifyAssignmentCreated({
        id: 'a1',
        memberId: 'm1',
        scheduleId: 'sch-natal',
        schedule: { ...eventSchedule, event: { ...eventSchedule.event, community: { id: 'c1', name: 'Matriz' } } },
      });
      expect(service.notifyMember.mock.calls[0][3]).toBe('Voce foi escalado(a) para "Missa do Natal" · Matriz em 24/12/2026.');
    });

    it('push de escala cancelada: "em 24/12/2026"', async () => {
      prisma.scheduleAssignment = { findMany: jest.fn().mockResolvedValue([{ member: { userId: 'u9' } }]) };
      const notifications = { notifyUsers: jest.fn().mockResolvedValue(undefined) };
      service.notificationsService = notifications;
      await service.notifyScheduleCancelled('sch-natal', 'Missa do Natal', eventSchedule);
      expect(notifications.notifyUsers.mock.calls[0][3]).toBe('A escala "Missa do Natal" em 24/12/2026 foi cancelada.');
    });
  });

  describe('R3#48: visão consolidada/PDF — corte por semântica da data', () => {
    const admin = { id: 'u1', role: 'PARISH_ADMIN' };
    beforeEach(() => {
      prisma.schedule.findMany = jest.fn().mockResolvedValue([]);
      service.hierarchyService = { applyScheduleFilter: jest.fn().mockReturnValue({}) };
    });

    const dateCut = () => {
      const where = prisma.schedule.findMany.mock.calls[0][0].where;
      return where.AND.find((c: any) => Array.isArray(c.OR) && c.OR.some((o: any) => 'date' in o)).OR;
    };

    it('o que o painel manda (de 10/10T00:00Z até 12/10T23:59:59.999Z)', async () => {
      await service.getCoordinatorOverview(admin, '2026-10-10T00:00:00.000Z', '2026-10-12T23:59:59.999Z');
      expect(dateCut()).toEqual([
        // só-dia: 10/10 a 12/10 (00:00Z) — a escala só-dia de 13/10 (13/10 00:00Z) fica de fora
        { eventId: null, date: { gte: new Date('2026-10-10T00:00:00.000Z'), lte: new Date('2026-10-12T00:00:00.000Z') } },
        // com evento: 10/10 00:00 a 12/10 23:59:59.999 de Brasília — a Missa de 09/10 21:00 (10/10 00:00Z) fica de fora
        {
          eventId: { not: null },
          date: { gte: new Date('2026-10-10T03:00:00.000Z'), lte: new Date('2026-10-13T02:59:59.999Z') },
        },
      ]);
      expect(prisma.schedule.findMany.mock.calls[0][0].where.date).toBeUndefined();
    });

    it('só-dia na query e instante qualquer (vale o dia de Brasília)', async () => {
      await service.getCoordinatorOverview(admin, '2026-10-10', '2026-10-13T01:00:00.000Z');
      const [dayOnly, withEvent] = dateCut();
      expect(dayOnly.date.lte).toEqual(new Date('2026-10-12T00:00:00.000Z'));
      expect(withEvent.date.gte).toEqual(new Date('2026-10-10T03:00:00.000Z'));
    });

    it('de > até e data inválida → 400', async () => {
      await expect(service.getCoordinatorOverview(admin, '2026-10-12', '2026-10-10')).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.getCoordinatorOverview(admin, 'abc')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rótulo do período do PDF não volta um dia', () => {
      expect(service.formatQueryDateLabel('2026-10-10T00:00:00.000Z')).toBe('10/10/2026');
      expect(service.formatQueryDateLabel('2026-10-12T23:59:59.999Z')).toBe('12/10/2026');
      expect(service.formatQueryDateLabel('2026-10-10')).toBe('10/10/2026');
    });
  });

  describe('escala avulsa (createStandaloneSchedule)', () => {
    const user = { id: 'u1', role: 'PARISH_ADMIN' } as any;

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-05T13:00:00Z')); // 05/09 10:00 em Brasília
      service.requireCoordinatedPastoralIds = jest.fn().mockResolvedValue([]);
      service.normalizeSchedulePayload = (value: unknown) => value;
    });
    afterEach(() => jest.useRealTimers());

    it('hoje mais tarde ainda pode (antes: 00:00Z < agora → "data passada")', async () => {
      await expect(
        service.createStandaloneSchedule(
          { title: 'Limpeza', communityId: 'c1', date: '2026-09-05', startTime: '18:00' },
          user,
        ),
      ).resolves.toBeDefined();
    });

    it('hoje sem horário vale o dia inteiro', async () => {
      await expect(
        service.createStandaloneSchedule({ title: 'Limpeza', communityId: 'c1', date: '2026-09-05' }, user),
      ).resolves.toBeDefined();
    });

    it('hoje com horário que já passou é recusada', async () => {
      await expect(
        service.createStandaloneSchedule(
          { title: 'Limpeza', communityId: 'c1', date: '2026-09-05', startTime: '08:00' },
          user,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('R3#45: o que o painel manda (22:00 de 05/09 = 06/09 01:00Z) grava 05/09 só-dia + 22:00', async () => {
      // new Date('2026-09-05T22:00').toISOString() num navegador em Brasília
      await service.createStandaloneSchedule({ title: 'Adoração', communityId: 'c1', date: '2026-09-06T01:00:00.000Z' }, user);
      const data = prisma.schedule.create.mock.calls[0][0].data;
      expect(data.date.toISOString()).toBe('2026-09-05T00:00:00.000Z');
      expect(data.startTime).toBe('22:00');
    });

    it('R3#45: com startTime informado, o dia sai do instante e a hora do startTime', async () => {
      await service.createStandaloneSchedule(
        { title: 'Adoração', communityId: 'c1', date: '2026-09-06T00:00:00.000Z', startTime: '21:30' },
        user,
      );
      const data = prisma.schedule.create.mock.calls[0][0].data;
      expect(data.date.toISOString()).toBe('2026-09-05T00:00:00.000Z');
      expect(data.startTime).toBe('21:30');
    });

    it('R3#45: hoje 09:00 (12:00Z) já passou às 10:00 — recusada pela hora do instante', async () => {
      await expect(
        service.createStandaloneSchedule({ title: 'Limpeza', communityId: 'c1', date: '2026-09-05T12:00:00.000Z' }, user),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('ontem é recusada', async () => {
      await expect(
        service.createStandaloneSchedule({ title: 'Limpeza', communityId: 'c1', date: '2026-09-04' }, user),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
