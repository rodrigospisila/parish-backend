import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateParishDto } from './dto/create-parish.dto';
import { UpdateParishDto } from './dto/update-parish.dto';

@Injectable()
export class ParishesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createParishDto: CreateParishDto) {
    return this.prisma.parish.create({
      data: createParishDto,
      include: {
        diocese: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async findAll(user?: any) {
    const where: any = {};

    // DIOCESAN_ADMIN só vê paróquias da sua diocese
    if (user && user.role === 'DIOCESAN_ADMIN' && user.dioceseId) {
      where.dioceseId = user.dioceseId;
    }

    // PARISH_ADMIN só vê sua paróquia
    if (user && user.role === 'PARISH_ADMIN' && user.parishId) {
      where.id = user.parishId;
    }

    // COMMUNITY_COORDINATOR só vê a paróquia da sua comunidade
    if (user && user.role === 'COMMUNITY_COORDINATOR' && user.parishId) {
      where.id = user.parishId;
    }

    return this.prisma.parish.findMany({
      where,
      include: {
        diocese: {
          select: {
            id: true,
            name: true,
          },
        },
        communities: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            communities: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const parish = await this.prisma.parish.findUnique({
      where: { id },
      include: {
        diocese: true,
        communities: true,
        _count: {
          select: {
            communities: true,
          },
        },
      },
    });

    if (!parish) {
      throw new NotFoundException(`Paróquia com ID ${id} não encontrada`);
    }

    return parish;
  }

  async update(id: string, updateParishDto: UpdateParishDto, user?: any) {
    await this.findOne(id);

    // PARISH_ADMIN só pode editar sua própria paróquia
    if (user && user.role === 'PARISH_ADMIN' && user.parishId && user.parishId !== id) {
      throw new NotFoundException(`Você não tem permissão para editar esta paróquia`);
    }

    return this.prisma.parish.update({
      where: { id },
      data: updateParishDto,
      include: {
        diocese: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.parish.delete({
      where: { id },
    });
  }
}

