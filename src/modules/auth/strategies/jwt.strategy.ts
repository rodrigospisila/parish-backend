import { ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { AuthService } from '../auth.service';
import {
  isAllowedDuringPasswordChange,
  parseEnforcement,
  PASSWORD_CHANGE_REQUIRED,
} from '../password-change-policy';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);
  /** Modo `log`: avisa uma vez por usuário (por processo), sem encher o log a cada requisição. */
  private readonly pendingChangeLogged = new Set<string>();

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
      // A rota é necessária para a troca de senha obrigatória
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    // Só tokens de SESSÃO valem como Bearer. Desafios do 2FA (`purpose`) e
    // refresh tokens (`typ`) carregam `sub` mas não são sessão — sem esta
    // checagem, o desafio emitido com e-mail+senha contornaria o segundo fator.
    if (!payload?.sub || payload.purpose || payload.typ) {
      throw new UnauthorizedException();
    }

    // `sid`: sessão do aparelho. Tokens de antes desta versão não têm — valem
    // até expirar (no máximo o JWT_EXPIRES_IN), sem a checagem de sessão.
    const sessionId = typeof payload.sid === 'string' && payload.sid ? payload.sid : undefined;
    const user = await this.authService.validateUser(payload.sub, sessionId);

    if (!user) {
      throw new UnauthorizedException();
    }

    // Sessões encerradas (2FA ativado/redefinido, senha trocada ou redefinida,
    // aparelho esquecido, "sair de todos"): tokens emitidos antes caem na hora.
    const revokedAt = (user as any).sessionsRevokedAt as Date | null | undefined;
    if (revokedAt && typeof payload.iat === 'number' && payload.iat * 1000 < revokedAt.getTime()) {
      throw new UnauthorizedException('Sessão encerrada — entre novamente');
    }

    // Sessão deste aparelho encerrada (logout, reuso de refresh token)
    if (sessionId && !(user as any).sessionAlive) {
      throw new UnauthorizedException('Sessão encerrada — entre novamente');
    }

    if ((user as any).forcePasswordChange) this.checkPendingPasswordChange(req, user.id);

    const { sessionsRevokedAt: _revoked, sessionAlive: _alive, ...session } = user as any;
    return {
      ...session,
      sessionId: sessionId ?? null,
      // Hora (s) do último login com senha — null em token antigo
      authTime: typeof payload.at === 'number' ? payload.at : null,
    };
  }

  /** M18: com a troca pendente, só trocar a senha, ler o perfil e sair (ver password-change-policy). */
  private checkPendingPasswordChange(req: Request, userId: string) {
    const mode = parseEnforcement(this.configService.get<string>('PASSWORD_CHANGE_ENFORCEMENT'));
    if (mode === 'off') return;
    if (isAllowedDuringPasswordChange(req?.method, req?.originalUrl ?? req?.url)) return;
    if (mode === 'on') {
      throw new ForbiddenException({
        statusCode: 403,
        code: PASSWORD_CHANGE_REQUIRED,
        message: 'Troque a sua senha para continuar',
      });
    }
    if (!this.pendingChangeLogged.has(userId) && this.pendingChangeLogged.size < 10_000) {
      this.pendingChangeLogged.add(userId);
      this.logger.warn(`Troca de senha pendente ignorada (PASSWORD_CHANGE_ENFORCEMENT=log): usuário ${userId}`);
    }
  }
}
