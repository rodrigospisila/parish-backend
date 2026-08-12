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
import { UpdateMemberAvailabilityDto } from './dto/update-member-availability.dto';
import { MemberStatus, Prisma, UserRole } from '@prisma/client';
import { HierarchyService, CurrentUser } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';

/**
 * Roles que representam "pessoas da congregação" e por isso ganham um Member
 * automaticamente quando o User correspondente tem uma comunidade definida.
 * Papeis puramente administrativos (SYSTEM_ADMIN, DIOCESAN_ADMIN, PARISH_ADMIN)
 * ficam de fora propositalmente.
 */
export const MEMBER_ELIGIBLE_ROLES: UserRole[] = [
  UserRole.COMMUNITY_COORDINATOR,
  UserRole.PASTORAL_COORDINATOR,
  UserRole.VOLUNTEER,
  UserRole.FAITHFUL,
];

export interface EnsureProfileForUserParams {
  userId: string;
  role: UserRole;
  name: string;
  email: string;
  phone?: string | null;
  communityId?: string | null;
  consentGiven?: boolean;
}

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
    private readonly auditService: AuditService,
  ) {}

  private auditActor(currentUser?: CurrentUser) {
    return currentUser
      ? { id: currentUser.id, email: currentUser.email, role: currentUser.role }
      : null;
  }

  /**
   * Garante que o usuário atual pode acessar os dados deste membro:
   * o próprio titular (member.userId), SYSTEM_ADMIN, ou gestor com escopo
   * hierárquico (canManageMember). Lança 403 caso contrário.
   */
  private async assertMemberAccess(
    currentUser: CurrentUser,
    member: { id: string; userId?: string | null },
    message = 'Você não tem permissão para acessar os dados deste membro',
  ): Promise<{ isSelf: boolean }> {
    const isSelf = !!member.userId && member.userId === currentUser.id;

    if (isSelf || currentUser.role === UserRole.SYSTEM_ADMIN) {
      return { isSelf };
    }

    const canManage = await this.hierarchyService.canManageMember(currentUser.id, member.id);
    if (!canManage) {
      throw new ForbiddenException(message);
    }

    return { isSelf };
  }

  private normalizeOptionalString(value?: string | null) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private normalizeCpf(value?: string | null) {
    const normalized = this.normalizeOptionalString(value);
    if (!normalized) {
      return null;
    }

    const digits = normalized.replace(/\D/g, '');
    return digits || null;
  }

  private normalizeEmail(value?: string | null) {
    const normalized = this.normalizeOptionalString(value);
    return normalized ? normalized.toLowerCase() : null;
  }

  private handleUniqueConstraint(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = Array.isArray(error.meta?.target) ? error.meta.target : [];

      if (target.includes('cpf')) {
        throw new ConflictException('CPF ja cadastrado');
      }

      if (target.includes('email')) {
        throw new ConflictException('Email ja cadastrado');
      }

      throw new ConflictException('Ja existe um membro com um dos dados unicos informados');
    }

    throw error;
  }

  private sanitizeAvailabilityPayload(payload: UpdateMemberAvailabilityDto) {
    const rules = (payload.rules || []).map((rule) => ({
      dayOfWeek: Number(rule.dayOfWeek),
      startMinutes: Number(rule.startMinutes),
      endMinutes: Number(rule.endMinutes),
      isActive: rule.isActive ?? true,
      notes: rule.notes?.trim() || null,
    }));
    const exceptions = (payload.exceptions || []).map((item) => ({
      startDate: new Date(item.startDate),
      endDate: new Date(item.endDate),
      notes: item.notes?.trim() || null,
    }));

    for (const rule of rules) {
      if (rule.endMinutes <= rule.startMinutes) {
        throw new BadRequestException('A disponibilidade semanal precisa ter horario final maior que o inicial');
      }
    }

    for (const item of exceptions) {
      if (Number.isNaN(item.startDate.getTime()) || Number.isNaN(item.endDate.getTime())) {
        throw new BadRequestException('Periodo de indisponibilidade invalido');
      }

      if (item.endDate.getTime() <= item.startDate.getTime()) {
        throw new BadRequestException('O periodo de indisponibilidade precisa terminar apos o inicio');
      }
    }

    return { rules, exceptions };
  }

  private async resolveMemberFromUser(userId: string) {
    return this.prisma.member.findFirst({
      where: { userId, deletedAt: null },
      select: {
        id: true,
        fullName: true,
        communityId: true,
      },
    });
  }

  /**
   * Garante o perfil de Member de um User, chamado a partir de Auth/Users sempre que
   * uma conta e criada/atualizada com uma comunidade definida.
   *
   * Regras (ver docs da decisao em PARISH - User vs Member):
   * - Só cria/sincroniza para roles em MEMBER_ELIGIBLE_ROLES; SYSTEM_ADMIN/DIOCESAN_ADMIN/
   *   PARISH_ADMIN nunca ganham Member por aqui.
   * - fullName/email/phone só são copiados do User na CRIACAO do Member. Em chamadas
   *   seguintes (Member ja existe) so sincroniza communityId/status - a identidade
   *   pessoal passa a ser de responsabilidade exclusiva da tela de Membros.
   * - consentGiven só pode ser concedido por aqui (quando vier true explicitamente),
   *   nunca revogado. Revogar consentimento é uma ação deliberada via /members/:id/consent.
   */
  /**
   * Mantém member_communities espelhando a comunidade principal do membro
   * (multi-comunidade Fase 0): rebaixa a principal antiga e ativa/insere a nova.
   */
  private async syncPrimaryCommunityLink(db: any, memberId: string, communityId: string) {
    await db.memberCommunity.updateMany({
      where: { memberId, isPrimary: true, communityId: { not: communityId } },
      data: { isPrimary: false },
    });
    await db.memberCommunity.upsert({
      where: { memberId_communityId: { memberId, communityId } },
      create: { memberId, communityId, isPrimary: true },
      update: { isPrimary: true, isActive: true, leftAt: null },
    });
  }

  async ensureProfileForUser(
    tx: Prisma.TransactionClient,
    params: EnsureProfileForUserParams,
    existingMemberId?: string,
  ) {
    if (!MEMBER_ELIGIBLE_ROLES.includes(params.role) || !params.communityId) {
      return null;
    }

    const grantConsent = params.consentGiven === true;

    if (existingMemberId) {
      const member = await tx.member.update({
        where: { id: existingMemberId },
        data: {
          communityId: params.communityId,
          status: 'ACTIVE',
          ...(grantConsent ? { consentGiven: true, consentDate: new Date() } : {}),
        },
      });
      await this.syncPrimaryCommunityLink(tx, member.id, params.communityId);
      return member;
    }

    const existingMember = await tx.member.findUnique({
      where: { userId: params.userId },
    });

    if (existingMember) {
      const member = await tx.member.update({
        where: { id: existingMember.id },
        data: {
          communityId: params.communityId,
          status: 'ACTIVE',
          ...(grantConsent ? { consentGiven: true, consentDate: new Date() } : {}),
        },
      });
      await this.syncPrimaryCommunityLink(tx, member.id, params.communityId);
      return member;
    }

    const created = await tx.member.create({
      data: {
        fullName: params.name,
        email: params.email,
        phone: params.phone || null,
        userId: params.userId,
        communityId: params.communityId,
        status: 'ACTIVE',
        consentGiven: grantConsent,
        consentDate: grantConsent ? new Date() : null,
      },
    });
    await this.syncPrimaryCommunityLink(tx, created.id, params.communityId);
    return created;
  }

  /**
   * Sincroniza o vínculo de cônjuge nos DOIS sentidos (A↔B), desfazendo
   * vínculos anteriores de ambos os lados. `spouseId` é @unique, então as
   * limpezas acontecem antes das novas gravações, numa transação.
   */
  private async syncSpouseLink(memberId: string, desiredSpouseId: string | null) {
    if (desiredSpouseId === memberId) {
      throw new BadRequestException('O cônjuge não pode ser o próprio membro');
    }

    await this.prisma.$transaction(async (tx) => {
      const me = await tx.member.findUnique({
        where: { id: memberId },
        select: { id: true, spouseId: true },
      });
      if (!me) return;

      // Limpa o vínculo atual dos dois lados
      if (me.spouseId && me.spouseId !== desiredSpouseId) {
        await tx.member.updateMany({ where: { id: me.spouseId }, data: { spouseId: null } });
      }
      await tx.member.updateMany({ where: { id: memberId }, data: { spouseId: null } });

      if (!desiredSpouseId) return;

      const target = await tx.member.findUnique({
        where: { id: desiredSpouseId },
        select: { id: true, spouseId: true, deletedAt: true },
      });
      if (!target || target.deletedAt) {
        throw new BadRequestException('Cônjuge informado não encontrado');
      }

      // Desfaz o casamento anterior do alvo (se houver, com outra pessoa)
      if (target.spouseId && target.spouseId !== memberId) {
        await tx.member.updateMany({ where: { id: target.spouseId }, data: { spouseId: null } });
      }
      await tx.member.updateMany({ where: { id: target.id }, data: { spouseId: null } });

      // Grava o vínculo recíproco
      await tx.member.update({ where: { id: memberId }, data: { spouseId: target.id } });
      await tx.member.update({ where: { id: target.id }, data: { spouseId: memberId } });
    });
  }

  async create(createMemberDto: CreateMemberDto, currentUser?: CurrentUser) {
    const { cpf, email, communityId, spouseId, ...rest } = createMemberDto;
    const normalizedCpf = this.normalizeCpf(cpf);
    const normalizedEmail = this.normalizeEmail(email);

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
    if (normalizedCpf) {
      const existingMemberByCpf = await this.prisma.member.findUnique({
        where: { cpf: normalizedCpf },
      });

      if (existingMemberByCpf) {
        throw new ConflictException('CPF já cadastrado');
      }
    }

    // Verificar se email já está cadastrado (se fornecido)
    if (normalizedEmail) {
      const existingMemberByEmail = await this.prisma.member.findFirst({
        where: { email: normalizedEmail },
      });

      if (existingMemberByEmail) {
        throw new ConflictException('Email já cadastrado');
      }
    }

    try {
      const member = await this.prisma.member.create({
        data: {
          ...rest,
          cpf: normalizedCpf,
          email: normalizedEmail,
          communityId,
          communityLinks: { create: { communityId, isPrimary: true } },
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

      // Vínculo de cônjuge (recíproco)
      if (spouseId) {
        await this.syncSpouseLink(member.id, spouseId);
      }

      await this.auditService.log({
        actor: this.auditActor(currentUser),
        action: 'CREATE',
        entity: 'Member',
        entityId: member.id,
        after: { fullName: member.fullName, communityId: member.communityId },
      });

      return member;
    } catch (error) {
      this.handleUniqueConstraint(error);
    }
  }

  async findAll(currentUser?: CurrentUser, communityId?: string, status?: MemberStatus) {
    // Aplicar filtros de hierarquia usando o serviço centralizado
    const hierarchyFilter = currentUser
      ? this.hierarchyService.applyMemberFilter(currentUser)
      : {};
    
    const where: any = { ...hierarchyFilter, deletedAt: null };

    if (communityId) {
      // O parâmetro não pode AMPLIAR o escopo do usuário: se a hierarquia já
      // fixa uma comunidade diferente, a interseção é vazia.
      if (where.communityId && where.communityId !== communityId) {
        return [];
      }
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

  async findOne(id: string, currentUser?: CurrentUser) {
    const member = await this.prisma.member.findFirst({
      where: { id, deletedAt: null },
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
        availabilityRules: {
          orderBy: [
            { dayOfWeek: 'asc' },
            { startMinutes: 'asc' },
          ],
        },
        availabilityExceptions: {
          orderBy: {
            startDate: 'asc',
          },
        },
      },
    });

    if (!member) {
      throw new NotFoundException(`Membro com ID ${id} não encontrado`);
    }

    // Verificação de escopo: somente o próprio titular, SYSTEM_ADMIN ou
    // gestor com acesso hierárquico podem ler o cadastro completo (LGPD).
    if (currentUser) {
      const { isSelf } = await this.assertMemberAccess(currentUser, member);

      if (!isSelf) {
        await this.auditService.log({
          actor: this.auditActor(currentUser),
          action: 'READ_SENSITIVE',
          entity: 'Member',
          entityId: id,
        });
      }
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

    const { cpf, email, spouseId, ...rest } = updateMemberDto;
    const normalizedCpf = this.normalizeCpf(cpf);
    const normalizedEmail = this.normalizeEmail(email);

    // Vínculo de cônjuge (recíproco): só mexe quando o campo vem no payload
    if (spouseId !== undefined) {
      await this.syncSpouseLink(id, spouseId || null);
    }

    // Verificar se CPF já está em uso por outro membro
    if (normalizedCpf) {
      const existingMember = await this.prisma.member.findUnique({
        where: { cpf: normalizedCpf },
      });

      if (existingMember && existingMember.id !== id) {
        throw new ConflictException('CPF já cadastrado para outro membro');
      }
    }

    // Verificar se email já está em uso por outro membro
    if (normalizedEmail) {
      const existingMember = await this.prisma.member.findFirst({
        where: { email: normalizedEmail },
      });

      if (existingMember && existingMember.id !== id) {
        throw new ConflictException('Email já cadastrado para outro membro');
      }
    }

    try {
      if (updateMemberDto.communityId && updateMemberDto.communityId !== member.communityId) {
        await this.syncPrimaryCommunityLink(this.prisma, id, updateMemberDto.communityId);
      }
      const updatedMember = await this.prisma.member.update({
        where: { id },
        data: {
          ...rest,
          cpf: normalizedCpf,
          email: normalizedEmail,
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

      await this.auditService.log({
        actor: this.auditActor(currentUser),
        action: 'UPDATE',
        entity: 'Member',
        entityId: id,
        metadata: { changedFields: Object.keys(updateMemberDto) },
      });

      return updatedMember;
    } catch (error) {
      this.handleUniqueConstraint(error);
    }
  }

  async remove(id: string, currentUser?: CurrentUser) {
    await this.findOne(id); // Verifica se existe (e se não está excluído)

    // Validar permissão para excluir este membro
    if (currentUser) {
      const canManage = await this.hierarchyService.canManageMember(currentUser.id, id);
      if (!canManage) {
        throw new ForbiddenException('Você não tem permissão para excluir este membro');
      }
    }

    // Soft delete: preserva histórico (escalas, sacramentos, pastorais) e
    // permite recuperação em caso de exclusão acidental.
    const removedMember = await this.prisma.member.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.log({
      actor: this.auditActor(currentUser),
      action: 'SOFT_DELETE',
      entity: 'Member',
      entityId: id,
    });

    return removedMember;
  }

  // LGPD: Exportar dados do membro (portabilidade)
  // Permitido ao próprio titular ou a gestor com escopo hierárquico.
  async exportMemberData(id: string, currentUser?: CurrentUser) {
    const member = await this.findOne(id);

    if (currentUser) {
      await this.assertMemberAccess(
        currentUser,
        member,
        'Você não tem permissão para exportar os dados deste membro',
      );
    }

    // Remover campos sensíveis internos
    const { createdAt, updatedAt, ...memberData } = member;

    await this.auditService.log({
      actor: this.auditActor(currentUser),
      action: 'EXPORT',
      entity: 'Member',
      entityId: id,
    });

    return {
      exportedAt: new Date().toISOString(),
      member: memberData,
    };
  }

  // LGPD: Direito ao esquecimento (anonimizar dados)
  // O esquecimento é um direito do titular e NÃO depende de consentimento
  // prévio — vale inclusive (e principalmente) para quem revogou o consentimento.
  async anonymizeMember(id: string, currentUser?: CurrentUser) {
    const member = await this.findOne(id);

    // Escopo: apenas gestor com acesso hierárquico ao membro
    if (currentUser) {
      const canManage =
        currentUser.role === UserRole.SYSTEM_ADMIN ||
        (await this.hierarchyService.canManageMember(currentUser.id, id));
      if (!canManage) {
        throw new ForbiddenException('Você não tem permissão para anonimizar este membro');
      }
    }

    if (member.status === MemberStatus.ANONYMIZED) {
      throw new BadRequestException('Membro já foi anonimizado');
    }

    const fieldsCleared = [
      'fullName',
      'cpf',
      'rg',
      'email',
      'phone',
      'zipCode',
      'street',
      'number',
      'complement',
      'neighborhood',
      'city',
      'state',
      'photoUrl',
      'fatherName',
      'motherName',
      'occupation',
      'birthDate',
    ];

    const anonymized = await this.prisma.member.update({
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
        birthDate: null,
        status: MemberStatus.ANONYMIZED,
        consentGiven: false,
        consentDate: null,
      },
    });

    // Auditoria SEM dados pessoais em claro (registrar o "antes" com PII
    // derrotaria o propósito da anonimização).
    await this.auditService.log({
      actor: this.auditActor(currentUser),
      action: 'ANONYMIZE',
      entity: 'Member',
      entityId: id,
      metadata: { fieldsCleared },
    });

    return anonymized;
  }

  // LGPD: Atualizar consentimento
  // Permitido ao próprio titular ou a gestor com escopo hierárquico.
  async updateConsent(id: string, consentGiven: boolean, currentUser?: CurrentUser) {
    const member = await this.findOne(id);

    if (currentUser) {
      await this.assertMemberAccess(
        currentUser,
        member,
        'Você não tem permissão para alterar o consentimento deste membro',
      );
    }

    const updated = await this.prisma.member.update({
      where: { id },
      data: {
        consentGiven,
        consentDate: consentGiven ? new Date() : null,
      },
    });

    await this.auditService.log({
      actor: this.auditActor(currentUser),
      action: 'CONSENT_CHANGE',
      entity: 'Member',
      entityId: id,
      before: { consentGiven: member.consentGiven },
      after: { consentGiven },
    });

    return updated;
  }

  async getAvailability(id: string, currentUser?: CurrentUser) {
    const member = await this.prisma.member.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        availabilityRules: {
          orderBy: [
            { dayOfWeek: 'asc' },
            { startMinutes: 'asc' },
          ],
        },
        availabilityExceptions: {
          orderBy: {
            startDate: 'asc',
          },
        },
      },
    });

    if (!member) {
      throw new NotFoundException(`Membro com ID ${id} nao encontrado`);
    }

    if (currentUser) {
      const canManage = await this.hierarchyService.canManageMember(currentUser.id, id);
      if (!canManage) {
        throw new ForbiddenException('Voce nao tem permissao para consultar a disponibilidade deste membro');
      }
    }

    return {
      memberId: member.id,
      memberName: member.fullName,
      hasMember: true,
      rules: member.availabilityRules,
      exceptions: member.availabilityExceptions,
    };
  }

  async updateAvailability(id: string, payload: UpdateMemberAvailabilityDto, currentUser?: CurrentUser) {
    const member = await this.prisma.member.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
      },
    });

    if (!member) {
      throw new NotFoundException(`Membro com ID ${id} nao encontrado`);
    }

    if (currentUser) {
      const canManage = await this.hierarchyService.canManageMember(currentUser.id, id);
      if (!canManage) {
        throw new ForbiddenException('Voce nao tem permissao para editar a disponibilidade deste membro');
      }
    }

    const { rules, exceptions } = this.sanitizeAvailabilityPayload(payload);

    await this.prisma.$transaction(async (tx) => {
      await tx.memberAvailabilityRule.deleteMany({
        where: { memberId: id },
      });
      await tx.memberAvailabilityException.deleteMany({
        where: { memberId: id },
      });

      if (rules.length > 0) {
        await tx.memberAvailabilityRule.createMany({
          data: rules.map((rule) => ({
            memberId: id,
            ...rule,
          })),
        });
      }

      if (exceptions.length > 0) {
        await tx.memberAvailabilityException.createMany({
          data: exceptions.map((item) => ({
            memberId: id,
            ...item,
          })),
        });
      }
    });

    return this.getAvailability(id, currentUser);
  }

  async getMyAvailability(userId: string) {
    const member = await this.resolveMemberFromUser(userId);

    if (!member) {
      return {
        hasMember: false,
        memberId: null,
        memberName: null,
        rules: [],
        exceptions: [],
      };
    }

    return this.getAvailability(member.id);
  }

  async updateMyAvailability(userId: string, payload: UpdateMemberAvailabilityDto) {
    const member = await this.resolveMemberFromUser(userId);

    if (!member) {
      throw new NotFoundException('Usuario nao possui cadastro de membro');
    }

    return this.updateAvailability(member.id, payload);
  }

  private normalizeName(value: string) {
    return value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Detecta possíveis duplicados dentro do escopo do usuário, sem depender de CPF.
   * Cruza nome normalizado (acentos/caixa) com data de nascimento ou telefone.
   */
  async findPotentialDuplicates(
    input: { fullName: string; birthDate?: string; phone?: string; communityId?: string },
    currentUser?: CurrentUser,
    excludeId?: string,
  ) {
    const hierarchyFilter = currentUser
      ? this.hierarchyService.applyMemberFilter(currentUser)
      : {};

    const candidates = await this.prisma.member.findMany({
      where: {
        ...hierarchyFilter,
        deletedAt: null,
        status: { not: MemberStatus.ANONYMIZED },
        ...(input.communityId ? { communityId: input.communityId } : {}),
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: {
        id: true,
        fullName: true,
        birthDate: true,
        phone: true,
        cpf: true,
        community: { select: { id: true, name: true } },
      },
    });

    const targetName = this.normalizeName(input.fullName);
    const targetPhone = input.phone ? this.normalizeCpf(input.phone) : null;
    const targetBirth = input.birthDate ? input.birthDate.slice(0, 10) : null;

    return candidates
      .map((candidate) => {
        const reasons: string[] = [];
        const sameName = this.normalizeName(candidate.fullName) === targetName;

        if (sameName && targetBirth && candidate.birthDate) {
          if (candidate.birthDate.toISOString().slice(0, 10) === targetBirth) {
            reasons.push('mesmo nome e data de nascimento');
          }
        }
        if (sameName && targetPhone && candidate.phone) {
          if (this.normalizeCpf(candidate.phone) === targetPhone) {
            reasons.push('mesmo nome e telefone');
          }
        }
        if (sameName && !targetBirth && !targetPhone) {
          reasons.push('mesmo nome');
        }

        return { candidate, reasons };
      })
      .filter((item) => item.reasons.length > 0)
      .map((item) => ({
        id: item.candidate.id,
        fullName: item.candidate.fullName,
        community: item.candidate.community,
        reasons: item.reasons,
      }));
  }

  /**
   * Importa membros a partir de linhas (ex.: CSV parseado no controller/web).
   * Valida comunidade/escopo, pula duplicados por CPF/e-mail e reporta erros por linha.
   */
  async importMembers(
    rows: Array<Record<string, string>>,
    communityId: string,
    currentUser: CurrentUser,
  ) {
    const community = await this.prisma.community.findFirst({
      where: { id: communityId, deletedAt: null },
    });
    if (!community) {
      throw new NotFoundException('Comunidade não encontrada');
    }

    // Reusa a validação de escopo de criação
    const communityFilter = this.hierarchyService.applyCommunityFilter(currentUser);
    if (communityFilter.id && communityFilter.id !== communityId) {
      throw new ForbiddenException('Você não tem permissão para importar nesta comunidade');
    }
    if (communityFilter.parishId && community.parishId !== currentUser.parishId) {
      throw new ForbiddenException('Você não tem permissão para importar nesta comunidade');
    }

    const result = { imported: 0, skipped: 0, errors: [] as Array<{ line: number; reason: string }> };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const fullName = row.fullName?.trim() || row.nome?.trim();
      if (!fullName) {
        result.errors.push({ line: i + 1, reason: 'Nome ausente' });
        continue;
      }

      const cpf = this.normalizeCpf(row.cpf);
      const email = this.normalizeEmail(row.email);

      // Pula duplicado por CPF/e-mail
      const existing =
        (cpf && (await this.prisma.member.findUnique({ where: { cpf } }))) ||
        (email && (await this.prisma.member.findFirst({ where: { email } })));
      if (existing) {
        result.skipped++;
        continue;
      }

      try {
        await this.prisma.member.create({
          data: {
            fullName,
            cpf,
            email,
            phone: this.normalizeOptionalString(row.phone),
            communityId,
            communityLinks: { create: { communityId, isPrimary: true } },
            status: 'ACTIVE',
          },
        });
        result.imported++;
      } catch {
        result.errors.push({ line: i + 1, reason: 'Falha ao inserir (dados inválidos ou duplicados)' });
      }
    }

    await this.auditService.log({
      actor: this.auditActor(currentUser),
      action: 'CREATE',
      entity: 'Member',
      metadata: { bulkImport: true, communityId, ...result },
    });

    return result;
  }

  // Buscar membros por nome
  // O filtro de hierarquia é SEMPRE aplicado: cada usuário só busca dentro
  // do próprio escopo (comunidade/paróquia/diocese/pastorais).
  async searchByName(name: string, communityId?: string, currentUser?: CurrentUser) {
    const hierarchyFilter = currentUser
      ? this.hierarchyService.applyMemberFilter(currentUser)
      : {};

    const where: any = {
      ...hierarchyFilter,
      deletedAt: null,
      fullName: {
        contains: name,
        mode: 'insensitive',
      },
    };

    if (communityId) {
      // O parâmetro não pode AMPLIAR o escopo: se a hierarquia já fixa outra
      // comunidade, a interseção é vazia.
      if (where.communityId && where.communityId !== communityId) {
        return [];
      }
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
