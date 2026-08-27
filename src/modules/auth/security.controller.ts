import { Body, Controller, Delete, Get, Headers, HttpCode, HttpStatus, Ip, Param, Post, Request, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { AuthService } from './auth.service';
import { SessionSecurityService } from './session-security.service';

const metaFrom = (headers: Record<string, string | undefined>, ip: string) => ({
  ip,
  userAgent: headers['user-agent'] ?? null,
  deviceId: headers['x-device-id'] ?? null,
  deviceName: headers['x-device-name'] ?? null,
});

/**
 * Segundo fator, dispositivos e atividade da conta (D4.7).
 * `@Throttle` só limita onde o `ThrottlerGuard` está aplicado — por isso ele
 * acompanha cada rota que confere código ou senha.
 */
@Controller('auth')
export class SecurityController {
  constructor(
    private readonly authService: AuthService,
    private readonly security: SessionSecurityService,
  ) {}

  /** Segunda etapa do login quando o 2FA está ativo. */
  @Post('2fa/login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  twoFactorLogin(@Body() body: { challengeToken: string; code: string }, @Headers() headers: Record<string, string | undefined>, @Ip() ip: string) {
    return this.authService.twoFactorLogin(String(body?.challengeToken ?? ''), String(body?.code ?? ''), metaFrom(headers, ip));
  }

  @Get('2fa/status')
  @UseGuards(JwtAuthGuard)
  status(@Request() req: any) {
    return this.security.status(req.user.id);
  }

  @Post('2fa/setup')
  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  setup(@Request() req: any) {
    return this.security.setup(req.user.id);
  }

  /** Ativa o 2FA; as outras sessões caem e o chamador recebe tokens novos. */
  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async enable(@Body() body: { code: string }, @Request() req: any) {
    const result = await this.security.enable(req.user.id, String(body?.code ?? ''));
    const tokens = await this.authService.reissueSession(req.user.id);
    return { ...result, ...tokens };
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  disable(@Body() body: { password: string; code: string }, @Request() req: any) {
    return this.security.disable(req.user.id, String(body?.password ?? ''), String(body?.code ?? ''));
  }

  /** Administração redefine o 2FA de alguém abaixo dela no seu escopo (perdeu o celular). */
  @Post('2fa/reset/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PARISH_ADMIN)
  reset(@Param('userId') userId: string, @Request() req: any) {
    return this.security.resetByAdmin(req.user, userId);
  }

  @Get('devices')
  @UseGuards(JwtAuthGuard)
  devices(@Request() req: any, @Headers() headers: Record<string, string | undefined>, @Ip() ip: string) {
    return this.security.listDevices(req.user.id, metaFrom(headers, ip));
  }

  /** Esquece um aparelho e encerra as sessões; quem pediu (de outro aparelho) recebe tokens novos. */
  @Delete('devices/:id')
  @UseGuards(JwtAuthGuard)
  async forget(@Param('id') id: string, @Request() req: any, @Headers() headers: Record<string, string | undefined>, @Ip() ip: string) {
    const result = await this.security.forgetDevice(req.user.id, id, metaFrom(headers, ip));
    if (result.current) return result;
    const tokens = await this.authService.reissueSession(req.user.id);
    return { ...result, ...tokens };
  }

  @Get('activity')
  @UseGuards(JwtAuthGuard)
  activity(@Request() req: any) {
    return this.security.myActivity(req.user.id);
  }
}
