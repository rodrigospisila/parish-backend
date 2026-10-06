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

type BroadcastTx = AuditCounter & {
  $queryRaw: (...args: any[]) => Promise<unknown>;
  auditLog: AuditCounter['auditLog'] & { create: (args: any) => Promise<{ id: string }> };
};
type BroadcastClient = {
  $transaction: (fn: (tx: any) => Promise<any>) => Promise<any>;
  auditLog: { update: (args: any) => Promise<unknown> };
};

/**
 * Reserva a vaga do aviso livre ANTES do envio: advisory lock por grupo e por
 * autor (sempre nesta ordem — sem deadlock), contagem do teto e gravação da
 * trilha na mesma transação. Antes a trilha (que é o contador) só era gravada
 * depois do envio e N requisições simultâneas passavam juntas pela contagem.
 * Devolve o id do registro, para `finishBroadcast` anotar quantos receberam.
 */
export async function reserveBroadcastQuota(
  prisma: BroadcastClient,
  opts: {
    entity: string;
    entityId: string;
    actor: { id: string; role?: string | null };
    authorEntities: string[];
    metadata?: Record<string, unknown>;
  },
): Promise<string> {
  return prisma.$transaction(async (tx: BroadcastTx) => {
    // ::text — o Prisma não desserializa o void do pg_advisory_xact_lock
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${'parish:broadcast:group:' + opts.entity + ':' + opts.entityId}))::text`;
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${'parish:broadcast:author:' + opts.actor.id}))::text`;
    await assertBroadcastQuota(tx, {
      entity: opts.entity,
      entityId: opts.entityId,
      actorUserId: opts.actor.id,
      authorEntities: opts.authorEntities,
    });
    // Mesmo formato do AuditService.log (ator com id: e-mail sai por join)
    const row = await tx.auditLog.create({
      data: {
        actorUserId: opts.actor.id,
        actorEmail: null,
        actorRole: opts.actor.role ?? null,
        action: 'CREATE',
        entity: opts.entity,
        entityId: opts.entityId,
        metadata: { ...(opts.metadata ?? {}), notified: 0 },
      },
      select: { id: true },
    });
    return row.id;
  });
}

/** Anota na trilha reservada quantas contas receberam (best-effort). */
export async function finishBroadcast(
  prisma: BroadcastClient,
  auditId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.auditLog.update({ where: { id: auditId }, data: { metadata } });
  } catch {
    // a trilha já conta no teto; o número de destinatários é informativo
  }
}
