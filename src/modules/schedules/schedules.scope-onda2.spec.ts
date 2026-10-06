import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService } from '../../common/hierarchy.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PdfService } from '../pdf/pdf.service';
import { AuditService } from '../../common/audit.service';
import { ScheduleConflictsService } from '../../common/schedule-conflicts.service';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';

/**
 * Onda 2 da auditoria (escalas):
 * - GET /schedules/events/:eventId/eligible-members sem @Roles e só com
 *   hasAccessToEvent: o fiel recebia e-mails/telefones da comunidade;
 * - createAssignment/replace aceitavam memberId de qualquer paróquia;
 * - GET /schedules/:id e /assignments/:id: contatos/cadastro inteiro para
 *   quem não coordena; escopo de pastoral por participação (pastoralIds).
 */
describe('SchedulesService — onda 2 (elegíveis, membro escalado, contatos)', () => {
  let service: SchedulesService;
  let prisma: any;
  let hierarchy: any;
  let conflicts: { findConflicts: jest.Mock; summarize: jest.Mock };

  const realHierarchy = new HierarchyService({} as any);
  const faithful = { id: 'u-fiel', role: UserRole.FAITHFUL, communityId: 'c1' } as any;
  const coordinator = { id: 'u-coord', role: UserRole.COMMUNITY_COORDINATOR, communityId: 'c1' } as any;
  /** Coordenador "de papel" que só PARTICIPA do coral (não coordena nada) */
  const pcParticipant = {
    id: 'u-pc',
    role: UserRole.PASTORAL_COORDINATOR,
    communityId: 'c1',
    pastoralIds: ['cp-coral'],
    coordinatedPastoralIds: [],
  } as any;
  const pcCoordinator = {
    id: 'u-pc',
    role: UserRole.PASTORAL_COORDINATOR,
    communityId: 'c1',
    pastoralIds: ['cp-coral', 'cp-liturgia'],
    coordinatedPastoralIds: ['cp-liturgia'],
  } as any;

  const futureDate = () => new Date(Date.now() + 7 * 86_400_000);

  beforeEach(async () => {
    prisma = {
      event: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'e1',
          title: 'Missa',
          communityId: 'c1',
          community: { id: 'c1', name: 'Matriz' },
          eventPastorals: [],
        }),
      },
      member: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue({ id: 'm-alvo', status: 'ACTIVE', userId: null }),
      },
      schedule: {
        findFirst: jest.fn().mockResolvedValue({
          id: 's1',
          status: 'OPEN',
          date: futureDate(),
          pastorals: [],
          assignments: [],
          event: null,
        }),
        findUnique: jest.fn().mockResolvedValue({ communityId: null, event: { communityId: 'c1' } }),
      },
      scheduleAssignment: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue({ id: 'a1', scheduleId: 's1', memberId: 'm-fiel' }),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({
          id: 'a-nova',
          memberId: 'm-alvo',
          scheduleId: 's1',
          schedule: { title: 'Missa', date: futureDate(), startTime: null },
        }),
      },
      pastoralMember: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      communityPastoral: { findUnique: jest.fn().mockResolvedValue({ scheduleByGroup: false }) },
    };
    hierarchy = {
      hasAccessToEvent: jest.fn().mockResolvedValue(true),
      canManageEvent: jest.fn().mockResolvedValue(true),
      hasAccessToSchedule: jest.fn().mockResolvedValue(true),
      hasAccessToAssignment: jest.fn().mockResolvedValue(true),
      getUserPastoralIds: jest.fn().mockResolvedValue(['cp-db']),
      applyScheduleFilter: (user: any) => realHierarchy.applyScheduleFilter(user),
    };
    conflicts = { findConflicts: jest.fn().mockResolvedValue([]), summarize: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulesService,
        { provide: PrismaService, useValue: prisma },
        { provide: HierarchyService, useValue: hierarchy },
        { provide: NotificationsService, useValue: { notifyUser: jest.fn(), notifyUsers: jest.fn() } },
        { provide: PdfService, useValue: {} },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: ScheduleConflictsService, useValue: conflicts },
      ],
    }).compile();
    service = module.get(SchedulesService);
  });

  // ===== Item 1: membros elegíveis =====
  describe('findEligibleMembers (GET /schedules/events/:eventId/eligible-members)', () => {
    it('FIEL → 403 sem consultar o evento (antes: 34 e-mails da comunidade)', async () => {
      await expect(service.findEligibleMembers('e1', faithful)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.event.findUnique).not.toHaveBeenCalled();
      expect(prisma.member.findMany).not.toHaveBeenCalled();
    });

    it('sem usuário → 403', async () => {
      await expect(service.findEligibleMembers('e1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('coordenador de pastoral que só PARTICIPA (não coordena) → 403', async () => {
      await expect(service.findEligibleMembers('e1', pcParticipant)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.event.findUnique).not.toHaveBeenCalled();
    });

    it('coordenação SEM gestão sobre o evento (só "vê") → 403', async () => {
      hierarchy.canManageEvent.mockResolvedValue(false);

      await expect(service.findEligibleMembers('e1', coordinator)).rejects.toBeInstanceOf(ForbiddenException);
      expect(hierarchy.canManageEvent).toHaveBeenCalledWith('u-coord', 'e1');
      expect(prisma.event.findUnique).not.toHaveBeenCalled();
    });

    it('coordenação com gestão: membros ativos da comunidade (não excluídos)', async () => {
      prisma.member.findMany.mockResolvedValue([{ id: 'm1', fullName: 'Ana', email: 'a@x', phone: '1' }]);

      const result: any = await service.findEligibleMembers('e1', coordinator);

      expect(result.members).toHaveLength(1);
      expect(prisma.member.findMany.mock.calls[0][0].where).toEqual({
        communityId: 'c1',
        status: 'ACTIVE',
        deletedAt: null,
      });
    });

    it('coordenador de pastoral: só as pastorais que COORDENA', async () => {
      await service.findEligibleMembers('e1', pcCoordinator);

      expect(prisma.event.findUnique.mock.calls[0][0].include.eventPastorals.where).toEqual({
        communityPastoralId: { in: ['cp-liturgia'] },
      });
      // Sem pastoral dele no evento: nada da comunidade inteira
      expect(prisma.member.findMany).not.toHaveBeenCalled();
    });
  });

  // ===== Item 6: membro de outra paróquia =====
  describe('createAssignment / replaceAssignment — membro da comunidade da escala', () => {
    const dto = { scheduleId: 's1', memberId: 'm-alvo', role: 'Leitor' } as any;

    it('escala sem pastoral: membro de outra paróquia → 403 (antes: aceito, com e-mail/telefone na resposta)', async () => {
      prisma.member.findFirst.mockResolvedValue(null);

      await expect(service.createAssignment(dto, coordinator, { skipNotify: true })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.member.findFirst.mock.calls[0][0].where).toEqual({
        id: 'm-alvo',
        deletedAt: null,
        OR: [{ communityId: 'c1' }, { communityLinks: { some: { communityId: 'c1', isActive: true } } }],
      });
      expect(prisma.scheduleAssignment.create).not.toHaveBeenCalled();
    });

    it('escala sem pastoral: membro da comunidade (ou vínculo ativo) é escalado', async () => {
      prisma.member.findFirst.mockResolvedValue({ id: 'm-alvo' });

      await service.createAssignment(dto, coordinator, { skipNotify: true });

      expect(prisma.scheduleAssignment.create).toHaveBeenCalled();
    });

    it('coordenador de pastoral sem pastoral coordenada → 403 (lista vazia não é "todas")', async () => {
      await expect(service.createAssignment(dto, pcParticipant, { skipNotify: true })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.schedule.findFirst).not.toHaveBeenCalled();
    });

    it('replace: substituto de outra paróquia em escala sem pastoral → 403', async () => {
      prisma.scheduleAssignment.findUnique.mockResolvedValue({
        id: 'a1',
        scheduleId: 's1',
        memberId: 'm-antigo',
        role: 'Leitor',
        checkedIn: false,
        communityPastoralId: null,
      });
      prisma.schedule.findUnique
        .mockResolvedValueOnce({ id: 's1', status: 'OPEN', date: futureDate(), pastorals: [] })
        .mockResolvedValueOnce({ communityId: null, event: { communityId: 'c1' } });
      prisma.member.findFirst.mockResolvedValue(null);

      await expect(service.replaceAssignment('a1', 'm-alheio', coordinator)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('createSchedule: coordenador de pastoral sem pastoral coordenada → 403', async () => {
      await expect(
        service.createSchedule({ eventId: 'e1', date: futureDate().toISOString(), title: 'x' } as any, pcParticipant),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  // ===== Item 6: contatos em GET /schedules/:id =====
  describe('findOneSchedule — contatos só para coordenação de fato', () => {
    const include = () => prisma.schedule.findFirst.mock.calls[0][0].include;

    it('coordenador de pastoral que não coordena nada: só nome (antes: e-mail/telefone/cônjuge)', async () => {
      await service.findOneSchedule('s1', pcParticipant);

      expect(include().assignments.include.member.select).toEqual({ id: true, fullName: true });
      expect(include().assignments.include.swapRequests.where).toEqual({ id: '__none__' });
    });

    it('coordenador da pastoral: contatos, recortados às pastorais que coordena', async () => {
      await service.findOneSchedule('s1', pcCoordinator);

      expect(include().assignments.include.member.select).toMatchObject({ email: true, phone: true });
      expect(JSON.stringify(include().assignments.where)).toContain('cp-liturgia');
      expect(JSON.stringify(include().assignments.where)).not.toContain('cp-coral');
    });

    it('sem usuário: sem contatos (negar por padrão)', async () => {
      await service.findOneSchedule('s1');

      expect(include().assignments.include.member.select).toEqual({ id: true, fullName: true });
    });
  });

  // ===== Item 6: GET /schedules/assignments/:id =====
  describe('findOneAssignment — select mínimo', () => {
    const query = () => prisma.scheduleAssignment.findUnique.mock.calls[0][0];

    it('fiel (a própria atribuição): membro só com nome; nada de cadastro inteiro', async () => {
      await service.findOneAssignment('a1', faithful);

      expect(query().include.member).toEqual({ select: { id: true, fullName: true } });
      expect(query().include.schedule.include).toBeUndefined();
      expect(query().include.schedule.select.event).toEqual({
        select: { id: true, title: true, type: true, startDate: true, communityId: true },
      });
    });

    it('coordenação: e-mail/telefone, ainda sem o cadastro inteiro', async () => {
      await service.findOneAssignment('a1', coordinator);

      expect(query().include.member).toEqual({
        select: { id: true, fullName: true, email: true, phone: true },
      });
    });

    it('sem acesso à atribuição → 403', async () => {
      hierarchy.hasAccessToAssignment.mockResolvedValue(false);

      await expect(service.findOneAssignment('a1', faithful)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.scheduleAssignment.findUnique).not.toHaveBeenCalled();
    });
  });

  // ===== Extra A: equipe escalada de quem serve fora da comunidade principal =====
  describe('findAllAssignments (fiel) — equipe da escala em que ele serve', () => {
    it('escalado numa capela secundária (sem escopo hierárquico): vê a equipe, só nome/função', async () => {
      hierarchy.hasAccessToSchedule.mockResolvedValue(false);
      prisma.member.findFirst.mockResolvedValue({ id: 'm-fiel' });
      prisma.scheduleAssignment.findFirst.mockResolvedValue({ id: 'a-minha' });

      await service.findAllAssignments('s-capela', undefined, faithful);

      expect(prisma.scheduleAssignment.findFirst).toHaveBeenCalledWith({
        where: { scheduleId: 's-capela', memberId: 'm-fiel' },
        select: { id: true },
      });
      const query = prisma.scheduleAssignment.findMany.mock.calls[0][0];
      expect(query.where).toEqual({ scheduleId: 's-capela' });
      expect(query.include.member.select).toEqual({ id: true, fullName: true });
    });

    it('não escalado e sem acesso à escala → 403', async () => {
      hierarchy.hasAccessToSchedule.mockResolvedValue(false);
      prisma.member.findFirst.mockResolvedValue({ id: 'm-fiel' });
      prisma.scheduleAssignment.findFirst.mockResolvedValue(null);

      await expect(service.findAllAssignments('s-outra', undefined, faithful)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.scheduleAssignment.findMany).not.toHaveBeenCalled();
    });
  });
});

describe('SchedulesController — onda 2', () => {
  it('eligible-members exige coordenação (@Roles PASTORAL_COORDINATOR+)', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, SchedulesController.prototype.findEligibleMembers);

    expect(roles).toContain(UserRole.PASTORAL_COORDINATOR);
    expect(roles).not.toContain(UserRole.FAITHFUL);
    expect(roles).not.toContain(UserRole.VOLUNTEER);
  });
});
