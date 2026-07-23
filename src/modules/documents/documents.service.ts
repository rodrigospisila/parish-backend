import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService, CurrentUser } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';

/**
 * Documentos e memória pastoral (roadmap 3.3).
 * Preserva atas, planejamentos, manuais, prestações de contas etc. com
 * controle de versões, escopo e arquivamento. O documento pertence à
 * pastoral/comunidade (não à pessoa) — garante continuidade após troca de
 * coordenação. O upload binário ao storage (S3) fica para etapa posterior;
 * aqui a memória e os metadados/versões já são preservados.
 */
@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
    private readonly auditService: AuditService,
  ) {}

  private auditActor(user: CurrentUser) {
    return { id: user.id, email: user.email, role: user.role };
  }

  private canManage(role: UserRole) {
    return role !== UserRole.VOLUNTEER && role !== UserRole.FAITHFUL;
  }

  async create(
    dto: {
      title: string;
      category: string;
      communityId?: string;
      communityPastoralId?: string;
      responsibleMemberId?: string;
      storageKey?: string;
      fileUrl?: string;
      validUntil?: string;
    },
    user: CurrentUser,
  ) {
    if (!this.canManage(user.role)) {
      throw new ForbiddenException('Você não tem permissão para cadastrar documentos');
    }
    if (!user.parishId && user.role !== UserRole.SYSTEM_ADMIN) {
      throw new BadRequestException('Usuário sem paróquia vinculada');
    }
    if (dto.communityId) {
      const inScope = await this.hierarchyService.isCommunityInScope(user, dto.communityId);
      if (!inScope) throw new ForbiddenException('Comunidade fora do seu escopo');
    }

    const doc = await this.prisma.pastoralDocument.create({
      data: {
        title: dto.title,
        category: dto.category,
        parishId: user.parishId!,
        communityId: dto.communityId ?? null,
        communityPastoralId: dto.communityPastoralId ?? null,
        responsibleMemberId: dto.responsibleMemberId ?? null,
        storageKey: dto.storageKey ?? null,
        fileUrl: dto.fileUrl ?? null,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        versions: {
          create: {
            version: 1,
            storageKey: dto.storageKey ?? null,
            fileUrl: dto.fileUrl ?? null,
            createdByUserId: user.id,
          },
        },
      },
    });
    await this.auditService.log({ actor: this.auditActor(user), action: 'CREATE', entity: 'PastoralDocument', entityId: doc.id });
    return doc;
  }

  async list(
    user: CurrentUser,
    filters: { category?: string; communityId?: string; communityPastoralId?: string; includeArchived?: boolean },
  ) {
    const where: any = { deletedAt: null };
    if (!filters.includeArchived) where.isArchived = false;
    if (filters.category) where.category = filters.category;
    if (filters.communityPastoralId) where.communityPastoralId = filters.communityPastoralId;

    if (filters.communityId) {
      const inScope = await this.hierarchyService.isCommunityInScope(user, filters.communityId);
      if (!inScope) throw new ForbiddenException('Comunidade fora do seu escopo');
      where.communityId = filters.communityId;
    } else if (user.role !== UserRole.SYSTEM_ADMIN && user.parishId) {
      where.parishId = user.parishId;
    }

    return this.prisma.pastoralDocument.findMany({
      where,
      include: { _count: { select: { versions: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  private async loadInScope(id: string, user: CurrentUser) {
    const doc = await this.prisma.pastoralDocument.findFirst({ where: { id, deletedAt: null } });
    if (!doc) throw new NotFoundException('Documento não encontrado');
    if (user.role !== UserRole.SYSTEM_ADMIN && doc.parishId !== user.parishId) {
      throw new ForbiddenException('Documento fora do seu escopo');
    }
    return doc;
  }

  async getWithVersions(id: string, user: CurrentUser) {
    await this.loadInScope(id, user);
    return this.prisma.pastoralDocument.findUnique({
      where: { id },
      include: { versions: { orderBy: { version: 'desc' } } },
    });
  }

  /** Adiciona uma nova versão (controle de versões). */
  async addVersion(
    id: string,
    dto: { storageKey?: string; fileUrl?: string; notes?: string },
    user: CurrentUser,
  ) {
    const doc = await this.loadInScope(id, user);
    if (!this.canManage(user.role)) {
      throw new ForbiddenException('Sem permissão para versionar documentos');
    }
    const nextVersion = doc.currentVersion + 1;

    const [updated] = await this.prisma.$transaction([
      this.prisma.pastoralDocument.update({
        where: { id },
        data: {
          currentVersion: nextVersion,
          storageKey: dto.storageKey ?? doc.storageKey,
          fileUrl: dto.fileUrl ?? doc.fileUrl,
        },
      }),
      this.prisma.documentVersion.create({
        data: {
          documentId: id,
          version: nextVersion,
          storageKey: dto.storageKey ?? null,
          fileUrl: dto.fileUrl ?? null,
          notes: dto.notes ?? null,
          createdByUserId: user.id,
        },
      }),
    ]);

    await this.auditService.log({ actor: this.auditActor(user), action: 'UPDATE', entity: 'PastoralDocument', entityId: id, metadata: { newVersion: nextVersion } });
    return updated;
  }

  async archive(id: string, isArchived: boolean, user: CurrentUser) {
    await this.loadInScope(id, user);
    if (!this.canManage(user.role)) throw new ForbiddenException('Sem permissão');
    return this.prisma.pastoralDocument.update({ where: { id }, data: { isArchived } });
  }

  async remove(id: string, user: CurrentUser) {
    await this.loadInScope(id, user);
    if (user.role === UserRole.VOLUNTEER || user.role === UserRole.FAITHFUL) {
      throw new ForbiddenException('Sem permissão');
    }
    // Soft delete: preserva a memória (recuperável)
    const removed = await this.prisma.pastoralDocument.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.auditService.log({ actor: this.auditActor(user), action: 'SOFT_DELETE', entity: 'PastoralDocument', entityId: id });
    return removed;
  }
}
