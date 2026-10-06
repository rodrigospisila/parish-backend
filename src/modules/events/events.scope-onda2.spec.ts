import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { EventsService, UPCOMING_EVENTS_MAX_LIMIT } from './events.service';
import { EventsController, EVENT_PASTORAL_LINK_THROTTLE_PER_MINUTE } from './events.controller';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService } from '../../common/hierarchy.service';
import { MassSchedulesService } from '../mass-schedules/mass-schedules.service';

/**
 * Onda 2 da auditoria (eventos):
 * - GET /events/:id serializava a Parish inteira (segredos do dízimo);
 * - ?communityId= substituía o filtro de escopo em /events e export.ics, e as
 *   rotas antigas (/upcoming, /range, /type/:type, /recurring) nem recebiam o
 *   usuário (fiel recebeu 241 eventos, inclusive não públicos de outra
 *   comunidade); /upcoming sem teto de `limit`;
 * - PATCH /events/:id movia o evento para comunidade fora do escopo;
 * - escopo de pastoral por PARTICIPAÇÃO (pastoralIds) em vez de coordenação.
 */
describe('EventsService — onda 2 (escopo das listagens, Parish, mover evento)', () => {
  let service: EventsService;
  let prisma: any;
  let hierarchy: any;
  let massSchedules: { expandOccurrences: jest.Mock; maxOccurrenceWindowDays: jest.Mock };

  const realHierarchy = new HierarchyService({} as any);
  const faithful = { id: 'u-fiel', role: UserRole.FAITHFUL, communityId: 'c1' } as any;
  const parishAdmin = { id: 'u-padre', role: UserRole.PARISH_ADMIN, parishId: 'p1' } as any;

  beforeEach(async () => {
    prisma = {
      event: {
        findFirst: jest.fn().mockResolvedValue({ id: 'e1' }),
        findUnique: jest.fn().mockResolvedValue({ id: 'e1', communityId: 'c1', eventPastorals: [] }),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({ id: 'e1' }),
      },
      member: { findFirst: jest.fn().mockResolvedValue(null) },
      communityPastoral: {
        findUnique: jest.fn().mockResolvedValue({ id: 'cp-coral', communityId: 'c1', globalPastoral: null }),
      },
      eventPastoral: { upsert: jest.fn().mockResolvedValue({ id: 'ep1' }) },
    };
    hierarchy = {
      hasAccessToEvent: jest.fn().mockResolvedValue(true),
      canManageEvent: jest.fn().mockResolvedValue(true),
      canManageCommunity: jest.fn().mockResolvedValue(true),
      isCommunityInScope: jest.fn().mockResolvedValue(false),
      getUserPastoralIds: jest.fn().mockResolvedValue(['cp-db']),
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

  const lastWhere = () => prisma.event.findMany.mock.calls[0][0].where;

  // ===== Parish inteira em GET /events/:id =====
  describe('findOne — sem segredos da paróquia', () => {
    it('community/parish/diocese com select explícito (sem providerApiKeyEnc/webhook/Pix)', async () => {
      await service.findOne('e1', faithful);

      const community = prisma.event.findFirst.mock.calls[0][0].include.community;
      expect(community.include).toBeUndefined();
      expect(community.select.parish.select).toEqual({
        id: true,
        name: true,
        dioceseId: true,
        diocese: { select: { id: true, name: true } },
      });
      expect(JSON.stringify(community)).not.toMatch(/provider|pixKey|merchant|true\}\}\}$/);
    });
  });

  // ===== communityId nunca substitui o escopo =====
  describe('findAll / export.ics — communityId combinado com o escopo', () => {
    it('fiel pedindo comunidade de outra paróquia: escopo AND comunidade (antes: a agenda dela)', async () => {
      await service.findAll('c-imbituva', undefined, undefined, undefined, undefined, faithful);

      const where = lastWhere();
      expect(where.communityId).toBeUndefined();
      expect(where.AND).toEqual([{ communityId: 'c1' }, { communityId: 'c-imbituva' }]);
    });

    it('fiel na própria comunidade (app: calendário): todos os eventos dela', async () => {
      await service.findAll('c1', undefined, undefined, undefined, undefined, faithful);

      expect(lastWhere()).toMatchObject({ communityId: 'c1', deletedAt: null });
      expect(lastWhere().OR).toBeUndefined();
    });

    it('vínculo secundário (membro): só públicos + pastorais de que participa', async () => {
      prisma.member.findFirst.mockResolvedValue({ id: 'm-fiel' });
      const user = { ...faithful, pastoralIds: ['cp-coral'] };

      await service.findAll('c2', undefined, undefined, undefined, undefined, user);

      expect(prisma.member.findFirst.mock.calls[0][0].where).toMatchObject({ userId: 'u-fiel', deletedAt: null });
      expect(lastWhere().communityId).toBe('c2');
      expect(lastWhere().OR).toEqual([
        { isPublic: true },
        { eventPastorals: { some: { communityPastoralId: { in: ['cp-coral'] } } } },
      ]);
    });

    it('pároco: comunidade da sua paróquia → todos os eventos dela', async () => {
      hierarchy.isCommunityInScope.mockResolvedValue(true);

      await service.findAll('c3', undefined, undefined, undefined, undefined, parishAdmin);

      expect(hierarchy.isCommunityInScope).toHaveBeenCalledWith(parishAdmin, 'c3');
      expect(lastWhere()).toMatchObject({ communityId: 'c3' });
    });

    it('pároco: comunidade de outra paróquia → escopo AND comunidade (vazio)', async () => {
      await service.findAll('c-x', undefined, undefined, undefined, undefined, parishAdmin);

      expect(lastWhere().AND).toEqual([{ community: { parishId: 'p1' } }, { communityId: 'c-x' }]);
    });

    it('sem usuário: negado (antes: filtro vazio = tudo)', async () => {
      await service.findAll('c1');

      expect(lastWhere().id).toBe('__none__');
    });

    it('export.ics com communityId fora do escopo segue o mesmo filtro', async () => {
      await service.exportIcs(faithful, 'c-imbituva');

      expect(lastWhere().AND).toEqual([{ communityId: 'c1' }, { communityId: 'c-imbituva' }]);
    });
  });

  // ===== Rotas antigas =====
  describe('rotas antigas: /upcoming, /range, /type/:type, /recurring', () => {
    it('/upcoming: fiel sem communityId vê só a própria comunidade (antes: o país)', async () => {
      await service.findUpcoming(undefined, 10, faithful);

      const where = lastWhere();
      expect(where.AND[0]).toEqual({ communityId: 'c1' });
      expect(where.AND[1]).toMatchObject({ status: 'PUBLISHED', deletedAt: null });
    });

    it('/upcoming: communityId de outra comunidade não abre a agenda dela', async () => {
      await service.findUpcoming('c-imbituva', 10, faithful);

      expect(lastWhere().AND[0]).toEqual({ AND: [{ communityId: 'c1' }, { communityId: 'c-imbituva' }] });
    });

    it('/upcoming: teto no limit', async () => {
      await service.findUpcoming('c1', 5000, faithful);
      expect(prisma.event.findMany.mock.calls[0][0].take).toBe(UPCOMING_EVENTS_MAX_LIMIT);

      expect(EventsService.normalizeUpcomingLimit('abc')).toBe(10);
      expect(EventsService.normalizeUpcomingLimit('-3')).toBe(10);
      expect(EventsService.normalizeUpcomingLimit('7')).toBe(7);
      expect(EventsService.normalizeUpcomingLimit(undefined)).toBe(10);
    });

    it('/upcoming (app: início) na comunidade do fiel: caminho legítimo', async () => {
      await service.findUpcoming('c1', 10, faithful);

      expect(lastWhere().AND[0]).toEqual({ communityId: 'c1' });
      expect(prisma.event.findMany.mock.calls[0][0].take).toBe(10);
    });

    it('/range, /type/:type e /recurring aplicam o escopo', async () => {
      await service.findByDateRange('2026-01-01', '2026-02-01', 'c-x', faithful);
      await service.findByType('MASS' as any, undefined, faithful);
      await service.findRecurring('c-x', faithful);

      const [range, type, recurring] = prisma.event.findMany.mock.calls.map((call: any[]) => call[0].where);
      expect(range.AND[0]).toEqual({ AND: [{ communityId: 'c1' }, { communityId: 'c-x' }] });
      expect(type.AND).toEqual([{ communityId: 'c1' }, { type: 'MASS', deletedAt: null }]);
      expect(recurring.AND[0]).toEqual({ AND: [{ communityId: 'c1' }, { communityId: 'c-x' }] });
    });

    it('sem usuário: nada (rotas eram abertas a qualquer logado, sem escopo)', async () => {
      await service.findRecurring();

      expect(lastWhere().AND[0]).toEqual({ id: '__none__' });
    });

    it('/type/:type inválido e /range sem datas → 400', async () => {
      await expect(service.findByType('XPTO' as any, undefined, faithful)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(service.findByDateRange('x', 'y', undefined, faithful)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  // ===== Mover evento =====
  describe('update — mover evento de comunidade', () => {
    it('admin NÃO move o evento para comunidade fora do escopo → 403', async () => {
      hierarchy.canManageCommunity.mockResolvedValue(false);

      await expect(service.update('e1', { communityId: 'c-outra-paroquia' }, parishAdmin)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(hierarchy.canManageCommunity).toHaveBeenCalledWith('u-padre', 'c-outra-paroquia');
      expect(prisma.event.update).not.toHaveBeenCalled();
    });

    it('admin move entre comunidades da sua paróquia', async () => {
      await service.update('e1', { communityId: 'c2' }, parishAdmin);

      expect(prisma.event.update).toHaveBeenCalled();
    });

    it('editar sem mover não consulta o destino', async () => {
      await service.update('e1', { title: 'Novo' }, parishAdmin);

      expect(hierarchy.canManageCommunity).not.toHaveBeenCalled();
      expect(prisma.event.update).toHaveBeenCalled();
    });
  });

  // ===== Coordenação ≠ participação =====
  describe('escopo de pastoral = coordinatedPastoralIds', () => {
    it('coordenador de pastoral que só PARTICIPA da pastoral não a vincula ao evento → 403', async () => {
      const pc = {
        id: 'u-pc',
        role: UserRole.PASTORAL_COORDINATOR,
        communityId: 'c1',
        pastoralIds: ['cp-coral'],
        coordinatedPastoralIds: ['cp-liturgia'],
      } as any;

      await expect(
        service.addPastoralToEvent('e1', { communityPastoralId: 'cp-coral' } as any, pc),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.eventPastoral.upsert).not.toHaveBeenCalled();
    });

    it('sessão sem coordinatedPastoralIds: negado (não herda participação nem cai no banco)', async () => {
      const pc = { id: 'u-pc', role: UserRole.PASTORAL_COORDINATOR, communityId: 'c1', pastoralIds: ['cp-coral'] } as any;

      await expect(
        service.addPastoralToEvent('e1', { communityPastoralId: 'cp-coral' } as any, pc),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(hierarchy.getUserPastoralIds).not.toHaveBeenCalled();
    });

    it('coordenador da pastoral vincula a sua pastoral', async () => {
      const pc = {
        id: 'u-pc',
        role: UserRole.PASTORAL_COORDINATOR,
        communityId: 'c1',
        coordinatedPastoralIds: ['cp-coral'],
      } as any;

      await service.addPastoralToEvent('e1', { communityPastoralId: 'cp-coral' } as any, pc);

      expect(prisma.eventPastoral.upsert).toHaveBeenCalled();
    });
  });

  // ===== export.ics: aviso do corte da agenda fixa =====
  describe('export.ics — agenda fixa cortada é avisada', () => {
    it('escopo amplo sem comunidade: X-WR-CALDESC diz até quando vai a agenda fixa', async () => {
      massSchedules.maxOccurrenceWindowDays.mockReturnValue(62);

      const ics = await service.exportIcs(parishAdmin);

      expect(ics).toMatch(/X-WR-CALDESC:Horários fixos .* só até \d{2}\/\d{2}\/\d{4}\. Para o período completo/);
    });

    it('com comunidade (janela completa): sem aviso', async () => {
      const ics = await service.exportIcs(faithful, 'c1');

      expect(ics).not.toContain('X-WR-CALDESC');
    });
  });
});

describe('EventsController — onda 2', () => {
  const service = {
    findUpcoming: jest.fn(),
    findRecurring: jest.fn(),
    findByType: jest.fn(),
    findByDateRange: jest.fn(),
  };
  const controller = new EventsController(service as any);
  const user = { id: 'u-fiel', role: UserRole.FAITHFUL, communityId: 'c1' };

  it('rotas antigas repassam o usuário logado (escopo) e /upcoming limita o limit', () => {
    controller.findUpcoming('c1', '99999', user);
    controller.findRecurring('c1', user);
    controller.findByType('MASS' as any, 'c1', user);
    controller.findByDateRange('2026-01-01', '2026-02-01', 'c1', user);

    expect(service.findUpcoming).toHaveBeenCalledWith('c1', UPCOMING_EVENTS_MAX_LIMIT, user);
    expect(service.findRecurring).toHaveBeenCalledWith('c1', user);
    expect(service.findByType).toHaveBeenCalledWith('MASS', 'c1', user);
    expect(service.findByDateRange).toHaveBeenCalledWith('2026-01-01', '2026-02-01', 'c1', user);
  });

  it('POST /events/:id/pastorals tem limite próprio acima do teto geral (evento recorrente)', () => {
    const limit = Reflect.getMetadata('THROTTLER:LIMITdefault', EventsController.prototype.addPastoralToEvent);

    expect(limit).toBe(EVENT_PASTORAL_LINK_THROTTLE_PER_MINUTE);
    expect(EVENT_PASTORAL_LINK_THROTTLE_PER_MINUTE).toBeGreaterThanOrEqual(1000);
  });
});
