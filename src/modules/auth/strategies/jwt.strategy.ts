import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');

    if (!jwtSecret) {
      // Nunca usar fallback silencioso: um segredo previsível permitiria
      // forjar tokens de qualquer usuário.
      throw new Error('[SEGURANÇA] JWT_SECRET não definido — a autenticação não pode iniciar.');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: any) {
    // Só tokens de SESSÃO valem como Bearer. Desafios do 2FA (`purpose`) e
    // refresh tokens (`typ`) carregam `sub` mas não são sessão — sem esta
    // checagem, o desafio emitido com e-mail+senha contornaria o segundo fator.
    if (!payload?.sub || payload.purpose || payload.typ) {
      throw new UnauthorizedException();
    }

    const user = await this.authService.validateUser(payload.sub);

    if (!user) {
      throw new UnauthorizedException();
    }

    // Sessões encerradas (2FA ativado/redefinido, senha redefinida pela
    // administração, aparelho esquecido): tokens emitidos antes caem na hora.
    const revokedAt = (user as any).sessionsRevokedAt as Date | null | undefined;
    if (revokedAt && typeof payload.iat === 'number' && payload.iat * 1000 < revokedAt.getTime()) {
      throw new UnauthorizedException('Sessão encerrada — entre novamente');
    }

    const { sessionsRevokedAt: _revoked, ...session } = user as any;
    return session;
  }
}
