import {
  addDaysYmd,
  formatDateTimeBR,
  isAllDayEvent,
  normalizeStandaloneScheduleDate,
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

  it('R3#51: hora que não existiu (início do verão, 04/11/2018 00:00 em SP) avança, como o "compatible" do Temporal', () => {
    // 00:00 → 01:00 com o offset novo (-02:00): mesmo dia, nunca 23:00 do dia 03
    const gap = zonedDateTimeToInstant('2018-11-04', 0, 0);
    expect(gap.toISOString()).toBe('2018-11-04T03:00:00.000Z');
    expect(zonedYmd(gap)).toBe('2018-11-04');
    expect(zonedParts(gap)).toMatchObject({ day: 4, hour: 1, minute: 0 });
    expect(zonedDateTimeToInstant('2018-11-04', 0, 30).toISOString()).toBe('2018-11-04T03:30:00.000Z');
    // Dia civil começa no dia certo (era 03/11 23:00)
    expect(zonedYmd(zonedDayRange('2018-11-04').start)).toBe('2018-11-04');
    // Logo antes e logo depois do buraco seguem exatos
    expect(zonedDateTimeToInstant('2018-11-03', 23, 59).toISOString()).toBe('2018-11-04T02:59:00.000Z');
    expect(zonedDateTimeToInstant('2018-11-04', 1, 0).toISOString()).toBe('2018-11-04T03:00:00.000Z');
  });

  it('R3#51: hora repetida (fim do verão, 16/02/2019 23:00 em SP) fica na primeira ocorrência (-02:00)', () => {
    expect(zonedDateTimeToInstant('2019-02-16', 23, 0).toISOString()).toBe('2019-02-17T01:00:00.000Z');
    expect(zonedDateTimeToInstant('2019-02-17', 0, 0).toISOString()).toBe('2019-02-17T03:00:00.000Z');
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

  describe('normalizeStandaloneScheduleDate (R3#45)', () => {
    it('o que o painel manda de verdade: 22:00 de 10/10 → dia 10/10 (00:00Z) e startTime 22:00', () => {
      // new Date('2026-10-10T22:00').toISOString() num navegador em Brasília
      const sent = '2026-10-11T01:00:00.000Z';
      const r = normalizeStandaloneScheduleDate(sent);
      expect(r?.date.toISOString()).toBe('2026-10-10T00:00:00.000Z');
      expect(r?.startTime).toBe('22:00');
      // A janela e o dia civil da escala ficam em 10/10 22:00 de Brasília
      expect(scheduleCivilDay({ date: r!.date, startTime: r!.startTime })).toBe('2026-10-10');
      expect(scheduleStart({ date: r!.date, startTime: r!.startTime }).toISOString()).toBe(sent);
    });

    it('21:00 local (00:00Z exato) também fica no próprio dia', () => {
      const r = normalizeStandaloneScheduleDate('2026-10-11T00:00:00.000Z');
      expect(r).toEqual({ date: new Date('2026-10-10T00:00:00.000Z'), startTime: '21:00' });
    });

    it('startTime informado vale; o dia sai do instante', () => {
      const r = normalizeStandaloneScheduleDate('2026-10-11T01:00:00.000Z', '19:30');
      expect(r).toEqual({ date: new Date('2026-10-10T00:00:00.000Z'), startTime: '19:30' });
    });

    it('só-dia fica como veio, sem horário (dia inteiro); inválida = null', () => {
      expect(normalizeStandaloneScheduleDate('2026-10-10')).toEqual({ date: new Date('2026-10-10T00:00:00.000Z'), startTime: null });
      expect(normalizeStandaloneScheduleDate('2026-10-10T22:00')).toEqual({
        date: new Date('2026-10-10T00:00:00.000Z'),
        startTime: '22:00',
      });
      expect(normalizeStandaloneScheduleDate('abc')).toBeNull();
      expect(normalizeStandaloneScheduleDate('2026-02-30')).toBeNull();
    });
  });

  describe('isAllDayEvent (R3#47)', () => {
    const at = (iso: string) => new Date(iso);
    it('Missa às 00:00 sem fim é a Missa do Galo, não dia inteiro', () => {
      expect(isAllDayEvent({ type: 'MASS', startDate: at('2026-12-25T03:00:00Z') })).toBe(false);
      expect(isAllDayEvent({ type: 'MASS', startDate: at('2026-12-25T03:00:00Z'), endDate: at('2026-12-25T04:30:00Z') })).toBe(false);
    });
    it('dia inteiro: 00:00 → 00:00 de outro dia, ou janela ≥ 24 h', () => {
      expect(isAllDayEvent({ type: 'MASS', startDate: at('2026-07-24T03:00:00Z'), endDate: at('2026-07-25T03:00:00Z') })).toBe(true);
      expect(isAllDayEvent({ type: 'EVENT', startDate: at('2026-07-25T03:00:00Z'), endDate: at('2026-07-27T03:00:00Z') })).toBe(true);
      expect(isAllDayEvent({ type: 'MASS', startDate: at('2026-07-24T13:00:00Z'), endDate: at('2026-07-25T13:00:00Z') })).toBe(true);
      // fim 00:00 no MESMO instante/dia não conta
      expect(isAllDayEvent({ type: 'MASS', startDate: at('2026-07-24T03:00:00Z'), endDate: at('2026-07-24T03:00:00Z') })).toBe(false);
    });
    it('evento que não é Missa, 00:00 sem fim: dia inteiro (critério antigo do calendário)', () => {
      expect(isAllDayEvent({ type: 'EVENT', startDate: at('2026-07-24T03:00:00Z') })).toBe(true);
      expect(isAllDayEvent({ type: 'EVENT', startDate: at('2026-07-24T22:30:00Z') })).toBe(false);
    });
  });
});
