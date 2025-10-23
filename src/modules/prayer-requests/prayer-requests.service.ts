import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreatePrayerRequestDto } from './dto/create-prayer-request.dto';
import { UpdatePrayerRequestDto } from './dto/update-prayer-request.dto';
import { PrayerRequestCategory, PrayerRequestStatus } from '@prisma/client';

@Injectable()
export class PrayerRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPrayerRequestDto: CreatePrayerRequestDto) {
    const { communityId, memberId, ...rest } = createPrayerRequestDto;

    // Verificar se a comunidade existe
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
    });

    if (!community) {
      throw new NotFoundException(`Comunidade com ID ${communityId} não encontrada`);
    }

    // Verificar se o membro existe (se fornecido)
    if (memberId) {
      const member = await this.prisma.member.findUnique({
        where: { id: memberId },
      });

      if (!member) {
        throw new NotFoundException(`Membro com ID ${memberId} não encontrado`);
      }
    }

    return this.prisma.prayerRequest.create({
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

    return this.prisma.prayerRequest.findMany({
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
        // Não incluir membro se for anônimo
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

  async findOne(id: string) {
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

    return prayerRequest;
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

    return this.prisma.prayerRequest.update({
      where: { id },
      data: {
        prayerCount: {
          increment: 1,
        },
      },
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

