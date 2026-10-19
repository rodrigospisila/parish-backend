import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ClaimVerificationMethod,
  CommunityPlanStatus,
  EntityStatus,
  LeadStatus,
  NotificationType,
  ParishClaimStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../common/audit.service';
import { UsersService } from '../users/users.service';
import { InvitesService } from '../invites/invites.service';
import { inviteStatus } from '../invites/invite-token';
import { MessagingService } from '../messaging/messaging.service';
import { EmailService } from '../messaging/email.service';
import { isProductionEnv, maskEmail, maskPhone, normalizeBrazilianPhone } from '../messaging/log-mask';
import { NotificationsService } from '../notifications/notifications.service';
import { PlanAccessService } from '../plans/plan-access.service';
import { DEFAULT_TRIAL_DAYS } from '../plans/plan-transitions';
import { emailInsensitive, normalizeEmail } from '../auth/email-lookup';
import { CreateClaimDto, ReviewClaimDto } from './dto/claims.dto';
import {
  CLAIM_CODE_MAX_ATTEMPTS,
  CLAIM_CODE_MAX_SENDS,
  CLAIM_CODE_MAX_SENDS_PER_PARISH_24H,
  claimCodeMatches,
  generateClaimCode,
  hashClaimCode,
  isBrazilianMobile,
  isClaimCodeExpired,
  looksLikeEmail,
} from './claim-code';

export type ClaimChannel = 'PHONE' | 'EMAIL';

/** Pedidos com o mesmo e-mail em 24 h (qualquer paróquia) — freio durável, além do limite por IP. */
export const CLAIM_MAX_PER_EMAIL_24H = 5;

/**
 * Avisos de pedido novo (S14): a administração atual de uma paróquia gerida e
 * a plataforma recebem no máximo UM aviso por paróquia nesta janela — os
 * pedidos seguintes da mesma paróquia ficam só na fila. Durável: a decisão
 * conta os pedidos já gravados (sob trava por paróquia), não a memória do processo.
 */
export const CLAIM_ALERT_WINDOW_HOURS = 24;
/**
 * A plataforma recebe no máximo um aviso agregado ("N pedidos aguardando")
 * nesta janela, qualquer que seja a paróquia.
 */
export const CLAIM_PLATFORM_ALERT_MINUTES = 15;
/** `data.kind` do aviso agregado à plataforma (é por ele que a janela acima é conferida). */
export const CLAIM_PLATFORM_ALERT_KIND = 'PARISH_CLAIM_QUEUE';

const OPEN_STATUSES: ParishClaimStatus[] = [ParishClaimStatus.PENDING, ParishClaimStatus.VERIFIED];
const DAY_MS = 24 * 3600 * 1000;

/** Campos da reivindicação para o painel da plataforma — nunca o hash do código. */
const CLAIM_SELECT = {
  id: true,
  parishId: true,
  communityId: true,
  userId: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  message: true,
  evidenceUrl: true,
  method: true,
  codeSentTo: true,
  codeSentAt: true,
  codeAttempts: true,
  verifiedAt: true,
  status: true,
  reviewedByUserId: true,
  reviewedAt: true,
  reviewNote: true,
  grantedUserId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ParishClaimSelect;

type ClaimRow = Prisma.ParishClaimGetPayload<{ select: typeof CLAIM_SELECT }>;

type OfficialParish = {
  id: string;
  name: string;
  city: string;
  state: string;
  dioceseId: string;
  phone: string | null;
  email: string | null;
  managedAt: Date | null;
  diocese: { name: string } | null;
};

/**
 * "Esta paróquia é minha" (C1 — saas-implantacao-02 / ux-acesso-24).
 * Sempre aprovada pelo SYSTEM_ADMIN; o código no contato OFICIAL do território
 * é só evidência (VERIFIED). A aprovação promove a conta de quem pediu (ou
 * cria um convite de titular), marca a paróquia como gerida, dá 30 dias de
 * teste às comunidades sem plano e fecha o lead.
 */
@Injectable()
export class ClaimsService {
  private readonly logger = new Logger(ClaimsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly users: UsersService,
    private readonly invites: InvitesService,
    private readonly messaging: MessagingService,
    private readonly email: EmailService,
    private readonly notifications: NotificationsService,
    // Global (PlansModule): limpa o cache de acesso depois do teste automático
    @Optional() private readonly planAccess?: PlanAccessService,
  ) {}

  private get codeSecret(): string {
    return (
      this.config.get<string>('AUDIT_PSEUDONYM_KEY') || this.config.get<string>('JWT_SECRET') || 'parish-claim-code'
    );
  }

  // ------------------------------------------------------------------
  // Público
  // ------------------------------------------------------------------

  /** GET /public/parishes/:parishId/claim-info — sem dado pessoal (contato oficial mascarado). */
  async claimInfo(parishId: string) {
    const parish = await this.loadParish(parishId);
    const managed = await this.isManaged(parish);
    const official = this.officialContacts(parish);
    return {
      parishId: parish.id,
      parishName: parish.name,
      city: parish.city,
      state: parish.state,
      diocese: parish.diocese?.name ?? null,
      managed,
      officialPhoneMasked: official.phone ? maskPhone(official.phone) : null,
      officialEmailMasked: official.email ? maskEmail(official.email) : null,
      canVerifyBy: this.availableChannels(official),
    };
  }

  /**
   * POST /public/parishes/:parishId/claims. Sem login; com Bearer, grava a
   * conta de quem pediu (a aprovação promove ESSA conta). Cria o Lead
   * (source CLAIM) e avisa o SYSTEM_ADMIN. Paróquia já gerida: aceita, mas a
   * fila mostra `managed: true` e a administração atual é avisada (sem dados
   * de quem pediu).
   */
  async create(parishId: string, dto: CreateClaimDto, actor: any | null) {
    const parish = await this.loadParish(parishId);

    let communityId: string | null = null;
    if (dto.communityId?.trim()) {
      const community = await this.prisma.community.findFirst({
        where: {
          id: dto.communityId.trim(),
          parishId: parish.id,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!community) throw new BadRequestException('A comunidade informada não é desta paróquia');
      communityId = community.id;
    }

    const email = normalizeEmail(dto.email);
    let phone: string | null = null;
    if (dto.phone?.trim()) {
      phone = normalizeBrazilianPhone(dto.phone);
      if (!phone)
        throw new BadRequestException('Celular inválido — informe o DDD e o número, por exemplo (42) 99999-8888');
    }

    const since = new Date(Date.now() - DAY_MS);
    const recentByEmail = await this.prisma.parishClaim.count({
      where: { email: emailInsensitive(email), createdAt: { gte: since } },
    });
    if (recentByEmail >= CLAIM_MAX_PER_EMAIL_24H) {
      throw new HttpException(
        'Recebemos muitos pedidos com este e-mail hoje. Aguarde a nossa resposta ou tente amanhã.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const open = await this.prisma.parishClaim.findFirst({
      where: {
        parishId: parish.id,
        email: emailInsensitive(email),
        status: { in: OPEN_STATUSES },
      },
      select: { id: true },
    });
    if (open) {
      throw new ConflictException(
        'Já existe um pedido em análise com este e-mail para esta paróquia. A equipe do Parish vai responder no seu e-mail.',
      );
    }

    const managed = await this.isManaged(parish);
    const now = new Date();
    const { claim, firstInWindow } = await this.prisma.$transaction(async (tx) => {
      // Trava por paróquia: dois pedidos simultâneos não "são o primeiro" juntos
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`parish:claim-alert:${parish.id}`}))::text`;
      const recentForParish = await tx.parishClaim.count({
        where: {
          parishId: parish.id,
          createdAt: { gte: new Date(now.getTime() - CLAIM_ALERT_WINDOW_HOURS * 3600_000) },
        },
      });
      const created = await tx.parishClaim.create({
        data: {
          parishId: parish.id,
          communityId,
          userId: actor?.id ?? null,
          name: dto.name.trim(),
          email,
          phone,
          role: dto.role.trim(),
          message: dto.message?.trim() || null,
          evidenceUrl: dto.evidenceUrl?.trim() || null,
          method: dto.evidenceUrl ? ClaimVerificationMethod.DOCUMENT : ClaimVerificationMethod.MANUAL,
        },
        select: { id: true },
      });
      // Lead criado aqui (o módulo de leads é de outro agente): funil comercial com consentimento
      await tx.lead.create({
        data: {
          source: 'CLAIM',
          name: dto.name.trim(),
          email,
          phone,
          role: dto.role.trim(),
          parishName: parish.name,
          city: parish.city,
          state: parish.state,
          parishId: parish.id,
          communityId,
          message: dto.message?.trim() || null,
          consentAt: now,
        },
        select: { id: true },
      });
      return { claim: created, firstInWindow: recentForParish === 0 };
    });

    await this.audit.log({
      actor: actor?.id ? { id: actor.id, role: actor.role } : null,
      action: 'CREATE',
      entity: 'ParishClaim',
      entityId: claim.id,
      after: {
        parishId: parish.id,
        communityId,
        role: dto.role.trim(),
        managed,
        email,
        phone,
      },
    });

    // Teto por paróquia (S14): só o 1º pedido da paróquia em 24 h avisa; os
    // demais ficam na fila (o aviso da plataforma informa quantos aguardam)
    if (firstInWindow) {
      void this.alertPlatform(parish, claim.id, managed).catch(() => undefined);
      if (managed) void this.alertCurrentAdmins(parish).catch(() => undefined);
    }

    return {
      claimId: claim.id,
      canVerifyBy: this.availableChannels(this.officialContacts(parish)),
    };
  }

  /**
   * POST /public/claims/:claimId/send-code — código de 6 dígitos ao contato
   * OFICIAL (hash no banco, 3 envios por pedido, expira em 30 min). Sem o
   * canal configurado (SMS em produção, SMTP) → 503 explicado.
   */
  async sendCode(claimId: string, channel: ClaimChannel) {
    const claim = await this.prisma.parishClaim.findUnique({
      where: { id: claimId },
      select: { id: true, status: true, parishId: true, codeAttempts: true },
    });
    if (!claim) throw new NotFoundException('Pedido não encontrado');
    if (claim.status === ParishClaimStatus.VERIFIED) {
      throw new ConflictException('Este pedido já foi confirmado. Agora é só aguardar a análise da equipe do Parish.');
    }
    if (claim.status !== ParishClaimStatus.PENDING) {
      throw new ConflictException('Este pedido já foi analisado.');
    }
    if (claim.codeAttempts >= CLAIM_CODE_MAX_ATTEMPTS) {
      throw new HttpException(
        'As tentativas de código acabaram. A equipe do Parish vai conferir o seu pedido de outra forma.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const parish = await this.loadParish(claim.parishId);
    const official = this.officialContacts(parish);
    const destination = channel === 'PHONE' ? official.phone : official.email;
    if (!destination) {
      throw new BadRequestException(
        channel === 'PHONE'
          ? 'A paróquia não tem um celular oficial no cadastro. Use o e-mail oficial ou aguarde a análise da equipe do Parish.'
          : 'A paróquia não tem um e-mail oficial no cadastro. Use o celular oficial ou aguarde a análise da equipe do Parish.',
      );
    }
    if (!this.channelConfigured(channel)) {
      throw new ServiceUnavailableException(
        channel === 'PHONE'
          ? 'O envio de SMS está indisponível no momento. Use o e-mail oficial da paróquia ou aguarde: a equipe do Parish confere o seu pedido mesmo sem o código.'
          : 'O envio de e-mail está indisponível no momento. Use o celular oficial da paróquia ou aguarde: a equipe do Parish confere o seu pedido mesmo sem o código.',
      );
    }

    const code = generateClaimCode();
    const sentTo = channel === 'PHONE' ? maskPhone(destination) : maskEmail(destination);
    const now = new Date();

    // Trava por paróquia: a soma dos envios da paróquia e o incremento do
    // pedido não se cruzam com outro envio simultâneo (do mesmo pedido ou não)
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`parish:claim-code:${claim.parishId}`}))::text`;
      const parishSends = await tx.parishClaim.aggregate({
        where: { parishId: claim.parishId, codeSentAt: { gte: new Date(now.getTime() - DAY_MS) } },
        _sum: { codeSends: true },
      });
      if ((parishSends._sum.codeSends ?? 0) >= CLAIM_CODE_MAX_SENDS_PER_PARISH_24H) {
        throw new HttpException(
          'O contato oficial desta paróquia já recebeu muitos códigos hoje. Tente amanhã ou aguarde a análise da equipe do Parish.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      // Incremento condicional: o 4º envio do pedido não passa
      const { count } = await tx.parishClaim.updateMany({
        where: { id: claim.id, status: ParishClaimStatus.PENDING, codeSends: { lt: CLAIM_CODE_MAX_SENDS } },
        data: {
          codeSends: { increment: 1 },
          codeHash: hashClaimCode(this.codeSecret, claim.id, code),
          codeSentTo: sentTo,
          codeSentAt: now,
          method: channel === 'PHONE' ? ClaimVerificationMethod.PHONE_CODE : ClaimVerificationMethod.EMAIL_CODE,
        },
      });
      if (count === 0) {
        const current = await tx.parishClaim.findUnique({ where: { id: claim.id }, select: { status: true } });
        if (current?.status !== ParishClaimStatus.PENDING) throw new ConflictException('Este pedido já foi analisado.');
        throw new HttpException(
          'Já enviamos 3 códigos para este pedido. Use o último código recebido ou aguarde a análise da equipe do Parish.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    });

    // Trilha (não é contador)
    await this.audit.log({
      action: 'UPDATE',
      entity: 'ParishClaim',
      entityId: claim.id,
      metadata: { codeSent: true, channel, parishId: claim.parishId },
    });
    await this.deliverCode(channel, destination, parish.name, code);
    return { sentTo };
  }

  /** POST /public/claims/:claimId/verify — 5 tentativas no total; acerto → VERIFIED (ainda aguarda aprovação). */
  async verifyCode(claimId: string, code: string) {
    const claim = await this.prisma.parishClaim.findUnique({
      where: { id: claimId },
      select: {
        id: true,
        status: true,
        codeHash: true,
        codeSentAt: true,
        codeAttempts: true,
      },
    });
    if (!claim) throw new NotFoundException('Pedido não encontrado');
    if (claim.status === ParishClaimStatus.VERIFIED) return { status: ParishClaimStatus.VERIFIED };
    if (claim.status !== ParishClaimStatus.PENDING) throw new ConflictException('Este pedido já foi analisado.');
    if (!claim.codeHash || !claim.codeSentAt) {
      throw new BadRequestException('Peça o código primeiro.');
    }
    if (isClaimCodeExpired(claim.codeSentAt)) {
      throw new BadRequestException('O código venceu (vale 30 minutos). Peça um código novo.');
    }

    // Conta a tentativa ANTES de conferir, com gravação condicional: tentativas
    // em paralelo não passam do limite
    const { count } = await this.prisma.parishClaim.updateMany({
      where: {
        id: claim.id,
        status: ParishClaimStatus.PENDING,
        codeAttempts: { lt: CLAIM_CODE_MAX_ATTEMPTS },
      },
      data: { codeAttempts: { increment: 1 } },
    });
    if (count === 0) {
      throw new HttpException(
        'As tentativas de código acabaram. A equipe do Parish vai conferir o seu pedido de outra forma.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!claimCodeMatches(this.codeSecret, claim.id, code, claim.codeHash)) {
      const left = Math.max(0, CLAIM_CODE_MAX_ATTEMPTS - (claim.codeAttempts + 1));
      throw new BadRequestException(
        left > 0
          ? `Código incorreto. ${left === 1 ? 'Resta 1 tentativa' : `Restam ${left} tentativas`}.`
          : 'Código incorreto. As tentativas acabaram — a equipe do Parish vai conferir o seu pedido de outra forma.',
      );
    }

    const verified = await this.prisma.parishClaim.updateMany({
      where: {
        id: claim.id,
        status: ParishClaimStatus.PENDING,
        codeHash: claim.codeHash,
      },
      data: {
        status: ParishClaimStatus.VERIFIED,
        verifiedAt: new Date(),
        codeHash: null,
      },
    });
    if (verified.count === 0) {
      const now = await this.prisma.parishClaim.findUnique({
        where: { id: claim.id },
        select: { status: true },
      });
      if (now?.status === ParishClaimStatus.VERIFIED) return { status: ParishClaimStatus.VERIFIED };
      throw new ConflictException('O pedido mudou agora há pouco. Peça um código novo.');
    }
    await this.audit.log({
      action: 'UPDATE',
      entity: 'ParishClaim',
      entityId: claim.id,
      metadata: { verified: true },
    });
    return { status: ParishClaimStatus.VERIFIED };
  }

  // ------------------------------------------------------------------
  // Plataforma (SYSTEM_ADMIN)
  // ------------------------------------------------------------------

  /** GET /platform/claims?status= — fila de reivindicações. */
  async list(status?: ParishClaimStatus) {
    const rows = await this.prisma.parishClaim.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      take: 300,
      select: {
        ...CLAIM_SELECT,
        parish: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            phone: true,
            email: true,
            managedAt: true,
            diocese: { select: { id: true, name: true } },
          },
        },
      },
    });

    const parishIds = [...new Set(rows.map((row) => row.parishId))];
    const userIds = [
      ...new Set(rows.flatMap((row) => [row.userId, row.grantedUserId]).filter((id): id is string => !!id)),
    ];
    const [admins, accounts, invites] = await Promise.all([
      this.prisma.user.groupBy({
        by: ['parishId'],
        where: {
          role: UserRole.PARISH_ADMIN,
          parishId: { in: parishIds },
          isActive: true,
          anonymizedAt: null,
        },
        _count: { _all: true },
      }),
      this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          parishId: true,
          isActive: true,
        },
      }),
      // Convite de titular da aprovação sem conta: mesma paróquia + e-mail do pedido
      this.prisma.userInvite.findMany({
        where: {
          holder: true,
          parishId: { in: parishIds },
          email: { in: [...new Set(rows.map((row) => row.email.toLowerCase()))] },
        },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          parishId: true,
          email: true,
          acceptedAt: true,
          revokedAt: true,
          expiresAt: true,
          lastSentAt: true,
        },
      }),
    ]);
    const adminCount = new Map(admins.map((row) => [row.parishId, row._count._all]));
    const accountById = new Map(accounts.map((row) => [row.id, row]));
    // O mais recente vence (ordem crescente: a última gravação fica no mapa)
    const inviteKey = (parishId: string | null, email: string | null) =>
      `${parishId}|${String(email ?? '').toLowerCase()}`;
    const inviteByClaim = new Map(invites.map((row) => [inviteKey(row.parishId, row.email), row]));

    return rows.map((row) => {
      // Só pedidos aprovados sem conta geram convite
      const invite =
        row.status === ParishClaimStatus.APPROVED && !row.userId
          ? inviteByClaim.get(inviteKey(row.parishId, row.email))
          : undefined;
      const parishAdmins = adminCount.get(row.parishId) ?? 0;
      return {
        ...row,
        parish: {
          id: row.parish.id,
          name: row.parish.name,
          city: row.parish.city,
          state: row.parish.state,
          diocese: row.parish.diocese?.name ?? null,
          officialPhone: row.parish.phone,
          officialEmail: row.parish.email,
          managedAt: row.parish.managedAt,
          activeParishAdmins: parishAdmins,
        },
        // Paróquia já gerida (ou com administração ativa): revisar com cuidado
        managed: !!row.parish.managedAt || parishAdmins > 0,
        account: row.userId ? (accountById.get(row.userId) ?? null) : null,
        grantedAccount: row.grantedUserId ? (accountById.get(row.grantedUserId) ?? null) : null,
        invite: invite
          ? {
              id: invite.id,
              status: inviteStatus(invite),
              expiresAt: invite.expiresAt,
              lastSentAt: invite.lastSentAt,
            }
          : null,
      };
    });
  }

  /**
   * PATCH /platform/claims/:id — APPROVE ou REJECT (só pedidos PENDING/VERIFIED;
   * troca condicional: dois cliques não aprovam duas vezes). REJECT num pedido
   * já APROVADO desfaz a aprovação (S12: pedido fraudulento descoberto depois).
   */
  async review(id: string, dto: ReviewClaimDto, reviewer: { id: string; email?: string; role?: string }) {
    const claim = await this.prisma.parishClaim.findUnique({
      where: { id },
      select: CLAIM_SELECT,
    });
    if (!claim) throw new NotFoundException('Pedido não encontrado');
    if (claim.status === ParishClaimStatus.APPROVED && dto.action === 'REJECT') {
      return this.undoApproval(claim, dto.note?.trim() || null, reviewer);
    }
    if (!OPEN_STATUSES.includes(claim.status)) {
      throw new ConflictException('Este pedido já foi analisado.');
    }
    const note = dto.note?.trim() || null;
    if (dto.action === 'REJECT') return this.reject(claim, note, reviewer);
    return this.approve(claim, note, reviewer);
  }

  private async reject(claim: ClaimRow, note: string | null, reviewer: { id: string; email?: string; role?: string }) {
    const now = new Date();
    const { count } = await this.prisma.parishClaim.updateMany({
      where: { id: claim.id, status: { in: OPEN_STATUSES } },
      data: {
        status: ParishClaimStatus.REJECTED,
        reviewedByUserId: reviewer.id,
        reviewedAt: now,
        reviewNote: note,
      },
    });
    if (count === 0) throw new ConflictException('Este pedido já foi analisado.');

    await this.audit.log({
      actor: { id: reviewer.id, email: reviewer.email, role: reviewer.role },
      action: 'UPDATE',
      entity: 'ParishClaim',
      entityId: claim.id,
      before: { status: claim.status },
      after: { status: ParishClaimStatus.REJECTED },
    });

    const parish = await this.prisma.parish.findUnique({
      where: { id: claim.parishId },
      select: { name: true },
    });
    const title = 'Pedido de gestão não aprovado';
    const body = `O seu pedido para administrar a ${parish?.name ?? 'paróquia'} no Parish não foi aprovado. Se quiser, responda a este contato ou envie um novo pedido com um documento que comprove a sua função.`;
    void this.email.trySend(claim.email, title, body).catch(() => false);
    if (claim.userId) {
      void this.notifications
        // O e-mail já saiu acima: sem e-mail/SMS de reserva (S2)
        .notifyUser(
          claim.userId,
          NotificationType.TEAM_BROADCAST,
          title,
          body,
          { kind: 'PARISH_CLAIM', claimId: claim.id },
          { skipFallback: true },
        )
        .catch(() => undefined);
    }

    const updated = await this.prisma.parishClaim.findUnique({
      where: { id: claim.id },
      select: CLAIM_SELECT,
    });
    return { claim: updated, action: 'REJECT' as const };
  }

  /**
   * Desfaz uma aprovação (S12): o pedido vira REJECTED e o convite de titular
   * ainda PENDENTE nascido dele (mesma paróquia + e-mail do pedido) é revogado
   * na mesma transação — o aceite concorrente encontra o convite cancelado.
   * Conta que JÁ recebeu a gestão não é rebaixada aqui (papel/sessões são da
   * tela de Usuários): a resposta traz `grantedUserId` e o aviso. Nada é
   * apagado (paróquia gerida, testes e dados ficam como estão).
   */
  private async undoApproval(
    claim: ClaimRow,
    note: string | null,
    reviewer: { id: string; email?: string; role?: string },
  ) {
    const now = new Date();
    const revokedInvites = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.parishClaim.updateMany({
        where: { id: claim.id, status: ParishClaimStatus.APPROVED },
        data: {
          status: ParishClaimStatus.REJECTED,
          reviewedByUserId: reviewer.id,
          reviewedAt: now,
          reviewNote: note,
        },
      });
      if (count === 0) throw new ConflictException('O pedido mudou agora há pouco — atualize a fila.');
      const revoked = await tx.userInvite.updateMany({
        where: {
          holder: true,
          parishId: claim.parishId,
          email: emailInsensitive(claim.email),
          acceptedAt: null,
          revokedAt: null,
        },
        data: { revokedAt: now },
      });
      await tx.lead.updateMany({
        where: { source: 'CLAIM', parishId: claim.parishId, email: emailInsensitive(claim.email) },
        data: { status: LeadStatus.LOST },
      });
      return revoked.count;
    });

    await this.audit.log({
      actor: { id: reviewer.id, email: reviewer.email, role: reviewer.role },
      action: 'UPDATE',
      entity: 'ParishClaim',
      entityId: claim.id,
      before: { status: ParishClaimStatus.APPROVED },
      after: { status: ParishClaimStatus.REJECTED },
      metadata: { approvalUndone: true, revokedInvites, grantedUserId: claim.grantedUserId },
    });

    const updated = await this.prisma.parishClaim.findUnique({
      where: { id: claim.id },
      select: CLAIM_SELECT,
    });
    return {
      claim: updated,
      action: 'REJECT' as const,
      approvalUndone: true,
      revokedInvites,
      grantedUserId: claim.grantedUserId,
      ...(claim.grantedUserId
        ? {
            warning:
              'A conta que recebeu a gestão por este pedido continua com o acesso: tire o papel de administração (ou desative a conta) na tela de Usuários.',
          }
        : {}),
    };
  }

  private async approve(claim: ClaimRow, note: string | null, reviewer: { id: string; email?: string; role?: string }) {
    const parish = await this.loadParish(claim.parishId);
    const managedBefore = await this.isManaged(parish);
    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.parishClaim.updateMany({
        where: { id: claim.id, status: { in: OPEN_STATUSES } },
        data: {
          status: ParishClaimStatus.APPROVED,
          reviewedByUserId: reviewer.id,
          reviewedAt: now,
          reviewNote: note,
        },
      });
      if (count === 0) throw new ConflictException('Este pedido já foi analisado.');

      let grantedUserId: string | null = null;
      let invite: Awaited<ReturnType<InvitesService['createClaimHolderInvite']>> | null = null;

      if (claim.userId) {
        // Pedido feito logado: a PRÓPRIA conta vira PARISH_ADMIN titular
        const account = await tx.user.findUnique({
          where: { id: claim.userId },
          select: {
            id: true,
            role: true,
            parishId: true,
            isActive: true,
            anonymizedAt: true,
          },
        });
        if (!account || !account.isActive || account.anonymizedAt) {
          throw new ConflictException(
            'A conta de quem pediu não está mais ativa. Rejeite o pedido e peça para a pessoa enviar outro.',
          );
        }
        if (account.role === UserRole.SYSTEM_ADMIN || account.role === UserRole.DIOCESAN_ADMIN) {
          throw new ConflictException(
            'A conta de quem pediu já é da administração diocesana ou do sistema. Defina o acesso pela tela de Usuários.',
          );
        }
        if (account.role === UserRole.PARISH_ADMIN && account.parishId && account.parishId !== parish.id) {
          throw new ConflictException(
            'A conta de quem pediu já administra outra paróquia. Ajuste o acesso pela tela de Usuários.',
          );
        }
        await this.users.applyGrantToExistingAccount(tx, account.id, {
          role: UserRole.PARISH_ADMIN,
          dioceseId: parish.dioceseId,
          parishId: parish.id,
          communityId: claim.communityId,
          holder: true,
        });
        await tx.parishClaim.update({
          where: { id: claim.id },
          data: { grantedUserId: account.id },
          select: { id: true },
        });
        grantedUserId = account.id;
      } else {
        // Sem conta: convite de titular (PARISH_ADMIN) com o contato informado
        invite = await this.invites.createClaimHolderInvite(tx, {
          parish: {
            id: parish.id,
            name: parish.name,
            dioceseId: parish.dioceseId,
          },
          name: claim.name,
          email: claim.email,
          phone: claim.phone,
          invitedByUserId: reviewer.id,
        });
      }

      await tx.parish.updateMany({
        where: { id: parish.id, managedAt: null },
        data: { managedAt: now },
      });
      const trialCommunityIds = await this.grantAutoTrial(tx, parish.id, claim.id, reviewer.id, now);
      await tx.lead.updateMany({
        where: {
          source: 'CLAIM',
          parishId: parish.id,
          email: emailInsensitive(claim.email),
          status: { not: LeadStatus.WON },
        },
        data: { status: LeadStatus.WON },
      });
      return { grantedUserId, invite, trialCommunityIds };
    });

    for (const communityId of result.trialCommunityIds) this.planAccess?.invalidate(communityId);

    await this.audit.log({
      actor: { id: reviewer.id, email: reviewer.email, role: reviewer.role },
      action: 'UPDATE',
      entity: 'ParishClaim',
      entityId: claim.id,
      before: { status: claim.status },
      after: {
        status: ParishClaimStatus.APPROVED,
        grantedUserId: result.grantedUserId,
        inviteId: result.invite?.invite.id ?? null,
        autoTrialCommunities: result.trialCommunityIds.length,
        managedBefore,
      },
    });

    // Aviso a quem pediu (best-effort)
    let inviteEmailSent = false;
    if (result.invite) {
      inviteEmailSent = await this.invites
        .sendInviteEmail(claim.email, result.invite.whatsappText, result.invite.expiresAt)
        .catch(() => false);
    } else {
      const title = 'Pedido de gestão aprovado';
      const body = `Você agora administra a ${parish.name} no Parish. Entre com a sua conta para começar — as comunidades da paróquia ganharam ${DEFAULT_TRIAL_DAYS} dias de teste completo.`;
      void this.email.trySend(claim.email, title, body).catch(() => false);
      if (result.grantedUserId) {
        void this.notifications
          // O e-mail já saiu acima: sem e-mail/SMS de reserva (S2)
          .notifyUser(
            result.grantedUserId,
            NotificationType.TEAM_BROADCAST,
            title,
            body,
            { kind: 'PARISH_CLAIM', claimId: claim.id },
            { skipFallback: true },
          )
          .catch(() => undefined);
      }
    }

    const updated = await this.prisma.parishClaim.findUnique({
      where: { id: claim.id },
      select: CLAIM_SELECT,
    });
    return {
      claim: updated,
      action: 'APPROVE' as const,
      managed: managedBefore,
      grantedUserId: result.grantedUserId,
      ...(result.invite
        ? {
            invite: result.invite.invite,
            inviteUrl: result.invite.url,
            whatsappText: result.invite.whatsappText,
            inviteExpiresAt: result.invite.expiresAt,
            inviteEmailSent,
          }
        : {}),
      trialCommunityIds: result.trialCommunityIds,
    };
  }

  /**
   * Teste de 30 dias (AUTO_TRIAL) às comunidades ATIVAS da paróquia SEM plano.
   * Comunidade com qualquer linha de plano (o piloto, ACTIVE sem prazo; FREE
   * explícito; etc.) não é tocada. `skipDuplicates` torna a gravação segura
   * contra o job diário rodando ao mesmo tempo (communityId é único).
   */
  private async grantAutoTrial(
    tx: Prisma.TransactionClient,
    parishId: string,
    claimId: string,
    byUserId: string,
    now: Date,
  ): Promise<string[]> {
    const communities = await tx.community.findMany({
      where: {
        parishId,
        status: EntityStatus.ACTIVE,
        deletedAt: null,
        communityPlan: { is: null },
      },
      select: { id: true },
    });
    const trialEndsAt = new Date(now.getTime() + DEFAULT_TRIAL_DAYS * DAY_MS);
    const created: string[] = [];
    for (const community of communities) {
      const { count } = await tx.communityPlan.createMany({
        data: [
          {
            communityId: community.id,
            status: CommunityPlanStatus.TRIAL,
            trialEndsAt,
          },
        ],
        skipDuplicates: true,
      });
      if (count === 0) continue;
      await tx.communityPlanEvent.create({
        data: {
          communityId: community.id,
          action: 'AUTO_TRIAL',
          fromStatus: null,
          toStatus: CommunityPlanStatus.TRIAL,
          byUserId,
          note: 'Teste automático: reivindicação da paróquia aprovada',
          data: {
            trialDays: DEFAULT_TRIAL_DAYS,
            trialEndsAt: trialEndsAt.toISOString(),
            source: 'CLAIM',
            claimId,
          },
        },
      });
      created.push(community.id);
    }
    return created;
  }

  // ------------------------------------------------------------------
  // Apoio
  // ------------------------------------------------------------------

  private async loadParish(parishId: string): Promise<OfficialParish> {
    const parish = await this.prisma.parish.findUnique({
      where: { id: String(parishId ?? '') },
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        dioceseId: true,
        phone: true,
        email: true,
        managedAt: true,
        diocese: { select: { name: true } },
      },
    });
    if (!parish) throw new NotFoundException('Paróquia não encontrada');
    return parish;
  }

  /** Gerida = reivindicação aprovada/implantação (managedAt) ou administração paroquial ativa. */
  private async isManaged(parish: { id: string; managedAt: Date | null }): Promise<boolean> {
    if (parish.managedAt) return true;
    const admins = await this.prisma.user.count({
      where: {
        role: UserRole.PARISH_ADMIN,
        parishId: parish.id,
        isActive: true,
        anonymizedAt: null,
      },
    });
    return admins > 0;
  }

  /** Contato oficial utilizável: celular (SMS) e e-mail válidos do território. */
  private officialContacts(parish: { phone: string | null; email: string | null }) {
    const phone = normalizeBrazilianPhone(parish.phone);
    const email = looksLikeEmail(parish.email) ? String(parish.email).trim() : null;
    return { phone: phone && isBrazilianMobile(phone) ? phone : null, email };
  }

  /** Em produção, só canal configurado (SMS dá 503 sem Twilio); em desenvolvimento o código vai para o log. */
  private channelConfigured(channel: ClaimChannel): boolean {
    if (!isProductionEnv()) return true;
    return channel === 'PHONE' ? this.messaging.smsConfigured : this.email.configured;
  }

  private availableChannels(official: { phone: string | null; email: string | null }): ClaimChannel[] {
    const channels: ClaimChannel[] = [];
    if (official.phone && this.channelConfigured('PHONE')) channels.push('PHONE');
    if (official.email && this.channelConfigured('EMAIL')) channels.push('EMAIL');
    return channels;
  }

  private async deliverCode(channel: ClaimChannel, destination: string, parishName: string, code: string) {
    const text = `Parish: alguém pediu para administrar a ${parishName} no Parish. Se foi a equipe da paróquia, informe o código ${code} (vale 30 minutos). Se não reconhece o pedido, ignore.`;
    if (channel === 'PHONE') {
      try {
        await this.messaging.sendSms(destination, text);
      } catch (error) {
        if (error instanceof ServiceUnavailableException) {
          throw new ServiceUnavailableException(
            'O envio de SMS está indisponível no momento. Use o e-mail oficial da paróquia ou aguarde a análise da equipe do Parish.',
          );
        }
        this.logger.warn(`Falha ao enviar o código da reivindicação por SMS para ${maskPhone(destination)}: ${error}`);
        throw new ServiceUnavailableException(
          'Não conseguimos enviar o SMS para o celular oficial da paróquia. Tente o e-mail oficial ou aguarde a análise da equipe do Parish.',
        );
      }
      return;
    }
    const sent = await this.email.trySend(destination, 'Código para confirmar a gestão da paróquia no Parish', text);
    if (!sent) {
      if (!isProductionEnv()) {
        this.logger.log(`[CLAIM DEV] código ${code} para ${destination}`);
        return;
      }
      throw new ServiceUnavailableException(
        'Não conseguimos enviar o e-mail para o endereço oficial da paróquia. Tente o celular oficial ou aguarde a análise da equipe do Parish.',
      );
    }
  }

  /**
   * SYSTEM_ADMIN: aviso no app + e-mail (best-effort), sem o código. Agregado
   * (S14): no máximo um a cada 15 min para a plataforma inteira, com quantos
   * pedidos aguardam na fila; sem push urgente nem SMS (aviso comum, `bulk`).
   */
  private async alertPlatform(parish: OfficialParish, claimId: string, managed: boolean) {
    const admins = await this.prisma.user.findMany({
      where: {
        role: UserRole.SYSTEM_ADMIN,
        isActive: true,
        anonymizedAt: null,
      },
      select: { id: true, email: true },
    });
    if (!admins.length) return;
    const recentAlert = await this.prisma.notification.findFirst({
      where: {
        userId: { in: admins.map((admin) => admin.id) },
        createdAt: { gte: new Date(Date.now() - CLAIM_PLATFORM_ALERT_MINUTES * 60_000) },
        data: { path: ['kind'], equals: CLAIM_PLATFORM_ALERT_KIND },
      },
      select: { id: true },
    });
    if (recentAlert) return;
    const pending = await this.prisma.parishClaim.count({ where: { status: { in: OPEN_STATUSES } } });
    const title = managed ? 'Reivindicação de paróquia já gerida' : 'Nova reivindicação de paróquia';
    const queue = pending > 1 ? ` Há ${pending} pedidos aguardando análise.` : '';
    const body = `Pedido para administrar a ${parish.name} (${parish.city}/${parish.state}).${managed ? ' A paróquia já tem gestão: revise com cuidado.' : ''}${queue} Veja a fila de reivindicações no painel da plataforma.`;
    await this.notifications.notifyUsers(
      admins.map((admin) => admin.id),
      NotificationType.TEAM_BROADCAST,
      title,
      body,
      { kind: CLAIM_PLATFORM_ALERT_KIND, claimId },
      // O e-mail sai logo abaixo: sem e-mail/SMS de reserva (S2)
      { bulk: true, skipFallback: true },
    );
    await Promise.all(admins.map((admin) => this.email.trySend(admin.email, title, body).catch(() => false)));
  }

  /**
   * Paróquia já gerida: a administração atual fica sabendo (antifraude), sem os
   * dados de quem pediu. Chamado só no 1º pedido da paróquia em 24 h (S14).
   */
  private async alertCurrentAdmins(parish: OfficialParish) {
    const admins = await this.prisma.user.findMany({
      where: {
        role: UserRole.PARISH_ADMIN,
        parishId: parish.id,
        isActive: true,
        anonymizedAt: null,
      },
      select: { id: true },
    });
    if (!admins.length) return;
    await this.notifications.notifyUsers(
      admins.map((admin) => admin.id),
      NotificationType.TEAM_BROADCAST,
      'Pedido de gestão da paróquia',
      `Alguém pediu para administrar a ${parish.name} no Parish. A equipe do Parish confere com a paróquia antes de qualquer mudança; se você não reconhece o pedido, avise o suporte.`,
      { kind: 'PARISH_CLAIM_NOTICE' },
      // Aviso comum (sem SMS de fallback); no máximo 1 por paróquia a cada 24 h
      { bulk: true },
    );
  }
}
