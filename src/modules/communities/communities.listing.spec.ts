import { UserRole } from '@prisma/client';
import { CommunitiesService } from './communities.service';
import { CommunitiesController } from './communities.controller';
import { HierarchyService } from '../../common/hierarchy.service';

/**
 * Revisão da onda 1: GET /communities para conta sem escopo caía no filtro de
 * hierarquia vazio = as 53 mil comunidades do país, com contagens.
 */
describe('CommunitiesService — lista por escopo e cascata leve', () => {
  let service: CommunitiesService;
  let prisma: any;

  const user = (role: UserRole, over: Record<string, unknown> = {}) => ({ id: `u-${role}`, role, ...over }) as any;

  beforeEach(() => {
    prisma = { community: { findMany: jest.fn().mockResolvedValue([{ id: 'c1' }]) } };
    // Filtro REAL de hierarquia (o mesmo do JwtStrategy/serviços)
    const hierarchy = new HierarchyService(prisma);
    service = new CommunitiesService(prisma, hierarchy, { log: jest.fn() } as any);
  });

  it('conta sem escopo recebe lista vazia sem consultar o banco (fiel sem comunidade, diocesano sem diocese)', async () => {
    await expect(service.findAll(user(UserRole.FAITHFUL))).resolves.toEqual([]);
    await expect(service.findAll(user(UserRole.VOLUNTEER))).resolves.toEqual([]);
    await expect(service.findAll(user(UserRole.DIOCESAN_ADMIN, { dioceseId: null }))).resolves.toEqual([]);
    await expect(service.findAll(user(UserRole.PARISH_ADMIN))).resolves.toEqual([]);
    await expect(service.findAll(undefined)).resolves.toEqual([]);
    expect(prisma.community.findMany).not.toHaveBeenCalled();
  });

  it('caminho legítimo: escopo aplicado (comunidade, paróquia, diocese) e a plataforma vê tudo', async () => {
    await service.findAll(user(UserRole.FAITHFUL, { communityId: 'c1' }));
    expect(prisma.community.findMany.mock.calls[0][0].where).toMatchObject({ id: 'c1', deletedAt: null });

    await service.findAll(user(UserRole.PARISH_ADMIN, { parishId: 'p1' }));
    expect(prisma.community.findMany.mock.calls[1][0].where).toMatchObject({ parishId: 'p1', deletedAt: null });

    await service.findAll(user(UserRole.DIOCESAN_ADMIN, { dioceseId: 'd1' }));
    expect(prisma.community.findMany.mock.calls[2][0].where).toMatchObject({ parish: { dioceseId: 'd1' } });

    await service.findAll(user(UserRole.SYSTEM_ADMIN));
    expect(prisma.community.findMany.mock.calls[3][0].where).toEqual({ deletedAt: null });
  });

  it('cascata ?parishId=: só ativas e não arquivadas, select mínimo', async () => {
    await service.listByParish('p1');
    const args = prisma.community.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ parishId: 'p1', deletedAt: null, status: 'ACTIVE' });
    expect(Object.keys(args.select).sort()).toEqual(['address', 'city', 'id', 'name', 'parishId']);
  });

  it('controller: ?parishId= vai para a cascata (qualquer logado); sem ele, a lista de gestão', async () => {
    const controller = new CommunitiesController(service, {} as any, {} as any);
    const cascade = jest.spyOn(service, 'listByParish');
    await controller.findAll(user(UserRole.FAITHFUL), 'p1');
    expect(cascade).toHaveBeenCalledWith('p1');
    await expect(controller.findAll(user(UserRole.FAITHFUL))).resolves.toEqual([]);
  });
});
