import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MassScheduleType, UserRole } from '@prisma/client';
import { MassSchedulesService } from './mass-schedules.service';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService } from '../../common/hierarchy.service';

describe('MassSchedulesService — agenda fixa', () => {
  let service: MassSchedulesService;
  let prisma: any;

  const parishAdmin = { id: 'u1', role: UserRole.PARISH_ADMIN, parishId: 'p1' } as any;

  beforeEach(async () => {
    prisma = {
      massSchedule: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MassSchedulesService,
        { provide: PrismaService, useValue: prisma },
        { provide: HierarchyService, useValue: { isCommunityInScope: jest.fn().mockResolvedValue(true) } },
      ],
    }).compile();
    service = module.get<MassSchedulesService>(MassSchedulesService);
  });

  it('rejeita período inválido', async () => {
    await expect(service.expandOccurrences('2026-07-10', '2026-07-01')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.expandOccurrences('xxx', '2026-07-10')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('expande um horário semanal em uma ocorrência por semana no período', async () => {
    // Missa aos domingos (dayOfWeek 0) às 08:00
    prisma.massSchedule.findMany.mockResolvedValue([
      {
        id: 's1',
        dayOfWeek: 0,
        time: '08:00',
        type: MassScheduleType.MASS,
        notes: null,
        isSpecial: false,
        specialDate: null,
        community: { id: 'c1', name: 'Matriz' },
      },
    ]);

    // Janela de 01/07/2026 (qua) a 31/07/2026 → domingos: 05, 12, 19, 26
    const occ = await service.expandOccurrences('2026-07-01T00:00:00.000Z', '2026-07-31T23:59:59.000Z');

    expect(occ.map((o) => o.start)).toEqual([
      '2026-07-05T08:00:00',
      '2026-07-12T08:00:00',
      '2026-07-19T08:00:00',
      '2026-07-26T08:00:00',
    ]);
    expect(occ.every((o) => o.isFixed === true)).toBe(true);
    expect(occ[0].title).toBe('Missa');
    expect(occ[0].end).toBe('2026-07-05T09:00:00'); // Missa = 60 min
  });

  it('horário especial gera ocorrência única na data marcada', async () => {
    prisma.massSchedule.findMany.mockResolvedValue([
      {
        id: 's2',
        dayOfWeek: 3,
        time: '19:00',
        type: MassScheduleType.MASS,
        notes: 'Solenidade',
        isSpecial: true,
        specialDate: new Date('2026-07-15T00:00:00.000Z'),
        community: { id: 'c1', name: 'Matriz' },
      },
    ]);

    const occ = await service.expandOccurrences('2026-07-01T00:00:00.000Z', '2026-07-31T23:59:59.000Z');
    expect(occ).toHaveLength(1);
    expect(occ[0].title).toBe('Missa — Solenidade');
    expect(occ[0].start).toBe('2026-07-15T19:00:00');
  });

  it('inclui o notes no título e usa a duração por tipo', async () => {
    prisma.massSchedule.findMany.mockResolvedValue([
      {
        id: 's3',
        dayOfWeek: 5,
        time: '20:00',
        type: MassScheduleType.ADORATION,
        notes: 'Adoração ao Santíssimo',
        isSpecial: false,
        specialDate: null,
        community: { id: 'c1', name: 'Matriz' },
      },
    ]);

    const occ = await service.expandOccurrences('2026-07-01T00:00:00.000Z', '2026-07-10T23:59:59.000Z');
    // Sexta 03/07 e 10/07
    expect(occ.map((o) => o.start)).toEqual(['2026-07-03T20:00:00', '2026-07-10T20:00:00']);
    expect(occ[0].title).toContain('Adoração');
    expect(occ[0].end).toBe('2026-07-03T21:00:00'); // Adoração = 60 min
  });

  it('escopo do PARISH_ADMIN filtra pela paróquia', async () => {
    await service.findAllManaged(parishAdmin);
    expect(prisma.massSchedule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ community: { parishId: 'p1' } }) }),
    );
  });

  // --- Recorrência mensal ---------------------------------------------------
  // "1º e 3º sábado", "último domingo", "todo dia 13": no interior do Norte e do
  // Nordeste é assim que a comunidade recebe o padre.

  const horarioMensal = (extra: any) => ({
    id: 'm1',
    time: '19:00',
    type: MassScheduleType.MASS,
    notes: null,
    isSpecial: false,
    specialDate: null,
    dayOfWeek: null,
    recurrence: 'WEEKLY',
    weeksOfMonth: [],
    dayOfMonth: null,
    community: { id: 'c1', name: 'Capela São Pedro' },
    ...extra,
  });

  const dias = (occ: any[]) => occ.map((o) => o.start.slice(0, 10));

  it('expande "1º e 3º sábado do mês"', async () => {
    prisma.massSchedule.findMany.mockResolvedValue([
      horarioMensal({ recurrence: 'MONTHLY_NTH', dayOfWeek: 6, weeksOfMonth: [1, 3] }),
    ]);
    // Sábados de julho/2026: 04, 11, 18, 25 → 1º = 04, 3º = 18
    const occ = await service.expandOccurrences('2026-07-01T00:00:00.000Z', '2026-07-31T23:59:59.000Z');
    expect(dias(occ)).toEqual(['2026-07-04', '2026-07-18']);
  });

  it('trata -1 como a ÚLTIMA ocorrência do mês, seja a 4ª ou a 5ª', async () => {
    prisma.massSchedule.findMany.mockResolvedValue([
      horarioMensal({ recurrence: 'MONTHLY_NTH', dayOfWeek: 0, weeksOfMonth: [-1] }),
    ]);
    // Domingos: julho/2026 → 05, 12, 19, 26 (último = 26, a 4ª)
    //           agosto/2026 → 02, 09, 16, 23, 30 (último = 30, a 5ª)
    const occ = await service.expandOccurrences('2026-07-01T00:00:00.000Z', '2026-08-31T23:59:59.000Z');
    expect(dias(occ)).toEqual(['2026-07-26', '2026-08-30']);
  });

  it('não inventa ocorrência quando o mês não tem a 5ª semana pedida', async () => {
    prisma.massSchedule.findMany.mockResolvedValue([
      horarioMensal({ recurrence: 'MONTHLY_NTH', dayOfWeek: 6, weeksOfMonth: [5] }),
    ]);
    // Julho/2026 tem 4 sábados; agosto/2026 tem 5 (01, 08, 15, 22, 29)
    const occ = await service.expandOccurrences('2026-07-01T00:00:00.000Z', '2026-08-31T23:59:59.000Z');
    expect(dias(occ)).toEqual(['2026-08-29']);
  });

  it('expande "todo dia 13" uma vez por mês', async () => {
    prisma.massSchedule.findMany.mockResolvedValue([
      horarioMensal({ recurrence: 'MONTHLY_DAY', dayOfMonth: 13, dayOfWeek: null }),
    ]);
    const occ = await service.expandOccurrences('2026-07-01T00:00:00.000Z', '2026-09-30T23:59:59.000Z');
    expect(dias(occ)).toEqual(['2026-07-13', '2026-08-13', '2026-09-13']);
  });

  it('pula o mês que não tem o dia, em vez de empurrar para o mês seguinte', async () => {
    prisma.massSchedule.findMany.mockResolvedValue([
      horarioMensal({ recurrence: 'MONTHLY_DAY', dayOfMonth: 30, dayOfWeek: null }),
    ]);
    // Fevereiro/2027 não tem dia 30: a missa simplesmente não acontece nesse mês
    const occ = await service.expandOccurrences('2027-01-01T00:00:00.000Z', '2027-03-31T23:59:59.000Z');
    expect(dias(occ)).toEqual(['2027-01-30', '2027-03-30']);
  });

  it('respeita o recorte do período, não o mês inteiro', async () => {
    prisma.massSchedule.findMany.mockResolvedValue([
      horarioMensal({ recurrence: 'MONTHLY_NTH', dayOfWeek: 0, weeksOfMonth: [1, 2, 3, 4] }),
    ]);
    // Domingos de julho/2026: 05, 12, 19, 26 — a janela começa dia 10
    const occ = await service.expandOccurrences('2026-07-10T00:00:00.000Z', '2026-07-20T23:59:59.000Z');
    expect(dias(occ)).toEqual(['2026-07-12', '2026-07-19']);
  });

  it('horário mensal sem dia da semana não vira ocorrência semanal infinita', async () => {
    prisma.massSchedule.findMany.mockResolvedValue([
      horarioMensal({ recurrence: 'MONTHLY_NTH', dayOfWeek: null, weeksOfMonth: [1] }),
    ]);
    const occ = await service.expandOccurrences('2026-07-01T00:00:00.000Z', '2026-07-31T23:59:59.000Z');
    expect(occ).toEqual([]);
  });
});
