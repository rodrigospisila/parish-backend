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
    const { email, password, role, dioceseId, parishId, communityId, ...rest } = createUserDto;

    // Verificar se o email já está em uso
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email já está em uso');
    }

    // Validar hierarquia de roles
    if (currentUser.role === UserRole.DIOCESAN_ADMIN) {
      // DIOCESAN_ADMIN só pode criar usuários da sua diocese
      if (dioceseId !== currentUser.dioceseId) {
        throw new ForbiddenException('Você só pode criar usuários da sua diocese');
      }

      // DIOCESAN_ADMIN não pode criar SYSTEM_ADMIN ou DIOCESAN_ADMIN
      if (role === UserRole.SYSTEM_ADMIN || role === UserRole.DIOCESAN_ADMIN) {
        throw new ForbiddenException('Você não tem permissão para criar este tipo de usuário');
      }
    }

    // PARISH_ADMIN só pode criar usuários da sua paróquia
    if (currentUser.role === UserRole.PARISH_ADMIN) {
      if (role === UserRole.SYSTEM_ADMIN || role === UserRole.DIOCESAN_ADMIN || role === UserRole.PARISH_ADMIN) {
        throw new ForbiddenException('Você não tem permissão para criar este tipo de usuário');
      }
    }

    // COMMUNITY_COORDINATOR só pode criar usuários da sua comunidade
    if (currentUser.role === UserRole.COMMUNITY_COORDINATOR) {
      if (role !== UserRole.FAITHFUL && role !== UserRole.VOLUNTEER) {
        throw new ForbiddenException('Você só pode criar usuários do tipo FAITHFUL ou VOLUNTEER');
      }
    }

    // Validar dioceseId para DIOCESAN_ADMIN
    if (role === UserRole.DIOCESAN_ADMIN && !dioceseId) {
      throw new BadRequestException('DIOCESAN_ADMIN deve ter uma diocese vinculada');
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

