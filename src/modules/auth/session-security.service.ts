import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { NotificationType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as QRCode from 'qrcode';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../common/audit.service';
import { EmailService } from '../messaging/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { decryptSecret, encryptSecret, isPaymentsCryptoConfigured, keyedHash } from '../payments/payment-crypto';
import { isRoleAtLeast } from './constants/role-hierarchy';
import { newTotpSecret, otpauthUrl, verifyTotp } from './totp';

export interface LoginMeta {
  ip?: string | null;
  userAgent?: string | null;
  deviceId?: string | null;
  deviceName?: string | null;
}

export interface ChallengeClaims {
  userId: string;
  jti: string;
  /** expiração em ms */
  exp: number;
}

/** Papéis para os quais o 2FA é recomendado (mexem com dinheiro/dados sensíveis). */
export const TWO_FACTOR_RECOMMENDED: UserRole[] = [UserRole.SYSTEM_ADMIN, UserRole.DIOCESAN_ADMIN, UserRole.PARISH_ADMIN, UserRole.COMMUNITY_COORDINATOR];
const BACKUP_CODES = 8;
const ISSUER = 'Parish';
const CHALLENGE_TTL = '5m';
const SETUP_TTL_MS = 15 * 60_000;
const MAX_CODE_FAILURES = 5;
const CODE_LOCK_MS = 15 * 60_000;

const normalizeCode = (code: string) => String(code ?? '').replace(/[\s-]/g, '').toUpperCase();
/** Códigos de recuperação: HMAC sob a chave do servidor — um dump do banco não permite força bruta dos 40 bits. */
const hashCode = (code: string) => keyedHash('2fa-backup', normalizeCode(code));
/**
 * Instante de revogação truncado ao segundo: o `iat` dos JWTs tem essa
 * granularidade, então tokens emitidos no mesmo segundo (a sessão reemitida
 * logo em seguida) continuam válidos e todos os anteriores caem.
 */
const revocationInstant = () => new Date(Math.floor(Date.now() / 1000) * 1000);
const deviceLabel = (ua: string | null | undefined, deviceName: string | null | undefined) => {
  if (deviceName) return deviceName.replace(/[\r\n\t]+/g, ' ').trim().slice(0, 80);
  const text = String(ua ?? '');
  const os = /iPhone|iPad/.test(text) ? 'iPhone/iPad' : /Android/.test(text) ? 'Android' : /Windows/.test(text) ? 'Windows' : /Mac OS/.test(text) ? 'Mac' : /Linux/.test(text) ? 'Linux' : 'Dispositivo';
  const browser = /Edg\//.test(text) ? 'Edge' : /Chrome\//.test(text) ? 'Chrome' : /Firefox\//.test(text) ? 'Firefox' : /Safari\//.test(text) ? 'Safari' : /okhttp|CFNetwork|Expo/.test(text) ? 'app Parish' : '';
  return [os, browser].filter(Boolean).join(' · ') || 'Dispositivo desconhecido';
};

/**
 * Governança de acesso (D4.7): segundo fator (TOTP) recomendado para quem
 * administra finanças, alerta de acesso em aparelho novo e dispositivos
 * conhecidos. O segredo TOTP fica cifrado em repouso.
 */
@Injectable()
export class SessionSecurityService {
  private readonly logger = new Logger(SessionSecurityService.name);
  /** Desafios já usados (jti → expiração em ms) — uso único até expirarem. */
  private readonly consumedChallenges = new Map<string, number>();
  /** Falhas de código por usuário: 5 erros travam a conferência por 15 min (freio por conta, além do limite por IP). */
  private readonly codeFailures = new Map<string, { count: number; lockedUntil: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ===== desafio 2FA no login =====

  /** Segredo próprio do desafio: nem com o JWT_SECRET igual um desafio passa na JwtStrategy. */
  private challengeSecret(): string {
    return `${this.configService.get('JWT_SECRET')}:2fa-challenge`;
  }

  challenge(user: { id: string; email: string; name: string }) {
    const challengeToken = this.jwtService.sign(
      { sub: user.id, purpose: '2fa', jti: randomUUID() },
      { secret: this.challengeSecret(), expiresIn: CHALLENGE_TTL },
    );
    return { requiresTwoFactor: true as const, challengeToken, user: { id: user.id, email: user.email, name: user.name } };
  }

  verifyChallenge(token: string): ChallengeClaims {
    let payload: any;
    try {
      payload = this.jwtService.verify(token, { secret: this.challengeSecret() });
    } catch {
      throw new UnauthorizedException('Desafio expirado — entre com e-mail e senha de novo');
    }
    if (payload?.purpose !== '2fa' || !payload.sub || !payload.jti) throw new UnauthorizedException('Desafio inválido');
    this.sweepChallenges();
    if (this.consumedChallenges.has(String(payload.jti))) throw new UnauthorizedException('Desafio já utilizado — entre com e-mail e senha de novo');
    return { userId: String(payload.sub), jti: String(payload.jti), exp: Number(payload.exp ?? 0) * 1000 };
  }

  /** Marca o desafio como usado (depois da sessão emitida). */
  consumeChallenge(challenge: ChallengeClaims) {
    this.consumedChallenges.set(challenge.jti, challenge.exp || Date.now() + 5 * 60_000);
  }

  private sweepChallenges() {
    const now = Date.now();
    for (const [jti, exp] of this.consumedChallenges) if (exp <= now) this.consumedChallenges.delete(jti);
  }

  private assertNotLocked(userId: string) {
    const failures = this.codeFailures.get(userId);
    if (failures && failures.lockedUntil > Date.now()) {
      throw new UnauthorizedException('Muitas tentativas de código — a conferência fica bloqueada por 15 minutos');
    }
  }

  private noteCodeFailure(userId: string) {
    const failures = this.codeFailures.get(userId) ?? { count: 0, lockedUntil: 0 };
    if (failures.lockedUntil && failures.lockedUntil <= Date.now()) {
      failures.count = 0;
      failures.lockedUntil = 0;
    }
    failures.count += 1;
    if (failures.count >= MAX_CODE_FAILURES) {
      failures.count = 0;
      failures.lockedUntil = Date.now() + CODE_LOCK_MS;
      this.logger.warn(`2FA bloqueado por 15 min após ${MAX_CODE_FAILURES} códigos errados (usuário ${userId})`);
      void this.auditService
        .log({ actor: { id: userId } as any, action: 'UPDATE', entity: 'User', entityId: userId, metadata: { twoFactorLocked: true } })
        .catch(() => undefined);
    }
    this.codeFailures.set(userId, failures);
  }

  /** Confere código TOTP (com anti-replay) ou um código de recuperação (consumido). Ambos atômicos no banco. */
  async verifySecondFactor(userId: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { twoFactorEnabled: true, twoFactorSecret: true, twoFactorLastStep: true, twoFactorBackupCodes: true } });
    if (!user?.twoFactorEnabled) return true;
    this.assertNotLocked(userId);
    const clean = normalizeCode(code);
    const looksLikeTotp = /^\d{6}$/.test(clean);

    let secret: string | null = null;
    let cryptoProblem: string | null = null;
    if (user.twoFactorSecret) {
      try {
        secret = decryptSecret(user.twoFactorSecret);
      } catch (error) {
        cryptoProblem = String((error as Error)?.message ?? error);
        this.logger.error(`Segredo TOTP do usuário ${userId} não pôde ser decifrado: ${cryptoProblem}`);
      }
    }

    if (secret && looksLikeTotp) {
      const step = verifyTotp(secret, clean, { lastStep: user.twoFactorLastStep });
      if (step != null) {
        // Anti-replay atômico: só grava se ninguém avançou o intervalo entre a leitura e a escrita
        const { count } = await this.prisma.user.updateMany({ where: { id: userId, twoFactorLastStep: user.twoFactorLastStep }, data: { twoFactorLastStep: step } });
        if (count === 1) {
          this.codeFailures.delete(userId);
          return true;
        }
        this.noteCodeFailure(userId);
        return false;
      }
    }

    // Código de recuperação (uma vez)
    if (clean.length >= 8) {
      let hashed: string | null = null;
      try {
        hashed = hashCode(clean);
      } catch (error) {
        cryptoProblem = cryptoProblem ?? String((error as Error)?.message ?? error);
      }
      if (hashed && user.twoFactorBackupCodes.includes(hashed)) {
        // Consumo atômico: a segunda requisição concorrente já não encontra o código
        const { count } = await this.prisma.user.updateMany({
          where: { id: userId, twoFactorBackupCodes: { has: hashed } },
          data: { twoFactorBackupCodes: user.twoFactorBackupCodes.filter((c) => c !== hashed) },
        });
        if (count === 1) {
          this.codeFailures.delete(userId);
          await this.auditService.log({ actor: { id: userId } as any, action: 'TWO_FACTOR_BACKUP_USED', entity: 'User', entityId: userId, metadata: { remaining: user.twoFactorBackupCodes.length - 1 } });
          return true;
        }
        this.noteCodeFailure(userId);
        return false;
      }
    }

    if (cryptoProblem) {
      // Não é culpa do usuário nem do relógio: a chave de cifra do servidor sumiu ou mudou
      throw new ServiceUnavailableException(
        'O servidor não conseguiu conferir o autenticador (chave de cifra ausente ou trocada). Use um código de recuperação ou peça à administração para redefinir o segundo fator.',
      );
    }
    this.noteCodeFailure(userId);
    return false;
  }

  // ===== configuração do 2FA pelo próprio usuário =====

  async status(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true, twoFactorEnabled: true, twoFactorEnabledAt: true, twoFactorBackupCodes: true } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return {
      enabled: user.twoFactorEnabled,
      enabledAt: user.twoFactorEnabled ? user.twoFactorEnabledAt : null,
      recommended: TWO_FACTOR_RECOMMENDED.includes(user.role),
      backupCodesLeft: user.twoFactorEnabled ? user.twoFactorBackupCodes.length : 0,
      serverReady: isPaymentsCryptoConfigured(),
    };
  }

  /** Gera um segredo pendente (não ativa): o app autenticador lê o QR e o usuário confirma com um código em até 15 min. */
  async setup(userId: string) {
    if (!isPaymentsCryptoConfigured()) throw new BadRequestException('Servidor sem PAYMENTS_ENCRYPTION_KEY — o segredo do 2FA precisa ser cifrado');
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, twoFactorEnabled: true } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (user.twoFactorEnabled) throw new BadRequestException('O segundo fator já está ativo — desative antes de configurar outro');
    const secret = newTotpSecret();
    await this.prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: encryptSecret(secret), twoFactorLastStep: null, twoFactorSetupAt: new Date() } });
    const url = otpauthUrl(ISSUER, user.email, secret);
    const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 240, errorCorrectionLevel: 'M' });
    void this.auditService.log({ actor: { id: userId, email: user.email } as any, action: 'TWO_FACTOR_SETUP', entity: 'User', entityId: userId }).catch(() => undefined);
    return { secret, otpauthUrl: url, qrDataUrl };
  }

  /**
   * Ativa depois de um código válido; devolve os códigos de recuperação (só
   * desta vez). As demais sessões da conta caem — só quem passa pelo segundo
   * fator continua — e o chamador recebe uma sessão nova (controller).
   */
  async enable(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { twoFactorEnabled: true, twoFactorSecret: true, twoFactorSetupAt: true, email: true, name: true } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (user.twoFactorEnabled) throw new BadRequestException('O segundo fator já está ativo');
    let secret: string | null = null;
    try {
      secret = user.twoFactorSecret ? decryptSecret(user.twoFactorSecret) : null;
    } catch (error) {
      this.logger.error(`Segredo pendente do usuário ${userId} não pôde ser decifrado: ${String(error)}`);
    }
    if (!secret) throw new BadRequestException('Gere o QR do autenticador antes de ativar');
    if (!user.twoFactorSetupAt || Date.now() - user.twoFactorSetupAt.getTime() > SETUP_TTL_MS) {
      throw new BadRequestException('O QR expirou — gere outro e leia de novo no autenticador');
    }
    const step = verifyTotp(secret, code);
    if (step == null) throw new BadRequestException('Código inválido — confira o horário do celular e tente de novo');
    const codes = Array.from({ length: BACKUP_CODES }, () => randomBytes(5).toString('hex').toUpperCase().replace(/(.{5})(.{5})/, '$1-$2'));
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorEnabledAt: new Date(),
        twoFactorLastStep: step,
        twoFactorBackupCodes: codes.map(hashCode),
        twoFactorSetupAt: null,
        sessionsRevokedAt: revocationInstant(),
      },
    });
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    await this.auditService.log({ actor: { id: userId, email: user.email } as any, action: 'TWO_FACTOR_ENABLED', entity: 'User', entityId: userId, metadata: { sessionsRevoked: true } });
    this.notifyAccount(
      user,
      'Verificação em duas etapas ativada',
      'A verificação em duas etapas foi ativada na sua conta Parish e as outras sessões abertas foram encerradas. Se não foi você, troque a senha agora e avise a secretaria.',
    );
    return { enabled: true, backupCodes: codes, sessionsRevoked: true };
  }

  async disable(userId: string, password: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { password: true, twoFactorEnabled: true, email: true, name: true } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (!user.twoFactorEnabled) return { enabled: false };
    const passwordOk = await bcrypt.compare(String(password ?? ''), user.password);
    if (!passwordOk) throw new BadRequestException('Senha atual incorreta');
    if (!(await this.verifySecondFactor(userId, code))) throw new BadRequestException('Código inválido');
    await this.prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorEnabledAt: null, twoFactorLastStep: null, twoFactorSetupAt: null, twoFactorBackupCodes: [] } });
    await this.auditService.log({ actor: { id: userId, email: user.email } as any, action: 'TWO_FACTOR_DISABLED', entity: 'User', entityId: userId });
    this.notifyAccount(user, 'Verificação em duas etapas desativada', 'A verificação em duas etapas foi desativada na sua conta Parish. Se não foi você, troque a senha agora e avise a secretaria.');
    return { enabled: false };
  }

  /**
   * Administração zera o 2FA de alguém do seu escopo (perdeu o celular). Só
   * um papel ACIMA do alvo pode fazê-lo — pares não se redefinem, e ninguém
   * usa esta rota na própria conta (para isso existe "desativar" com senha + código).
   */
  async resetByAdmin(actor: { id: string; email?: string; role: UserRole; parishId?: string | null; dioceseId?: string | null }, targetUserId: string) {
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, email: true, name: true, parishId: true, dioceseId: true, role: true, twoFactorEnabled: true } });
    if (!target) throw new NotFoundException('Usuário não encontrado');
    if (target.id === actor.id) throw new BadRequestException('Para a própria conta, desative o segundo fator com senha e código');
    const inScope =
      actor.role === UserRole.SYSTEM_ADMIN ||
      (actor.role === UserRole.DIOCESAN_ADMIN && !!actor.dioceseId && target.dioceseId === actor.dioceseId) ||
      (actor.role === UserRole.PARISH_ADMIN && !!actor.parishId && target.parishId === actor.parishId);
    if (!inScope) throw new ForbiddenException('Usuário fora do seu escopo');
    const outranks = actor.role === UserRole.SYSTEM_ADMIN || !isRoleAtLeast(target.role, actor.role);
    if (!outranks) throw new ForbiddenException('Só um papel acima do usuário pode redefinir o segundo fator dele');
    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorEnabledAt: null, twoFactorLastStep: null, twoFactorSetupAt: null, twoFactorBackupCodes: [], sessionsRevokedAt: revocationInstant() },
    });
    await this.prisma.refreshToken.deleteMany({ where: { userId: targetUserId } });
    this.codeFailures.delete(targetUserId);
    await this.auditService.log({ actor: actor as any, action: 'TWO_FACTOR_RESET', entity: 'User', entityId: targetUserId, metadata: { wasEnabled: target.twoFactorEnabled, sessionsRevoked: true } });
    this.notifyAccount(
      target,
      'Seu segundo fator foi redefinido',
      'Um administrador redefiniu o segundo fator (2FA) da sua conta Parish e encerrou as sessões abertas. Se você não pediu isso, fale com a secretaria imediatamente.',
    );
    return { reset: true, wasEnabled: target.twoFactorEnabled };
  }

  // ===== dispositivos conhecidos =====

  private fingerprint(meta: LoginMeta): string {
    const base = meta.deviceId ? `id:${meta.deviceId}` : `ua:${String(meta.userAgent ?? '').slice(0, 300)}`;
    return createHash('sha256').update(base).digest('hex');
  }

  /**
   * Registra o aparelho do login e avisa o dono da conta quando ele é novo.
   * O primeiro aparelho da conta é a referência (sem alarme). Clientes sem
   * `X-Device-Id` (app anterior à D4.7, scripts) não podem ser reconhecidos:
   * cada acesso deles avisa — avisar demais é mais seguro que silenciar.
   */
  async registerDevice(user: { id: string; email: string; name: string }, meta: LoginMeta): Promise<{ isNew: boolean; alerted: boolean }> {
    try {
      const label = deviceLabel(meta.userAgent, meta.deviceName);
      const ip = meta.ip ? String(meta.ip).slice(0, 64) : null;
      if (!meta.deviceId) {
        this.alertNewDevice(user, `${label} (aparelho não identificado)`, ip);
        return { isNew: true, alerted: true };
      }
      const fingerprint = this.fingerprint(meta);
      const [existing, count] = await Promise.all([
        this.prisma.userDevice.findUnique({ where: { userId_fingerprint: { userId: user.id, fingerprint } } }),
        this.prisma.userDevice.count({ where: { userId: user.id } }),
      ]);
      if (existing) {
        await this.prisma.userDevice.update({ where: { id: existing.id }, data: { lastSeenAt: new Date(), lastIp: ip, label: existing.label ?? label, revokedAt: null } });
        return { isNew: false, alerted: false };
      }
      await this.prisma.userDevice.create({ data: { userId: user.id, fingerprint, label, lastIp: ip } });
      if (count === 0) return { isNew: false, alerted: false };
      this.alertNewDevice(user, label, ip);
      return { isNew: true, alerted: true };
    } catch (error) {
      this.logger.warn(`Registro de dispositivo falhou: ${String(error)}`);
      return { isNew: false, alerted: false };
    }
  }

  /** Push + e-mail + auditoria em segundo plano — o login não espera o SMTP. */
  private alertNewDevice(user: { id: string; email: string; name: string }, label: string, ip: string | null) {
    const when = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const body = `Novo acesso à sua conta Parish em ${label} (${when}${ip ? `, IP ${ip}` : ''}). Se não foi você, troque a senha agora e avise a secretaria.`;
    void Promise.allSettled([
      this.notificationsService.notifyUsers([user.id], NotificationType.URGENT_NOTICE, 'Novo acesso à sua conta', body, { kind: 'security-new-device' }),
      this.emailService.trySend(user.email, 'Novo acesso à sua conta Parish', `Olá, ${user.name}.\n\n${body}\n\nEquipe Parish`),
      this.auditService.log({ actor: { id: user.id, email: user.email } as any, action: 'UPDATE', entity: 'User', entityId: user.id, metadata: { newDevice: label, alerted: true } }),
    ]).catch(() => undefined);
  }

  /** Aviso de segurança ao titular (e-mail best-effort, sem travar a requisição). */
  private notifyAccount(user: { email: string; name?: string | null }, subject: string, body: string) {
    void this.emailService.trySend(user.email, subject, `Olá, ${user.name ?? ''}.\n\n${body}\n\nEquipe Parish`).catch(() => undefined);
  }

  async listDevices(userId: string, currentMeta?: LoginMeta) {
    const current = currentMeta?.deviceId ? this.fingerprint(currentMeta) : null;
    const devices = await this.prisma.userDevice.findMany({ where: { userId }, orderBy: { lastSeenAt: 'desc' }, take: 50 });
    return devices.map((d) => ({ id: d.id, label: d.label, lastIp: d.lastIp, firstSeenAt: d.firstSeenAt, lastSeenAt: d.lastSeenAt, revokedAt: d.revokedAt, current: d.fingerprint === current }));
  }

  /**
   * Esquece um aparelho (o próximo login nele avisa de novo) e encerra TODAS
   * as sessões da conta — inclusive os access tokens ainda válidos. Se o
   * aparelho esquecido não é o atual, o controller reemite a sessão de quem pediu.
   */
  async forgetDevice(userId: string, deviceId: string, currentMeta?: LoginMeta) {
    const device = await this.prisma.userDevice.findFirst({ where: { id: deviceId, userId } });
    if (!device) throw new NotFoundException('Dispositivo não encontrado');
    const current = !!currentMeta?.deviceId && device.fingerprint === this.fingerprint(currentMeta);
    await this.prisma.userDevice.delete({ where: { id: device.id } });
    await this.revokeSessions(userId);
    await this.auditService.log({ actor: { id: userId } as any, action: 'UPDATE', entity: 'User', entityId: userId, metadata: { deviceForgotten: device.label, sessionsRevoked: true } });
    return { forgotten: true, current };
  }

  /** Derruba todas as sessões da conta: refresh tokens somem e access tokens anteriores são recusados. */
  async revokeSessions(userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { sessionsRevokedAt: revocationInstant() } });
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  /** Auditoria de segurança da própria conta (últimos eventos). */
  async myActivity(userId: string) {
    return this.auditService.findAll({ actorUserId: userId, page: 1, pageSize: 30 } as any);
  }
}
