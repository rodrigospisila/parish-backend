import { UserRole } from '@prisma/client';
import { ParishesService } from './parishes.service';
import { ParishesController } from './parishes.controller';

/**
 * Revisão da onda 1: GET /parishes devolvia 16 MB (12.843 paróquias COM as
 * comunidades) para qualquer fiel logado. Agora a lista de gestão é por escopo
 * e a escolha de paróquia usa a cascata leve `?dioceseId=`.
 */
describe('ParishesService — listas leves e por escopo', () => {
  let service: ParishesService;
  let prisma: any;

  const user = (role: UserRole, over: Record<string, unknown> = {}) => ({ id: `u-${role}`, role, ...over }) as any;

  beforeEach(() => {
    prisma = {
      parish: {
        findMany: jest.fn().mockResolvedValue([{ id: 'p1', name: 'Santa Rita' }]),
        findUnique: jest.fn().mockResolvedValue({ id: 'p1', name: 'Santa Rita' }),
      },
    };
    service = new ParishesService(prisma, { log: jest.fn() } as any);
  });

  const whereOf = () => prisma.parish.findMany.mock.calls[0][0].where;

  it('fiel SEM paróquia no cadastro recebe lista vazia, sem consultar o país inteiro', async () => {
    await expect(service.findAll(user(UserRole.FAITHFUL))).resolves.toEqual([]);
    await expect(service.findAll(user(UserRole.VOLUNTEER))).resolves.toEqual([]);
    await expect(service.findAll(user(UserRole.DIOCESAN_ADMIN, { dioceseId: null }))).resolves.toEqual([]);
    await expect(service.findAll(undefined)).resolves.toEqual([]);
    expect(prisma.parish.findMany).not.toHaveBeenCalled();
  });

  it('fiel/coordenação com paróquia: só a própria; diocese: as da diocese; plataforma: todas', async () => {
    await service.findAll(user(UserRole.FAITHFUL, { parishId: 'p1' }));
    expect(whereOf()).toEqual({ id: 'p1' });

    prisma.parish.findMany.mockClear();
    await service.findAll(user(UserRole.DIOCESAN_ADMIN, { dioceseId: 'd1' }));
    expect(whereOf()).toEqual({ dioceseId: 'd1' });

    prisma.parish.findMany.mockClear();
    await service.findAll(user(UserRole.SYSTEM_ADMIN));
    expect(whereOf()).toEqual({});
  });

  it('a lista de gestão não carrega mais as comunidades de cada paróquia (só a contagem) nem segredos', async () => {
    await service.findAll(user(UserRole.SYSTEM_ADMIN));
    const args = prisma.parish.findMany.mock.calls[0][0];
    expect(args.include).not.toHaveProperty('communities');
    expect(args.include._count).toEqual({ select: { communities: true } });
    expect(args.omit).toEqual({ providerApiKeyEnc: true, providerWebhookToken: true });
  });

  it('cascata ?dioceseId=: só paróquias ativas, só id/nome/cidade', async () => {
    await service.listByDiocese('d1');
    const args = prisma.parish.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ dioceseId: 'd1', status: 'ACTIVE' });
    expect(Object.keys(args.select).sort()).toEqual(['city', 'dioceseId', 'id', 'name', 'state']);
  });

  it('ficha GET /parishes/:id (o app mostra o contato): só dados públicos e comunidades não arquivadas', async () => {
    await service.findOne('p1');
    const { select } = prisma.parish.findUnique.mock.calls[0][0];
    // Nada da configuração do dízimo/provedor
    for (const field of ['providerApiKeyEnc', 'providerWebhookToken', 'pixKeyChangedByUserId', 'paymentProvider', 'feePolicy']) {
      expect(select).not.toHaveProperty(field);
    }
    // O que o app usa continua vindo
    expect(select).toMatchObject({ phone: true, email: true, website: true });
    expect(select.communities.where).toEqual({ deletedAt: null });
  });

  it('controller: com ?dioceseId= responde a cascata; sem, a lista de gestão', async () => {
    const controller = new ParishesController(service);
    const cascade = jest.spyOn(service, 'listByDiocese');
    const scoped = jest.spyOn(service, 'findAll');
    await controller.findAll(user(UserRole.FAITHFUL), 'd1');
    expect(cascade).toHaveBeenCalledWith('d1');
    expect(scoped).not.toHaveBeenCalled();
    await controller.findAll(user(UserRole.FAITHFUL, { parishId: 'p1' }));
    expect(scoped).toHaveBeenCalled();
  });
});
