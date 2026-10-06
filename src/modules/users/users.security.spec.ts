import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { PrismaService } from '../../database/prisma.service';
import { MembersService } from '../members/members.service';
import { AuditService } from '../../common/audit.service';

/**
 * Regressões da auditoria de segurança:
 * - C2: promoção/escopo/reset de senha via /users por quem não é SYSTEM_ADMIN;
 * - C3: gestor trocando a própria paróquia/diocese por /users/me/community;
 * - A11: leitura de qualquer usuário por qualquer logado + campos sensíveis.
 */
describe('UsersService — segurança (C2, C3, A11)', () => {
  let service: UsersService;
  let prisma: any;
  let tx: any;
  let members: { ensureProfileForUser: jest.Mock };

  // Paróquia p1 (diocese d1); outra paróquia p2 (diocese d2)
  const parishAdmin = { id: 'adm-p1', role: UserRole.PARISH_ADMIN, dioceseId: 'd1', parishId: 'p1', communityId: null };
  const diocesanAdmin = { id: 'adm-d1', role: UserRole.DIOCESAN_ADMIN, dioceseId: 'd1', parishId: null, communityId: null };
  const coordinator = { id: 'coord-c1', role: UserRole.COMMUNITY_COORDINATOR, dioceseId: 'd1', parishId: 'p1', communityId: 'c1' };
  const systemAdmin = { id: 'sys', role: UserRole.SYSTEM_ADMIN };

  const dbUser = (over: Record<string, any> = {}) => ({
    id: 'f1',
    email: 'fiel@x.com',
    name: 'Fiel',
    phone: null,
    role: UserRole.FAITHFUL,
    isActive: true,
    clergyTitle: null,
    dioceseId: 'd1',
    parishId: 'p1',
    communityId: 'c1',
    member: null,
    communities: [],
    ...over,
  });

  beforeEach(async () => {
    tx = {
      user: {
        update: jest.fn(async ({ where, data }: any) => ({ ...dbUser({ id: where.id }), ...data })),
        findUnique: jest.fn(async ({ where }: any) => dbUser({ id: where.id })),
      },
      userCommunity: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
      },
    };
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(async ({ where, data }: any) => ({ ...dbUser({ id: where.id }), ...data })),
        delete: jest.fn(),
      },
      parish: { findUnique: jest.fn() },
      community: { findUnique: jest.fn(), findMany: jest.fn() },
      refreshToken: { deleteMany: jest.fn() },
      $transaction: jest.fn(async (cb: any) => cb(tx)),
    };
    members = { ensureProfileForUser: jest.fn().mockResolvedValue({ id: 'm1' }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembersService, useValue: members },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  // ================= C2 =================
  describe('C2 — PATCH /users/:id (papel e escopo)', () => {
    it('PARISH_ADMIN não promove um fiel da própria paróquia a SYSTEM_ADMIN', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser());
      await expect(service.update('f1', { role: UserRole.SYSTEM_ADMIN } as any, parishAdmin)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('PARISH_ADMIN não promove ninguém ao próprio nível (PARISH_ADMIN)', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser());
      await expect(
        service.update('f1', { role: UserRole.PARISH_ADMIN, dioceseId: 'd1', parishId: 'p1' } as any, parishAdmin),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('PARISH_ADMIN não se promove a SYSTEM_ADMIN', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser({ ...parishAdmin, communities: [] }));
      await expect(
        service.update(parishAdmin.id, { role: UserRole.SYSTEM_ADMIN } as any, parishAdmin),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('PARISH_ADMIN não troca a própria paróquia/diocese', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser({ ...parishAdmin, communities: [] }));
      await expect(
        service.update(parishAdmin.id, { parishId: 'p2', dioceseId: 'd2' } as any, parishAdmin),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('PARISH_ADMIN não move um fiel para outra paróquia/diocese', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser());
      await expect(
        service.update('f1', { parishId: 'p2', dioceseId: 'd2' } as any, parishAdmin),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.update('f1', { parishId: 'p2' } as any, parishAdmin)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('DIOCESAN_ADMIN não move um administrador de paróquia para paróquia de outra diocese', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser({ id: 'pa', role: UserRole.PARISH_ADMIN, communityId: null }));
      prisma.parish.findUnique.mockResolvedValue({ dioceseId: 'd2' });
      await expect(service.update('pa', { parishId: 'p9' } as any, diocesanAdmin)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('caminho legítimo: DIOCESAN_ADMIN move um PARISH_ADMIN para outra paróquia da SUA diocese', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser({ id: 'pa', role: UserRole.PARISH_ADMIN, communityId: null }));
      prisma.parish.findUnique.mockResolvedValue({ dioceseId: 'd1' });
      await service.update('pa', { role: UserRole.PARISH_ADMIN, dioceseId: 'd1', parishId: 'p3' } as any, diocesanAdmin);
      expect(tx.user.update.mock.calls[0][0].data).toEqual(
        expect.objectContaining({ role: UserRole.PARISH_ADMIN, dioceseId: 'd1', parishId: 'p3' }),
      );
    });

    it('COMMUNITY_COORDINATOR não promove ninguém a COMMUNITY_COORDINATOR (mesmo nível)', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser());
      await expect(
        service.update('f1', { role: UserRole.COMMUNITY_COORDINATOR, communityIds: ['c1'] } as any, coordinator),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('PARISH_ADMIN não edita outro PARISH_ADMIN da mesma paróquia (par)', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser({ id: 'outro-adm', role: UserRole.PARISH_ADMIN, communityId: null }));
      await expect(service.update('outro-adm', { email: 'meu@x.com' } as any, parishAdmin)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('PARISH_ADMIN sem paróquia não gerencia usuários sem paróquia (null === null não é escopo)', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser({ parishId: null, dioceseId: null, communityId: null }));
      await expect(
        service.update('f1', { name: 'X' } as any, { ...parishAdmin, parishId: null }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('caminho legítimo: PARISH_ADMIN torna um fiel da paróquia VOLUNTEER', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser());
      await service.update('f1', { role: UserRole.VOLUNTEER } as any, parishAdmin);
      const data = tx.user.update.mock.calls[0][0].data;
      expect(data.role).toBe(UserRole.VOLUNTEER);
      expect(data.parishId).toBe('p1');
      expect(data.dioceseId).toBe('d1');
    });

    it('caminho legítimo: PARISH_ADMIN promove um fiel a coordenador de comunidade da paróquia (payload do painel)', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser());
      prisma.community.findMany.mockResolvedValue([{ id: 'c2', parishId: 'p1', parish: { dioceseId: 'd1' } }]);
      await service.update(
        'f1',
        {
          name: 'Fiel',
          email: 'fiel@x.com',
          role: UserRole.COMMUNITY_COORDINATOR,
          clergyTitle: null,
          dioceseId: 'd1',
          parishId: 'p1',
          communityId: 'c2',
          communityIds: ['c2'],
        } as any,
        parishAdmin,
      );
      expect(tx.user.update.mock.calls[0][0].data).toEqual(
        expect.objectContaining({ role: UserRole.COMMUNITY_COORDINATOR, communityId: 'c2', parishId: 'p1' }),
      );
    });

    it('caminho legítimo: PARISH_ADMIN edita o próprio nome/telefone pelo formulário do painel (sem mexer em papel/escopo)', async () => {
      prisma.user.findUnique.mockResolvedValue(
        dbUser({ ...parishAdmin, email: 'adm@x.com', name: 'Adm', communities: [] }),
      );
      await service.update(
        parishAdmin.id,
        {
          name: 'Adm Novo',
          email: 'adm@x.com',
          phone: '',
          role: UserRole.PARISH_ADMIN,
          clergyTitle: null,
          dioceseId: 'd1',
          parishId: 'p1',
        } as any,
        parishAdmin,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledTimes(1);
      expect(prisma.user.update.mock.calls[0][0].data).toEqual({ name: 'Adm Novo', phone: null });
    });

    it('próprio usuário não muda o próprio cargo nem os próprios vínculos pelo /users/:id', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser({ ...coordinator, communities: [{ communityId: 'c1' }] }));
      await expect(
        service.update(coordinator.id, { clergyTitle: 'BISHOP' } as any, coordinator),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.update(coordinator.id, { communityIds: ['c1', 'c-outra'] } as any, coordinator),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('SYSTEM_ADMIN continua podendo atribuir papéis de gestão', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser());
      await service.update('f1', { role: UserRole.DIOCESAN_ADMIN, dioceseId: 'd1' } as any, systemAdmin);
      expect(tx.user.update.mock.calls[0][0].data.role).toBe(UserRole.DIOCESAN_ADMIN);
    });
  });

  describe('C2 — reset de senha e exclusão', () => {
    it('PARISH_ADMIN não reseta a senha de outro PARISH_ADMIN (tomada de conta)', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser({ id: 'outro-adm', role: UserRole.PARISH_ADMIN }));
      await expect(service.resetPassword('outro-adm', parishAdmin)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('DIOCESAN_ADMIN não reseta a senha de um SYSTEM_ADMIN nem a própria por esta rota', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser({ id: 'sys', role: UserRole.SYSTEM_ADMIN }));
      await expect(service.resetPassword('sys', diocesanAdmin)).rejects.toBeInstanceOf(ForbiddenException);
      prisma.user.findUnique.mockResolvedValue(dbUser({ ...diocesanAdmin }));
      await expect(service.resetPassword(diocesanAdmin.id, diocesanAdmin)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('caminho legítimo: PARISH_ADMIN reseta a senha de um fiel da paróquia', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser());
      const res = await service.resetPassword('f1', parishAdmin);
      expect(res.tempPassword).toMatch(/Aa1!$/);
      expect(prisma.user.update.mock.calls[0][0].data.forcePasswordChange).toBe(true);
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'f1' } });
    });

    it('PARISH_ADMIN não exclui outro PARISH_ADMIN', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser({ id: 'outro-adm', role: UserRole.PARISH_ADMIN }));
      await expect(service.remove('outro-adm', parishAdmin)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });
  });

  // ================= A11 =================
  describe('A11 — GET /users/:id e campos sensíveis', () => {
    const adminTarget = dbUser({ id: 'adm-outra', role: UserRole.PARISH_ADMIN, parishId: 'p2', dioceseId: 'd2' });

    it.each([
      ['FAITHFUL', { id: 'fiel16', role: UserRole.FAITHFUL, parishId: 'p2', communityId: 'c9' }],
      ['VOLUNTEER', { id: 'vol', role: UserRole.VOLUNTEER, parishId: 'p2', communityId: 'c9' }],
      ['PASTORAL_COORDINATOR', { id: 'pc', role: UserRole.PASTORAL_COORDINATOR, parishId: 'p2', communityId: 'c9' }],
    ])('%s não lê o cadastro de outro usuário', async (_label, actor) => {
      prisma.user.findUnique.mockResolvedValue(adminTarget);
      await expect(service.findOne('adm-outra', actor)).rejects.toBeInstanceOf(ForbiddenException);
      prisma.user.findUnique.mockResolvedValue(dbUser({ id: 'sys', role: UserRole.SYSTEM_ADMIN }));
      await expect(service.findOne('sys', actor)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('PARISH_ADMIN lê usuário da própria paróquia, mas não de outra', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser());
      await expect(service.findOne('f1', parishAdmin)).resolves.toEqual(expect.objectContaining({ id: 'f1' }));
      prisma.user.findUnique.mockResolvedValue(dbUser({ id: 'f2', parishId: 'p2', dioceseId: 'd2' }));
      await expect(service.findOne('f2', parishAdmin)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('o próprio usuário se lê, sem pushToken, hash, segredos do 2FA nem o membro completo', async () => {
      prisma.user.findUnique.mockResolvedValue(
        dbUser({
          id: 'fiel16',
          password: '$2b$hash',
          twoFactorSecret: 'segredo',
          twoFactorBackupCodes: ['x'],
          pushToken: 'ExponentPushToken[abc]',
          pushTokenUpdatedAt: new Date(),
          sessionsRevokedAt: new Date(),
          member: { id: 'm1', cpf: '123', birthDate: new Date(), pastoralMemberships: [] },
        }),
      );
      const res: any = await service.findOne('fiel16', { id: 'fiel16', role: UserRole.FAITHFUL });
      for (const key of ['password', 'twoFactorSecret', 'twoFactorBackupCodes', 'pushToken', 'pushTokenUpdatedAt', 'sessionsRevokedAt']) {
        expect(res).not.toHaveProperty(key);
      }
      expect(res.member).toEqual({ id: 'm1' });
    });

    it('a consulta usa SELECT explícito: hash, 2FA e pushToken nem saem do banco', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser());
      await service.findOne('f1', parishAdmin);
      const args = prisma.user.findUnique.mock.calls[0][0];
      expect(args.include).toBeUndefined();
      for (const key of ['password', 'twoFactorSecret', 'twoFactorBackupCodes', 'pushToken', 'sessionsRevokedAt']) {
        expect(args.select).not.toHaveProperty(key);
      }
      expect(Object.keys(args.select.member.select)).toEqual(['id', 'communityId', 'pastoralMemberships', 'pastoralCoordinations']);
    });

    it('findAll de gestor sem âncora de escopo devolve lista vazia (antes: todos os usuários)', async () => {
      await expect(service.findAll({ ...parishAdmin, parishId: null })).resolves.toEqual([]);
      await expect(service.findAll({ ...diocesanAdmin, dioceseId: null })).resolves.toEqual([]);
      await expect(
        service.findAll({ ...coordinator, communityId: null, parishId: null }),
      ).resolves.toEqual([]);
      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });

    it('findAll do PARISH_ADMIN filtra pela paróquia e usa select explícito', async () => {
      await service.findAll(parishAdmin);
      const args = prisma.user.findMany.mock.calls[0][0];
      expect(args.where).toEqual({ parishId: 'p1' });
      expect(args.select).not.toHaveProperty('password');
      expect(args.select).not.toHaveProperty('pushToken');
    });
  });

  // ================= C3 =================
  describe('C3 — PATCH /users/me/community', () => {
    const otherParishCommunity = {
      id: 'c-imb',
      name: 'Comunidade de Imbituva',
      parishId: 'p-imb',
      deletedAt: null,
      parish: { id: 'p-imb', dioceseId: 'd-imb' },
    };

    /** 1ª leitura: usuário + membro; 2ª: o usuário atualizado (select). */
    const mockUserReads = (current: any, afterLinks: any[] = []) => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ ...current, member: current.member ?? null })
        .mockResolvedValueOnce({ ...current, member: current.member ?? null, communities: afterLinks });
    };

    it('PARISH_ADMIN sem comunidade escolhe comunidade de OUTRA paróquia: 200, mas paróquia/diocese/comunidade do usuário não mudam', async () => {
      prisma.community.findUnique.mockResolvedValue(otherParishCommunity);
      mockUserReads(dbUser({ ...parishAdmin, email: 'adm@x.com' }), [
        { communityId: 'c-imb', isPrimary: true, community: { id: 'c-imb', name: 'Comunidade de Imbituva' } },
      ]);

      const res: any = await service.updateMyCommunity(parishAdmin.id, 'c-imb');

      // Escopo administrativo intocado
      expect(tx.user.update).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(res.parishId).toBe('p1');
      expect(res.dioceseId).toBe('d1');
      expect(res.role).toBe(UserRole.PARISH_ADMIN);
      expect(res.scopeCommunityId).toBeNull();
      // Vínculo de FÉ (papel FAITHFUL, nunca o de gestão) gravado e devolvido
      // para o app sair do assistente
      expect(tx.userCommunity.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_communityId: { userId: parishAdmin.id, communityId: 'c-imb' } },
          create: expect.objectContaining({ role: UserRole.FAITHFUL, isPrimary: true }),
        }),
      );
      expect(res.communityId).toBe('c-imb');
    });

    it('DIOCESAN_ADMIN sem comunidade escolhe comunidade de outra diocese: diocese não muda', async () => {
      prisma.community.findUnique.mockResolvedValue(otherParishCommunity);
      mockUserReads(dbUser({ ...diocesanAdmin }));

      const res: any = await service.updateMyCommunity(diocesanAdmin.id, 'c-imb');

      expect(tx.user.update).not.toHaveBeenCalled();
      expect(res.dioceseId).toBe('d1');
      expect(res.communityId).toBe('c-imb');
    });

    it('coordenador sem comunidade: grava só o perfil de membro (UserCommunity daria escopo de coordenação)', async () => {
      prisma.community.findUnique.mockResolvedValue(otherParishCommunity);
      mockUserReads(dbUser({ ...coordinator, communityId: null }));

      await service.updateMyCommunity(coordinator.id, 'c-imb');

      expect(tx.user.update).not.toHaveBeenCalled();
      expect(tx.userCommunity.upsert).not.toHaveBeenCalled();
      expect(tx.userCommunity.create).not.toHaveBeenCalled();
      expect(members.ensureProfileForUser).toHaveBeenCalledWith(
        tx,
        expect.objectContaining({ communityId: 'c-imb', role: UserRole.COMMUNITY_COORDINATOR }),
        undefined,
      );
    });

    it('PARISH_ADMIN sem paróquia (conta incompleta) não grava vínculo, mas o app recebe a escolha', async () => {
      prisma.community.findUnique.mockResolvedValue(otherParishCommunity);
      mockUserReads(dbUser({ ...parishAdmin, parishId: null }));

      const res: any = await service.updateMyCommunity(parishAdmin.id, 'c-imb');

      expect(tx.userCommunity.upsert).not.toHaveBeenCalled();
      expect(tx.user.update).not.toHaveBeenCalled();
      expect(res.parishId).toBeNull();
      expect(res.communityId).toBe('c-imb');
    });

    it('gestor que já tem comunidade de escopo e pede outra continua recebendo 403', async () => {
      prisma.community.findUnique.mockResolvedValue(otherParishCommunity);
      mockUserReads(dbUser({ ...coordinator }));
      await expect(service.updateMyCommunity(coordinator.id, 'c-imb')).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('caminho legítimo: o FIEL troca de comunidade (vínculo aberto — decisão de produto)', async () => {
      prisma.community.findUnique.mockResolvedValue(otherParishCommunity);
      mockUserReads(dbUser({ id: 'fiel16' }));

      await service.updateMyCommunity('fiel16', 'c-imb', true);

      expect(tx.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'fiel16' },
          data: { communityId: 'c-imb', parishId: 'p-imb', dioceseId: 'd-imb' },
        }),
      );
      expect(members.ensureProfileForUser).toHaveBeenCalled();
    });

    it('comunidade arquivada não é aceita', async () => {
      prisma.community.findUnique.mockResolvedValue({ ...otherParishCommunity, deletedAt: new Date() });
      await expect(service.updateMyCommunity('fiel16', 'c-imb')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('GET /users/me do gestor sem comunidade de escopo traz a comunidade de fé (o app não reabre o assistente)', async () => {
      prisma.user.findUnique.mockResolvedValue(
        dbUser({
          ...parishAdmin,
          communities: [{ communityId: 'c-fe', isPrimary: true, community: { id: 'c-fe', name: 'Matriz' } }],
        }),
      );
      const res: any = await service.findMe(parishAdmin.id);
      expect(res.communityId).toBe('c-fe');
      expect(res.community).toEqual({ id: 'c-fe', name: 'Matriz' });
      expect(res.scopeCommunityId).toBeNull();
      expect(res.parishId).toBe('p1');
    });
  });
});
