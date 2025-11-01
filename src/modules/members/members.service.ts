import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { MemberStatus } from '@prisma/client';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createMemberDto: CreateMemberDto) {
    const { cpf, email, communityId, ...rest } = createMemberDto;

    // Verificar se a comunidade existe
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
    });

    if (!community) {
      throw new NotFoundException(`Comunidade com ID ${communityId} não encontrada`);
    }

    // Verificar se CPF já está cadastrado (se fornecido)
    if (cpf) {
      const existingMemberByCpf = await this.prisma.member.findUnique({
        where: { cpf },
      });

      if (existingMemberByCpf) {
        throw new ConflictException('CPF já cadastrado');
      }
    }

    // Verificar se email já está cadastrado (se fornecido)
    if (email) {
      const existingMemberByEmail = await this.prisma.member.findFirst({
        where: { email },
      });

      if (existingMemberByEmail) {
        throw new ConflictException('Email já cadastrado');
      }
    }

    // Criar membro
    const member = await this.prisma.member.create({
      data: {
        ...rest,
        cpf,
        email,
        communityId,
        consentDate: createMemberDto.consentGiven ? new Date() : null,
      },
      include: {
        community: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return member;
  }

  async findAll(user?: any, communityId?: string, status?: MemberStatus) {
    const where: any = {};

    // DIOCESAN_ADMIN só vê membros das comunidades da sua diocese
    if (user && user.role === 'DIOCESAN_ADMIN' && user.dioceseId) {
      where.community = {
        parish: {
          dioceseId: user.dioceseId,
        },
      };
    }

    // PARISH_ADMIN só vê membros das comunidades da sua paróquia
    if (user && user.role === 'PARISH_ADMIN' && user.parishId) {
      where.community = {
        parishId: user.parishId,
      };
    }

    // COMMUNITY_COORDINATOR só vê membros da sua comunidade
    if (user && user.role === 'COMMUNITY_COORDINATOR' && user.communityId) {
      where.communityId = user.communityId;
    }

    if (communityId) {
      where.communityId = communityId;
    }

    if (status) {
      where.status = status;
    }

    return this.prisma.member.findMany({
      where,
      include: {
        community: {
          select: {
            id: true,
            name: true,
          },
        },
        pastorals: {
          include: {
            pastoral: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            sacraments: true,
            prayerRequests: true,
            scheduleAssignments: true,
          },
        },
      },
      orderBy: {
        fullName: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const member = await this.prisma.member.findUnique({
      where: { id },
      include: {
        community: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
        spouse: {
          select: {
            id: true,
            fullName: true,
          },
        },
        pastorals: {
          include: {
            pastoral: true,
          },
        },
        sacraments: {
          orderBy: {
            date: 'asc',
          },
        },
        prayerRequests: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
        scheduleAssignments: {
          include: {
            schedule: {
              include: {
                event: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
      },
    });

    if (!member) {
      throw new NotFoundException(`Membro com ID ${id} não encontrado`);
    }

    return member;
  }

  async update(id: string, updateMemberDto: UpdateMemberDto) {
    await this.findOne(id); // Verifica se existe

    const { cpf, email, ...rest } = updateMemberDto;

    // Verificar se CPF já está em uso por outro membro
    if (cpf) {
      const existingMember = await this.prisma.member.findUnique({
        where: { cpf },
      });

      if (existingMember && existingMember.id !== id) {
        throw new ConflictException('CPF já cadastrado para outro membro');
      }
    }

    // Verificar se email já está em uso por outro membro
    if (email) {
      const existingMember = await this.prisma.member.findFirst({
        where: { email },
      });

      if (existingMember && existingMember.id !== id) {
        throw new ConflictException('Email já cadastrado para outro membro');
      }
    }

    return this.prisma.member.update({
      where: { id },
      data: {
        ...rest,
        cpf,
        email,
      },
      include: {
        community: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Verifica se existe

    return this.prisma.member.delete({
      where: { id },
    });
  }

  // LGPD: Exportar dados do membro
  async exportMemberData(id: string) {
    const member = await this.findOne(id);

    // Remover campos sensíveis internos
    const { createdAt, updatedAt, ...memberData } = member;

    return {
      exportedAt: new Date().toISOString(),
      member: memberData,
    };
  }

  // LGPD: Direito ao esquecimento (anonizar dados)
  async anonymizeMember(id: string) {
    const member = await this.findOne(id);

    if (!member.consentGiven) {
      throw new BadRequestException(
        'Membro não deu consentimento para processamento de dados',
      );
    }

    // Anonimizar dados pessoais
    return this.prisma.member.update({
      where: { id },
      data: {
        fullName: 'Usuário Anônimo',
        cpf: null,
        rg: null,
        email: null,
        phone: null,
        address: null,
        photoUrl: null,
        fatherName: null,
        motherName: null,
        status: MemberStatus.DECEASED,
        consentGiven: false,
      },
    });
  }

  // LGPD: Atualizar consentimento
  async updateConsent(id: string, consentGiven: boolean) {
    await this.findOne(id);

    return this.prisma.member.update({
      where: { id },
      data: {
        consentGiven,
        consentDate: consentGiven ? new Date() : null,
      },
    });
  }

  // Buscar membros por nome
  async searchByName(name: string, communityId?: string) {
    const where: any = {
      fullName: {
        contains: name,
        mode: 'insensitive',
      },
    };

    if (communityId) {
      where.communityId = communityId;
    }

    return this.prisma.member.findMany({
      where,
      include: {
        community: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      take: 20,
      orderBy: {
        fullName: 'asc',
      },
    });
  }
}

