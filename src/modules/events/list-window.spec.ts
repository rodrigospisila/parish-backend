import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { dateWindowFilter, pageArgs, parseDateWindow, parsePageRequest } from './list-window';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService } from '../../common/hierarchy.service';
import { MassSchedulesService } from '../mass-schedules/mass-schedules.service';

/** Janela de datas e paginação de GET /events e GET /schedules (eng-qualidade-05, C6). */
describe('list-window', () => {
  it('sem parâmetros: nada muda (sem janela, sem página)', () => {
    expect(parseDateWindow(undefined, undefined)).toBeUndefined();
    expect(parseDateWindow('', '  ')).toBeUndefined();
    expect(parsePageRequest(undefined, '20')).toBeUndefined();
    expect(dateWindowFilter(undefined)).toBeUndefined();
  });

  it('`to` só com a data vale o dia inteiro (exclusivo no dia seguinte); com hora, inclusivo', () => {
    expect(dateWindowFilter(parseDateWindow('2026-10-01', '2026-10-31'))).toEqual({
      gte: new Date('2026-10-01T00:00:00.000Z'),
      lt: new Date('2026-11-01T00:00:00.000Z'),
    });
    expect(dateWindowFilter(parseDateWindow(undefined, '2026-10-31T15:00:00.000Z'))).toEqual({
      lte: new Date('2026-10-31T15:00:00.000Z'),
    });
  });

  it('data inválida ou from depois de to → 400', () => {
    expect(() => parseDateWindow('ontem', undefined)).toThrow(BadRequestException);
    expect(() => parseDateWindow('2026-11-01', '2026-10-01')).toThrow(BadRequestException);
  });

  it('página: padrão 50, máximo 200, inteiros a partir de 1', () => {
    expect(parsePageRequest('1', undefined)).toEqual({ page: 1, pageSize: 50 });
    expect(parsePageRequest('3', '20')).toEqual({ page: 3, pageSize: 20 });
    expect(pageArgs({ page: 3, pageSize: 20 })).toEqual({ skip: 40, take: 20 });
    for (const [page, size] of [['0', undefined], ['1.5', undefined], ['x', undefined], ['1', '201'], ['1', '0']]) {
      expect(() => parsePageRequest(page, size)).toThrow(BadRequestException);
    }
  });
});

describe('GET /events — janela e página', () => {
  let service: EventsService;
  let controller: EventsController;
  let prisma: any;
  const coordinator = { id: 'u-coord', role: UserRole.COMMUNITY_COORDINATOR, communityId: 'c1' } as any;
  const realHierarchy = new HierarchyService({} as any);

  beforeEach(async () => {
    prisma = {
      event: {
        findMany: jest.fn().mockResolvedValue([{ id: 'e1' }, { id: 'e2' }]),
        count: jest.fn().mockResolvedValue(57),
      },
    };
    const module = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: HierarchyService,
          useValue: {
            isCommunityInScope: jest.fn().mockResolvedValue(true),
            getUserPastoralIds: jest.fn().mockResolvedValue([]),
            applyEventFilter: (user: any) => realHierarchy.applyEventFilter(user),
          },
        },
        { provide: MassSchedulesService, useValue: {} },
      ],
    }).compile();
    service = module.get(EventsService);
    controller = new EventsController(service);
  });

  it('sem page: lista como antes; from/to entram no where do banco', async () => {
    const result = await controller.findAll(undefined, undefined, undefined, undefined, undefined, undefined, coordinator, '2026-10-01', '2026-10-31');

    expect(result).toEqual([{ id: 'e1' }, { id: 'e2' }]);
    const query = prisma.event.findMany.mock.calls[0][0];
    expect(query.where.AND).toEqual(
      expect.arrayContaining([
        { startDate: { gte: new Date('2026-10-01T00:00:00.000Z'), lt: new Date('2026-11-01T00:00:00.000Z') } },
      ]),
    );
    expect(query.orderBy).toEqual({ startDate: 'asc' });
    expect(query.skip).toBeUndefined();
    expect(prisma.event.count).not.toHaveBeenCalled();
  });

  it('sem nenhum parâmetro novo: a consulta é a mesma de antes (sem janela)', async () => {
    await service.findAll(undefined, undefined, undefined, undefined, undefined, coordinator);
    const query = prisma.event.findMany.mock.calls[0][0];
    expect(JSON.stringify(query.where)).not.toContain('"startDate"');
  });

  it('com page: { items, total, page, pageSize }, skip/take e ordem estável', async () => {
    const result = await controller.findAll(undefined, undefined, undefined, undefined, undefined, undefined, coordinator, undefined, undefined, '2', '25');

    expect(result).toEqual({ items: [{ id: 'e1' }, { id: 'e2' }], total: 57, page: 2, pageSize: 25 });
    const query = prisma.event.findMany.mock.calls[0][0];
    expect(query).toEqual(expect.objectContaining({ skip: 25, take: 25, orderBy: [{ startDate: 'asc' }, { id: 'asc' }] }));
    expect(prisma.event.count).toHaveBeenCalledWith({ where: query.where });
  });
});
