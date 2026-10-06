import { BadRequestException, ForbiddenException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'crypto';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
import { JwtStrategy } from './strategies/jwt.strategy';
import { isAllowedDuringPasswordChange, parseEnforcement, PASSWORD_CHANGE_REQUIRED } from './password-change-policy';
import { isAllowedDuringTermsAcceptance, TERMS_ACCEPTANCE_REQUIRED } from './terms-policy';
import { TERMS_VERSION } from '../users/terms.constants';
import { OtpService } from './otp.service';
import { SessionSecurityService } from './session-security.service';
import { LoginAttemptsService } from './login-attempts.service';
import { AuthCleanupService } from './auth-cleanup.service';
import { MessagingService } from '../messaging/messaging.service';
import { maskEmail, maskPhone } from '../messaging/log-mask';
import { UsersService } from '../users/users.service';

/**
 * Endurecimento de sessão e senha (auditoria 10/2026): troca de senha
 * obrigatória (M18), sessão por aparelho na JwtStrategy (M29), reautenticação
 * para ativar o 2FA (M5), OTP com hash e contador atômico (B13/B14), limpeza
 * de credenciais vencidas (B47), nada de segredo no log de produção (M17/B23)
 * e troca de senha que derruba as outras sessões (B46).
 */

describe('JwtStrategy — sessão do aparelho e troca de senha obrigatória', () => {
  const build = (validated: any, env: Record<string, string> = {}) => {
    const authService = { validateUser: jest.fn().mockResolvedValue(validated) };
    const config = { get: jest.fn((key: string) => ({ JWT_SECRET: 's', ...env })[key]) };
    const strategy = new JwtStrategy(config as any, authService as any);
    return { strategy, authService };
  };
  const base = { id: 'u1', role: UserRole.FAITHFUL, isActive: true, sessionsRevokedAt: null, sessionAlive: true, forcePasswordChange: false };
  const req = (method: string, url: string) => ({ method, originalUrl: url }) as any;
  const now = Math.floor(Date.now() / 1000);

  it('repassa sid e authTime para a sessão e consulta a sessão do aparelho', async () => {
    const { strategy, authService } = build(base);
    const session: any = await strategy.validate(req('GET', '/api/v1/events'), { sub: 'u1', sid: 's1', at: now, iat: now });
    expect(authService.validateUser).toHaveBeenCalledWith('u1', 's1');
    expect(session).toMatchObject({ id: 'u1', sessionId: 's1', authTime: now });
    expect(session).not.toHaveProperty('sessionAlive');
    expect(session).not.toHaveProperty('sessionsRevokedAt');
  });

  it('sessão do aparelho encerrada (logout/reuso) → 401 na hora, mesmo com o access token dentro do prazo', async () => {
    const { strategy } = build({ ...base, sessionAlive: false });
    await expect(strategy.validate(req('GET', '/api/v1/events'), { sub: 'u1', sid: 's1', iat: now })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('token antigo sem sid continua valendo (até expirar) e sem checagem de sessão', async () => {
    const { strategy, authService } = build(base);
    await expect(strategy.validate(req('GET', '/api/v1/events'), { sub: 'u1', iat: now })).resolves.toMatchObject({ sessionId: null, authTime: null });
    expect(authService.validateUser).toHaveBeenCalledWith('u1', undefined);
  });

  it('PASSWORD_CHANGE_ENFORCEMENT=on: troca pendente bloqueia as demais rotas com o código', async () => {
    const { strategy } = build({ ...base, forcePasswordChange: true }, { PASSWORD_CHANGE_ENFORCEMENT: 'on' });
    const error = await strategy.validate(req('GET', '/api/v1/events?x=1'), { sub: 'u1', sid: 's1', iat: now }).catch((e) => e);
    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as ForbiddenException).getResponse()).toMatchObject({ code: PASSWORD_CHANGE_REQUIRED });
  });

  it('PASSWORD_CHANGE_ENFORCEMENT=on: troca de senha, /users/me e sair continuam liberados', async () => {
    const { strategy } = build({ ...base, forcePasswordChange: true }, { PASSWORD_CHANGE_ENFORCEMENT: 'on' });
    for (const [method, url] of [
      ['POST', '/api/v1/users/u1/change-password'],
      ['GET', '/api/v1/users/me'],
      ['POST', '/api/v1/auth/logout'],
      ['POST', '/api/v1/auth/logout-all'],
      ['PATCH', '/api/v1/users/me/push-token'],
      ['POST', '/api/v1/users/me/accept-terms'],
    ]) {
      await expect(strategy.validate(req(method, url), { sub: 'u1', sid: 's1', iat: now })).resolves.toBeTruthy();
    }
  });

  it('padrão (log): não bloqueia — o app 1.1.0 não tem a tela de troca', async () => {
    const { strategy } = build({ ...base, forcePasswordChange: true });
    await expect(strategy.validate(req('GET', '/api/v1/events'), { sub: 'u1', sid: 's1', iat: now })).resolves.toBeTruthy();
  });

  it('política: modos e rotas', () => {
    expect(parseEnforcement(undefined)).toBe('log');
    expect(parseEnforcement(' ON ')).toBe('on');
    expect(parseEnforcement('off')).toBe('off');
    expect(isAllowedDuringPasswordChange('DELETE', '/api/v1/users/me')).toBe(false);
    expect(isAllowedDuringPasswordChange('GET', '/api/v1/users/me/data-export')).toBe(false);
  });

  describe('#29 — TERMS_ENFORCEMENT (aceite dos termos no servidor)', () => {
    const pending = { ...base, acceptedTermsAt: null, acceptedTermsVersion: null };
    const accepted = { ...base, acceptedTermsAt: new Date(), acceptedTermsVersion: TERMS_VERSION };

    it('on: aceite pendente bloqueia as demais rotas com o código', async () => {
      const { strategy } = build(pending, { TERMS_ENFORCEMENT: 'on' });
      const error = await strategy.validate(req('GET', '/api/v1/events'), { sub: 'u1', sid: 's1', iat: now }).catch((e) => e);
      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getResponse()).toMatchObject({ code: TERMS_ACCEPTANCE_REQUIRED });
    });

    it('on: perfil, aceite, sair, push, troca de senha e excluir a conta continuam liberados', async () => {
      const { strategy } = build(pending, { TERMS_ENFORCEMENT: 'on' });
      for (const [method, url] of [
        ['GET', '/api/v1/users/me'],
        ['DELETE', '/api/v1/users/me'],
        ['POST', '/api/v1/users/me/accept-terms'],
        ['POST', '/api/v1/auth/logout'],
        ['POST', '/api/v1/auth/logout-all'],
        ['PATCH', '/api/v1/users/me/push-token'],
        ['POST', '/api/v1/users/u1/change-password'],
      ]) {
        await expect(strategy.validate(req(method, url), { sub: 'u1', sid: 's1', iat: now })).resolves.toBeTruthy();
      }
    });

    it('on: conta com o aceite da versão vigente passa; versão antiga não', async () => {
      const ok = build(accepted, { TERMS_ENFORCEMENT: 'on' });
      await expect(ok.strategy.validate(req('GET', '/api/v1/events'), { sub: 'u1', sid: 's1', iat: now })).resolves.toBeTruthy();
      const old = build({ ...accepted, acceptedTermsVersion: 'v-velha' }, { TERMS_ENFORCEMENT: 'on' });
      await expect(old.strategy.validate(req('GET', '/api/v1/events'), { sub: 'u1', sid: 's1', iat: now })).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('padrão (log) e off: não bloqueiam; o req.user não carrega os campos do aceite', async () => {
      const log = build(pending);
      const session = await log.strategy.validate(req('GET', '/api/v1/events'), { sub: 'u1', sid: 's1', iat: now });
      expect(session).not.toHaveProperty('acceptedTermsAt');
      expect(session).not.toHaveProperty('acceptedTermsVersion');
      const off = build(pending, { TERMS_ENFORCEMENT: 'off' });
      await expect(off.strategy.validate(req('GET', '/api/v1/events'), { sub: 'u1', sid: 's1', iat: now })).resolves.toBeTruthy();
    });

    it('política: rotas liberadas', () => {
      expect(isAllowedDuringTermsAcceptance('GET', '/api/v1/users/me?x=1')).toBe(true);
      expect(isAllowedDuringTermsAcceptance('GET', '/api/v1/users/me/data-export')).toBe(false);
      expect(isAllowedDuringTermsAcceptance('PATCH', '/api/v1/users/me')).toBe(false);
    });
  });
});

describe('OtpService — código com hash, contador atômico e uso único (B13/B14)', () => {
  const secret = 'segredo';
  const hmac = (phone: string, code: string) => createHmac('sha256', `${secret}:phone-otp`).update(`${phone}:${code}`).digest('hex');
  const build = () => {
    const prisma: any = {
      user: { findUnique: jest.fn().mockResolvedValue(null) },
      phoneOtp: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn(),
        findFirst: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const messaging = {
      normalizePhone: (raw: string) => MessagingService.prototype.normalizePhone.call(null, raw),
      sendSms: jest.fn().mockResolvedValue(undefined),
    };
    const jwt = { sign: jest.fn(() => 'verified-token') };
    const service = new OtpService(prisma, jwt as any, { get: () => secret } as any, messaging as any);
    return { service, prisma, messaging };
  };
  const phone = '+5542999998883';
  const pending = (code: string) => ({ id: 'otp1', phone, code, attempts: 0, verified: false, expiresAt: new Date(Date.now() + 60_000) });

  it('grava o HMAC do código (nunca o código) e manda o código por SMS', async () => {
    const { service, prisma, messaging } = build();
    await service.sendOtp('(42) 99999-8883');
    const stored = prisma.phoneOtp.create.mock.calls[0][0].data.code;
    const sentCode = messaging.sendSms.mock.calls[0][1].match(/\d{6}/)[0];
    expect(stored).toBe(hmac(phone, sentCode));
    expect(stored).not.toContain(sentCode);
  });

  it('SMS que não saiu: a linha (com o telefone) é apagada e o erro sobe', async () => {
    const { service, prisma, messaging } = build();
    messaging.sendSms.mockRejectedValue(new ServiceUnavailableException());
    await expect(service.sendOtp(phone)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(prisma.phoneOtp.deleteMany).toHaveBeenLastCalledWith({ where: { phone } });
  });

  it('código certo: incrementa de forma atômica, apaga as linhas do telefone e emite o token', async () => {
    const { service, prisma } = build();
    prisma.phoneOtp.findFirst.mockResolvedValue(pending(hmac(phone, '123456')));
    await expect(service.verifyOtp(phone, '123456')).resolves.toEqual({ verifiedPhoneToken: 'verified-token' });
    expect(prisma.phoneOtp.updateMany).toHaveBeenCalledWith({
      where: { id: 'otp1', attempts: { lt: 5 } },
      data: { attempts: { increment: 1 } },
    });
    expect(prisma.phoneOtp.deleteMany).toHaveBeenCalledWith({ where: { phone } });
  });

  it('rajada paralela: quem não ganha o incremento (limite atingido) nem compara o código', async () => {
    const { service, prisma } = build();
    prisma.phoneOtp.findFirst.mockResolvedValue(pending(hmac(phone, '123456')));
    prisma.phoneOtp.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.verifyOtp(phone, '123456')).rejects.toThrow('Muitas tentativas');
    expect(prisma.phoneOtp.deleteMany).not.toHaveBeenCalled();
  });

  it('código errado → 400 e a linha fica (com a tentativa contada)', async () => {
    const { service, prisma } = build();
    prisma.phoneOtp.findFirst.mockResolvedValue(pending(hmac(phone, '123456')));
    await expect(service.verifyOtp(phone, '654321')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.phoneOtp.deleteMany).not.toHaveBeenCalled();
  });

  it('linha de antes do hash (código em claro, até 10 min) ainda é aceita', async () => {
    const { service, prisma } = build();
    prisma.phoneOtp.findFirst.mockResolvedValue(pending('123456'));
    await expect(service.verifyOtp(phone, '123456')).resolves.toHaveProperty('verifiedPhoneToken');
  });
});

describe('SessionSecurityService.assertRecentAuth — ativar o 2FA (M5)', () => {
  const build = (hash: string) => {
    const service = Object.create(SessionSecurityService.prototype) as SessionSecurityService;
    (service as any).prisma = { user: { findUnique: jest.fn().mockResolvedValue({ password: hash }) } };
    return service;
  };
  let hash: string;
  beforeAll(async () => {
    hash = await bcrypt.hash('SenhaCerta@1', 4);
  });

  it('com a senha: confere no banco', async () => {
    const service = build(hash);
    await expect(service.assertRecentAuth({ id: 'u1', authTime: null }, 'SenhaCerta@1')).resolves.toBeUndefined();
    await expect(service.assertRecentAuth({ id: 'u1', authTime: null }, 'errada')).rejects.toThrow('Senha atual incorreta');
  });

  it('sem a senha: só com login de até 15 min (#38, igual ao QR); token de sessão antiga (roubado) não ativa', async () => {
    const service = build(hash);
    (service as any).setupSessions = new Map();
    const now = Math.floor(Date.now() / 1000);
    await expect(service.assertRecentAuth({ id: 'u1', authTime: now - 60 })).resolves.toBeUndefined();
    // app 1.1.0: lendo o QR com calma, 10 min depois do login ainda ativa
    await expect(service.assertRecentAuth({ id: 'u1', authTime: now - 10 * 60 })).resolves.toBeUndefined();
    await expect(service.assertRecentAuth({ id: 'u1', authTime: now - 16 * 60 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.assertRecentAuth({ id: 'u1', authTime: now - 3600 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.assertRecentAuth({ id: 'u1', authTime: null })).rejects.toThrow(/15 minutos/);
  });

  it('#38/#58: sessão sem a claim `at` (token de antes do deploy) ativa se gerou o QR NESTA sessão há até 15 min', async () => {
    const service = build(hash);
    const setupSessions = new Map<string, { sessionId: string | null; at: number }>();
    (service as any).setupSessions = setupSessions;
    setupSessions.set('u1', { sessionId: 's-app', at: Date.now() - 5 * 60_000 });
    await expect(service.assertRecentAuth({ id: 'u1', authTime: null, sessionId: 's-app' })).resolves.toBeUndefined();
    // outra sessão (outro aparelho) não aproveita o QR desta
    await expect(service.assertRecentAuth({ id: 'u1', authTime: null, sessionId: 's-outra' })).rejects.toBeInstanceOf(BadRequestException);
    // QR velho
    setupSessions.set('u1', { sessionId: 's-app', at: Date.now() - 16 * 60_000 });
    await expect(service.assertRecentAuth({ id: 'u1', authTime: null, sessionId: 's-app' })).rejects.toBeInstanceOf(BadRequestException);
    // sessão COM `at` antigo não usa o atalho do QR: o login é sabidamente velho
    const now = Math.floor(Date.now() / 1000);
    setupSessions.set('u1', { sessionId: 's-app', at: Date.now() });
    await expect(service.assertRecentAuth({ id: 'u1', authTime: now - 3600, sessionId: 's-app' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('#42: senha errada conta no freio da conta (LoginAttemptsService, chave do e-mail) e o acerto zera', async () => {
    const service = build(hash);
    (service as any).prisma.user.findUnique.mockResolvedValue({ password: hash, email: 'Paroco@X.org' });
    const attempts = { assertCanTry: jest.fn(), recordFailure: jest.fn(), recordSuccess: jest.fn() };
    (service as any).loginAttempts = attempts;
    await expect(service.assertPassword('u1', 'errada', { ip: '1.2.3.4' })).rejects.toThrow('Senha atual incorreta');
    expect(attempts.assertCanTry).toHaveBeenCalledWith('email:paroco@x.org', '1.2.3.4');
    expect(attempts.recordFailure).toHaveBeenCalledWith('email:paroco@x.org', '1.2.3.4');
    await service.assertPassword('u1', 'SenhaCerta@1', { ip: '1.2.3.4' });
    expect(attempts.recordSuccess).toHaveBeenCalledWith('email:paroco@x.org', '1.2.3.4');
  });

  it('#39: "sair de todos" revoga sob a trava da linha do usuário (FOR UPDATE antes de apagar os tokens)', async () => {
    const service = Object.create(SessionSecurityService.prototype) as SessionSecurityService;
    const prisma: any = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      user: { update: jest.fn() },
      refreshToken: { deleteMany: jest.fn() },
    };
    prisma.$transaction = jest.fn(async (fn: any) => fn(prisma));
    (service as any).prisma = prisma;
    await service.revokeSessions('u1');
    expect(prisma.$queryRaw.mock.calls[0][0].join('?')).toContain('FOR UPDATE');
    expect(prisma.$queryRaw.mock.calls[0][1]).toBe('u1');
    expect(prisma.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(prisma.refreshToken.deleteMany.mock.invocationCallOrder[0]);
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { sessionsRevokedAt: expect.any(Date) } });
  });

  it('#42: IP já barrado pelo freio → 429 sem conferir a senha', async () => {
    const service = build(hash);
    const attempts = new LoginAttemptsService({ log: jest.fn().mockResolvedValue(undefined) } as any);
    (service as any).prisma.user.findUnique.mockResolvedValue({ password: hash, email: 'a@b.com' });
    (service as any).loginAttempts = attempts;
    for (let i = 0; i < 10; i++) {
      await expect(service.assertPassword('u1', 'errada', { ip: '9.9.9.9' })).rejects.toThrow('Senha atual incorreta');
    }
    // nem a senha certa passa daquele IP enquanto durar o bloqueio
    const error = await service.assertPassword('u1', 'SenhaCerta@1', { ip: '9.9.9.9' }).catch((e) => e);
    expect(error.getStatus()).toBe(429);
    // de outro IP o titular continua conferindo normalmente
    await expect(service.assertPassword('u1', 'SenhaCerta@1', { ip: '8.8.8.8' })).resolves.toBeUndefined();
  });
});

describe('AuthCleanupService — credenciais vencidas (B47/B13)', () => {
  it('apaga refresh tokens e OTPs vencidos e tokens de redefinição com mais de um dia de vencidos', async () => {
    const prisma: any = {
      refreshToken: { deleteMany: jest.fn().mockResolvedValue({ count: 3 }) },
      phoneOtp: { deleteMany: jest.fn().mockResolvedValue({ count: 2 }) },
      passwordResetToken: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    const now = new Date('2026-10-06T12:00:00Z');
    const result = await new AuthCleanupService(prisma).purgeExpired(now);
    expect(result).toEqual({ refreshTokens: 3, phoneOtps: 2, resetTokens: 1 });
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { expiresAt: { lt: now } } });
    expect(prisma.phoneOtp.deleteMany).toHaveBeenCalledWith({ where: { expiresAt: { lt: now } } });
    expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({ where: { expiresAt: { lt: new Date('2026-10-05T12:00:00Z') } } });
  });
});

describe('MessagingService em produção sem Twilio (M17/B23)', () => {
  const originalEnv = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('sendSms falha com 503 e o log não leva o corpo nem o telefone inteiro', async () => {
    process.env.NODE_ENV = 'production';
    const service = new MessagingService({ get: () => undefined } as any);
    const lines: string[] = [];
    for (const level of ['log', 'warn', 'error'] as const) {
      jest.spyOn((service as any).logger, level).mockImplementation(((msg: unknown) => lines.push(String(msg))) as any);
    }
    await expect(service.sendSms('+5542999998883', 'Seu código Parish: 123456')).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(service.trySendWhatsApp('+5542999998883', 'Seu Pix de R$ 50,00')).resolves.toBe(false);
    const all = lines.join(' | ');
    expect(all).not.toContain('123456');
    expect(all).not.toContain('R$ 50');
    expect(all).not.toContain('999998883');
  });

  it('máscaras', () => {
    expect(maskPhone('+5542999998883')).toBe('+55•••••••83');
    expect(maskEmail('maria.silva@gmail.com')).toBe('m•••@gmail.com');
  });
});

describe('UsersService.changePassword — derruba as outras sessões (B46/M18)', () => {
  let hash: string;
  beforeAll(async () => {
    hash = await bcrypt.hash('SenhaAntiga@1', 4);
  });
  const build = () => {
    const prisma: any = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'u1', password: hash }), update: jest.fn() },
      refreshToken: { deleteMany: jest.fn() },
      $queryRaw: jest.fn().mockResolvedValue([]),
      $transaction: jest.fn(async (fn: any) => fn(prisma)),
    };
    const service = Object.create(UsersService.prototype) as UsersService;
    (service as any).prisma = prisma;
    (service as any).auditService = { log: jest.fn().mockResolvedValue(undefined) };
    return { service, prisma };
  };

  it('grava sessionsRevokedAt, tira a troca obrigatória e mantém só a sessão deste aparelho', async () => {
    const { service, prisma } = build();
    const res: any = await service.changePassword('u1', { currentPassword: 'SenhaAntiga@1', newPassword: 'SenhaNova@123' }, { id: 'u1', role: UserRole.FAITHFUL, sessionId: 's-aqui' });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { password: expect.any(String), forcePasswordChange: false, sessionsRevokedAt: expect.any(Date) },
    });
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1', OR: [{ sessionId: null }, { sessionId: { not: 's-aqui' } }] },
    });
    expect(res).toMatchObject({ sessionsRevoked: true, keptCurrentSession: true });
    // #39: troca e revogação sob a trava da linha do usuário
    expect(prisma.$queryRaw.mock.calls[0][0].join('?')).toContain('FOR UPDATE');
    expect(prisma.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(prisma.refreshToken.deleteMany.mock.invocationCallOrder[0]);
  });

  it('token antigo (sem sessão): todas as sessões caem', async () => {
    const { service, prisma } = build();
    await service.changePassword('u1', { currentPassword: 'SenhaAntiga@1', newPassword: 'SenhaNova@123' }, { id: 'u1', role: UserRole.FAITHFUL });
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
  });

  it('nova senha igual à atual é recusada (a gestão continuaria sabendo a senha)', async () => {
    const { service } = build();
    await expect(
      service.changePassword('u1', { currentPassword: 'SenhaAntiga@1', newPassword: 'SenhaAntiga@1' }, { id: 'u1', role: UserRole.FAITHFUL }),
    ).rejects.toThrow('diferente da atual');
  });
});
