import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export type EnforcementKind = 'PLAN_FEATURE' | 'PLAN_MEMBER_LIMIT' | 'TERMS' | 'PASSWORD_CHANGE';

export interface EnforcementHitInput {
  kind: EnforcementKind;
  /** Feature do plano ou rota; vazio quando não se aplica */
  feature?: string | null;
  communityId?: string | null;
  /** Quem foi barrado (ou seria). Só usado para contar uma vez por pessoa/dia; não é gravado. */
  userId?: string | null;
  mode: 'log' | 'on';
}

/**
 * Conta o que os modos de enforcement (PLAN/TERMS/PASSWORD_CHANGE) bloqueariam
 * em `log` ou bloquearam em `on`, por dia (America/Sao_Paulo), tipo, feature e
 * comunidade. Cada pessoa conta uma vez por dia e chave (aproximado: o controle
 * é em memória, por instância). Nunca lança erro nem atrasa a requisição.
 */
@Injectable()
export class EnforcementHitsService {
  private readonly logger = new Logger(EnforcementHitsService.name);
  private seenDay = '';
  private seen = new Set<string>();

  constructor(private readonly prisma: PrismaService) {}

  record(input: EnforcementHitInput): void {
    try {
      const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
      if (day !== this.seenDay) {
        this.seenDay = day;
        this.seen = new Set();
      }
      const feature = (input.feature ?? '').slice(0, 120);
      const communityId = input.communityId ?? '';
      const key = `${input.kind}|${feature}|${communityId}|${input.mode}|${input.userId ?? '-'}`;
      if (this.seen.has(key)) return;
      if (this.seen.size >= 50_000) return;
      this.seen.add(key);
      const dayDate = new Date(`${day}T00:00:00.000Z`);
      void this.prisma.enforcementHit
        .upsert({
          where: { day_kind_feature_communityId_mode: { day: dayDate, kind: input.kind, feature, communityId, mode: input.mode } },
          create: { day: dayDate, kind: input.kind, feature, communityId, mode: input.mode, count: 1 },
          update: { count: { increment: 1 }, lastAt: new Date() },
        })
        .catch((error) => this.logger.warn(`Falha ao contar enforcement ${input.kind}: ${error}`));
    } catch (error) {
      this.logger.warn(`Falha ao contar enforcement: ${error}`);
    }
  }
}
