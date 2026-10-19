import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UsersService, inviteScopeFields } from './users.service';

/**
 * Titular da paróquia (eng-acessos-03): o pároco/administrador titular gere os
 * OUTROS PARISH_ADMIN não titulares da própria paróquia; nunca outro titular,
 * nunca a si mesmo; só o SYSTEM_ADMIN marca ou desmarca o titular.
 */
describe('UsersService — titular da paróquia (eng-acessos-03)', () => {
  let service: UsersService;
  let prisma: any;
  let tx: any;
  /** Linhas do banco por id */
  let rows: Record<string, any>;

  const holder = {
    id: 'tit',
    role: UserRole.PARISH_ADMIN,
    dioceseId: 'd1',
    parishId: 'p1',
    communityId: null,
  };
  const notHolder = {
    id: 'sec',
    role: UserRole.PARISH_ADMIN,
    dioceseId: 'd1',
    parishId: 'p1',
    communityId: null,
  };
  const systemAdmin = { id: 'sys', role: UserRole.SYSTEM_ADMIN };

  const row = (over: Record<string, any>) => ({
    email: `${over.id}@x.com`,
    name: over.id,
    phone: null,
    role: UserRole.PARISH_ADMIN,
    isActive: true,
    clergyTitle: null,
    dioceseId: 'd1',
    parishId: 'p1',
    communityId: null,
    parishHolder: false,
    anonymizedAt: null,
    member: null,
    communities: [],
    ...over,
  });

  beforeEach(() => {
    rows = {
      tit: row({ id: 'tit', parishHolder: true }),
      sec: row({ id: 'sec' }),
      vig: row({ id: 'vig' }),
      tit2: row({ id: 'tit2', parishHolder: true }),
      other: row({ id: 'other', parishId: 'p9', dioceseId: 'd9' }),
    };
    const findUnique = jest.fn(async ({ where }: any) => (rows[where.id] ? { ...rows[where.id] } : null));
    tx = {
      user: {
        update: jest.fn(async ({ where, data }: any) => ({
          ...rows[where.id],
          ...data,
        })),
        findUnique,
      },
      userCommunity: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      refreshToken: { deleteMany: jest.fn() },
      passwordResetToken: { deleteMany: jest.fn() },
      userDevice: { deleteMany: jest.fn() },
      userAvatar: { deleteMany: jest.fn() },
      eventFavorite: { deleteMany: jest.fn() },
      massScheduleFavorite: { deleteMany: jest.fn() },
      notification: { deleteMany: jest.fn() },
      member: { updateMany: jest.fn() },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    prisma = {
      user: {
        findUnique,
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
      parish: {
        findUnique: jest.fn(async ({ where }: any) => ({
          id: where.id,
          dioceseId: where.id === 'p1' ? 'd1' : 'd9',
        })),
      },
      community: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
      $transaction: jest.fn(async (cb: any) => cb(tx)),
    };
    const audit = { log: jest.fn(), pseudonymizeSubject: jest.fn() };
    service = new UsersService(prisma, { ensureProfileForUser: jest.fn() } as any, audit as any);
  });

  it('isParishHolder lê o banco (a sessão não carrega o campo)', async () => {
    await expect(service.isParishHolder(holder)).resolves.toBe(true);
    await expect(service.isParishHolder(notHolder)).resolves.toBe(false);
    rows.tit.isActive = false;
    await expect(service.isParishHolder(holder)).resolves.toBe(false);
    await expect(service.isParishHolder({ ...holder, parishId: 'p9' })).resolves.toBe(false);
  });

  it('titular remove PARISH_ADMIN não titular da paróquia; o par não titular não remove', async () => {
    await expect(service.remove('sec', holder)).resolves.toMatchObject({
      message: expect.any(String),
    });
    await expect(service.remove('vig', notHolder)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('titular não remove outro titular, nem a si mesmo, nem admin de outra paróquia', async () => {
    await expect(service.remove('tit2', holder)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.remove('tit', holder)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.remove('other', holder)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('titular redefine a senha e desativa o par não titular', async () => {
    await expect(service.resetPassword('sec', holder)).resolves.toMatchObject({
      tempPassword: expect.any(String),
    });
    await expect(service.resetPassword('sec', notHolder)).rejects.toBeInstanceOf(ForbiddenException);
    await service.update('sec', { isActive: false } as any, holder);
    expect(tx.user.update.mock.calls.at(-1)[0].data).toMatchObject({
      isActive: false,
      parishId: 'p1',
    });
  });

  it('titular cria PARISH_ADMIN na própria paróquia; o não titular não', async () => {
    const scope = await service.resolveCreationScope(holder, {
      role: UserRole.PARISH_ADMIN,
      parishId: 'p9',
    });
    expect(scope).toMatchObject({ parishId: 'p1', dioceseId: 'd1' });
    await expect(service.resolveCreationScope(notHolder, { role: UserRole.PARISH_ADMIN })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    // Papel acima do PARISH_ADMIN continua proibido mesmo ao titular
    await expect(service.resolveCreationScope(holder, { role: UserRole.DIOCESAN_ADMIN })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('só o SYSTEM_ADMIN marca/desmarca o titular', async () => {
    await expect(service.update('sec', { parishHolder: true } as any, holder)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.update('tit', { parishHolder: false } as any, holder)).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    await service.update('sec', { parishHolder: true } as any, systemAdmin);
    expect(tx.user.update.mock.calls.at(-1)[0].data.parishHolder).toBe(true);
    await service.update('tit', { parishHolder: false } as any, systemAdmin);
    expect(tx.user.update.mock.calls.at(-1)[0].data.parishHolder).toBe(false);
  });

  it('titular exige PARISH_ADMIN com paróquia; trocar de papel desfaz o titular', async () => {
    rows.coord = row({
      id: 'coord',
      role: UserRole.VOLUNTEER,
      communityId: 'c1',
    });
    await expect(service.update('coord', { parishHolder: true } as any, systemAdmin)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await service.update('tit', { role: UserRole.FAITHFUL } as any, systemAdmin);
    expect(tx.user.update.mock.calls.at(-1)[0].data).toMatchObject({
      role: 'FAITHFUL',
      parishHolder: false,
    });
  });

  it('escopo do convite/reivindicação: titular só em PARISH_ADMIN com paróquia', () => {
    expect(
      inviteScopeFields({
        role: UserRole.PARISH_ADMIN,
        dioceseId: 'd1',
        parishId: 'p1',
        communityId: null,
        holder: true,
      }),
    ).toEqual({
      dioceseId: 'd1',
      parishId: 'p1',
      communityId: null,
      parishHolder: true,
    });
    expect(
      inviteScopeFields({
        role: UserRole.VOLUNTEER,
        dioceseId: 'd1',
        parishId: 'p1',
        communityId: 'c1',
        holder: true,
      }),
    ).toEqual({
      dioceseId: 'd1',
      parishId: 'p1',
      communityId: 'c1',
      parishHolder: false,
    });
    expect(
      inviteScopeFields({
        role: UserRole.DIOCESAN_ADMIN,
        dioceseId: 'd1',
        parishId: 'p1',
        communityId: 'c1',
      }),
    ).toEqual({
      dioceseId: 'd1',
      parishId: null,
      communityId: null,
      parishHolder: false,
    });
  });
});
