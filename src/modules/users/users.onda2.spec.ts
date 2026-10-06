import { Reflector } from '@nestjs/core';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { HierarchyService } from '../../common/hierarchy.service';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';

/**
 * Onda 2 da auditoria (caminhos vizinhos às correções C2/C3):
 * - F1: POST /users gravava paróquia/comunidade do corpo sem conferir o escopo
 *   (DIOCESAN_ADMIN criava PARISH_ADMIN em paróquia de outra diocese);
 * - F3: vínculo de fé do admin gravado com o papel de gestão virava escopo;
 * - editar coordenador de pastoral promovia participações e destituía o
 *   coordenador vigente; "Tornar principal" do coordenador respondia 200 sem
 *   gravar; GET /users negado com mensagem genérica.
 */
describe('UsersService — segurança (onda 2)', () => {
  let service: UsersService;
  let prisma: any;
  let tx: any;
  let members: { ensureProfileForUser: jest.Mock };

  const diocesanD1 = { id: 'adm-d1', role: UserRole.DIOCESAN_ADMIN, dioceseId: 'd1', parishId: null, communityId: null };
  const parishAdminP1 = { id: 'adm-p1', role: UserRole.PARISH_ADMIN, dioceseId: 'd1', parishId: 'p1', communityId: null };
  const coordinatorC1 = { id: 'coord-c1', role: UserRole.COMMUNITY_COORDINATOR, dioceseId: 'd1', parishId: 'p1', communityId: 'c1' };
  const systemAdmin = { id: 'sys', role: UserRole.SYSTEM_ADMIN };

  // Paróquias: p1/p3 na diocese d1; p-d2 na diocese d2. Comunidades: c1/c2 em p1; c-p9 em p9 (d1); c-d2 em p-d2
  const parishes: Record<string, { id: string; dioceseId: string }> = {
    p1: { id: 'p1', dioceseId: 'd1' },
    p3: { id: 'p3', dioceseId: 'd1' },
    'p-d2': { id: 'p-d2', dioceseId: 'd2' },
  };
  const communities: Record<string, any> = {
    c1: { id: 'c1', parishId: 'p1', deletedAt: null, parish: { id: 'p1', dioceseId: 'd1' } },
    c2: { id: 'c2', parishId: 'p1', deletedAt: null, parish: { id: 'p1', dioceseId: 'd1' } },
    'c-p9': { id: 'c-p9', parishId: 'p9', deletedAt: null, parish: { id: 'p9', dioceseId: 'd1' } },
    'c-d2': { id: 'c-d2', parishId: 'p-d2', deletedAt: null, parish: { id: 'p-d2', dioceseId: 'd2' } },
  };

  const newUser = (over: Record<string, any> = {}) => ({
    email: 'novo@x.com',
    password: 'Senha12345',
    name: 'Novo',
    ...over,
  });

  beforeEach(() => {
    tx = {
      user: {
        create: jest.fn(async ({ data }: any) => ({ id: 'novo', ...data, member: null })),
        update: jest.fn(async ({ where, data }: any) => ({ id: where.id, ...data, member: { id: 'm1' } })),
        findUnique: jest.fn(async ({ where }: any) => ({ id: where.id, role: UserRole.FAITHFUL, member: null, communities: [] })),
      },
      userCommunity: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
      },
      pastoralMember: {
        updateMany: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        create: jest.fn(),
      },
      pastoralCoordinator: {
        updateMany: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
    };
    prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      parish: { findUnique: jest.fn(async ({ where }: any) => parishes[where.id] ?? null) },
      diocese: { findUnique: jest.fn(async ({ where }: any) => (where.id.startsWith('d') ? { id: where.id } : null)) },
      community: {
        findFirst: jest.fn(async ({ where }: any) => communities[where.id] ?? null),
        findUnique: jest.fn(async ({ where }: any) => communities[where.id] ?? null),
        findMany: jest.fn(async ({ where }: any) => (where.id.in as string[]).map((id) => communities[id]).filter(Boolean)),
      },
      communityPastoral: {
        findMany: jest.fn(async ({ where }: any) =>
          (where.id.in as string[]).map((id) => ({
            id,
            communityId: 'c1',
            community: communities.c1,
            globalPastoral: { id: 'g', name: 'Pastoral' },
          })),
        ),
      },
      $transaction: jest.fn(async (cb: any) => cb(tx)),
    };
    members = { ensureProfileForUser: jest.fn().mockResolvedValue({ id: 'm1' }) };
    service = new UsersService(prisma, members as any, { log: jest.fn() } as any);
  });

  // ================= F1 — POST /users =================
  describe('create — destino dentro do escopo do ator', () => {
    it('F1: DIOCESAN_ADMIN não cria PARISH_ADMIN em paróquia de OUTRA diocese', async () => {
      await expect(
        service.create(newUser({ role: UserRole.PARISH_ADMIN, parishId: 'p-d2' }) as any, diocesanD1),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.parish.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'p-d2' } }));
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('DIOCESAN_ADMIN não cria fiel em comunidade de outra diocese', async () => {
      await expect(
        service.create(newUser({ role: UserRole.FAITHFUL, communityId: 'c-d2' }) as any, diocesanD1),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('PARISH_ADMIN não cria fiel em comunidade de outra paróquia (mesmo da sua diocese)', async () => {
      await expect(
        service.create(newUser({ role: UserRole.FAITHFUL, communityId: 'c-p9' }) as any, parishAdminP1),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('paróquia/comunidade/diocese inexistente → 404 (antes: 500 da chave estrangeira)', async () => {
      await expect(
        service.create(newUser({ role: UserRole.PARISH_ADMIN, dioceseId: 'd1', parishId: 'p-x' }) as any, systemAdmin),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        service.create(newUser({ role: UserRole.FAITHFUL, communityId: 'c-x' }) as any, systemAdmin),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        service.create(newUser({ role: UserRole.DIOCESAN_ADMIN, dioceseId: 'x-diocese' }) as any, systemAdmin),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('paróquia de outra diocese que a informada → 400', async () => {
      await expect(
        service.create(newUser({ role: UserRole.PARISH_ADMIN, dioceseId: 'd1', parishId: 'p-d2' }) as any, systemAdmin),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('ator sem papel conhecido ou admin diocesano sem diocese → 403', async () => {
      await expect(
        service.create(newUser({ role: UserRole.FAITHFUL }) as any, { id: 'x', role: 'HACKER' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.create(newUser({ role: UserRole.FAITHFUL }) as any, { ...diocesanD1, dioceseId: null }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('caminho legítimo: DIOCESAN_ADMIN cria PARISH_ADMIN numa paróquia da SUA diocese (payload do painel)', async () => {
      await service.create(
        newUser({ role: UserRole.PARISH_ADMIN, dioceseId: 'd1', parishId: 'p3', clergyTitle: null }) as any,
        diocesanD1,
      );
      expect(tx.user.create.mock.calls[0][0].data).toEqual(
        expect.objectContaining({ role: UserRole.PARISH_ADMIN, dioceseId: 'd1', parishId: 'p3' }),
      );
    });

    it('caminho legítimo: PARISH_ADMIN cria fiel em comunidade da sua paróquia (diocese/paróquia derivadas)', async () => {
      await service.create(newUser({ role: UserRole.FAITHFUL, communityId: 'c2' }) as any, parishAdminP1);
      expect(tx.user.create.mock.calls[0][0].data).toEqual(
        expect.objectContaining({ dioceseId: 'd1', parishId: 'p1', communityId: 'c2' }),
      );
    });

    it('caminho legítimo: coordenador de comunidade cria voluntário (escopo fixado no dele)', async () => {
      await service.create(newUser({ role: UserRole.VOLUNTEER, parishId: 'p-d2' }) as any, coordinatorC1);
      expect(tx.user.create.mock.calls[0][0].data).toEqual(
        expect.objectContaining({ dioceseId: 'd1', parishId: 'p1', communityId: 'c1' }),
      );
    });

    it('caminho legítimo: PARISH_ADMIN cria coordenador de comunidade (communityIds do painel)', async () => {
      await service.create(
        newUser({
          role: UserRole.COMMUNITY_COORDINATOR,
          dioceseId: 'd1',
          parishId: 'p1',
          communityId: 'c2',
          communityIds: ['c2'],
        }) as any,
        parishAdminP1,
      );
      expect(tx.user.create.mock.calls[0][0].data).toEqual(
        expect.objectContaining({ role: UserRole.COMMUNITY_COORDINATOR, communityId: 'c2', parishId: 'p1' }),
      );
    });
  });

  // ================= F3 — vínculo de fé do admin =================
  describe('PATCH /users/me/community — vínculo de fé não vira escopo', () => {
    it('F3: PARISH_ADMIN grava o vínculo com papel FAITHFUL e ele não entra no isCommunityInScope', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...parishAdminP1, member: null, communities: [] });
      await service.updateMyCommunity(parishAdminP1.id, 'c-d2');

      const upsert = tx.userCommunity.upsert.mock.calls[0][0];
      expect(upsert.create.role).toBe(UserRole.FAITHFUL);
      expect(upsert.update.role).toBe(UserRole.FAITHFUL);

      const hierarchy = new HierarchyService(prisma);
      const session: any = {
        ...parishAdminP1,
        communities: [{ communityId: 'c-d2', isActive: true, role: UserRole.FAITHFUL }],
      };
      await expect(hierarchy.isCommunityInScope(session, 'c-d2')).resolves.toBe(false);
      await expect(hierarchy.isCommunityInScope(session, 'c2')).resolves.toBe(true);
    });

    it('coordenador cujo cadastro de membro está noutra comunidade: 409 explicando (antes 200 sem gravar)', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...coordinatorC1,
        communityId: null,
        member: { id: 'm-co', communityId: 'c1' },
        communities: [],
      });
      const err = await service.updateMyCommunity(coordinatorC1.id, 'c2').catch((e) => e);
      expect(err).toBeInstanceOf(ConflictException);
      expect(err.message).toMatch(/administra/);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  // ================= coordenação ≠ participação =================
  describe('coordenador de pastoral — coordenação só muda quando pedido', () => {
    const pcUser = {
      id: 'pc1',
      email: 'pc@x.com',
      name: 'PC',
      role: UserRole.PASTORAL_COORDINATOR,
      isActive: true,
      dioceseId: 'd1',
      parishId: 'p1',
      communityId: 'c1',
      communities: [{ communityId: 'c1' }],
    };

    beforeEach(() => {
      // 1ª leitura (update): participações pa1 (coordena) e pa2 (só participa);
      // leitura de coordenações vigentes: só pa1
      prisma.user.findUnique.mockImplementation(async (args: any) => {
        if (args.include?.member?.include?.pastoralCoordinations) {
          return {
            ...pcUser,
            member: {
              pastoralMemberships: [{ communityPastoralId: 'pa1', role: 'COORDINATOR', isActive: true }],
              pastoralCoordinations: [{ communityPastoralId: 'pa1' }],
            },
          };
        }
        return {
          ...pcUser,
          member: { id: 'm-pc', pastoralMemberships: [{ communityPastoralId: 'pa1' }, { communityPastoralId: 'pa2' }] },
        };
      });
    });

    it('painel reenviando TODAS as participações não promove ninguém nem destitui o coordenador vigente', async () => {
      await service.update('pc1', { name: 'PC', role: UserRole.PASTORAL_COORDINATOR, pastoralIds: ['pa1', 'pa2'] } as any, parishAdminP1);

      expect(tx.pastoralMember.update).not.toHaveBeenCalled();
      expect(tx.pastoralMember.create).not.toHaveBeenCalled();
      expect(tx.pastoralMember.updateMany).not.toHaveBeenCalled();
      expect(tx.pastoralCoordinator.updateMany).not.toHaveBeenCalled();
      expect(tx.pastoralCoordinator.create).not.toHaveBeenCalled();
    });

    it('mudança explícita de coordenação sincroniza, mas não encerra a coordenação de outras pessoas', async () => {
      await service.update('pc1', { role: UserRole.PASTORAL_COORDINATOR, pastoralIds: ['pa2'] } as any, parishAdminP1);

      expect(tx.pastoralMember.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ memberId: 'm1', communityPastoralId: 'pa2', role: 'COORDINATOR' }),
      });
      for (const [args] of tx.pastoralCoordinator.updateMany.mock.calls) {
        // Só encerra as coordenações DO PRÓPRIO usuário que saíram da lista
        expect(args.where.memberId).toBe('m1');
      }
    });

    it('respostas expõem coordinatedPastoralIds e o papel por pastoral (painel inicializa o formulário certo)', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...pcUser,
        member: {
          id: 'm-pc',
          communityId: 'c1',
          pastoralMemberships: [
            { communityPastoralId: 'pa1', role: 'COORDINATOR', communityPastoral: { id: 'pa1', communityId: 'c1', globalPastoral: { name: 'Liturgia' } } },
            { communityPastoralId: 'pa2', role: 'MEMBER', communityPastoral: { id: 'pa2', communityId: 'c1', globalPastoral: { name: 'Música' } } },
          ],
          pastoralCoordinations: [{ communityPastoralId: 'pa1' }],
        },
      });
      const res: any = await service.findOne('pc1', parishAdminP1);
      expect(res.pastoralIds).toEqual(['pa1', 'pa2']);
      expect(res.coordinatedPastoralIds).toEqual(['pa1']);
      expect(res.pastorals.map((p: any) => [p.id, p.isCoordinator])).toEqual([
        ['pa1', true],
        ['pa2', false],
      ]);
      const select = prisma.user.findUnique.mock.calls[0][0].select;
      expect(select.member.select.pastoralCoordinations).toBeDefined();
    });
  });

  // ================= GET /users =================
  describe('GET /users — negado com mensagem clara', () => {
    it.each([UserRole.PASTORAL_COORDINATOR, UserRole.VOLUNTEER, UserRole.FAITHFUL, 'HACKER'])(
      '%s recebe 403 explicando quem lista usuários, sem consulta ao banco',
      async (role) => {
        const err = await service.findAll({ id: 'u', role, communityId: 'c1', parishId: 'p1' }).catch((e) => e);
        expect(err).toBeInstanceOf(ForbiddenException);
        expect(err.message).toMatch(/administração .* coordenação de comunidade/);
        expect(prisma.user.findMany).not.toHaveBeenCalled();
      },
    );

    it('a rota não depende do RolesGuard (que só diria "Forbidden resource"); o service é a lista de papéis', () => {
      expect(new Reflector().get(ROLES_KEY, UsersController.prototype.findAll)).toBeUndefined();
    });
  });
});
