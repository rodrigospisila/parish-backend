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

/** cuid/cuid2 (minúsculas e dígitos) ou uuid — o formato dos ids do banco. */
const ID_FORMAT = /^(?:[a-z0-9]{20,40}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/** Gravado no lugar de um communityId fora do formato (vindo do cliente). */
export const INVALID_COMMUNITY_ID = 'invalido';

/**
 * communityId pode vir CRU do cliente (params/query/body, quando fora do
 * escopo): só um id no formato do banco (até 40 caracteres) é gravado; fora
 * disso, "invalido". Evita inchar a memória e a tabela com valores enormes.
 */
export const normalizeHitCommunityId = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value !== 'string' || value.length > 40 || !ID_FORMAT.test(value)) return INVALID_COMMUNITY_ID;
  return value;
};

/**
 * Feature: só letras, dígitos e `_ . : / -` (as chaves de plan-rules e o
 * sufixo ":fora-do-escopo"), até 120 caracteres. O corte vem depois do filtro
 * (nunca parte um caractere ao meio) e o valor de entrada é limitado antes,
 * para não varrer um texto enorme.
 */
export const normalizeHitFeature = (value: unknown): string =>
  typeof value === 'string' ? value.slice(0, 512).replace(/[^A-Za-z0-9_.:/-]/g, '').slice(0, 120) : '';

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
      const feature = normalizeHitFeature(input.feature);
      const communityId = normalizeHitCommunityId(input.communityId);
      const key = `${input.kind}|${feature}|${communityId}|${input.mode}|${String(input.userId ?? '-').slice(0, 64)}`;
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
