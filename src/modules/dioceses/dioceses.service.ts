import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateDioceseDto } from './dto/create-diocese.dto';
import { UpdateDioceseDto } from './dto/update-diocese.dto';

@Injectable()
export class DiocesesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDioceseDto: CreateDioceseDto) {
    return this.prisma.diocese.create({
      data: createDioceseDto,
    });
  }

  async findAll(user?: any) {
    const where: any = {};

    // DIOCESAN_ADMIN só vê sua própria diocese
    if (user && user.role === 'DIOCESAN_ADMIN' && user.dioceseId) {
      where.id = user.dioceseId;
    }

    return this.prisma.diocese.findMany({
      where,
      include: {
        parishes: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            parishes: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const diocese = await this.prisma.diocese.findUnique({
      where: { id },
      include: {
        parishes: {
          include: {
            communities: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            parishes: true,
          },
        },
      },
    });

    if (!diocese) {
      throw new NotFoundException(`Diocese com ID ${id} não encontrada`);
    }

    return diocese;
  }

  async update(id: string, updateDioceseDto: UpdateDioceseDto) {
    await this.findOne(id); // Verifica se existe

    return this.prisma.diocese.update({
      where: { id },
      data: updateDioceseDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Verifica se existe

    return this.prisma.diocese.delete({
      where: { id },
    });
  }
}

