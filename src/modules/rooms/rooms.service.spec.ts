import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RoomsService } from './rooms.service';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';

describe('RoomsService (4.2)', () => {
  let service: RoomsService;
  let prisma: any;

  const coord = { id: 'u1', role: UserRole.COMMUNITY_COORDINATOR, communityId: 'c1' } as any;

  beforeEach(async () => {
    prisma = {
      room: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      roomReservation: { findFirst: jest.fn(), create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      $queryRaw: jest.fn().mockResolvedValue([]),
      community: { findUnique: jest.fn().mockResolvedValue({ parishId: 'p1' }) },
      communityPastoral: { findFirst: jest.fn() },
      event: { findFirst: jest.fn() },
      pastoralMember: { findMany: jest.fn().mockResolvedValue([]) },
      pastoralCoordinator: { findMany: jest.fn().mockResolvedValue([]) },
    };
    // Transação da reserva: o próprio mock faz o papel do cliente da transação
    prisma.$transaction = jest.fn(async (cb: any) => cb(prisma));
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsService,
        { provide: PrismaService, useValue: prisma },
        { provide: HierarchyService, useValue: { isCommunityInScope: jest.fn().mockResolvedValue(true) } },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();
    service = module.get<RoomsService>(RoomsService);
  });

  it('bloqueia reserva com conflito de horário no mesmo espaço', async () => {
    prisma.room.findFirst.mockResolvedValue({ id: 'r1', communityId: 'c1' });
    prisma.roomReservation.findFirst.mockResolvedValue({ id: 'existente' }); // há sobreposição

    await expect(
      service.reserve(
        { roomId: 'r1', title: 'Reunião', startTime: '2026-08-01T10:00:00', endTime: '2026-08-01T12:00:00' },
        coord,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.roomReservation.create).not.toHaveBeenCalled();
  });

  it('cria reserva quando não há conflito (coordenador aprova direto)', async () => {
    prisma.room.findFirst.mockResolvedValue({ id: 'r1', communityId: 'c1' });
    prisma.roomReservation.findFirst.mockResolvedValue(null);
    prisma.roomReservation.create.mockImplementation(({ data }: any) => ({ id: 'res1', ...data }));

    const res: any = await service.reserve(
      { roomId: 'r1', title: 'Reunião', startTime: '2026-08-01T10:00:00', endTime: '2026-08-01T12:00:00' },
      coord,
    );
    expect(res.status).toBe('APPROVED');
  });

  it('rejeita período inválido (fim <= início)', async () => {
    prisma.room.findFirst.mockResolvedValue({ id: 'r1', communityId: 'c1' });
    await expect(
      service.reserve(
        { roomId: 'r1', title: 'X', startTime: '2026-08-01T12:00:00', endTime: '2026-08-01T10:00:00' },
        coord,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  describe('GET /rooms — escopo (negar por padrão)', () => {
    it('diocesano sem diocese e sem comunidade: vazio, sem consulta (antes: salas do país)', async () => {
      await expect(service.listRooms({ id: 'd', role: UserRole.DIOCESAN_ADMIN } as any)).resolves.toEqual([]);
      expect(prisma.room.findMany).not.toHaveBeenCalled();
    });

    it('coordenador de pastoral sem comunidade: vazio', async () => {
      await expect(
        service.listRooms({ id: 'p', role: UserRole.PASTORAL_COORDINATOR, parishId: 'p1' } as any),
      ).resolves.toEqual([]);
      expect(prisma.room.findMany).not.toHaveBeenCalled();
    });

    it('diocesano vê a diocese; PARISH_ADMIN a paróquia; coordenador a comunidade', async () => {
      await service.listRooms({ id: 'd', role: UserRole.DIOCESAN_ADMIN, dioceseId: 'd1' } as any);
      expect(prisma.room.findMany.mock.calls[0][0].where).toEqual({
        deletedAt: null,
        community: { parish: { dioceseId: 'd1' } },
      });
      await service.listRooms({ id: 'a', role: UserRole.PARISH_ADMIN, parishId: 'p1' } as any);
      expect(prisma.room.findMany.mock.calls[1][0].where).toEqual({ deletedAt: null, community: { parishId: 'p1' } });
      await service.listRooms(coord);
      expect(prisma.room.findMany.mock.calls[2][0].where).toEqual({ deletedAt: null, community: { id: 'c1' } });
    });

    it('SYSTEM_ADMIN sem filtro de comunidade', async () => {
      await service.listRooms({ id: 's', role: UserRole.SYSTEM_ADMIN } as any);
      expect(prisma.room.findMany.mock.calls[0][0].where).toEqual({ deletedAt: null });
    });
  });

  describe('reserva — pastoral/evento do body', () => {
    const base = { roomId: 'r1', title: 'Reunião', startTime: '2026-08-01T10:00:00', endTime: '2026-08-01T12:00:00' };

    beforeEach(() => {
      prisma.room.findFirst.mockResolvedValue({ id: 'r1', communityId: 'c1' });
      prisma.roomReservation.findFirst.mockResolvedValue(null);
      prisma.roomReservation.create.mockImplementation(({ data }: any) => ({ id: 'res1', ...data }));
    });

    it('pastoral de outra paróquia: 403, nada gravado', async () => {
      prisma.communityPastoral.findFirst.mockResolvedValue({ id: 'cp-x', community: { parishId: 'p2' } });
      await expect(service.reserve({ ...base, communityPastoralId: 'cp-x' }, coord)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.roomReservation.create).not.toHaveBeenCalled();
    });

    it('evento de outra paróquia (ou inexistente): 403', async () => {
      prisma.event.findFirst.mockResolvedValue({ id: 'ev-x', community: { parishId: 'p2' } });
      await expect(service.reserve({ ...base, eventId: 'ev-x' }, coord)).rejects.toBeInstanceOf(ForbiddenException);
      prisma.event.findFirst.mockResolvedValue(null);
      await expect(service.reserve({ ...base, eventId: 'ev-?' }, coord)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.roomReservation.create).not.toHaveBeenCalled();
    });

    it('coordenador de pastoral só reserva em nome da pastoral que coordena', async () => {
      const pastoralCoord = {
        id: 'u5',
        role: UserRole.PASTORAL_COORDINATOR,
        communityId: 'c1',
        coordinatedPastoralIds: ['cp-lit'],
      } as any;
      prisma.communityPastoral.findFirst.mockResolvedValue({ id: 'cp-cat', community: { parishId: 'p1' } });
      await expect(
        service.reserve({ ...base, communityPastoralId: 'cp-cat' }, pastoralCoord),
      ).rejects.toBeInstanceOf(ForbiddenException);

      prisma.communityPastoral.findFirst.mockResolvedValue({ id: 'cp-lit', community: { parishId: 'p1' } });
      const res: any = await service.reserve({ ...base, communityPastoralId: 'cp-lit' }, pastoralCoord);
      expect(res.communityPastoralId).toBe('cp-lit');
    });

    it('pastoral e evento da paróquia da sala: grava', async () => {
      prisma.communityPastoral.findFirst.mockResolvedValue({ id: 'cp-lit', community: { parishId: 'p1' } });
      prisma.event.findFirst.mockResolvedValue({ id: 'ev1', community: { parishId: 'p1' } });
      const res: any = await service.reserve({ ...base, communityPastoralId: 'cp-lit', eventId: 'ev1' }, coord);
      expect(res).toMatchObject({ communityPastoralId: 'cp-lit', eventId: 'ev1', status: 'APPROVED' });
    });
  });

  describe('B51 — dupla reserva e aprovação (onda 4)', () => {
    const base = { roomId: 'r1', title: 'Reunião', startTime: '2026-08-01T10:00:00', endTime: '2026-08-01T12:00:00' };

    beforeEach(() => {
      prisma.room.findFirst.mockResolvedValue({ id: 'r1', communityId: 'c1' });
      prisma.roomReservation.findFirst.mockResolvedValue(null);
      prisma.roomReservation.create.mockImplementation(({ data }: any) => ({ id: 'res1', ...data }));
    });

    it('trava a sala e checa o conflito DENTRO da transação, antes de gravar', async () => {
      const order: string[] = [];
      prisma.$queryRaw.mockImplementation(async () => order.push('lock'));
      prisma.roomReservation.findFirst.mockImplementation(async () => {
        order.push('conflito');
        return null;
      });
      prisma.roomReservation.create.mockImplementation(async ({ data }: any) => {
        order.push('grava');
        return { id: 'res1', ...data };
      });
      await service.reserve(base, coord);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(order).toEqual(['lock', 'conflito', 'grava']);
      // ::text — o Prisma não desserializa o void do advisory lock
      expect(prisma.$queryRaw.mock.calls[0][0].join('?')).toContain('pg_advisory_xact_lock');
      expect(prisma.$queryRaw.mock.calls[0][0].join('?')).toContain('::text');
    });

    it('coordenador de PASTORAL pede (PENDING); coordenação de comunidade aprova direto', async () => {
      const pastoralCoord = { id: 'u5', role: UserRole.PASTORAL_COORDINATOR, communityId: 'c1' } as any;
      const pending: any = await service.reserve(base, pastoralCoord);
      expect(pending.status).toBe('PENDING');
      const approved: any = await service.reserve(base, coord);
      expect(approved.status).toBe('APPROVED');
    });

    it('reabrir (PENDING) uma reserva recusada revalida o conflito: 409', async () => {
      prisma.roomReservation.findUnique.mockResolvedValue({
        id: 'res1',
        roomId: 'r1',
        status: 'REJECTED',
        startTime: new Date('2026-08-01T10:00:00Z'),
        endTime: new Date('2026-08-01T12:00:00Z'),
        room: { communityId: 'c1' },
      });
      prisma.roomReservation.findFirst.mockResolvedValue({ id: 'outra' });
      await expect(service.setReservationStatus('res1', 'PENDING' as any, coord)).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.roomReservation.update).not.toHaveBeenCalled();
    });

    it('status fora do enum: 400; coordenador de pastoral não aprova', async () => {
      await expect(service.setReservationStatus('res1', 'X' as any, coord)).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.setReservationStatus('res1', 'APPROVED' as any, { id: 'u5', role: UserRole.PASTORAL_COORDINATOR } as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('recusar não precisa de checagem de conflito', async () => {
      prisma.roomReservation.findUnique.mockResolvedValue({ id: 'res1', roomId: 'r1', room: { communityId: 'c1' } });
      await service.setReservationStatus('res1', 'REJECTED' as any, coord);
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.roomReservation.update).toHaveBeenCalledWith({ where: { id: 'res1' }, data: { status: 'REJECTED' } });
    });
  });

  describe('B64 — validações (onda 4)', () => {
    it('agenda sem ?from usa a semana de hoje (antes: Invalid Date → 500)', async () => {
      prisma.room.findFirst.mockResolvedValue({ id: 'r1', communityId: 'c1' });
      await service.weeklyAgenda('r1', undefined as any, coord);
      const where = prisma.roomReservation.findMany.mock.calls[0][0].where;
      expect(Number.isNaN(where.startTime.gte.getTime())).toBe(false);
      expect(where.startTime.lt.getTime() - where.startTime.gte.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it("agenda com ?from='abc': 400", async () => {
      prisma.room.findFirst.mockResolvedValue({ id: 'r1', communityId: 'c1' });
      await expect(service.weeklyAgenda('r1', 'abc', coord)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('sala sem nome ou com capacidade inválida: 400', async () => {
      await expect(service.createRoom({ communityId: 'c1', name: '' }, coord)).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.createRoom({ communityId: 'c1', name: 'Salão', capacity: 'abc' as any }, coord),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('reserva sem título: 400', async () => {
      prisma.room.findFirst.mockResolvedValue({ id: 'r1', communityId: 'c1' });
      await expect(
        service.reserve({ roomId: 'r1', title: '', startTime: '2026-08-01T10:00:00', endTime: '2026-08-01T12:00:00' }, coord),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
