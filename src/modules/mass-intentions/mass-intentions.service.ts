import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateMassIntentionDto } from './dto/create-mass-intention.dto';
import { UpdateMassIntentionDto } from './dto/update-mass-intention.dto';
import { IntentionType, UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/hierarchy.service';

/**
 * Módulo sem dono no produto: restrito ao SYSTEM_ADMIN (ver o controller). A
 * checagem também fica aqui — negar por padrão — para que nenhum chamador novo
 * (outra rota, job) reabra o acesso sem escopo por engano.
 */
function assertSystemAdmin(user: CurrentUser | undefined) {
  if (user?.role !== UserRole.SYSTEM_ADMIN) {
    throw new ForbiddenException('Intenções de missa ainda não estão disponíveis');
  }
}

@Injectable()
export class MassIntentionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createMassIntentionDto: CreateMassIntentionDto, user: CurrentUser) {
    assertSystemAdmin(user);
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
    user: CurrentUser,
    communityId?: string,
    type?: IntentionType,
    isPaid?: boolean,
    startDate?: string,
    endDate?: string,
  ) {
    assertSystemAdmin(user);
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

  async findUpcoming(user: CurrentUser, communityId?: string, limit: number = 10) {
    assertSystemAdmin(user);
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

  async findPending(user: CurrentUser, communityId?: string) {
    assertSystemAdmin(user);
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

  async findOne(id: string, user: CurrentUser) {
    assertSystemAdmin(user);
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

  async update(id: string, updateMassIntentionDto: UpdateMassIntentionDto, user: CurrentUser) {
    await this.findOne(id, user); // Verifica permissão e se existe

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

  async remove(id: string, user: CurrentUser) {
    await this.findOne(id, user); // Verifica permissão e se existe

    return this.prisma.massIntention.delete({
      where: { id },
    });
  }

  // ========== PAGAMENTO ==========

  async markAsPaid(id: string, paymentMethod: string, user: CurrentUser) {
    await this.findOne(id, user);

    return this.prisma.massIntention.update({
      where: { id },
      data: {
        isPaid: true,
        paidAt: new Date(),
        paymentMethod,
      },
    });
  }

  async markAsUnpaid(id: string, user: CurrentUser) {
    await this.findOne(id, user);

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

  async getStats(user: CurrentUser, communityId?: string) {
    assertSystemAdmin(user);
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
  async findByDate(user: CurrentUser, date: string, communityId?: string) {
    assertSystemAdmin(user);
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

