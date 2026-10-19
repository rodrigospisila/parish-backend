import {
  BadRequestException,
  ConflictException,
  HttpException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ClaimsService, CLAIM_MAX_PER_EMAIL_24H } from './claims.service';
import {
  CLAIM_CODE_MAX_ATTEMPTS,
  claimCodeMatches,
  generateClaimCode,
  hashClaimCode,
  isBrazilianMobile,
  isClaimCodeExpired,
} from './claim-code';

/**
 * Reivindicação de paróquia (C1): código no contato OFICIAL (hash com
 * segredo, tempo constante, limites), aprovação (promove/convida, AUTO_TRIAL
 * só sem plano, lead WON, paróquia gerida) e corrida da revisão.
 */
describe('ClaimsService (C1)', () => {
  const SECRET = 'segredo-de-teste';
  const parishRow = {
    id: 'p1',
    name: 'Paróquia São José',
    city: 'Imbituva',
    state: 'PR',
    dioceseId: 'd1',
    phone: '(42) 99999-8888',
    email: 'secretaria@saojose.org.br',
    managedAt: null,
    diocese: { name: 'Diocese de Ponta Grossa' },
  };
  const reviewer = {
    id: 'sys',
    role: UserRole.SYSTEM_ADMIN,
    email: 'sys@x.com',
  };

  let prisma: any;
  let tx: any;
  let users: { applyGrantToExistingAccount: jest.Mock };
  let invites: {
    createClaimHolderInvite: jest.Mock;
    sendInviteEmail: jest.Mock;
  };
  let messaging: { sendSms: jest.Mock; smsConfigured: boolean };
  let email: { trySend: jest.Mock; configured: boolean };
  let audit: { log: jest.Mock };
  let planAccess: { invalidate: jest.Mock };
  let notifications: { notifyUser: jest.Mock; notifyUsers: jest.Mock };
  let service: ClaimsService;
  const flush = () => new Promise((resolve) => setImmediate(resolve));
  const originalEnv = process.env.NODE_ENV;

  const claimRow = (over: Record<string, any> = {}) => ({
    id: 'cl1',
    parishId: 'p1',
    communityId: null,
    userId: null,
    name: 'Maria',
    email: 'maria@x.com',
    phone: null,
    role: 'secretária',
    status: 'PENDING',
    codeHash: null,
    codeSentAt: null,
    codeAttempts: 0,
    ...over,
  });

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    tx = {
      parishClaim: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { codeSends: 0 } }),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn().mockResolvedValue({ status: 'PENDING' }),
        create: jest.fn().mockResolvedValue({ id: 'cl1' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({}),
      },
      lead: {
        create: jest.fn().mockResolvedValue({ id: 'lead1' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      user: { findUnique: jest.fn() },
      userInvite: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      parish: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      community: {
        findMany: jest.fn().mockResolvedValue([{ id: 'c1' }, { id: 'c2' }]),
      },
      communityPlan: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
      communityPlanEvent: { create: jest.fn() },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    prisma = {
      parish: { findUnique: jest.fn().mockResolvedValue(parishRow) },
      parishClaim: {
        findUnique: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      community: { findFirst: jest.fn() },
      user: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
      notification: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(async (cb: any) => cb(tx)),
    };
    users = {
      applyGrantToExistingAccount: jest.fn().mockResolvedValue({ memberId: null }),
    };
    invites = {
      createClaimHolderInvite: jest.fn().mockResolvedValue({
        invite: { id: 'inv-cl1', holder: true },
        url: 'https://painel/convite/tok',
        whatsappText: 'Maria, a Paróquia São José convidou você...',
        expiresAt: new Date(Date.now() + 7 * 86400_000),
      }),
      sendInviteEmail: jest.fn().mockResolvedValue(false),
    };
    messaging = {
      sendSms: jest.fn().mockResolvedValue(undefined),
      smsConfigured: false,
    };
    email = { trySend: jest.fn().mockResolvedValue(false), configured: false };
    audit = { log: jest.fn() };
    planAccess = { invalidate: jest.fn() };
    notifications = {
      notifyUser: jest.fn().mockResolvedValue(null),
      notifyUsers: jest.fn().mockResolvedValue(undefined),
    };
    const config = {
      get: jest.fn((key: string) => (key === 'AUDIT_PSEUDONYM_KEY' ? SECRET : undefined)),
    };
    service = new ClaimsService(
      prisma,
      config as any,
      audit as any,
      users as any,
      invites as any,
      messaging as any,
      email as any,
      notifications as any,
      planAccess as any,
    );
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('código (peças puras)', () => {
    it('6 dígitos; hash com segredo e amarrado ao pedido; comparação só com 6 dígitos', () => {
      for (let i = 0; i < 50; i++) expect(generateClaimCode()).toMatch(/^\d{6}$/);
      const hash = hashClaimCode(SECRET, 'cl1', '012345');
      expect(hash).not.toContain('012345');
      expect(hashClaimCode(SECRET, 'cl2', '012345')).not.toBe(hash);
      expect(hashClaimCode('outro', 'cl1', '012345')).not.toBe(hash);
      expect(claimCodeMatches(SECRET, 'cl1', '012345', hash)).toBe(true);
      expect(claimCodeMatches(SECRET, 'cl1', '012346', hash)).toBe(false);
      expect(claimCodeMatches(SECRET, 'cl1', '12345', hash)).toBe(false);
      expect(claimCodeMatches(SECRET, 'cl1', '012345', null)).toBe(false);
    });

    it('validade de 30 min; SMS só para celular', () => {
      expect(isClaimCodeExpired(new Date(Date.now() - 29 * 60_000))).toBe(false);
      expect(isClaimCodeExpired(new Date(Date.now() - 31 * 60_000))).toBe(true);
      expect(isClaimCodeExpired(null)).toBe(true);
      expect(isBrazilianMobile('+5542999998888')).toBe(true);
      expect(isBrazilianMobile('+554232221111')).toBe(false);
    });
  });

  describe('público', () => {
    it('claim-info mascara o contato oficial e lista os canais', async () => {
      const out = await service.claimInfo('p1');
      expect(out).toMatchObject({
        parishId: 'p1',
        parishName: 'Paróquia São José',
        diocese: 'Diocese de Ponta Grossa',
        managed: false,
        officialPhoneMasked: '+55•••••••88',
        officialEmailMasked: 's•••@saojose.org.br',
        canVerifyBy: ['PHONE', 'EMAIL'],
      });
      expect(JSON.stringify(out)).not.toContain('99999');
    });

    it('produção sem Twilio/SMTP: nenhum canal oferecido; paróquia com administração = gerida', async () => {
      process.env.NODE_ENV = 'production';
      prisma.user.count.mockResolvedValueOnce(2);
      const out = await service.claimInfo('p1');
      expect(out.canVerifyBy).toEqual([]);
      expect(out.managed).toBe(true);
    });

    it('cria o pedido (com a conta do Bearer), o Lead CLAIM e avisa a plataforma', async () => {
      const out = await service.create(
        'p1',
        {
          name: 'Maria',
          email: 'Maria@X.com',
          phone: '(42) 98888-7777',
          role: 'secretária',
          consent: true,
        } as any,
        { id: 'u1', role: UserRole.FAITHFUL },
      );
      expect(out).toEqual({ claimId: 'cl1', canVerifyBy: ['PHONE', 'EMAIL'] });
      expect(tx.parishClaim.create.mock.calls[0][0].data).toMatchObject({
        userId: 'u1',
        email: 'maria@x.com',
        phone: '+5542988887777',
        method: 'MANUAL',
      });
      expect(tx.lead.create.mock.calls[0][0].data).toMatchObject({
        source: 'CLAIM',
        parishId: 'p1',
        parishName: 'Paróquia São José',
      });
      expect(tx.lead.create.mock.calls[0][0].data.consentAt).toBeInstanceOf(Date);
    });

    describe('S14 — teto de avisos por paróquia', () => {
      const body = { name: 'M', email: 'm@x.com', role: 'pároco', consent: true } as any;
      const sysAdmins = [
        { id: 'sys1', email: 's1@x.com' },
        { id: 'sys2', email: 's2@x.com' },
      ];
      const parishAdmins = [{ id: 'pa1' }, { id: 'pa2' }];

      beforeEach(() => {
        prisma.parish.findUnique.mockResolvedValue({ ...parishRow, managedAt: new Date() });
        prisma.user.findMany.mockImplementation(async ({ where }: any) =>
          where.role === UserRole.SYSTEM_ADMIN ? sysAdmins : parishAdmins,
        );
      });

      it('1º pedido da paróquia em 24 h: avisa a gestão atual e a plataforma, sem push urgente nem SMS', async () => {
        prisma.parishClaim.count.mockResolvedValueOnce(0).mockResolvedValueOnce(3); // e-mail 24 h; fila aberta
        await service.create('p1', body, null);
        await flush();
        expect(tx.$queryRaw).toHaveBeenCalled(); // trava por paróquia
        const countWhere = tx.parishClaim.count.mock.calls[0][0].where;
        expect(countWhere.parishId).toBe('p1');
        expect(Date.now() - countWhere.createdAt.gte.getTime()).toBeGreaterThanOrEqual(24 * 3600_000 - 1000);

        expect(notifications.notifyUsers).toHaveBeenCalledTimes(2);
        const [platform, current] = notifications.notifyUsers.mock.calls[0][0][0] === 'sys1'
          ? notifications.notifyUsers.mock.calls
          : [...notifications.notifyUsers.mock.calls].reverse();
        expect(platform[0]).toEqual(['sys1', 'sys2']);
        expect(platform[1]).toBe('TEAM_BROADCAST');
        expect(platform[3]).toContain('Há 3 pedidos aguardando análise');
        expect(platform[4]).toMatchObject({ kind: 'PARISH_CLAIM_QUEUE' });
        // S2: o e-mail aos SYSTEM_ADMIN sai pelo próprio fluxo — sem e-mail/SMS de reserva
        expect(platform[5]).toEqual({ bulk: true, skipFallback: true });
        expect(email.trySend).toHaveBeenCalledTimes(2);
        expect(current[0]).toEqual(['pa1', 'pa2']);
        expect(current[1]).toBe('TEAM_BROADCAST');
        expect(current[5]).toEqual({ bulk: true });
        for (const call of notifications.notifyUsers.mock.calls) expect(call[1]).not.toBe('URGENT_NOTICE');
      });

      it('outro pedido da mesma paróquia em 24 h (e-mail descartável novo): grava, mas ninguém é avisado de novo', async () => {
        tx.parishClaim.count.mockResolvedValueOnce(1);
        const out = await service.create('p1', { ...body, email: 'novo-descartavel@x.com' }, null);
        await flush();
        expect(out.claimId).toBe('cl1');
        expect(tx.parishClaim.create).toHaveBeenCalled();
        expect(notifications.notifyUsers).not.toHaveBeenCalled();
        expect(email.trySend).not.toHaveBeenCalled();
      });

      it('plataforma agregada: já houve aviso de fila nos últimos 15 min → só a gestão da paróquia é avisada', async () => {
        prisma.notification.findFirst.mockResolvedValueOnce({ id: 'n1' });
        await service.create('p1', body, null);
        await flush();
        const where = prisma.notification.findFirst.mock.calls[0][0].where;
        expect(where.userId).toEqual({ in: ['sys1', 'sys2'] });
        expect(where.data).toEqual({ path: ['kind'], equals: 'PARISH_CLAIM_QUEUE' });
        expect(Date.now() - where.createdAt.gte.getTime()).toBeLessThanOrEqual(15 * 60_000 + 1000);
        expect(notifications.notifyUsers).toHaveBeenCalledTimes(1);
        expect(notifications.notifyUsers.mock.calls[0][0]).toEqual(['pa1', 'pa2']);
        expect(email.trySend).not.toHaveBeenCalled();
      });
    });

    it('limite por e-mail e pedido em aberto repetido', async () => {
      prisma.parishClaim.count.mockResolvedValueOnce(CLAIM_MAX_PER_EMAIL_24H);
      await expect(
        service.create('p1', { name: 'M', email: 'm@x.com', role: 'pároco', consent: true } as any, null),
      ).rejects.toBeInstanceOf(HttpException);
      prisma.parishClaim.findFirst.mockResolvedValueOnce({ id: 'cl0' });
      await expect(
        service.create('p1', { name: 'M', email: 'm@x.com', role: 'pároco', consent: true } as any, null),
      ).rejects.toBeInstanceOf(ConflictException);
      prisma.parish.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.create('px', { name: 'M', email: 'm@x.com', role: 'pároco', consent: true } as any, null),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('envia o código ao contato OFICIAL (nunca ao de quem pediu) e grava só o hash', async () => {
      prisma.parishClaim.findUnique.mockResolvedValue(claimRow({ phone: '+5541911112222' }));
      const out = await service.sendCode('cl1', 'PHONE');
      expect(out).toEqual({ sentTo: '+55•••••••88' });
      expect(messaging.sendSms).toHaveBeenCalledWith('+5542999998888', expect.stringMatching(/código \d{6}/));
      const code = messaging.sendSms.mock.calls[0][1].match(/código (\d{6})/)[1];
      const data = tx.parishClaim.updateMany.mock.calls[0][0].data;
      expect(data.codeHash).toBe(hashClaimCode(SECRET, 'cl1', code));
      expect(data.method).toBe('PHONE_CODE');
      expect(data.codeSends).toEqual({ increment: 1 });
      expect(tx.parishClaim.updateMany.mock.calls[0][0].where).toEqual({
        id: 'cl1',
        status: 'PENDING',
        codeSends: { lt: 3 },
      });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { codeSent: true, channel: 'PHONE', parishId: 'p1' },
        }),
      );
    });

    it('3 envios por pedido e teto por paróquia → 429', async () => {
      prisma.parishClaim.findUnique.mockResolvedValue(claimRow());
      // 4º envio: o incremento condicional (codeSends < 3) não casa
      tx.parishClaim.updateMany.mockResolvedValueOnce({ count: 0 });
      await expect(service.sendCode('cl1', 'EMAIL')).rejects.toThrow(/3 códigos/);
      // pedido analisado no meio do caminho → 409
      tx.parishClaim.updateMany.mockResolvedValueOnce({ count: 0 });
      tx.parishClaim.findUnique.mockResolvedValueOnce({ status: 'APPROVED' });
      await expect(service.sendCode('cl1', 'EMAIL')).rejects.toBeInstanceOf(ConflictException);
      tx.parishClaim.aggregate.mockResolvedValueOnce({ _sum: { codeSends: 6 } });
      await expect(service.sendCode('cl1', 'EMAIL')).rejects.toThrow(/muitos códigos hoje/);
      expect(email.trySend).not.toHaveBeenCalled();
    });

    it('SMS indisponível em produção → 503 explicado, sem gastar envio; fixo → 400', async () => {
      process.env.NODE_ENV = 'production';
      prisma.parishClaim.findUnique.mockResolvedValue(claimRow());
      await expect(service.sendCode('cl1', 'PHONE')).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(tx.parishClaim.updateMany).not.toHaveBeenCalled();

      process.env.NODE_ENV = 'test';
      prisma.parish.findUnique.mockResolvedValueOnce({
        ...parishRow,
        phone: '(42) 3222-1111',
      });
      await expect(service.sendCode('cl1', 'PHONE')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('verificar: código certo → VERIFIED; errado conta tentativa; esgotado → 429; vencido → 400', async () => {
      const codeHash = hashClaimCode(SECRET, 'cl1', '123456');
      prisma.parishClaim.findUnique.mockResolvedValue(claimRow({ codeHash, codeSentAt: new Date() }));

      await expect(service.verifyCode('cl1', '654321')).rejects.toThrow(/Restam 4 tentativas/);
      expect(prisma.parishClaim.updateMany.mock.calls[0][0]).toMatchObject({
        where: {
          id: 'cl1',
          status: 'PENDING',
          codeAttempts: { lt: CLAIM_CODE_MAX_ATTEMPTS },
        },
        data: { codeAttempts: { increment: 1 } },
      });

      await expect(service.verifyCode('cl1', '123456')).resolves.toEqual({
        status: 'VERIFIED',
      });
      expect(prisma.parishClaim.updateMany.mock.calls[2][0].data).toMatchObject({ status: 'VERIFIED', codeHash: null });

      prisma.parishClaim.updateMany.mockResolvedValueOnce({ count: 0 });
      await expect(service.verifyCode('cl1', '123456')).rejects.toBeInstanceOf(HttpException);

      prisma.parishClaim.findUnique.mockResolvedValue(
        claimRow({ codeHash, codeSentAt: new Date(Date.now() - 31 * 60_000) }),
      );
      await expect(service.verifyCode('cl1', '123456')).rejects.toThrow(/venceu/);
    });
  });

  describe('aprovação (SYSTEM_ADMIN)', () => {
    it('pedido com conta: promove a PARISH_ADMIN titular; AUTO_TRIAL; lead WON; paróquia gerida', async () => {
      prisma.parishClaim.findUnique.mockResolvedValue(claimRow({ userId: 'u1', status: 'VERIFIED' }));
      tx.user.findUnique.mockResolvedValue({
        id: 'u1',
        role: UserRole.FAITHFUL,
        parishId: null,
        isActive: true,
        anonymizedAt: null,
      });
      tx.communityPlan.createMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });

      const out: any = await service.review('cl1', { action: 'APPROVE' } as any, reviewer);

      expect(users.applyGrantToExistingAccount).toHaveBeenCalledWith(tx, 'u1', {
        role: UserRole.PARISH_ADMIN,
        dioceseId: 'd1',
        parishId: 'p1',
        communityId: null,
        holder: true,
      });
      expect(tx.parishClaim.update).toHaveBeenCalledWith(expect.objectContaining({ data: { grantedUserId: 'u1' } }));
      expect(invites.createClaimHolderInvite).not.toHaveBeenCalled();
      // Só comunidades ATIVAS e SEM linha de plano (o piloto, com plano, não entra)
      expect(tx.community.findMany.mock.calls[0][0].where).toEqual({
        parishId: 'p1',
        status: 'ACTIVE',
        deletedAt: null,
        communityPlan: { is: null },
      });
      expect(tx.communityPlan.createMany.mock.calls[0][0]).toMatchObject({
        data: [{ communityId: 'c1', status: 'TRIAL' }],
        skipDuplicates: true,
      });
      const trialEndsAt = tx.communityPlan.createMany.mock.calls[0][0].data[0].trialEndsAt as Date;
      expect(Math.round((trialEndsAt.getTime() - Date.now()) / 86400_000)).toBe(30);
      // c2 ganhou plano no meio do caminho (createMany count 0): sem evento
      expect(tx.communityPlanEvent.create).toHaveBeenCalledTimes(1);
      expect(tx.communityPlanEvent.create.mock.calls[0][0].data).toMatchObject({
        communityId: 'c1',
        action: 'AUTO_TRIAL',
        toStatus: 'TRIAL',
      });
      expect(out.trialCommunityIds).toEqual(['c1']);
      expect(planAccess.invalidate).toHaveBeenCalledWith('c1');
      expect(tx.parish.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'p1', managedAt: null } }),
      );
      expect(tx.lead.updateMany.mock.calls[0][0]).toMatchObject({
        where: { source: 'CLAIM', parishId: 'p1' },
        data: { status: 'WON' },
      });
    });

    it('pedido sem conta: cria o convite de titular e devolve url + texto do WhatsApp', async () => {
      prisma.parishClaim.findUnique.mockResolvedValue(claimRow());
      const out: any = await service.review('cl1', { action: 'APPROVE' } as any, reviewer);
      expect(invites.createClaimHolderInvite).toHaveBeenCalledWith(
        tx,
        expect.objectContaining({
          parish: expect.objectContaining({ id: 'p1' }),
          email: 'maria@x.com',
          invitedByUserId: 'sys',
        }),
      );
      expect(out.inviteUrl).toBe('https://painel/convite/tok');
      expect(out.whatsappText).toContain('convidou você');
      expect(invites.sendInviteEmail).toHaveBeenCalled();
    });

    it('conta de nível superior ou de outra paróquia não é rebaixada/movida → 409 (nada gravado)', async () => {
      prisma.parishClaim.findUnique.mockResolvedValue(claimRow({ userId: 'u1' }));
      tx.user.findUnique.mockResolvedValueOnce({
        id: 'u1',
        role: UserRole.DIOCESAN_ADMIN,
        isActive: true,
        anonymizedAt: null,
      });
      await expect(service.review('cl1', { action: 'APPROVE' } as any, reviewer)).rejects.toBeInstanceOf(
        ConflictException,
      );
      tx.user.findUnique.mockResolvedValueOnce({
        id: 'u1',
        role: UserRole.PARISH_ADMIN,
        parishId: 'p9',
        isActive: true,
        anonymizedAt: null,
      });
      await expect(service.review('cl1', { action: 'APPROVE' } as any, reviewer)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(users.applyGrantToExistingAccount).not.toHaveBeenCalled();
    });

    it('revisão concorrente (troca condicional) ou pedido já analisado → 409', async () => {
      prisma.parishClaim.findUnique.mockResolvedValue(claimRow());
      tx.parishClaim.updateMany.mockResolvedValueOnce({ count: 0 });
      await expect(service.review('cl1', { action: 'APPROVE' } as any, reviewer)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(tx.communityPlan.createMany).not.toHaveBeenCalled();

      prisma.parishClaim.findUnique.mockResolvedValue(claimRow({ status: 'APPROVED' }));
      await expect(service.review('cl1', { action: 'APPROVE' } as any, reviewer)).rejects.toBeInstanceOf(
        ConflictException,
      );
      prisma.parishClaim.findUnique.mockResolvedValue(claimRow({ status: 'REJECTED' }));
      await expect(service.review('cl1', { action: 'REJECT' } as any, reviewer)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('S12: REJECT num pedido APROVADO desfaz a aprovação e revoga o convite de titular pendente', async () => {
      prisma.parishClaim.findUnique.mockResolvedValue(claimRow({ status: 'APPROVED', email: 'Maria@X.com' }));
      tx.userInvite.updateMany.mockResolvedValueOnce({ count: 1 });
      const out: any = await service.review('cl1', { action: 'REJECT', note: 'fraude' } as any, reviewer);
      expect(tx.parishClaim.updateMany.mock.calls[0][0]).toMatchObject({
        where: { id: 'cl1', status: 'APPROVED' },
        data: { status: 'REJECTED', reviewNote: 'fraude', reviewedByUserId: 'sys' },
      });
      expect(tx.userInvite.updateMany.mock.calls[0][0]).toMatchObject({
        where: {
          holder: true,
          parishId: 'p1',
          email: { equals: 'Maria@X.com', mode: 'insensitive' },
          acceptedAt: null,
          revokedAt: null,
        },
      });
      expect(tx.userInvite.updateMany.mock.calls[0][0].data.revokedAt).toBeInstanceOf(Date);
      expect(tx.lead.updateMany.mock.calls[0][0].data).toEqual({ status: 'LOST' });
      expect(out).toMatchObject({ action: 'REJECT', approvalUndone: true, revokedInvites: 1 });
      expect(out.warning).toBeUndefined();
      expect(users.applyGrantToExistingAccount).not.toHaveBeenCalled();
    });

    it('S12: desfazer com conta já promovida avisa para ajustar na tela de Usuários; corrida → 409', async () => {
      prisma.parishClaim.findUnique.mockResolvedValue(claimRow({ status: 'APPROVED', grantedUserId: 'u9' }));
      const out: any = await service.review('cl1', { action: 'REJECT' } as any, reviewer);
      expect(out.grantedUserId).toBe('u9');
      expect(out.warning).toContain('tela de Usuários');

      tx.parishClaim.updateMany.mockResolvedValueOnce({ count: 0 });
      await expect(service.review('cl1', { action: 'REJECT' } as any, reviewer)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('S2: aviso de aprovado/rejeitado à conta de quem pediu vai sem e-mail de reserva (o e-mail sai pelo fluxo)', async () => {
      prisma.parishClaim.findUnique.mockResolvedValue(claimRow({ userId: 'u1' }));
      await service.review('cl1', { action: 'REJECT' } as any, reviewer);
      expect(email.trySend).toHaveBeenCalledWith('maria@x.com', 'Pedido de gestão não aprovado', expect.any(String));
      expect(notifications.notifyUser).toHaveBeenCalledWith(
        'u1',
        'TEAM_BROADCAST',
        'Pedido de gestão não aprovado',
        expect.any(String),
        expect.objectContaining({ kind: 'PARISH_CLAIM' }),
        { skipFallback: true },
      );
    });

    it('rejeitar: status REJECTED com a nota; ninguém promovido', async () => {
      prisma.parishClaim.findUnique.mockResolvedValue(claimRow());
      await service.review('cl1', { action: 'REJECT', note: 'sem documento' } as any, reviewer);
      expect(prisma.parishClaim.updateMany.mock.calls[0][0]).toMatchObject({
        where: { id: 'cl1' },
        data: {
          status: 'REJECTED',
          reviewNote: 'sem documento',
          reviewedByUserId: 'sys',
        },
      });
      expect(users.applyGrantToExistingAccount).not.toHaveBeenCalled();
    });
  });
});
