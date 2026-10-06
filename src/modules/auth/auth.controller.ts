import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Headers, Ip } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { PasswordResetService } from './password-reset.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { bodyTargetTracker } from './guards/app-throttler.guard';

const MINUTE = 60_000;
const HOUR = 3_600_000;

/**
 * Rotas públicas de autenticação. Os limites abaixo são aplicados pelo guard
 * GLOBAL (AppThrottlerGuard, registrado como APP_GUARD) — por IP real, graças ao
 * `trust proxy` do main.ts. `hourly` e `target` (por celular/e-mail do corpo)
 * só valem onde declarados. Achado A12 da auditoria.
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: HOUR } })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /**
   * Freio contra teste de senhas: por IP (o `trust proxy` do main.ts garante o IP
   * real atrás do Railway) e por CONTA tentada — este vale mesmo com IP trocado.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: { limit: 10, ttl: MINUTE },
    target: { limit: 20, ttl: HOUR, getTracker: bodyTargetTracker },
  })
  async login(@Body() loginDto: LoginDto, @Headers() headers: Record<string, string | undefined>, @Ip() ip: string) {
    return this.authService.login(loginDto, {
      ip,
      userAgent: headers['user-agent'] ?? null,
      deviceId: headers['x-device-id'] ?? null,
      deviceName: headers['x-device-name'] ?? null,
    });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: MINUTE } })
  async refreshToken(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: any) {
    return this.authService.logout(user.id);
  }

  /** Cada chamada dispara um SMS pago (Twilio): por IP 3/min e 10/h; por número 3/h. */
  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: { limit: 3, ttl: MINUTE },
    hourly: { limit: 10, ttl: HOUR },
    target: { limit: 3, ttl: HOUR, getTracker: bodyTargetTracker },
  })
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.otpService.sendOtp(dto.phone);
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: MINUTE } })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.otpService.verifyOtp(dto.phone, dto.code);
  }

  /** Dispara SMS/e-mail: 5/h por IP e 5/h por conta-alvo (evita inundar a vítima). */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: { limit: 5, ttl: MINUTE },
    hourly: { limit: 5, ttl: HOUR },
    target: { limit: 5, ttl: HOUR, getTracker: bodyTargetTracker },
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.passwordResetService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: MINUTE }, hourly: { limit: 30, ttl: HOUR } })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.passwordResetService.resetPassword(dto.token, dto.newPassword);
  }
}

