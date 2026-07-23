import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { MessagingService } from '../messaging/messaging.service';

const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;

@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly messagingService: MessagingService,
  ) {}

  /** Normalize Brazilian phone to E.164 (+5511999999999) */
  normalizePhone(raw: string): string {
    const normalized = this.messagingService.normalizePhone(raw);
    if (!normalized) {
      throw new BadRequestException('Número de celular inválido');
    }
    return normalized;
  }

  async sendOtp(rawPhone: string): Promise<{ message: string }> {
    const phone = this.normalizePhone(rawPhone);

    // Block if this phone is already registered
    const existing = await this.prisma.user.findUnique({ where: { phone } });
    if (existing) {
      throw new ConflictException('Este número já está cadastrado');
    }

    // Expire previous OTPs for this phone
    await this.prisma.phoneOtp.deleteMany({ where: { phone } });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await this.prisma.phoneOtp.create({ data: { phone, code, expiresAt } });

    await this.deliverOtp(phone, code);

    return { message: 'Código enviado' };
  }

  async verifyOtp(rawPhone: string, code: string): Promise<{ verifiedPhoneToken: string }> {
    const phone = this.normalizePhone(rawPhone);

    const record = await this.prisma.phoneOtp.findFirst({
      where: { phone, verified: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) throw new BadRequestException('Código inválido ou expirado');

    if (record.expiresAt < new Date()) {
      await this.prisma.phoneOtp.delete({ where: { id: record.id } });
      throw new BadRequestException('Código expirado');
    }

    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      throw new BadRequestException('Muitas tentativas. Solicite um novo código');
    }

    if (record.code !== code) {
      await this.prisma.phoneOtp.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Código incorreto');
    }

    await this.prisma.phoneOtp.update({
      where: { id: record.id },
      data: { verified: true },
    });

    const verifiedPhoneToken = this.jwtService.sign(
      { phone, purpose: 'phone-verify' },
      {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: '30m',
      },
    );

    return { verifiedPhoneToken };
  }

  /** Decode and return the phone from a verifiedPhoneToken. Throws if invalid. */
  decodeVerifiedPhoneToken(token: string): string {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET'),
      }) as { phone: string; purpose: string };

      if (payload.purpose !== 'phone-verify') {
        throw new Error('Wrong purpose');
      }

      return payload.phone;
    } catch {
      throw new BadRequestException('Token de verificação de celular inválido');
    }
  }

  private async deliverOtp(phone: string, code: string): Promise<void> {
    // Erros de entrega propagam: o usuário precisa saber que o código não foi enviado
    await this.messagingService.sendSms(
      phone,
      `Seu código Parish: ${code}. Válido por ${OTP_TTL_MINUTES} minutos.`,
    );
  }
}
