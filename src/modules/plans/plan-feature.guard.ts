import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { PlanAccessService } from './plan-access.service';
import {
  PLAN_FEATURE_KEY,
  PLAN_RESOURCE_KEY,
  PLAN_SKIP_KEY,
  PlanFeatureMeta,
  PlanResourceSpec,
} from './plan.decorators';

export const PLAN_REQUIRED_MESSAGE = 'Disponível no plano da comunidade';

/** Mesmo aviso (usuário+comunidade+feature+rota) no máximo uma vez a cada 10 min. */
const LOG_DEDUPE_MS = 10 * 60_000;

/**
 * Bloqueio dos recursos pagos por COMUNIDADE (`@RequiresFeature`).
 *
 * `PLAN_ENFORCEMENT`:
 *  - `off` → não consulta nada;
 *  - `log` (PADRÃO) → nunca bloqueia; registra (warn) quem SERIA barrado;
 *  - `on`  → 403 `{ code:'PLAN_REQUIRED', feature, communityId, message }`.
 *
 * Falha ao consultar o plano (banco fora, etc.) libera a requisição e registra
 * erro — cobrança nunca derruba a operação pastoral.
 */
@Injectable()
export class PlanFeatureGuard implements CanActivate {
  private readonly logger = new Logger('PlanFeatureGuard');
  private readonly logged = new Map<string, number>();

  constructor(
    private readonly reflector: Reflector,
    private readonly access: PlanAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    const meta = this.reflector.getAllAndOverride<PlanFeatureMeta | undefined>(PLAN_FEATURE_KEY, targets);
    if (!meta) return true;
    if (this.reflector.getAllAndOverride<boolean>(PLAN_SKIP_KEY, targets)) return true;

    const mode = this.access.enforcement();
    if (mode === 'off') return true;

    const req = context.switchToHttp().getRequest();
    const user = req?.user;
    // Autenticação é do JwtAuthGuard (que vem antes); sem usuário, não é conosco
    if (!user?.role) return true;
    if (user.role === UserRole.SYSTEM_ADMIN) return true;

    const resources =
      this.reflector.get<PlanResourceSpec[] | undefined>(PLAN_RESOURCE_KEY, context.getHandler()) ?? [];

    let decision;
    try {
      decision = await this.access.decide(meta, user, req, resources);
    } catch (error) {
      this.logger.error(`Falha ao verificar o plano (${meta.feature}) — liberado: ${error}`);
      return true;
    }
    if (decision.allowed) return true;

    if (mode === 'log') {
      this.logWouldBlock(req, user, meta.feature, decision.communityId, decision.target);
      return true;
    }

    throw new ForbiddenException({
      code: 'PLAN_REQUIRED',
      feature: meta.feature,
      communityId: decision.communityId,
      message: PLAN_REQUIRED_MESSAGE,
    });
  }

  private logWouldBlock(req: any, user: any, feature: string, communityId: string | null, target: string) {
    // Padrão da rota (sem query string: nada de dado pessoal no log)
    const route = `${req?.method ?? '?'} ${req?.baseUrl ?? ''}${req?.route?.path ?? req?.path ?? ''}`;
    const key = `${user.id}|${communityId ?? target}|${feature}|${route}`;
    const now = Date.now();
    const last = this.logged.get(key);
    if (last && now - last < LOG_DEDUPE_MS) return;
    if (this.logged.size > 10_000) this.logged.clear();
    this.logged.set(key, now);

    this.logger.warn(
      `[PLAN_ENFORCEMENT=log] bloquearia ${route} feature=${feature} user=${user.id} role=${user.role} ` +
        `community=${communityId ?? '-'} alvo=${target}`,
    );
  }
}
