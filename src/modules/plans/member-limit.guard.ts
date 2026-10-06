import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger, Optional } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PlanAccessService } from './plan-access.service';
import { HierarchyService } from '../../common/hierarchy.service';

export const MEMBER_LIMIT_MESSAGE = 'A comunidade atingiu o limite de membros da faixa do plano';

/** Mesmo aviso (comunidade) no máximo uma vez a cada 6 h. */
const LOG_DEDUPE_MS = 6 * 60 * 60_000;

/**
 * Limite de membros da faixa (`PlanTier.maxMembers`) na criação de membro
 * (B32). Comunidade em `body.communityId`. Segue o `PLAN_ENFORCEMENT`:
 *  - `off` → nada;
 *  - `log` (PADRÃO) → cria e registra (warn) que a comunidade passou da faixa;
 *  - `on`  → 403 `{ code:'PLAN_MEMBER_LIMIT', communityId, maxMembers, activeMembers, message }`.
 * Sem plano, plano FREE/SUSPENDED/CANCELED ou faixa sem limite → nada.
 * Falha ao consultar libera (cadastro pastoral nunca para por causa da cobrança).
 * Comunidade FORA do escopo de quem cadastra (revisão #33): o guard não olha o
 * plano dela — libera e o serviço responde o 403 de escopo. Antes, com `on`,
 * o 403 do limite vinha primeiro e entregava a contagem de membros e o
 * limite de qualquer comunidade do país.
 */
@Injectable()
export class MemberLimitGuard implements CanActivate {
  private readonly logger = new Logger('MemberLimitGuard');
  private readonly logged = new Map<string, number>();

  constructor(
    private readonly access: PlanAccessService,
    // Opcional só para specs antigos; no módulo vem do CommonModule (global)
    @Optional() private readonly hierarchy?: HierarchyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const mode = this.access.enforcement();
    if (mode === 'off') return true;

    const req = context.switchToHttp().getRequest();
    const user = req?.user;
    if (!user?.role || user.role === UserRole.SYSTEM_ADMIN) return true;

    const communityId = typeof req?.body?.communityId === 'string' ? req.body.communityId.trim() : '';
    if (!communityId) return true; // o DTO/service recusa

    let status;
    try {
      // Fora do escopo: nada de plano nem contagem — o serviço recusa (#33)
      if (!this.hierarchy || !(await this.hierarchy.isCommunityInScope(user, communityId))) return true;
      status = await this.access.memberLimitStatus(communityId);
    } catch (error) {
      this.logger.error(`Falha ao verificar o limite de membros — liberado: ${error}`);
      return true;
    }
    if (!status?.reached) return true;

    if (mode === 'log') {
      const now = Date.now();
      const last = this.logged.get(communityId);
      if (!last || now - last >= LOG_DEDUPE_MS) {
        if (this.logged.size > 10_000) this.logged.clear();
        this.logged.set(communityId, now);
        this.logger.warn(
          `[PLAN_ENFORCEMENT=log] limite da faixa: community=${communityId} membros=${status.activeMembers} ` +
            `limite=${status.maxMembers} user=${user.id}`,
        );
      }
      return true;
    }

    throw new ForbiddenException({
      code: 'PLAN_MEMBER_LIMIT',
      communityId,
      maxMembers: status.maxMembers,
      activeMembers: status.activeMembers,
      message: MEMBER_LIMIT_MESSAGE,
    });
  }
}
