import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConsentType, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService, CurrentUser } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';
import { CURRENT_POLICY_VERSION } from './consent.constants';

@Injectable()
export class ConsentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
    private readonly auditService: AuditService,
  ) {}

  private auditActor(user?: CurrentUser) {
    return user ? { id: user.id, email: user.email, role: user.role } : null;
  }

  /**
   * Acesso ao consentimento de um membro: o próprio titular, o responsável
   * legal (para menores) ou gestor com escopo hierárquico.
   */
  private async assertConsentAccess(currentUser: CurrentUser, memberId: string) {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, deletedAt: null },
      select: { id: true, userId: true, responsibleId: true, responsible: { select: { userId: true } } },
    });

    if (!member) {
      throw new NotFoundException(`Membro com ID ${memberId} não encontrado`);
    }

    const isSelf = !!member.userId && member.userId === currentUser.id;
    const isGuardian = !!member.responsible?.userId && member.responsible.userId === currentUser.id;

    if (isSelf || isGuardian || currentUser.role === UserRole.SYSTEM_ADMIN) {
      return { member, isSelf, isGuardian };
    }

    const canManage = await this.hierarchyService.canManageMember(currentUser.id, memberId);
    if (!canManage) {
      throw new ForbiddenException('Você não tem permissão para gerenciar o consentimento deste membro');
    }

    return { member, isSelf, isGuardian };
  }

  async getMemberConsents(memberId: string, currentUser: CurrentUser) {
    await this.assertConsentAccess(currentUser, memberId);

    const consents = await this.prisma.consent.findMany({
      where: { memberId },
      orderBy: { type: 'asc' },
    });

    // Garante que os três tipos sempre apareçam (default: não concedido)
    const byType = new Map(consents.map((c) => [c.type, c]));
    return Object.values(ConsentType).map(
      (type) =>
        byType.get(type) ?? {
          memberId,
          type,
          granted: false,
          policyVersion: null,
          grantedAt: null,
          revokedAt: null,
        },
    );
  }

  async setConsent(
    memberId: string,
    type: ConsentType,
    granted: boolean,
    currentUser: CurrentUser,
  ) {
    if (!Object.values(ConsentType).includes(type)) {
      throw new BadRequestException('Tipo de consentimento inválido');
    }

    const { member } = await this.assertConsentAccess(currentUser, memberId);
    const now = new Date();

    const consent = await this.prisma.consent.upsert({
      where: { memberId_type: { memberId, type } },
      create: {
        memberId,
        type,
        granted,
        policyVersion: granted ? CURRENT_POLICY_VERSION : null,
        grantedByUserId: currentUser.id,
        grantedAt: granted ? now : null,
        revokedAt: granted ? null : now,
      },
      update: {
        granted,
        policyVersion: granted ? CURRENT_POLICY_VERSION : undefined,
        grantedByUserId: currentUser.id,
        grantedAt: granted ? now : undefined,
        revokedAt: granted ? null : now,
      },
    });

    // Espelha o consentimento legado de tratamento de dados no Member
    if (type === ConsentType.DATA_PROCESSING) {
      await this.prisma.member.update({
        where: { id: memberId },
        data: { consentGiven: granted, consentDate: granted ? now : null },
      });
    }

    await this.auditService.log({
      actor: this.auditActor(currentUser),
      action: 'CONSENT_CHANGE',
      entity: 'Consent',
      entityId: consent.id,
      metadata: { memberId, type, granted, policyVersion: consent.policyVersion },
    });

    return consent;
  }

  /**
   * Concede consentimentos iniciais no cadastro (dentro de uma transação).
   * Usado por Auth/Users quando o titular aceita no registro.
   */
  async grantInitialConsents(
    tx: Prisma.TransactionClient,
    memberId: string,
    grantedByUserId: string,
    types: ConsentType[],
  ) {
    const now = new Date();
    for (const type of types) {
      await tx.consent.upsert({
        where: { memberId_type: { memberId, type } },
        create: {
          memberId,
          type,
          granted: true,
          policyVersion: CURRENT_POLICY_VERSION,
          grantedByUserId,
          grantedAt: now,
        },
        update: {
          granted: true,
          policyVersion: CURRENT_POLICY_VERSION,
          grantedByUserId,
          grantedAt: now,
          revokedAt: null,
        },
      });
    }
  }

  /**
   * Verifica se o usuário (via seu Member) permite comunicações não essenciais.
   * Sem Member ou sem registro explícito, o padrão é PERMITIR (opt-out, não opt-in):
   * o titular pode revogar a qualquer momento. Notificações essenciais não passam por aqui.
   */
  async allowsNonEssentialComms(userId: string): Promise<boolean> {
    const consent = await this.prisma.consent.findFirst({
      where: {
        type: ConsentType.COMMUNICATIONS,
        member: { userId },
      },
      select: { granted: true },
    });

    // Sem registro explícito => permitido; registro com granted=false => bloqueado
    return consent ? consent.granted : true;
  }
}
