import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
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
      room: { findFirst: jest.fn() },
      roomReservation: { findFirst: jest.fn(), create: jest.fn() },
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
});
