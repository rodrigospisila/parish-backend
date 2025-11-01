import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCommunityDto } from './dto/create-community.dto';
import { UpdateCommunityDto } from './dto/update-community.dto';

@Injectable()
export class CommunitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCommunityDto: CreateCommunityDto) {
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

  async findAll(user?: any) {
    const where: any = {};

    // DIOCESAN_ADMIN só vê comunidades das paróquias da sua diocese
    if (user && user.role === 'DIOCESAN_ADMIN' && user.dioceseId) {
      where.parish = {
        dioceseId: user.dioceseId,
      };
    }

    // PARISH_ADMIN só vê comunidades da sua paróquia
    if (user && user.role === 'PARISH_ADMIN' && user.parishId) {
      where.parishId = user.parishId;
    }

    // COMMUNITY_COORDINATOR só vê sua comunidade
    if (user && user.role === 'COMMUNITY_COORDINATOR' && user.communityId) {
      where.id = user.communityId;
    }

    return this.prisma.community.findMany({
      where,
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
    const community = await this.prisma.community.findUnique({
      where: { id },
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

  async update(id: string, updateCommunityDto: UpdateCommunityDto) {
    await this.findOne(id);

    return this.prisma.community.update({
      where: { id },
      data: updateCommunityDto,
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

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.community.delete({
      where: { id },
    });
  }
}

