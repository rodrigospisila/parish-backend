import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TitheScheduleCancellationService } from '../tithe/tithe-schedule-cancellation.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { UpdateMemberAvailabilityDto } from './dto/update-member-availability.dto';
import { AssignmentStatus, MemberStatus, Prisma, UserRole } from '@prisma/client';
import { HierarchyService, CurrentUser } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';
import { isRoleAtLeast, ROLE_HIERARCHY } from '../auth/constants/role-hierarchy';
import { normalizeBrazilianPhone } from '../messaging/log-mask';

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
    // Opcional: specs antigos montam o serviço sem ele
    @Optional() private readonly titheSchedules?: TitheScheduleCancellationService,
  ) {}

  /**
   * Gestão de cadastro (coordenação de pastoral ou acima). Fiel e voluntário
   * não listam nem buscam o cadastro da comunidade (LGPD): só o próprio e os
   * dependentes, e sem as colunas sensíveis.
   */
  private isMemberManager(currentUser?: CurrentUser): boolean {
    return !!currentUser && isRoleAtLeast(currentUser.role, UserRole.PASTORAL_COORDINATOR);
  }

  /**
   * Garante `member.id` no usuário para o filtro do fiel/voluntário (o
   * JwtStrategy já o carrega; aqui cobre chamadas internas sem ele).
   */
  private async withSelfMember(currentUser: CurrentUser): Promise<CurrentUser> {
    if (this.isMemberManager(currentUser) || currentUser.member?.id) {
      return currentUser;
    }
    const self = await this.resolveMemberFromUser(currentUser.id);
    return { ...currentUser, member: self ? { id: self.id } : null };
  }

  /** Colunas devolvidas a quem NÃO gerencia cadastro (o próprio e dependentes). */
  private readonly basicMemberSelect = {
    id: true,
    fullName: true,
    status: true,
    communityId: true,
    responsibleId: true,
    community: { select: { id: true, name: true } },
  } as const;

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

      // Duplicidade no SEU escopo já foi respondida antes com a mensagem clara;
      // chegar aqui = CPF de alguém fora do escopo do ator. Não confirmar onde
      // (nem que) a pessoa está cadastrada — o índice único é nacional.
      if (target.includes('cpf')) {
        throw new ConflictException(
          'Não foi possível salvar com este CPF — confira o número ou procure a secretaria da paróquia',
        );
      }

      if (target.includes('email')) {
        throw new ConflictException('Email já cadastrado');
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
        throw new BadRequestException('A disponibilidade semanal precisa ter horário final maior que o inicial');
      }
    }

    for (const item of exceptions) {
      if (Number.isNaN(item.startDate.getTime()) || Number.isNaN(item.endDate.getTime())) {
        throw new BadRequestException('Periodo de indisponibilidade inválido');
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
    // O vínculo principal herda o consentimento (LGPD) registrado no cadastro
    const member = await db.member.findUnique({
      where: { id: memberId },
      select: { consentGiven: true, consentDate: true },
    });
    await db.memberCommunity.updateMany({
      where: { memberId, isPrimary: true, communityId: { not: communityId } },
      data: { isPrimary: false },
    });
    await db.memberCommunity.upsert({
      where: { memberId_communityId: { memberId, communityId } },
      create: {
        memberId,
        communityId,
        isPrimary: true,
        consentGiven: member?.consentGiven ?? false,
        consentDate: member?.consentDate ?? null,
      },
      // Vínculo existente promovido: preserva o consentimento próprio do vínculo
      update: { isPrimary: true, isActive: true, leftAt: null },
    });
  }

  // ===== Vínculos multi-comunidade do membro (Fase 2) =====

  private readonly communityLinkInclude = {
    community: {
      select: { id: true, name: true, parish: { select: { id: true, name: true } } },
    },
  } as const;

  /** Dependentes (menores sob responsabilidade) do usuário logado. */
  async listMyDependents(userId: string) {
    const member = await this.prisma.member.findFirst({
      where: { userId, deletedAt: null },
      select: { id: true },
    });
    if (!member) return [];
    return this.prisma.member.findMany({
      where: { responsibleId: member.id, deletedAt: null },
      select: { id: true, fullName: true, birthDate: true },
      orderBy: { fullName: 'asc' },
    });
  }

  /** Resolve o Member do usuário logado (self-service de vínculos). */
  async requireMemberForUser(userId: string) {
    const member = await this.prisma.member.findFirst({
      where: { userId, deletedAt: null },
      select: { id: true, communityId: true },
    });
    if (!member) {
      throw new NotFoundException('Usuário não possui cadastro de membro');
    }
    return member;
  }

  /** Lista os vínculos de comunidade do membro (principal + secundárias). */
  async listCommunityLinks(memberId: string) {
    return this.prisma.memberCommunity.findMany({
      where: { memberId },
      include: this.communityLinkInclude,
      orderBy: [{ isPrimary: 'desc' }, { joinedAt: 'asc' }],
    });
  }

  /**
   * Cria (ou reativa) um vínculo SECUNDÁRIO. Exige consentimento LGPD —
   * o vínculo torna o membro visível/escalável na comunidade.
   */
  async addCommunityLink(
    memberId: string,
    communityId: string,
    consentGiven: boolean,
    currentUser: CurrentUser,
    opts: { requireScope?: boolean } = {},
  ) {
    if (consentGiven !== true) {
      throw new BadRequestException(
        'O consentimento (LGPD) é obrigatório para vincular a comunidade',
      );
    }

    // Gestão: o ator precisa ter o membro no seu escopo de leitura (evita
    // anexar/expor membros de outras paróquias sem autoridade sobre eles)
    if (opts.requireScope) {
      await this.findOne(memberId, currentUser);
    }

    const member = await this.prisma.member.findFirst({
      where: { id: memberId, deletedAt: null },
      select: { id: true, communityId: true, fullName: true },
    });
    if (!member) {
      throw new NotFoundException('Membro não encontrado');
    }
    if (member.communityId === communityId) {
      throw new BadRequestException('Esta já é a comunidade principal do membro');
    }

    const community = await this.prisma.community.findFirst({
      where: { id: communityId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!community) {
      throw new NotFoundException('Comunidade não encontrada');
    }

    if (opts.requireScope) {
      const inScope = await this.hierarchyService.isCommunityInScope(currentUser, communityId);
      if (!inScope) {
        throw new ForbiddenException('Comunidade fora do seu escopo');
      }
    }

    const link = await this.prisma.memberCommunity.upsert({
      where: { memberId_communityId: { memberId, communityId } },
      create: {
        memberId,
        communityId,
        isPrimary: false,
        consentGiven: true,
        consentDate: new Date(),
      },
      update: { isActive: true, leftAt: null, consentGiven: true, consentDate: new Date() },
      include: this.communityLinkInclude,
    });

    await this.auditService.log({
      actor: { id: currentUser.id, email: currentUser.email, role: currentUser.role },
      action: 'CREATE',
      entity: 'MemberCommunity',
      entityId: link.id,
      metadata: { memberId, communityId, communityName: community.name, consentGiven: true },
    });

    return link;
  }

  /** Desativa um vínculo secundário (leftAt — preserva a trilha LGPD). */
  async removeCommunityLink(
    memberId: string,
    communityId: string,
    currentUser: CurrentUser,
    opts: { requireScope?: boolean } = {},
  ) {
    const link = await this.prisma.memberCommunity.findUnique({
      where: { memberId_communityId: { memberId, communityId } },
    });
    if (!link || !link.isActive) {
      throw new NotFoundException('Vínculo não encontrado');
    }
    if (link.isPrimary) {
      throw new BadRequestException(
        'Não é possível remover o vínculo principal — defina outra comunidade principal antes',
      );
    }

    if (opts.requireScope) {
      await this.findOne(memberId, currentUser); // membro precisa estar no escopo do ator
      const inScope = await this.hierarchyService.isCommunityInScope(currentUser, communityId);
      if (!inScope) {
        throw new ForbiddenException('Comunidade fora do seu escopo');
      }
    }

    // Revogar o vínculo CESSA a exposição: sai também das pastorais e grupos
    // daquela comunidade (o consentimento revogado cobre a comunidade inteira).
    const [updated] = await this.prisma.$transaction([
      this.prisma.memberCommunity.update({
        where: { id: link.id },
        data: { isActive: false, isPrimary: false, leftAt: new Date() },
      }),
      this.prisma.pastoralMember.updateMany({
        where: {
          memberId,
          isActive: true,
          OR: [
            { communityPastoral: { communityId } },
            { pastoralGroup: { communityPastoral: { communityId } } },
          ],
        },
        data: { isActive: false, leftAt: new Date() },
      }),
    ]);

    await this.auditService.log({
      actor: { id: currentUser.id, email: currentUser.email, role: currentUser.role },
      action: 'DELETE',
      entity: 'MemberCommunity',
      entityId: link.id,
      metadata: { memberId, communityId },
    });

    return updated;
  }

  /**
   * Papéis cujo escopo administrativo (role/diocese/paróquia/comunidade do
   * User) NUNCA muda por vínculo de comunidade: tudo acima de VOLUNTEER — e
   * papel desconhecido (negar por padrão). Para eles a troca de principal mexe
   * só no vínculo de FÉ do cadastro de membro; escopo muda só via /users.
   */
  private isManagementRole(role?: UserRole | null): boolean {
    return role !== UserRole.FAITHFUL && role !== UserRole.VOLUNTEER;
  }

  /**
   * O ator pode cadastrar/mover membros PARA esta comunidade? (negar por padrão)
   * SYSTEM_ADMIN: qualquer; admin diocesano/paroquial e coordenador de
   * comunidade: canManageCommunity (diocese/paróquia/comunidade do cadastro);
   * coordenador de pastoral: só a própria comunidade; demais: nunca.
   */
  private async canManageMembersIn(currentUser: CurrentUser, communityId: string): Promise<boolean> {
    if (!currentUser?.id || !currentUser.role || !communityId) {
      return false;
    }
    if (currentUser.role === UserRole.SYSTEM_ADMIN) {
      return true;
    }
    if (currentUser.role === UserRole.PASTORAL_COORDINATOR) {
      return !!currentUser.communityId && currentUser.communityId === communityId;
    }
    if (!isRoleAtLeast(currentUser.role, UserRole.COMMUNITY_COORDINATOR)) {
      return false;
    }
    return this.hierarchyService.canManageCommunity(currentUser.id, communityId);
  }

  /**
   * Cônjuge/responsável informado precisa ser um membro que o ator GERENCIA —
   * senão o vínculo recíproco altera a ficha de alguém de outra paróquia.
   */
  private async assertRelatedMemberManageable(
    currentUser: CurrentUser | undefined,
    relatedMemberId: string,
    label: string,
  ) {
    if (!currentUser || currentUser.role === UserRole.SYSTEM_ADMIN) {
      return;
    }
    const canManage = await this.hierarchyService.canManageMember(currentUser.id, relatedMemberId);
    if (!canManage) {
      throw new ForbiddenException(`O ${label} informado não está no seu escopo de gestão`);
    }
  }

  /**
   * Duplicidade (CPF/e-mail) procurada SÓ no escopo de leitura do ator: fora
   * dele, a resposta não pode revelar que a pessoa existe em outra paróquia.
   * Sem ator (chamada interna): busca global.
   */
  private async findMemberInActorScope(
    where: Prisma.MemberWhereInput,
    currentUser?: CurrentUser,
    excludeId?: string,
  ) {
    const scope = currentUser
      ? this.hierarchyService.applyMemberFilter(await this.withSelfMember(currentUser))
      : {};
    return this.prisma.member.findFirst({
      where: { AND: [scope, where, ...(excludeId ? [{ id: { not: excludeId } }] : [])] },
      select: { id: true },
    });
  }

  /**
   * Troca EXPLÍCITA e não-destrutiva da comunidade principal: a antiga vira
   * secundária (permanece ativa — é o que o app e o painel anunciam) e
   * Member.communityId passa a ser a nova. Exige vínculo ativo prévio.
   *
   * SEGURANÇA: o escopo administrativo do usuário vinculado (role/diocese/
   * paróquia/comunidade e UserCommunity) só é espelhado para FIEL/VOLUNTÁRIO.
   * Gestor (acima de VOLUNTEER) muda só o vínculo de fé do cadastro de membro —
   * antes um coordenador se mudava para qualquer comunidade do país
   * (POST /members/me/communities + este PATCH no próprio cadastro).
   * Alvo terceiro: autoridade sobre o membro (origem), canManageCommunity no
   * DESTINO e papel do usuário vinculado estritamente abaixo do ator.
   */
  async setPrimaryCommunity(memberId: string, communityId: string, currentUser: CurrentUser) {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, deletedAt: null },
      select: { id: true, communityId: true, userId: true },
    });
    if (!member) {
      throw new NotFoundException('Membro não encontrado');
    }

    const isSelf = !!member.userId && member.userId === currentUser.id;
    if (!isSelf) {
      // Autoridade de GESTÃO sobre o membro (comunidade principal atual no escopo)
      const canManage = await this.hierarchyService.canManageMember(currentUser.id, memberId);
      if (!canManage) {
        throw new ForbiddenException(
          'Você não tem permissão para alterar a comunidade principal deste membro',
        );
      }
    }

    if (member.communityId === communityId) {
      throw new BadRequestException('Esta já é a comunidade principal do membro');
    }

    const linkedUser = member.userId
      ? await this.prisma.user.findUnique({
          where: { id: member.userId },
          select: { id: true, role: true },
        })
      : null;

    // Mesma trava do fluxo de usuários: coordenador de pastoral fica na
    // comunidade das pastorais que coordena
    if (linkedUser?.role === UserRole.PASTORAL_COORDINATOR) {
      throw new BadRequestException(
        'Coordenador de pastoral não pode ter a comunidade principal trocada — as pastorais coordenadas ficam na comunidade atual',
      );
    }

    if (!isSelf && currentUser.role !== UserRole.SYSTEM_ADMIN) {
      if (linkedUser) {
        const actorLevel = ROLE_HIERARCHY[currentUser.role];
        const targetLevel = ROLE_HIERARCHY[linkedUser.role];
        if (actorLevel === undefined || targetLevel === undefined || targetLevel <= actorLevel) {
          throw new ForbiddenException(
            'Você só pode trocar a comunidade principal de quem tem papel abaixo do seu',
          );
        }
      }
      const canManageDestination = await this.hierarchyService.canManageCommunity(
        currentUser.id,
        communityId,
      );
      if (!canManageDestination) {
        throw new ForbiddenException('A nova comunidade principal está fora do seu escopo');
      }
    }

    const link = await this.prisma.memberCommunity.findUnique({
      where: { memberId_communityId: { memberId, communityId } },
    });
    if (!link || !link.isActive) {
      throw new BadRequestException(
        'Vincule o membro a esta comunidade antes de torná-la principal',
      );
    }

    const community = await this.prisma.community.findFirst({
      where: { id: communityId, deletedAt: null },
      select: { id: true, name: true, parishId: true, parish: { select: { dioceseId: true } } },
    });
    if (!community) {
      throw new NotFoundException('Comunidade não encontrada');
    }

    // Espelho no User só para fiel/voluntário (vínculo aberto — decisão de produto)
    const mirrorUserScope = !!linkedUser && !this.isManagementRole(linkedUser.role);

    await this.prisma.$transaction(async (tx) => {
      await tx.member.update({ where: { id: memberId }, data: { communityId } });
      // Rebaixa a principal antiga (continua ativa como secundária) e promove a nova
      await this.syncPrimaryCommunityLink(tx, memberId, communityId);

      // Espelha o escopo do usuário vinculado, preservando os demais vínculos
      if (mirrorUserScope && linkedUser) {
        await tx.user.update({
          where: { id: linkedUser.id },
          data: {
            communityId,
            parishId: community.parishId,
            dioceseId: community.parish.dioceseId,
          },
        });
        await tx.userCommunity.updateMany({
          where: { userId: linkedUser.id, isPrimary: true, communityId: { not: communityId } },
          data: { isPrimary: false },
        });
        await tx.userCommunity.upsert({
          where: { userId_communityId: { userId: linkedUser.id, communityId } },
          create: { userId: linkedUser.id, communityId, role: linkedUser.role, isPrimary: true },
          update: { isActive: true, isPrimary: true, leftAt: null },
        });
      }
    });

    await this.auditService.log({
      actor: { id: currentUser.id, email: currentUser.email, role: currentUser.role },
      action: 'UPDATE',
      entity: 'MemberCommunity',
      entityId: link.id,
      metadata: {
        memberId,
        newPrimaryCommunityId: communityId,
        previousPrimaryCommunityId: member.communityId,
        userScopeMirrored: mirrorUserScope,
      },
    });

    return this.listCommunityLinks(memberId);
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

  /** Responsável (pai/mãe) precisa existir como membro vivo e não ser a própria pessoa. */
  private async assertValidResponsible(responsibleId: string, selfId?: string) {
    if (selfId && responsibleId === selfId) {
      throw new BadRequestException('O membro não pode ser responsável por si mesmo');
    }
    const responsible = await this.prisma.member.findFirst({
      where: { id: responsibleId, deletedAt: null },
      select: { id: true },
    });
    if (!responsible) {
      throw new NotFoundException('Responsável não encontrado — cadastre o pai/mãe como membro primeiro');
    }
  }

  async create(createMemberDto: CreateMemberDto, currentUser?: CurrentUser) {
    const { cpf, email, communityId, spouseId, responsibleId, ...rest } = createMemberDto;
    // Vincular a ficha a uma CONTA é fluxo próprio (cadastro/adoção por
    // telefone) — nunca pelo corpo do POST (religaria a conta de outra pessoa)
    delete (rest as any).userId;
    const normalizedCpf = this.normalizeCpf(cpf);
    const normalizedEmail = this.normalizeEmail(email);

    // Verificar se a comunidade existe
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
    });

    if (!community) {
      throw new NotFoundException(`Comunidade com ID ${communityId} não encontrada`);
    }

    // Destino dentro do escopo de GESTÃO do ator (negar por padrão). Antes o
    // applyCommunityFilter não restringia o admin diocesano: POST /members
    // aceitava communityId de qualquer paróquia do país.
    if (currentUser && !(await this.canManageMembersIn(currentUser, communityId))) {
      throw new ForbiddenException('Você não tem permissão para criar membros nesta comunidade');
    }

    if (responsibleId) {
      await this.assertValidResponsible(responsibleId);
      await this.assertRelatedMemberManageable(currentUser, responsibleId, 'responsável');
    }
    if (spouseId) {
      await this.assertRelatedMemberManageable(currentUser, spouseId, 'cônjuge');
    }

    // Duplicidade de CPF/e-mail só no escopo do ator (fora dele, não revelar)
    if (normalizedCpf && (await this.findMemberInActorScope({ cpf: normalizedCpf }, currentUser))) {
      throw new ConflictException('CPF já cadastrado');
    }

    if (normalizedEmail && (await this.findMemberInActorScope({ email: normalizedEmail }, currentUser))) {
      throw new ConflictException('Email já cadastrado');
    }

    try {
      const member = await this.prisma.member.create({
        data: {
          ...rest,
          responsibleId: responsibleId || null,
          cpf: normalizedCpf,
          email: normalizedEmail,
          communityId,
          communityLinks: {
            create: {
              communityId,
              isPrimary: true,
              consentGiven: createMemberDto.consentGiven === true,
              consentDate: createMemberDto.consentGiven ? new Date() : null,
            },
          },
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
    // Aplicar filtros de hierarquia usando o serviço centralizado. Fiel e
    // voluntário recebem só o próprio cadastro e os dependentes (os seletores
    // da catequese/trocas do painel usam esta lista); escopo não resolvido = nada.
    const hierarchyFilter = currentUser
      ? this.hierarchyService.applyMemberFilter(await this.withSelfMember(currentUser))
      : {};

    const where: any = { ...hierarchyFilter, deletedAt: null };

    if (communityId) {
      // O parâmetro não amplia o escopo: entra como filtro ADICIONAL (AND),
      // considerando também membros com vínculo secundário na comunidade.
      where.AND = [
        ...(where.AND ?? []),
        {
          OR: [
            { communityId },
            { communityLinks: { some: { communityId, isActive: true } } },
          ],
        },
      ];
    }

    if (status) {
      where.status = status;
    }

    // Quem não gerencia cadastro: select explícito, sem CPF/RG/contatos/endereço
    if (currentUser && !this.isMemberManager(currentUser)) {
      return this.prisma.member.findMany({
        where,
        select: this.basicMemberSelect,
        orderBy: { fullName: 'asc' },
      });
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
        responsible: {
          select: {
            id: true,
            fullName: true,
          },
        },
        communityLinks: {
          where: { isActive: true },
          select: {
            id: true,
            communityId: true,
            isPrimary: true,
            community: { select: { id: true, name: true } },
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
            // prayerRequests fora: a contagem incluía os anônimos (desanonimização)
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
      // Relações com select enxuto (B52): a ficha não carrega a comunidade
      // inteira (smsEnabled, geoVerifiedBy...) nem o evento completo
      include: {
        community: { select: { id: true, name: true, parishId: true } },
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
              select: {
                id: true,
                communityId: true,
                globalPastoral: { select: { id: true, name: true } },
                community: { select: { id: true, name: true } },
              },
            },
            pastoralGroup: { select: { id: true, name: true } },
          },
        },
        sacraments: {
          orderBy: {
            date: 'asc',
          },
        },
        // Pedidos de oração NÃO entram na ficha: incluíam os anônimos e
        // expunham a intenção a qualquer gestor do escopo. O titular os recebe
        // (só os não anônimos) na exportação LGPD.
        scheduleAssignments: {
          include: {
            schedule: {
              include: {
                event: { select: { id: true, title: true, startDate: true, endDate: true, location: true } },
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

    const { cpf, email, spouseId, responsibleId, communityId, ...rest } = updateMemberDto;
    // Religar a ficha a outra CONTA não é edição de cadastro (fluxo próprio)
    delete (rest as any).userId;

    // Mudança de comunidade principal: o DESTINO também precisa estar no
    // escopo de gestão do ator (antes a ficha ia para qualquer paróquia)
    const movingCommunity = !!communityId && communityId !== member.communityId;
    if (movingCommunity) {
      const destination = await this.prisma.community.findFirst({
        where: { id: communityId, deletedAt: null },
        select: { id: true },
      });
      if (!destination) {
        throw new NotFoundException(`Comunidade com ID ${communityId} não encontrada`);
      }
      if (currentUser && !(await this.canManageMembersIn(currentUser, communityId))) {
        throw new ForbiddenException('Você não tem permissão para mover membros para esta comunidade');
      }
    }

    // Responsável/cônjuge: só quando MUDA (o painel reenvia os atuais) e só
    // membros que o ator gerencia
    const responsibleChanged =
      responsibleId !== undefined && (responsibleId || null) !== (member.responsibleId ?? null);
    if (responsibleChanged && responsibleId) {
      await this.assertValidResponsible(responsibleId, id);
      await this.assertRelatedMemberManageable(currentUser, responsibleId, 'responsável');
    }
    const spouseChanged = spouseId !== undefined && (spouseId || null) !== (member.spouseId ?? null);
    if (spouseChanged && spouseId) {
      if (spouseId === id) {
        throw new BadRequestException('O cônjuge não pode ser o próprio membro');
      }
      await this.assertRelatedMemberManageable(currentUser, spouseId, 'cônjuge');
    }

    const normalizedCpf = this.normalizeCpf(cpf);
    const normalizedEmail = this.normalizeEmail(email);

    // Duplicidade só no escopo do ator (fora dele, não revelar)
    if (normalizedCpf && (await this.findMemberInActorScope({ cpf: normalizedCpf }, currentUser, id))) {
      throw new ConflictException('CPF já cadastrado para outro membro');
    }

    if (
      normalizedEmail &&
      (await this.findMemberInActorScope({ email: normalizedEmail }, currentUser, id))
    ) {
      throw new ConflictException('Email já cadastrado para outro membro');
    }

    // Vínculo de cônjuge (recíproco): só mexe quando o valor muda
    if (spouseChanged) {
      await this.syncSpouseLink(id, spouseId || null);
    }

    try {
      if (movingCommunity && communityId) {
        await this.syncPrimaryCommunityLink(this.prisma, id, communityId);
      }
      const updatedMember = await this.prisma.member.update({
        where: { id },
        data: {
          ...rest,
          ...(movingCommunity ? { communityId } : {}),
          // undefined preserva; '' / null remove o vínculo
          ...(responsibleId !== undefined ? { responsibleId: responsibleId || null } : {}),
          cpf: normalizedCpf,
          email: normalizedEmail,
        },
        include: {
          community: { select: { id: true, name: true, parishId: true } },
          responsible: { select: { id: true, fullName: true } },
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

    // Retenção mínima (LGPD): binários de documentos da catequese enviados
    // para matrículas deste membro morrem junto com o cadastro
    await this.prisma.catechesisDocument.updateMany({
      where: { enrollment: { memberId: id }, data: { not: null } },
      data: { data: null },
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

    let isSelf = false;
    if (currentUser) {
      ({ isSelf } = await this.assertMemberAccess(
        currentUser,
        member,
        'Você não tem permissão para exportar os dados deste membro',
      ));
    }

    // Remover campos sensíveis internos
    const { createdAt, updatedAt, ...memberData } = member;

    // Portabilidade: os pedidos de oração vão só para o PRÓPRIO titular e só
    // os não anônimos — gestor nenhum recebe a intenção pela exportação
    const prayerRequests = isSelf
      ? await this.prisma.prayerRequest.findMany({
          where: { memberId: id, isAnonymous: false },
          orderBy: { createdAt: 'desc' },
        })
      : undefined;

    // Consentimentos e vínculos de comunidade: titular e gestão
    const [consents, communityLinks] = await Promise.all([
      this.prisma.consent.findMany({
        where: { memberId: id },
        select: { type: true, granted: true, policyVersion: true, grantedAt: true, revokedAt: true },
        orderBy: { type: 'asc' },
      }),
      this.prisma.memberCommunity.findMany({
        where: { memberId: id },
        select: {
          isPrimary: true,
          isActive: true,
          consentGiven: true,
          joinedAt: true,
          leftAt: true,
          community: { select: { id: true, name: true } },
        },
      }),
    ]);

    // Só para o titular (B62): catequese, dízimo e notificações recebidas
    const ownExtras = isSelf ? await this.loadOwnExportExtras(id, member.userId ?? null) : {};

    await this.auditService.log({
      actor: this.auditActor(currentUser),
      action: 'EXPORT',
      entity: 'Member',
      entityId: id,
    });

    return {
      exportedAt: new Date().toISOString(),
      member: {
        ...memberData,
        ...(prayerRequests ? { prayerRequests } : {}),
        consents,
        communityLinks,
        ...ownExtras,
      },
    };
  }

  /**
   * Portabilidade do PRÓPRIO titular (B62): matrículas da catequese (sem os
   * binários dos documentos), dízimo (contribuições e Pix programado, sem os
   * dados de autorização do provedor) e as notificações recebidas.
   */
  private async loadOwnExportExtras(memberId: string, userId: string | null) {
    const [catechesisEnrollments, tither, titheSchedules, notifications] = await Promise.all([
      this.prisma.catechesisEnrollment.findMany({
        where: { memberId },
        select: {
          status: true,
          enrolledAt: true,
          completedAt: true,
          unbaptized: true,
          imageConsent: true,
          imageConsentAt: true,
          class: { select: { name: true, year: true } },
          documents: {
            select: { kind: true, fileName: true, status: true, createdAt: true, reviewedAt: true },
          },
        },
        orderBy: { enrolledAt: 'desc' },
      }),
      this.prisma.tither.findUnique({
        where: { memberId },
        select: {
          registrationNumber: true,
          joinedAt: true,
          status: true,
          contributions: {
            select: { amount: true, date: true, referenceMonth: true, method: true, receiptNumber: true },
            orderBy: { date: 'desc' },
          },
        },
      }),
      this.prisma.titheSchedule.findMany({
        where: { memberId },
        select: { amount: true, dayOfMonth: true, mode: true, status: true, nextDueDate: true, cancelledAt: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      userId
        ? this.prisma.notification.findMany({
            where: { userId },
            select: { title: true, body: true, type: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 500,
          })
        : Promise.resolve([]),
    ]);

    return { catechesisEnrollments, tither, titheSchedules, notifications };
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

    const anonymized = await this.prisma.$transaction((tx) =>
      this.anonymizePersonalData(tx, id, { label: 'Usuário Anônimo' }),
    );
    // Só agora, com a transação confirmada, o provedor é chamado
    void this.cancelTitheAtProviderAfterCommit(id);
    const fieldsCleared = MembersService.ANONYMIZED_FIELDS;

    // Auditoria SEM dados pessoais em claro (registrar o "antes" com PII
    // derrotaria o propósito da anonimização).
    await this.auditService.log({
      actor: this.auditActor(currentUser),
      action: 'ANONYMIZE',
      entity: 'Member',
      entityId: id,
      metadata: { fieldsCleared },
    });
    // Registros anteriores sobre este membro perdem os dados pessoais (M49)
    await this.auditService.pseudonymizeSubject({ memberId: id });

    return anonymized;
  }

  /** Campos pessoais apagados na anonimização — lista única dos dois caminhos (M16). */
  static readonly ANONYMIZED_FIELDS = [
    'fullName',
    'birthDate',
    'cpf',
    'rg',
    'gender',
    'maritalStatus',
    'occupation',
    'photoUrl',
    'email',
    'phone',
    'zipCode',
    'street',
    'number',
    'complement',
    'neighborhood',
    'city',
    'state',
    'notes',
    'emergencyContactName',
    'emergencyContactPhone',
    'emergencyContactRelation',
    'fatherName',
    'motherName',
    'spouseId',
    'consentGiven',
    'consentDate',
    'whatsappOptIn',
    'whatsappOptInAt',
    'titheReminderDay',
  ];

  /**
   * Anonimização ÚNICA do cadastro (M16), usada pela gestão (POST
   * /members/:id/anonymize) e pela exclusão da própria conta (DELETE
   * /users/me), dentro da transação de quem chama:
   * - limpa todos os campos pessoais (ANONYMIZED_FIELDS) e marca ANONYMIZED;
   * - encerra os vínculos: pastorais, coordenações, comunidades e pedidos de
   *   entrada em pastoral; as escalas FUTURAS viram recusa (a coordenação vê
   *   a vaga) — o histórico passado fica, sem identificar a pessoa;
   * - apaga disponibilidade, consentimentos, clientes no provedor de
   *   pagamento e os binários/dados extraídos dos documentos da catequese.
   * A pseudonimização da auditoria fica com quem chama (fora da transação).
   */
  async anonymizePersonalData(
    db: Prisma.TransactionClient,
    memberId: string,
    opts: { label?: string } = {},
  ) {
    const now = new Date();

    // Cônjuge: desfaz o vínculo dos dois lados (spouseId é @unique)
    await db.member.updateMany({ where: { spouseId: memberId }, data: { spouseId: null } });

    const anonymized = await db.member.update({
      where: { id: memberId },
      data: {
        fullName: opts.label ?? 'Usuário Anônimo',
        birthDate: null,
        cpf: null,
        rg: null,
        gender: null,
        maritalStatus: null,
        occupation: null,
        photoUrl: null,
        email: null,
        phone: null,
        zipCode: null,
        street: null,
        number: null,
        complement: null,
        neighborhood: null,
        city: null,
        state: null,
        notes: null,
        emergencyContactName: null,
        emergencyContactPhone: null,
        emergencyContactRelation: null,
        fatherName: null,
        motherName: null,
        spouseId: null,
        status: MemberStatus.ANONYMIZED,
        consentGiven: false,
        consentDate: null,
        whatsappOptIn: false,
        whatsappOptInAt: null,
        titheReminderDay: null,
      },
    });

    // Vínculos ativos encerrados: o "Usuário Anônimo" deixa de aparecer nas
    // listas de pastoral, coordenação e comunidade
    await db.pastoralMember.updateMany({
      where: { memberId, isActive: true },
      data: { isActive: false, leftAt: now },
    });
    await db.pastoralCoordinator.updateMany({
      where: { memberId, isCurrent: true },
      data: { isCurrent: false, endDate: now },
    });
    await db.memberCommunity.updateMany({
      where: { memberId, isActive: true },
      data: { isActive: false, leftAt: now, consentGiven: false, consentDate: null },
    });
    await db.pastoralJoinRequest.deleteMany({ where: { memberId, status: 'PENDING' } });
    await db.pastoralJoinRequest.updateMany({ where: { memberId }, data: { message: null } });

    // Escalas futuras ainda abertas: recusa registrada pelo sistema
    await db.scheduleAssignment.updateMany({
      where: {
        memberId,
        status: { in: [AssignmentStatus.PENDING, AssignmentStatus.CONFIRMED] },
        schedule: { date: { gte: now } },
      },
      data: {
        status: AssignmentStatus.DECLINED,
        declineReason: 'Cadastro removido (LGPD)',
        respondedAt: now,
      },
    });

    await db.memberAvailabilityRule.deleteMany({ where: { memberId } });
    await db.memberAvailabilityException.deleteMany({ where: { memberId } });
    await db.consent.deleteMany({ where: { memberId } });
    // Dízimo automático vivo no provedor: aqui só a marcação local (CANCELLED +
    // cancelamento pendente no provedor), antes de soltar o vínculo do cliente —
    // o cliente no provedor fica (histórico fiscal). A chamada ao provedor é de
    // quem chama, DEPOIS do commit: cancelTitheAtProviderAfterCommit()
    await this.titheSchedules?.cancelSchedulesForMember(memberId, db);
    await db.memberProviderCustomer.deleteMany({ where: { memberId } });

    // Catequese: certidões e o que a leitura automática extraiu delas
    await db.catechesisDocument.updateMany({
      where: { enrollment: { memberId } },
      data: { data: null, extractedName: null, extractedBirthDate: null },
    });

    return anonymized;
  }

  /**
   * Pós-commit da anonimização: cancela no provedor o dízimo automático que a
   * transação marcou como pendente. Nunca lança (roda sem prender a resposta);
   * o que falhar fica marcado e o job diário tenta de novo.
   */
  async cancelTitheAtProviderAfterCommit(memberId: string): Promise<void> {
    try {
      await this.titheSchedules?.cancelPendingAtProvider({ memberId });
    } catch {
      // registrado no próprio dízimo automático (ou o job pega amanhã)
    }
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
        throw new ForbiddenException('Você não tem permissão para consultar a disponibilidade deste membro');
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
        throw new ForbiddenException('Você não tem permissão para editar a disponibilidade deste membro');
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
      throw new NotFoundException('Usuário não possui cadastro de membro');
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
    // Detecção de duplicados é ferramenta de cadastro: só para a gestão
    if (currentUser && !this.isMemberManager(currentUser)) {
      return [];
    }

    const hierarchyFilter = currentUser
      ? this.hierarchyService.applyMemberFilter(currentUser)
      : {};

    const candidates = await this.prisma.member.findMany({
      where: {
        ...hierarchyFilter,
        deletedAt: null,
        status: { not: MemberStatus.ANONYMIZED },
        // Condições extras em AND: um `id` solto aqui sobrescreveria o filtro
        // de escopo (que pode ser o impossível `{ id: '__none__' }`)
        AND: [
          ...(input.communityId ? [{ communityId: input.communityId }] : []),
          ...(excludeId ? [{ id: { not: excludeId } }] : []),
        ],
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

    // Mesma regra da criação: destino no escopo de GESTÃO do ator (antes o
    // admin diocesano importava em qualquer paróquia do país)
    if (!(await this.canManageMembersIn(currentUser, communityId))) {
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

      // Pula duplicado por CPF/e-mail DENTRO do escopo do ator. Fora dele não
      // revela: CPF de outra paróquia cai no erro genérico da linha (índice
      // único nacional); e-mail repetido noutro lugar não impede o cadastro.
      const existing =
        (cpf && (await this.findMemberInActorScope({ cpf }, currentUser))) ||
        (email && (await this.findMemberInActorScope({ email }, currentUser)));
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
            // E.164 quando der (A23) — a adoção pelo app compara com o celular verificado
            phone: normalizeBrazilianPhone(row.phone) ?? this.normalizeOptionalString(row.phone),
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
  // do próprio escopo (comunidade/paróquia/diocese/pastorais). Fiel/voluntário
  // (se chegar aqui por chamada interna) só encontra o próprio e os dependentes.
  async searchByName(name: string, communityId?: string, currentUser?: CurrentUser) {
    const hierarchyFilter = currentUser
      ? this.hierarchyService.applyMemberFilter(await this.withSelfMember(currentUser))
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

    if (currentUser && !this.isMemberManager(currentUser)) {
      return this.prisma.member.findMany({
        where,
        select: this.basicMemberSelect,
        take: 20,
        orderBy: { fullName: 'asc' },
      });
    }

    // Busca da coordenação: identifica a pessoa (nome, foto, contato) sem o
    // cadastro completo — CPF, RG, endereço e notas ficam na ficha (B52)
    return this.prisma.member.findMany({
      where,
      select: {
        ...this.basicMemberSelect,
        photoUrl: true,
        phone: true,
        email: true,
      },
      take: 20,
      orderBy: {
        fullName: 'asc',
      },
    });
  }
}
