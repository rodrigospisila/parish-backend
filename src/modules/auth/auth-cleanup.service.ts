import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';

/** Tokens de redefinição ficam um dia além do vencimento (diagnóstico de suporte) e somem. */
const RESET_TOKEN_KEEP_MS = 24 * 3600 * 1000;

/**
 * Limpeza de credenciais vencidas (B47/B48/B13): refresh tokens expirados
 * (cada login/renovação cria uma linha), códigos de celular vencidos — com o
 * telefone de quem desistiu do cadastro (LGPD, art. 15/16) — e tokens de
 * redefinição de senha antigos. De hora em hora: o OTP vale só 10 minutos.
 */
@Injectable()
export class AuthCleanupService {
  private readonly logger = new Logger(AuthCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    try {
      const result = await this.purgeExpired(new Date());
      const total = result.refreshTokens + result.phoneOtps + result.resetTokens;
      if (total > 0) this.logger.log(`Credenciais vencidas apagadas: ${JSON.stringify(result)}`);
    } catch (error) {
      this.logger.warn(`Limpeza de credenciais vencidas falhou: ${String(error)}`);
    }
  }

  async purgeExpired(now: Date) {
    const [refreshTokens, phoneOtps, resetTokens] = await Promise.all([
      this.prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: now } } }),
      this.prisma.phoneOtp.deleteMany({ where: { expiresAt: { lt: now } } }),
      this.prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: new Date(now.getTime() - RESET_TOKEN_KEEP_MS) } } }),
    ]);
    return { refreshTokens: refreshTokens.count, phoneOtps: phoneOtps.count, resetTokens: resetTokens.count };
  }
}
