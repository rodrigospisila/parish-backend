import { BadRequestException, ConflictException, ForbiddenException, GoneException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { InvitesService, INVITE_GONE_MESSAGES } from './invites.service';
import { UsersService } from '../users/users.service';
import {
  generateInviteToken,
  hashInviteToken,
  inviteStatus,
  inviteWhatsappText,
  isHolderInvite,
  technicalEmailForPhone,
} from './invite-token';

/**
 * Convites de equipe (C2): escopo de quem convida (régua do POST /users),
 * titular, token só em hash, link expirado/cancelado/usado e corrida no aceite.
 */
describe('InvitesService (C2)', () => {
  const parishAdmin = {
    id: 'adm-p1',
    role: UserRole.PARISH_ADMIN,
    dioceseId: 'd1',
    parishId: 'p1',
    communityId: null,
  };
  const coordinator = {
    id: 'coord-c1',
    role: UserRole.COMMUNITY_COORDINATOR,
    dioceseId: 'd1',
    parishId: 'p1',
    communityId: 'c1',
  };
  const systemAdmin = { id: 'sys', role: UserRole.SYSTEM_ADMIN };

  let prisma: any;
  let tx: any;
  let users: UsersService;
  let auth: { issueLoginSession: jest.Mock };
  let hierarchy: {
    canManageMember: jest.Mock;
    getCommunityScopeIds: jest.Mock;
  };
  let email: { trySend: jest.Mock };
  let consents: { grantInitialConsents: jest.Mock };
  let service: InvitesService;
  /** parishHolder do ator, lido do banco por UsersService.isParishHolder */
  let holderRow: any;
  /** Quem convidou, relido do banco no link público e no aceite (S12) */
  let inviters: Record<string, any>;

  const communities: Record<string, any> = {
    c1: {
      id: 'c1',
      parishId: 'p1',
      deletedAt: null,
      parish: { id: 'p1', dioceseId: 'd1' },
    },
    c2: {
      id: 'c2',
      parishId: 'p1',
      deletedAt: null,
      parish: { id: 'p1', dioceseId: 'd1' },
    },
    x9: {
      id: 'x9',
      parishId: 'p9',
      deletedAt: null,
      parish: { id: 'p9', dioceseId: 'd9' },
    },
  };

  const pendingInvite = (over: Record<string, any> = {}) => ({
    id: 'inv1',
    tokenHash: 'h',
    role: UserRole.VOLUNTEER,
    dioceseId: 'd1',
    parishId: 'p1',
    communityId: 'c1',
    memberId: null,
    name: 'Ana',
    email: 'ana@x.com',
    phone: '+5542999998888',
    invitedByUserId: 'adm-p1',
    expiresAt: new Date(Date.now() + 3600_000),
    acceptedAt: null,
    acceptedUserId: null,
    revokedAt: null,
    lastSentAt: new Date(),
    holder: false,
    createdAt: new Date(),
    ...over,
  });

  beforeEach(() => {
    holderRow = null;
    const active = { isActive: true, anonymizedAt: null, parishHolder: false, email: 'gestao@x.com' };
    inviters = {
      'adm-p1': { ...parishAdmin, ...active },
      'coord-c1': { ...coordinator, ...active },
      sys: { ...systemAdmin, dioceseId: null, parishId: null, communityId: null, ...active },
    };
    tx = {
      userInvite: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({}),
        create: jest.fn(async ({ data }: any) => ({
          ...pendingInvite(),
          id: data.id ?? 'new-inv',
          ...data,
        })),
      },
      user: {
        create: jest.fn(async ({ data }: any) => ({ id: 'new-user', ...data })),
        update: jest.fn().mockResolvedValue({ id: 'u-existing' }),
        findUnique: jest.fn().mockResolvedValue({
          id: 'u-existing',
          name: 'Ana',
          email: 'ana@x.com',
          phone: '+5542999998888',
          member: { id: 'm-own' },
        }),
      },
      userCommunity: { updateMany: jest.fn(), upsert: jest.fn() },
      member: {
        findFirst: jest.fn().mockResolvedValue(null),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      parishClaim: { updateMany: jest.fn() },
      parish: { updateMany: jest.fn() },
    };
    prisma = {
      user: {
        findUnique: jest.fn(async ({ where, select }: any) => {
          if (select?.anonymizedAt) return inviters[where.id] ?? null;
          if (select?.parishHolder) return holderRow;
          if (where?.phone) return null;
          return {
            id: where.id,
            email: 'ana@x.com',
            phone: '+5542999998888',
            isActive: true,
          };
        }),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      userInvite: {
        create: jest.fn(async ({ data }: any) => ({
          ...pendingInvite(),
          id: data.id ?? 'new-inv',
          ...data,
        })),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      community: {
        findFirst: jest.fn(async ({ where }: any) => communities[where.id] ?? null),
        findMany: jest.fn(async ({ where }: any) =>
          (where?.id?.in ?? []).map((id: string) => communities[id]).filter(Boolean),
        ),
      },
      parish: {
        findUnique: jest.fn(async ({ where }: any) =>
          where.id === 'p1' ? { id: 'p1', dioceseId: 'd1' } : where.id === 'p9' ? { id: 'p9', dioceseId: 'd9' } : null,
        ),
        findMany: jest.fn().mockResolvedValue([{ id: 'p1', name: 'Paróquia São José' }]),
      },
      diocese: { findMany: jest.fn().mockResolvedValue([]) },
      member: { findFirst: jest.fn() },
      parishClaim: { findFirst: jest.fn().mockResolvedValue(null) },
      $queryRaw: jest.fn().mockResolvedValue([]),
      $transaction: jest.fn(async (cb: any) => cb(tx)),
    };
    const members = {
      ensureProfileForUser: jest.fn().mockResolvedValue({ id: 'm-new' }),
    };
    const audit = { log: jest.fn() };
    users = new UsersService(prisma, members as any, audit as any);
    auth = {
      issueLoginSession: jest.fn().mockResolvedValue({
        user: { id: 'x' },
        accessToken: 'a',
        refreshToken: 'r',
        newDevice: true,
      }),
    };
    hierarchy = {
      canManageMember: jest.fn().mockResolvedValue(true),
      getCommunityScopeIds: jest.fn().mockResolvedValue(['c1']),
    };
    email = { trySend: jest.fn().mockResolvedValue(false) };
    consents = { grantInitialConsents: jest.fn() };
    const config = {
      get: jest.fn((key: string) => (key === 'PUBLIC_WEB_URL' ? 'https://painel.exemplo/' : undefined)),
    };
    service = new InvitesService(
      prisma,
      config as any,
      users,
      auth as any,
      hierarchy as any,
      audit as any,
      email as any,
      { notifyUser: jest.fn().mockResolvedValue(null) } as any,
      consents as any,
    );
  });

  describe('escopo de quem convida', () => {
    it('PARISH_ADMIN não titular não convida outro PARISH_ADMIN (mesma régua do POST /users)', async () => {
      await expect(service.create({ role: UserRole.PARISH_ADMIN } as any, parishAdmin)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.userInvite.create).not.toHaveBeenCalled();
    });

    it('titular convida PARISH_ADMIN da própria paróquia (paróquia forçada, mesmo pedindo outra)', async () => {
      holderRow = {
        parishHolder: true,
        role: UserRole.PARISH_ADMIN,
        parishId: 'p1',
        isActive: true,
      };
      const out = await service.create(
        { role: UserRole.PARISH_ADMIN, parishId: 'p9', name: 'Bia' } as any,
        parishAdmin,
      );
      expect(prisma.userInvite.create.mock.calls[0][0].data).toMatchObject({
        role: 'PARISH_ADMIN',
        parishId: 'p1',
        dioceseId: 'd1',
      });
      expect(out.invite.holder).toBe(false);
    });

    it('PARISH_ADMIN não convida para comunidade de outra paróquia', async () => {
      await expect(
        service.create({ role: UserRole.VOLUNTEER, communityId: 'x9' } as any, parishAdmin),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('coordenação de comunidade convida só na própria comunidade', async () => {
      await service.create({ role: UserRole.VOLUNTEER, communityId: 'c2', name: 'Caio' } as any, coordinator);
      expect(prisma.userInvite.create.mock.calls[0][0].data.communityId).toBe('c1');
      await expect(service.create({ role: UserRole.COMMUNITY_COORDINATOR } as any, coordinator)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('papel de comunidade exige a comunidade; coordenação de pastoral não tem convite por link', async () => {
      await expect(service.create({ role: UserRole.FAITHFUL } as any, parishAdmin)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(
        service.create({ role: UserRole.PASTORAL_COORDINATOR, communityId: 'c1' } as any, parishAdmin),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('holder: só SYSTEM_ADMIN ou o titular, e só com PARISH_ADMIN', async () => {
      await expect(
        service.create({ role: UserRole.PARISH_ADMIN, holder: true } as any, parishAdmin),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.create({ role: UserRole.VOLUNTEER, communityId: 'c1', holder: true } as any, systemAdmin),
      ).rejects.toBeInstanceOf(BadRequestException);

      const out = await service.create(
        {
          role: UserRole.PARISH_ADMIN,
          parishId: 'p1',
          holder: true,
          name: 'Pe. João',
        } as any,
        systemAdmin,
      );
      const data = prisma.userInvite.create.mock.calls[0][0].data;
      expect(data.holder).toBe(true);
      expect(data.id).toBeUndefined();
      expect(out.invite.holder).toBe(true);
      expect(out.whatsappText).toContain('administrador(a) paroquial titular');
    });

    it('membro com conta, dependente ou fora do escopo não recebe convite', async () => {
      prisma.member.findFirst.mockResolvedValueOnce({
        id: 'm1',
        fullName: 'Ana',
        userId: 'u1',
        communityId: 'c1',
      });
      await expect(
        service.create({ role: UserRole.FAITHFUL, memberId: 'm1' } as any, parishAdmin),
      ).rejects.toBeInstanceOf(ConflictException);
      prisma.member.findFirst.mockResolvedValueOnce({
        id: 'm2',
        fullName: 'Lia',
        userId: null,
        communityId: 'c1',
        responsibleId: 'm9',
      });
      await expect(
        service.create({ role: UserRole.FAITHFUL, memberId: 'm2' } as any, parishAdmin),
      ).rejects.toBeInstanceOf(BadRequestException);
      hierarchy.canManageMember.mockResolvedValueOnce(false);
      prisma.member.findFirst.mockResolvedValueOnce({
        id: 'm3',
        fullName: 'Rui',
        userId: null,
        communityId: 'x9',
      });
      await expect(
        service.create({ role: UserRole.FAITHFUL, memberId: 'm3' } as any, parishAdmin),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('convite pendente para a mesma pessoa vira 409 (usar Reenviar)', async () => {
      prisma.userInvite.findFirst.mockResolvedValueOnce({ id: 'old' });
      await expect(
        service.create(
          {
            role: UserRole.VOLUNTEER,
            communityId: 'c1',
            email: 'Ana@X.com',
          } as any,
          parishAdmin,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('token', () => {
    it('guarda só o SHA-256; o link leva o token; texto do WhatsApp em português, sem emoji', async () => {
      const out = await service.create(
        {
          role: UserRole.VOLUNTEER,
          communityId: 'c1',
          name: 'Ana',
          phone: '(42) 99999-8888',
        } as any,
        parishAdmin,
      );
      const data = prisma.userInvite.create.mock.calls[0][0].data;
      const token = out.url.split('/convite/')[1];
      expect(out.url.startsWith('https://painel.exemplo/convite/')).toBe(true);
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(data.tokenHash).toBe(hashInviteToken(token));
      expect(JSON.stringify(out.invite)).not.toContain(data.tokenHash);
      expect(data.phone).toBe('+5542999998888');
      expect(out.whatsappText).toBe(
        `Ana, a Paróquia São José convidou você para a equipe no Parish como voluntário(a). Crie seu acesso: ${out.url}`,
      );
      expect(out.expiresAt.getTime() - Date.now()).toBeGreaterThan(6.9 * 24 * 3600_000);
    });

    it('status e texto sem nome', () => {
      const now = new Date();
      expect(
        inviteStatus({
          acceptedAt: now,
          revokedAt: null,
          expiresAt: new Date(0),
        }),
      ).toBe('ACCEPTED');
      expect(
        inviteStatus({
          acceptedAt: null,
          revokedAt: now,
          expiresAt: new Date(Date.now() + 1000),
        }),
      ).toBe('REVOKED');
      expect(
        inviteStatus({
          acceptedAt: null,
          revokedAt: null,
          expiresAt: new Date(Date.now() - 1),
        }),
      ).toBe('EXPIRED');
      expect(
        inviteWhatsappText({
          role: UserRole.FAITHFUL,
          orgName: 'Paróquia X',
          url: 'u',
        }),
      ).toBe('Olá! A Paróquia X convidou você para a equipe no Parish como membro da comunidade. Crie seu acesso: u');
      expect(isHolderInvite({ holder: true, role: UserRole.PARISH_ADMIN, parishId: 'p1' })).toBe(true);
      expect(isHolderInvite({ holder: true, role: UserRole.VOLUNTEER, parishId: 'p1' })).toBe(false);
      expect(isHolderInvite({ holder: false, role: UserRole.PARISH_ADMIN, parishId: 'p1' })).toBe(false);
      expect(technicalEmailForPhone('+5542999998888')).toBe('tel-5542999998888@sem-email.parish.invalid');
    });
  });

  describe('link público', () => {
    it.each([
      ['inválido', null, INVITE_GONE_MESSAGES.invalid],
      ['vencido', pendingInvite({ expiresAt: new Date(Date.now() - 1000) }), INVITE_GONE_MESSAGES.expired],
      ['cancelado', pendingInvite({ revokedAt: new Date() }), INVITE_GONE_MESSAGES.revoked],
      ['usado', pendingInvite({ acceptedAt: new Date() }), INVITE_GONE_MESSAGES.accepted],
    ])('convite %s → 410 com mensagem', async (_label, row, message) => {
      prisma.userInvite.findUnique.mockResolvedValue(row);
      const token = generateInviteToken();
      await expect(service.getPublic(token)).rejects.toThrow(new GoneException(message));
      await expect(
        service.accept(token, { name: 'Ana', password: '12345678', acceptTerms: true } as any, null),
      ).rejects.toBeInstanceOf(GoneException);
      expect(tx.user.create).not.toHaveBeenCalled();
    });

    it('token malformado nem consulta o banco', async () => {
      await expect(service.getPublic('abc')).rejects.toBeInstanceOf(GoneException);
      expect(prisma.userInvite.findUnique).not.toHaveBeenCalled();
    });

    it('mostra o contato mascarado', async () => {
      prisma.userInvite.findUnique.mockResolvedValue(pendingInvite());
      // Nome da comunidade (loadNames); a régua de escopo de quem convidou (S12) segue o mock padrão
      const scopeLookup = prisma.community.findMany.getMockImplementation();
      prisma.community.findMany.mockImplementation(async (args: any) =>
        args?.select?.name ? [{ id: 'c1', name: 'Matriz' }] : scopeLookup(args),
      );
      const out = await service.getPublic(generateInviteToken());
      expect(out).toMatchObject({
        role: 'VOLUNTEER',
        roleLabel: 'Voluntário(a)',
        parishName: 'Paróquia São José',
        communityName: 'Matriz',
      });
      expect(out.emailMasked).toBe('a•••@x.com');
      expect(out.phoneMasked).toBe('+55•••••••88');
    });
  });

  describe('aceite', () => {
    beforeEach(() => prisma.userInvite.findUnique.mockResolvedValue(pendingInvite()));

    it('corrida: o segundo aceite encontra o convite já consumido → 410 e nenhuma conta', async () => {
      tx.userInvite.updateMany.mockResolvedValueOnce({ count: 0 });
      await expect(
        service.accept(generateInviteToken(), { name: 'Ana', password: '12345678', acceptTerms: true } as any, null),
      ).rejects.toBeInstanceOf(GoneException);
      expect(tx.user.create).not.toHaveBeenCalled();
      expect(auth.issueLoginSession).not.toHaveBeenCalled();
    });

    it('consumo condicional: não aceito, não cancelado, não vencido e com o mesmo hash', async () => {
      await service.accept(
        generateInviteToken(),
        { name: 'Ana', password: '12345678', acceptTerms: true } as any,
        null,
      );
      const where = tx.userInvite.updateMany.mock.calls[0][0].where;
      expect(where).toMatchObject({
        id: 'inv1',
        tokenHash: 'h',
        acceptedAt: null,
        revokedAt: null,
      });
      expect(where.expiresAt.gt).toBeInstanceOf(Date);
    });

    it('conta nova: senha própria, termos aceitos, sem troca obrigatória; devolve a sessão do login', async () => {
      const out = await service.accept(
        generateInviteToken(),
        { name: 'Ana Souza', password: '12345678', acceptTerms: true } as any,
        null,
        { ip: '1.2.3.4' },
      );
      const data = tx.user.create.mock.calls[0][0].data;
      expect(data).toMatchObject({
        email: 'ana@x.com',
        phone: '+5542999998888',
        role: 'VOLUNTEER',
        communityId: 'c1',
        parishId: 'p1',
        forcePasswordChange: false,
        parishHolder: false,
      });
      expect(data.acceptedTermsAt).toBeInstanceOf(Date);
      expect(data.acceptedTermsVersion).toBeTruthy();
      expect(data.password).not.toBe('12345678');
      expect(tx.userInvite.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { acceptedUserId: 'new-user' } }),
      );
      expect(consents.grantInitialConsents).toHaveBeenCalled();
      expect(auth.issueLoginSession).toHaveBeenCalledWith('new-user', {
        ip: '1.2.3.4',
      });
      expect(out).toEqual({
        user: { id: 'x' },
        accessToken: 'a',
        refreshToken: 'r',
        newDevice: true,
      });
    });

    it('só celular: e-mail técnico não roteável; e-mail informado pela pessoa vale mais', async () => {
      prisma.userInvite.findUnique.mockResolvedValue(pendingInvite({ email: null }));
      await service.accept(
        generateInviteToken(),
        { name: 'Ana', password: '12345678', acceptTerms: true } as any,
        null,
      );
      expect(tx.user.create.mock.calls[0][0].data.email).toBe('tel-5542999998888@sem-email.parish.invalid');

      await service.accept(
        generateInviteToken(),
        {
          name: 'Ana',
          password: '12345678',
          email: 'Ana.Real@Gmail.com',
          acceptTerms: true,
        } as any,
        null,
      );
      expect(tx.user.create.mock.calls[1][0].data.email).toBe('ana.real@gmail.com');
    });

    it('celular diferente do convite → 400; sem senha → 400; e-mail com conta → 409', async () => {
      const token = generateInviteToken();
      await expect(
        service.accept(
          token,
          {
            name: 'Ana',
            password: '12345678',
            phone: '42 98888-7777',
            acceptTerms: true,
          } as any,
          null,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.accept(token, { name: 'Ana', acceptTerms: true } as any, null)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      prisma.user.findFirst.mockResolvedValueOnce({ id: 'other' });
      await expect(
        service.accept(token, { name: 'Ana', password: '12345678', acceptTerms: true } as any, null),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(tx.user.create).not.toHaveBeenCalled();
    });

    it('com Bearer: aplica o papel na conta fiel/voluntário com o mesmo contato', async () => {
      const faithful = { id: 'u-existing', role: UserRole.FAITHFUL };
      await service.accept(generateInviteToken(), { name: 'Ana', acceptTerms: true } as any, faithful);
      expect(tx.user.create).not.toHaveBeenCalled();
      expect(tx.user.update.mock.calls[0][0]).toMatchObject({
        where: { id: 'u-existing' },
        data: { role: 'VOLUNTEER', communityId: 'c1', parishId: 'p1' },
      });
      expect(auth.issueLoginSession).toHaveBeenCalledWith('u-existing', {});
    });

    it('com Bearer: contato diferente → 403; conta de gestão → 409', async () => {
      prisma.user.findUnique.mockImplementation(async ({ where, select }: any) =>
        select?.anonymizedAt
          ? inviters[where.id]
          : {
              id: 'u2',
              email: 'outra@x.com',
              phone: null,
              isActive: true,
            },
      );
      await expect(
        service.accept(generateInviteToken(), { name: 'Ana', acceptTerms: true } as any, {
          id: 'u2',
          role: UserRole.FAITHFUL,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.accept(generateInviteToken(), { name: 'Ana', acceptTerms: true } as any, {
          id: 'u3',
          role: UserRole.COMMUNITY_COORDINATOR,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(tx.userInvite.updateMany).not.toHaveBeenCalled();
    });

    it('convite de titular da reivindicação: liga a conta ao pedido e marca a paróquia como gerida', async () => {
      prisma.userInvite.findUnique.mockResolvedValue(
        pendingInvite({
          holder: true,
          role: UserRole.PARISH_ADMIN,
          communityId: null,
          invitedByUserId: 'sys',
        }),
      );
      prisma.parishClaim.findFirst.mockResolvedValueOnce({ id: 'cl1' }); // pedido APROVADO
      await service.accept(
        generateInviteToken(),
        { name: 'Pe. João', password: '12345678', acceptTerms: true } as any,
        null,
      );
      expect(tx.user.create.mock.calls[0][0].data).toMatchObject({
        role: 'PARISH_ADMIN',
        parishHolder: true,
        communityId: null,
      });
      expect(tx.parishClaim.updateMany).toHaveBeenCalledWith({
        where: {
          parishId: 'p1',
          status: 'APPROVED',
          userId: null,
          grantedUserId: null,
          email: { equals: 'ana@x.com', mode: 'insensitive' },
        },
        data: { grantedUserId: 'new-user' },
      });
      expect(tx.parish.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'p1', managedAt: null } }),
      );
    });
  });

  describe('S12 — quem convidou perdeu o poder', () => {
    const accept = () =>
      service.accept(generateInviteToken(), { name: 'Ana', password: '12345678', acceptTerms: true } as any, null);

    it('conta de quem convidou desativada, anonimizada ou apagada → 410 no link e no aceite, nenhuma conta', async () => {
      prisma.userInvite.findUnique.mockResolvedValue(pendingInvite());
      const original = inviters['adm-p1'];
      for (const row of [{ ...original, isActive: false }, { ...original, anonymizedAt: new Date() }, null]) {
        inviters['adm-p1'] = row;
        await expect(service.getPublic(generateInviteToken())).rejects.toThrow(
          new GoneException(INVITE_GONE_MESSAGES.inviterLost),
        );
        await expect(accept()).rejects.toThrow(new GoneException(INVITE_GONE_MESSAGES.inviterLost));
      }
      expect(tx.userInvite.updateMany).not.toHaveBeenCalled();
      expect(tx.user.create).not.toHaveBeenCalled();
    });

    it('PARISH_ADMIN rebaixado (agora fiel) ou movido para outra paróquia → 410', async () => {
      prisma.userInvite.findUnique.mockResolvedValue(pendingInvite());
      const original = inviters['adm-p1'];
      inviters['adm-p1'] = { ...original, role: UserRole.FAITHFUL };
      await expect(accept()).rejects.toThrow(new GoneException(INVITE_GONE_MESSAGES.inviterLost));

      inviters['adm-p1'] = { ...original, parishId: 'p9', dioceseId: 'd9' };
      await expect(accept()).rejects.toThrow(new GoneException(INVITE_GONE_MESSAGES.inviterLost));
      expect(tx.user.create).not.toHaveBeenCalled();
    });

    it('coordenação que saiu da comunidade do convite → 410; ainda na comunidade → aceita', async () => {
      prisma.userInvite.findUnique.mockResolvedValue(pendingInvite({ invitedByUserId: 'coord-c1' }));
      const original = inviters['coord-c1'];
      inviters['coord-c1'] = { ...original, communityId: 'c2' };
      await expect(accept()).rejects.toThrow(new GoneException(INVITE_GONE_MESSAGES.inviterLost));

      inviters['coord-c1'] = original;
      await accept();
      expect(tx.user.create).toHaveBeenCalledTimes(1);
    });

    it('convite de titular: titular desmarcado depois de convidar → 410; ainda titular → aceita', async () => {
      prisma.userInvite.findUnique.mockResolvedValue(
        pendingInvite({ holder: true, role: UserRole.PARISH_ADMIN, communityId: null }),
      );
      // parishHolder = false: o SYSTEM_ADMIN desmarcou o titular depois do convite
      await expect(accept()).rejects.toThrow(new GoneException(INVITE_GONE_MESSAGES.inviterLost));
      await expect(service.getPublic(generateInviteToken())).rejects.toBeInstanceOf(GoneException);
      expect(tx.user.create).not.toHaveBeenCalled();

      inviters['adm-p1'] = { ...inviters['adm-p1'], parishHolder: true };
      holderRow = { parishHolder: true, role: UserRole.PARISH_ADMIN, parishId: 'p1', isActive: true };
      await accept();
      expect(tx.user.create.mock.calls[0][0].data).toMatchObject({ role: 'PARISH_ADMIN', parishHolder: true });
    });

    it('convite de membro: quem convidou não gerencia mais o cadastro → 410', async () => {
      prisma.userInvite.findUnique.mockResolvedValue(pendingInvite({ memberId: 'm1' }));
      hierarchy.canManageMember.mockResolvedValueOnce(false);
      await expect(accept()).rejects.toThrow(new GoneException(INVITE_GONE_MESSAGES.inviterLost));
      expect(hierarchy.canManageMember).toHaveBeenCalledWith('adm-p1', 'm1');
    });

    it('reivindicação de origem desfeita/rejeitada depois do convite de titular → 410; sem pedido nenhum → vale', async () => {
      const created = new Date(Date.now() - 3600_000);
      prisma.userInvite.findUnique.mockResolvedValue(
        pendingInvite({
          holder: true,
          role: UserRole.PARISH_ADMIN,
          communityId: null,
          invitedByUserId: 'sys',
          createdAt: created,
        }),
      );
      // nenhum pedido APROVADO; um REJECTED revisado depois do convite
      prisma.parishClaim.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'cl1' });
      await expect(accept()).rejects.toThrow(new GoneException(INVITE_GONE_MESSAGES.claimUndone));
      const undoneWhere = prisma.parishClaim.findFirst.mock.calls[1][0].where;
      expect(undoneWhere).toMatchObject({
        parishId: 'p1',
        email: { equals: 'ana@x.com', mode: 'insensitive' },
        status: { in: ['REJECTED', 'CANCELED'] },
        reviewedAt: { gte: created },
      });
      expect(tx.user.create).not.toHaveBeenCalled();

      // convite de titular feito pela plataforma sem reivindicação: segue valendo
      await accept();
      expect(tx.user.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('reenviar e cancelar', () => {
    it('reenviar gera token novo; aceito/cancelado → 409', async () => {
      prisma.userInvite.findUnique.mockResolvedValueOnce(pendingInvite({ expiresAt: new Date(Date.now() - 1000) }));
      const out = await service.resend('inv1', parishAdmin);
      const data = prisma.userInvite.updateMany.mock.calls[0][0].data;
      expect(data.tokenHash).toBe(hashInviteToken(out.url.split('/convite/')[1]));
      expect(data.expiresAt.getTime()).toBeGreaterThan(Date.now());

      prisma.userInvite.findUnique.mockResolvedValueOnce(pendingInvite({ acceptedAt: new Date() }));
      await expect(service.resend('inv1', parishAdmin)).rejects.toBeInstanceOf(ConflictException);
    });

    it('fora do escopo não reenvia nem cancela; convite de titular só o titular', async () => {
      prisma.userInvite.findUnique.mockResolvedValueOnce(
        pendingInvite({ parishId: 'p9', dioceseId: 'd9', communityId: 'x9' }),
      );
      await expect(service.revoke('inv1', parishAdmin)).rejects.toBeInstanceOf(ForbiddenException);
      prisma.userInvite.findUnique.mockResolvedValueOnce(pendingInvite({ holder: true, role: UserRole.PARISH_ADMIN }));
      await expect(service.revoke('inv1', parishAdmin)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('cancelar convite aceito → 409; pendente → revogado', async () => {
      prisma.userInvite.findUnique.mockResolvedValueOnce(pendingInvite({ acceptedAt: new Date() }));
      await expect(service.revoke('inv1', parishAdmin)).rejects.toBeInstanceOf(ConflictException);
      prisma.userInvite.findUnique.mockResolvedValueOnce(pendingInvite());
      await expect(service.revoke('inv1', parishAdmin)).resolves.toMatchObject({
        revoked: true,
      });
    });
  });

  describe('lista', () => {
    it('PARISH_ADMIN vê a própria paróquia; fiel não lista', async () => {
      await service.list({ status: 'PENDING' } as any, parishAdmin);
      const where = prisma.userInvite.findMany.mock.calls[0][0].where;
      expect(where.AND[0]).toEqual({ parishId: 'p1' });
      await expect(service.list({} as any, { id: 'f', role: UserRole.FAITHFUL })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });
});
