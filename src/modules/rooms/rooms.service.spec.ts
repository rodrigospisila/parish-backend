import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
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
      roomReservation: { findFirst: jest.fn(), create: jest.fn() },
      community: { findUnique: jest.fn().mockResolvedValue({ parishId: 'p1' }) },
      communityPastoral: { findFirst: jest.fn() },
      event: { findFirst: jest.fn() },
      pastoralMember: { findMany: jest.fn().mockResolvedValue([]) },
      pastoralCoordinator: { findMany: jest.fn().mockResolvedValue([]) },
    };
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
    ).rejects.toBeInstanceOf(BadRequestException);
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
});
