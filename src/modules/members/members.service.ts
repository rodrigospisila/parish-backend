import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { MemberStatus } from '@prisma/client';
import { HierarchyService, CurrentUser } from '../../common/hierarchy.service';

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  async create(createMemberDto: CreateMemberDto, currentUser?: CurrentUser) {
    const { cpf, email, communityId, ...rest } = createMemberDto;

    // Verificar se a comunidade existe
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
    });

    if (!community) {
      throw new NotFoundException(`Comunidade com ID ${communityId} não encontrada`);
    }

    // Validar acesso à comunidade
    if (currentUser) {
      const communityFilter = this.hierarchyService.applyCommunityFilter(currentUser);
      // Verificar se a comunidade está dentro da hierarquia do usuário
      if (communityFilter.id && communityFilter.id !== communityId) {
        throw new ForbiddenException('Você não tem permissão para criar membros nesta comunidade');
      }
      if (communityFilter.parishId && community.parishId !== currentUser.parishId) {
        throw new ForbiddenException('Você não tem permissão para criar membros nesta comunidade');
      }
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

  async findAll(currentUser?: CurrentUser, communityId?: string, status?: MemberStatus) {
    // Aplicar filtros de hierarquia usando o serviço centralizado
    const hierarchyFilter = currentUser
      ? this.hierarchyService.applyMemberFilter(currentUser)
      : {};
    
    const where: any = { ...hierarchyFilter };

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
        pastoralMemberships: {
          include: {
            communityPastoral: {
              include: {
                globalPastoral: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            pastoralGroup: {
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
        pastoralMemberships: {
          include: {
            communityPastoral: {
              include: {
                globalPastoral: true,
                community: true,
              },
            },
            pastoralGroup: true,
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

  async update(id: string, updateMemberDto: UpdateMemberDto, currentUser?: CurrentUser) {
    const member = await this.findOne(id); // Verifica se existe

    // Validar permissão para editar este membro
    if (currentUser) {
      const canManage = await this.hierarchyService.canManageMember(currentUser.id, id);
      if (!canManage) {
        throw new ForbiddenException('Você não tem permissão para editar este membro');
      }
    }

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

  async remove(id: string, currentUser?: CurrentUser) {
    await this.findOne(id); // Verifica se existe

    // Validar permissão para excluir este membro
    if (currentUser) {
      const canManage = await this.hierarchyService.canManageMember(currentUser.id, id);
      if (!canManage) {
        throw new ForbiddenException('Você não tem permissão para excluir este membro');
      }
    }

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
        zipCode: null,
        street: null,
        number: null,
        complement: null,
        neighborhood: null,
        city: null,
        state: null,
        photoUrl: null,
        fatherName: null,
        motherName: null,
        occupation: null,
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

