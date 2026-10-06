import { BadRequestException } from '@nestjs/common';
import { todayCivil } from '../catechesis/civil-date';

/**
 * Freio dos avisos em massa da equipe (turma de catequese, pastoral): cada
 * aviso desce a cadeia push → e-mail → SMS cobrado, então um laço em
 * POST .../notify virava spam para as famílias e custo sem teto. A contagem
 * usa a trilha de auditoria que cada envio já grava (entidade + id do grupo),
 * no dia civil de Brasília — vale entre instâncias e sobrevive a reinício.
 */
export const BROADCAST_LIMITS = {
  /** Avisos livres por turma/pastoral por dia. */
  perGroupPerDay: 5,
  /** Avisos livres por autor por dia (todas as turmas/pastorais somadas). */
  perAuthorPerDay: 20,
  /** Avisos automáticos de encontro (novo/remarcado/agenda) por turma por dia. */
  sessionNoticesPerClassPerDay: 10,
} as const;

type AuditCounter = { auditLog: { count: (args: any) => Promise<number> } };

/** Início do dia civil de Brasília (-03 fixo). */
export function startOfCivilDay(now: Date = new Date()): Date {
  return new Date(`${todayCivil(now)}T00:00:00-03:00`);
}

/** Envios de hoje registrados para o grupo (entity + entityId). */
export async function countGroupBroadcastsToday(
  prisma: AuditCounter,
  entity: string,
  entityId: string,
): Promise<number> {
  return prisma.auditLog.count({
    where: { entity, entityId, createdAt: { gte: startOfCivilDay() } },
  });
}

/**
 * Barra o aviso livre quando o grupo ou o autor já passaram do teto do dia.
 * `authorEntities`: as entidades de aviso livre que contam no teto do autor.
 */
export async function assertBroadcastQuota(
  prisma: AuditCounter,
  opts: { entity: string; entityId: string; actorUserId: string; authorEntities: string[] },
) {
  const since = startOfCivilDay();
  const [groupCount, authorCount] = await Promise.all([
    prisma.auditLog.count({ where: { entity: opts.entity, entityId: opts.entityId, createdAt: { gte: since } } }),
    prisma.auditLog.count({
      where: { entity: { in: opts.authorEntities }, actorUserId: opts.actorUserId, createdAt: { gte: since } },
    }),
  ]);
  if (groupCount >= BROADCAST_LIMITS.perGroupPerDay) {
    throw new BadRequestException(
      `Limite de ${BROADCAST_LIMITS.perGroupPerDay} avisos por dia para este grupo atingido — tente amanhã`,
    );
  }
  if (authorCount >= BROADCAST_LIMITS.perAuthorPerDay) {
    throw new BadRequestException(
      `Limite de ${BROADCAST_LIMITS.perAuthorPerDay} avisos por dia por pessoa atingido — tente amanhã`,
    );
  }
}

/** Entidades de auditoria dos avisos livres (contam no teto por autor). */
export const BROADCAST_AUTHOR_ENTITIES = ['CatechesisClassMessage', 'PastoralBroadcast'];
