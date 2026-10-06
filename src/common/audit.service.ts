import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHmac } from 'crypto';
import { PrismaService } from '../database/prisma.service';

/**
 * Prazo de retenção da trilha de auditoria (LGPD art. 15/16 — achado M49).
 * - Registros de ACESSO (login, falha de login, segundo fator): 6 meses, o
 *   mínimo do Marco Civil (art. 15) para provedor de aplicação.
 * - Demais ações (cadastro, exclusão, exportação, consentimento, finanças):
 *   5 anos, prazo de prescrição das ações civis/de consumo e da guarda contábil.
 * Passado o prazo, `purgeExpired()` apaga o registro. Mudar o prazo é decisão
 * de produto/jurídica: alinhar com a política de privacidade.
 */
export const AUDIT_ACCESS_RETENTION_DAYS = 180;
export const AUDIT_RETENTION_DAYS = 5 * 365;
export const AUDIT_ACCESS_ACTIONS: readonly string[] = [
  'LOGIN',
  'LOGIN_FAILED',
  'TWO_FACTOR_LOGIN',
  'TWO_FACTOR_LOGIN_FAILED',
  'TWO_FACTOR_BACKUP_USED',
];

/**
 * Chaves de before/after/metadata que carregam dado pessoal: nunca são
 * gravadas em claro — o valor vira um pseudônimo (HMAC), que permite
 * correlacionar registros sem revelar o dado. Comparação sem caixa.
 */
const AUDIT_PII_KEYS = new Set(
  [
    'email',
    'actorEmail',
    'account',
    'fullName',
    'cpf',
    'rg',
    'phone',
    'birthDate',
    'fatherName',
    'motherName',
    'spouseName',
    'responsibleName',
    'guardianName',
    'emergencyContactName',
    'emergencyContactPhone',
    'zipCode',
    'street',
    'complement',
    'neighborhood',
    'extractedName',
    'extractedBirthDate',
    'approvedByName',
  ].map((key) => key.toLowerCase()),
);

/** Valor que substitui o dado pessoal na pseudonimização da exclusão/anonimização. */
export const AUDIT_REDACTED = '[removido]';

/**
 * Ações registradas na trilha de auditoria.
 */
export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'SOFT_DELETE'
  | 'READ_SENSITIVE'
  | 'EXPORT'
  | 'ANONYMIZE'
  | 'CONSENT_CHANGE'
  | 'PASSWORD_RESET'
  | 'PASSWORD_CHANGE'
  | 'REGISTER'
  // Governança de acesso (D4.7): sessão e segundo fator
  | 'LOGIN'
  | 'LOGIN_FAILED'
  | 'TWO_FACTOR_SETUP'
  | 'TWO_FACTOR_ENABLED'
  | 'TWO_FACTOR_DISABLED'
  | 'TWO_FACTOR_RESET'
  | 'TWO_FACTOR_LOGIN'
  | 'TWO_FACTOR_LOGIN_FAILED'
  | 'TWO_FACTOR_BACKUP_USED'
  // Funil: fiel escolheu/trocou a comunidade no app (PATCH /users/me/community)
  | 'COMMUNITY_JOIN'
  // Horário fixo suspenso/reativado numa data ("não haverá Confissão às 15:00")
  | 'MASS_SCHEDULE_CANCELLED'
  | 'MASS_SCHEDULE_RESTORED'
  // Fila de propostas de dados (fonte oficial) revisada pelo SYSTEM_ADMIN
  | 'DATA_PROPOSAL_APPROVED'
  | 'DATA_PROPOSAL_REJECTED';

export interface AuditActor {
  id?: string;
  email?: string;
  role?: string;
}

export interface AuditEntry {
  actor?: AuditActor | null;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
}

export interface AuditQuery {
  entity?: string;
  entityId?: string;
  actorUserId?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Trilha de auditoria (LGPD / rastreabilidade).
 *
 * Regras:
 * - `log()` nunca lança exceção: auditoria não pode derrubar o fluxo de negócio
 *   (falhas são registradas no logger para monitoramento).
 * - Só o `actorUserId` identifica o autor: o e-mail não é gravado (sai por
 *   join na consulta, enquanto a conta existir). Sem id (tentativa de login),
 *   fica só o pseudônimo do e-mail.
 * - Dado pessoal em before/after/metadata (AUDIT_PII_KEYS) vira pseudônimo.
 * - Registros não são editados, com duas exceções: a exclusão/anonimização do
 *   titular (`pseudonymizeSubject`) e o expurgo pelo prazo (`purgeExpired`).
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  private toJson(value?: Record<string, unknown> | null): Prisma.InputJsonValue | undefined {
    if (!value) {
      return undefined;
    }

    try {
      const plain = JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
      return this.scrubPersonalData(plain, (raw) => this.pseudonymize(raw)) as Prisma.InputJsonValue;
    } catch {
      return undefined;
    }
  }

  /**
   * Pseudônimo estável (HMAC-SHA256 com chave do servidor, 16 hex): o mesmo
   * e-mail gera o mesmo pseudônimo, sem que o registro revele o e-mail.
   */
  pseudonymize(value: unknown): string | null {
    if (value === null || value === undefined || value === '') return null;
    const key = process.env.AUDIT_PSEUDONYM_KEY || process.env.JWT_SECRET || 'parish-audit';
    const normalized = String(value).trim().toLowerCase();
    return `pseud:${createHmac('sha256', key).update(normalized).digest('hex').slice(0, 16)}`;
  }

  /** Troca, em profundidade, o valor de toda chave com dado pessoal. */
  private scrubPersonalData(value: unknown, replace: (raw: unknown) => unknown, depth = 0): unknown {
    if (depth > 8 || value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map((item) => this.scrubPersonalData(item, replace, depth + 1));
    const out: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      out[key] =
        AUDIT_PII_KEYS.has(key.toLowerCase()) && raw !== null && raw !== undefined && typeof raw !== 'object'
          ? replace(raw)
          : this.scrubPersonalData(raw, replace, depth + 1);
    }
    return out;
  }

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId: entry.actor?.id ?? null,
          // Com id, o e-mail sai por join na consulta; sem id, só o pseudônimo
          actorEmail: entry.actor?.id ? null : this.pseudonymize(entry.actor?.email),
          actorRole: entry.actor?.role ?? null,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId ?? null,
          before: this.toJson(entry.before),
          after: this.toJson(entry.after),
          metadata: this.toJson(entry.metadata),
          ip: entry.ip ?? null,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Falha ao gravar auditoria (${entry.action} ${entry.entity}${entry.entityId ? `#${entry.entityId}` : ''}): ${error}`,
      );
    }
  }

  /**
   * Auditoria escopada (D4.7): a administração paroquial vê o que a própria
   * equipe fez (atores da paróquia); a diocesana, a diocese; a coordenação, a
   * comunidade. Sem filtro por entidade sensível de outro escopo.
   */
  async findScoped(
    user: { id: string; role: string; parishId?: string | null; dioceseId?: string | null; communityId?: string | null },
    query: AuditQuery,
  ) {
    let actorWhere: Record<string, unknown> | null = null;
    if (user.role === 'SYSTEM_ADMIN') actorWhere = {};
    else if (user.role === 'DIOCESAN_ADMIN' && user.dioceseId) actorWhere = { dioceseId: user.dioceseId };
    else if (user.role === 'PARISH_ADMIN' && user.parishId) actorWhere = { parishId: user.parishId };
    else if (user.role === 'COMMUNITY_COORDINATOR' && user.communityId) actorWhere = { communityId: user.communityId };
    if (!actorWhere) return { total: 0, page: 1, pageSize: 25, items: [] };
    const actors = actorWhere && Object.keys(actorWhere).length
      ? (await this.prisma.user.findMany({ where: actorWhere, select: { id: true }, take: 5000 })).map((u) => u.id)
      : null;
    const scopedQuery: AuditQuery & { actorIds?: string[] } = { ...query };
    if (actors) scopedQuery.actorIds = actors.length ? actors : ['__none__'];
    return this.findAll(scopedQuery as AuditQuery);
  }

  async findAll(query: AuditQuery & { actorIds?: string[] }) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 25));

    const where: Prisma.AuditLogWhereInput = {};

    if (query.entity) {
      where.entity = query.entity;
    }
    if (query.entityId) {
      where.entityId = query.entityId;
    }
    if (query.actorUserId) {
      where.actorUserId = query.actorUserId;
    }
    if (query.actorIds) {
      where.actorUserId = { in: query.actorIds };
    }
    if (query.action) {
      where.action = query.action;
    }
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    // E-mail do autor por join (não é mais gravado): só enquanto a conta existe
    // e não foi anonimizada. Registros antigos mantêm o gravado (pseudonimizado
    // na exclusão do titular).
    const actorIds = [
      ...new Set(items.map((item) => item.actorUserId).filter((id): id is string => !!id)),
    ];
    const actors = actorIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: actorIds }, anonymizedAt: null },
          select: { id: true, email: true },
        })
      : [];
    const emailById = new Map(actors.map((actor) => [actor.id, actor.email]));

    return {
      total,
      page,
      pageSize,
      items: items.map((item) => ({
        ...item,
        actorEmail: (item.actorUserId && emailById.get(item.actorUserId)) || item.actorEmail,
      })),
    };
  }

  /**
   * Exclusão/anonimização do titular (M49): os registros em que ele é o autor
   * ou o alvo perdem o e-mail gravado e os dados pessoais de before/after/
   * metadata (viram AUDIT_REDACTED), inclusive o pseudônimo do e-mail gravado
   * nas tentativas sem id. O id (pseudônimo técnico) fica, para a
   * trilha continuar íntegra. Nunca lança: devolve quantos registros mudaram.
   */
  async pseudonymizeSubject(subject: {
    userId?: string | null;
    memberId?: string | null;
    /** E-mail do titular: acha os registros sem id gravados só com o pseudônimo dele */
    email?: string | null;
  }): Promise<number> {
    const ids = [subject.userId, subject.memberId].filter((id): id is string => !!id);
    const emailPseudonym = this.pseudonymize(subject.email);
    if (!ids.length && !emailPseudonym) return 0;
    let changed = 0;
    try {
      const where: Prisma.AuditLogWhereInput = {
        OR: [
          ...(subject.userId ? [{ actorUserId: subject.userId }] : []),
          ...(ids.length ? [{ entityId: { in: ids } }] : []),
          ...(emailPseudonym
            ? [{ actorEmail: emailPseudonym }, { metadata: { path: ['account'], equals: emailPseudonym } }]
            : []),
        ],
      };
      const cleared = await this.prisma.auditLog.updateMany({
        where: { ...where, actorEmail: { not: null } },
        data: { actorEmail: null },
      });
      changed += cleared.count;

      // JSON não se reescreve por updateMany: lotes de registros com detalhe
      let cursor: string | undefined;
      for (;;) {
        const batch = await this.prisma.auditLog.findMany({
          where,
          select: { id: true, before: true, after: true, metadata: true },
          orderBy: { id: 'asc' },
          take: 200,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        });
        if (!batch.length) break;
        for (const row of batch) {
          const data: Prisma.AuditLogUpdateInput = {};
          for (const field of ['before', 'after', 'metadata'] as const) {
            const current = row[field];
            if (current === null || typeof current !== 'object') continue;
            const redacted = this.scrubPersonalData(current, () => AUDIT_REDACTED);
            if (JSON.stringify(redacted) !== JSON.stringify(current)) {
              data[field] = redacted as Prisma.InputJsonValue;
            }
          }
          if (Object.keys(data).length) {
            await this.prisma.auditLog.update({ where: { id: row.id }, data });
            changed += 1;
          }
        }
        cursor = batch[batch.length - 1].id;
        if (batch.length < 200) break;
      }
    } catch (error) {
      this.logger.warn(`Falha ao pseudonimizar a auditoria do titular: ${error}`);
    }
    return changed;
  }

  /**
   * Expurgo pelo prazo de retenção (AUDIT_*_RETENTION_DAYS). Chamável por um
   * job diário (agendamento é da frente de jobs). Devolve quantos apagou.
   */
  async purgeExpired(now: Date = new Date()): Promise<{ access: number; others: number }> {
    const day = 24 * 60 * 60 * 1000;
    const accessCutoff = new Date(now.getTime() - AUDIT_ACCESS_RETENTION_DAYS * day);
    const generalCutoff = new Date(now.getTime() - AUDIT_RETENTION_DAYS * day);
    const access = await this.prisma.auditLog.deleteMany({
      where: { action: { in: [...AUDIT_ACCESS_ACTIONS] }, createdAt: { lt: accessCutoff } },
    });
    const others = await this.prisma.auditLog.deleteMany({
      where: { action: { notIn: [...AUDIT_ACCESS_ACTIONS] }, createdAt: { lt: generalCutoff } },
    });
    if (access.count || others.count) {
      this.logger.log(`Auditoria expurgada pelo prazo: ${access.count} de acesso, ${others.count} demais`);
    }
    return { access: access.count, others: others.count };
  }
}
