import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreatePrayerRequestDto } from './dto/create-prayer-request.dto';
import { UpdatePrayerRequestDto } from './dto/update-prayer-request.dto';
import { PrayerRequestCategory, PrayerRequestStatus, UserRole } from '@prisma/client';
import { HierarchyService, CurrentUser } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';
import { isRoleAtLeast } from '../auth/constants/role-hierarchy';

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

@Injectable()
export class PrayerRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
    private readonly auditService: AuditService,
  ) {}

  async create(createPrayerRequestDto: CreatePrayerRequestDto, currentUser?: CurrentUser) {
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
    if (currentUser) {
      const inScope = await this.hierarchyService.isCommunityInScope(currentUser, communityId);
      if (!inScope) {
        throw new ForbiddenException('Você não pode criar pedidos de oração para esta comunidade');
      }
    }

    // Autor = membro do usuário logado. O memberId do corpo só vale para a
    // coordenação (cadastrar em nome de alguém); fiel nunca escolhe o autor
    let memberId: string | undefined = undefined;
    if (currentUser) {
      const canPickAuthor = isRoleAtLeast(currentUser.role, UserRole.PASTORAL_COORDINATOR);
      if (requestedMemberId && canPickAuthor) {
        memberId = requestedMemberId;
      } else {
        const own = await this.prisma.member.findFirst({
          where: { userId: currentUser.id, deletedAt: null },
          select: { id: true },
        });
        memberId = own?.id;
      }
    } else {
      memberId = requestedMemberId;
    }

    // Verificar se o membro existe — só quando veio do corpo (o próprio
    // membro do usuário acabou de ser lido do banco)
    if (memberId && memberId === requestedMemberId) {
      const member = await this.prisma.member.findUnique({
        where: { id: memberId },
      });

      if (!member) {
        throw new NotFoundException(`Membro com ID ${memberId} não encontrado`);
      }
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
      actor: currentUser
        ? { id: currentUser.id, email: currentUser.email, role: currentUser.role }
        : null,
      action: 'CREATE',
      entity: 'PrayerRequest',
      entityId: created.id,
      metadata: { communityId, isAnonymous: created.isAnonymous, category: created.category },
    });

    return created;
  }

  async findAll(
    communityId?: string,
    category?: PrayerRequestCategory,
    status?: PrayerRequestStatus,
  ) {
    const where: any = {};

    if (communityId) {
      where.communityId = communityId;
    }

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

  async findApproved(communityId?: string, category?: PrayerRequestCategory) {
    const where: any = {
      status: PrayerRequestStatus.APPROVED,
    };

    if (communityId) {
      where.communityId = communityId;
    }

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

    // Lista pública (fiéis): pedidos anônimos NUNCA expõem o autor
    return requests.map((request) => maskAnonymous(request));
  }

  async findPending(communityId?: string) {
    const where: any = {
      status: PrayerRequestStatus.PENDING,
    };

    if (communityId) {
      where.communityId = communityId;
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

  async findOne(id: string, currentUser?: CurrentUser) {
    const prayerRequest = await this.prisma.prayerRequest.findUnique({
      where: { id },
      include: {
        community: true,
        member: true,
      },
    });

    if (!prayerRequest) {
      throw new NotFoundException(`Pedido de oração com ID ${id} não encontrado`);
    }

    // Pedido anônimo não expõe o autor para quem não é moderador
    return maskAnonymous(prayerRequest, currentUser?.role);
  }

  async update(id: string, updatePrayerRequestDto: UpdatePrayerRequestDto) {
    await this.findOne(id); // Verifica se existe

    return this.prisma.prayerRequest.update({
      where: { id },
      data: updatePrayerRequestDto,
      include: {
        community: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Verifica se existe

    return this.prisma.prayerRequest.delete({
      where: { id },
    });
  }

  // ========== MODERAÇÃO ==========

  async approve(id: string) {
    const prayerRequest = await this.findOne(id);

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

  async reject(id: string) {
    const prayerRequest = await this.findOne(id);

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

  async incrementPrayerCount(id: string) {
    const prayerRequest = await this.findOne(id);

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

  async getStats(communityId?: string) {
    const where: any = {};

    if (communityId) {
      where.communityId = communityId;
    }

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

