import { ExecutionContext, Injectable } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ThrottlerGuard, ThrottlerModuleOptions, ThrottlerRequest } from '@nestjs/throttler';

/** Chave de metadado gravada por `@Throttle` (THROTTLER_LIMIT da lib, não exportada no índice). */
const THROTTLER_LIMIT = 'THROTTLER:LIMIT';

/**
 * Limites de requisição da API (achado A12 da auditoria).
 *
 * Três janelas nomeadas:
 * - `default` (1 min): vale em toda rota. Quem declara `@Throttle({ default })`
 *   usa o próprio limite; as demais rotas usam o teto geral GLOBAL_THROTTLE
 *   (no guard global) ou 60/min (guards por rota já existentes — dízimo etc.).
 * - `hourly` (1 h) e `target` (1 h, por alvo: celular/e-mail do corpo): só
 *   valem nas rotas que os declaram explicitamente em `@Throttle`.
 *
 * O IP vem de `req.ip`, que respeita o `trust proxy` do main.ts (Railway).
 */

/** Teto geral por IP, por rota, por minuto — folgado para o painel/app (listas, avatares, NAT de operadora). */
export const GLOBAL_THROTTLE = { limit: 300, ttl: 60_000 } as const;

const MINUTE = 60_000;
const HOUR = 3_600_000;
/** "Sem limite" para as janelas opcionais quando a rota não as declara (de todo modo são puladas). */
const UNBOUNDED = 1_000_000_000;

const declaresThrottler = (context: ExecutionContext, name: string) =>
  Reflect.getMetadata(THROTTLER_LIMIT + name, context.getHandler()) !== undefined ||
  Reflect.getMetadata(THROTTLER_LIMIT + name, context.getClass()) !== undefined;

export const THROTTLER_OPTIONS: ThrottlerModuleOptions = {
  throttlers: [
    // Padrão dos guards por rota já existentes (dízimo, mapa público, 2FA...) — inalterado
    { name: 'default', ttl: MINUTE, limit: 60 },
    { name: 'hourly', ttl: HOUR, limit: UNBOUNDED, skipIf: (context) => !declaresThrottler(context, 'hourly') },
    { name: 'target', ttl: HOUR, limit: UNBOUNDED, skipIf: (context) => !declaresThrottler(context, 'target') },
  ],
  errorMessage: 'Muitas tentativas seguidas. Aguarde um pouco e tente de novo.',
};

/**
 * Rastreador por ALVO da requisição (celular ou e-mail no corpo): limita o
 * envio de SMS/e-mail para a mesma pessoa vindo de IPs diferentes. Sem alvo
 * no corpo, cai para o IP.
 */
export function bodyTargetTracker(req: Record<string, any>): string {
  const body = req.body ?? {};
  const phoneDigits = typeof body.phone === 'string' ? body.phone.replace(/\D/g, '').slice(-11) : '';
  if (phoneDigits) return `phone:${phoneDigits}`;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (email) return `email:${email}`;
  return `ip:${req.ip}`;
}

const isThrottlerGuardRef = (guard: unknown) =>
  guard instanceof ThrottlerGuard ||
  (typeof guard === 'function' && (guard === ThrottlerGuard || guard.prototype instanceof ThrottlerGuard));

/**
 * Guard GLOBAL (APP_GUARD). Rotas que já aplicam um ThrottlerGuard próprio em
 * `@UseGuards` (dízimo por usuário, mapa público, webhooks de pagamento,
 * WhatsApp, 2FA, troca de senha) ficam só com ele — sem contagem dupla nem um
 * segundo limite por IP. Nas demais, sem `@Throttle` próprio, vale o teto geral.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const guards = [
      ...((Reflect.getMetadata(GUARDS_METADATA, context.getHandler()) as unknown[]) ?? []),
      ...((Reflect.getMetadata(GUARDS_METADATA, context.getClass()) as unknown[]) ?? []),
    ];
    return guards.some(isThrottlerGuardRef);
  }

  protected async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    if (requestProps.throttler.name === 'default' && !declaresThrottler(requestProps.context, 'default')) {
      return super.handleRequest({
        ...requestProps,
        limit: GLOBAL_THROTTLE.limit,
        ttl: GLOBAL_THROTTLE.ttl,
        blockDuration: GLOBAL_THROTTLE.ttl,
      });
    }
    return super.handleRequest(requestProps);
  }
}

/**
 * Limita por usuário autenticado (cai para o IP sem sessão). Precisa vir
 * DEPOIS do JwtAuthGuard (guard de método roda após os da classe).
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return req.user?.id ? `user:${req.user.id}` : `ip:${req.ip}`;
  }
}
