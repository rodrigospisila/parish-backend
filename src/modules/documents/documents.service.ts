import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService, CurrentUser } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';
import { memberOfParishWhere, resolveCoordinatedPastoralIds } from '../pastorals/coordination-scope';

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

  /**
   * Escopo de GESTÃO dos documentos (filtro PastoralDocumentWhereInput).
   * `{}` = sem restrição (SYSTEM_ADMIN); `null` = sem escopo → nada.
   * - DIOCESAN_ADMIN: a diocese; PARISH_ADMIN: a paróquia.
   * - COMMUNITY_COORDINATOR: documentos da própria comunidade e das
   *   pastorais dela.
   * - PASTORAL_COORDINATOR: só os documentos das pastorais que COORDENA.
   * - Coordenação (comunidade/pastoral) também vê o que ela mesma cadastrou
   *   na própria paróquia (ex.: documento "da paróquia inteira").
   * Ser da mesma paróquia, sozinho, não abre nada.
   */
  private async scopeWhere(user: CurrentUser): Promise<Record<string, unknown> | null> {
    switch (user?.role) {
      case UserRole.SYSTEM_ADMIN:
        return {};
      case UserRole.DIOCESAN_ADMIN:
        return user.dioceseId ? { parish: { dioceseId: user.dioceseId } } : null;
      case UserRole.PARISH_ADMIN:
        return user.parishId ? { parishId: user.parishId } : null;
      case UserRole.COMMUNITY_COORDINATOR:
      case UserRole.PASTORAL_COORDINATOR: {
        const or: Record<string, unknown>[] = [];
        if (user.role === UserRole.COMMUNITY_COORDINATOR && user.communityId) {
          or.push({ communityId: user.communityId });
          const pastorals = await this.prisma.communityPastoral.findMany({
            where: { communityId: user.communityId },
            select: { id: true },
          });
          if (pastorals.length) {
            or.push({ communityPastoralId: { in: pastorals.map((pastoral) => pastoral.id) } });
          }
        }
        if (user.role === UserRole.PASTORAL_COORDINATOR) {
          const coordinated = await resolveCoordinatedPastoralIds(this.prisma, user);
          if (coordinated.length) or.push({ communityPastoralId: { in: coordinated } });
        }
        if (user.parishId) {
          or.push({
            parishId: user.parishId,
            versions: { some: { version: 1, createdByUserId: user.id } },
          });
        }
        return or.length ? { OR: or } : null;
      }
      default:
        return null;
    }
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
    const parishId = user.parishId!;
    if (dto.communityId) {
      const inScope = await this.hierarchyService.isCommunityInScope(user, dto.communityId);
      if (!inScope) throw new ForbiddenException('Comunidade fora do seu escopo');
      // O documento é gravado na paróquia do usuário: a comunidade tem de ser dela
      const community = await this.prisma.community.findUnique({
        where: { id: dto.communityId },
        select: { parishId: true },
      });
      if (!community || community.parishId !== parishId) {
        throw new ForbiddenException('Comunidade fora da sua paróquia');
      }
    }
    if (dto.communityPastoralId) {
      await this.assertPastoralForDocument(dto.communityPastoralId, dto.communityId, parishId, user);
    }
    if (dto.responsibleMemberId) {
      const responsible = await this.prisma.member.findFirst({
        where: memberOfParishWhere(dto.responsibleMemberId, parishId),
        select: { id: true },
      });
      if (!responsible) throw new BadRequestException('Responsável fora da sua paróquia');
    }

    const doc = await this.prisma.pastoralDocument.create({
      data: {
        title: dto.title,
        category: dto.category,
        parishId,
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

  /**
   * Pastoral do documento: existe, não foi excluída, é da paróquia (e da
   * comunidade informada, se houver) e o ator a gere — coordenador de
   * pastoral só vincula documento à pastoral que COORDENA; coordenador de
   * comunidade, às pastorais da própria comunidade.
   */
  private async assertPastoralForDocument(
    communityPastoralId: string,
    communityId: string | undefined,
    parishId: string,
    user: CurrentUser,
  ) {
    const pastoral = await this.prisma.communityPastoral.findFirst({
      where: { id: communityPastoralId, deletedAt: null },
      select: { id: true, communityId: true, community: { select: { parishId: true } } },
    });
    if (!pastoral || pastoral.community?.parishId !== parishId) {
      throw new ForbiddenException('Pastoral fora da sua paróquia');
    }
    if (communityId && pastoral.communityId !== communityId) {
      throw new BadRequestException('A pastoral não pertence à comunidade informada');
    }
    if (user.role === UserRole.COMMUNITY_COORDINATOR && pastoral.communityId !== user.communityId) {
      throw new ForbiddenException('Pastoral fora da sua comunidade');
    }
    if (user.role === UserRole.PASTORAL_COORDINATOR) {
      const coordinated = await resolveCoordinatedPastoralIds(this.prisma, user);
      if (!coordinated.includes(pastoral.id)) {
        throw new ForbiddenException('Você não coordena esta pastoral');
      }
    }
  }

  async list(
    user: CurrentUser,
    filters: { category?: string; communityId?: string; communityPastoralId?: string; includeArchived?: boolean },
  ) {
    // Negar por padrão: sem escopo resolvido (ex.: coordenação sem paróquia,
    // diocesano sem diocese), a lista é vazia — nunca "todo o país"
    const scope = await this.scopeWhere(user);
    if (!scope) return [];

    const where: any = { deletedAt: null };
    if (!filters.includeArchived) where.isArchived = false;
    if (filters.category) where.category = filters.category;
    if (filters.communityPastoralId) where.communityPastoralId = filters.communityPastoralId;

    if (filters.communityId) {
      const inScope = await this.hierarchyService.isCommunityInScope(user, filters.communityId);
      if (!inScope) throw new ForbiddenException('Comunidade fora do seu escopo');
      where.communityId = filters.communityId;
    }
    if (Object.keys(scope).length) where.AND = [scope];

    return this.prisma.pastoralDocument.findMany({
      where,
      include: { _count: { select: { versions: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /** Documento dentro do escopo de GESTÃO do usuário (mesma regra da listagem). */
  private async loadInScope(id: string, user: CurrentUser) {
    const doc = await this.prisma.pastoralDocument.findFirst({ where: { id, deletedAt: null } });
    if (!doc) throw new NotFoundException('Documento não encontrado');
    const scope = await this.scopeWhere(user);
    if (!scope) throw new ForbiddenException('Documento fora do seu escopo');
    if (Object.keys(scope).length) {
      const visible = await this.prisma.pastoralDocument.count({ where: { id, deletedAt: null, AND: [scope] } });
      if (!visible) throw new ForbiddenException('Documento fora do seu escopo');
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
