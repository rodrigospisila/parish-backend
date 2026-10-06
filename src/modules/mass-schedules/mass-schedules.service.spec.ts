import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MassScheduleType, UserRole } from '@prisma/client';
import { MassSchedulesService } from './mass-schedules.service';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CancelOccurrencesDto } from './dto/cancel-occurrences.dto';
import { CreateMassScheduleDto } from './dto/create-mass-schedule.dto';
import { UpdateMassScheduleDto } from './dto/update-mass-schedule.dto';

describe('MassSchedulesService — agenda fixa', () => {
  let service: MassSchedulesService;
  let prisma: any;
  let audit: { log: jest.Mock };
  let notifications: { notifyUsers: jest.Mock };
  let hierarchy: { isCommunityInScope: jest.Mock };

  const parishAdmin = { id: 'u1', role: UserRole.PARISH_ADMIN, parishId: 'p1' } as any;

  beforeEach(async () => {
    prisma = {
      massSchedule: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn() },
      massScheduleCancellation: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn(),
        delete: jest.fn().mockResolvedValue({}),
      },
      massScheduleFavorite: { findMany: jest.fn().mockResolvedValue([]) },
      // UF das comunidades (generate-pending corta no "hoje" de cada uma)
      community: { findMany: jest.fn().mockResolvedValue([]) },
      schedule: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    notifications = { notifyUsers: jest.fn().mockResolvedValue(undefined) };
    hierarchy = { isCommunityInScope: jest.fn().mockResolvedValue(true) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MassSchedulesService,
        { provide: PrismaService, useValue: prisma },
        { provide: HierarchyService, useValue: hierarchy },
        { provide: AuditService, useValue: audit },
        { provide: NotificationsService, useValue: notifications },
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

  it('B29: hora inválida gravada ("25:70") fica fora da agenda; "7:30" de carga antiga continua', async () => {
    const base = { dayOfWeek: 0, type: MassScheduleType.MASS, notes: null, isSpecial: false, specialDate: null, community: { id: 'c1', name: 'Matriz' } };
    prisma.massSchedule.findMany.mockResolvedValue([
      { ...base, id: 'ruim', time: '25:70' },
      { ...base, id: 'antiga', time: '7:30' },
    ]);
    const occ = await service.expandOccurrences('2026-07-01T00:00:00.000Z', '2026-07-07T23:59:59.000Z');
    expect(occ.map((o) => [o.massScheduleId, o.start])).toEqual([['antiga', '2026-07-05T07:30:00']]);
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

  // --- Suspensão pontual ("não haverá") -------------------------------------
  // Matriz Sagrado Coração: Confissão às 15:00, mas em alguns dias não acontece.
  // "Hoje" congelado em 24/09/2026 (quinta-feira).

  describe('suspensão de data do horário fixo', () => {
    const HOJE = '2026-09-24'; // quinta
    const coordenador = { id: 'autor', role: UserRole.COMMUNITY_COORDINATOR, communityId: 'c1' } as any;

    /** Confissão semanal às 15:00 (padrão: quinta-feira). */
    const confissao = (extra: any = {}) => ({
      id: 'conf',
      communityId: 'c1',
      dayOfWeek: 4,
      time: '15:00',
      type: MassScheduleType.CONFESSION,
      notes: null,
      isSpecial: false,
      specialDate: null,
      recurrence: 'WEEKLY',
      weeksOfMonth: [],
      dayOfMonth: null,
      community: { id: 'c1', name: 'Matriz Sagrado Coração' },
      ...extra,
    });

    const linha = (date: string, reason: string | null = null) => ({
      id: `cx-${date}`,
      date: new Date(`${date}T00:00:00.000Z`),
      reason,
      createdAt: new Date('2026-09-24T12:00:00.000Z'),
      createdBy: { id: 'autor', name: 'Coordenadora' },
    });

    beforeEach(() => {
      jest.spyOn(service as any, 'todaySaoPaulo').mockReturnValue(HOJE);
      // Suspender e avisar usam o "hoje" da UF da comunidade (R3#53)
      jest.spyOn(service as any, 'todayIn').mockReturnValue(HOJE);
      prisma.massSchedule.findUnique.mockResolvedValue(confissao());
      prisma.massScheduleCancellation.upsert.mockImplementation(({ create }: any) =>
        Promise.resolve(linha(create.date.toISOString().slice(0, 10), create.reason)),
      );
    });

    it('expandOccurrences marca a ocorrência suspensa (uma consulta só) e a mantém na lista', async () => {
      prisma.massSchedule.findMany.mockResolvedValue([confissao(), confissao({ id: 'conf9', time: '09:00' })]);
      prisma.massScheduleCancellation.findMany.mockResolvedValue([
        { massScheduleId: 'conf', date: new Date('2026-10-01T00:00:00.000Z'), reason: 'Agenda dos padres' },
      ]);

      const occ = await service.expandOccurrences('2026-09-24T00:00:00.000Z', '2026-10-08T23:59:59.000Z');

      expect(prisma.massScheduleCancellation.findMany).toHaveBeenCalledTimes(1);
      const where = prisma.massScheduleCancellation.findMany.mock.calls[0][0].where;
      expect([...where.massScheduleId.in].sort()).toEqual(['conf', 'conf9']);
      // 3 quintas × 2 horários, todas na lista
      expect(occ).toHaveLength(6);
      const suspensas = occ.filter((o) => o.cancelled);
      expect(suspensas).toHaveLength(1);
      expect(suspensas[0]).toMatchObject({
        massScheduleId: 'conf',
        start: '2026-10-01T15:00:00',
        cancelReason: 'Agenda dos padres',
      });
      expect(occ.filter((o) => !o.cancelled).every((o) => o.cancelReason === null)).toBe(true);
    });

    it('rejeita data que não é ocorrência do horário, com mensagem clara', async () => {
      await expect(service.cancelOccurrences('conf', { dates: ['2026-09-25'] }, coordenador)).rejects.toThrow(
        'Não há Confissão às 15:00 em 25/09/2026',
      );
      expect(prisma.massScheduleCancellation.upsert).not.toHaveBeenCalled();
    });

    it('respeita a recorrência mensal ("1º sábado") na validação', async () => {
      prisma.massSchedule.findUnique.mockResolvedValue(
        confissao({ recurrence: 'MONTHLY_NTH', dayOfWeek: 6, weeksOfMonth: [1] }),
      );
      // Sábados de outubro/2026: 03 (1º), 10, 17…
      await expect(service.cancelOccurrences('conf', { dates: ['2026-10-10'] }, coordenador)).rejects.toThrow(
        'Não há Confissão às 15:00 em 10/10/2026',
      );
      await expect(service.cancelOccurrences('conf', { dates: ['2026-10-03'] }, coordenador)).resolves.toHaveLength(1);
    });

    it('rejeita data no passado; hoje pode', async () => {
      await expect(service.cancelOccurrences('conf', { dates: ['2026-09-17'] }, coordenador)).rejects.toThrow(
        'já passou',
      );
      const res = await service.cancelOccurrences('conf', { dates: [HOJE] }, coordenador);
      expect(res).toEqual([
        {
          id: `cx-${HOJE}`,
          date: HOJE,
          reason: null,
          createdAt: new Date('2026-09-24T12:00:00.000Z'),
          createdBy: { id: 'autor', name: 'Coordenadora' },
        },
      ]);
    });

    it('rejeita data inexistente no calendário e mais de 62 datas', async () => {
      await expect(
        service.cancelOccurrences('conf', { dates: ['2026-02-30'] }, coordenador),
      ).rejects.toBeInstanceOf(BadRequestException);
      const muitas = Array.from({ length: 63 }, (_, i) =>
        new Date(Date.UTC(2026, 9, 1) + i * 7 * 86400000).toISOString().slice(0, 10),
      );
      await expect(service.cancelOccurrences('conf', { dates: muitas }, coordenador)).rejects.toThrow(
        'no máximo 62',
      );
    });

    it('DTO: 1 a 62 datas AAAA-MM-DD, motivo aparado e até 140', async () => {
      const erros = async (body: any) =>
        (
          await validate(plainToInstance(CancelOccurrencesDto, body), {
            whitelist: true,
            forbidNonWhitelisted: true,
          })
        ).map((e) => e.property);
      expect(await erros({ dates: ['2026-10-01'], reason: '  Agenda dos padres  ' })).toEqual([]);
      expect(plainToInstance(CancelOccurrencesDto, { dates: [], reason: '  x ' }).reason).toBe('x');
      expect(await erros({ dates: [] })).toEqual(['dates']);
      expect(await erros({ dates: Array(63).fill('2026-10-01') })).toEqual(['dates']);
      expect(await erros({ dates: ['01/10/2026'] })).toEqual(['dates']);
      expect(await erros({ dates: ['2026-10-01'], reason: 'x'.repeat(141) })).toEqual(['reason']);
      expect(await erros({ dates: ['2026-10-01'], extra: 1 })).toEqual(['extra']);
    });

    it('idempotente: data já suspensa só troca o motivo (e não re-notifica)', async () => {
      prisma.massScheduleCancellation.findMany.mockResolvedValue([{ date: new Date(`${HOJE}T00:00:00.000Z`) }]);
      prisma.massScheduleFavorite.findMany.mockResolvedValue([{ userId: 'fiel' }]);

      await service.cancelOccurrences('conf', { dates: [HOJE, HOJE], reason: '  Retiro do clero ' }, coordenador);

      expect(prisma.massScheduleCancellation.upsert).toHaveBeenCalledTimes(1);
      const args = prisma.massScheduleCancellation.upsert.mock.calls[0][0];
      expect(args.update).toEqual({ reason: 'Retiro do clero' });
      expect(args.create).toMatchObject({ massScheduleId: 'conf', reason: 'Retiro do clero', createdById: 'autor' });
      expect(notifications.notifyUsers).not.toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'MASS_SCHEDULE_CANCELLED',
          entityId: 'conf',
          metadata: expect.objectContaining({ newDates: [], reasonUpdatedDates: [HOJE] }),
        }),
      );
    });

    it('motivo vazio vira nulo', async () => {
      await service.cancelOccurrences('conf', { dates: ['2026-10-01'], reason: '   ' }, coordenador);
      expect(prisma.massScheduleCancellation.upsert.mock.calls[0][0].update).toEqual({ reason: null });
    });

    it('fora do escopo da comunidade → 403', async () => {
      hierarchy.isCommunityInScope.mockResolvedValue(false);
      await expect(
        service.cancelOccurrences('conf', { dates: ['2026-10-01'] }, coordenador),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.restoreOccurrence('conf', '2026-10-01', coordenador)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('horário inexistente → 404', async () => {
      prisma.massSchedule.findUnique.mockResolvedValue(null);
      await expect(service.listCancellations('x', coordenador)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('GET usa hoje..+60 dias por padrão e devolve AAAA-MM-DD', async () => {
      prisma.massScheduleCancellation.findMany.mockResolvedValue([linha('2026-10-01', 'Agenda dos padres')]);
      const res = await service.listCancellations('conf', coordenador);
      const where = prisma.massScheduleCancellation.findMany.mock.calls[0][0].where;
      expect(where.date.gte.toISOString()).toBe('2026-09-24T00:00:00.000Z');
      expect(where.date.lte.toISOString()).toBe('2026-11-23T00:00:00.000Z');
      expect(res[0]).toMatchObject({
        date: '2026-10-01',
        reason: 'Agenda dos padres',
        createdBy: { id: 'autor', name: 'Coordenadora' },
      });
      await expect(
        service.listCancellations('conf', coordenador, '2026-10-10', '2026-10-01'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('DELETE reativa a data (e registra auditoria); 404 se não estava suspensa', async () => {
      await expect(service.restoreOccurrence('conf', '2026-10-01', coordenador)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      prisma.massScheduleCancellation.findUnique.mockResolvedValue({ id: 'cx1', reason: 'Agenda dos padres' });
      await expect(service.restoreOccurrence('conf', '2026-10-01', coordenador)).resolves.toEqual({ ok: true });
      expect(prisma.massScheduleCancellation.delete).toHaveBeenCalledWith({ where: { id: 'cx1' } });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'MASS_SCHEDULE_RESTORED',
          entityId: 'conf',
          before: { date: '2026-10-01', reason: 'Agenda dos padres' },
        }),
      );
      // 01/10 não é hoje nem amanhã: ninguém é avisado
      expect(notifications.notifyUsers).not.toHaveBeenCalled();
    });

    describe('aviso para quem favoritou', () => {
      beforeEach(() => {
        prisma.massScheduleFavorite.findMany.mockResolvedValue([{ userId: 'fiel1' }, { userId: 'fiel2' }]);
      });

      it('suspensão para HOJE avisa os favoritos (menos o autor)', async () => {
        await service.cancelOccurrences('conf', { dates: [HOJE], reason: 'Agenda dos padres' }, coordenador);
        expect(prisma.massScheduleFavorite.findMany.mock.calls[0][0].where).toEqual({
          massScheduleId: 'conf',
          userId: { not: 'autor' },
        });
        expect(notifications.notifyUsers).toHaveBeenCalledTimes(1);
        const [ids, , title, body, data] = notifications.notifyUsers.mock.calls[0];
        expect(ids).toEqual(['fiel1', 'fiel2']);
        expect(title).toBe('Confissão das 15:00 não vai acontecer hoje');
        expect(body).toContain('Matriz Sagrado Coração');
        expect(body).toContain('Agenda dos padres');
        expect(data).toMatchObject({ kind: 'mass-schedule-cancelled', massScheduleId: 'conf', date: HOJE });
      });

      it('suspensão para AMANHÃ diz "amanhã"; reativação diz "voltou a acontecer"', async () => {
        prisma.massSchedule.findUnique.mockResolvedValue(confissao({ dayOfWeek: 5 })); // sexta 25/09
        await service.cancelOccurrences('conf', { dates: ['2026-09-25'] }, coordenador);
        expect(notifications.notifyUsers.mock.calls[0][2]).toBe('Confissão das 15:00 não vai acontecer amanhã');

        prisma.massScheduleCancellation.findUnique.mockResolvedValue({ id: 'cx', reason: null });
        await service.restoreOccurrence('conf', '2026-09-25', coordenador);
        expect(notifications.notifyUsers.mock.calls[1][2]).toBe('Confissão das 15:00 voltou a acontecer amanhã');
      });

      it('data mais distante não dispara push', async () => {
        await service.cancelOccurrences('conf', { dates: ['2026-10-01', '2026-10-08'] }, coordenador);
        expect(prisma.massScheduleFavorite.findMany).not.toHaveBeenCalled();
        expect(notifications.notifyUsers).not.toHaveBeenCalled();
      });

      it('falha no aviso não derruba a suspensão', async () => {
        notifications.notifyUsers.mockRejectedValue(new Error('expo fora'));
        await expect(service.cancelOccurrences('conf', { dates: [HOJE] }, coordenador)).resolves.toHaveLength(1);
      });
    });

    describe('escalas', () => {
      const ocorrencia = (date: string, cancelled: boolean) => ({
        id: `mass-conf-${date}`,
        massScheduleId: 'conf',
        title: 'Confissão',
        type: MassScheduleType.CONFESSION,
        notes: null,
        start: `${date}T15:00:00`,
        end: `${date}T15:45:00`,
        community: { id: 'c1', name: 'Matriz' },
        isFixed: true,
        cancelled,
        cancelReason: cancelled ? 'Agenda dos padres' : null,
      });

      it('generate-pending pula a ocorrência suspensa', async () => {
        jest.spyOn(service as any, 'earliestToday').mockReturnValue('2026-09-30');
        jest
          .spyOn(service, 'expandOccurrences')
          .mockResolvedValue([ocorrencia('2026-10-01', true), ocorrencia('2026-10-08', false)] as any);
        prisma.massSchedule.findMany.mockResolvedValue([
          {
            id: 'conf',
            pastorals: [
              { communityPastoralId: 'cp1', requiredPeople: 2, communityPastoral: { globalPastoral: { name: 'Acolhida' } } },
            ],
          },
        ]);
        const gerar = jest
          .spyOn(service, 'generateSchedule')
          .mockResolvedValue({ id: 'sch1', title: 'Confissão 15:00' } as any);

        const res = await service.generatePendingSchedules({ from: '2026-10-01', to: '2026-10-08' }, parishAdmin);

        expect(gerar).toHaveBeenCalledTimes(1);
        expect(gerar.mock.calls[0][1]).toEqual({ date: '2026-10-08' });
        expect(res.created).toBe(1);
      });

      it('gerar escala avulsa numa data suspensa → 400', async () => {
        prisma.massSchedule.findUnique.mockResolvedValue({ ...confissao(), pastorals: [{ communityPastoralId: 'cp1' }] });
        prisma.massScheduleCancellation.findUnique.mockResolvedValue({ id: 'cx' });
        await expect(service.generateSchedule('conf', { date: '2026-10-01' }, parishAdmin)).rejects.toThrow(
          'suspenso em 01/10/2026',
        );
        expect(prisma.schedule.create).not.toHaveBeenCalled();
      });

      it('B29: gerar escala em data que não é ocorrência → 400 (terça para a confissão de quinta)', async () => {
        prisma.massSchedule.findUnique.mockResolvedValue({ ...confissao(), pastorals: [{ communityPastoralId: 'cp1' }] });
        jest.spyOn(service as any, 'todayIn').mockReturnValue('2026-09-24');
        await expect(service.generateSchedule('conf', { date: '2026-09-29' }, parishAdmin)).rejects.toThrow(
          'não acontece em 29/09/2026',
        );
        // mensal (1º sábado): o 2º sábado também não serve
        prisma.massSchedule.findUnique.mockResolvedValue({
          ...confissao({ dayOfWeek: 6, recurrence: 'MONTHLY_NTH', weeksOfMonth: [1] }),
          pastorals: [{ communityPastoralId: 'cp1' }],
        });
        await expect(service.generateSchedule('conf', { date: '2026-10-10' }, parishAdmin)).rejects.toThrow('não acontece');
        expect(prisma.schedule.create).not.toHaveBeenCalled();
      });

      it('B29: gerar escala no passado → 400; hoje e adiante passa', async () => {
        prisma.massSchedule.findUnique.mockResolvedValue({ ...confissao(), pastorals: [{ communityPastoralId: 'cp1' }] });
        const hoje = jest.spyOn(service as any, 'todayIn').mockReturnValue('2026-09-25');
        await expect(service.generateSchedule('conf', { date: '2026-09-24' }, parishAdmin)).rejects.toThrow('já passou');
        // o "hoje" é o do fuso da comunidade (UF)
        expect(hoje).toHaveBeenCalledWith(undefined);
        prisma.schedule.create.mockResolvedValue({ id: 'sch1', title: 'Confissão 15:00' });
        await expect(service.generateSchedule('conf', { date: '2026-10-01' }, parishAdmin)).resolves.toMatchObject({ id: 'sch1' });
      });

      it('generate-pending não tenta o que já passou', async () => {
        jest.spyOn(service as any, 'earliestToday').mockReturnValue('2026-10-05');
        jest
          .spyOn(service, 'expandOccurrences')
          .mockResolvedValue([ocorrencia('2026-10-01', false), ocorrencia('2026-10-08', false)] as any);
        prisma.massSchedule.findMany.mockResolvedValue([
          { id: 'conf', pastorals: [{ communityPastoralId: 'cp1', requiredPeople: 1, communityPastoral: null }] },
        ]);
        const gerar = jest.spyOn(service, 'generateSchedule').mockResolvedValue({ id: 'sch1', title: 'x' } as any);
        const res = await service.generatePendingSchedules({ from: '2026-10-01', to: '2026-10-08' }, parishAdmin);
        expect(gerar.mock.calls.map((c) => c[1])).toEqual([{ date: '2026-10-08' }]);
        expect(res).toMatchObject({ created: 1, failed: 0 });
      });
    });
  });

  describe('B29: hora e recorrência', () => {
    const dto = (time: string) =>
      plainToInstance(CreateMassScheduleDto, { time, type: 'MASS', communityId: 'c1', dayOfWeek: 0 });

    it('time aceita só HH:MM de 00:00 a 23:59', async () => {
      // "7:30" (legado) é normalizado para "07:30" antes da validação (R3#49)
      for (const ok of ['00:00', '07:30', '7:30', '19:00', '23:59']) expect(await validate(dto(ok))).toHaveLength(0);
      for (const ruim of ['25:70', '24:00', '9:60', '07:60', '19h', '']) {
        const erros = await validate(dto(ruim));
        expect(erros.map((e) => e.property)).toContain('time');
      }
    });

    it('PATCH só com dayOfWeek num MONTHLY_NTH mantém as semanas gravadas', async () => {
      prisma.massSchedule.findUnique.mockResolvedValue({
        id: 'm1',
        communityId: 'c1',
        recurrence: 'MONTHLY_NTH',
        dayOfWeek: 6,
        dayOfMonth: null,
        weeksOfMonth: [1, 3],
        community: { id: 'c1' },
        pastorals: [],
      });
      prisma.massSchedule.update = jest.fn().mockResolvedValue({ id: 'm1' });
      await service.update('m1', { dayOfWeek: 0 }, parishAdmin);
      expect(prisma.massSchedule.update.mock.calls[0][0].data).toMatchObject({
        recurrence: 'MONTHLY_NTH',
        dayOfWeek: 0,
        weeksOfMonth: [1, 3],
      });
    });

    it('trocar de semanal para MONTHLY_NTH sem semanas continua pedindo as semanas', async () => {
      prisma.massSchedule.findUnique.mockResolvedValue({
        id: 'm1',
        communityId: 'c1',
        recurrence: 'WEEKLY',
        dayOfWeek: 6,
        dayOfMonth: null,
        weeksOfMonth: [],
        community: { id: 'c1' },
        pastorals: [],
      });
      await expect(service.update('m1', { recurrence: 'MONTHLY_NTH' as any }, parishAdmin)).rejects.toThrow('Escolha quais ocorrências');
    });
  });

  describe('M21/B28: listagens públicas exigem a comunidade', () => {
    it('findAll, day/:d e special sem communityId → 400, sem consultar o banco', async () => {
      await expect(service.findAll()).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.findAll('  ')).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.findByDayOfWeek(0)).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.findByDayOfWeek(9, 'c1')).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.findSpecialSchedules()).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.massSchedule.findMany).not.toHaveBeenCalled();
    });

    it('findAll com communityId filtra por ela e corta as suspensões no "hoje" do fuso da comunidade', async () => {
      jest.spyOn(service as any, 'earliestToday').mockReturnValue('2026-09-25');
      jest.spyOn(service as any, 'todayIn').mockImplementation((uf: any) => (uf === 'AC' ? '2026-09-25' : '2026-09-26'));
      const linhaAgenda = (state: string) => ({
        id: `s-${state}`,
        communityId: 'c1',
        community: { id: 'c1', name: 'Matriz', state },
        cancellations: [
          { date: new Date('2026-09-25T00:00:00.000Z'), reason: 'Retiro' },
          { date: new Date('2026-09-27T00:00:00.000Z'), reason: null },
        ],
      });
      prisma.massSchedule.findMany.mockResolvedValue([linhaAgenda('AC'), linhaAgenda('SP')]);
      const r = await service.findAll('c1');
      expect(prisma.massSchedule.findMany.mock.calls[0][0].where).toEqual({ communityId: 'c1' });
      expect(r[0].upcomingCancellations.map((c) => c.date)).toEqual(['2026-09-25', '2026-09-27']);
      expect(r[1].upcomingCancellations.map((c) => c.date)).toEqual(['2026-09-27']);
      // o contrato da comunidade continua { id, name }
      expect(r[0].community).toEqual({ id: 'c1', name: 'Matriz' });
    });
  });

  describe('favoritos trazem as datas suspensas (lembrete local do app)', () => {
    it('getFavorites anexa upcomingCancellations cortadas no "hoje" do fuso da comunidade', async () => {
      jest.spyOn(service as any, 'earliestToday').mockReturnValue('2026-09-25');
      jest.spyOn(service as any, 'todayIn').mockImplementation((uf: any) => (uf === 'AC' ? '2026-09-25' : '2026-09-26'));
      const favorito = (state: string) => ({
        userId: 'fiel',
        massSchedule: {
          id: `s-${state}`,
          communityId: 'c1',
          time: '19:00',
          community: { id: 'c1', name: 'Matriz', state },
          cancellations: [
            { date: new Date('2026-09-25T00:00:00.000Z'), reason: 'Retiro' },
            { date: new Date('2026-09-27T00:00:00.000Z'), reason: null },
          ],
        },
      });
      prisma.massScheduleFavorite.findMany.mockResolvedValue([favorito('AC'), favorito('SP')]);
      const r: any[] = await service.getFavorites({ id: 'fiel', role: UserRole.FAITHFUL, communityId: 'c1' } as any);

      // Mesma janela de suspensões do findAll
      const include = prisma.massScheduleFavorite.findMany.mock.calls[0][0].include.massSchedule.include;
      expect(include.cancellations).toEqual(
        expect.objectContaining({ select: { date: true, reason: true }, orderBy: { date: 'asc' } }),
      );
      expect(include.cancellations.where.date.gte.toISOString()).toBe('2026-09-25T00:00:00.000Z');
      expect(r[0].upcomingCancellations).toEqual([
        { date: '2026-09-25', reason: 'Retiro' },
        { date: '2026-09-27', reason: null },
      ]);
      expect(r[1].upcomingCancellations).toEqual([{ date: '2026-09-27', reason: null }]);
      // Contrato antigo preservado: horário "cru" + comunidade { id, name }, sem o array interno
      expect(r[0]).toEqual(expect.objectContaining({ id: 's-AC', time: '19:00', community: { id: 'c1', name: 'Matriz' } }));
      expect(r[0]).not.toHaveProperty('cancellations');
    });
  });

  describe('horário repetido na mesma comunidade → 409', () => {
    const existente = {
      id: 'm-old',
      recurrence: 'WEEKLY',
      dayOfWeek: 0,
      dayOfMonth: null,
      weeksOfMonth: [],
      isSpecial: false,
      specialDate: null,
    };

    beforeEach(() => {
      prisma.community = { findUnique: jest.fn().mockResolvedValue({ id: 'c1', parishId: 'p1' }) };
      prisma.massSchedule.create = jest.fn().mockResolvedValue({ id: 'm-new' });
      prisma.massSchedule.update = jest.fn().mockResolvedValue({ id: 'm1' });
    });

    it('criar igual (comunidade, tipo, dia e hora) → 409 com mensagem clara, sem gravar', async () => {
      prisma.massSchedule.findMany.mockResolvedValue([existente]);
      await expect(
        service.create({ communityId: 'c1', type: 'MASS', time: '07:30', dayOfWeek: 0 } as any, parishAdmin),
      ).rejects.toThrow('Já existe um horário igual nesta comunidade');
      expect(prisma.massSchedule.create).not.toHaveBeenCalled();
      // Busca na comunidade, mesmo tipo, hora com e sem o zero (carga antiga "7:30")
      expect(prisma.massSchedule.findMany.mock.calls[0][0].where).toEqual({
        communityId: 'c1',
        type: 'MASS',
        time: { in: ['07:30', '7:30'] },
      });
    });

    it('mesma hora em outro dia, outras semanas do mês ou outra data especial → cria', async () => {
      prisma.massSchedule.findMany.mockResolvedValue([
        existente,
        { ...existente, id: 'm-nth', recurrence: 'MONTHLY_NTH', dayOfWeek: 6, weeksOfMonth: [1, 3] },
        { ...existente, id: 'm-esp', isSpecial: true, specialDate: new Date('2026-12-24T00:00:00.000Z') },
      ]);
      await service.create({ communityId: 'c1', type: 'MASS', time: '07:30', dayOfWeek: 1 } as any, parishAdmin);
      await service.create(
        { communityId: 'c1', type: 'MASS', time: '07:30', dayOfWeek: 6, recurrence: 'MONTHLY_NTH', weeksOfMonth: [2] } as any,
        parishAdmin,
      );
      await service.create(
        { communityId: 'c1', type: 'MASS', time: '07:30', dayOfWeek: 0, isSpecial: true, specialDate: '2026-12-25T00:00:00.000Z' } as any,
        parishAdmin,
      );
      expect(prisma.massSchedule.create).toHaveBeenCalledTimes(3);
    });

    it('semanas do mês comparadas como conjunto ([3,1] = [1,3])', async () => {
      prisma.massSchedule.findMany.mockResolvedValue([
        { ...existente, recurrence: 'MONTHLY_NTH', dayOfWeek: 6, weeksOfMonth: [1, 3] },
      ]);
      await expect(
        service.create(
          { communityId: 'c1', type: 'MASS', time: '07:30', dayOfWeek: 6, recurrence: 'MONTHLY_NTH', weeksOfMonth: [3, 1] } as any,
          parishAdmin,
        ),
      ).rejects.toThrow('Já existe um horário igual');
    });

    it('editar a hora para a de outro horário igual → 409; o próprio horário não conta', async () => {
      prisma.massSchedule.findUnique.mockResolvedValue({
        ...existente,
        id: 'm1',
        communityId: 'c1',
        type: 'MASS',
        time: '09:00',
        community: { id: 'c1' },
        pastorals: [],
      });
      prisma.massSchedule.findMany.mockResolvedValue([existente]);
      await expect(service.update('m1', { time: '07:30' }, parishAdmin)).rejects.toThrow('Já existe um horário igual');
      expect(prisma.massSchedule.findMany.mock.calls[0][0].where.id).toEqual({ not: 'm1' });
      expect(prisma.massSchedule.update).not.toHaveBeenCalled();
    });

    it('editar só a observação de um par antigo duplicado continua possível', async () => {
      prisma.massSchedule.findUnique.mockResolvedValue({
        ...existente,
        id: 'm1',
        communityId: 'c1',
        type: 'MASS',
        time: '07:30',
        community: { id: 'c1' },
        pastorals: [],
      });
      prisma.massSchedule.findMany.mockResolvedValue([existente]);
      await service.update('m1', { notes: 'Com coral' } as any, parishAdmin);
      expect(prisma.massSchedule.findMany).not.toHaveBeenCalled();
      expect(prisma.massSchedule.update).toHaveBeenCalled();
    });

    // O painel manda o formulário inteiro no PATCH (FixedSchedulePage.handleSubmit)
    const formularioDoPainel = (extra: Record<string, unknown> = {}) => ({
      communityId: 'c1',
      type: 'MASS',
      recurrence: 'WEEKLY',
      dayOfWeek: 0,
      weeksOfMonth: [],
      dayOfMonth: undefined,
      time: '07:30',
      notes: 'Com coral',
      isSpecial: false,
      specialDate: undefined,
      pastoralSettings: [],
      ...extra,
    });

    it('R3#56: formulário inteiro do painel só com observação/pastorais nova num par legado → passa', async () => {
      prisma.massSchedule.findUnique.mockResolvedValue({
        ...existente,
        id: 'm1',
        communityId: 'c1',
        type: 'MASS',
        time: '7:30', // carga antiga, sem o zero
        community: { id: 'c1' },
        pastorals: [],
      });
      prisma.massSchedule.findMany.mockResolvedValue([existente]);
      prisma.communityPastoral = { findMany: jest.fn().mockResolvedValue([]) };
      await service.update('m1', formularioDoPainel() as any, parishAdmin);
      expect(prisma.massSchedule.findMany).not.toHaveBeenCalled();
      expect(prisma.massSchedule.update).toHaveBeenCalled();
    });

    it('R3#56: formulário inteiro que muda o dia para o de um gêmeo → 409', async () => {
      prisma.massSchedule.findUnique.mockResolvedValue({
        ...existente,
        id: 'm1',
        communityId: 'c1',
        type: 'MASS',
        time: '07:30',
        dayOfWeek: 3,
        community: { id: 'c1' },
        pastorals: [],
      });
      prisma.massSchedule.findMany.mockResolvedValue([existente]);
      await expect(service.update('m1', formularioDoPainel() as any, parishAdmin)).rejects.toThrow('Já existe um horário igual');
      expect(prisma.massSchedule.update).not.toHaveBeenCalled();
    });

    it('R3#56: mensal de data fixa reenviado com o mesmo dia do mês não confere duplicidade', async () => {
      prisma.massSchedule.findUnique.mockResolvedValue({
        ...existente,
        id: 'm1',
        communityId: 'c1',
        type: 'MASS',
        time: '19:00',
        recurrence: 'MONTHLY_DAY',
        dayOfWeek: null,
        dayOfMonth: 13,
        community: { id: 'c1' },
        pastorals: [],
      });
      await service.update(
        'm1',
        formularioDoPainel({ recurrence: 'MONTHLY_DAY', dayOfWeek: undefined, dayOfMonth: 13, time: '19:00' }) as any,
        parishAdmin,
      );
      expect(prisma.massSchedule.findMany).not.toHaveBeenCalled();
    });
  });

  describe('R3#49: hora legada "H:MM" no DTO', () => {
    it('"7:30" vira "07:30" antes do @Matches (criar e editar)', async () => {
      const dto = plainToInstance(CreateMassScheduleDto, { time: '7:30', type: 'MASS', communityId: 'c1', dayOfWeek: 0 });
      expect(await validate(dto)).toHaveLength(0);
      expect(dto.time).toBe('07:30');
      const patch = plainToInstance(UpdateMassScheduleDto, { time: '7:30', notes: 'x' });
      expect(await validate(patch)).toHaveLength(0);
      expect(patch.time).toBe('07:30');
      const ruim = plainToInstance(UpdateMassScheduleDto, { time: '7:3' });
      expect((await validate(ruim)).map((e) => e.property)).toContain('time');
    });
  });

  describe('R3#53: "hoje" no fuso da UF da comunidade', () => {
    it('generate-pending não conta como falha o "ontem" do Acre em comunidade de SP (00–02h de Brasília)', async () => {
      // 06/10 01:00 em Brasília = 05/10 23:00 no Acre
      jest.spyOn(service as any, 'earliestToday').mockReturnValue('2026-10-05');
      jest.spyOn(service as any, 'todayIn').mockImplementation((uf: any) => (uf === 'AC' ? '2026-10-05' : '2026-10-06'));
      const occ = (communityId: string, date: string) => ({
        id: `mass-conf-${communityId}-${date}`,
        massScheduleId: `conf-${communityId}`,
        title: 'Missa',
        type: MassScheduleType.MASS,
        notes: null,
        start: `${date}T19:00:00`,
        end: `${date}T20:00:00`,
        community: { id: communityId, name: communityId },
        isFixed: true,
        cancelled: false,
        cancelReason: null,
      });
      jest.spyOn(service, 'expandOccurrences').mockResolvedValue([occ('sp', '2026-10-05'), occ('sp', '2026-10-06'), occ('ac', '2026-10-05')] as any);
      prisma.community = {
        findMany: jest.fn().mockResolvedValue([
          { id: 'sp', state: 'SP' },
          { id: 'ac', state: 'AC' },
        ]),
      };
      prisma.massSchedule.findMany.mockResolvedValue(
        ['conf-sp', 'conf-ac'].map((id) => ({ id, pastorals: [{ communityPastoralId: 'cp1', requiredPeople: 1, communityPastoral: null }] })),
      );
      const gerar = jest.spyOn(service, 'generateSchedule').mockResolvedValue({ id: 'sch', title: 'x' } as any);
      const res = await service.generatePendingSchedules({ from: '2026-10-05', to: '2026-10-06' }, parishAdmin);
      expect(gerar.mock.calls.map((c) => [c[0], c[1]])).toEqual([
        ['conf-sp', { date: '2026-10-06' }],
        ['conf-ac', { date: '2026-10-05' }],
      ]);
      expect(res).toMatchObject({ created: 2, failed: 0 });
    });

    it('suspender hoje às 22h no Acre (já amanhã em SP) é aceito', async () => {
      jest.spyOn(service as any, 'todaySaoPaulo').mockReturnValue('2026-10-02');
      const hoje = jest.spyOn(service as any, 'todayIn').mockImplementation((uf: any) => (uf === 'AC' ? '2026-10-01' : '2026-10-02'));
      prisma.massSchedule.findUnique.mockResolvedValue({
        id: 'conf',
        communityId: 'c1',
        dayOfWeek: 4, // quinta 01/10
        time: '23:00',
        type: MassScheduleType.CONFESSION,
        notes: null,
        isSpecial: false,
        specialDate: null,
        recurrence: 'WEEKLY',
        weeksOfMonth: [],
        dayOfMonth: null,
        community: { id: 'c1', name: 'Rio Branco', state: 'AC' },
      });
      prisma.massScheduleCancellation.upsert.mockImplementation(({ create }: any) =>
        Promise.resolve({ id: 'cx', date: create.date, reason: null, createdAt: new Date(), createdBy: null }),
      );
      await expect(service.cancelOccurrences('conf', { dates: ['2026-10-01'] }, parishAdmin)).resolves.toHaveLength(1);
      expect(hoje).toHaveBeenCalledWith('AC');
      // a busca do horário traz a UF
      expect(prisma.massSchedule.findUnique.mock.calls[0][0].include.community.select.state).toBe(true);
    });
  });
});
