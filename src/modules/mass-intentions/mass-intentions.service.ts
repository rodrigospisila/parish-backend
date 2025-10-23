import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateMassIntentionDto } from './dto/create-mass-intention.dto';
import { UpdateMassIntentionDto } from './dto/update-mass-intention.dto';
import { IntentionType } from '@prisma/client';

@Injectable()
export class MassIntentionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createMassIntentionDto: CreateMassIntentionDto) {
    const { communityId, ...rest } = createMassIntentionDto;

    // Verificar se a comunidade existe
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
    });

    if (!community) {
      throw new NotFoundException(`Comunidade com ID ${communityId} não encontrada`);
    }

    return this.prisma.massIntention.create({
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

  async findAll(
    communityId?: string,
    type?: IntentionType,
    isPaid?: boolean,
    startDate?: string,
    endDate?: string,
  ) {
    const where: any = {};

    if (communityId) {
      where.communityId = communityId;
    }

    if (type) {
      where.type = type;
    }

    if (isPaid !== undefined) {
      where.isPaid = isPaid;
    }

    if (startDate || endDate) {
      where.requestedDate = {};
      if (startDate) {
        where.requestedDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.requestedDate.lte = new Date(endDate);
      }
    }

    return this.prisma.massIntention.findMany({
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
        requestedDate: 'asc',
      },
    });
  }

  async findUpcoming(communityId?: string, limit: number = 10) {
    const where: any = {
      requestedDate: {
        gte: new Date(),
      },
    };

    if (communityId) {
      where.communityId = communityId;
    }

    return this.prisma.massIntention.findMany({
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
        requestedDate: 'asc',
      },
      take: limit,
    });
  }

  async findPending(communityId?: string) {
    const where: any = {
      isPaid: false,
    };

    if (communityId) {
      where.communityId = communityId;
    }

    return this.prisma.massIntention.findMany({
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
        createdAt: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const intention = await this.prisma.massIntention.findUnique({
      where: { id },
      include: {
        community: true,
      },
    });

    if (!intention) {
      throw new NotFoundException(`Intenção de missa com ID ${id} não encontrada`);
    }

    return intention;
  }

  async update(id: string, updateMassIntentionDto: UpdateMassIntentionDto) {
    await this.findOne(id); // Verifica se existe

    return this.prisma.massIntention.update({
      where: { id },
      data: updateMassIntentionDto,
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

    return this.prisma.massIntention.delete({
      where: { id },
    });
  }

  // ========== PAGAMENTO ==========

  async markAsPaid(id: string, paymentMethod: string) {
    await this.findOne(id);

    return this.prisma.massIntention.update({
      where: { id },
      data: {
        isPaid: true,
        paidAt: new Date(),
        paymentMethod,
      },
    });
  }

  async markAsUnpaid(id: string) {
    await this.findOne(id);

    return this.prisma.massIntention.update({
      where: { id },
      data: {
        isPaid: false,
        paidAt: null,
        paymentMethod: null,
      },
    });
  }

  // ========== RELATÓRIOS ==========

  async getStats(communityId?: string) {
    const where: any = {};

    if (communityId) {
      where.communityId = communityId;
    }

    const total = await this.prisma.massIntention.count({ where });
    const paid = await this.prisma.massIntention.count({
      where: { ...where, isPaid: true },
    });
    const pending = await this.prisma.massIntention.count({
      where: { ...where, isPaid: false },
    });

    const totalRevenue = await this.prisma.massIntention.aggregate({
      where: { ...where, isPaid: true },
      _sum: {
        amount: true,
      },
    });

    const pendingRevenue = await this.prisma.massIntention.aggregate({
      where: { ...where, isPaid: false },
      _sum: {
        amount: true,
      },
    });

    return {
      total,
      paid,
      pending,
      totalRevenue: totalRevenue._sum.amount || 0,
      pendingRevenue: pendingRevenue._sum.amount || 0,
    };
  }

  // Buscar intenções por data
  async findByDate(date: string, communityId?: string) {
    const where: any = {
      requestedDate: new Date(date),
    };

    if (communityId) {
      where.communityId = communityId;
    }

    return this.prisma.massIntention.findMany({
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
        createdAt: 'asc',
      },
    });
  }
}

