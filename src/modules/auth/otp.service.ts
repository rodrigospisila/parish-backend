import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { MessagingService } from '../messaging/messaging.service';

const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;

/** Comparação em tempo constante de dois hex/strings (tamanhos diferentes = diferente). */
const sameText = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly messagingService: MessagingService,
  ) {}

  /**
   * O código fica guardado como HMAC (chave do servidor + telefone): um dump
   * da tabela não entrega códigos válidos, e 6 dígitos sem chave seriam
   * quebrados por força bruta na hora.
   */
  private hashCode(phone: string, code: string): string {
    return createHmac('sha256', `${this.configService.get('JWT_SECRET')}:phone-otp`)
      .update(`${phone}:${code}`)
      .digest('hex');
  }

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

    // Gerador criptográfico: Math.random é previsível para quem observa saídas
    const code = String(randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await this.prisma.phoneOtp.create({ data: { phone, code: this.hashCode(phone, code), expiresAt } });

    try {
      await this.deliverOtp(phone, code);
    } catch (error) {
      // Código que não saiu não fica guardado (nem o telefone)
      await this.prisma.phoneOtp.deleteMany({ where: { phone } }).catch(() => undefined);
      throw error;
    }

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
      await this.prisma.phoneOtp.deleteMany({ where: { id: record.id } });
      throw new BadRequestException('Código expirado');
    }

    // Contador ATÔMICO antes de comparar: uma rajada em paralelo não passa
    // das 5 tentativas (cada uma precisa "ganhar" um incremento)
    const { count } = await this.prisma.phoneOtp.updateMany({
      where: { id: record.id, attempts: { lt: OTP_MAX_ATTEMPTS } },
      data: { attempts: { increment: 1 } },
    });
    if (count === 0) {
      throw new BadRequestException('Muitas tentativas. Solicite um novo código');
    }

    const typed = String(code ?? '').trim();
    // Linhas de antes do hash (código de 6 dígitos em claro) valem até vencer (10 min)
    const matches =
      record.code.length === 6 ? sameText(record.code, typed) : sameText(record.code, this.hashCode(phone, typed));
    if (!matches) {
      throw new BadRequestException('Código incorreto');
    }

    // Uso único e sem guardar o telefone além do necessário: some ao verificar
    await this.prisma.phoneOtp.deleteMany({ where: { phone } });

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
