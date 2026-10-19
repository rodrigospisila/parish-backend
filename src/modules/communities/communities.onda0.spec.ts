import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CommunitiesService } from './communities.service';
import { CommunitiesController } from './communities.controller';
import { HierarchyService } from '../../common/hierarchy.service';
import { ParishesService } from '../parishes/parishes.service';
import { ParishesController } from '../parishes/parishes.controller';
import { foldSearch, likePattern, parsePaging } from './list-paging';

const user = (role: UserRole, over: Record<string, unknown> = {}) => ({ id: `u-${role}`, role, ...over }) as any;
/** Texto do SQL montado (Prisma.sql) e os valores passados como parâmetro. */
const sqlOf = (call: any[]) => ({ sql: call[0].sql as string, values: call[0].values as unknown[] });

describe('list-paging (contrato 4)', () => {
  it('sem page: null (lista de sempre); page/pageSize validados e limitados a 100', () => {
    expect(parsePaging(undefined, '50', 'x')).toBeNull();
    expect(parsePaging('', undefined)).toBeNull();
    expect(parsePaging('2', '500', '  São  José ')).toEqual({ page: 2, pageSize: 100, skip: 100, search: 'sao jose' });
    expect(parsePaging('1')).toEqual({ page: 1, pageSize: 20, skip: 0, search: '' });
    expect(() => parsePaging('0')).toThrow(BadRequestException);
    expect(() => parsePaging('1', 'abc')).toThrow(BadRequestException);
  });

  it('busca sem acento e curingas do LIKE escapados', () => {
    expect(foldSearch('CONCEIÇÃO')).toBe('conceicao');
    expect(likePattern('50%_a')).toBe('%50\\%\\_a%');
  });
});

describe('GET /communities paginado (contrato 4)', () => {
  let prisma: any;
  let service: CommunitiesService;

  beforeEach(() => {
    prisma = {
      $queryRaw: jest.fn(async (query: any) =>
        /COUNT\(\*\)/.test(query.sql) ? [{ total: 42 }] : [{ id: 'c2' }, { id: 'c1' }],
      ),
      community: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'c1', name: 'A', _count: { members: 1, events: 0 } },
          { id: 'c2', name: 'B', _count: { members: 3, events: 2 } },
        ]),
      },
    };
    service = new CommunitiesService(prisma, new HierarchyService(prisma), { log: jest.fn() } as any);
  });

  it('SYSTEM_ADMIN: { items, total, page, pageSize }; contagens só dos itens da página, na ordem do SQL', async () => {
    const res = await service.findPage(user(UserRole.SYSTEM_ADMIN), parsePaging('3', '2', 'sao jose')!);
    expect(res.total).toBe(42);
    expect(res.page).toBe(3);
    expect(res.pageSize).toBe(2);
    expect(res.items.map((c: any) => c.id)).toEqual(['c2', 'c1']);
    expect(prisma.community.findMany.mock.calls[0][0].where).toEqual({ id: { in: ['c2', 'c1'] } });
    const page = sqlOf(prisma.$queryRaw.mock.calls[1]);
    expect(page.sql).toContain('translate(lower(');
    expect(page.sql).toContain('LIMIT');
    expect(page.values).toEqual(expect.arrayContaining(['%sao jose%', 2, 4]));
  });

  it('escopo aplicado no SQL (paróquia/diocese) e parishId só como filtro adicional', async () => {
    await service.findPage(user(UserRole.PARISH_ADMIN, { parishId: 'p1' }), parsePaging('1')!, { parishId: 'p9' });
    const { sql, values } = sqlOf(prisma.$queryRaw.mock.calls[0]);
    expect(sql).toContain('c."parishId" =');
    expect(values).toEqual(['p1', 'p9']);

    prisma.$queryRaw.mockClear();
    await service.findPage(user(UserRole.DIOCESAN_ADMIN, { dioceseId: 'd1' }), parsePaging('1')!);
    expect(sqlOf(prisma.$queryRaw.mock.calls[0]).sql).toContain('p."dioceseId" =');
  });

  it('coordenador com comunidade atribuída: principal OU atribuídas da paróquia no SQL', async () => {
    const coord = user(UserRole.COMMUNITY_COORDINATOR, {
      communityId: 'c1',
      parishId: 'p1',
      communities: [{ communityId: 'c2', isActive: true, role: UserRole.COMMUNITY_COORDINATOR }],
    });
    await service.findPage(coord, parsePaging('1')!);
    const { sql, values } = sqlOf(prisma.$queryRaw.mock.calls[0]);
    expect(sql).toContain(' OR ');
    expect(values).toEqual(['c1', 'c2', 'p1']);
  });

  it('sem escopo: página vazia sem consultar o banco', async () => {
    await expect(service.findPage(user(UserRole.FAITHFUL), parsePaging('1')!)).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
    await expect(service.findPage(undefined, parsePaging('1')!)).resolves.toMatchObject({ total: 0 });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('controller: só com page muda o formato; sem page a lista e a cascata de sempre', async () => {
    const controller = new CommunitiesController(service, {} as any, {} as any);
    const page = jest.spyOn(service, 'findPage');
    const all = jest.spyOn(service, 'findAll').mockResolvedValue([] as any);
    const cascade = jest.spyOn(service, 'listByParish').mockResolvedValue([] as any);
    await controller.findAll(user(UserRole.SYSTEM_ADMIN), undefined, undefined, undefined, 'jose');
    expect(all).toHaveBeenCalled();
    await controller.findAll(user(UserRole.FAITHFUL), 'p1');
    expect(cascade).toHaveBeenCalledWith('p1');
    await controller.findAll(user(UserRole.SYSTEM_ADMIN), 'p1', '1', '10', 'jose');
    expect(page).toHaveBeenCalledWith(expect.anything(), { page: 1, pageSize: 10, skip: 0, search: 'jose' }, { parishId: 'p1' });
  });
});

describe('Community.laySacramentRecords (contrato 2)', () => {
  let prisma: any;
  let audit: { log: jest.Mock };
  let service: CommunitiesService;
  const community = { id: 'com-1', name: 'Capela', parishId: 'p1', status: 'ACTIVE', latitude: null, longitude: null, laySacramentRecords: false };

  beforeEach(() => {
    prisma = {
      community: {
        findFirst: jest.fn().mockResolvedValue({ ...community }),
        update: jest.fn(async ({ data }: any) => ({ ...community, ...data })),
      },
      communityGeoCandidate: { updateMany: jest.fn() },
    };
    audit = { log: jest.fn() };
    service = new CommunitiesService(prisma, { canManageCommunity: jest.fn().mockResolvedValue(true) } as any, audit as any);
  });

  it('PARISH_ADMIN liga e a mudança vai para a auditoria', async () => {
    const res = await service.update('com-1', { laySacramentRecords: true } as any, user(UserRole.PARISH_ADMIN, { parishId: 'p1' }));
    expect(res.laySacramentRecords).toBe(true);
    expect(prisma.community.update.mock.calls[0][0].data.laySacramentRecords).toBe(true);
    expect(audit.log.mock.calls[0][0].after.laySacramentRecords).toBe(true);
  });

  it('coordenador de comunidade não muda (403); reenviar o mesmo valor não é mudança', async () => {
    const coord = user(UserRole.COMMUNITY_COORDINATOR, { communityId: 'com-1', parishId: 'p1' });
    await expect(service.update('com-1', { laySacramentRecords: true } as any, coord)).rejects.toBeInstanceOf(ForbiddenException);
    await service.update('com-1', { laySacramentRecords: false, name: 'Capela Nova' } as any, coord);
    expect(prisma.community.update.mock.calls[0][0].data).toEqual({ name: 'Capela Nova' });
  });

  it('GET /communities/:id devolve o campo', async () => {
    prisma.community.findFirst.mockResolvedValue({ ...community });
    await service.findOneSafe('com-1');
    expect(prisma.community.findFirst.mock.calls[0][0].select.laySacramentRecords).toBe(true);
  });
});

describe('GET /parishes paginado (contrato 4)', () => {
  let prisma: any;
  let service: ParishesService;

  beforeEach(() => {
    prisma = {
      $queryRaw: jest.fn(async (query: any) => (/COUNT\(\*\)/.test(query.sql) ? [{ total: 1 }] : [{ id: 'p1' }])),
      parish: { findMany: jest.fn().mockResolvedValue([{ id: 'p1', name: 'Santa Rita', _count: { communities: 4 } }]) },
    };
    service = new ParishesService(prisma, { log: jest.fn() } as any);
  });

  it('diocese: escopo + busca; segredos do provedor omitidos; contagem só da página', async () => {
    const res = await service.findPage(user(UserRole.DIOCESAN_ADMIN, { dioceseId: 'd1' }), parsePaging('1', '20', 'Rita')!);
    expect(res).toEqual({ items: [{ id: 'p1', name: 'Santa Rita', _count: { communities: 4 } }], total: 1, page: 1, pageSize: 20 });
    const { sql, values } = sqlOf(prisma.$queryRaw.mock.calls[0]);
    expect(sql).toContain('p."dioceseId" =');
    expect(values).toEqual(expect.arrayContaining(['d1', '%rita%']));
    const args = prisma.parish.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ id: { in: ['p1'] } });
    expect(args.omit).toEqual({ providerApiKeyEnc: true, providerWebhookToken: true });
  });

  it('sem escopo: vazio sem consultar', async () => {
    await expect(service.findPage(user(UserRole.FAITHFUL), parsePaging('1')!)).resolves.toMatchObject({ items: [], total: 0 });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('controller: page → paginado; dioceseId sem page → cascata', async () => {
    const controller = new ParishesController(service);
    const page = jest.spyOn(service, 'findPage');
    const cascade = jest.spyOn(service, 'listByDiocese').mockResolvedValue([] as any);
    await controller.findAll(user(UserRole.SYSTEM_ADMIN), 'd1');
    expect(cascade).toHaveBeenCalledWith('d1');
    await controller.findAll(user(UserRole.SYSTEM_ADMIN), 'd1', '2', '50');
    expect(page).toHaveBeenCalledWith(expect.anything(), { page: 2, pageSize: 50, skip: 50, search: '' }, { dioceseId: 'd1' });
  });
});
