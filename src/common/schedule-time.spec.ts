import {
  addDaysYmd,
  formatDateTimeBR,
  parseClientDateTime,
  parseYmd,
  scheduleCivilDay,
  scheduleLabel,
  scheduleStart,
  scheduleWindow,
  todayYmd,
  zonedDateTimeToInstant,
  zonedDayRange,
  zonedParts,
  zonedYmd,
} from './schedule-time';

/**
 * Helper único de fuso (A17/A19/M45). Os resultados NÃO podem depender do TZ
 * do processo: rode também com TZ=UTC e TZ=America/Sao_Paulo.
 */
describe('schedule-time (fuso da paróquia)', () => {
  it('relógio de parede de SP → instante (-03:00)', () => {
    expect(zonedDateTimeToInstant('2026-09-05', 18, 0).toISOString()).toBe('2026-09-05T21:00:00.000Z');
    expect(zonedDateTimeToInstant('2026-12-20', 0, 0).toISOString()).toBe('2026-12-20T03:00:00.000Z');
  });

  it('respeita outro fuso brasileiro quando informado (Manaus -04:00, Acre -05:00)', () => {
    expect(zonedDateTimeToInstant('2026-09-05', 18, 0, 'America/Manaus').toISOString()).toBe('2026-09-05T22:00:00.000Z');
    expect(zonedDateTimeToInstant('2026-09-05', 18, 0, 'America/Rio_Branco').toISOString()).toBe('2026-09-05T23:00:00.000Z');
  });

  it('cobre o antigo horário de verão (2018, -02:00)', () => {
    expect(zonedDateTimeToInstant('2018-12-20', 19, 0).toISOString()).toBe('2018-12-20T21:00:00.000Z');
  });

  it('dia civil e partes no fuso de SP, não no do processo', () => {
    // 01:30Z do dia 6 ainda é dia 5 às 22:30 em Brasília
    const instant = new Date('2026-09-06T01:30:00Z');
    expect(zonedYmd(instant)).toBe('2026-09-05');
    expect(zonedParts(instant)).toMatchObject({ day: 5, hour: 22, minute: 30, weekday: 6 });
    expect(todayYmd(instant)).toBe('2026-09-05');
    expect(formatDateTimeBR(instant)).toBe('05/09/2026 às 22:30');
  });

  it('parseYmd rejeita datas inexistentes e formatos errados', () => {
    expect(parseYmd('2026-10-04')).toEqual({ year: 2026, month: 10, day: 4 });
    expect(parseYmd('2026-02-30')).toBeNull();
    expect(parseYmd('04/10/2026')).toBeNull();
    expect(parseYmd(undefined)).toBeNull();
    expect(addDaysYmd('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('dia civil vira o intervalo [00:00, 23:59:59.999] de SP', () => {
    const { start, end } = zonedDayRange('2026-07-15');
    expect(start.toISOString()).toBe('2026-07-15T03:00:00.000Z');
    expect(end.toISOString()).toBe('2026-07-16T02:59:59.999Z');
  });

  describe('parseClientDateTime (A19)', () => {
    it('sem fuso é relógio de parede da paróquia', () => {
      expect(parseClientDateTime('2026-12-20T19:00')?.toISOString()).toBe('2026-12-20T22:00:00.000Z');
      expect(parseClientDateTime('2026-12-20T19:00:30')?.toISOString()).toBe('2026-12-20T22:00:30.000Z');
      expect(parseClientDateTime('2026-12-20')?.toISOString()).toBe('2026-12-20T03:00:00.000Z');
    });

    it('com Z ou offset vale como veio', () => {
      expect(parseClientDateTime('2026-12-20T22:00:00.000Z')?.toISOString()).toBe('2026-12-20T22:00:00.000Z');
      expect(parseClientDateTime('2026-12-20T19:00:00-03:00')?.toISOString()).toBe('2026-12-20T22:00:00.000Z');
    });

    it('inválida devolve null', () => {
      expect(parseClientDateTime('2026-02-30T10:00')).toBeNull();
      expect(parseClientDateTime('amanhã')).toBeNull();
      expect(parseClientDateTime('2026-12-20T25:00')).toBeNull();
      expect(parseClientDateTime('')).toBeNull();
    });
  });

  describe('escalas (A17)', () => {
    // Missa de sábado 05/09 às 18:00, gerada pela agenda fixa (date 00:00Z)
    const fixedMass = { date: new Date('2026-09-05T00:00:00.000Z'), startTime: '18:00', endTime: '19:00' };

    it('agenda fixa: início = dia civil + startTime em SP (não o dia anterior)', () => {
      expect(scheduleStart(fixedMass).toISOString()).toBe('2026-09-05T21:00:00.000Z');
      expect(scheduleWindow(fixedMass).end.toISOString()).toBe('2026-09-05T22:00:00.000Z');
      expect(scheduleCivilDay(fixedMass)).toBe('2026-09-05');
      expect(scheduleLabel(fixedMass)).toBe('05/09/2026 às 18:00');
    });

    it('agenda fixa gravada à meia-noite local do navegador (03:00Z) cai no mesmo dia', () => {
      const local = { date: new Date('2026-09-05T03:00:00.000Z'), startTime: '18:00' };
      expect(scheduleStart(local).toISOString()).toBe('2026-09-05T21:00:00.000Z');
      expect(scheduleCivilDay(local)).toBe('2026-09-05');
    });

    it('sem endTime usa 2h; endTime antes do início também', () => {
      const w = scheduleWindow({ date: fixedMass.date, startTime: '18:00', endTime: '07:00' });
      expect(w.end.getTime() - w.start.getTime()).toBe(2 * 60 * 60 * 1000);
    });

    it('escala de evento usa os horários do evento e o dia civil de SP', () => {
      const eventSchedule = {
        date: new Date('2026-09-05T23:30:00.000Z'),
        event: { startDate: new Date('2026-09-05T23:30:00.000Z'), endDate: new Date('2026-09-06T01:30:00.000Z') },
      };
      expect(scheduleStart(eventSchedule).toISOString()).toBe('2026-09-05T23:30:00.000Z');
      expect(scheduleWindow(eventSchedule).end.toISOString()).toBe('2026-09-06T01:30:00.000Z');
      // 20:30 de Brasília, mesmo dia da Missa fixa acima
      expect(scheduleCivilDay(eventSchedule)).toBe(scheduleCivilDay(fixedMass));
    });

    it('avulsa antiga sem startTime e fora da meia-noite UTC: a data já é o instante', () => {
      const legacy = { date: new Date('2026-07-11T08:00:00Z') };
      expect(scheduleStart(legacy).toISOString()).toBe('2026-07-11T08:00:00.000Z');
    });
  });
});
