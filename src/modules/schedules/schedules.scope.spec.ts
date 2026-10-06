import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { SchedulesService } from './schedules.service';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService } from '../../common/hierarchy.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PdfService } from '../pdf/pdf.service';
import { AuditService } from '../../common/audit.service';
import { ScheduleConflictsService } from '../../common/schedule-conflicts.service';

/**
 * Escopo e dados pessoais nas escalas:
 * - C5: GET /schedules/assignments/all sem escopo (atribuições do país, com contatos);
 * - A8: fiel via e-mail/telefone de todos os escalados em GET /schedules e /schedules/:id;
 * - A5: conta sem comunidade caía no filtro vazio;
 * - A6: coordenação respondia por equipes de outras paróquias.
 * Os filtros vêm do HierarchyService REAL; só o Prisma e as checagens
 * assíncronas de acesso são simulados.
 */
describe('SchedulesService — escopo e contatos (C5, A5, A6, A8)', () => {
  let service: SchedulesService;
  let prisma: any;
  let hierarchy: {
    hasAccessToSchedule: jest.Mock;
    getUserPastoralIds: jest.Mock;
    applyScheduleFilter: (user: any) => any;
  };

  const realHierarchy = new HierarchyService({} as any);

  const faithful = { id: 'u-fiel', role: UserRole.FAITHFUL, communityId: 'c1' } as any;
  const coordinator = { id: 'u-coord', role: UserRole.COMMUNITY_COORDINATOR, communityId: 'c1' } as any;

  beforeEach(async () => {
    prisma = {
      member: { findFirst: jest.fn().mockResolvedValue(null), findUnique: jest.fn() },
      scheduleAssignment: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 3 }),
      },
      schedule: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue({ id: 's1', event: null, pastorals: [], assignments: [] }),
      },
      pastoralGroup: { findFirst: jest.fn().mockResolvedValue({ id: 'g1', communityPastoralId: 'cp-musica' }) },
      schedulePastoral: { findFirst: jest.fn().mockResolvedValue({ id: 'sp1' }) },
      pastoralMember: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]) },
    };
    hierarchy = {
      hasAccessToSchedule: jest.fn().mockResolvedValue(true),
      getUserPastoralIds: jest.fn().mockResolvedValue([]),
      applyScheduleFilter: (user: any) => realHierarchy.applyScheduleFilter(user),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulesService,
        { provide: PrismaService, useValue: prisma },
        { provide: HierarchyService, useValue: hierarchy },
        { provide: NotificationsService, useValue: { notifyUser: jest.fn(), notifyUsers: jest.fn() } },
        { provide: PdfService, useValue: {} },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: ScheduleConflictsService, useValue: { findConflicts: jest.fn(), summarize: jest.fn() } },
      ],
    }).compile();

    service = module.get(SchedulesService);
  });

  // ===== C5 =====
  describe('findAllAssignments (GET /schedules/assignments/all)', () => {
    const lastQuery = () => prisma.scheduleAssignment.findMany.mock.calls[0][0];

    it('FAITHFUL sem parâmetros: só as próprias atribuições, sem contatos', async () => {
      prisma.member.findFirst.mockResolvedValue({ id: 'm-fiel' });

      await service.findAllAssignments(undefined, 'm-de-outro', faithful);

      expect(lastQuery().where).toEqual({ memberId: 'm-fiel' });
      expect(lastQuery().include.member.select).toEqual({ id: true, fullName: true });
    });

    it('FAITHFUL sem cadastro de membro: lista vazia, sem consultar atribuições', async () => {
      const result = await service.findAllAssignments(undefined, undefined, faithful);

      expect(result).toEqual([]);
      expect(prisma.scheduleAssignment.findMany).not.toHaveBeenCalled();
    });

    it('FAITHFUL com scheduleId de escala fora do escopo → 403', async () => {
      hierarchy.hasAccessToSchedule.mockResolvedValue(false);

      await expect(service.findAllAssignments('s-imbituva', undefined, faithful)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.scheduleAssignment.findMany).not.toHaveBeenCalled();
    });

    it('FAITHFUL com scheduleId acessível (tela "Equipe" do app): nome/função, sem contatos', async () => {
      await service.findAllAssignments('s1', undefined, faithful);

      expect(hierarchy.hasAccessToSchedule).toHaveBeenCalledWith('u-fiel', 's1');
      expect(lastQuery().where).toEqual({ scheduleId: 's1' });
      expect(lastQuery().include.member.select).not.toHaveProperty('phone');
      expect(lastQuery().include.member.select).not.toHaveProperty('email');
    });

    it('COMMUNITY_COORDINATOR: aplica o escopo da escala (antes: sem filtro) e mantém contatos', async () => {
      await service.findAllAssignments(undefined, undefined, coordinator);

      expect(lastQuery().where.AND).toEqual([
        { schedule: realHierarchy.applyScheduleFilter(coordinator) },
      ]);
      expect(lastQuery().include.member.select).toMatchObject({ email: true, phone: true });
    });

    it('PARISH_ADMIN sem paróquia: filtro impossível', async () => {
      await service.findAllAssignments(undefined, undefined, { id: 'u', role: UserRole.PARISH_ADMIN } as any);

      expect(lastQuery().where.AND).toEqual([{ schedule: { id: '__none__' } }]);
    });

    it('PASTORAL_COORDINATOR com pastorais coordenadas: mantém o recorte pelas pastorais', async () => {
      const pc = {
        id: 'u-pc',
        role: UserRole.PASTORAL_COORDINATOR,
        communityId: 'c1',
        pastoralIds: ['cp1', 'cp-coral'],
        coordinatedPastoralIds: ['cp1'],
      } as any;

      await service.findAllAssignments(undefined, undefined, pc);

      expect(lastQuery().where.schedule).toEqual({
        pastorals: { some: { communityPastoralId: { in: ['cp1'] } } },
      });
      expect(lastQuery().where.AND).toBeUndefined();
    });

    it('PASTORAL_COORDINATOR sem pastoral coordenada: tratado como fiel (antes: tudo, com contatos)', async () => {
      const result = await service.findAllAssignments(undefined, undefined, {
        id: 'u',
        role: UserRole.PASTORAL_COORDINATOR,
        pastoralIds: ['cp-coral'], // só participa — não coordena
        coordinatedPastoralIds: [],
      } as any);

      // Sem cadastro de membro: nada; nunca a lista com contatos
      expect(result).toEqual([]);
      expect(prisma.scheduleAssignment.findMany).not.toHaveBeenCalled();
    });

    it('sem usuário: nada', async () => {
      await expect(service.findAllAssignments()).resolves.toEqual([]);
      expect(prisma.scheduleAssignment.findMany).not.toHaveBeenCalled();
    });
  });

  // ===== A8 + A5 =====
  describe('findAllSchedules (GET /schedules)', () => {
    const lastQuery = () => prisma.schedule.findMany.mock.calls[0][0];

    it('FAITHFUL: escalados só com nome (sem e-mail/telefone/cônjuge)', async () => {
      await service.findAllSchedules(undefined, faithful);

      expect(lastQuery().include.assignments.include.member.select).toEqual({ id: true, fullName: true });
    });

    it('coordenação: mantém os contatos', async () => {
      await service.findAllSchedules(undefined, coordinator);

      expect(lastQuery().include.assignments.include.member.select).toMatchObject({
        email: true,
        phone: true,
        spouseId: true,
      });
    });

    it('conta sem comunidade: filtro impossível (antes: escalas do país)', async () => {
      await service.findAllSchedules(undefined, { id: 'u', role: UserRole.FAITHFUL } as any);

      expect(lastQuery().where.id).toBe('__none__');
    });
  });

  describe('findOneSchedule (GET /schedules/:id)', () => {
    const lastQuery = () => prisma.schedule.findFirst.mock.calls[0][0];

    it('FAITHFUL: sem contato, foto, cônjuge nem pedidos de troca dos colegas', async () => {
      await service.findOneSchedule('s1', faithful);

      const assignments = lastQuery().include.assignments.include;
      expect(assignments.member.select).toEqual({ id: true, fullName: true });
      expect(assignments.swapRequests.where).toEqual({ id: '__none__' });
    });

    it('coordenação: contatos e pedidos de troca preservados', async () => {
      await service.findOneSchedule('s1', coordinator);

      const assignments = lastQuery().include.assignments.include;
      expect(assignments.member.select).toMatchObject({ phone: true, email: true, photoUrl: true });
      expect(assignments.swapRequests.where).toEqual({ status: 'PENDING' });
    });

    it('escala fora do escopo → 403', async () => {
      hierarchy.hasAccessToSchedule.mockResolvedValue(false);
      await expect(service.findOneSchedule('s-x', faithful)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  // ===== A6 =====
  describe('respondGroupAssignment (PATCH /schedules/assignments/group/respond)', () => {
    const dto = { scheduleId: 's-outra-paroquia', pastoralGroupId: 'g1', action: 'decline' as const };

    it('coordenador sem acesso à escala (outra paróquia) → 403, nada é alterado', async () => {
      hierarchy.hasAccessToSchedule.mockResolvedValue(false);

      await expect(service.respondGroupAssignment(dto, coordinator)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.scheduleAssignment.updateMany).not.toHaveBeenCalled();
    });

    it('grupo cuja pastoral não está vinculada à escala → 400', async () => {
      prisma.schedulePastoral.findFirst.mockResolvedValue(null);

      await expect(service.respondGroupAssignment(dto, coordinator)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.scheduleAssignment.updateMany).not.toHaveBeenCalled();
    });

    it('coordenador de pastoral com acesso, mas o grupo é de outra pastoral → 403', async () => {
      const pc = { id: 'u-pc', role: UserRole.PASTORAL_COORDINATOR, communityId: 'c1', pastoralIds: ['cp-liturgia'] } as any;

      await expect(service.respondGroupAssignment(dto, pc)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.scheduleAssignment.updateMany).not.toHaveBeenCalled();
    });

    it('coordenador de pastoral que só PARTICIPA da pastoral do grupo (não coordena) → 403', async () => {
      const pc = {
        id: 'u-pc',
        role: UserRole.PASTORAL_COORDINATOR,
        communityId: 'c1',
        pastoralIds: ['cp-liturgia', 'cp-musica'],
        coordinatedPastoralIds: ['cp-liturgia'],
      } as any;

      await expect(service.respondGroupAssignment({ ...dto, scheduleId: 's1' }, pc)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('coordenador da pastoral do grupo, com acesso à escala: responde', async () => {
      const pc = {
        id: 'u-pc',
        role: UserRole.PASTORAL_COORDINATOR,
        communityId: 'c1',
        coordinatedPastoralIds: ['cp-musica'],
      } as any;

      await service.respondGroupAssignment({ ...dto, scheduleId: 's1' }, pc);

      expect(prisma.scheduleAssignment.updateMany).toHaveBeenCalled();
    });

    it('coordenação com escopo e grupo vinculado: responde pela equipe', async () => {
      const result = await service.respondGroupAssignment({ ...dto, scheduleId: 's1' }, coordinator);

      expect(hierarchy.hasAccessToSchedule).toHaveBeenCalledWith('u-coord', 's1');
      expect(prisma.scheduleAssignment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { scheduleId: 's1', pastoralGroupId: 'g1', checkedIn: false } }),
      );
      expect(result).toEqual({ updated: 3, action: 'decline' });
    });

    it('líder do grupo (fiel, app) responde pela própria equipe', async () => {
      prisma.member.findFirst.mockResolvedValue({ id: 'm-lider' });
      prisma.pastoralMember.findFirst.mockResolvedValue({ role: 'Líder' });

      await service.respondGroupAssignment({ ...dto, scheduleId: 's1', action: 'confirm' }, faithful);

      expect(prisma.scheduleAssignment.updateMany).toHaveBeenCalled();
    });

    it('fiel que não lidera o grupo → 403', async () => {
      prisma.member.findFirst.mockResolvedValue({ id: 'm-fiel' });
      prisma.pastoralMember.findFirst.mockResolvedValue({ role: 'Membro' });

      await expect(service.respondGroupAssignment({ ...dto, scheduleId: 's1' }, faithful)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.scheduleAssignment.updateMany).not.toHaveBeenCalled();
    });

    it('ação inválida → 400', async () => {
      await expect(
        service.respondGroupAssignment({ ...dto, action: 'apagar' as any }, coordinator),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
