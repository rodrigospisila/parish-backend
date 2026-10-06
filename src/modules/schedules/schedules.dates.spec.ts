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
    expect(service.formatDateLabel(fixedMass.date)).toBe('05/09/2026');
    // Instante real (escala de evento) usa o dia de Brasília
    expect(service.formatDateLabel(new Date('2026-09-06T01:30:00Z'))).toBe('05/09/2026');
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

    it('ontem é recusada', async () => {
      await expect(
        service.createStandaloneSchedule({ title: 'Limpeza', communityId: 'c1', date: '2026-09-04' }, user),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
