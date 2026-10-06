import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreatePrayerRequestDto } from './dto/create-prayer-request.dto';
import { UpdatePrayerRequestDto } from './dto/update-prayer-request.dto';
import { PrayerRequestCategory, PrayerRequestStatus, UserRole } from '@prisma/client';
import { HierarchyService, CurrentUser } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';
import { isRoleAtLeast } from '../auth/constants/role-hierarchy';

/** Autor visto por quem NÃO modera: só o nome (nada de id, e-mail ou cadastro). */
const AUTHOR_PUBLIC = { select: { fullName: true } } as const;
/** Autor visto pela moderação: o necessário para moderar e prevenir abuso. */
const AUTHOR_MODERATOR = { select: { id: true, fullName: true, email: true } } as const;

type PrayerRow = {
  id: string;
  title: string;
  description: string;
  category: PrayerRequestCategory;
  isAnonymous: boolean;
  status: PrayerRequestStatus;
  prayerCount: number;
  communityId: string;
  memberId: string | null;
  createdAt: Date;
  updatedAt: Date;
  community?: { id: string; name: string } | null;
  member?: { id: string; fullName: string; email: string | null } | null;
};

/**
 * Remove a identificação do autor quando o pedido é anônimo.
 * Moderadores (COMMUNITY_COORDINATOR ou superior) continuam vendo o autor,
 * pois precisam dele para moderação e prevenção de abuso.
 */
function maskAnonymous<T extends { isAnonymous: boolean; member?: unknown; memberId?: string | null }>(
  request: T,
  viewerRole?: UserRole,
): T {
  const isModerator = viewerRole
    ? isRoleAtLeast(viewerRole, UserRole.COMMUNITY_COORDINATOR)
    : false;

  if (!request.isAnonymous || isModerator) {
    return request;
  }

  return {
    ...request,
    member: null,
    ...(('memberId' in request) ? { memberId: null } : {}),
  };
}

/** Visão de quem não modera: autor só pelo nome (e nenhum, se anônimo), sem memberId. */
function publicView(row: PrayerRow, isOwn = false) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    isAnonymous: row.isAnonymous,
    status: row.status,
    prayerCount: row.prayerCount,
    communityId: row.communityId,
    community: row.community ? { id: row.community.id, name: row.community.name } : null,
    // O próprio autor sempre se reconhece; para os demais, anônimo é anônimo
    member: row.member && (isOwn || !row.isAnonymous) ? { fullName: row.member.fullName } : null,
    memberId: null,
    isOwn,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class PrayerRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
    private readonly auditService: AuditService,
  ) {}

  private actor(user: CurrentUser) {
    return { id: user.id, email: user.email, role: user.role };
  }

  async create(createPrayerRequestDto: CreatePrayerRequestDto, currentUser: CurrentUser) {
    // Negar por padrão: a rota sempre injeta o usuário
    if (!currentUser?.id) {
      throw new ForbiddenException('Você não pode criar pedidos de oração para esta comunidade');
    }
    const { communityId, memberId: requestedMemberId, ...rest } = createPrayerRequestDto;

    // Verificar se a comunidade existe
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
    });

    if (!community) {
      throw new NotFoundException(`Comunidade com ID ${communityId} não encontrada`);
    }

    // Escopo: o solicitante só pode criar pedidos para comunidades das quais participa
    // (ou que administra, no caso de papéis administrativos)
    const inScope = await this.hierarchyService.isCommunityInScope(currentUser, communityId);
    if (!inScope) {
      throw new ForbiddenException('Você não pode criar pedidos de oração para esta comunidade');
    }

    // Autor = membro do usuário logado. O memberId do corpo só vale para a
    // coordenação (cadastrar em nome de alguém) e para membro do seu escopo;
    // fiel nunca escolhe o autor
    let memberId: string | undefined = undefined;
    const canPickAuthor = isRoleAtLeast(currentUser.role, UserRole.PASTORAL_COORDINATOR);
    if (requestedMemberId && canPickAuthor) {
      const member = await this.prisma.member.findUnique({
        where: { id: requestedMemberId },
      });
      if (!member) {
        throw new NotFoundException(`Membro com ID ${requestedMemberId} não encontrado`);
      }
      const canManage = await this.hierarchyService.canManageMember(currentUser.id, requestedMemberId);
      if (!canManage) {
        throw new ForbiddenException('Membro fora do seu escopo');
      }
      memberId = requestedMemberId;
    } else {
      memberId = (await this.ownMemberId(currentUser)) ?? undefined;
    }

    const created = await this.prisma.prayerRequest.create({
      data: {
        ...rest,
        communityId,
        memberId,
        status: PrayerRequestStatus.PENDING, // Requer moderação
      },
      include: {
        community: {
          select: {
            id: true,
            name: true,
          },
        },
        member: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    await this.auditService.log({
      actor: this.actor(currentUser),
      action: 'CREATE',
      entity: 'PrayerRequest',
      entityId: created.id,
      metadata: { communityId, isAnonymous: created.isAnonymous, category: created.category },
    });

    return created;
  }

  // ========== ESCOPO ==========

  /** Membro (cadastro) do usuário logado — o JwtStrategy já o carrega; senão, consulta. */
  private async ownMemberId(user: CurrentUser): Promise<string | null> {
    const fromToken = (user as any)?.member?.id as string | undefined;
    if (fromToken) return fromToken;
    const own = await this.prisma.member.findFirst({
      where: { userId: user.id, deletedAt: null },
      select: { id: true },
    });
    return own?.id ?? null;
  }

  /**
   * Comunidades que o moderador alcança (null = todas, só SYSTEM_ADMIN).
   * Negar por padrão: sem usuário ou abaixo de COMMUNITY_COORDINATOR → nenhuma.
   */
  private async moderationScope(user?: CurrentUser): Promise<string[] | null> {
    if (!user?.id || !isRoleAtLeast(user.role, UserRole.COMMUNITY_COORDINATOR)) return [];
    if (user.role === UserRole.SYSTEM_ADMIN) return null;
    if (user.role === UserRole.DIOCESAN_ADMIN && user.dioceseId) {
      const rows = await this.prisma.community.findMany({
        where: { parish: { dioceseId: user.dioceseId } },
        select: { id: true },
      });
      return rows.map((c) => c.id);
    }
    if (user.role === UserRole.PARISH_ADMIN && user.parishId) {
      const rows = await this.prisma.community.findMany({ where: { parishId: user.parishId }, select: { id: true } });
      return rows.map((c) => c.id);
    }
    // Moderação é gestão: vínculo de fé não entra (a leitura soma os vínculos no readScope)
    return this.hierarchyService.getCommunityScopeIds(user);
  }

  /**
   * Comunidades cujo mural (pedidos APROVADOS) o usuário lê: as que modera mais
   * a principal e os vínculos ativos (do usuário e do cadastro de membro — as
   * comunidades secundárias do app). null = todas (SYSTEM_ADMIN).
   */
  private async readScope(user?: CurrentUser): Promise<string[] | null> {
    if (!user?.id) return [];
    const moderated = await this.moderationScope(user);
    if (moderated === null) return null;
    const userLinks = (user.communities ?? []).filter((c) => c.isActive !== false).map((c) => c.communityId);
    const memberLinks = await this.prisma.memberCommunity.findMany({
      where: { isActive: true, member: { userId: user.id, deletedAt: null } },
      select: { communityId: true },
    });
    return [
      ...new Set(
        [...moderated, user.communityId, ...userLinks, ...memberLinks.map((l) => l.communityId)].filter(
          (id): id is string => !!id,
        ),
      ),
    ];
  }

  /** Recorta o where pelo escopo; communityId explícito fora dele → 403. */
  private applyScope(where: any, scope: string[] | null, communityId?: string) {
    if (communityId) {
      if (scope && !scope.includes(communityId)) {
        throw new ForbiddenException('Comunidade fora do seu escopo');
      }
      where.communityId = communityId;
    } else if (scope) {
      where.communityId = { in: scope };
    }
    return where;
  }

  /** Leitura interna (sem recorte) — nunca devolvida como está para fora. */
  private async loadRaw(id: string): Promise<PrayerRow> {
    const prayerRequest = await this.prisma.prayerRequest.findUnique({
      where: { id },
      include: {
        community: { select: { id: true, name: true } },
        member: AUTHOR_MODERATOR,
      },
    });

    if (!prayerRequest) {
      throw new NotFoundException(`Pedido de oração com ID ${id} não encontrado`);
    }
    return prayerRequest as PrayerRow;
  }

  // ========== LEITURA ==========

  /** Lista da moderação: só as comunidades do moderationScope. */
  async findAll(
    currentUser: CurrentUser,
    communityId?: string,
    category?: PrayerRequestCategory,
    status?: PrayerRequestStatus,
  ) {
    const scope = await this.moderationScope(currentUser);
    const where: any = this.applyScope({}, scope, communityId);

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    return this.prisma.prayerRequest.findMany({
      where,
      include: {
        community: {
          select: {
            id: true,
            name: true,
          },
        },
        member: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /** Mural: pedidos APROVADOS das comunidades do usuário (principal e vínculos). */
  async findApproved(currentUser: CurrentUser, communityId?: string, category?: PrayerRequestCategory) {
    const scope = await this.readScope(currentUser);
    const where: any = this.applyScope({ status: PrayerRequestStatus.APPROVED }, scope, communityId);

    if (category) {
      where.category = category;
    }

    const requests = await this.prisma.prayerRequest.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        isAnonymous: true,
        prayerCount: true,
        createdAt: true,
        community: {
          select: {
            id: true,
            name: true,
          },
        },
        member: AUTHOR_PUBLIC,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Lista pública (fiéis): pedidos anônimos NUNCA expõem o autor
    return requests.map((request) => maskAnonymous(request));
  }

  async findPending(communityId: string | undefined, currentUser: CurrentUser) {
    // Moderação é por escopo: coordenador vê só a(s) sua(s) comunidade(s)
    const scope = await this.moderationScope(currentUser);
    let where: any;
    try {
      where = this.applyScope({ status: PrayerRequestStatus.PENDING }, scope, communityId);
    } catch {
      throw new ForbiddenException('Comunidade fora do seu escopo de moderação');
    }

    return this.prisma.prayerRequest.findMany({
      where,
      include: {
        community: {
          select: {
            id: true,
            name: true,
          },
        },
        member: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  /**
   * Detalhe (negar por padrão):
   * - moderador da comunidade do pedido: tudo, com autor (id, nome, e-mail);
   * - o próprio autor: o pedido em qualquer status, autor só pelo nome;
   * - demais: só pedido APROVADO de comunidade do seu mural, autor só pelo nome
   *   (nenhum, se anônimo).
   * Fora disso, 404 — nem a existência do pedido vaza.
   */
  async findOne(id: string, currentUser: CurrentUser) {
    if (!currentUser?.id) {
      throw new NotFoundException(`Pedido de oração com ID ${id} não encontrado`);
    }
    const row = await this.loadRaw(id);

    const modScope = await this.moderationScope(currentUser);
    if (modScope === null || modScope.includes(row.communityId)) {
      return row;
    }

    const ownMemberId = await this.ownMemberId(currentUser);
    if (ownMemberId && row.memberId === ownMemberId) {
      return publicView(row, true);
    }

    if (row.status === PrayerRequestStatus.APPROVED) {
      const scope = await this.readScope(currentUser);
      if (scope === null || scope.includes(row.communityId)) {
        return publicView(row);
      }
    }

    throw new NotFoundException(`Pedido de oração com ID ${id} não encontrado`);
  }

  // ========== EDIÇÃO (moderação) ==========

  async update(id: string, updatePrayerRequestDto: UpdatePrayerRequestDto, currentUser: CurrentUser) {
    const row = await this.loadRaw(id);
    await this.assertCanModerate(row, currentUser);

    // Só o conteúdo do pedido; o autor nunca é trocado por aqui
    const { title, description, category, isAnonymous, communityId } = updatePrayerRequestDto;
    const data: any = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (category !== undefined) data.category = category;
    if (isAnonymous !== undefined) data.isAnonymous = isAnonymous;
    if (communityId !== undefined && communityId !== row.communityId) {
      // Mover o pedido: o destino também precisa estar no escopo de moderação
      await this.assertCanModerate({ communityId }, currentUser);
      data.communityId = communityId;
    }

    const updated = await this.prisma.prayerRequest.update({
      where: { id },
      data,
      include: {
        community: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await this.auditService.log({
      actor: this.actor(currentUser),
      action: 'UPDATE',
      entity: 'PrayerRequest',
      entityId: id,
      metadata: { fields: Object.keys(data), communityId: updated.communityId },
    });

    return updated;
  }

  async remove(id: string, currentUser: CurrentUser) {
    const row = await this.loadRaw(id);
    await this.assertCanModerate(row, currentUser);

    const removed = await this.prisma.prayerRequest.delete({
      where: { id },
      select: { id: true, communityId: true, status: true },
    });

    await this.auditService.log({
      actor: this.actor(currentUser),
      action: 'DELETE',
      entity: 'PrayerRequest',
      entityId: id,
      before: { communityId: row.communityId, status: row.status },
    });

    return removed;
  }

  // ========== MODERAÇÃO ==========

  /** Negar por padrão: sem usuário, sem papel de moderação ou fora do escopo → 403. */
  private async assertCanModerate(prayerRequest: { communityId?: string | null }, user?: CurrentUser) {
    const communityId = prayerRequest.communityId;
    const scope = await this.moderationScope(user);
    if (!communityId || (scope !== null && !scope.includes(communityId))) {
      throw new ForbiddenException('Você não modera pedidos desta comunidade');
    }
  }

  async approve(id: string, currentUser: CurrentUser) {
    const prayerRequest = await this.loadRaw(id);
    await this.assertCanModerate(prayerRequest, currentUser);

    if (prayerRequest.status === PrayerRequestStatus.APPROVED) {
      throw new ForbiddenException('Pedido já foi aprovado');
    }

    return this.prisma.prayerRequest.update({
      where: { id },
      data: {
        status: PrayerRequestStatus.APPROVED,
      },
    });
  }

  async reject(id: string, currentUser: CurrentUser) {
    const prayerRequest = await this.loadRaw(id);
    await this.assertCanModerate(prayerRequest, currentUser);

    if (prayerRequest.status === PrayerRequestStatus.REJECTED) {
      throw new ForbiddenException('Pedido já foi rejeitado');
    }

    return this.prisma.prayerRequest.update({
      where: { id },
      data: {
        status: PrayerRequestStatus.REJECTED,
      },
    });
  }

  // ========== CONTADOR DE ORAÇÕES ==========

  async incrementPrayerCount(id: string, currentUser: CurrentUser) {
    const prayerRequest = await this.loadRaw(id);

    // Só reza (e conta) quem enxerga o pedido no mural
    const scope = await this.readScope(currentUser);
    if (scope !== null && !scope.includes(prayerRequest.communityId)) {
      throw new NotFoundException(`Pedido de oração com ID ${id} não encontrado`);
    }

    if (prayerRequest.status !== PrayerRequestStatus.APPROVED) {
      throw new ForbiddenException('Apenas pedidos aprovados podem receber orações');
    }

    // Só o contador: a linha completa exporia memberId de pedido anônimo
    return this.prisma.prayerRequest.update({
      where: { id },
      data: {
        prayerCount: {
          increment: 1,
        },
      },
      select: { id: true, prayerCount: true },
    });
  }

  // ========== ESTATÍSTICAS ==========

  async getStats(currentUser: CurrentUser, communityId?: string) {
    const scope = await this.moderationScope(currentUser);
    const where: any = this.applyScope({}, scope, communityId);

    const total = await this.prisma.prayerRequest.count({ where });
    const pending = await this.prisma.prayerRequest.count({
      where: { ...where, status: PrayerRequestStatus.PENDING },
    });
    const approved = await this.prisma.prayerRequest.count({
      where: { ...where, status: PrayerRequestStatus.APPROVED },
    });
    const rejected = await this.prisma.prayerRequest.count({
      where: { ...where, status: PrayerRequestStatus.REJECTED },
    });

    const totalPrayers = await this.prisma.prayerRequest.aggregate({
      where: { ...where, status: PrayerRequestStatus.APPROVED },
      _sum: {
        prayerCount: true,
      },
    });

    return {
      total,
      pending,
      approved,
      rejected,
      totalPrayers: totalPrayers._sum.prayerCount || 0,
    };
  }
}
