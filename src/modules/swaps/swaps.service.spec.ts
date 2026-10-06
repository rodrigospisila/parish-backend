import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { SwapsService } from './swaps.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../common/audit.service';
import { HierarchyService } from '../../common/hierarchy.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ScheduleConflictsService } from '../../common/schedule-conflicts.service';

describe('SwapsService (4.6)', () => {
  let service: SwapsService;
  let prisma: any;
  let hierarchy: { hasAccessToSchedule: jest.Mock };

  const user = { id: 'u1', role: UserRole.VOLUNTEER } as any;

  beforeEach(async () => {
    prisma = {
      member: { findFirst: jest.fn(), findUnique: jest.fn() },
      scheduleAssignment: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      assignmentSwapRequest: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      pastoralMember: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn(async (cb: any) => cb({ scheduleAssignment: { update: jest.fn() }, assignmentSwapRequest: { update: jest.fn().mockResolvedValue({ id: 'sw1', status: 'ACCEPTED' }) } })),
    };
    hierarchy = { hasAccessToSchedule: jest.fn().mockResolvedValue(true) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SwapsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: HierarchyService, useValue: hierarchy },
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

  // ===== Onda 2: recusa/cancelamento só de pedido PENDENTE e por quem pode =====
  describe('reject / cancel', () => {
    const swap = (over: any = {}) => ({
      id: 'sw1',
      status: 'PENDING',
      targetId: null,
      requesterId: 'm-req',
      assignmentId: 'a1',
      assignment: { scheduleId: 's1', communityPastoralId: 'cp-musica' },
      ...over,
    });

    it('troca ABERTA: fiel/voluntário NÃO recusa (antes, sumia para todos) → 403', async () => {
      prisma.member.findFirst.mockResolvedValue({ id: 'm-colega' });
      prisma.assignmentSwapRequest.findUnique.mockResolvedValue(swap());

      await expect(service.reject('sw1', user)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.assignmentSwapRequest.updateMany).not.toHaveBeenCalled();
    });

    it('troca direcionada: só o convidado recusa; outro membro → 403', async () => {
      prisma.member.findFirst.mockResolvedValue({ id: 'm-intruso' });
      prisma.assignmentSwapRequest.findUnique.mockResolvedValue(swap({ targetId: 'm-convidado' }));

      await expect(service.reject('sw1', user)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.assignmentSwapRequest.updateMany).not.toHaveBeenCalled();
    });

    it('o convidado recusa um pedido pendente (compare-and-set em PENDING)', async () => {
      prisma.member.findFirst.mockResolvedValue({ id: 'm-convidado' });
      prisma.assignmentSwapRequest.findUnique.mockResolvedValue(swap({ targetId: 'm-convidado' }));

      await service.reject('sw1', user);

      expect(prisma.assignmentSwapRequest.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'sw1', status: 'PENDING' }, data: expect.objectContaining({ status: 'REJECTED' }) }),
      );
      expect(hierarchy.hasAccessToSchedule).not.toHaveBeenCalled();
    });

    it('pedido já resolvido (aceito) não volta a ser recusado → 400', async () => {
      prisma.member.findFirst.mockResolvedValue({ id: 'm-convidado' });
      prisma.assignmentSwapRequest.findUnique.mockResolvedValue(swap({ targetId: 'm-convidado', status: 'ACCEPTED' }));

      await expect(service.reject('sw1', user)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.assignmentSwapRequest.updateMany).not.toHaveBeenCalled();
    });

    it('corrida com um aceite (CAS não casa) → 400', async () => {
      prisma.member.findFirst.mockResolvedValue({ id: 'm-convidado' });
      prisma.assignmentSwapRequest.findUnique.mockResolvedValue(swap({ targetId: 'm-convidado' }));
      prisma.assignmentSwapRequest.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.reject('sw1', user)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('coordenação com escopo encerra troca aberta', async () => {
      prisma.member.findFirst.mockResolvedValue(null);
      prisma.assignmentSwapRequest.findUnique.mockResolvedValue(swap());
      const coord = { id: 'u-coord', role: UserRole.COMMUNITY_COORDINATOR, communityId: 'c1' } as any;

      await service.reject('sw1', coord);

      expect(hierarchy.hasAccessToSchedule).toHaveBeenCalledWith('u-coord', 's1');
      expect(prisma.assignmentSwapRequest.updateMany).toHaveBeenCalled();
    });

    it('coordenação SEM escopo sobre a escala (outra paróquia) → 403', async () => {
      prisma.member.findFirst.mockResolvedValue(null);
      prisma.assignmentSwapRequest.findUnique.mockResolvedValue(swap());
      hierarchy.hasAccessToSchedule.mockResolvedValue(false);
      const coord = { id: 'u-coord', role: UserRole.PARISH_ADMIN, parishId: 'p-outra' } as any;

      await expect(service.reject('sw1', coord)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('coordenador de pastoral que só PARTICIPA da pastoral da atribuição → 403', async () => {
      prisma.member.findFirst.mockResolvedValue({ id: 'm-pc' });
      prisma.assignmentSwapRequest.findUnique.mockResolvedValue(swap());
      const pc = {
        id: 'u-pc',
        role: UserRole.PASTORAL_COORDINATOR,
        pastoralIds: ['cp-musica'],
        coordinatedPastoralIds: ['cp-liturgia'],
      } as any;

      await expect(service.reject('sw1', pc)).rejects.toBeInstanceOf(ForbiddenException);
      expect(hierarchy.hasAccessToSchedule).not.toHaveBeenCalled();
    });

    it('cancel: pedido já resolvido não é cancelado → 400', async () => {
      prisma.member.findFirst.mockResolvedValue({ id: 'm-req' });
      prisma.assignmentSwapRequest.findUnique.mockResolvedValue(swap({ status: 'REJECTED' }));

      await expect(service.cancel('sw1', user)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.assignmentSwapRequest.updateMany).not.toHaveBeenCalled();
    });

    it('cancel: só o solicitante → 403 para os demais', async () => {
      prisma.member.findFirst.mockResolvedValue({ id: 'm-outro' });
      prisma.assignmentSwapRequest.findUnique.mockResolvedValue(swap());

      await expect(service.cancel('sw1', user)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('cancel: o solicitante cancela o pedido pendente', async () => {
      prisma.member.findFirst.mockResolvedValue({ id: 'm-req' });
      prisma.assignmentSwapRequest.findUnique.mockResolvedValue(swap());

      await service.cancel('sw1', user);

      expect(prisma.assignmentSwapRequest.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'sw1', status: 'PENDING' }, data: expect.objectContaining({ status: 'CANCELLED' }) }),
      );
    });
  });

  // ===== GET /swaps/candidates (convite do painel sem depender de GET /members) =====
  describe('listCandidates', () => {
    const assignment = (over: any = {}) => ({
      id: 'a1',
      memberId: 'm-dono',
      scheduleId: 's1',
      communityPastoralId: 'cp-musica',
      pastoralGroupId: null,
      schedule: { communityId: null, deletedAt: null, event: { communityId: 'c1' } },
      ...over,
    });

    it('dono da atribuição: colegas ativos da mesma pastoral na comunidade da escala, só nome', async () => {
      prisma.scheduleAssignment.findUnique.mockResolvedValue(assignment());
      prisma.member.findFirst.mockResolvedValue({ id: 'm-dono' });
      prisma.pastoralMember.findMany.mockResolvedValue([
        { member: { id: 'm-ana', fullName: 'Ana' } },
        { member: { id: 'm-ana', fullName: 'Ana' } },
        { member: { id: 'm-bia', fullName: 'Bia' } },
      ]);

      const result = await service.listCandidates('a1', user);

      expect(result).toEqual([
        { memberId: 'm-ana', fullName: 'Ana' },
        { memberId: 'm-bia', fullName: 'Bia' },
      ]);
      const query = prisma.pastoralMember.findMany.mock.calls[0][0];
      expect(query.where.communityPastoralId).toBe('cp-musica');
      expect(query.where.member.id).toEqual({ not: 'm-dono' });
      expect(query.where.member.OR).toEqual([
        { communityId: 'c1' },
        { communityLinks: { some: { communityId: 'c1', isActive: true } } },
      ]);
      expect(query.select).toEqual({ member: { select: { id: true, fullName: true } } });
    });

    it('pastoral por grupos: os colegas do mesmo grupo', async () => {
      prisma.scheduleAssignment.findUnique.mockResolvedValue(assignment({ pastoralGroupId: 'g1' }));
      prisma.member.findFirst.mockResolvedValue({ id: 'm-dono' });

      await service.listCandidates('a1', user);

      const where = prisma.pastoralMember.findMany.mock.calls[0][0].where;
      expect(where.pastoralGroupId).toBe('g1');
      expect(where.communityPastoralId).toBeUndefined();
    });

    it('terceiro (fiel que não é o dono) → 403, sem consultar membros', async () => {
      prisma.scheduleAssignment.findUnique.mockResolvedValue(assignment());
      prisma.member.findFirst.mockResolvedValue({ id: 'm-curioso' });

      await expect(service.listCandidates('a1', user)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.pastoralMember.findMany).not.toHaveBeenCalled();
    });

    it('coordenação com escopo consulta pelo membro', async () => {
      prisma.scheduleAssignment.findUnique.mockResolvedValue(assignment());
      prisma.member.findFirst.mockResolvedValue(null);
      const coord = { id: 'u-coord', role: UserRole.COMMUNITY_COORDINATOR, communityId: 'c1' } as any;

      await service.listCandidates('a1', coord);

      expect(hierarchy.hasAccessToSchedule).toHaveBeenCalledWith('u-coord', 's1');
      expect(prisma.pastoralMember.findMany).toHaveBeenCalled();
    });

    it('atribuição sem pastoral nem grupo: lista vazia (negar por padrão)', async () => {
      prisma.scheduleAssignment.findUnique.mockResolvedValue(assignment({ communityPastoralId: null }));
      prisma.member.findFirst.mockResolvedValue({ id: 'm-dono' });

      await expect(service.listCandidates('a1', user)).resolves.toEqual([]);
      expect(prisma.pastoralMember.findMany).not.toHaveBeenCalled();
    });
  });
});
