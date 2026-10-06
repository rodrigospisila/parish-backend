import { ScheduleConflictsService } from './schedule-conflicts.service';

/**
 * A17: a Missa da agenda fixa grava date só-dia (00:00Z) + startTime. No TZ
 * de Brasília isso caía no dia ANTERIOR e o duplo agendamento com um evento
 * no mesmo horário passava sem alerta (inclusive no aceite de troca).
 */
describe('ScheduleConflictsService (A17)', () => {
  let service: ScheduleConflictsService;
  let prisma: any;

  // Missa fixa sábado 05/09/2026 18:00–19:00
  const fixedMass = {
    id: 's-fixa',
    date: new Date('2026-09-05T00:00:00.000Z'),
    startTime: '18:00',
    endTime: '19:00',
    event: null,
  };

  const assignmentOn = (schedule: Record<string, unknown>) => ({
    member: { id: 'm1', fullName: 'Ana' },
    schedule: { title: 'Outra', community: { name: 'Capela' }, ...schedule },
  });

  beforeEach(() => {
    prisma = {
      schedule: { findUnique: jest.fn().mockResolvedValue(fixedMass) },
      scheduleAssignment: { findMany: jest.fn() },
    };
    service = new ScheduleConflictsService(prisma);
  });

  it('evento no mesmo horário (18:30 de Brasília) é OVERLAP', async () => {
    prisma.scheduleAssignment.findMany.mockResolvedValue([
      assignmentOn({
        id: 's-evento',
        date: new Date('2026-09-05T21:30:00.000Z'),
        startTime: null,
        endTime: null,
        event: {
          startDate: new Date('2026-09-05T21:30:00.000Z'),
          endDate: new Date('2026-09-05T22:30:00.000Z'),
          community: { name: 'Matriz' },
        },
      }),
    ]);

    const conflicts = await service.findConflicts(['m1'], 's-fixa');

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({ scheduleId: 's-evento', type: 'OVERLAP', communityName: 'Matriz' });
  });

  it('evento no mesmo dia em outro horário é SAME_DAY', async () => {
    prisma.scheduleAssignment.findMany.mockResolvedValue([
      assignmentOn({
        id: 's-manha',
        date: new Date('2026-09-05T12:00:00.000Z'),
        event: { startDate: new Date('2026-09-05T12:00:00.000Z'), endDate: null },
      }),
    ]);

    const conflicts = await service.findConflicts(['m1'], 's-fixa');
    expect(conflicts.map((c) => c.type)).toEqual(['SAME_DAY']);
  });

  it('evento na véspera às 20h (sexta) não é conflito do sábado', async () => {
    prisma.scheduleAssignment.findMany.mockResolvedValue([
      assignmentOn({
        id: 's-sexta',
        date: new Date('2026-09-04T23:00:00.000Z'),
        event: { startDate: new Date('2026-09-04T23:00:00.000Z'), endDate: null },
      }),
    ]);

    expect(await service.findConflicts(['m1'], 's-fixa')).toEqual([]);
  });

  it('duas Missas fixas no mesmo dia (só-dia + startTime) que se sobrepõem', async () => {
    prisma.scheduleAssignment.findMany.mockResolvedValue([
      assignmentOn({ id: 's-fixa-2', date: new Date('2026-09-05T00:00:00.000Z'), startTime: '18:30', endTime: '19:30', event: null }),
    ]);

    const conflicts = await service.findConflicts(['m1'], 's-fixa');
    expect(conflicts[0].type).toBe('OVERLAP');
  });
});
