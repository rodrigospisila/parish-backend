import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

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
  | 'REGISTER';

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
 * Trilha de auditoria append-only (LGPD / rastreabilidade).
 *
 * Regras:
 * - `log()` nunca lança exceção: auditoria não pode derrubar o fluxo de negócio
 *   (falhas são registradas no logger para monitoramento).
 * - Registros nunca são atualizados nem excluídos pela aplicação.
 * - Ações ANONYMIZE não devem armazenar dados pessoais em claro no `before`.
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
      return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
    } catch {
      return undefined;
    }
  }

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId: entry.actor?.id ?? null,
          actorEmail: entry.actor?.email ?? null,
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

  async findAll(query: AuditQuery) {
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

    return { total, page, pageSize, items };
  }
}
