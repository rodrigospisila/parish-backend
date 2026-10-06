import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { HierarchyService, CurrentUser } from '../../common/hierarchy.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class NewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(createNewsDto: CreateNewsDto, currentUser?: CurrentUser) {
    const { communityId, ...rest } = createNewsDto;

    // Verificar se a comunidade existe
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
    });

    if (!community) {
      throw new NotFoundException(`Comunidade com ID ${communityId} não encontrada`);
    }

    // Escopo: o autor só publica em comunidades do seu alcance
    if (currentUser) {
      const inScope = await this.hierarchyService.isCommunityInScope(currentUser, communityId);
      if (!inScope) {
        throw new ForbiddenException('Você não tem permissão para publicar nesta comunidade');
      }
    }

    const news = await this.prisma.news.create({
      data: {
        ...rest,
        communityId,
      },
      include: {
        community: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Comunicado segmentado por comunidade: dispara notificação aos usuários
    // da comunidade (respeitando opt-out no NotificationsService).
    await this.broadcastToCommunity(news);

    return news;
  }

  /**
   * Notifica os usuários vinculados à comunidade do aviso. Best-effort.
   * O tipo URGENT_NOTICE/NEWS respeita o opt-out de comunicações do titular.
   */
  private async broadcastToCommunity(news: {
    id: string;
    title: string;
    communityId: string;
    isUrgent: boolean;
  }) {
    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { communityId: news.communityId },
          { communities: { some: { communityId: news.communityId, isActive: true } } },
        ],
      },
      select: { id: true },
    });

    if (users.length === 0) {
      return;
    }

    await this.notificationsService.notifyUsers(
      users.map((user) => user.id),
      news.isUrgent ? NotificationType.URGENT_NOTICE : NotificationType.NEWS,
      news.isUrgent ? 'Aviso urgente' : 'Novo comunicado',
      news.title,
      { newsId: news.id },
    );
  }

  async findAll(communityId?: string, category?: string, isUrgent?: boolean) {
    const where: any = {};

    if (communityId) {
      where.communityId = communityId;
    }

    if (category) {
      where.category = category;
    }

    if (isUrgent !== undefined) {
      where.isUrgent = isUrgent;
    }

    return this.prisma.news.findMany({
      where,
      include: {
        community: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { isUrgent: 'desc' },
        { publishedAt: 'desc' },
      ],
    });
  }

  async findOne(id: string) {
    const news = await this.prisma.news.findUnique({
      where: { id },
      include: {
        community: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!news) {
      throw new NotFoundException(`Notícia com ID ${id} não encontrada`);
    }

    return news;
  }

  /**
   * Editar/mover/apagar aviso: o ator precisa GERIR a comunidade do aviso
   * (canManageCommunity) — antes, COMMUNITY_COORDINATOR+ de qualquer paróquia
   * editava, movia ou apagava o aviso de outra. Negar por padrão.
   */
  private async assertCanManageNews(communityId: string, currentUser?: CurrentUser) {
    if (!currentUser?.id) {
      throw new ForbiddenException('Você não tem permissão para alterar este aviso');
    }
    const canManage = await this.hierarchyService.canManageCommunity(currentUser.id, communityId);
    if (!canManage) {
      throw new ForbiddenException('Você não tem permissão para alterar avisos desta comunidade');
    }
  }

  async update(id: string, updateNewsDto: UpdateNewsDto, currentUser?: CurrentUser) {
    const news = await this.findOne(id); // Verifica se existe
    await this.assertCanManageNews(news.communityId, currentUser);

    // Mover o aviso: o destino também precisa estar sob a gestão do ator
    if (updateNewsDto.communityId && updateNewsDto.communityId !== news.communityId) {
      const target = await this.prisma.community.findUnique({
        where: { id: updateNewsDto.communityId },
        select: { id: true },
      });
      if (!target) {
        throw new NotFoundException(`Comunidade com ID ${updateNewsDto.communityId} não encontrada`);
      }
      await this.assertCanManageNews(updateNewsDto.communityId, currentUser);
    }

    return this.prisma.news.update({
      where: { id },
      data: updateNewsDto,
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

  async remove(id: string, currentUser?: CurrentUser) {
    const news = await this.findOne(id); // Verifica se existe
    await this.assertCanManageNews(news.communityId, currentUser);

    return this.prisma.news.delete({
      where: { id },
    });
  }

  // Obter notícias recentes
  async findRecent(communityId?: string, limit: number = 10) {
    const where: any = {};

    if (communityId) {
      where.communityId = communityId;
    }

    return this.prisma.news.findMany({
      where,
      include: {
        community: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        publishedAt: 'desc',
      },
      take: limit,
    });
  }

  // Obter avisos urgentes
  async findUrgent(communityId?: string) {
    const where: any = { isUrgent: true };

    if (communityId) {
      where.communityId = communityId;
    }

    return this.prisma.news.findMany({
      where,
      include: {
        community: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        publishedAt: 'desc',
      },
    });
  }
}

