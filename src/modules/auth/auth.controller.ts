import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Headers, Ip, Res, UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { PasswordResetService } from './password-reset.service';
import { LoginAttemptsService, LoginLockedException, loginAccountKey } from './login-attempts.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LogoutDto } from './dto/logout.dto';
import { VerifyPasswordDto } from './dto/verify-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { bodyTargetTracker, refreshTokenTracker, UserThrottlerGuard } from './guards/app-throttler.guard';
import { SessionSecurityService } from './session-security.service';

const MINUTE = 60_000;
const HOUR = 3_600_000;

/**
 * Rotas públicas de autenticação. Os limites abaixo são aplicados pelo guard
 * GLOBAL (AppThrottlerGuard, registrado como APP_GUARD) — por IP real, graças ao
 * `trust proxy` do main.ts. `hourly` e `target` (por celular/e-mail do corpo)
 * só valem onde declarados. Achado A12 da auditoria.
 *
 * O login NÃO usa `target`: um limite por conta contado antes da senha deixava
 * qualquer um trancar a vítima. Lá vale o LoginAttemptsService (só falhas, por
 * conta + IP). O `target` de otp/send e forgot-password fica (anti-SMS-bombing)
 * — ver a mensagem de 429 em app-throttler.guard.ts.
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
    private readonly passwordResetService: PasswordResetService,
    private readonly loginAttempts: LoginAttemptsService,
    private readonly security: SessionSecurityService,
  ) {}

  /**
   * Por IP: 20/min e 60/h — folgado para mutirão de inscrição no Wi-Fi da
   * igreja (todos saem pelo mesmo IP). Duplicidade de e-mail/celular já é
   * barrada no serviço; o celular ainda passa pelo OTP (limite por número).
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 20, ttl: MINUTE }, hourly: { limit: 60, ttl: HOUR } })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /**
   * Freio contra teste de senhas: 10/min por IP (guard global; o `trust proxy`
   * do main.ts garante o IP real atrás do Railway) e, por (conta + IP), 10
   * FALHAS em 15 min — o sucesso zera. Um atacante não tranca o titular: o
   * bloqueio vale só para o IP que errou; muitas falhas da conta somadas viram
   * alerta na auditoria (LoginAttemptsService).
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: MINUTE } })
  async login(
    @Body() loginDto: LoginDto,
    @Headers() headers: Record<string, string | undefined>,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const account = loginAccountKey(loginDto);
    try {
      this.loginAttempts.assertCanTry(account, ip);
    } catch (error) {
      if (error instanceof LoginLockedException) res.setHeader('Retry-After', String(error.retryAfterSeconds));
      throw error;
    }
    try {
      const result = await this.authService.login(loginDto, {
        ip,
        userAgent: headers['user-agent'] ?? null,
        deviceId: headers['x-device-id'] ?? null,
        deviceName: headers['x-device-name'] ?? null,
      });
      // Senha certa (inclusive quando ainda falta o 2FA): zera as falhas deste IP
      this.loginAttempts.recordSuccess(account, ip);
      return result;
    } catch (error) {
      // Só credencial inválida conta (conta desativada vem depois da senha certa)
      if (error instanceof UnauthorizedException) {
        this.loginAttempts.recordFailure(account, ip, { userAgent: headers['user-agent'] ?? null });
      }
      throw error;
    }
  }

  /**
   * Renovação de sessão: 20/min POR REFRESH TOKEN (hash) e um teto alto de
   * 300/min por IP. O limite antigo (30/min por IP) deslogava quem estava
   * atrás do mesmo IP — o Wi-Fi da paróquia num domingo.
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: { limit: 300, ttl: MINUTE },
    target: { limit: 20, ttl: MINUTE, getTracker: refreshTokenTracker },
  })
  async refreshToken(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  /**
   * Sai DESTE aparelho: a sessão do access token (e a do `refreshToken`
   * enviado, se houver) acaba; os outros aparelhos seguem logados. Corpo
   * opcional — o app 1.1.0 e o painel antigo mandam vazio.
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: any, @Body() body: LogoutDto) {
    return this.authService.logout(user, { refreshToken: body?.refreshToken, pushToken: body?.pushToken });
  }

  /**
   * Sai DESTE aparelho pelo refresh token (revisão #37): para quando o access
   * token já venceu e o POST /auth/logout seria recusado antes de encerrar a
   * sessão. Sem access token de propósito; o freio é o mesmo do refresh
   * (por token e um teto por IP).
   */
  @Post('logout/refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: { limit: 300, ttl: MINUTE },
    target: { limit: 20, ttl: MINUTE, getTracker: refreshTokenTracker },
  })
  async logoutByRefresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.logoutByRefreshToken(refreshToken);
  }

  /** "Sair de todos os aparelhos" (tela de Segurança): todas as sessões caem, inclusive esta. */
  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logoutAll(@CurrentUser() user: any) {
    return this.authService.logoutAll(user.id);
  }

  /**
   * Confere a senha da própria conta SEM emitir sessão (B9: ativar a
   * biometria no app abria uma sessão nova e gerava um LOGIN a cada vez).
   * Revisão #42: com um token roubado, a resposta seria um oráculo de senha —
   * 5/min POR USUÁRIO (UserThrottlerGuard, depois do JwtAuthGuard) e as
   * falhas contam no freio de senha da conta (LoginAttemptsService, o mesmo
   * do login: 10 falhas do mesmo IP em 15 min → 429).
   */
  @Post('password/verify')
  @UseGuards(JwtAuthGuard, UserThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: MINUTE } })
  async verifyPassword(@CurrentUser() user: any, @Body() dto: VerifyPasswordDto, @Ip() ip: string) {
    await this.security.assertPassword(user.id, dto.password, { ip });
    return { valid: true };
  }

  /**
   * Cada chamada dispara um SMS pago (Twilio). O freio principal é POR NÚMERO
   * (3/h — anti-SMS-bombing, vale de qualquer IP). Por IP, 10/min e 30/h:
   * folga para o mutirão de cadastro no Wi-Fi da igreja.
   */
  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: { limit: 10, ttl: MINUTE },
    hourly: { limit: 30, ttl: HOUR },
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

