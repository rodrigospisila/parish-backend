import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { SwapsService } from './swaps.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../common/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ScheduleConflictsService } from '../../common/schedule-conflicts.service';

describe('SwapsService (4.6)', () => {
  let service: SwapsService;
  let prisma: any;

  const user = { id: 'u1', role: UserRole.VOLUNTEER } as any;

  beforeEach(async () => {
    prisma = {
      member: { findFirst: jest.fn(), findUnique: jest.fn() },
      scheduleAssignment: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      assignmentSwapRequest: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      $transaction: jest.fn(async (cb: any) => cb({ scheduleAssignment: { update: jest.fn() }, assignmentSwapRequest: { update: jest.fn().mockResolvedValue({ id: 'sw1', status: 'ACCEPTED' }) } })),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SwapsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: NotificationsService, useValue: { notifyUser: jest.fn() } },
        {
          provide: ScheduleConflictsService,
          useValue: { findConflicts: jest.fn().mockResolvedValue([]), summarize: jest.fn().mockReturnValue('') },
        },
      ],
    }).compile();
    service = module.get<SwapsService>(SwapsService);
  });

  it('só o dono da atribuição pode pedir troca', async () => {
    prisma.member.findFirst.mockResolvedValue({ id: 'meu-member' });
    prisma.scheduleAssignment.findUnique.mockResolvedValue({
      id: 'a1',
      memberId: 'outro-member',
      schedule: { date: new Date(Date.now() + 100000), deletedAt: null },
    });

    await expect(
      service.requestSwap({ assignmentId: 'a1' }, user),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('aceitar troca com conflito (já escalado) é bloqueado', async () => {
    prisma.member.findFirst.mockResolvedValue({ id: 'target' });
    prisma.assignmentSwapRequest.findUnique.mockResolvedValue({
      id: 'sw1',
      status: 'PENDING',
      targetId: 'target',
      requesterId: 'req',
      assignmentId: 'a1',
      assignment: { scheduleId: 's1', schedule: {} },
    });
    prisma.scheduleAssignment.findFirst.mockResolvedValue({ id: 'ja-escalado' });

    await expect(service.accept('sw1', user)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('aceitar troca válida transfere a atribuição', async () => {
    prisma.member.findFirst.mockResolvedValue({ id: 'target' });
    prisma.assignmentSwapRequest.findUnique.mockResolvedValue({
      id: 'sw1',
      status: 'PENDING',
      targetId: 'target',
      requesterId: 'req',
      assignmentId: 'a1',
      assignment: { scheduleId: 's1', schedule: {} },
    });
    prisma.scheduleAssignment.findFirst.mockResolvedValue(null); // sem conflito

    const res: any = await service.accept('sw1', user);
    expect(res.status).toBe('ACCEPTED');
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
