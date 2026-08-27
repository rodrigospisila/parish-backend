import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
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
import { decryptSecret, encryptSecret, isPaymentsCryptoConfigured } from '../payments/payment-crypto';
import { isRoleAtLeast } from './constants/role-hierarchy';
import { currentStep, newTotpSecret, otpauthUrl, verifyTotp } from './totp';

export interface LoginMeta {
  ip?: string | null;
  userAgent?: string | null;
  deviceId?: string | null;
  deviceName?: string | null;
}

/** Papéis para os quais o 2FA é recomendado (mexem com dinheiro/dados sensíveis). */
export const TWO_FACTOR_RECOMMENDED: UserRole[] = [UserRole.SYSTEM_ADMIN, UserRole.DIOCESAN_ADMIN, UserRole.PARISH_ADMIN, UserRole.COMMUNITY_COORDINATOR];
const BACKUP_CODES = 8;
const ISSUER = 'Parish';

const hashCode = (code: string) => createHash('sha256').update(code.replace(/[\s-]/g, '').toUpperCase()).digest('hex');
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ===== desafio 2FA no login =====

  challenge(user: { id: string; email: string; name: string }) {
    const challengeToken = this.jwtService.sign(
      { sub: user.id, purpose: '2fa', jti: randomUUID() },
      { secret: this.configService.get('JWT_SECRET'), expiresIn: '5m' },
    );
    return { requiresTwoFactor: true as const, challengeToken, user: { id: user.id, email: user.email, name: user.name } };
  }

  verifyChallenge(token: string): string {
    try {
      const payload = this.jwtService.verify(token, { secret: this.configService.get('JWT_SECRET') });
      if (payload?.purpose !== '2fa' || !payload.sub) throw new Error('purpose');
      return String(payload.sub);
    } catch {
      throw new UnauthorizedException('Desafio expirado — entre com e-mail e senha de novo');
    }
  }

  private decryptSecretOf(user: { twoFactorSecret: string | null }): string | null {
    if (!user.twoFactorSecret) return null;
    try {
      return decryptSecret(user.twoFactorSecret);
    } catch {
      return null;
    }
  }

  /** Confere código TOTP (com anti-replay) ou um código de recuperação (consumido). */
  async verifySecondFactor(userId: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { twoFactorEnabled: true, twoFactorSecret: true, twoFactorLastStep: true, twoFactorBackupCodes: true } });
    if (!user?.twoFactorEnabled) return true;
    const secret = this.decryptSecretOf(user);
    const clean = String(code ?? '').trim();
    if (secret) {
      const step = verifyTotp(secret, clean, { lastStep: user.twoFactorLastStep });
      if (step != null) {
        await this.prisma.user.update({ where: { id: userId }, data: { twoFactorLastStep: step } });
        return true;
      }
    }
    // Código de recuperação (uma vez)
    const hashed = hashCode(clean);
    if (clean.replace(/[\s-]/g, '').length >= 8 && user.twoFactorBackupCodes.includes(hashed)) {
      await this.prisma.user.update({ where: { id: userId }, data: { twoFactorBackupCodes: user.twoFactorBackupCodes.filter((c) => c !== hashed) } });
      await this.auditService.log({ actor: { id: userId } as any, action: 'UPDATE', entity: 'User', entityId: userId, metadata: { twoFactorBackupCodeUsed: true, remaining: user.twoFactorBackupCodes.length - 1 } });
      return true;
    }
    return false;
  }

  // ===== configuração do 2FA pelo próprio usuário =====

  async status(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true, twoFactorEnabled: true, twoFactorEnabledAt: true, twoFactorBackupCodes: true } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return {
      enabled: user.twoFactorEnabled,
      enabledAt: user.twoFactorEnabledAt,
      recommended: TWO_FACTOR_RECOMMENDED.includes(user.role),
      backupCodesLeft: user.twoFactorEnabled ? user.twoFactorBackupCodes.length : 0,
      serverReady: isPaymentsCryptoConfigured(),
    };
  }

  /** Gera um segredo pendente (não ativa): o app autenticador lê o QR e o usuário confirma com um código. */
  async setup(userId: string) {
    if (!isPaymentsCryptoConfigured()) throw new BadRequestException('Servidor sem PAYMENTS_ENCRYPTION_KEY — o segredo do 2FA precisa ser cifrado');
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, twoFactorEnabled: true } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (user.twoFactorEnabled) throw new BadRequestException('O segundo fator já está ativo — desative antes de configurar outro');
    const secret = newTotpSecret();
    await this.prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: encryptSecret(secret), twoFactorLastStep: null } });
    const url = otpauthUrl(ISSUER, user.email, secret);
    const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 240, errorCorrectionLevel: 'M' });
    return { secret, otpauthUrl: url, qrDataUrl };
  }

  /** Ativa depois de um código válido; devolve os códigos de recuperação (só desta vez). */
  async enable(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { twoFactorEnabled: true, twoFactorSecret: true, email: true } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (user.twoFactorEnabled) throw new BadRequestException('O segundo fator já está ativo');
    const secret = this.decryptSecretOf(user);
    if (!secret) throw new BadRequestException('Gere o QR do autenticador antes de ativar');
    const step = verifyTotp(secret, code);
    if (step == null) throw new BadRequestException('Código inválido — confira o horário do celular e tente de novo');
    const codes = Array.from({ length: BACKUP_CODES }, () => randomBytes(5).toString('hex').toUpperCase().replace(/(.{5})(.{5})/, '$1-$2'));
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true, twoFactorEnabledAt: new Date(), twoFactorLastStep: step, twoFactorBackupCodes: codes.map(hashCode) },
    });
    await this.auditService.log({ actor: { id: userId, email: user.email } as any, action: 'UPDATE', entity: 'User', entityId: userId, metadata: { twoFactorEnabled: true } });
    return { enabled: true, backupCodes: codes };
  }

  async disable(userId: string, password: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { password: true, twoFactorEnabled: true, email: true } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (!user.twoFactorEnabled) return { enabled: false };
    const passwordOk = await bcrypt.compare(String(password ?? ''), user.password);
    if (!passwordOk) throw new BadRequestException('Senha atual incorreta');
    if (!(await this.verifySecondFactor(userId, code))) throw new BadRequestException('Código inválido');
    await this.prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorEnabledAt: null, twoFactorLastStep: null, twoFactorBackupCodes: [] } });
    await this.auditService.log({ actor: { id: userId, email: user.email } as any, action: 'UPDATE', entity: 'User', entityId: userId, metadata: { twoFactorEnabled: false } });
    return { enabled: false };
  }

  /** Administração zera o 2FA de alguém do seu escopo (perdeu o celular). */
  async resetByAdmin(actor: { id: string; email?: string; role: UserRole; parishId?: string | null; dioceseId?: string | null }, targetUserId: string) {
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, email: true, parishId: true, dioceseId: true, role: true, twoFactorEnabled: true } });
    if (!target) throw new NotFoundException('Usuário não encontrado');
    const allowed =
      actor.role === UserRole.SYSTEM_ADMIN ||
      (actor.role === UserRole.DIOCESAN_ADMIN && !!actor.dioceseId && target.dioceseId === actor.dioceseId) ||
      (actor.role === UserRole.PARISH_ADMIN && !!actor.parishId && target.parishId === actor.parishId && !isRoleAtLeast(target.role, UserRole.DIOCESAN_ADMIN));
    if (!allowed) throw new ForbiddenException('Usuário fora do seu escopo');
    await this.prisma.user.update({ where: { id: targetUserId }, data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorEnabledAt: null, twoFactorLastStep: null, twoFactorBackupCodes: [] } });
    await this.prisma.refreshToken.deleteMany({ where: { userId: targetUserId } });
    await this.auditService.log({ actor: actor as any, action: 'UPDATE', entity: 'User', entityId: targetUserId, metadata: { twoFactorResetByAdmin: true } });
    try {
      await this.emailService.trySend(target.email, 'Seu segundo fator foi redefinido', `Um administrador redefiniu o segundo fator (2FA) da sua conta Parish. Se você não pediu isso, fale com a secretaria imediatamente.`);
    } catch {
      // best-effort
    }
    return { reset: true, wasEnabled: target.twoFactorEnabled };
  }

  // ===== dispositivos conhecidos =====

  private fingerprint(meta: LoginMeta): string {
    const base = meta.deviceId ? `id:${meta.deviceId}` : `ua:${String(meta.userAgent ?? '').slice(0, 300)}`;
    return createHash('sha256').update(base).digest('hex');
  }

  /** Registra o aparelho do login; se for novo (e não o primeiro), avisa o dono da conta. */
  async registerDevice(user: { id: string; email: string; name: string }, meta: LoginMeta): Promise<{ isNew: boolean; alerted: boolean }> {
    try {
      const fingerprint = this.fingerprint(meta);
      const label = deviceLabel(meta.userAgent, meta.deviceName);
      const ip = meta.ip ? String(meta.ip).slice(0, 64) : null;
      const [existing, count] = await Promise.all([
        this.prisma.userDevice.findUnique({ where: { userId_fingerprint: { userId: user.id, fingerprint } } }),
        this.prisma.userDevice.count({ where: { userId: user.id } }),
      ]);
      if (existing) {
        await this.prisma.userDevice.update({ where: { id: existing.id }, data: { lastSeenAt: new Date(), lastIp: ip, label: existing.label ?? label, revokedAt: null } });
        return { isNew: false, alerted: false };
      }
      await this.prisma.userDevice.create({ data: { userId: user.id, fingerprint, label, lastIp: ip } });
      if (count === 0) return { isNew: true, alerted: false };
      const when = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      const body = `Novo acesso à sua conta Parish em ${label} (${when}${ip ? `, IP ${ip}` : ''}). Se não foi você, troque a senha agora e avise a secretaria.`;
      let alerted = false;
      try {
        await this.notificationsService.notifyUsers([user.id], NotificationType.URGENT_NOTICE, 'Novo acesso à sua conta', body, { kind: 'security-new-device' });
        alerted = true;
      } catch {
        // push é conveniência
      }
      try {
        await this.emailService.trySend(user.email, 'Novo acesso à sua conta Parish', `Olá, ${user.name}.\n\n${body}\n\nEquipe Parish`);
        alerted = true;
      } catch {
        // e-mail é conveniência
      }
      await this.auditService.log({ actor: { id: user.id, email: user.email } as any, action: 'UPDATE', entity: 'User', entityId: user.id, metadata: { newDevice: label, alerted } });
      return { isNew: true, alerted };
    } catch (error) {
      this.logger.warn(`Registro de dispositivo falhou: ${String(error)}`);
      return { isNew: false, alerted: false };
    }
  }

  async listDevices(userId: string, currentMeta?: LoginMeta) {
    const current = currentMeta ? this.fingerprint(currentMeta) : null;
    const devices = await this.prisma.userDevice.findMany({ where: { userId }, orderBy: { lastSeenAt: 'desc' }, take: 50 });
    return devices.map((d) => ({ id: d.id, label: d.label, lastIp: d.lastIp, firstSeenAt: d.firstSeenAt, lastSeenAt: d.lastSeenAt, revokedAt: d.revokedAt, current: d.fingerprint === current }));
  }

  /** Esquece um aparelho (o próximo login nele avisa de novo) e encerra as sessões. */
  async forgetDevice(userId: string, deviceId: string) {
    const device = await this.prisma.userDevice.findFirst({ where: { id: deviceId, userId } });
    if (!device) throw new NotFoundException('Dispositivo não encontrado');
    await this.prisma.userDevice.delete({ where: { id: device.id } });
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    await this.auditService.log({ actor: { id: userId } as any, action: 'UPDATE', entity: 'User', entityId: userId, metadata: { deviceForgotten: device.label } });
    return { forgotten: true };
  }

  /** Auditoria de segurança da própria conta (últimos eventos). */
  async myActivity(userId: string) {
    return this.auditService.findAll({ actorUserId: userId, page: 1, pageSize: 30 } as any);
  }
}
