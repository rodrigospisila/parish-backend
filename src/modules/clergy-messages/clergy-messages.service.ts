import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ClergyMessageAudience, ClergyTitle, NotificationType, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService, CurrentUser } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Rótulo dinâmico da mensagem conforme o cargo eclesiástico do remetente.
 * Ex.: Bispo → "Palavra do Bispo"; sem cargo (coordenação leiga) → genérico.
 */
export function clergyMessageLabel(title?: ClergyTitle | null): string {
  switch (title) {
    case ClergyTitle.BISHOP:
      return 'Palavra do Bispo';
    case ClergyTitle.PRIEST:
      return 'Palavra do Pároco';
    case ClergyTitle.DEACON:
      return 'Palavra do Diácono';
    default:
      return 'Palavra Pastoral';
  }
}

/**
 * Palavra Pastoral — mensagens/vídeos do clero (Bispo, Pároco, Diácono).
 * O remetente escolhe a audiência: diocese inteira, paróquia inteira,
 * comunidade inteira, uma pastoral específica ou um membro específico.
 * O feed de cada usuário é calculado pelo alcance (escopo + pastorais do
 * membro vinculado + mensagens direcionadas a ele).
 */
@Injectable()
export class ClergyMessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private auditActor(user: CurrentUser) {
    return { id: user.id, email: user.email, role: user.role };
  }

  /** Papéis que podem publicar: bispo (diocesano), pároco (paróquia), diácono/coordenação (comunidade). */
  private canSend(role: UserRole) {
    return (
      role === UserRole.SYSTEM_ADMIN ||
      role === UserRole.DIOCESAN_ADMIN ||
      role === UserRole.PARISH_ADMIN ||
      role === UserRole.COMMUNITY_COORDINATOR
    );
  }

  // ===== PUBLICAÇÃO =====

  async create(
    dto: {
      title: string;
      body?: string;
      videoUrl?: string;
      senderTitle?: string;
      audience: ClergyMessageAudience;
      dioceseId?: string;
      parishId?: string;
      communityId?: string;
      communityPastoralId?: string;
      memberId?: string;
    },
    user: CurrentUser,
  ) {
    if (!this.canSend(user.role)) {
      throw new ForbiddenException('Somente o clero e a coordenação podem publicar mensagens');
    }
    if (!dto.title?.trim()) throw new BadRequestException('Título é obrigatório');
    if (!dto.body?.trim() && !dto.videoUrl?.trim()) {
      throw new BadRequestException('Informe a mensagem (texto) e/ou o link do vídeo');
    }

    const target = await this.resolveAndValidateTarget(dto, user);

    // Denormaliza o cargo do remetente no momento da publicação (rótulo estável)
    const sender = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { clergyTitle: true },
    });

    const message = await this.prisma.clergyMessage.create({
      data: {
        title: dto.title.trim(),
        body: dto.body?.trim() || null,
        videoUrl: dto.videoUrl?.trim() || null,
        senderUserId: user.id,
        senderTitle: dto.senderTitle?.trim() || null,
        senderClergyTitle: sender?.clergyTitle ?? null,
        audience: dto.audience,
        dioceseId: target.dioceseId ?? null,
        parishId: target.parishId ?? null,
        communityId: target.communityId ?? null,
        communityPastoralId: target.communityPastoralId ?? null,
        memberId: target.memberId ?? null,
      },
      include: this.messageInclude(),
    });

    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'CREATE',
      entity: 'ClergyMessage',
      entityId: message.id,
      metadata: { audience: dto.audience },
    });

    // Push para alvos pequenos (membro/pastoral/comunidade). Diocese/paróquia
    // inteira fica só no feed para evitar tempestade de notificações.
    this.notifyTargets(message.id, dto, user).catch(() => undefined);

    return this.withLabel(message);
  }

  /** Anexa o rótulo dinâmico (Palavra do Bispo/Pároco/Diácono) à mensagem. */
  private withLabel<T extends { senderClergyTitle?: ClergyTitle | null }>(message: T) {
    return { ...message, senderLabel: clergyMessageLabel(message.senderClergyTitle) };
  }

  async remove(id: string, user: CurrentUser) {
    const message = await this.prisma.clergyMessage.findFirst({ where: { id, deletedAt: null } });
    if (!message) throw new NotFoundException('Mensagem não encontrada');
    const isSender = message.senderUserId === user.id;
    const isAdmin = user.role === UserRole.SYSTEM_ADMIN || user.role === UserRole.DIOCESAN_ADMIN;
    if (!isSender && !isAdmin) {
      throw new ForbiddenException('Somente o autor (ou a administração) remove a mensagem');
    }
    const removed = await this.prisma.clergyMessage.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.auditService.log({ actor: this.auditActor(user), action: 'DELETE', entity: 'ClergyMessage', entityId: id });
    return removed;
  }

  /** Mensagens publicadas pelo próprio usuário (gestão). */
  async listMine(user: CurrentUser) {
    const messages = await this.prisma.clergyMessage.findMany({
      where: { senderUserId: user.id, deletedAt: null },
      include: this.messageInclude(),
      orderBy: { publishedAt: 'desc' },
    });
    return messages.map((message) => this.withLabel(message));
  }

  // ===== FEED =====

  /**
   * Feed do usuário: tudo que o alcança —
   * diocese/paróquia/comunidade em que está + pastorais do seu membro +
   * mensagens direcionadas ao seu membro + as que ele mesmo enviou.
   */
  async feed(user: CurrentUser, limit = 50, focusCommunityId?: string) {
    const member = await this.prisma.member.findFirst({
      where: { userId: user.id, deletedAt: null },
      select: {
        id: true,
        communityId: true,
        pastoralMemberships: {
          where: { isActive: true, leftAt: null, communityPastoralId: { not: null } },
          select: {
            communityPastoralId: true,
            communityPastoral: { select: { communityId: true } },
          },
        },
      },
    });

    const communityIds = new Set<string>();
    if (user.communityId) communityIds.add(user.communityId);
    if (member?.communityId) communityIds.add(member.communityId);
    for (const link of user.communities ?? []) {
      if ((link as any).isActive === false) continue;
      communityIds.add(link.communityId);
    }
    // Vínculos do MEMBRO (secundárias) também alcançam o feed
    if (member) {
      const memberLinks = await this.prisma.memberCommunity.findMany({
        where: { memberId: member.id, isActive: true },
        select: { communityId: true },
      });
      for (const link of memberLinks) communityIds.add(link.communityId);
    }

    // Comunidade em foco (multi-comunidade): restringe o alcance quando o
    // usuário pede uma comunidade à qual pertence
    const focusApplied = Boolean(focusCommunityId && communityIds.has(focusCommunityId));
    if (focusApplied) {
      communityIds.clear();
      communityIds.add(focusCommunityId!);
    }

    // Resolve paróquia/diocese a partir das comunidades quando o usuário não tem os ids no token
    let parishIds = new Set<string>();
    let dioceseIds = new Set<string>();
    if (!focusApplied) {
      if (user.parishId) parishIds.add(user.parishId);
      if (user.dioceseId) dioceseIds.add(user.dioceseId);
    }
    if (communityIds.size > 0) {
      const communities = await this.prisma.community.findMany({
        where: { id: { in: Array.from(communityIds) } },
        select: { parishId: true, parish: { select: { dioceseId: true } } },
      });
      for (const community of communities) {
        parishIds.add(community.parishId);
        dioceseIds.add(community.parish.dioceseId);
      }
    }

    // Com foco, só as pastorais DA comunidade em foco entram no alcance
    const pastoralIds = new Set<string>(focusApplied ? [] : (user.pastoralIds ?? []));
    for (const membership of member?.pastoralMemberships ?? []) {
      if (!membership.communityPastoralId) continue;
      if (
        focusApplied &&
        (membership as any).communityPastoral?.communityId !== focusCommunityId
      ) {
        continue;
      }
      pastoralIds.add(membership.communityPastoralId);
    }

    const reach: any[] = [{ senderUserId: user.id }];
    if (dioceseIds.size) reach.push({ audience: ClergyMessageAudience.DIOCESE, dioceseId: { in: Array.from(dioceseIds) } });
    if (parishIds.size) reach.push({ audience: ClergyMessageAudience.PARISH, parishId: { in: Array.from(parishIds) } });
    if (communityIds.size) reach.push({ audience: ClergyMessageAudience.COMMUNITY, communityId: { in: Array.from(communityIds) } });
    if (pastoralIds.size) reach.push({ audience: ClergyMessageAudience.PASTORAL, communityPastoralId: { in: Array.from(pastoralIds) } });
    if (member) reach.push({ audience: ClergyMessageAudience.MEMBER, memberId: member.id });

    const messages = await this.prisma.clergyMessage.findMany({
      where: { deletedAt: null, OR: reach },
      include: this.messageInclude(),
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });
    return messages.map((message) => this.withLabel(message));
  }

  // ===== HELPERS =====

  private messageInclude() {
    return {
      sender: { select: { id: true, name: true, role: true } },
      diocese: { select: { id: true, name: true } },
      parish: { select: { id: true, name: true } },
      community: { select: { id: true, name: true } },
      communityPastoral: {
        select: { id: true, globalPastoral: { select: { name: true } } },
      },
      member: { select: { id: true, fullName: true } },
    } as const;
  }

  /** Valida a audiência e o alvo conforme o papel/escopo do remetente. */
  private async resolveAndValidateTarget(
    dto: {
      audience: ClergyMessageAudience;
      dioceseId?: string;
      parishId?: string;
      communityId?: string;
      communityPastoralId?: string;
      memberId?: string;
    },
    user: CurrentUser,
  ) {
    const isSystem = user.role === UserRole.SYSTEM_ADMIN;

    switch (dto.audience) {
      case ClergyMessageAudience.DIOCESE: {
        const dioceseId = dto.dioceseId ?? user.dioceseId;
        if (!dioceseId) throw new BadRequestException('dioceseId é obrigatório para audiência DIOCESE');
        if (!isSystem && (user.role !== UserRole.DIOCESAN_ADMIN || user.dioceseId !== dioceseId)) {
          throw new ForbiddenException('Somente o bispo/administração diocesana fala à diocese inteira');
        }
        return { dioceseId };
      }

      case ClergyMessageAudience.PARISH: {
        const parishId = dto.parishId ?? user.parishId;
        if (!parishId) throw new BadRequestException('parishId é obrigatório para audiência PARISH');
        if (!isSystem) {
          const parish = await this.prisma.parish.findUnique({
            where: { id: parishId },
            select: { id: true, dioceseId: true },
          });
          if (!parish) throw new NotFoundException('Paróquia não encontrada');
          const allowed =
            (user.role === UserRole.DIOCESAN_ADMIN && user.dioceseId === parish.dioceseId) ||
            (user.role === UserRole.PARISH_ADMIN && user.parishId === parish.id);
          if (!allowed) throw new ForbiddenException('Paróquia fora do seu escopo');
        }
        return { parishId };
      }

      case ClergyMessageAudience.COMMUNITY: {
        const communityId = dto.communityId ?? user.communityId;
        if (!communityId) throw new BadRequestException('communityId é obrigatório para audiência COMMUNITY');
        if (!isSystem) {
          const inScope = await this.hierarchyService.isCommunityInScope(user, communityId);
          if (!inScope) throw new ForbiddenException('Comunidade fora do seu escopo');
        }
        return { communityId };
      }

      case ClergyMessageAudience.PASTORAL: {
        if (!dto.communityPastoralId) {
          throw new BadRequestException('communityPastoralId é obrigatório para audiência PASTORAL');
        }
        const pastoral = await this.prisma.communityPastoral.findFirst({
          where: { id: dto.communityPastoralId, deletedAt: null },
          select: { id: true, communityId: true },
        });
        if (!pastoral) throw new NotFoundException('Pastoral não encontrada');
        if (!isSystem) {
          const inScope = await this.hierarchyService.isCommunityInScope(user, pastoral.communityId);
          if (!inScope) throw new ForbiddenException('Pastoral fora do seu escopo');
        }
        return { communityPastoralId: pastoral.id };
      }

      case ClergyMessageAudience.MEMBER: {
        if (!dto.memberId) throw new BadRequestException('memberId é obrigatório para audiência MEMBER');
        const member = await this.prisma.member.findFirst({
          where: { id: dto.memberId, deletedAt: null },
          select: { id: true, communityId: true },
        });
        if (!member) throw new NotFoundException('Membro não encontrado');
        if (!isSystem) {
          const inScope = await this.hierarchyService.isCommunityInScope(user, member.communityId);
          if (!inScope) throw new ForbiddenException('Membro fora do seu escopo');
        }
        return { memberId: member.id };
      }

      default:
        throw new BadRequestException('Audiência inválida');
    }
  }

  /** Notifica push os alvos pequenos (membro, pastoral, comunidade). */
  private async notifyTargets(
    messageId: string,
    dto: {
      title: string;
      audience: ClergyMessageAudience;
      communityId?: string;
      communityPastoralId?: string;
      memberId?: string;
      senderTitle?: string;
    },
    user: CurrentUser,
  ) {
    let userIds: string[] = [];

    if (dto.audience === ClergyMessageAudience.MEMBER && dto.memberId) {
      const member = await this.prisma.member.findUnique({
        where: { id: dto.memberId },
        select: { userId: true },
      });
      if (member?.userId) userIds = [member.userId];
    } else if (dto.audience === ClergyMessageAudience.PASTORAL && dto.communityPastoralId) {
      const memberships = await this.prisma.pastoralMember.findMany({
        where: { communityPastoralId: dto.communityPastoralId, isActive: true, leftAt: null },
        select: { member: { select: { userId: true } } },
      });
      userIds = memberships.map((m) => m.member.userId).filter((id): id is string => Boolean(id));
    } else if (dto.audience === ClergyMessageAudience.COMMUNITY && dto.communityId) {
      const users = await this.prisma.user.findMany({
        where: {
          isActive: true,
          OR: [
            { communityId: dto.communityId },
            { communities: { some: { communityId: dto.communityId, isActive: true } } },
          ],
        },
        select: { id: true },
      });
      userIds = users.map((u) => u.id);
    }

    userIds = userIds.filter((id) => id !== user.id);
    if (!userIds.length) return;

    const sender = dto.senderTitle?.trim() || 'Palavra do Pastor';
    await this.notificationsService.notifyUsers(
      userIds,
      NotificationType.CLERGY_MESSAGE,
      `📜 ${sender}`,
      dto.title,
      { clergyMessageId: messageId },
    );
  }
}
