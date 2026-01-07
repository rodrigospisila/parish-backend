import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto, currentUser: any) {
    let { email, password, role, dioceseId, parishId, communityId, communityIds, ...rest } = createUserDto;

    // Verificar se o email já está em uso
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email já está em uso');
    }

    // Definir hierarquia de níveis
    const roleHierarchy: Record<UserRole, number> = {
      SYSTEM_ADMIN: 1,
      DIOCESAN_ADMIN: 2,
      PARISH_ADMIN: 3,
      COMMUNITY_COORDINATOR: 4,
      PASTORAL_COORDINATOR: 5,
      VOLUNTEER: 6,
      FAITHFUL: 7,
    };

    const currentUserLevel = roleHierarchy[currentUser.role as UserRole];
    const newUserLevel = roleHierarchy[role];

    // REGRA 1: Não pode criar usuário de nível superior ou igual
    if (newUserLevel <= currentUserLevel) {
      throw new ForbiddenException('Você não pode criar usuários de nível superior ou igual ao seu');
    }

    // REGRA 2: Validar e auto-preencher escopo baseado no role do usuário atual
    if (currentUser.role === UserRole.DIOCESAN_ADMIN) {
      // DIOCESAN_ADMIN só pode criar para sua diocese
      if (dioceseId && dioceseId !== currentUser.dioceseId) {
        throw new ForbiddenException('Você só pode criar usuários para sua diocese');
      }
      // Auto-preencher diocese se não fornecida
      dioceseId = currentUser.dioceseId;
    }

    if (currentUser.role === UserRole.PARISH_ADMIN) {
      // PARISH_ADMIN deve ter diocese e paróquia vinculadas
      if (!currentUser.dioceseId || !currentUser.parishId) {
        throw new ForbiddenException('Seu usuário não está vinculado a uma diocese/paróquia');
      }
      // Auto-preencher diocese e paróquia (ignora valores enviados)
      dioceseId = currentUser.dioceseId;
      parishId = currentUser.parishId;
    }

    if (currentUser.role === UserRole.COMMUNITY_COORDINATOR) {
      // COMMUNITY_COORDINATOR deve ter diocese, paróquia e comunidade vinculadas
      if (!currentUser.dioceseId || !currentUser.parishId || !currentUser.communityId) {
        throw new ForbiddenException('Seu usuário não está vinculado a uma diocese/paróquia/comunidade');
      }
      // Auto-preencher diocese, paróquia e comunidade (ignora valores enviados)
      dioceseId = currentUser.dioceseId;
      parishId = currentUser.parishId;
      communityId = currentUser.communityId;
    }

    // REGRA 3: Validar campos obrigatórios baseado no role sendo criado
    if (role === UserRole.DIOCESAN_ADMIN && !dioceseId) {
      throw new BadRequestException('DIOCESAN_ADMIN deve ter uma diocese vinculada');
    }
    if (role === UserRole.PARISH_ADMIN && (!dioceseId || !parishId)) {
      throw new BadRequestException('PARISH_ADMIN deve ter uma diocese e paróquia vinculadas');
    }
    if (role === UserRole.COMMUNITY_COORDINATOR && (!dioceseId || !parishId)) {
      throw new BadRequestException('COMMUNITY_COORDINATOR deve ter uma diocese e paróquia vinculadas');
    }
    if (role === UserRole.COMMUNITY_COORDINATOR && (!communityIds || communityIds.length === 0)) {
      throw new BadRequestException('COMMUNITY_COORDINATOR deve ter pelo menos uma comunidade vinculada');
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar usuário
    const user = await this.prisma.user.create({
      data: {
        ...rest,
        email,
        password: hashedPassword,
        role,
        dioceseId,
        parishId,
        communityId,
        forcePasswordChange: true, // Forçar troca de senha no primeiro acesso
      },
      include: {
        diocese: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Se communityIds foi fornecido, criar vínculos UserCommunity
    if (communityIds && communityIds.length > 0) {
      await Promise.all(
        communityIds.map((commId, index) =>
          this.prisma.userCommunity.create({
            data: {
              userId: user.id,
              communityId: commId,
              role: user.role, // Usar o role do usuário
              isPrimary: index === 0, // Primeira comunidade é a principal
            },
          }),
        ),
      );
    }

    // Remover senha do retorno
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findAll(currentUser: any) {
    const where: any = {};

    // DIOCESAN_ADMIN só vê usuários da sua diocese
    if (currentUser.role === UserRole.DIOCESAN_ADMIN) {
      where.dioceseId = currentUser.dioceseId;
    }

    // PARISH_ADMIN só vê usuários da sua paróquia
    if (currentUser.role === UserRole.PARISH_ADMIN) {
      where.parishId = currentUser.parishId;
    }

    // COMMUNITY_COORDINATOR só vê usuários da sua comunidade
    if (currentUser.role === UserRole.COMMUNITY_COORDINATOR) {
      where.communityId = currentUser.communityId;
    }

    const users = await this.prisma.user.findMany({
      where,
      include: {
        diocese: {
          select: {
            id: true,
            name: true,
          },
        },
        communities: {
          include: {
            community: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Remover senhas do retorno
    return users.map(({ password, ...user }) => user);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        diocese: {
          select: {
            id: true,
            name: true,
          },
        },
        communities: {
          include: {
            community: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async update(id: string, updateUserDto: UpdateUserDto, currentUser: any) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
    }

    // Validar permissões
    if (currentUser.role === UserRole.DIOCESAN_ADMIN) {
      // DIOCESAN_ADMIN só pode editar usuários da sua diocese
      if (user.dioceseId !== currentUser.dioceseId) {
        throw new ForbiddenException('Você só pode editar usuários da sua diocese');
      }

      // DIOCESAN_ADMIN não pode editar SYSTEM_ADMIN ou outros DIOCESAN_ADMIN
      if (user.role === UserRole.SYSTEM_ADMIN || user.role === UserRole.DIOCESAN_ADMIN) {
        throw new ForbiddenException('Você não tem permissão para editar este usuário');
      }
    }

    const { password, ...updateData } = updateUserDto;

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        diocese: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const { password: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async remove(id: string, currentUser?: any) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
    }

    // Validar permissões
    if (currentUser) {
      if (currentUser.role === UserRole.DIOCESAN_ADMIN && user.dioceseId !== currentUser.dioceseId) {
        throw new ForbiddenException('Você só pode excluir usuários da sua diocese');
      }
      if (currentUser.role === UserRole.PARISH_ADMIN && user.parishId !== currentUser.parishId) {
        throw new ForbiddenException('Você só pode excluir usuários da sua paróquia');
      }
      if (currentUser.role === UserRole.COMMUNITY_COORDINATOR && user.communityId !== currentUser.communityId) {
        throw new ForbiddenException('Você só pode excluir usuários da sua comunidade');
      }
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return { message: 'Usuário excluído com sucesso' };
  }

  async changePassword(id: string, changePasswordDto: ChangePasswordDto, currentUser: any) {
    // Usuário só pode trocar sua própria senha, exceto SYSTEM_ADMIN
    if (currentUser.id !== id && currentUser.role !== UserRole.SYSTEM_ADMIN) {
      throw new ForbiddenException('Você só pode trocar sua própria senha');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
    }

    // Verificar senha atual
    const isPasswordValid = await bcrypt.compare(changePasswordDto.currentPassword, user.password);

    if (!isPasswordValid) {
      throw new BadRequestException('Senha atual incorreta');
    }

    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    // Atualizar senha e remover flag de forcePasswordChange
    await this.prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        forcePasswordChange: false,
      },
    });

    return { message: 'Senha alterada com sucesso' };
  }

  /**
   * Permite que o usuário atualize sua própria comunidade
   * Usado principalmente no fluxo de onboarding do app mobile
   * Também cria ou atualiza o registro de Membro vinculado ao usuário
   */
  async updateMyCommunity(userId: string, communityId: string) {
    // Verificar se a comunidade existe
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
      include: {
        parish: true,
      },
    });

    if (!community) {
      throw new NotFoundException(`Comunidade com ID ${communityId} não encontrada`);
    }

    // Buscar usuário atual para obter dados
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        member: true,
      },
    });

    if (!currentUser) {
      throw new NotFoundException(`Usuário com ID ${userId} não encontrado`);
    }

    // Usar transação para atualizar User e criar/atualizar Member
    const updatedUser = await this.prisma.$transaction(async (tx) => {
      // Atualizar o usuário com a comunidade, paróquia e diocese
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          communityId: communityId,
          parishId: community.parishId,
          dioceseId: community.parish.dioceseId,
        },
        include: {
          diocese: {
            select: {
              id: true,
              name: true,
            },
          },
          parish: {
            select: {
              id: true,
              name: true,
            },
          },
          community: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Criar ou atualizar Membro vinculado ao usuário
      if (currentUser.member) {
        // Atualizar membro existente com a nova comunidade
        await tx.member.update({
          where: { id: currentUser.member.id },
          data: {
            communityId: communityId,
          },
        });
      } else {
        // Criar novo membro vinculado ao usuário
        await tx.member.create({
          data: {
            fullName: currentUser.name,
            email: currentUser.email,
            phone: currentUser.phone,
            userId: userId,
            communityId: communityId,
            status: 'ACTIVE',
            consentGiven: true,
            consentDate: new Date(),
          },
        });
      }

      return user;
    });

    const { password: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async resetPassword(id: string, currentUser: any) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
    }

    // Validar permissões
    if (currentUser.role === UserRole.DIOCESAN_ADMIN) {
      if (user.dioceseId !== currentUser.dioceseId) {
        throw new ForbiddenException('Você só pode resetar senhas de usuários da sua diocese');
      }

      if (user.role === UserRole.SYSTEM_ADMIN || user.role === UserRole.DIOCESAN_ADMIN) {
        throw new ForbiddenException('Você não tem permissão para resetar a senha deste usuário');
      }
    }

    // Gerar senha temporária
    const tempPassword = Math.random().toString(36).slice(-8) + 'Aa1!';
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Atualizar senha e forçar troca
    await this.prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        forcePasswordChange: true,
      },
    });

    return {
      message: 'Senha resetada com sucesso',
      tempPassword,
    };
  }
}

