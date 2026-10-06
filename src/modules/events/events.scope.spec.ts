import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { EventsService } from './events.service';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService } from '../../common/hierarchy.service';
import { MassSchedulesService } from '../mass-schedules/mass-schedules.service';

/**
 * - A10: POST/DELETE /events/:id/participants sem checagem (IDOR entre
 *   paróquias + resposta com e-mail/telefone);
 * - A8: fiel via contatos de participantes/escalados em GET /events/:id;
 * - A5: conta sem comunidade via eventos do país (filtro vazio) e o export
 *   .ics expandia a agenda fixa sem limite.
 */
describe('EventsService — escopo de participantes e contatos (A5, A8, A10)', () => {
  let service: EventsService;
  let prisma: any;
  let hierarchy: any;
  let massSchedules: { expandOccurrences: jest.Mock; maxOccurrenceWindowDays: jest.Mock };

  const realHierarchy = new HierarchyService({} as any);
  const faithful = { id: 'u-fiel', role: UserRole.FAITHFUL, communityId: 'c1' } as any;
  const coordinator = { id: 'u-coord', role: UserRole.COMMUNITY_COORDINATOR, communityId: 'c1' } as any;

  beforeEach(async () => {
    prisma = {
      event: {
        findFirst: jest.fn().mockResolvedValue({ id: 'e1', maxParticipants: null }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      member: { findFirst: jest.fn() },
      eventParticipant: {
        findUnique: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: 'p1' }),
        delete: jest.fn().mockResolvedValue({ id: 'p1' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      eventPastoral: { findMany: jest.fn().mockResolvedValue([]) },
    };
    hierarchy = {
      hasAccessToEvent: jest.fn().mockResolvedValue(true),
      canManageEvent: jest.fn().mockResolvedValue(false),
      isCommunityInScope: jest.fn().mockResolvedValue(false),
      getUserPastoralIds: jest.fn().mockResolvedValue([]),
      applyEventFilter: (user: any) => realHierarchy.applyEventFilter(user),
    };
    massSchedules = {
      expandOccurrences: jest.fn().mockResolvedValue([]),
      maxOccurrenceWindowDays: jest.fn().mockReturnValue(460),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: PrismaService, useValue: prisma },
        { provide: HierarchyService, useValue: hierarchy },
        { provide: MassSchedulesService, useValue: massSchedules },
      ],
    }).compile();
    service = module.get(EventsService);
  });

  /** member.findFirst: 1ª chamada = membro alvo; 2ª = cadastro do usuário logado */
  const mockMembers = (target: any, self: any) => {
    prisma.member.findFirst.mockResolvedValueOnce(target).mockResolvedValueOnce(self);
  };

  // ===== A10 =====
  describe('addParticipant / removeParticipant', () => {
    it('fiel NÃO inscreve terceiro (outra pessoa, não dependente) → 403', async () => {
      mockMembers({ id: 'm-alheio', userId: 'u-outro', responsibleId: null }, { id: 'm-fiel' });

      await expect(service.addParticipant('e1', 'm-alheio', faithful)).rejects.toBeInstanceOf(ForbiddenException);
      expect(hierarchy.canManageEvent).toHaveBeenCalledWith('u-fiel', 'e1');
      expect(prisma.eventParticipant.create).not.toHaveBeenCalled();
    });

    it('evento fora do escopo (outra paróquia) → 403 antes de tocar no membro', async () => {
      hierarchy.hasAccessToEvent.mockResolvedValue(false);

      await expect(service.addParticipant('e-x', 'm-fiel', faithful)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.member.findFirst).not.toHaveBeenCalled();
      expect(prisma.eventParticipant.create).not.toHaveBeenCalled();
    });

    it('fiel inscreve a si mesmo; resposta sem e-mail/telefone', async () => {
      mockMembers({ id: 'm-fiel', userId: 'u-fiel', responsibleId: null }, { id: 'm-fiel' });

      await service.addParticipant('e1', 'm-fiel', faithful);

      const call = prisma.eventParticipant.create.mock.calls[0][0];
      expect(call.data).toEqual({ eventId: 'e1', memberId: 'm-fiel' });
      expect(call.include.member.select).toEqual({ id: true, fullName: true });
      expect(hierarchy.canManageEvent).not.toHaveBeenCalled();
    });

    it('fiel inscreve o próprio dependente', async () => {
      mockMembers({ id: 'm-filho', userId: null, responsibleId: 'm-fiel' }, { id: 'm-fiel' });

      await service.addParticipant('e1', 'm-filho', faithful);

      expect(prisma.eventParticipant.create).toHaveBeenCalled();
    });

    it('coordenação com escopo sobre o evento inscreve terceiros', async () => {
      hierarchy.canManageEvent.mockResolvedValue(true);
      mockMembers({ id: 'm-alheio', userId: 'u-outro', responsibleId: null }, null);

      await service.addParticipant('e1', 'm-alheio', coordinator);

      expect(prisma.eventParticipant.create).toHaveBeenCalled();
    });

    it('membro inexistente para quem gerencia → 404', async () => {
      hierarchy.canManageEvent.mockResolvedValue(true);
      mockMembers(null, null);

      await expect(service.addParticipant('e1', 'm-nao-existe', coordinator)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('membro inexistente para o fiel → 403 (não revela existência)', async () => {
      mockMembers(null, { id: 'm-fiel' });

      await expect(service.addParticipant('e1', 'm-nao-existe', faithful)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('fiel NÃO remove inscrição de terceiro → 403', async () => {
      mockMembers({ id: 'm-alheio', userId: 'u-outro', responsibleId: null }, { id: 'm-fiel' });

      await expect(service.removeParticipant('e1', 'm-alheio', faithful)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.eventParticipant.delete).not.toHaveBeenCalled();
    });

    it('fiel remove a própria inscrição', async () => {
      mockMembers({ id: 'm-fiel', userId: 'u-fiel', responsibleId: null }, { id: 'm-fiel' });
      prisma.eventParticipant.findUnique.mockResolvedValue({ id: 'p1' });

      await service.removeParticipant('e1', 'm-fiel', faithful);

      expect(prisma.eventParticipant.delete).toHaveBeenCalled();
    });
  });

  // ===== A8 =====
  describe('contatos em GET /events/:id e /events/:id/participants', () => {
    it('findOne para o fiel: participantes e escalados só com nome', async () => {
      await service.findOne('e1', faithful);

      const include = prisma.event.findFirst.mock.calls[0][0].include;
      expect(include.participants.include.member.select).toEqual({ id: true, fullName: true });
      expect(include.eventPastorals.include.assignments.include.member.select).toEqual({
        id: true,
        fullName: true,
      });
    });

    it('findOne para a coordenação: contatos preservados', async () => {
      await service.findOne('e1', coordinator);

      const include = prisma.event.findFirst.mock.calls[0][0].include;
      expect(include.participants.include.member.select).toMatchObject({ email: true, phone: true });
    });

    it('getParticipants para o fiel: sem e-mail/telefone', async () => {
      await service.getParticipants('e1', faithful);

      const select = prisma.eventParticipant.findMany.mock.calls[0][0].include.member.select;
      expect(select).not.toHaveProperty('email');
      expect(select).not.toHaveProperty('phone');
    });

    it('getEventPastorals para o fiel: escalados sem contato', async () => {
      await service.getEventPastorals('e1', faithful);

      const select = prisma.eventPastoral.findMany.mock.calls[0][0].include.assignments.include.member.select;
      expect(select).toEqual({ id: true, fullName: true });
    });
  });

  // ===== A5 =====
  describe('conta sem comunidade', () => {
    const newcomer = { id: 'u-novo', role: UserRole.FAITHFUL } as any;

    it('findAll: filtro impossível (antes: eventos do país)', async () => {
      await service.findAll(undefined, undefined, undefined, undefined, undefined, newcomer);

      expect(prisma.event.findMany.mock.calls[0][0].where.id).toBe('__none__');
    });

    it('findAll com communityId que NÃO é vínculo dele: continua negado', async () => {
      prisma.member.findFirst.mockResolvedValue(null);

      await service.findAll('c-imbituva', undefined, undefined, undefined, undefined, newcomer);

      expect(prisma.event.findMany.mock.calls[0][0].where.id).toBe('__none__');
    });

    it('findAll com communityId de vínculo ativo: vê a agenda pública daquela comunidade', async () => {
      const linked = { ...newcomer, communities: [{ communityId: 'c2', isActive: true }] };

      await service.findAll('c2', undefined, undefined, undefined, undefined, linked);

      const where = prisma.event.findMany.mock.calls[0][0].where;
      expect(where.id).toBeUndefined();
      expect(where.communityId).toBe('c2');
      expect(where.OR).toEqual([{ isPublic: true }]);
    });

    it('fiel com comunidade (caminho legítimo do app) segue vendo a própria', async () => {
      await service.findAll(undefined, undefined, undefined, undefined, undefined, faithful);

      expect(prisma.event.findMany.mock.calls[0][0].where.communityId).toBe('c1');
    });
  });

  describe('exportIcs — agenda fixa limitada em escopo amplo', () => {
    it('escopo amplo sem comunidade: expande só a janela permitida', async () => {
      massSchedules.maxOccurrenceWindowDays.mockReturnValue(62);
      const parishAdmin = { id: 'u', role: UserRole.PARISH_ADMIN, parishId: 'p1' } as any;

      await service.exportIcs(parishAdmin);

      const [fromStr, toStr] = massSchedules.expandOccurrences.mock.calls[0];
      const days = (new Date(toStr).getTime() - new Date(fromStr).getTime()) / 86_400_000;
      expect(days).toBeLessThanOrEqual(62);
    });

    it('com comunidade: mantém a janela de ~13 meses', async () => {
      await service.exportIcs(faithful, 'c1');

      const [fromStr, toStr] = massSchedules.expandOccurrences.mock.calls[0];
      const days = (new Date(toStr).getTime() - new Date(fromStr).getTime()) / 86_400_000;
      expect(days).toBeGreaterThan(390);
    });
  });
});
