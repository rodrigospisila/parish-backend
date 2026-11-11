import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateMassScheduleDto } from './dto/create-mass-schedule.dto';
import { UpdateMassScheduleDto } from './dto/update-mass-schedule.dto';
import {
  assertEndTime,
  isHappeningNow,
  isUsableEndTime,
  occurrenceDays,
  occurrenceWindow,
  scheduleHappeningNow,
} from './mass-schedule-window';

/** Contrato 3 (lançamento): fim do horário fixo e "acontecendo agora". */
describe('mass-schedule-window', () => {
  describe('occurrenceWindow', () => {
    it('sem endTime usa a duração padrão do tipo (Confissão = 45 min, Missa = 60)', () => {
      expect(occurrenceWindow({ date: '2026-11-11', time: '15:00', type: 'CONFESSION' })).toEqual({
        start: '2026-11-11T15:00:00',
        end: '2026-11-11T15:45:00',
        happeningNow: false,
      });
      expect(occurrenceWindow({ date: '2026-11-11', time: '19:00', type: 'MASS' }).end).toBe('2026-11-11T20:00:00');
    });

    it('com endTime o fim é o do horário (Confissão das 15:00 às 17:30)', () => {
      const w = occurrenceWindow({ date: '2026-11-11', time: '15:00', endTime: '17:30', type: 'CONFESSION' });
      expect(w.end).toBe('2026-11-11T17:30:00');
    });

    it('happeningNow: início ≤ agora < fim, no relógio passado por quem chama', () => {
      const base = { date: '2026-11-11', time: '15:00', endTime: '17:30', type: 'CONFESSION' };
      expect(occurrenceWindow({ ...base, nowLocal: '2026-11-11T14:59:59' }).happeningNow).toBe(false);
      expect(occurrenceWindow({ ...base, nowLocal: '2026-11-11T15:00:00' }).happeningNow).toBe(true);
      expect(occurrenceWindow({ ...base, nowLocal: '2026-11-11T17:29:59' }).happeningNow).toBe(true);
      expect(occurrenceWindow({ ...base, nowLocal: '2026-11-11T17:30:00' }).happeningNow).toBe(false);
      // Mesma hora, outro dia: não
      expect(occurrenceWindow({ ...base, nowLocal: '2026-11-12T16:00:00' }).happeningNow).toBe(false);
    });

    it('suspensa ("não haverá") nunca está acontecendo', () => {
      const w = occurrenceWindow({
        date: '2026-11-11',
        time: '15:00',
        endTime: '17:30',
        type: 'CONFESSION',
        nowLocal: '2026-11-11T16:00:00',
        cancelled: true,
      });
      expect(w.happeningNow).toBe(false);
    });

    it('sem endTime, 23:30 + duração padrão termina no dia seguinte', () => {
      const w = occurrenceWindow({ date: '2026-12-24', time: '23:30', type: 'MASS', nowLocal: '2026-12-25T00:10:00' });
      expect(w.end).toBe('2026-12-25T00:30:00');
      expect(w.happeningNow).toBe(true);
    });

    it('endTime inválido gravado (≤ início) é ignorado: vale a duração padrão', () => {
      expect(occurrenceWindow({ date: '2026-11-11', time: '15:00', endTime: '14:00', type: 'ROSARY' }).end).toBe(
        '2026-11-11T15:30:00',
      );
      expect(isUsableEndTime('15:00', '15:00')).toBe(false);
      expect(isUsableEndTime('15:00', 'xx')).toBe(false);
      expect(isUsableEndTime('7:30', '08:15')).toBe(true); // hora legada sem zero à esquerda
    });
  });

  describe('assertEndTime (validação de escrita)', () => {
    it('null e vazio limpam', () => {
      expect(assertEndTime('15:00', null)).toBeNull();
      expect(assertEndTime('15:00', undefined)).toBeNull();
      expect(assertEndTime('15:00', '  ')).toBeNull();
    });

    it('aceita HH:MM depois do início', () => {
      expect(assertEndTime('15:00', '17:30')).toBe('17:30');
      expect(assertEndTime('7:30', '8:15')).toBe('08:15');
    });

    it('400 em português quando não é depois do início', () => {
      expect(() => assertEndTime('15:00', '15:00')).toThrow(BadRequestException);
      expect(() => assertEndTime('15:00', '14:00')).toThrow(/precisa ser depois do início/);
    });

    it('400 em português quando o formato é inválido', () => {
      expect(() => assertEndTime('15:00', '25:00')).toThrow(/Horário de término inválido/);
      expect(() => assertEndTime('15:00', 'cinco')).toThrow(BadRequestException);
    });
  });

  describe('isHappeningNow', () => {
    it('ignora frações/sufixos do agora e respeita a suspensão', () => {
      expect(isHappeningNow('2026-11-11T15:00:00', '2026-11-11T16:00:00', '2026-11-11T15:30:00')).toBe(true);
      expect(isHappeningNow('2026-11-11T15:00:00', '2026-11-11T16:00:00', '2026-11-11T15:30:00', true)).toBe(false);
    });
  });

  describe('scheduleHappeningNow (horário listado sem data → ocorrência de HOJE)', () => {
    const weekly = {
      isSpecial: false,
      specialDate: null,
      recurrence: 'WEEKLY',
      dayOfWeek: 3, // quarta
      dayOfMonth: null,
      weeksOfMonth: [],
      time: '15:00',
      endTime: '17:30',
      type: 'CONFESSION',
    };

    it('semanal: só no dia da semana do horário (11/11/2026 é quarta)', () => {
      expect(scheduleHappeningNow(weekly, '2026-11-11T16:00:00')).toBe(true);
      expect(scheduleHappeningNow(weekly, '2026-11-12T16:00:00')).toBe(false); // quinta, mesma hora
      expect(scheduleHappeningNow(weekly, '2026-11-11T17:30:00')).toBe(false); // acabou
    });

    it('hoje suspenso → false', () => {
      expect(scheduleHappeningNow(weekly, '2026-11-11T16:00:00', ['2026-11-11'])).toBe(false);
      // Suspensão de outra data não interfere
      expect(scheduleHappeningNow(weekly, '2026-11-11T16:00:00', ['2026-11-18'])).toBe(true);
    });

    it('mensal "1º sábado": só no 1º sábado, não nos outros', () => {
      const nth = { ...weekly, recurrence: 'MONTHLY_NTH', dayOfWeek: 6, weeksOfMonth: [1] };
      expect(scheduleHappeningNow(nth, '2026-11-07T16:00:00')).toBe(true); // 1º sábado de nov/2026
      expect(scheduleHappeningNow(nth, '2026-11-14T16:00:00')).toBe(false); // 2º sábado
    });

    it('mensal "último domingo"', () => {
      const last = { ...weekly, recurrence: 'MONTHLY_NTH', dayOfWeek: 0, weeksOfMonth: [-1] };
      expect(scheduleHappeningNow(last, '2026-11-29T16:00:00')).toBe(true);
      expect(scheduleHappeningNow(last, '2026-11-22T16:00:00')).toBe(false);
    });

    it('mensal "todo dia 13": só no dia 13', () => {
      const day = { ...weekly, recurrence: 'MONTHLY_DAY', dayOfWeek: null, dayOfMonth: 13 };
      expect(scheduleHappeningNow(day, '2026-11-13T16:00:00')).toBe(true);
      expect(scheduleHappeningNow(day, '2026-11-11T16:00:00')).toBe(false);
    });

    it('especial (specialDate): só na data marcada, mesmo que o dia da semana bata', () => {
      const special = { ...weekly, isSpecial: true, specialDate: new Date('2026-11-11T00:00:00.000Z') };
      expect(scheduleHappeningNow(special, '2026-11-11T16:00:00')).toBe(true);
      expect(scheduleHappeningNow(special, '2026-11-18T16:00:00')).toBe(false); // quarta seguinte
    });

    it('ocorrência de ontem que passa da meia-noite (sem endTime) ainda conta — salvo suspensa', () => {
      const late = { ...weekly, dayOfWeek: 2, time: '23:30', endTime: null, type: 'MASS' }; // terça 23:30
      expect(scheduleHappeningNow(late, '2026-11-11T00:10:00')).toBe(true);
      expect(scheduleHappeningNow(late, '2026-11-11T00:10:00', ['2026-11-10'])).toBe(false);
      expect(scheduleHappeningNow(late, '2026-11-11T00:30:00')).toBe(false);
    });

    it('hora inválida (carga antiga) nunca está acontecendo', () => {
      expect(scheduleHappeningNow({ ...weekly, time: '25:70' }, '2026-11-11T16:00:00')).toBe(false);
    });
  });

  describe('DTO de criar/editar: endTime', () => {
    const base = { communityId: 'c1', type: 'CONFESSION', time: '15:00', dayOfWeek: 3 };
    const check = async (cls: any, body: Record<string, unknown>) => {
      const dto: any = plainToInstance(cls, body);
      const errors = await validate(dto);
      return { dto, messages: errors.flatMap((e) => Object.values(e.constraints ?? {})) };
    };

    it('aceita HH:MM, "H:MM" (normaliza), null e ausente; vazio vira null', async () => {
      expect((await check(CreateMassScheduleDto, { ...base, endTime: '17:30' })).messages).toEqual([]);
      const curto = await check(CreateMassScheduleDto, { ...base, time: '7:30', endTime: '8:15' });
      expect(curto.messages).toEqual([]);
      expect(curto.dto.endTime).toBe('08:15');
      expect((await check(CreateMassScheduleDto, { ...base, endTime: null })).messages).toEqual([]);
      expect((await check(CreateMassScheduleDto, base)).messages).toEqual([]);
      const vazio = await check(UpdateMassScheduleDto, { endTime: '' });
      expect(vazio.messages).toEqual([]);
      expect(vazio.dto.endTime).toBeNull();
    });

    it('formato inválido → mensagem em português (criar e editar)', async () => {
      for (const cls of [CreateMassScheduleDto, UpdateMassScheduleDto]) {
        const r = await check(cls, { ...base, endTime: '25:00' });
        expect(r.messages).toContain('Horário de término inválido: use HH:MM, de 00:00 a 23:59');
      }
      expect((await check(CreateMassScheduleDto, { ...base, endTime: 1730 })).messages.length).toBeGreaterThan(0);
    });
  });

  describe('occurrenceDays', () => {
    it('semanal: uma por semana na janela', () => {
      const days = occurrenceDays(
        { isSpecial: false, specialDate: null, recurrence: 'WEEKLY', dayOfWeek: 0 },
        new Date('2026-11-01T00:00:00.000Z'),
        new Date('2026-11-30T00:00:00.000Z'),
      );
      expect(days.map((d) => d.toISOString().slice(0, 10))).toEqual([
        '2026-11-01',
        '2026-11-08',
        '2026-11-15',
        '2026-11-22',
        '2026-11-29',
      ]);
    });
  });
});

describe('shiftedEndTime (a hora mudou e o fim não veio: preserva a duração)', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { shiftedEndTime } = require('./mass-schedule-window');

  it('desloca o fim junto com o início', () => {
    expect(shiftedEndTime('19:00', '20:00', '08:00')).toBe('09:00');
    expect(shiftedEndTime('15:00', '17:30', '18:00')).toBe('20:30');
    expect(shiftedEndTime('7:30', '08:15', '10:00')).toBe('10:45');
    expect(shiftedEndTime('22:00', '23:00', '22:59')).toBe('23:59');
  });

  it('fim que passaria de 23:59 → null (sem fim depois da meia-noite)', () => {
    expect(shiftedEndTime('15:00', '17:30', '22:00')).toBeNull();
    expect(shiftedEndTime('22:00', '23:00', '23:00')).toBeNull();
  });

  it('mesma hora mantém o fim; sem fim, fim inválido ou hora fora do formato → null', () => {
    expect(shiftedEndTime('15:00', '17:30', '15:00')).toBe('17:30');
    expect(shiftedEndTime('15:00', null, '18:00')).toBeNull();
    expect(shiftedEndTime('15:00', '14:00', '18:00')).toBeNull(); // fim antigo antes do começo
    expect(shiftedEndTime('15:00', '14:00', '15:00')).toBeNull();
    expect(shiftedEndTime('15:00', '17:30', '25:70')).toBeNull();
  });
});
