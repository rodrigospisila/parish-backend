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
import { MembersService } from '../members/members.service';
import { AuditService } from '../../common/audit.service';
import { ROLE_HIERARCHY } from '../auth/constants/role-hierarchy';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membersService: MembersService,
    private readonly auditService: AuditService,
  ) {}

  // Fonte única da hierarquia: src/modules/auth/constants/role-hierarchy.ts
  private readonly roleHierarchy = ROLE_HIERARCHY;

  private getUserInclude() {
    return {
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
      member: {
        include: {
          pastoralMemberships: {
            where: {
              isActive: true,
              communityPastoralId: { not: null },
            },
            include: {
              communityPastoral: {
                select: {
                  id: true,
                  communityId: true,
                  community: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                  globalPastoral: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
  }

  private serializeUser(user: any) {
    const { password, ...userWithoutPassword } = user;
    const pastoralMemberships = userWithoutPassword.member?.pastoralMemberships || [];

    return {
      ...userWithoutPassword,
      pastoralIds: pastoralMemberships
        .map((membership: any) => membership.communityPastoralId)
        .filter((id: string | null | undefined): id is string => !!id),
      pastorals: pastoralMemberships.map((membership: any) => ({
        id: membership.communityPastoral.id,
        name: membership.communityPastoral.globalPastoral.name,
        communityId: membership.communityPastoral.communityId,
        communityName: membership.communityPastoral.community?.name,
        role: membership.role,
      })),
    };
  }

  private async loadPastoralsByIds(pastoralIds: string[]) {
    const normalizedIds = [...new Set(pastoralIds.filter(Boolean))];

    const pastorals = await this.prisma.communityPastoral.findMany({
      where: {
        id: {
          in: normalizedIds,
        },
      },
      include: {
        community: {
          include: {
            parish: true,
          },
        },
        globalPastoral: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (pastorals.length !== normalizedIds.length) {
      throw new BadRequestException('Uma ou mais pastorais selecionadas nao foram encontradas');
    }

    const communityIds = [...new Set(pastorals.map((pastoral) => pastoral.communityId))];
    if (communityIds.length > 1) {
      throw new BadRequestException(
        'Coordenador de pastoral deve estar vinculado a pastorais da mesma comunidade',
      );
    }

    return pastorals;
  }

  private async loadCommunitiesByIds(communityIds: string[]) {
    const normalizedIds = [...new Set(communityIds.filter(Boolean))];

    const communities = await this.prisma.community.findMany({
      where: {
        id: {
          in: normalizedIds,
        },
      },
      include: {
        parish: true,
      },
    });

    if (communities.length !== normalizedIds.length) {
      throw new BadRequestException('Uma ou mais comunidades selecionadas nao foram encontradas');
    }

    const parishIds = [...new Set(communities.map((community) => community.parishId))];
    if (parishIds.length > 1) {
      throw new BadRequestException(
        'Coordenador de comunidade deve estar vinculado a comunidades da mesma paroquia',
      );
    }

    return communities;
  }

  private assertPastoralScope(currentUser: any, pastorals: any[]) {
    if (currentUser.role === UserRole.SYSTEM_ADMIN) {
      return;
    }

    if (currentUser.role === UserRole.DIOCESAN_ADMIN) {
      const isOutOfScope = pastorals.some(
        (pastoral) => pastoral.community.parish.dioceseId !== currentUser.dioceseId,
      );
      if (isOutOfScope) {
        throw new ForbiddenException('Voce so pode vincular pastorais da sua diocese');
      }
    }

    if (currentUser.role === UserRole.PARISH_ADMIN) {
      const isOutOfScope = pastorals.some(
        (pastoral) => pastoral.community.parishId !== currentUser.parishId,
      );
      if (isOutOfScope) {
        throw new ForbiddenException('Voce so pode vincular pastorais da sua paroquia');
      }
    }

    if (currentUser.role === UserRole.COMMUNITY_COORDINATOR) {
      const isOutOfScope = pastorals.some(
        (pastoral) => pastoral.communityId !== currentUser.communityId,
      );
      if (isOutOfScope) {
        throw new ForbiddenException('Voce so pode vincular pastorais da sua comunidade');
      }
    }
  }

  private assertCommunityScope(currentUser: any, communities: any[]) {
    if (currentUser.role === UserRole.SYSTEM_ADMIN) {
      return;
    }

    if (currentUser.role === UserRole.DIOCESAN_ADMIN) {
      const isOutOfScope = communities.some(
        (community) => community.parish.dioceseId !== currentUser.dioceseId,
      );
      if (isOutOfScope) {
        throw new ForbiddenException('Voce so pode vincular comunidades da sua diocese');
      }
    }

    if (currentUser.role === UserRole.PARISH_ADMIN) {
      const isOutOfScope = communities.some(
        (community) => community.parishId !== currentUser.parishId,
      );
      if (isOutOfScope) {
        throw new ForbiddenException('Voce so pode vincular comunidades da sua paroquia');
      }
    }

    if (currentUser.role === UserRole.COMMUNITY_COORDINATOR) {
      const isOutOfScope = communities.some((community) => community.id !== currentUser.communityId);
      if (isOutOfScope) {
        throw new ForbiddenException('Voce so pode vincular a sua comunidade');
      }
    }
  }

  private assertUserScope(currentUser: any, targetUser: any) {
    if (currentUser.role === UserRole.SYSTEM_ADMIN) {
      return;
    }

    if (currentUser.role === UserRole.DIOCESAN_ADMIN) {
      if (targetUser.dioceseId !== currentUser.dioceseId) {
        throw new ForbiddenException('Voce so pode gerenciar usuarios da sua diocese');
      }

      if (targetUser.role === UserRole.SYSTEM_ADMIN || targetUser.role === UserRole.DIOCESAN_ADMIN) {
        throw new ForbiddenException('Voce nao tem permissao para gerenciar este usuario');
      }

      return;
    }

    if (currentUser.role === UserRole.PARISH_ADMIN && targetUser.parishId !== currentUser.parishId) {
      throw new ForbiddenException('Voce so pode gerenciar usuarios da sua paroquia');
    }

    if (
      currentUser.role === UserRole.COMMUNITY_COORDINATOR &&
      targetUser.communityId !== currentUser.communityId
    ) {
      throw new ForbiddenException('Voce so pode gerenciar usuarios da sua comunidade');
    }
  }


  private async syncUserCommunities(
    tx: any,
    userId: string,
    role: UserRole,
    communityIds?: string[],
    communityId?: string | null,
  ) {
    const nextCommunityIds = communityIds?.length
      ? [...new Set(communityIds)]
      : communityId
        ? [communityId]
        : [];

    await tx.userCommunity.deleteMany({
      where: { userId },
    });

    if (!nextCommunityIds.length) {
      return;
    }

    await Promise.all(
      nextCommunityIds.map((currentCommunityId, index) =>
        tx.userCommunity.create({
          data: {
            userId,
            communityId: currentCommunityId,
            role,
            isPrimary: index === 0,
          },
        }),
      ),
    );
  }

  private async clearPastoralCoordinatorLinks(tx: any, userId: string) {
    const user = await tx.user.findUnique({
      where: { id: userId },
      include: {
        member: true,
      },
    });

    if (!user?.member) {
      return;
    }

    const now = new Date();

    await tx.pastoralMember.updateMany({
      where: {
        memberId: user.member.id,
        role: 'COORDINATOR',
        isActive: true,
      },
      data: {
        role: 'MEMBER',
        leftAt: now,
      },
    });

    await tx.pastoralCoordinator.updateMany({
      where: {
        memberId: user.member.id,
        isCurrent: true,
      },
      data: {
        isCurrent: false,
        endDate: now,
      },
    });
  }

  private async syncPastoralCoordinatorLinks(
    tx: any,
    userId: string,
    pastoralIds: string[],
    userData: {
      name: string;
      email: string;
      phone?: string | null;
      communityId?: string | null;
      consentGiven?: boolean;
    },
    existingMemberId?: string,
  ) {
    const member = await this.membersService.ensureProfileForUser(
      tx,
      {
        userId,
        role: UserRole.PASTORAL_COORDINATOR,
        ...userData,
      },
      existingMemberId,
    );

    if (!member) {
      throw new BadRequestException(
        'Coordenador de pastoral precisa estar vinculado a uma comunidade valida',
      );
    }

    const now = new Date();

    await tx.pastoralMember.updateMany({
      where: {
        memberId: member.id,
        role: 'COORDINATOR',
        isActive: true,
        communityPastoralId: {
          notIn: pastoralIds,
        },
      },
      data: {
        role: 'MEMBER',
        leftAt: now,
      },
    });

    const currentMemberships = await tx.pastoralMember.findMany({
      where: {
        memberId: member.id,
        communityPastoralId: {
          in: pastoralIds,
        },
      },
    });

    for (const pastoralId of pastoralIds) {
      const currentMembership = currentMemberships.find(
        (membership: any) => membership.communityPastoralId === pastoralId,
      );

      if (currentMembership) {
        await tx.pastoralMember.update({
          where: { id: currentMembership.id },
          data: {
            role: 'COORDINATOR',
            isActive: true,
            leftAt: null,
          },
        });
      } else {
        await tx.pastoralMember.create({
          data: {
            memberId: member.id,
            communityPastoralId: pastoralId,
            role: 'COORDINATOR',
            isActive: true,
          },
        });
      }

      await tx.pastoralCoordinator.updateMany({
        where: {
          communityPastoralId: pastoralId,
          isCurrent: true,
          memberId: {
            not: member.id,
          },
        },
        data: {
          isCurrent: false,
          endDate: now,
        },
      });

      const existingCurrentRecord = await tx.pastoralCoordinator.findFirst({
        where: {
          communityPastoralId: pastoralId,
          memberId: member.id,
          isCurrent: true,
        },
      });

      if (!existingCurrentRecord) {
        await tx.pastoralCoordinator.create({
          data: {
            communityPastoralId: pastoralId,
            memberId: member.id,
            startDate: now,
            isCurrent: true,
          },
        });
      }
    }

    await tx.pastoralCoordinator.updateMany({
      where: {
        memberId: member.id,
        isCurrent: true,
        communityPastoralId: {
          notIn: pastoralIds,
        },
      },
      data: {
        isCurrent: false,
        endDate: now,
      },
    });
  }

  private async getCurrentCoordinatorPastoralIds(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        member: {
          include: {
            pastoralMemberships: {
              where: {
                isActive: true,
                role: 'COORDINATOR',
                communityPastoralId: { not: null },
              },
              select: {
                communityPastoralId: true,
              },
            },
          },
        },
      },
    });

    return (user?.member?.pastoralMemberships || [])
      .map((membership) => membership.communityPastoralId)
      .filter((currentPastoralId): currentPastoralId is string => !!currentPastoralId);
  }

  /**
   * Normaliza o telefone vindo dos formulários: string vazia vira null
   * (users.phone tem unique — '' colide entre usuários sem telefone).
   */
  private normalizeOptionalPhone(phone: string | null | undefined): string | null | undefined {
    if (phone === undefined) {
      return undefined;
    }
    const trimmed = phone?.trim();
    return trimmed ? trimmed : null;
  }

  async create(createUserDto: CreateUserDto, currentUser: any) {
    let {
      email,
      password,
      role,
      dioceseId,
      parishId,
      communityId,
      communityIds,
      pastoralIds,
      consentGiven,
      ...rest
    } = createUserDto;

    rest.phone = this.normalizeOptionalPhone(rest.phone);

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email ja esta em uso');
    }

    if (rest.phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: rest.phone },
      });

      if (existingPhone) {
        throw new ConflictException('Telefone ja esta em uso por outro usuario');
      }
    }

    const currentUserLevel = this.roleHierarchy[currentUser.role as UserRole];
    const newUserLevel = this.roleHierarchy[role];

    if (newUserLevel <= currentUserLevel) {
      throw new ForbiddenException('Voce nao pode criar usuarios de nivel superior ou igual ao seu');
    }

    if (currentUser.role === UserRole.DIOCESAN_ADMIN) {
      if (dioceseId && dioceseId !== currentUser.dioceseId) {
        throw new ForbiddenException('Voce so pode criar usuarios para sua diocese');
      }
      dioceseId = currentUser.dioceseId;
    }

    if (currentUser.role === UserRole.PARISH_ADMIN) {
      if (!currentUser.dioceseId || !currentUser.parishId) {
        throw new ForbiddenException('Seu usuario nao esta vinculado a uma diocese ou paroquia');
      }
      dioceseId = currentUser.dioceseId;
      parishId = currentUser.parishId;
    }

    if (currentUser.role === UserRole.COMMUNITY_COORDINATOR) {
      if (!currentUser.dioceseId || !currentUser.parishId || !currentUser.communityId) {
        throw new ForbiddenException('Seu usuario nao esta vinculado a uma diocese, paroquia e comunidade');
      }
      dioceseId = currentUser.dioceseId;
      parishId = currentUser.parishId;
      communityId = currentUser.communityId;
      communityIds = currentUser.communityId ? [currentUser.communityId] : communityIds;
    }

    if (role === UserRole.DIOCESAN_ADMIN && !dioceseId) {
      throw new BadRequestException('DIOCESAN_ADMIN deve ter uma diocese vinculada');
    }

    if (role === UserRole.PARISH_ADMIN && (!dioceseId || !parishId)) {
      throw new BadRequestException('PARISH_ADMIN deve ter uma diocese e paroquia vinculadas');
    }

    if (role === UserRole.COMMUNITY_COORDINATOR && (!dioceseId || !parishId)) {
      throw new BadRequestException('COMMUNITY_COORDINATOR deve ter uma diocese e paroquia vinculadas');
    }

    if (role === UserRole.COMMUNITY_COORDINATOR) {
      if (!communityIds?.length) {
        throw new BadRequestException(
          'COMMUNITY_COORDINATOR deve ter pelo menos uma comunidade vinculada',
        );
      }

      const scopedCommunities = await this.loadCommunitiesByIds(communityIds);
      this.assertCommunityScope(currentUser, scopedCommunities);
      communityId = scopedCommunities[0].id;
      parishId = scopedCommunities[0].parishId;
      dioceseId = scopedCommunities[0].parish.dioceseId;
    }

    if (role === UserRole.PASTORAL_COORDINATOR) {
      if (!pastoralIds?.length) {
        throw new BadRequestException(
          'PASTORAL_COORDINATOR deve ter pelo menos uma pastoral vinculada',
        );
      }

      const scopedPastorals = await this.loadPastoralsByIds(pastoralIds);
      this.assertPastoralScope(currentUser, scopedPastorals);
      communityId = scopedPastorals[0].communityId;
      parishId = scopedPastorals[0].community.parishId;
      dioceseId = scopedPastorals[0].community.parish.dioceseId;
      communityIds = [communityId];
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const createdUser = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          ...rest,
          email,
          password: hashedPassword,
          role,
          dioceseId,
          parishId,
          communityId,
          forcePasswordChange: true,
        },
        include: this.getUserInclude(),
      });

      await this.syncUserCommunities(tx, newUser.id, role, communityIds, communityId);

      if (communityId) {
        await this.membersService.ensureProfileForUser(
          tx,
          {
            userId: newUser.id,
            role,
            name: newUser.name,
            email: newUser.email,
            phone: newUser.phone,
            communityId,
            consentGiven,
          },
          newUser.member?.id,
        );
      }

      if (role === UserRole.PASTORAL_COORDINATOR) {
        await this.syncPastoralCoordinatorLinks(
          tx,
          newUser.id,
          pastoralIds || [],
          {
            name: newUser.name,
            email: newUser.email,
            phone: newUser.phone,
            communityId,
            consentGiven,
          },
          newUser.member?.id,
        );
      }

      return tx.user.findUnique({
        where: { id: newUser.id },
        include: this.getUserInclude(),
      });
    });

    await this.auditService.log({
      actor: { id: currentUser.id, email: currentUser.email, role: currentUser.role },
      action: 'CREATE',
      entity: 'User',
      entityId: createdUser?.id,
      after: { email, role, dioceseId, parishId, communityId },
    });

    return this.serializeUser(createdUser);
  }

  async findAll(currentUser: any) {
    const where: any = {};

    if (currentUser.role === UserRole.DIOCESAN_ADMIN) {
      where.dioceseId = currentUser.dioceseId;
    }

    if (currentUser.role === UserRole.PARISH_ADMIN) {
      where.parishId = currentUser.parishId;
    }

    if (currentUser.role === UserRole.COMMUNITY_COORDINATOR) {
      if (currentUser.communityId) {
        where.communities = {
          some: {
            communityId: currentUser.communityId,
          },
        };
        where.role = {
          in: [
            UserRole.COMMUNITY_COORDINATOR,
            UserRole.PASTORAL_COORDINATOR,
            UserRole.VOLUNTEER,
            UserRole.FAITHFUL,
          ],
        };
      } else if (currentUser.parishId) {
        where.parishId = currentUser.parishId;
        where.role = {
          in: [
            UserRole.COMMUNITY_COORDINATOR,
            UserRole.PASTORAL_COORDINATOR,
            UserRole.VOLUNTEER,
            UserRole.FAITHFUL,
          ],
        };
      }
    }

    const users = await this.prisma.user.findMany({
      where,
      include: this.getUserInclude(),
      orderBy: {
        createdAt: 'desc',
      },
    });

    return users.map((user) => this.serializeUser(user));
  }

  async findOne(id: string, currentUser?: any) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: this.getUserInclude(),
    });

    if (!user) {
      throw new NotFoundException(`Usuario com ID ${id} nao encontrado`);
    }

    if (currentUser) {
      this.assertUserScope(currentUser, user);
    }

    return this.serializeUser(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto, currentUser: any) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        member: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`Usuario com ID ${id} nao encontrado`);
    }

    this.assertUserScope(currentUser, user);

    const {
      password: _password,
      communityIds: rawCommunityIds,
      pastoralIds,
      consentGiven,
      ...updateData
    } = updateUserDto;
    let communityIds = rawCommunityIds;

    updateData.phone = this.normalizeOptionalPhone(updateData.phone);
    if (updateData.phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: updateData.phone },
        select: { id: true },
      });

      if (existingPhone && existingPhone.id !== id) {
        throw new ConflictException('Telefone ja esta em uso por outro usuario');
      }
    }

    let nextDioceseId = updateData.dioceseId ?? user.dioceseId;
    let nextParishId = updateData.parishId ?? user.parishId;
    let nextCommunityId = updateData.communityId ?? user.communityId;
    const nextRole = (updateData.role as UserRole | undefined) ?? user.role;

    if (nextRole === UserRole.COMMUNITY_COORDINATOR) {
      const targetCommunityIds = communityIds?.length
        ? communityIds
        : nextCommunityId
          ? [nextCommunityId]
          : [];

      if (!targetCommunityIds.length) {
        throw new BadRequestException(
          'COMMUNITY_COORDINATOR deve ter pelo menos uma comunidade vinculada',
        );
      }

      const scopedCommunities = await this.loadCommunitiesByIds(targetCommunityIds);
      this.assertCommunityScope(currentUser, scopedCommunities);
      communityIds = scopedCommunities.map((community) => community.id);
      nextCommunityId = scopedCommunities[0].id;
      nextParishId = scopedCommunities[0].parishId;
      nextDioceseId = scopedCommunities[0].parish.dioceseId;
    } else if (nextCommunityId && nextCommunityId !== user.communityId) {
      const scopedCommunities = await this.loadCommunitiesByIds([nextCommunityId]);
      this.assertCommunityScope(currentUser, scopedCommunities);
      nextParishId = scopedCommunities[0].parishId;
      nextDioceseId = scopedCommunities[0].parish.dioceseId;
    }

    let resolvedPastoralIds = pastoralIds || [];
    if (nextRole === UserRole.PASTORAL_COORDINATOR && !resolvedPastoralIds.length) {
      resolvedPastoralIds = await this.getCurrentCoordinatorPastoralIds(id);
    }

    if (nextRole === UserRole.PASTORAL_COORDINATOR) {
      if (!resolvedPastoralIds.length) {
        throw new BadRequestException(
          'PASTORAL_COORDINATOR deve ter pelo menos uma pastoral vinculada',
        );
      }

      const scopedPastorals = await this.loadPastoralsByIds(resolvedPastoralIds);
      this.assertPastoralScope(currentUser, scopedPastorals);
      nextCommunityId = scopedPastorals[0].communityId;
      nextParishId = scopedPastorals[0].community.parishId;
      nextDioceseId = scopedPastorals[0].community.parish.dioceseId;
      communityIds = [nextCommunityId];
    }

    const finalUser = await this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id },
        data: {
          ...updateData,
          dioceseId: nextDioceseId,
          parishId: nextParishId,
          communityId: nextCommunityId,
        },
        include: this.getUserInclude(),
      });

      await this.syncUserCommunities(
        tx,
        id,
        nextRole,
        nextRole === UserRole.COMMUNITY_COORDINATOR ? communityIds : undefined,
        nextCommunityId,
      );

      if (nextCommunityId) {
        await this.membersService.ensureProfileForUser(
          tx,
          {
            userId: id,
            role: nextRole,
            name: updatedUser.name,
            email: updatedUser.email,
            phone: updatedUser.phone,
            communityId: nextCommunityId,
            consentGiven,
          },
          updatedUser.member?.id,
        );
      }

      if (nextRole === UserRole.PASTORAL_COORDINATOR) {
        await this.syncPastoralCoordinatorLinks(
          tx,
          id,
          resolvedPastoralIds,
          {
            name: updatedUser.name,
            email: updatedUser.email,
            phone: updatedUser.phone,
            communityId: nextCommunityId,
            consentGiven,
          },
          updatedUser.member?.id,
        );
      } else if (user.role === UserRole.PASTORAL_COORDINATOR || pastoralIds !== undefined) {
        await this.clearPastoralCoordinatorLinks(tx, id);
      }

      return tx.user.findUnique({
        where: { id },
        include: this.getUserInclude(),
      });
    });

    if (!finalUser) {
      throw new NotFoundException(`Usuario com ID ${id} nao encontrado`);
    }

    await this.auditService.log({
      actor: { id: currentUser.id, email: currentUser.email, role: currentUser.role },
      action: 'UPDATE',
      entity: 'User',
      entityId: id,
      before: { role: user.role, communityId: user.communityId },
      after: { role: finalUser.role, communityId: finalUser.communityId },
      metadata: { changedFields: Object.keys(updateData) },
    });

    return this.serializeUser(finalUser);
  }

  async remove(id: string, currentUser?: any) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Usuario com ID ${id} nao encontrado`);
    }

    if (currentUser) {
      this.assertUserScope(currentUser, user);
    }

    await this.prisma.user.delete({
      where: { id },
    });

    await this.auditService.log({
      actor: currentUser
        ? { id: currentUser.id, email: currentUser.email, role: currentUser.role }
        : null,
      action: 'DELETE',
      entity: 'User',
      entityId: id,
      before: { email: user.email, role: user.role },
    });

    return { message: 'Usuario excluido com sucesso' };
  }

  async changePassword(id: string, changePasswordDto: ChangePasswordDto, currentUser: any) {
    if (currentUser.id !== id && currentUser.role !== UserRole.SYSTEM_ADMIN) {
      throw new ForbiddenException('Voce so pode trocar sua propria senha');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Usuario com ID ${id} nao encontrado`);
    }

    const isPasswordValid = await bcrypt.compare(changePasswordDto.currentPassword, user.password);

    if (!isPasswordValid) {
      throw new BadRequestException('Senha atual incorreta');
    }

    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    await this.prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        forcePasswordChange: false,
      },
    });

    await this.auditService.log({
      actor: { id: currentUser.id, email: currentUser.email, role: currentUser.role },
      action: 'PASSWORD_CHANGE',
      entity: 'User',
      entityId: id,
    });

    return { message: 'Senha alterada com sucesso' };
  }

  async updateMyCommunity(userId: string, communityId: string, consentGiven?: boolean) {
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
      include: {
        parish: true,
      },
    });

    if (!community) {
      throw new NotFoundException(`Comunidade com ID ${communityId} nao encontrada`);
    }

    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        member: true,
      },
    });

    if (!currentUser) {
      throw new NotFoundException(`Usuario com ID ${userId} nao encontrado`);
    }

    if (
      currentUser.role === UserRole.PASTORAL_COORDINATOR &&
      currentUser.communityId &&
      currentUser.communityId !== communityId
    ) {
      throw new ForbiddenException('Coordenador de pastoral nao pode trocar de comunidade manualmente');
    }

    const updatedUser = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          communityId,
          parishId: community.parishId,
          dioceseId: community.parish.dioceseId,
        },
      });

      await this.syncUserCommunities(tx, userId, currentUser.role, undefined, communityId);

      await this.membersService.ensureProfileForUser(
        tx,
        {
          userId,
          role: currentUser.role,
          name: currentUser.name,
          email: currentUser.email,
          phone: currentUser.phone,
          communityId,
          consentGiven,
        },
        currentUser.member?.id,
      );

      return tx.user.findUnique({
        where: { id: userId },
        include: this.getUserInclude(),
      });
    });

    return this.serializeUser(updatedUser);
  }

  async resetPassword(id: string, currentUser: any) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Usuario com ID ${id} nao encontrado`);
    }

    this.assertUserScope(currentUser, user);

    const tempPassword = Math.random().toString(36).slice(-8) + 'Aa1!';
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    await this.prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        forcePasswordChange: true,
      },
    });

    await this.auditService.log({
      actor: { id: currentUser.id, email: currentUser.email, role: currentUser.role },
      action: 'PASSWORD_RESET',
      entity: 'User',
      entityId: id,
    });

    return {
      message: 'Senha resetada com sucesso',
      tempPassword,
    };
  }
}
