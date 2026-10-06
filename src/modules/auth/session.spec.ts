import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { AuthService, hashRefreshToken, REFRESH_REUSE_GRACE_MS } from './auth.service';
import { PrismaService } from '../../database/prisma.service';
import { MembersService } from '../members/members.service';
import { OtpService } from './otp.service';
import { AuditService } from '../../common/audit.service';
import { ConsentsService } from '../consents/consents.service';
import { SessionSecurityService } from './session-security.service';
import { MessagingService } from '../messaging/messaging.service';
import { TERMS_VERSION } from '../users/terms.constants';

/**
 * Sessão por aparelho (auditoria 10/2026): refresh token só como hash (B48),
 * rotação atômica e detecção de reuso (B38/B46), logout só deste aparelho
 * (M29/B3), push do aparelho (M42) e cadastro só com celular verificado (M7/A23).
 * JwtService REAL: os tokens são assinados e conferidos de verdade.
 */
describe('AuthService — sessão por aparelho e refresh token', () => {
  let service: AuthService;
  let jwt: JwtService;
  let prisma: any;
  let security: any;
  let audit: { log: jest.Mock };
  let otp: { decodeVerifiedPhoneToken: jest.Mock };
  let members: { ensureProfileForUser: jest.Mock };

  const config: Record<string, string> = { JWT_SECRET: 'segredo-access', JWT_REFRESH_SECRET: 'segredo-refresh', JWT_EXPIRES_IN: '15m', JWT_REFRESH_EXPIRES_IN: '7d' };
  const user = { id: 'u1', email: 'maria@x.com', role: UserRole.FAITHFUL, isActive: true, dioceseId: null, parishId: null, communityId: null };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      refreshToken: {
        create: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      community: { findUnique: jest.fn().mockResolvedValue({ parishId: 'p1', parish: { dioceseId: 'd1' } }) },
      $transaction: jest.fn(),
    };
    security = { revokeSessions: jest.fn() };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    otp = { decodeVerifiedPhoneToken: jest.fn() };
    members = { ensureProfileForUser: jest.fn().mockResolvedValue(null) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        JwtService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: jest.fn((key: string) => config[key]) } },
        { provide: MembersService, useValue: members },
        { provide: OtpService, useValue: otp },
        { provide: AuditService, useValue: audit },
        { provide: ConsentsService, useValue: { grantInitialConsents: jest.fn() } },
        { provide: SessionSecurityService, useValue: security },
        { provide: MessagingService, useValue: { normalizePhone: (raw: string) => MessagingService.prototype.normalizePhone.call(null, raw) } },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
    jwt = moduleRef.get(JwtService);
  });

  /** Emite um par como o login faria e devolve também a linha gravada. */
  const issue = async (session: { sessionId?: string; authTime?: number | null } = {}) => {
    const tokens = await (service as any).generateTokens(user.id, user.email, user.role, undefined, undefined, undefined, session);
    const row = prisma.refreshToken.create.mock.calls.at(-1)[0].data;
    return { ...tokens, row };
  };

  describe('emissão', () => {
    it('grava só o SHA-256 do refresh token, com a sessão e a expiração do próprio JWT', async () => {
      const { refreshToken, accessToken, row } = await issue();

      expect(row.token).toBe(hashRefreshToken(refreshToken));
      expect(row.token).not.toContain('.');
      const access: any = jwt.decode(accessToken);
      const refresh: any = jwt.decode(refreshToken);
      expect(row.sessionId).toBe(access.sid);
      expect(refresh.sid).toBe(access.sid);
      expect(row.expiresAt.getTime()).toBe(refresh.exp * 1000);
      // login com senha agora: `at` presente (ação sensível aceita login recente)
      expect(Math.abs(access.at - Date.now() / 1000)).toBeLessThan(5);
    });

    it('token emitido numa renovação de sessão antiga não ganha `at` (não conta como login recente)', async () => {
      const { accessToken } = await issue({ sessionId: 's-velha', authTime: null });
      const access: any = jwt.decode(accessToken);
      expect(access.sid).toBe('s-velha');
      expect(access.at).toBeUndefined();
    });
  });

  describe('refresh', () => {
    it('consome o token de forma atômica ANTES de emitir e mantém a sessão e o horário do login', async () => {
      const first = await issue({ authTime: 1_700_000_000 });
      prisma.refreshToken.findFirst.mockResolvedValue({ ...first.row, id: 'rt1', userId: 'u1', rotatedAt: null });

      const next = await service.refreshToken(first.refreshToken);

      expect(prisma.refreshToken.findFirst).toHaveBeenCalledWith({
        where: { token: { in: [hashRefreshToken(first.refreshToken), first.refreshToken] } },
      });
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { id: 'rt1', rotatedAt: null },
        data: { rotatedAt: expect.any(Date), sessionId: first.row.sessionId },
      });
      const access: any = jwt.decode(next.accessToken);
      expect(access.sid).toBe(first.row.sessionId);
      expect(access.at).toBe(1_700_000_000);
      expect(prisma.refreshToken.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
        prisma.refreshToken.create.mock.invocationCallOrder.at(-1),
      );
    });

    it('linha antiga em claro (sem sessão) ainda vale e passa a ter sessão', async () => {
      const legacy = jwt.sign({ sub: 'u1', typ: 'refresh', jti: 'x' }, { secret: config.JWT_REFRESH_SECRET, expiresIn: '7d' });
      prisma.refreshToken.findFirst.mockResolvedValue({ id: 'rt-old', token: legacy, userId: 'u1', sessionId: null, rotatedAt: null, expiresAt: new Date(Date.now() + 1e6) });

      const next = await service.refreshToken(legacy);

      const sid = prisma.refreshToken.updateMany.mock.calls[0][0].data.sessionId;
      expect(sid).toEqual(expect.any(String));
      expect((jwt.decode(next.accessToken) as any).sid).toBe(sid);
    });

    it('duas abas com o mesmo token: a que perde a corrida recebe 401 e NÃO cria refresh órfão (B38)', async () => {
      const first = await issue();
      prisma.refreshToken.create.mockClear();
      prisma.refreshToken.findFirst.mockResolvedValue({ ...first.row, id: 'rt1', userId: 'u1', rotatedAt: null });
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.refreshToken(first.refreshToken)).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('token já trocado há poucos segundos: 401 sem derrubar a sessão (concorrência legítima)', async () => {
      const first = await issue();
      prisma.refreshToken.findFirst.mockResolvedValue({ ...first.row, id: 'rt1', userId: 'u1', rotatedAt: new Date(Date.now() - 2_000) });

      await expect(service.refreshToken(first.refreshToken)).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.refreshToken.deleteMany).not.toHaveBeenCalled();
    });

    it('REUSO de token trocado fora da janela: revoga a família inteira e audita (B46)', async () => {
      const first = await issue();
      prisma.refreshToken.findFirst.mockResolvedValue({
        ...first.row,
        id: 'rt1',
        userId: 'u1',
        rotatedAt: new Date(Date.now() - REFRESH_REUSE_GRACE_MS - 5_000),
      });

      await expect(service.refreshToken(first.refreshToken)).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1', sessionId: first.row.sessionId } });
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ metadata: { refreshTokenReuse: true, sessionRevoked: true } }));
    });

    it('token de outra conta ou assinatura inválida → 401', async () => {
      const first = await issue();
      prisma.refreshToken.findFirst.mockResolvedValue({ ...first.row, id: 'rt1', userId: 'outra', rotatedAt: null });
      await expect(service.refreshToken(first.refreshToken)).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(service.refreshToken('lixo')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('com sessão no access token: apaga só a sessão deste aparelho (os outros seguem)', async () => {
      await service.logout({ id: 'u1', sessionId: 's-celular' });
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'u1', OR: [{ sessionId: { in: ['s-celular'] } }] },
      });
    });

    it('com o refresh token no corpo: encerra a sessão dele também', async () => {
      prisma.refreshToken.findFirst.mockResolvedValue({ id: 'rt9', userId: 'u1', sessionId: 's-aba' });
      await service.logout({ id: 'u1', sessionId: 's-celular' }, { refreshToken: 'rt-jwt' });
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'u1', OR: [{ sessionId: { in: ['s-celular', 's-aba'] } }] },
      });
    });

    it('refresh token de OUTRA conta no corpo é ignorado', async () => {
      prisma.refreshToken.findFirst.mockResolvedValue({ id: 'rt9', userId: 'outra', sessionId: 's-dela' });
      await service.logout({ id: 'u1', sessionId: 's-celular' }, { refreshToken: 'rt-jwt' });
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'u1', OR: [{ sessionId: { in: ['s-celular'] } }] },
      });
    });

    it('sem corpo e com token antigo (sem sessão): comportamento antigo, todas as sessões', async () => {
      await service.logout({ id: 'u1' });
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    });

    it('com pushToken: desliga o push deste aparelho na conta (só se for o mesmo token)', async () => {
      await service.logout({ id: 'u1', sessionId: 's1' }, { pushToken: 'ExponentPushToken[a]' });
      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: 'u1', pushToken: 'ExponentPushToken[a]' },
        data: { pushToken: null, pushTokenUpdatedAt: expect.any(Date) },
      });
    });

    it('sair de todos os aparelhos revoga tudo e desliga o push', async () => {
      await service.logoutAll('u1');
      expect(security.revokeSessions).toHaveBeenCalledWith('u1');
      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { pushToken: null, pushTokenUpdatedAt: expect.any(Date) } });
    });
  });

  describe('validateUser (a cada requisição)', () => {
    it('com sid: sessionAlive reflete se a sessão do aparelho ainda existe', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...user, member: null, communities: [], forcePasswordChange: false });
      prisma.refreshToken.findFirst.mockResolvedValueOnce(null);
      await expect(service.validateUser('u1', 's1')).resolves.toHaveProperty('sessionAlive', false);
      prisma.refreshToken.findFirst.mockResolvedValueOnce({ id: 'rt' });
      await expect(service.validateUser('u1', 's1')).resolves.toHaveProperty('sessionAlive', true);
      expect(prisma.refreshToken.findFirst).toHaveBeenCalledWith({ where: { userId: 'u1', sessionId: 's1' }, select: { id: true } });
    });

    it('sem sid (token antigo): não consulta a sessão', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...user, member: null, communities: [] });
      await expect(service.validateUser('u1')).resolves.toHaveProperty('sessionAlive', true);
      expect(prisma.refreshToken.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('usuário devolvido no login/2FA', () => {
    it('traz a troca de senha obrigatória e o aviso de termos (versão vigente)', async () => {
      const pending: any = await (service as any).mapUserResponse({ ...user, forcePasswordChange: true, acceptedTermsAt: null, acceptedTermsVersion: null });
      expect(pending).toMatchObject({ forcePasswordChange: true, termsAcceptanceRequired: true, termsVersion: TERMS_VERSION });
      const accepted: any = await (service as any).mapUserResponse({ ...user, forcePasswordChange: false, acceptedTermsAt: new Date(), acceptedTermsVersion: TERMS_VERSION });
      expect(accepted.termsAcceptanceRequired).toBe(false);
    });
  });

  describe('cadastro público e celular (M7/A23)', () => {
    const created = { id: 'u9', email: 'nova@x.com', role: UserRole.FAITHFUL, dioceseId: 'd1', parishId: 'p1', communityId: 'c1', member: null };

    it('ignora `phone` sem verifiedPhoneToken: nada de ocupar o número de outra pessoa', async () => {
      const tx = { user: { create: jest.fn().mockResolvedValue(created) }, member: { findFirst: jest.fn(), update: jest.fn() }, $queryRaw: jest.fn() };
      prisma.$transaction.mockImplementation((fn: any) => fn(tx));

      await service.register({ email: 'nova@x.com', password: 'SenhaForte@123', name: 'Nova', phone: '+5542999990000', communityId: 'c1' } as any);

      expect(tx.user.create.mock.calls[0][0].data.phone).toBeNull();
      expect(tx.member.findFirst).not.toHaveBeenCalled();
      expect(members.ensureProfileForUser.mock.calls[0][1].phone).toBeNull();
    });

    it('celular verificado adota o membro cadastrado com telefone FORMATADO (comparação por dígitos)', async () => {
      otp.decodeVerifiedPhoneToken.mockReturnValue('+5542999998883');
      const tx = {
        user: { create: jest.fn().mockResolvedValue(created) },
        member: { findFirst: jest.fn().mockResolvedValue(null), update: jest.fn() },
        $queryRaw: jest.fn().mockResolvedValue([{ id: 'm-imbituva' }]),
      };
      prisma.$transaction.mockImplementation((fn: any) => fn(tx));

      await service.register({ email: 'nova@x.com', password: 'SenhaForte@123', name: 'Nova', communityId: 'c1', verifiedPhoneToken: 'tok' } as any);

      expect(tx.user.create.mock.calls[0][0].data.phone).toBe('+5542999998883');
      // dígitos com e sem o 55 entram como parâmetros da consulta
      const params = tx.$queryRaw.mock.calls[0].slice(1);
      expect(params).toEqual(['5542999998883', '42999998883', 'c1']);
      expect(tx.member.update).toHaveBeenCalledWith({
        where: { id: 'm-imbituva' },
        data: { userId: 'u9', fullName: 'Nova', email: 'nova@x.com', phone: '+5542999998883' },
      });
      expect(members.ensureProfileForUser.mock.calls[0][2]).toBe('m-imbituva');
    });
  });
});
