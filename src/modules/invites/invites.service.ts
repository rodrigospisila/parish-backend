import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConsentType, NotificationType, ParishClaimStatus, Prisma, UserInvite, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../common/audit.service';
import { HierarchyService } from '../../common/hierarchy.service';
import { UsersService, InviteGrant } from '../users/users.service';
import { AuthService } from '../auth/auth.service';
import type { LoginMeta } from '../auth/session-security.service';
import { EmailService } from '../messaging/email.service';
import { normalizeBrazilianPhone } from '../messaging/log-mask';
import { NotificationsService } from '../notifications/notifications.service';
import { ConsentsService } from '../consents/consents.service';
import { MEMBER_ELIGIBLE_ROLES } from '../members/members.service';
import { emailInsensitive, normalizeEmail } from '../auth/email-lookup';
import { findUserIdsByPhoneDigits } from '../auth/phone-lookup';
import { isAdoptableCandidate, isResponsiblePlaceholder } from '../auth/phone-adoption';
import { CreateInviteDto, ListInvitesQueryDto } from './dto/create-invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import {
  generateInviteToken,
  hashInviteToken,
  INVITE_TTL_MS,
  inviteRoleLabel,
  inviteStatus,
  inviteStatusWhere,
  inviteUrl,
  inviteWhatsappText,
  isHolderInvite,
  isWellFormedInviteToken,
  maskInviteEmail,
  maskInvitePhone,
  technicalEmailForPhone,
} from './invite-token';

/** Papéis que se convidam por link. Coordenação de pastoral exige as pastorais (fica no POST /users). */
const INVITABLE_ROLES: UserRole[] = [
  UserRole.DIOCESAN_ADMIN,
  UserRole.PARISH_ADMIN,
  UserRole.COMMUNITY_COORDINATOR,
  UserRole.VOLUNTEER,
  UserRole.FAITHFUL,
];

/** Papéis cujo convite precisa de comunidade (a conta nasce nela). */
const COMMUNITY_ROLES: UserRole[] = [UserRole.COMMUNITY_COORDINATOR, UserRole.VOLUNTEER, UserRole.FAITHFUL];

/** Contas existentes que podem receber o papel do convite com o Bearer. */
const UPGRADABLE_ROLES: UserRole[] = [UserRole.FAITHFUL, UserRole.VOLUNTEER];

export const INVITE_GONE_MESSAGES = {
  invalid: 'Convite inválido. Confira o link ou peça um convite novo a quem convidou você.',
  accepted: 'Este convite já foi usado. Entre no Parish com o seu e-mail ou celular e a senha que você criou.',
  revoked: 'Este convite foi cancelado. Peça um convite novo a quem convidou você.',
  expired: 'Este convite venceu. Peça a quem convidou você para reenviar o convite.',
} as const;

interface NameMaps {
  parishes: Map<string, string>;
  dioceses: Map<string, string>;
  communities: Map<string, string>;
  users: Map<string, string>;
}

/** Corpo devolvido na criação e no reenvio: o token só aparece aqui (no link). */
export interface IssuedInvite {
  invite: Record<string, unknown>;
  url: string;
  whatsappText: string;
  expiresAt: Date;
  emailSent: boolean;
}

@Injectable()
export class InvitesService {
  private readonly logger = new Logger(InvitesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly users: UsersService,
    private readonly auth: AuthService,
    private readonly hierarchy: HierarchyService,
    private readonly audit: AuditService,
    private readonly email: EmailService,
    private readonly notifications: NotificationsService,
    private readonly consents: ConsentsService,
  ) {}

  private get webBase(): string {
    return this.config.get<string>('PUBLIC_WEB_URL') ?? '';
  }

  // ------------------------------------------------------------------
  // Gestão (logado)
  // ------------------------------------------------------------------

  /**
   * POST /invites — quem convida precisa poder CRIAR um usuário com aquele
   * papel e escopo (mesma régua do POST /users: UsersService.resolveCreationScope).
   * `holder` (titular) só pelo SYSTEM_ADMIN ou pelo titular da paróquia.
   */
  async create(dto: CreateInviteDto, actor: any): Promise<IssuedInvite> {
    const role = dto.role;
    if (role === UserRole.SYSTEM_ADMIN) {
      throw new ForbiddenException('Administração do sistema não é convidada por link');
    }
    if (role === UserRole.PASTORAL_COORDINATOR) {
      throw new BadRequestException(
        'Coordenação de pastoral não tem convite por link: convide a pessoa como voluntário(a) e depois nomeie a coordenação na pastoral',
      );
    }
    if (!INVITABLE_ROLES.includes(role)) {
      throw new BadRequestException('Papel inválido para convite');
    }

    const holder = dto.holder === true;
    if (holder) {
      if (role !== UserRole.PARISH_ADMIN) {
        throw new BadRequestException('Titular só se convida como administrador(a) paroquial');
      }
      if (actor?.role !== UserRole.SYSTEM_ADMIN && !(await this.users.isParishHolder(actor))) {
        throw new ForbiddenException('Só a administração do sistema ou o titular da paróquia convidam um titular');
      }
    }

    // Cadastro de membro (sem conta) que a pessoa vai assumir
    let communityId: string | null = dto.communityId?.trim() || null;
    let member: {
      id: string;
      fullName: string;
      email: string | null;
      phone: string | null;
      communityId: string;
    } | null = null;
    if (dto.memberId) {
      if (!MEMBER_ELIGIBLE_ROLES.includes(role)) {
        throw new BadRequestException(
          'Convite ligado a um cadastro de membro só vale para coordenação de comunidade, voluntário(a) ou membro',
        );
      }
      const found = await this.prisma.member.findFirst({
        where: { id: dto.memberId, deletedAt: null },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          userId: true,
          communityId: true,
          responsibleId: true,
          birthDate: true,
        },
      });
      if (!found) throw new NotFoundException('Membro não encontrado');
      if (!(await this.hierarchy.canManageMember(actor.id, found.id))) {
        throw new ForbiddenException('Este membro não está no seu escopo');
      }
      if (found.userId) throw new ConflictException('Este membro já tem acesso ao Parish');
      if (!isAdoptableCandidate(found)) {
        throw new BadRequestException('Cadastro de dependente ou de menor de idade não recebe convite de acesso');
      }
      if (communityId && communityId !== found.communityId) {
        throw new BadRequestException('O membro é de outra comunidade');
      }
      communityId = found.communityId;
      member = found;
    }

    // O POST /users exige diocese + paróquia para PARISH_ADMIN; aqui a diocese
    // sai da paróquia informada (o convite pede só a paróquia)
    const parishId = dto.parishId?.trim() || null;
    let dioceseId = dto.dioceseId?.trim() || null;
    if (parishId && !dioceseId) {
      const parish = await this.prisma.parish.findUnique({
        where: { id: parishId },
        select: { dioceseId: true },
      });
      if (!parish) throw new NotFoundException('Paróquia não encontrada');
      dioceseId = parish.dioceseId;
    }

    const scope = await this.users.resolveCreationScope(actor, {
      role,
      dioceseId,
      parishId,
      communityId,
      communityIds: role === UserRole.COMMUNITY_COORDINATOR && communityId ? [communityId] : undefined,
    });
    if (COMMUNITY_ROLES.includes(role) && !scope.communityId) {
      throw new BadRequestException('Informe a comunidade do convite');
    }
    if (role === UserRole.PARISH_ADMIN && !scope.parishId) {
      throw new BadRequestException('Informe a paróquia do convite');
    }
    if (role === UserRole.DIOCESAN_ADMIN && !scope.dioceseId) {
      throw new BadRequestException('Informe a diocese do convite');
    }
    if (member && scope.communityId !== member.communityId) {
      throw new BadRequestException('O membro é de outra comunidade');
    }

    const email = dto.email?.trim()
      ? normalizeEmail(dto.email)
      : member?.email?.trim()
        ? normalizeEmail(member.email)
        : null;
    let phone: string | null = null;
    if (dto.phone?.trim()) {
      phone = normalizeBrazilianPhone(dto.phone);
      if (!phone)
        throw new BadRequestException('Celular inválido — informe o DDD e o número, por exemplo (42) 99999-8888');
    } else if (member?.phone) {
      phone = normalizeBrazilianPhone(member.phone);
    }
    const name =
      dto.name?.trim() ||
      (member && !isResponsiblePlaceholder(member.fullName) ? member.fullName.trim() : null) ||
      null;

    const grantScope = {
      dioceseId: scope.dioceseId ?? null,
      parishId: role === UserRole.DIOCESAN_ADMIN ? null : (scope.parishId ?? null),
      communityId: role === UserRole.DIOCESAN_ADMIN ? null : (scope.communityId ?? null),
    };

    await this.assertNoPendingDuplicate({
      email,
      phone,
      memberId: member?.id ?? null,
      ...grantScope,
    });

    const token = generateInviteToken();
    const now = new Date();
    const invite = await this.prisma.userInvite.create({
      data: {
        holder,
        tokenHash: hashInviteToken(token),
        role,
        ...grantScope,
        memberId: member?.id ?? null,
        name,
        email,
        phone,
        invitedByUserId: actor.id,
        expiresAt: new Date(now.getTime() + INVITE_TTL_MS),
        lastSentAt: now,
      },
    });

    await this.audit.log({
      actor: { id: actor.id, email: actor.email, role: actor.role },
      action: 'CREATE',
      entity: 'UserInvite',
      entityId: invite.id,
      after: {
        role,
        holder,
        ...grantScope,
        memberId: invite.memberId,
        email,
        phone,
      },
    });

    return this.issue(invite, token);
  }

  /** GET /invites — convites do escopo de quem lista (negar por padrão). */
  async list(query: ListInvitesQueryDto, actor: any) {
    const now = new Date();
    const and: Prisma.UserInviteWhereInput[] = [];
    switch (actor?.role) {
      case UserRole.SYSTEM_ADMIN:
        break;
      case UserRole.DIOCESAN_ADMIN:
        if (!actor.dioceseId) return [];
        and.push({ dioceseId: actor.dioceseId });
        break;
      case UserRole.PARISH_ADMIN:
        if (!actor.parishId) return [];
        and.push({ parishId: actor.parishId });
        break;
      case UserRole.COMMUNITY_COORDINATOR: {
        const ids = await this.hierarchy.getCommunityScopeIds(actor);
        if (!ids.length) return [];
        // Coordenação só enxerga convites de papel abaixo do seu (os que poderia criar)
        and.push({
          communityId: { in: ids },
          role: { in: [UserRole.VOLUNTEER, UserRole.FAITHFUL] },
        });
        break;
      }
      default:
        throw new ForbiddenException('Somente a administração e a coordenação de comunidade gerenciam convites');
    }
    if (query.parishId) and.push({ parishId: query.parishId });
    if (query.communityId) and.push({ communityId: query.communityId });
    if (query.status) and.push(inviteStatusWhere(query.status, now));

    const rows = await this.prisma.userInvite.findMany({
      where: and.length ? { AND: and } : {},
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    const names = await this.loadNames(rows);
    return rows.map((row) => this.serialize(row, names, now));
  }

  /** POST /invites/:id/resend — token e prazo novos (o link anterior deixa de valer). */
  async resend(id: string, actor: any): Promise<IssuedInvite> {
    const invite = await this.findManageable(id, actor);
    const status = inviteStatus(invite);
    if (status === 'ACCEPTED') throw new ConflictException('Este convite já foi aceito');
    if (status === 'REVOKED') throw new ConflictException('Este convite foi cancelado — crie um convite novo');

    const token = generateInviteToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + INVITE_TTL_MS);
    const { count } = await this.prisma.userInvite.updateMany({
      where: { id, acceptedAt: null, revokedAt: null },
      data: { tokenHash: hashInviteToken(token), expiresAt, lastSentAt: now },
    });
    if (count === 0) throw new ConflictException('O convite mudou agora há pouco — atualize a lista');

    await this.audit.log({
      actor: { id: actor.id, email: actor.email, role: actor.role },
      action: 'UPDATE',
      entity: 'UserInvite',
      entityId: id,
      metadata: { resent: true },
    });
    return this.issue(
      {
        ...invite,
        tokenHash: hashInviteToken(token),
        expiresAt,
        lastSentAt: now,
      },
      token,
    );
  }

  /** DELETE /invites/:id — cancela (o link deixa de valer). Idempotente. */
  async revoke(id: string, actor: any) {
    const invite = await this.findManageable(id, actor);
    if (invite.acceptedAt) {
      throw new ConflictException('Este convite já foi aceito — para tirar o acesso, use a tela de Usuários');
    }
    if (invite.revokedAt) return { revoked: true, revokedAt: invite.revokedAt };
    const now = new Date();
    const { count } = await this.prisma.userInvite.updateMany({
      where: { id, acceptedAt: null, revokedAt: null },
      data: { revokedAt: now },
    });
    if (count === 0) throw new ConflictException('O convite mudou agora há pouco — atualize a lista');
    await this.audit.log({
      actor: { id: actor.id, email: actor.email, role: actor.role },
      action: 'UPDATE',
      entity: 'UserInvite',
      entityId: id,
      metadata: { revoked: true },
    });
    return { revoked: true, revokedAt: now };
  }

  // ------------------------------------------------------------------
  // Público (link do convite)
  // ------------------------------------------------------------------

  /** GET /public/invites/:token — o que a tela de aceite mostra (contato mascarado). */
  async getPublic(token: string) {
    const invite = await this.findUsableByToken(token);
    const names = await this.loadNames([invite]);
    const holder = isHolderInvite(invite);
    return {
      role: invite.role,
      roleLabel: inviteRoleLabel(invite.role, holder),
      holder,
      parishName: invite.parishId ? (names.parishes.get(invite.parishId) ?? null) : null,
      communityName: invite.communityId ? (names.communities.get(invite.communityId) ?? null) : null,
      dioceseName: invite.dioceseId ? (names.dioceses.get(invite.dioceseId) ?? null) : null,
      name: invite.name,
      emailMasked: maskInviteEmail(invite.email),
      phoneMasked: maskInvitePhone(invite.phone),
      expiresAt: invite.expiresAt,
    };
  }

  /**
   * POST /public/invites/:token/accept — cria a conta (ou, com o Bearer de
   * um fiel/voluntário cujo e-mail ou celular bate com o do convite, aplica o
   * papel nela) e devolve o MESMO corpo do POST /auth/login.
   *
   * Uso único: o convite é consumido por gravação condicional DENTRO da
   * transação que cria a conta — de dois aceites simultâneos, só um passa (o
   * outro espera a trava da linha, encontra o convite já usado e recebe 410).
   */
  async accept(token: string, dto: AcceptInviteDto, actor: any | null, meta: LoginMeta = {}) {
    const invite = await this.findUsableByToken(token);
    const holder = isHolderInvite(invite);
    const grant: InviteGrant = {
      role: invite.role,
      dioceseId: invite.dioceseId,
      parishId: invite.parishId,
      communityId: invite.communityId,
      memberId: invite.memberId,
      holder,
    };
    await this.assertGrantTargetsExist(grant);

    const name = dto.name.trim();
    const acceptedAt = new Date();
    let userId: string;
    let createdAccount = false;

    if (actor?.id) {
      userId = await this.acceptWithExistingAccount(invite, grant, actor, acceptedAt);
    } else {
      userId = await this.acceptWithNewAccount(invite, grant, dto, name, acceptedAt);
      createdAccount = true;
    }

    await this.audit.log({
      actor: { id: userId },
      action: createdAccount ? 'REGISTER' : 'UPDATE',
      entity: 'User',
      entityId: userId,
      after: {
        role: invite.role,
        parishId: invite.parishId,
        communityId: invite.communityId,
        holder,
      },
      metadata: {
        viaInvite: invite.id,
        termsAccepted: true,
        ...(createdAccount ? {} : { existingAccount: true }),
      },
    });

    // Quem convidou fica sabendo (best-effort; nunca derruba o aceite)
    void this.notifications
      .notifyUser(
        invite.invitedByUserId,
        NotificationType.TEAM_BROADCAST,
        'Convite aceito',
        `${name} aceitou o convite e já entrou no Parish como ${inviteRoleLabel(invite.role, holder).toLowerCase()}.`,
        { kind: 'INVITE_ACCEPTED', inviteId: invite.id, userId },
      )
      .catch(() => undefined);

    return this.auth.issueLoginSession(userId, meta);
  }

  /** Conta nova: e-mail/celular, senha própria, termos aceitos. */
  private async acceptWithNewAccount(
    invite: UserInvite,
    grant: InviteGrant,
    dto: AcceptInviteDto,
    name: string,
    acceptedAt: Date,
  ): Promise<string> {
    if (!dto.password) {
      throw new BadRequestException('Crie uma senha com pelo menos 8 caracteres');
    }

    // O e-mail que a pessoa informa vale mais que o do convite (é o login dela)
    const bodyEmail = dto.email?.trim() ? normalizeEmail(dto.email) : null;
    let bodyPhone: string | null = null;
    if (dto.phone?.trim()) {
      bodyPhone = normalizeBrazilianPhone(dto.phone);
      if (!bodyPhone) {
        throw new BadRequestException('Celular inválido — informe o DDD e o número, por exemplo (42) 99999-8888');
      }
    }
    // O celular do convite foi informado pela gestão: não é trocado no aceite
    // (um número digitado aqui ocuparia o de outra pessoa sem confirmação)
    if (invite.phone && bodyPhone && bodyPhone !== invite.phone) {
      throw new BadRequestException(
        'O celular é o do convite. Se estiver errado, peça a quem convidou você para corrigir e reenviar o convite.',
      );
    }
    const email = bodyEmail ?? (invite.email ? normalizeEmail(invite.email) : null);
    const phone = invite.phone ?? bodyPhone;
    if (!email && !phone) {
      throw new BadRequestException('Informe um e-mail ou um celular — é com ele que você vai entrar no Parish');
    }
    // Só celular: e-mail técnico não roteável (User.email é obrigatório e único)
    const finalEmail = email ?? technicalEmailForPhone(phone!);

    const emailTaken = await this.prisma.user.findFirst({
      where: { email: emailInsensitive(finalEmail) },
      select: { id: true },
    });
    if (emailTaken) {
      throw new ConflictException(
        email
          ? 'Este e-mail já tem conta no Parish. Entre com ele e abra o link do convite de novo para receber o acesso.'
          : 'Este celular já tem conta no Parish. Entre com ele e abra o link do convite de novo para receber o acesso.',
      );
    }
    if (phone && (await this.isPhoneTaken(phone))) {
      throw new ConflictException(
        'Este celular já tem conta no Parish. Entre com ele e abra o link do convite de novo para receber o acesso.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.consume(tx, invite, acceptedAt);
        const { userId, memberId } = await this.users.createAccountFromInvite(tx, {
          grant,
          name,
          email: finalEmail,
          phone,
          passwordHash,
          acceptedAt,
        });
        await this.finishAcceptance(tx, invite, userId, memberId, acceptedAt);
        return userId;
      });
    } catch (error) {
      // Corrida com outro cadastro do mesmo e-mail/celular (índice único)
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(
          'Este e-mail ou celular acabou de ser usado em outra conta. Entre com ele e abra o link de novo.',
        );
      }
      throw error;
    }
  }

  /** Conta existente (Bearer): só fiel/voluntário, com o e-mail ou celular do convite. */
  private async acceptWithExistingAccount(
    invite: UserInvite,
    grant: InviteGrant,
    actor: any,
    acceptedAt: Date,
  ): Promise<string> {
    if (!UPGRADABLE_ROLES.includes(actor.role)) {
      throw new ConflictException(
        'Sua conta já tem um papel de gestão no Parish. Peça a quem convidou você para ajustar o seu acesso na tela de Usuários.',
      );
    }
    const account = await this.prisma.user.findUnique({
      where: { id: actor.id },
      select: { id: true, email: true, phone: true, isActive: true },
    });
    if (!account || !account.isActive) throw new ForbiddenException('Conta inativa');
    const sameEmail = !!invite.email && account.email.trim().toLowerCase() === invite.email.trim().toLowerCase();
    const samePhone = !!invite.phone && !!account.phone && normalizeBrazilianPhone(account.phone) === invite.phone;
    if (!sameEmail && !samePhone) {
      throw new ForbiddenException(
        'Este convite foi enviado para outro e-mail ou celular. Saia da sua conta para criar um acesso novo pelo link, ou peça um convite no seu e-mail ou celular.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await this.consume(tx, invite, acceptedAt);
      const { memberId } = await this.users.applyGrantToExistingAccount(tx, account.id, grant, { acceptedAt });
      await this.finishAcceptance(tx, invite, account.id, memberId, acceptedAt);
    });
    return account.id;
  }

  /** Gravação condicional: só um aceite consome o convite. */
  private async consume(tx: Prisma.TransactionClient, invite: UserInvite, now: Date) {
    const { count } = await tx.userInvite.updateMany({
      where: {
        id: invite.id,
        tokenHash: invite.tokenHash,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: { acceptedAt: now },
    });
    if (count === 0) throw new GoneException(INVITE_GONE_MESSAGES.accepted);
  }

  /** Depois da conta: quem aceitou, consentimento LGPD do cadastro, reivindicação e paróquia gerida. */
  private async finishAcceptance(
    tx: Prisma.TransactionClient,
    invite: UserInvite,
    userId: string,
    memberId: string | null,
    now: Date,
  ) {
    await tx.userInvite.update({
      where: { id: invite.id },
      data: { acceptedUserId: userId },
      select: { id: true },
    });
    if (memberId) {
      await this.consents.grantInitialConsents(tx, memberId, userId, [ConsentType.DATA_PROCESSING]);
    }
    if (isHolderInvite(invite) && invite.parishId) {
      // Reivindicação aprovada SEM conta que gerou este convite: mesma paróquia
      // e o e-mail do pedido (o convite nasce com ele — createClaimHolderInvite)
      if (invite.email) {
        await tx.parishClaim.updateMany({
          where: {
            parishId: invite.parishId,
            status: ParishClaimStatus.APPROVED,
            userId: null,
            grantedUserId: null,
            email: emailInsensitive(invite.email),
          },
          data: { grantedUserId: userId },
        });
      }
      // Titular entrou: a paróquia passa a ser gerida no Parish (se ainda não era)
      await tx.parish.updateMany({
        where: { id: invite.parishId, managedAt: null },
        data: { managedAt: now },
      });
    }
  }

  // ------------------------------------------------------------------
  // Reivindicação aprovada (C1) sem conta: convite de titular
  // ------------------------------------------------------------------

  /**
   * Convite PARISH_ADMIN titular criado na aprovação da reivindicação (dentro
   * da transação dela), com o e-mail do pedido — é por ele (e pela paróquia)
   * que o aceite encontra a reivindicação e grava quem recebeu a gestão.
   */
  async createClaimHolderInvite(
    tx: Prisma.TransactionClient,
    params: {
      parish: { id: string; name: string; dioceseId: string };
      name: string;
      email: string;
      phone: string | null;
      invitedByUserId: string;
    },
  ) {
    const token = generateInviteToken();
    const now = new Date();
    const invite = await tx.userInvite.create({
      data: {
        holder: true,
        tokenHash: hashInviteToken(token),
        role: UserRole.PARISH_ADMIN,
        dioceseId: params.parish.dioceseId,
        parishId: params.parish.id,
        communityId: null,
        name: params.name,
        email: normalizeEmail(params.email),
        phone: params.phone ? normalizeBrazilianPhone(params.phone) : null,
        invitedByUserId: params.invitedByUserId,
        expiresAt: new Date(now.getTime() + INVITE_TTL_MS),
        lastSentAt: now,
      },
    });
    const url = inviteUrl(this.webBase, token);
    const whatsappText = inviteWhatsappText({
      name: params.name,
      orgName: params.parish.name,
      role: UserRole.PARISH_ADMIN,
      holder: true,
      url,
    });
    return {
      invite: this.serialize(invite, emptyNames(), now),
      url,
      whatsappText,
      expiresAt: invite.expiresAt,
    };
  }

  /** E-mail do convite (best-effort; sem SMTP o link copiável segue valendo). */
  async sendInviteEmail(to: string | null, whatsappText: string, expiresAt: Date): Promise<boolean> {
    if (!to) return false;
    const until = expiresAt.toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
    });
    const text = `${whatsappText}\n\nO link vale até ${until} e só pode ser usado uma vez. Se você não esperava este convite, ignore este e-mail.`;
    return this.email.trySend(to, 'Convite para a equipe no Parish', text);
  }

  // ------------------------------------------------------------------
  // Apoio
  // ------------------------------------------------------------------

  private async issue(invite: UserInvite, token: string): Promise<IssuedInvite> {
    const names = await this.loadNames([invite]);
    const url = inviteUrl(this.webBase, token);
    const orgName =
      (invite.parishId && names.parishes.get(invite.parishId)) ||
      (invite.dioceseId && names.dioceses.get(invite.dioceseId)) ||
      null;
    const whatsappText = inviteWhatsappText({
      name: invite.name,
      orgName,
      role: invite.role,
      holder: isHolderInvite(invite),
      url,
    });
    const emailSent = await this.sendInviteEmail(invite.email, whatsappText, invite.expiresAt);
    return {
      invite: this.serialize(invite, names),
      url,
      whatsappText,
      expiresAt: invite.expiresAt,
      emailSent,
    };
  }

  /** Convite pelo token do link; inválido, usado, cancelado ou vencido → 410 com a mensagem. */
  private async findUsableByToken(token: string): Promise<UserInvite> {
    if (!isWellFormedInviteToken(token)) throw new GoneException(INVITE_GONE_MESSAGES.invalid);
    const invite = await this.prisma.userInvite.findUnique({
      where: { tokenHash: hashInviteToken(token) },
    });
    if (!invite) throw new GoneException(INVITE_GONE_MESSAGES.invalid);
    const status = inviteStatus(invite);
    if (status === 'ACCEPTED') throw new GoneException(INVITE_GONE_MESSAGES.accepted);
    if (status === 'REVOKED') throw new GoneException(INVITE_GONE_MESSAGES.revoked);
    if (status === 'EXPIRED') throw new GoneException(INVITE_GONE_MESSAGES.expired);
    return invite;
  }

  /** A paróquia/comunidade do convite ainda existe (arquivada depois do envio → 410). */
  private async assertGrantTargetsExist(grant: InviteGrant) {
    if (grant.communityId) {
      const community = await this.prisma.community.findFirst({
        where: { id: grant.communityId, deletedAt: null },
        select: { id: true },
      });
      if (!community) throw new GoneException('A comunidade deste convite não está mais ativa. Peça um convite novo.');
    }
    if (grant.parishId) {
      const parish = await this.prisma.parish.findUnique({
        where: { id: grant.parishId },
        select: { id: true },
      });
      if (!parish) throw new GoneException('A paróquia deste convite não existe mais. Peça um convite novo.');
    }
  }

  /**
   * Reenviar/cancelar: SYSTEM_ADMIN; convite de titular só o titular da
   * paróquia; os demais, quem poderia CRIAR aquele convite hoje (mesma régua,
   * e o escopo resolvido tem de ser o do convite).
   */
  private async findManageable(id: string, actor: any): Promise<UserInvite> {
    const invite = await this.prisma.userInvite.findUnique({ where: { id } });
    if (!invite) throw new NotFoundException('Convite não encontrado');
    if (actor?.role === UserRole.SYSTEM_ADMIN) return invite;

    if (isHolderInvite(invite)) {
      if (!(await this.users.isParishHolder(actor)) || actor.parishId !== invite.parishId) {
        throw new ForbiddenException('Só a administração do sistema ou o titular da paróquia gerenciam este convite');
      }
      return invite;
    }

    const scope = await this.users.resolveCreationScope(actor, {
      role: invite.role,
      dioceseId: invite.dioceseId,
      parishId: invite.parishId,
      communityId: invite.communityId,
      communityIds:
        invite.role === UserRole.COMMUNITY_COORDINATOR && invite.communityId ? [invite.communityId] : undefined,
    });
    const sameScope =
      (!invite.dioceseId || scope.dioceseId === invite.dioceseId) &&
      (!invite.parishId || scope.parishId === invite.parishId) &&
      (!invite.communityId || scope.communityId === invite.communityId);
    if (!sameScope) throw new ForbiddenException('Este convite não está no seu escopo');
    return invite;
  }

  /** Um convite vigente por pessoa no mesmo escopo: o segundo vira "Reenviar". */
  private async assertNoPendingDuplicate(target: {
    email: string | null;
    phone: string | null;
    memberId: string | null;
    dioceseId: string | null;
    parishId: string | null;
  }) {
    const who: Prisma.UserInviteWhereInput[] = [];
    if (target.email) who.push({ email: emailInsensitive(target.email) });
    if (target.phone) who.push({ phone: target.phone });
    if (target.memberId) who.push({ memberId: target.memberId });
    if (!who.length) return;
    const pending = await this.prisma.userInvite.findFirst({
      where: {
        ...inviteStatusWhere('PENDING'),
        ...(target.parishId ? { parishId: target.parishId } : { dioceseId: target.dioceseId }),
        OR: who,
      },
      select: { id: true },
    });
    if (pending) {
      throw new ConflictException(
        'Já existe um convite pendente para esta pessoa — use Reenviar ou cancele o anterior',
      );
    }
  }

  private async isPhoneTaken(phone: string): Promise<boolean> {
    const exact = await this.prisma.user.findUnique({
      where: { phone },
      select: { id: true },
    });
    if (exact) return true;
    return (await findUserIdsByPhoneDigits(this.prisma, phone)).length > 0;
  }

  private async loadNames(invites: UserInvite[]): Promise<NameMaps> {
    const ids = (pick: (invite: UserInvite) => string | null) => [
      ...new Set(invites.map(pick).filter((id): id is string => !!id)),
    ];
    const [parishes, dioceses, communities, users] = await Promise.all([
      this.prisma.parish.findMany({
        where: { id: { in: ids((i) => i.parishId) } },
        select: { id: true, name: true },
      }),
      this.prisma.diocese.findMany({
        where: { id: { in: ids((i) => i.dioceseId) } },
        select: { id: true, name: true },
      }),
      this.prisma.community.findMany({
        where: { id: { in: ids((i) => i.communityId) } },
        select: { id: true, name: true },
      }),
      this.prisma.user.findMany({
        where: { id: { in: ids((i) => i.invitedByUserId) } },
        select: { id: true, name: true },
      }),
    ]);
    const toMap = (rows: Array<{ id: string; name: string }>) => new Map(rows.map((row) => [row.id, row.name]));
    return {
      parishes: toMap(parishes),
      dioceses: toMap(dioceses),
      communities: toMap(communities),
      users: toMap(users),
    };
  }

  /** Convite para a gestão — nunca com o hash do token. */
  serialize(invite: UserInvite, names: NameMaps, now: Date = new Date()) {
    const holder = isHolderInvite(invite);
    return {
      id: invite.id,
      role: invite.role,
      roleLabel: inviteRoleLabel(invite.role, holder),
      holder,
      status: inviteStatus(invite, now),
      dioceseId: invite.dioceseId,
      parishId: invite.parishId,
      parishName: invite.parishId ? (names.parishes.get(invite.parishId) ?? null) : null,
      communityId: invite.communityId,
      communityName: invite.communityId ? (names.communities.get(invite.communityId) ?? null) : null,
      memberId: invite.memberId,
      name: invite.name,
      email: invite.email,
      phone: invite.phone,
      invitedByUserId: invite.invitedByUserId,
      invitedByName: names.users.get(invite.invitedByUserId) ?? null,
      expiresAt: invite.expiresAt,
      acceptedAt: invite.acceptedAt,
      acceptedUserId: invite.acceptedUserId,
      revokedAt: invite.revokedAt,
      lastSentAt: invite.lastSentAt,
      createdAt: invite.createdAt,
    };
  }
}

const emptyNames = (): NameMaps => ({
  parishes: new Map(),
  dioceses: new Map(),
  communities: new Map(),
  users: new Map(),
});
