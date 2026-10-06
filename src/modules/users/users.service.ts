import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { MembersService } from '../members/members.service';
import { AuditService } from '../../common/audit.service';
import { ROLE_HIERARCHY } from '../auth/constants/role-hierarchy';
import { emailInsensitive, normalizeEmail } from '../auth/email-lookup';
import { COORDINATOR_MEMBER_ROLES, pickCoordinatedPastoralIds } from '../pastorals/coordination-scope';
import { TERMS_VERSION, isTermsAcceptanceRequired } from './terms.constants';
import { ACCOUNT_DELETION_RECENT_AUTH_MS, SessionSecurityService } from '../auth/session-security.service';
import { lockUserRow } from '../auth/session-lock';

/** Reautenticação da exclusão da própria conta (revisão #25/#43). */
export interface AccountDeletionReauth {
  /** Senha atual (painel e app novo) */
  password?: string | null;
  /** Claim `at` da sessão (s): sem a senha, só login de até 5 min (app 1.1.0) */
  authTime?: number | null;
  ip?: string | null;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membersService: MembersService,
    private readonly auditService: AuditService,
    // Conferência da senha com o freio da conta (#42); opcional só para specs antigos
    @Optional() private readonly security?: SessionSecurityService,
  ) {}

  // Fonte única da hierarquia: src/modules/auth/constants/role-hierarchy.ts
  private readonly roleHierarchy = ROLE_HIERARCHY;

  /**
   * Campos devolvidos pela API de usuários — SELECT EXPLÍCITO (negar por padrão):
   * hash da senha, segredos do 2FA, pushToken e estado de sessão nunca são
   * lidos; do membro vinculado vêm só o id, a comunidade e as pastorais
   * (o cadastro completo — CPF, endereço, nascimento — fica no módulo de membros).
   */
  private getUserSelect() {
    return {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      isActive: true,
      clergyTitle: true,
      forcePasswordChange: true,
      dioceseId: true,
      parishId: true,
      communityId: true,
      primaryCommunityId: true,
      twoFactorEnabled: true,
      acceptedTermsAt: true,
      acceptedTermsVersion: true,
      createdAt: true,
      updatedAt: true,
      lastLogin: true,
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
        where: { isActive: true },
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
        select: {
          id: true,
          communityId: true,
          pastoralMemberships: {
            where: {
              isActive: true,
              communityPastoralId: { not: null },
            },
            select: {
              communityPastoralId: true,
              role: true,
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
          // Coordenação vigente (histórico oficial) — base de coordinatedPastoralIds
          pastoralCoordinations: {
            where: { isCurrent: true, communityPastoral: { deletedAt: null } },
            select: { communityPastoralId: true },
          },
        },
      },
    } satisfies Prisma.UserSelect;
  }

  private serializeUser(user: any) {
    // Nunca expor material de autenticação nem o token de push — mesmo que um
    // chamador futuro carregue o registro inteiro em vez do select explícito
    const {
      password,
      twoFactorSecret,
      twoFactorBackupCodes,
      twoFactorLastStep,
      twoFactorSetupAt,
      sessionsRevokedAt,
      pushToken,
      pushTokenUpdatedAt,
      member,
      ...userWithoutPassword
    } = user;
    const pastoralMemberships = member?.pastoralMemberships || [];
    const coordinatedPastoralIds = pickCoordinatedPastoralIds(
      pastoralMemberships,
      member?.pastoralCoordinations ?? [],
    );

    return {
      ...userWithoutPassword,
      // Do membro vinculado, só o id (o cadastro completo fica no módulo de membros)
      member: member ? { id: member.id } : null,
      // PARTICIPAÇÃO (todos os vínculos ativos) — não é coordenação
      pastoralIds: pastoralMemberships
        .map((membership: any) => membership.communityPastoralId)
        .filter((id: string | null | undefined): id is string => !!id),
      // COORDENAÇÃO vigente: é com esta lista que o painel inicializa o
      // formulário do coordenador de pastoral (participação ≠ coordenação)
      coordinatedPastoralIds,
      // Vínculos de sub-grupo (só pastoralGroupId) não têm communityPastoral — ignorar aqui
      pastorals: pastoralMemberships
        .filter((membership: any) => membership.communityPastoral)
        .map((membership: any) => ({
          id: membership.communityPastoral.id,
          name: membership.communityPastoral.globalPastoral.name,
          communityId: membership.communityPastoral.communityId,
          communityName: membership.communityPastoral.community?.name,
          role: membership.role,
          isCoordinator: coordinatedPastoralIds.includes(membership.communityPastoral.id),
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

  /**
   * Quem pode LER/GERENCIAR o usuário-alvo (negar por padrão — achados C2/A11):
   * - SYSTEM_ADMIN: todos;
   * - o próprio usuário: só quando `allowSelf` (leitura/edição de dados básicos);
   * - gestor: alvo de papel ESTRITAMENTE inferior ao seu E dentro do seu escopo
   *   (diocese/paróquia/comunidade preenchida e igual à do alvo);
   * - qualquer outro papel: proibido.
   */
  private assertUserScope(currentUser: any, targetUser: any, options: { allowSelf?: boolean } = {}) {
    if (!currentUser?.role) {
      throw new ForbiddenException('Voce nao tem permissao para gerenciar este usuario');
    }

    if (currentUser.role === UserRole.SYSTEM_ADMIN) {
      return;
    }

    if (currentUser.id && currentUser.id === targetUser.id) {
      if (options.allowSelf) {
        return;
      }
      throw new ForbiddenException('Use as opcoes da sua conta para alterar os seus proprios dados');
    }

    const actorLevel = this.roleHierarchy[currentUser.role as UserRole];
    const targetLevel = this.roleHierarchy[targetUser.role as UserRole];
    if (actorLevel === undefined || targetLevel === undefined || targetLevel <= actorLevel) {
      throw new ForbiddenException('Voce nao tem permissao para gerenciar este usuario');
    }

    switch (currentUser.role) {
      case UserRole.DIOCESAN_ADMIN:
        if (!currentUser.dioceseId || targetUser.dioceseId !== currentUser.dioceseId) {
          throw new ForbiddenException('Voce so pode gerenciar usuarios da sua diocese');
        }
        return;
      case UserRole.PARISH_ADMIN:
        if (!currentUser.parishId || targetUser.parishId !== currentUser.parishId) {
          throw new ForbiddenException('Voce so pode gerenciar usuarios da sua paroquia');
        }
        return;
      case UserRole.COMMUNITY_COORDINATOR:
        if (!currentUser.communityId || targetUser.communityId !== currentUser.communityId) {
          throw new ForbiddenException('Voce so pode gerenciar usuarios da sua comunidade');
        }
        return;
      default:
        throw new ForbiddenException('Voce nao tem permissao para gerenciar usuarios');
    }
  }

  /**
   * Destino de diocese/paróquia/comunidade de um usuário editado por quem não é
   * SYSTEM_ADMIN: só vale o que MUDOU, e tem de ficar dentro do escopo do ator.
   */
  private async assertScopeChangeWithinActor(
    currentUser: any,
    targetUser: { dioceseId: string | null; parishId: string | null; communityId: string | null },
    next: { dioceseId: string | null; parishId: string | null; communityId: string | null },
  ) {
    if (currentUser.role === UserRole.SYSTEM_ADMIN) {
      return;
    }

    if (next.dioceseId !== targetUser.dioceseId) {
      const actorDioceseId = await this.resolveActorDioceseId(currentUser);
      if (!actorDioceseId || next.dioceseId !== actorDioceseId) {
        throw new ForbiddenException('Voce so pode vincular usuarios a sua diocese');
      }
    }

    if (next.parishId && next.parishId !== targetUser.parishId) {
      if (currentUser.role === UserRole.DIOCESAN_ADMIN) {
        const parish = await this.prisma.parish.findUnique({
          where: { id: next.parishId },
          select: { dioceseId: true },
        });
        if (!parish) {
          throw new BadRequestException('Paroquia nao encontrada');
        }
        if (!currentUser.dioceseId || parish.dioceseId !== currentUser.dioceseId) {
          throw new ForbiddenException('Voce so pode vincular usuarios a paroquias da sua diocese');
        }
        if (next.dioceseId && next.dioceseId !== parish.dioceseId) {
          throw new BadRequestException('A paroquia nao pertence a diocese informada');
        }
      } else if (!currentUser.parishId || next.parishId !== currentUser.parishId) {
        throw new ForbiddenException('Voce so pode vincular usuarios a sua paroquia');
      }
    }

    if (next.communityId && next.communityId !== targetUser.communityId) {
      const communities = await this.loadCommunitiesByIds([next.communityId]);
      this.assertCommunityScope(currentUser, communities);
      if (next.parishId && communities[0].parishId !== next.parishId) {
        throw new BadRequestException('A comunidade nao pertence a paroquia informada');
      }
    }
  }

  /**
   * Cadeia diocese → paróquia → comunidade de um usuário NOVO (papéis que não
   * resolvem o escopo por comunidades/pastorais): cada nível informado precisa
   * existir (404 em vez do 500 da chave estrangeira), estar no escopo do ator
   * (403) e ser coerente com os níveis acima (400). Os níveis de cima são
   * derivados do mais baixo informado.
   */
  private async resolveNewUserScope(
    currentUser: any,
    next: { dioceseId: string | null; parishId: string | null; communityId: string | null },
  ): Promise<{ dioceseId?: string; parishId?: string; communityId?: string }> {
    let { dioceseId, parishId } = next;
    const { communityId } = next;

    if (communityId) {
      const community = await this.prisma.community.findFirst({
        where: { id: communityId, deletedAt: null },
        include: { parish: true },
      });
      if (!community) {
        throw new NotFoundException('Comunidade nao encontrada');
      }
      this.assertCommunityScope(currentUser, [community]);
      if (parishId && parishId !== community.parishId) {
        throw new BadRequestException('A comunidade nao pertence a paroquia informada');
      }
      if (dioceseId && dioceseId !== community.parish.dioceseId) {
        throw new BadRequestException('A comunidade nao pertence a diocese informada');
      }
      parishId = community.parishId;
      dioceseId = community.parish.dioceseId;
    } else if (parishId) {
      const parish = await this.prisma.parish.findUnique({
        where: { id: parishId },
        select: { id: true, dioceseId: true },
      });
      if (!parish) {
        throw new NotFoundException('Paroquia nao encontrada');
      }
      if (
        currentUser.role === UserRole.DIOCESAN_ADMIN &&
        (!currentUser.dioceseId || parish.dioceseId !== currentUser.dioceseId)
      ) {
        throw new ForbiddenException('Voce so pode vincular usuarios a paroquias da sua diocese');
      }
      if (dioceseId && dioceseId !== parish.dioceseId) {
        throw new BadRequestException('A paroquia nao pertence a diocese informada');
      }
      dioceseId = parish.dioceseId;
    } else if (dioceseId && currentUser.role === UserRole.SYSTEM_ADMIN) {
      // Demais papéis já tiveram a diocese fixada na do próprio cadastro
      const diocese = await this.prisma.diocese.findUnique({
        where: { id: dioceseId },
        select: { id: true },
      });
      if (!diocese) {
        throw new NotFoundException('Diocese nao encontrada');
      }
    }

    return {
      dioceseId: dioceseId ?? undefined,
      parishId: parishId ?? undefined,
      communityId: communityId ?? undefined,
    };
  }

  /** Diocese do ator: a gravada ou, na falta (cadastros antigos), a da sua paróquia. */
  private async resolveActorDioceseId(currentUser: any): Promise<string | null> {
    if (currentUser.dioceseId) {
      return currentUser.dioceseId;
    }
    if (currentUser.role !== UserRole.DIOCESAN_ADMIN && currentUser.parishId) {
      const parish = await this.prisma.parish.findUnique({
        where: { id: currentUser.parishId },
        select: { dioceseId: true },
      });
      return parish?.dioceseId ?? null;
    }
    return null;
  }

  /**
   * Pelo PATCH /users/:id o próprio usuário (não SYSTEM_ADMIN) só muda nome,
   * e-mail e telefone. Papel, cargo, situação, escopo e vínculos são decididos
   * por um superior: reenviar o mesmo valor (o formulário do painel manda tudo)
   * é aceito; mudar é proibido.
   */
  private assertSelfUpdateKeepsProtectedFields(
    dto: UpdateUserDto,
    user: {
      role: UserRole;
      clergyTitle?: string | null;
      isActive: boolean;
      dioceseId: string | null;
      parishId: string | null;
      communityId: string | null;
    },
    activeCommunityIds: string[],
    coordinatedPastoralIds: string[],
  ) {
    const changed = (next: unknown, current: unknown) =>
      next !== undefined && (next ?? null) !== (current ?? null);
    // Escopo: null é ignorado pelo update (mantém o atual), então não conta como troca
    const changedScope = (next: unknown, current: unknown) =>
      next !== undefined && next !== null && next !== current;
    const sameSet = (next: string[], current: string[]) =>
      new Set(next).size === new Set(current).size && next.every((id) => current.includes(id));

    if (
      changed(dto.role, user.role) ||
      changed(dto.clergyTitle, user.clergyTitle) ||
      changed(dto.isActive, user.isActive) ||
      changedScope(dto.dioceseId, user.dioceseId) ||
      changedScope(dto.parishId, user.parishId) ||
      changedScope(dto.communityId, user.communityId) ||
      (dto.communityIds !== undefined && !sameSet(dto.communityIds, activeCommunityIds)) ||
      (dto.pastoralIds !== undefined && !sameSet(dto.pastoralIds, coordinatedPastoralIds))
    ) {
      throw new ForbiddenException(
        'Voce nao pode alterar o proprio papel, cargo, situacao ou vinculos — solicite a um superior',
      );
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

    // Não-destrutivo: vínculos que saíram são DESATIVADOS (leftAt) em vez de
    // apagados — preserva histórico e vínculos secundários criados pelo membro.
    const existingLinks = await tx.userCommunity.findMany({ where: { userId } });
    const nextSet = new Set(nextCommunityIds);

    const toDeactivate = existingLinks.filter(
      (link: any) => !nextSet.has(link.communityId) && link.isActive,
    );
    if (toDeactivate.length) {
      await tx.userCommunity.updateMany({
        where: { id: { in: toDeactivate.map((link: any) => link.id) } },
        data: { isActive: false, isPrimary: false, leftAt: new Date() },
      });
    }

    for (const [index, currentCommunityId] of nextCommunityIds.entries()) {
      const existing = existingLinks.find((link: any) => link.communityId === currentCommunityId);
      if (existing) {
        await tx.userCommunity.update({
          where: { id: existing.id },
          data: { role, isActive: true, isPrimary: index === 0, leftAt: null },
        });
      } else {
        await tx.userCommunity.create({
          data: {
            userId,
            communityId: currentCommunityId,
            role,
            isPrimary: index === 0,
          },
        });
      }
    }
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
        role: { in: COORDINATOR_MEMBER_ROLES },
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
        role: { in: COORDINATOR_MEMBER_ROLES },
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

      // NÃO encerra a coordenação de outras pessoas nesta pastoral: antes, editar
      // um coordenador (o painel mandava todas as participações) destituía em
      // silêncio os coordenadores vigentes. Substituir coordenador é ação
      // explícita da gestão da pastoral.
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

  /**
   * Coordenações VIGENTES do usuário (mesma regra da sessão — validateUser):
   * papel de coordenação ativo na pastoral OU registro de coordenação atual.
   */
  private async getCurrentCoordinatorPastoralIds(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        member: {
          include: {
            pastoralMemberships: {
              where: {
                isActive: true,
                role: { in: COORDINATOR_MEMBER_ROLES },
                communityPastoralId: { not: null },
              },
              select: {
                communityPastoralId: true,
                role: true,
                isActive: true,
              },
            },
            pastoralCoordinations: {
              where: { isCurrent: true, communityPastoral: { deletedAt: null } },
              select: { communityPastoralId: true },
            },
          },
        },
      },
    });

    return pickCoordinatedPastoralIds(
      user?.member?.pastoralMemberships ?? [],
      user?.member?.pastoralCoordinations ?? [],
    );
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
    // Gravado em minúsculas daqui para frente (o login ignora a caixa)
    email = normalizeEmail(email);

    // Duplicidade sem diferença de caixa: "Maria@x.com" antigo bloqueia "maria@x.com"
    const existingUser = await this.prisma.user.findFirst({
      where: { email: emailInsensitive(email) },
      select: { id: true },
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

    const currentUserLevel = this.roleHierarchy[currentUser?.role as UserRole];
    const newUserLevel = this.roleHierarchy[role];

    // Negar por padrão: papel desconhecido (de quem cria ou do novo) não passa
    if (currentUserLevel === undefined || newUserLevel === undefined || newUserLevel <= currentUserLevel) {
      throw new ForbiddenException('Voce nao pode criar usuarios de nivel superior ou igual ao seu');
    }

    if (currentUser.role === UserRole.DIOCESAN_ADMIN) {
      if (!currentUser.dioceseId) {
        throw new ForbiddenException('Seu usuario nao esta vinculado a uma diocese');
      }
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

    if (role !== UserRole.COMMUNITY_COORDINATOR && role !== UserRole.PASTORAL_COORDINATOR) {
      // Demais papéis: diocese/paróquia/comunidade do corpo eram gravadas sem
      // conferência (ex.: DIOCESAN_ADMIN criava PARISH_ADMIN em paróquia de
      // outra diocese). Resolve a cadeia a partir do nível mais baixo informado.
      ({ dioceseId, parishId, communityId } = await this.resolveNewUserScope(currentUser, {
        dioceseId: dioceseId || null,
        parishId: parishId || null,
        communityId: communityId || null,
      }));
    }

    // Mesma régua do update: o destino inteiro fica dentro do escopo do ator
    await this.assertScopeChangeWithinActor(
      currentUser,
      { dioceseId: null, parishId: null, communityId: null },
      { dioceseId: dioceseId ?? null, parishId: parishId ?? null, communityId: communityId ?? null },
    );

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
        select: this.getUserSelect(),
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
        select: this.getUserSelect(),
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
    // Negar por padrão: sem a âncora do escopo (diocese/paróquia/comunidade) a
    // lista é vazia — antes um filtro `undefined` virava "todos os usuários"
    const lowerThanCoordinator = {
      in: [
        UserRole.COMMUNITY_COORDINATOR,
        UserRole.PASTORAL_COORDINATOR,
        UserRole.VOLUNTEER,
        UserRole.FAITHFUL,
      ],
    };
    let where: any;

    switch (currentUser?.role) {
      case UserRole.SYSTEM_ADMIN:
        where = {};
        break;
      case UserRole.DIOCESAN_ADMIN:
        if (!currentUser.dioceseId) return [];
        where = { dioceseId: currentUser.dioceseId };
        break;
      case UserRole.PARISH_ADMIN:
        if (!currentUser.parishId) return [];
        where = { parishId: currentUser.parishId };
        break;
      case UserRole.COMMUNITY_COORDINATOR:
        if (currentUser.communityId) {
          where = {
            communities: {
              some: {
                communityId: currentUser.communityId,
                isActive: true,
              },
            },
            role: lowerThanCoordinator,
          };
        } else if (currentUser.parishId) {
          where = { parishId: currentUser.parishId, role: lowerThanCoordinator };
        } else {
          return [];
        }
        break;
      default:
        // Negar por padrão (coordenador de pastoral, voluntário, fiel, papel desconhecido)
        throw new ForbiddenException(
          'Somente a administração (diocese/paróquia) e a coordenação de comunidade listam usuários',
        );
    }

    const users = await this.prisma.user.findMany({
      // Contas removidas pela gestão (anonimizadas) não aparecem mais na lista
      where: { ...where, anonymizedAt: null },
      select: this.getUserSelect(),
      orderBy: {
        createdAt: 'desc',
      },
    });

    return users.map((user) => this.serializeUser(user));
  }

  /**
   * GET /users/:id — só o próprio usuário ou um gestor com escopo sobre ele
   * (papel estritamente inferior). Fiel, voluntário e coordenador de pastoral
   * não leem terceiros (achado A11).
   */
  async findOne(id: string, currentUser: any) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: this.getUserSelect(),
    });

    if (!user) {
      throw new NotFoundException(`Usuario com ID ${id} nao encontrado`);
    }

    this.assertUserScope(currentUser, user, { allowSelf: true });

    return this.serializeUser(user);
  }

  /**
   * GET /users/me — dados do próprio usuário. Para gestor sem comunidade de
   * escopo, `communityId`/`community` trazem a comunidade de FÉ escolhida no
   * app (ver presentSelf) — sem isso o app reabre o assistente de comunidade.
   */
  async findMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: this.getUserSelect(),
    });

    if (!user) {
      throw new NotFoundException(`Usuario com ID ${userId} nao encontrado`);
    }

    return this.presentSelf(user);
  }

  /** Papéis cujo escopo administrativo NÃO muda pelo autoatendimento (tudo acima de VOLUNTEER). */
  private static readonly SELF_SERVICE_COMMUNITY_ROLES: UserRole[] = [UserRole.FAITHFUL, UserRole.VOLUNTEER];

  private isManagementRole(role: UserRole) {
    return !UsersService.SELF_SERVICE_COMMUNITY_ROLES.includes(role);
  }

  /**
   * Visão do PRÓPRIO usuário. O gestor (papel acima de VOLUNTEER) sem comunidade
   * de escopo (User.communityId nulo — ex.: PARISH_ADMIN, DIOCESAN_ADMIN) recebe
   * em `communityId`/`community` a sua comunidade de fé (vínculo principal), só
   * para exibição: o app usa `communityId` para sair do assistente. O escopo real
   * (JwtStrategy/HierarchyService) continua lido do banco e não muda. O campo
   * `scopeCommunityId` traz sempre o valor gravado.
   */
  private async presentSelf(user: any) {
    const serialized: any = this.serializeUser(user);
    serialized.scopeCommunityId = user.communityId ?? null;
    // Aceite dos termos vigentes (M3/M4): app e painel mostram o aviso bloqueante
    serialized.termsAcceptanceRequired = isTermsAcceptanceRequired(user);
    serialized.termsVersion = TERMS_VERSION;

    if (!user.communityId && this.isManagementRole(user.role)) {
      const links: any[] = user.communities ?? [];
      const faithLink = links.find((link) => link.isPrimary) ?? links[0] ?? null;
      const faithCommunityId: string | null = faithLink?.communityId ?? user.member?.communityId ?? null;
      if (faithCommunityId) {
        serialized.communityId = faithCommunityId;
        serialized.community =
          faithLink?.community ??
          (await this.prisma.community.findUnique({
            where: { id: faithCommunityId },
            select: { id: true, name: true },
          }));
      }
    }

    return serialized;
  }

  async update(id: string, updateUserDto: UpdateUserDto, currentUser: any) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        member: {
          include: {
            // Participações ativas — para distinguir "reenviou as participações"
            // de "mudou a coordenação" (coordenador de pastoral)
            pastoralMemberships: {
              where: { isActive: true, communityPastoralId: { not: null } },
              select: { communityPastoralId: true },
            },
          },
        },
        communities: { where: { isActive: true }, select: { communityId: true } },
      },
    });

    // Conta removida pela gestão (anonimizada) não volta a ser editada (M34)
    if (!user || user.anonymizedAt) {
      throw new NotFoundException(`Usuario com ID ${id} nao encontrado`);
    }

    // Alvo: o próprio usuário ou alguém de papel estritamente inferior no escopo (C2)
    this.assertUserScope(currentUser, user, { allowSelf: true });

    const isSystemAdmin = currentUser.role === UserRole.SYSTEM_ADMIN;
    const isSelf = currentUser.id === id;

    if (isSelf && !isSystemAdmin) {
      this.assertSelfUpdateKeepsProtectedFields(
        updateUserDto,
        user,
        user.communities.map((link) => link.communityId),
        await this.getCurrentCoordinatorPastoralIds(id),
      );
      return this.updateOwnBasicData(id, user, updateUserDto, currentUser);
    }

    const {
      password: _password,
      communityIds: rawCommunityIds,
      pastoralIds,
      consentGiven,
      ...updateData
    } = updateUserDto;
    let communityIds = rawCommunityIds;

    // Troca de e-mail: grava em minúsculas e confere duplicidade sem diferença de caixa
    if (updateData.email !== undefined) {
      const nextEmail = normalizeEmail(updateData.email);
      if (nextEmail === user.email.toLowerCase()) {
        // Mesmo e-mail (no máximo muda a caixa): não é troca — mantém o gravado
        // e não esbarra numa conta antiga que difere só na caixa
        delete updateData.email;
      } else {
        const existingEmail = await this.prisma.user.findFirst({
          where: { email: emailInsensitive(nextEmail), id: { not: id } },
          select: { id: true },
        });

        if (existingEmail) {
          throw new ConflictException('Email ja esta em uso');
        }
        updateData.email = nextEmail;
      }
    }

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

    // Só atribui papel ESTRITAMENTE abaixo do próprio (o create já fazia isso; o update não)
    if (!isSystemAdmin) {
      const actorLevel = this.roleHierarchy[currentUser.role as UserRole];
      const nextLevel = this.roleHierarchy[nextRole];
      if (actorLevel === undefined || nextLevel === undefined || nextLevel <= actorLevel) {
        throw new ForbiddenException('Voce so pode atribuir papeis abaixo do seu');
      }
    }

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
    // Coordenação só é sincronizada quando MUDA de verdade em relação às
    // coordenações vigentes. O painel antigo inicializava o formulário com
    // TODAS as participações (pastoralIds): reenviá-las sem mexer promovia cada
    // participação a coordenação — agora vale como "sem mudança".
    let coordinationChanged = true;
    if (nextRole === UserRole.PASTORAL_COORDINATOR) {
      const currentCoordinated = await this.getCurrentCoordinatorPastoralIds(id);
      const participations: string[] = (user.member?.pastoralMemberships ?? [])
        .map((membership: any) => membership.communityPastoralId)
        .filter((pastoralId: string | null): pastoralId is string => !!pastoralId);
      const sameSet = (a: string[], b: string[]) =>
        new Set(a).size === new Set(b).size && a.every((pastoralId) => b.includes(pastoralId));

      if (!resolvedPastoralIds.length) {
        resolvedPastoralIds = currentCoordinated;
      }
      if (
        user.role === UserRole.PASTORAL_COORDINATOR &&
        currentCoordinated.length > 0 &&
        (sameSet(resolvedPastoralIds, currentCoordinated) || sameSet(resolvedPastoralIds, participations))
      ) {
        resolvedPastoralIds = currentCoordinated;
        coordinationChanged = false;
      }
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

    // Destino (diocese/paróquia/comunidade) dentro do escopo do ator — inclusive
    // dioceseId/parishId enviados soltos, que antes iam direto para o banco (C2)
    await this.assertScopeChangeWithinActor(currentUser, user, {
      dioceseId: nextDioceseId ?? null,
      parishId: nextParishId ?? null,
      communityId: nextCommunityId ?? null,
    });

    if (nextRole !== user.role) {
      if (nextRole === UserRole.DIOCESAN_ADMIN && !nextDioceseId) {
        throw new BadRequestException('DIOCESAN_ADMIN deve ter uma diocese vinculada');
      }
      if (nextRole === UserRole.PARISH_ADMIN && (!nextDioceseId || !nextParishId)) {
        throw new BadRequestException('PARISH_ADMIN deve ter uma diocese e paroquia vinculadas');
      }
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
        select: this.getUserSelect(),
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
        if (!coordinationChanged) {
          // Coordenação intacta: nenhuma promoção nem destituição
          return tx.user.findUnique({ where: { id }, select: this.getUserSelect() });
        }
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
        select: this.getUserSelect(),
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

  /**
   * Edição dos próprios dados básicos (nome, e-mail, telefone) pelo PATCH
   * /users/:id — sem tocar em papel, escopo, vínculos ou pastorais. E-mail e
   * telefone já foram normalizados e conferidos contra duplicidade.
   */
  private async updateOwnBasicData(id: string, user: any, dto: UpdateUserDto, currentUser: any) {
    const data: { name?: string; email?: string; phone?: string | null } = {};
    if (dto.name !== undefined) data.name = dto.name;

    if (dto.email !== undefined) {
      const nextEmail = normalizeEmail(dto.email);
      if (nextEmail !== user.email.toLowerCase()) {
        const existingEmail = await this.prisma.user.findFirst({
          where: { email: emailInsensitive(nextEmail), id: { not: id } },
          select: { id: true },
        });
        if (existingEmail) {
          throw new ConflictException('Email ja esta em uso');
        }
        data.email = nextEmail;
      }
    }

    const phone = this.normalizeOptionalPhone(dto.phone);
    if (phone !== undefined) {
      if (phone) {
        const existingPhone = await this.prisma.user.findUnique({
          where: { phone },
          select: { id: true },
        });
        if (existingPhone && existingPhone.id !== id) {
          throw new ConflictException('Telefone ja esta em uso por outro usuario');
        }
      }
      data.phone = phone;
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      select: this.getUserSelect(),
    });

    await this.auditService.log({
      actor: { id: currentUser.id, email: currentUser.email, role: currentUser.role },
      action: 'UPDATE',
      entity: 'User',
      entityId: id,
      metadata: { changedFields: Object.keys(data), selfService: true },
    });

    return this.serializeUser(updated);
  }

  /**
   * DELETE /users/:id pela gestão (M34): só sobre papel ESTRITAMENTE inferior
   * e no escopo — nunca a própria conta (essa sai por DELETE /users/me) nem um
   * par. Não apaga o registro: a conta é DESATIVADA e ANONIMIZADA (e-mail,
   * nome, telefone, senha, 2FA e push substituídos), as sessões caem e os
   * vínculos de comunidade se encerram. O cadastro de membro fica com a
   * paróquia (desligado da conta): apagá-lo ou anonimizá-lo é decisão da tela
   * de Membros.
   */
  async remove(id: string, currentUser: any) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, dioceseId: true, parishId: true, communityId: true, anonymizedAt: true },
    });

    if (!user || user.anonymizedAt) {
      throw new NotFoundException(`Usuario com ID ${id} nao encontrado`);
    }

    // Revisão #28: o assertUserScope libera tudo ao SYSTEM_ADMIN — mas nem
    // ele anonimiza a si mesmo (isso é DELETE /users/me, com senha) nem um par
    if (currentUser?.role === UserRole.SYSTEM_ADMIN) {
      if (currentUser.id === user.id) {
        throw new ForbiddenException('Para excluir a sua própria conta, use "Meus dados" (exige a senha)');
      }
      if (user.role === UserRole.SYSTEM_ADMIN) {
        throw new ForbiddenException('Um administrador do sistema não remove outro administrador do sistema');
      }
    }

    // Próprio usuário: DELETE /users/me. Par ou superior: nunca (C2/M34)
    this.assertUserScope(currentUser, user);

    await this.prisma.$transaction(async (tx) => {
      await this.anonymizeUserAccount(tx, id);
      // Cadastro de membro fica com a paróquia, sem a conta
      await tx.member.updateMany({ where: { userId: id }, data: { userId: null } });
    });

    await this.auditService.log({
      actor: { id: currentUser.id, email: currentUser.email, role: currentUser.role },
      action: 'ANONYMIZE',
      entity: 'User',
      entityId: id,
      before: { role: user.role },
      metadata: { removedByManagement: true },
    });
    // Registros anteriores perdem o e-mail e os dados pessoais (M49)
    await this.auditService.pseudonymizeSubject({ userId: id, email: user.email });

    return { message: 'Usuario excluido com sucesso' };
  }

  /**
   * Substitui os dados pessoais da conta e a desativa (sem apagar o registro:
   * escalas respondidas, mensagens e auditoria continuam apontando para o id).
   * Encerra sessões, vínculos de comunidade, push, notificações e favoritos.
   */
  private async anonymizeUserAccount(tx: Prisma.TransactionClient, userId: string) {
    // Revogação sob a trava da linha (#39): refresh em andamento não sobrevive
    await lockUserRow(tx, userId);
    const now = new Date();
    await tx.user.update({
      where: { id: userId },
      data: {
        name: 'Usuário removido',
        email: `removido-${userId}@usuario-removido.invalid`,
        phone: null,
        // Senha aleatória descartada: ninguém mais entra nesta conta
        password: await bcrypt.hash(randomBytes(24).toString('base64url'), 10),
        isActive: false,
        anonymizedAt: now,
        forcePasswordChange: false,
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorEnabledAt: null,
        twoFactorLastStep: null,
        twoFactorBackupCodes: [],
        twoFactorSetupAt: null,
        pushToken: null,
        pushTokenUpdatedAt: null,
        // Access tokens já emitidos deixam de valer (`iat` truncado ao segundo)
        sessionsRevokedAt: new Date(Math.floor(now.getTime() / 1000) * 1000),
      },
    });
    await tx.refreshToken.deleteMany({ where: { userId } });
    await tx.passwordResetToken.deleteMany({ where: { userId } });
    await tx.userDevice.deleteMany({ where: { userId } });
    await tx.userAvatar.deleteMany({ where: { userId } });
    await tx.eventFavorite.deleteMany({ where: { userId } });
    await tx.massScheduleFavorite.deleteMany({ where: { userId } });
    // notifications.userId não tem FK: sem isto o histórico pessoal ficava (B36)
    await tx.notification.deleteMany({ where: { userId } });
    await tx.userCommunity.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false, isPrimary: false, leftAt: now },
    });
  }

  /**
   * Exclusão da própria conta (autoatendimento) — exigida pela App Store
   * (5.1.1(v)) e direito de eliminação da LGPD (art. 18 VI).
   *
   * Reautenticação (revisão #25/#43): exige a senha atual — com só o access
   * token na mão (aparelho destravado, token vazado) ninguém apaga a conta de
   * outra pessoa. O app 1.1.0 não manda a senha: sem ela, só vale um login
   * com senha de até 5 min nesta sessão (claim `at`). Falhas de senha contam
   * no freio da conta (#42).
   *
   * Trava (409): o último SYSTEM_ADMIN ativo da plataforma e o último
   * PARISH_ADMIN ativo da paróquia não se excluem — a paróquia ficaria sem
   * ninguém para administrar. Checado sob advisory lock (dois "últimos"
   * excluindo ao mesmo tempo não passam os dois).
   *
   * ANONIMIZA o perfil de membro pela mesma rotina da gestão (M16): campos
   * pessoais, vínculos de pastoral e de comunidade, escalas futuras,
   * consentimentos e documentos da catequese. O histórico paroquial passado
   * fica, sem identificar a pessoa. Depois:
   * - conta SEM mensagens assinadas: removida definitivamente (o cascade
   *   revoga sessões, favoritos, aparelhos, foto e vínculos de comunidade);
   * - conta que assinou mensagem do clero (ClergyMessage.sender) ou da
   *   catequese (CatechesisMessage.author): ANONIMIZADA no lugar, como na
   *   remoção pela gestão. Essas FKs são onDelete: Cascade e o delete apagaria
   *   a mensagem do pároco à comunidade e a conversa da família com a equipe
   *   (#25). O autor passa a aparecer como "Usuário removido".
   * Por fim, a auditoria ligada a ela é pseudonimizada (M49/#26).
   */
  async deleteOwnAccount(userId: string, reauth: AccountDeletionReauth = {}) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, parishId: true, isActive: true, member: { select: { id: true } } },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    await this.assertAccountDeletionReauth(userId, reauth);

    let anonymizedInPlace = false;
    await this.prisma.$transaction(async (tx) => {
      await this.assertNotLastAdmin(tx, user);

      // O vínculo user↔member é SetNull no delete: sem isto o membro ficaria
      // órfão com os dados pessoais
      if (user.member) {
        await this.membersService.anonymizePersonalData(tx, user.member.id, { label: 'Membro removido' });
      }

      const [clergyMessages, catechesisMessages] = await Promise.all([
        tx.clergyMessage.count({ where: { senderUserId: userId } }),
        tx.catechesisMessage.count({ where: { authorUserId: userId } }),
      ]);
      if (clergyMessages + catechesisMessages > 0) {
        // Preserva as mensagens (sem cascata): conta anonimizada no lugar
        anonymizedInPlace = true;
        await this.anonymizeUserAccount(tx, userId);
        await tx.member.updateMany({ where: { userId }, data: { userId: null } });
        return;
      }

      await tx.notification.deleteMany({ where: { userId } });

      // Exclusão definitiva do usuário (cascade cuida do restante)
      await tx.user.delete({ where: { id: userId } });
    });
    // Dízimo automático: o provedor só é chamado com a transação confirmada
    if (user.member) {
      void this.membersService.cancelTitheAtProviderAfterCommit(user.member.id);
    }

    await this.auditService.log({
      actor: { id: user.id, role: user.role },
      action: anonymizedInPlace ? 'ANONYMIZE' : 'DELETE',
      entity: 'User',
      entityId: userId,
      before: { role: user.role },
      metadata: {
        selfService: true,
        memberAnonymized: !!user.member,
        ...(anonymizedInPlace ? { accountAnonymizedInPlace: true, reason: 'signed-messages' } : {}),
        reauth: reauth.password ? 'password' : 'recent-login',
      },
    });
    await this.auditService.pseudonymizeSubject({
      userId,
      memberId: user.member?.id ?? null,
      email: user.email,
    });

    return { deleted: true };
  }

  /** Senha atual, ou login com senha de até 5 min (app 1.1.0, que não manda a senha). */
  private async assertAccountDeletionReauth(userId: string, reauth: AccountDeletionReauth) {
    if (reauth.password) {
      if (this.security) return this.security.assertPassword(userId, reauth.password, { ip: reauth.ip ?? null });
      // Sem o serviço de sessão (montagem parcial em spec): confere direto, sem o freio
      const row = await this.prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
      if (!row || !(await bcrypt.compare(String(reauth.password), row.password))) {
        throw new BadRequestException('Senha atual incorreta');
      }
      return;
    }
    const at = typeof reauth.authTime === 'number' ? reauth.authTime * 1000 : 0;
    if (at && Date.now() - at <= ACCOUNT_DELETION_RECENT_AUTH_MS) return;
    throw new BadRequestException(
      'Por segurança, confirme a sua senha atual para excluir a conta. No app, saia, entre de novo e exclua em seguida.',
    );
  }

  /**
   * 409 ao excluir o último SYSTEM_ADMIN ativo ou o último PARISH_ADMIN
   * ativo da paróquia (#25). Advisory lock por escopo: duas exclusões
   * simultâneas não contam uma à outra como "o outro administrador".
   */
  private async assertNotLastAdmin(
    tx: Prisma.TransactionClient,
    user: { id: string; role: UserRole; parishId?: string | null; isActive?: boolean },
  ) {
    if (user.isActive === false) return;
    let scope: Prisma.UserWhereInput | null = null;
    let lockKey = '';
    let message = '';
    if (user.role === UserRole.SYSTEM_ADMIN) {
      scope = { role: UserRole.SYSTEM_ADMIN };
      lockKey = 'parish:last-admin:system';
      message = 'Você é o único administrador do sistema ativo — promova outra pessoa antes de excluir a sua conta';
    } else if (user.role === UserRole.PARISH_ADMIN && user.parishId) {
      scope = { role: UserRole.PARISH_ADMIN, parishId: user.parishId };
      lockKey = `parish:last-admin:parish:${user.parishId}`;
      message =
        'Você é o único administrador ativo da paróquia — peça à diocese (ou cadastre) outro administrador paroquial antes de excluir a sua conta';
    }
    if (!scope) return;
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))::text`;
    const others = await tx.user.count({
      where: { ...scope, id: { not: user.id }, isActive: true, anonymizedAt: null },
    });
    if (others === 0) throw new ConflictException(message);
  }

  /**
   * POST /users/me/accept-terms — grava o aceite dos termos/política vigentes
   * (M3/M4). `version`, quando enviada, tem de ser a vigente: cliente que
   * mostrou um texto antigo não registra aceite da versão nova.
   */
  async acceptTerms(userId: string, version?: string) {
    if (version !== undefined && version !== TERMS_VERSION) {
      throw new BadRequestException(
        'Os termos foram atualizados — recarregue a tela para ver a versão vigente',
      );
    }

    const acceptedAt = new Date();
    await this.prisma.user.update({
      where: { id: userId },
      data: { acceptedTermsAt: acceptedAt, acceptedTermsVersion: TERMS_VERSION },
      select: { id: true },
    });

    await this.auditService.log({
      actor: { id: userId },
      action: 'CONSENT_CHANGE',
      entity: 'User',
      entityId: userId,
      metadata: { termsAccepted: true, termsVersion: TERMS_VERSION },
    });

    return { acceptedTermsAt: acceptedAt, acceptedTermsVersion: TERMS_VERSION, termsAcceptanceRequired: false };
  }

  async changePassword(id: string, changePasswordDto: ChangePasswordDto, currentUser: any) {
    if (currentUser.id !== id && currentUser.role !== UserRole.SYSTEM_ADMIN) {
      throw new ForbiddenException('Voce so pode trocar sua propria senha');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      omit: { password: false }, // o hash é omitido globalmente; aqui ele é conferido
    });

    if (!user) {
      throw new NotFoundException(`Usuario com ID ${id} nao encontrado`);
    }

    const isPasswordValid = await bcrypt.compare(changePasswordDto.currentPassword, user.password);

    if (!isPasswordValid) {
      throw new BadRequestException('Senha atual incorreta');
    }

    // Troca obrigatória (senha definida pela gestão): repetir a mesma não resolve nada
    if (changePasswordDto.newPassword === changePasswordDto.currentPassword) {
      throw new BadRequestException('A nova senha precisa ser diferente da atual');
    }

    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    // As sessões dos OUTROS aparelhos acabam. A deste aparelho fica: o access
    // token dele é recusado na próxima requisição e o refresh (mantido) emite
    // um novo sem pedir login. Token sem sessão (antigo) ou troca feita pelo
    // SYSTEM_ADMIN em outra conta: todas as sessões caem.
    const keepSessionId: string | null = currentUser.id === id && currentUser.sessionId ? currentUser.sessionId : null;
    // Sob a trava da linha do usuário (#39): um refresh de outro aparelho em
    // andamento não grava o token novo depois da revogação
    await this.prisma.$transaction(async (tx) => {
      await lockUserRow(tx, id);
      await tx.user.update({
        where: { id },
        data: {
          password: hashedPassword,
          forcePasswordChange: false,
          // Access tokens já emitidos caem na hora (B46), inclusive os de quem
          // conhecia a senha antiga. Truncado ao segundo, como o `iat`.
          sessionsRevokedAt: new Date(Math.floor(Date.now() / 1000) * 1000),
        },
      });
      await tx.refreshToken.deleteMany({
        where: keepSessionId
          ? { userId: id, OR: [{ sessionId: null }, { sessionId: { not: keepSessionId } }] }
          : { userId: id },
      });
    });

    await this.auditService.log({
      actor: { id: currentUser.id, email: currentUser.email, role: currentUser.role },
      action: 'PASSWORD_CHANGE',
      entity: 'User',
      entityId: id,
      metadata: { otherSessionsRevoked: true, keptCurrentSession: !!keepSessionId },
    });

    return { message: 'Senha alterada com sucesso', sessionsRevoked: true, keptCurrentSession: !!keepSessionId };
  }

  async updateMyCommunity(userId: string, communityId: string, consentGiven?: boolean) {
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
      include: {
        parish: true,
      },
    });

    if (!community || community.deletedAt) {
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

    // SEGURANÇA (C3): papéis de gestão nunca mudam o PRÓPRIO escopo por aqui —
    // User.dioceseId/parishId/communityId definem o que administram (membros,
    // usuários, finanças). Gravam só o vínculo de fé; a troca de escopo é feita
    // por um superior via /users.
    if (this.isManagementRole(currentUser.role)) {
      return this.updateManagerFaithCommunity(currentUser, community, consentGiven);
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

      // Não-destrutivo: a comunidade anterior permanece como vínculo secundário
      const activeLinks = await tx.userCommunity.findMany({
        where: { userId, isActive: true },
        select: { communityId: true },
      });
      const nextCommunityIds = [
        communityId,
        ...activeLinks
          .map((link: any) => link.communityId)
          .filter((id: string) => id !== communityId),
      ];
      await this.syncUserCommunities(tx, userId, currentUser.role, nextCommunityIds, communityId);

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
        select: this.getUserSelect(),
      });
    });

    // Funil de crescimento: primeira escolha de comunidade ou troca (nunca lança)
    await this.auditService.log({
      actor: { id: currentUser.id, email: currentUser.email, role: currentUser.role },
      action: 'COMMUNITY_JOIN',
      entity: 'User',
      entityId: userId,
      metadata: {
        communityId,
        first: !currentUser.communityId,
        previousCommunityId: currentUser.communityId ?? null,
      },
    });

    return this.presentSelf(updatedUser);
  }


  /**
   * Comunidade de FÉ de um gestor (papel acima de VOLUNTEER), sem tocar em
   * role/dioceseId/parishId/communityId do usuário (C3). O app obriga quem não
   * tem comunidade a passar pelo assistente — por isso responde 200 em vez de
   * erro, e a resposta (presentSelf) traz a comunidade escolhida em `communityId`.
   * - Coordenador de comunidade/pastoral: o vínculo de fé é o perfil de membro.
   *   UserCommunity NÃO é gravado: para eles um vínculo ativo vale como escopo de
   *   coordenação (painel, finanças, dízimo, pedidos de oração).
   * - SYSTEM/DIOCESAN/PARISH_ADMIN: sem perfil de membro; o vínculo de fé é o
   *   UserCommunity principal com papel FAITHFUL (nunca o papel de gestão — o
   *   HierarchyService não o conta como escopo). Só gravado com a âncora do
   *   escopo preenchida (sem paróquia/diocese, módulos caem nos vínculos).
   */
  private async updateManagerFaithCommunity(currentUser: any, community: any, consentGiven?: boolean) {
    const userId = currentUser.id;
    const communityId = community.id;

    // Já tem comunidade de escopo e pediu outra: segue proibido (comportamento anterior)
    if (currentUser.communityId && currentUser.communityId !== communityId) {
      throw new ForbiddenException(
        'Papéis de gestão não trocam a própria comunidade manualmente — solicite a um administrador',
      );
    }

    const isCoordinator =
      currentUser.role === UserRole.COMMUNITY_COORDINATOR ||
      currentUser.role === UserRole.PASTORAL_COORDINATOR;
    const hasScopeAnchor =
      currentUser.role === UserRole.SYSTEM_ADMIN ||
      (currentUser.role === UserRole.DIOCESAN_ADMIN && !!currentUser.dioceseId) ||
      (currentUser.role === UserRole.PARISH_ADMIN && !!currentUser.parishId);

    // Não move o perfil de quem já tem comunidade principal noutra (as
    // pastorais coordenadas ficam lá — mesma regra do módulo de membros).
    // Antes respondia 200 sem gravar nada ("Tornar principal" parecia funcionar).
    const memberCommunityId = currentUser.member?.communityId ?? null;
    if (isCoordinator && memberCommunityId && memberCommunityId !== communityId) {
      throw new ConflictException(
        'Quem coordena tem a comunidade principal definida pela administração — peça a troca a um administrador. Para participar de outra comunidade, adicione-a como vínculo secundário.',
      );
    }

    let persisted = false;
    await this.prisma.$transaction(async (tx) => {
      if (isCoordinator) {
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
        persisted = true;
        return;
      }

      if (!hasScopeAnchor) {
        return;
      }

      // Não-destrutivo: os demais vínculos continuam, só deixam de ser o principal.
      // O vínculo é gravado com papel FAITHFUL — é de FÉ, não de gestão: com o
      // papel do admin ele parecia escopo (isCommunityInScope o aceitava e o
      // PARISH_ADMIN passava a escrever em comunidade de outra paróquia).
      await tx.userCommunity.updateMany({
        where: { userId, isPrimary: true, communityId: { not: communityId } },
        data: { isPrimary: false },
      });
      await tx.userCommunity.upsert({
        where: { userId_communityId: { userId, communityId } },
        create: { userId, communityId, role: UserRole.FAITHFUL, isPrimary: true },
        update: { role: UserRole.FAITHFUL, isActive: true, isPrimary: true, leftAt: null },
      });
      persisted = true;
    });

    await this.auditService.log({
      actor: { id: currentUser.id, email: currentUser.email, role: currentUser.role },
      action: 'COMMUNITY_JOIN',
      entity: 'User',
      entityId: userId,
      metadata: {
        communityId,
        faithLinkOnly: true,
        persisted,
        first: !currentUser.communityId,
        previousCommunityId: currentUser.communityId ?? null,
      },
    });

    const updatedUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: this.getUserSelect(),
    });
    const presented = await this.presentSelf(updatedUser);

    // Sem gravação (conta de administração sem âncora de escopo):
    // a resposta ainda leva a escolha, para o app não prender o usuário no assistente
    if (!presented.communityId) {
      presented.communityId = communityId;
      presented.community = { id: communityId, name: community.name };
    }

    return presented;
  }

  async resetPassword(id: string, currentUser: any) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user || user.anonymizedAt) {
      throw new NotFoundException(`Usuario com ID ${id} nao encontrado`);
    }

    // Só sobre papel ESTRITAMENTE inferior e no escopo: reset entre pares
    // entregaria a senha temporária do colega (tomada de conta — C2)
    this.assertUserScope(currentUser, user);

    const tempPassword = randomBytes(6).toString('base64url') + 'Aa1!';
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    await this.prisma.$transaction(async (tx) => {
      // Trava da linha (#39): refresh em andamento não sobrevive à redefinição
      await lockUserRow(tx, id);
      await tx.user.update({
        where: { id },
        data: {
          password: hashedPassword,
          forcePasswordChange: true,
          // Senha redefinida pela administração: toda sessão anterior cai na hora
          // (`iat` truncado ao segundo — ver JwtStrategy)
          sessionsRevokedAt: new Date(Math.floor(Date.now() / 1000) * 1000),
        },
      });
      await tx.refreshToken.deleteMany({ where: { userId: id } });
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

  // ===== FOTO DE PERFIL =====

  private static readonly AVATAR_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

  async setMyAvatar(userId: string, file: { mimetype?: string; buffer?: Buffer } | undefined) {
    if (!file?.buffer?.length) throw new BadRequestException('Envie a foto (JPG, PNG ou WebP)');
    if (!UsersService.AVATAR_MIME_TYPES.has(file.mimetype ?? '')) {
      throw new BadRequestException('Formato não aceito — envie JPG, PNG ou WebP');
    }
    const avatar = await this.prisma.userAvatar.upsert({
      where: { userId },
      create: { userId, mimeType: file.mimetype!, data: new Uint8Array(file.buffer) },
      update: { mimeType: file.mimetype!, data: new Uint8Array(file.buffer) },
      select: { updatedAt: true },
    });
    return { updatedAt: avatar.updatedAt };
  }

  async removeMyAvatar(userId: string) {
    await this.prisma.userAvatar.deleteMany({ where: { userId } });
    return { removed: true };
  }

  async getAvatarFile(userId: string) {
    const avatar = await this.prisma.userAvatar.findUnique({
      where: { userId },
      select: { mimeType: true, data: true },
    });
    if (!avatar) throw new NotFoundException('Sem foto de perfil');
    return { mimeType: avatar.mimeType, buffer: Buffer.from(avatar.data) };
  }
}
