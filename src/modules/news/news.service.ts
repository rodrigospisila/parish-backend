import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';

@Injectable()
export class NewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createNewsDto: CreateNewsDto) {
    const { communityId, ...rest } = createNewsDto;

    // Verificar se a comunidade existe
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
    });

    if (!community) {
      throw new NotFoundException(`Comunidade com ID ${communityId} não encontrada`);
    }

    return this.prisma.news.create({
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
        community: true,
      },
    });

    if (!news) {
      throw new NotFoundException(`Notícia com ID ${id} não encontrada`);
    }

    return news;
  }

  async update(id: string, updateNewsDto: UpdateNewsDto) {
    await this.findOne(id); // Verifica se existe

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

  async remove(id: string) {
    await this.findOne(id); // Verifica se existe

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

