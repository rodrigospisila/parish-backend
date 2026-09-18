import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCommunityDto } from './dto/create-community.dto';
import { UpdateCommunityDto } from './dto/update-community.dto';
import { HierarchyService, CurrentUser } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class CommunitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
    private readonly auditService: AuditService,
  ) {}

  async create(createCommunityDto: CreateCommunityDto, currentUser?: CurrentUser) {
    const { parishId } = createCommunityDto;

    // Validar acesso à paróquia
    if (currentUser) {
      const canManage = await this.hierarchyService.canManageParish(currentUser.id, parishId);
      if (!canManage) {
        throw new ForbiddenException('Você não tem permissão para criar comunidades nesta paróquia');
      }
    }

    return this.prisma.community.create({
      data: createCommunityDto,
      include: {
        parish: {
          select: {
            id: true,
            name: true,
            diocese: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async findAll(currentUser?: CurrentUser) {
    // Aplicar filtros de hierarquia usando o serviço centralizado
    const hierarchyFilter = currentUser
      ? this.hierarchyService.applyCommunityFilter(currentUser)
      : {};

    return this.prisma.community.findMany({
      where: { ...hierarchyFilter, deletedAt: null },
      include: {
        parish: {
          select: {
            id: true,
            name: true,
            diocese: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
            events: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const community = await this.prisma.community.findFirst({
      where: { id, deletedAt: null },
      include: {
        parish: {
          include: {
            diocese: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        events: true,
        _count: {
          select: {
            members: true,
            events: true,
          },
        },
      },
    });

    if (!community) {
      throw new NotFoundException(`Comunidade com ID ${id} não encontrada`);
    }

    return community;
  }

  async update(id: string, updateCommunityDto: UpdateCommunityDto, currentUser?: CurrentUser) {
    const community = await this.findOne(id);

    // Validar permissão para editar esta comunidade
    if (currentUser) {
      const canManage = await this.hierarchyService.canManageCommunity(currentUser.id, id);
      if (!canManage) {
        throw new ForbiddenException('Você não tem permissão para editar esta comunidade');
      }
    }

    // Quem mexe na coordenada pelo cadastro comum não envia a precisão. Mudou o
    // pino à mão → MANUAL; apagou → sem precisão. Senão um pino conferido
    // continuaria marcado como centro de cidade e ficaria fora do "missas por perto".
    const data: UpdateCommunityDto = { ...updateCommunityDto };
    const mexeuNoPino = data.latitude !== undefined || data.longitude !== undefined;
    if (mexeuNoPino && data.geoPrecision === undefined) {
      data.geoPrecision = data.latitude == null || data.longitude == null ? null : "MANUAL";
    }

    return this.prisma.community.update({
      where: { id },
      data,
      include: {
        parish: {
          select: {
            id: true,
            name: true,
            diocese: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async remove(id: string, currentUser?: CurrentUser) {
    await this.findOne(id);

    // Validar permissão para excluir esta comunidade
    if (currentUser) {
      const canManage = await this.hierarchyService.canManageCommunity(currentUser.id, id);
      if (!canManage) {
        throw new ForbiddenException('Você não tem permissão para excluir esta comunidade');
      }
    }

    // Soft delete (arquivamento): NUNCA excluir fisicamente — o cascade
    // apagaria membros, eventos, escalas e pastorais da comunidade.
    const archived = await this.prisma.community.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.log({
      actor: currentUser
        ? { id: currentUser.id, email: currentUser.email, role: currentUser.role }
        : null,
      action: 'SOFT_DELETE',
      entity: 'Community',
      entityId: id,
      before: { name: archived.name },
    });

    return archived;
  }
}
