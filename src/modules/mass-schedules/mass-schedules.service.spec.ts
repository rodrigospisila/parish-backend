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
});
