import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreatePastoralDto } from './dto/create-pastoral.dto';
import { AddMemberDto } from './dto/add-member.dto';

@Injectable()
export class PastoralsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPastoralDto: CreatePastoralDto) {
    const { communityId, ...rest } = createPastoralDto;

    // Verificar se a comunidade existe
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
    });

    if (!community) {
      throw new NotFoundException(`Comunidade com ID ${communityId} não encontrada`);
    }

    return this.prisma.pastoral.create({
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

  async findAll(communityId?: string) {
    const where: any = {};

    if (communityId) {
      where.communityId = communityId;
    }

    return this.prisma.pastoral.findMany({
      where,
      include: {
        community: {
          select: {
            id: true,
            name: true,
          },
        },
        members: {
          include: {
            member: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                photoUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const pastoral = await this.prisma.pastoral.findUnique({
      where: { id },
      include: {
        community: true,
        members: {
          include: {
            member: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                photoUrl: true,
                birthDate: true,
              },
            },
          },
          orderBy: [
            { isCoordinator: 'desc' },
            { joinedAt: 'asc' },
          ],
        },
      },
    });

    if (!pastoral) {
      throw new NotFoundException(`Pastoral com ID ${id} não encontrada`);
    }

    return pastoral;
  }

  async update(id: string, updateData: Partial<CreatePastoralDto>) {
    await this.findOne(id); // Verifica se existe

    return this.prisma.pastoral.update({
      where: { id },
      data: updateData,
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

    return this.prisma.pastoral.delete({
      where: { id },
    });
  }

  // ========== GESTÃO DE MEMBROS ==========

  async addMember(addMemberDto: AddMemberDto) {
    const { pastoralId, memberId, isCoordinator } = addMemberDto;

    // Verificar se a pastoral existe
    const pastoral = await this.prisma.pastoral.findUnique({
      where: { id: pastoralId },
    });

    if (!pastoral) {
      throw new NotFoundException(`Pastoral com ID ${pastoralId} não encontrada`);
    }

    // Verificar se o membro existe
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      throw new NotFoundException(`Membro com ID ${memberId} não encontrado`);
    }

    // Verificar se o membro já está na pastoral
    const existingMembership = await this.prisma.pastoralMember.findUnique({
      where: {
        pastoralId_memberId: {
          pastoralId,
          memberId,
        },
      },
    });

    if (existingMembership) {
      throw new BadRequestException('Membro já está nesta pastoral');
    }

    return this.prisma.pastoralMember.create({
      data: {
        pastoralId,
        memberId,
        isCoordinator: isCoordinator || false,
      },
      include: {
        pastoral: {
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
            phone: true,
          },
        },
      },
    });
  }

  async removeMember(pastoralId: string, memberId: string) {
    const membership = await this.prisma.pastoralMember.findUnique({
      where: {
        pastoralId_memberId: {
          pastoralId,
          memberId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('Membro não encontrado nesta pastoral');
    }

    return this.prisma.pastoralMember.delete({
      where: {
        pastoralId_memberId: {
          pastoralId,
          memberId,
        },
      },
    });
  }

  async setCoordinator(pastoralId: string, memberId: string, isCoordinator: boolean) {
    const membership = await this.prisma.pastoralMember.findUnique({
      where: {
        pastoralId_memberId: {
          pastoralId,
          memberId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('Membro não encontrado nesta pastoral');
    }

    return this.prisma.pastoralMember.update({
      where: {
        pastoralId_memberId: {
          pastoralId,
          memberId,
        },
      },
      data: {
        isCoordinator,
      },
    });
  }

  // ========== RELATÓRIOS ==========

  async getCoordinators(pastoralId: string) {
    const pastoral = await this.findOne(pastoralId);

    return pastoral.members.filter((m) => m.isCoordinator);
  }

  async getMembersByPastoral(pastoralId: string) {
    const pastoral = await this.findOne(pastoralId);

    return pastoral.members;
  }
}

