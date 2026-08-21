import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CatechesisRating, NotificationType, SacramentType, TransactionType, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService, CurrentUser } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PdfService } from '../pdf/pdf.service';

/**
 * Catequese e iniciação à vida cristã (roadmap 3.1).
 * Reutiliza membros (catequizandos/catequistas), hierarquia e auditoria.
 */
@Injectable()
export class CatechesisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly pdfService: PdfService,
  ) {}

  /**
   * Destinatário do aviso de um catequizando: a própria conta quando adulto
   * com usuário; senão a conta do RESPONSÁVEL (menores). Ambos quando existem.
   */
  private guardianUserIds(member: {
    userId?: string | null;
    responsible?: { userId?: string | null } | null;
  }): string[] {
    const ids = new Set<string>();
    if (member.userId) ids.add(member.userId);
    if (member.responsible?.userId) ids.add(member.responsible.userId);
    return [...ids];
  }

  private formatDayLabel(date: Date): string {
    return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  private auditActor(user: CurrentUser) {
    return { id: user.id, email: user.email, role: user.role };
  }

  private isParishManager(role: UserRole) {
    return (
      role === UserRole.SYSTEM_ADMIN ||
      role === UserRole.DIOCESAN_ADMIN ||
      role === UserRole.PARISH_ADMIN
    );
  }

  /** Papéis de coordenação/gestão (piso que o @Roles das rotas garantia). */
  private isCoordinatorRole(role: UserRole) {
    return (
      role === UserRole.SYSTEM_ADMIN ||
      role === UserRole.DIOCESAN_ADMIN ||
      role === UserRole.PARISH_ADMIN ||
      role === UserRole.COMMUNITY_COORDINATOR ||
      role === UserRole.PASTORAL_COORDINATOR
    );
  }

  private async assertCommunityScope(communityId: string, user: CurrentUser) {
    const inScope = await this.hierarchyService.isCommunityInScope(user, communityId);
    if (!inScope) {
      throw new ForbiddenException('Comunidade fora do seu escopo');
    }
  }

  // ===== ETAPAS (catálogo por paróquia) =====

  async createStage(
    dto: {
      name: string;
      description?: string;
      ordering?: number;
      sacramentType?: SacramentType;
      parishId?: string;
    },
    user: CurrentUser,
  ) {
    if (!this.isParishManager(user.role)) {
      throw new ForbiddenException('Somente a administração paroquial cadastra etapas de catequese');
    }
    if (!user.parishId && user.role !== UserRole.SYSTEM_ADMIN) {
      throw new BadRequestException('Usuário sem paróquia vinculada');
    }
    // SYSTEM_ADMIN (sem paróquia própria) informa a paróquia no corpo
    const parishId =
      user.role === UserRole.SYSTEM_ADMIN ? (dto.parishId ?? user.parishId) : user.parishId;
    if (!parishId) {
      throw new BadRequestException('parishId é obrigatório');
    }
    const parish = await this.prisma.parish.findUnique({
      where: { id: parishId },
      select: { id: true },
    });
    if (!parish) {
      throw new NotFoundException('Paróquia não encontrada');
    }

    const stage = await this.prisma.catechesisStage.create({
      data: {
        parishId,
        name: dto.name,
        description: dto.description ?? null,
        ordering: dto.ordering ?? 0,
        sacramentType: dto.sacramentType ?? null,
      },
    });
    await this.auditService.log({ actor: this.auditActor(user), action: 'CREATE', entity: 'CatechesisStage', entityId: stage.id });
    return stage;
  }

  async listStages(user: CurrentUser) {
    const where: any = { deletedAt: null };
    if (user.role !== UserRole.SYSTEM_ADMIN) {
      if (user.parishId) {
        where.parishId = user.parishId;
      } else if (user.dioceseId) {
        // Sem paróquia (ex.: admin diocesano): catálogo da própria diocese,
        // nunca o catálogo global
        where.parish = { dioceseId: user.dioceseId };
      }
    }
    return this.prisma.catechesisStage.findMany({ where, orderBy: { ordering: 'asc' } });
  }

  // ===== TURMAS =====

  async createClass(
    dto: { name: string; year: number; stageId: string; communityId: string; weekday?: number; time?: string; room?: string; capacity?: number },
    user: CurrentUser,
  ) {
    await this.assertCommunityScope(dto.communityId, user);

    const stage = await this.prisma.catechesisStage.findFirst({
      where: { id: dto.stageId, deletedAt: null },
    });
    if (!stage) {
      throw new NotFoundException('Etapa de catequese não encontrada');
    }
    // A etapa é catálogo POR PARÓQUIA: turma com etapa de outra paróquia
    // contaminaria a visão diocesana (contagem atribuída à paróquia errada)
    const community = await this.prisma.community.findFirst({
      where: { id: dto.communityId },
      select: { parishId: true },
    });
    if (!community || community.parishId !== stage.parishId) {
      throw new BadRequestException('A etapa escolhida pertence a outra paróquia');
    }

    const created = await this.prisma.catechesisClass.create({
      data: {
        name: dto.name,
        year: dto.year,
        stageId: dto.stageId,
        communityId: dto.communityId,
        weekday: dto.weekday ?? null,
        time: dto.time ?? null,
        room: dto.room ?? null,
        capacity: typeof dto.capacity === 'number' && dto.capacity > 0 ? Math.floor(dto.capacity) : null,
      },
    });
    await this.auditService.log({ actor: this.auditActor(user), action: 'CREATE', entity: 'CatechesisClass', entityId: created.id });
    return created;
  }

  async listClasses(user: CurrentUser, communityId?: string) {
    const where: any = { deletedAt: null };
    if (communityId) {
      await this.assertCommunityScope(communityId, user);
      where.communityId = communityId;
    } else if (user.role !== UserRole.SYSTEM_ADMIN) {
      if (user.communityId) where.communityId = user.communityId;
      else if (user.parishId) where.community = { parishId: user.parishId };
    }
    return this.prisma.catechesisClass.findMany({
      where,
      include: {
        stage: { select: { name: true, sacramentType: true } },
        community: { select: { name: true } },
        _count: {
          select: {
            enrollments: { where: { status: 'ACTIVE', member: { deletedAt: null } } },
            sessions: true,
          },
        },
      },
      orderBy: { year: 'desc' },
    });
  }

  private async loadClassInScope(classId: string, user: CurrentUser) {
    const klass = await this.prisma.catechesisClass.findFirst({
      where: { id: classId, deletedAt: null },
      include: { stage: true },
    });
    if (!klass) {
      throw new NotFoundException('Turma não encontrada');
    }
    await this.assertCommunityScope(klass.communityId, user);
    return klass;
  }

  /**
   * Acesso OPERACIONAL à turma: o catequista/auxiliar vinculado a ela (pelo
   * app) ou quem tem escopo de gestão sobre a comunidade. Usado para chamada,
   * encontros e painel — a gestão (matrículas, conclusão) segue restrita.
   */
  private async assertClassOperationalAccess(classId: string, user: CurrentUser) {
    const klass = await this.prisma.catechesisClass.findFirst({
      where: { id: classId, deletedAt: null },
      include: { stage: true },
    });
    if (!klass) {
      throw new NotFoundException('Turma não encontrada');
    }

    const member = await this.prisma.member.findFirst({
      where: { userId: user.id, deletedAt: null },
      select: { id: true },
    });
    if (member) {
      const catechist = await this.prisma.catechesisCatechist.findFirst({
        where: { classId, memberId: member.id },
        select: { id: true },
      });
      if (catechist) return klass;
    }

    // Não é catequista da turma: só a COORDENAÇÃO/gestão da comunidade opera —
    // isCommunityInScope sozinho liberaria qualquer fiel da comunidade (dados de
    // menores + chamada), então exigimos também papel de coordenação.
    if (!this.isCoordinatorRole(user.role)) {
      throw new ForbiddenException('Apenas o catequista da turma ou a coordenação podem operar esta turma');
    }
    await this.assertCommunityScope(klass.communityId, user);
    return klass;
  }

  /** Turmas em que o usuário logado é catequista/auxiliar (app do catequista). */
  async getMyClasses(user: CurrentUser) {
    const member = await this.prisma.member.findFirst({
      where: { userId: user.id, deletedAt: null },
      select: { id: true },
    });
    if (!member) return [];

    const links = await this.prisma.catechesisCatechist.findMany({
      where: { memberId: member.id, class: { deletedAt: null } },
      include: {
        class: {
          include: {
            stage: { select: { id: true, name: true, sacramentType: true } },
            community: { select: { id: true, name: true } },
            _count: {
              select: {
                enrollments: { where: { status: 'ACTIVE', member: { deletedAt: null } } },
                sessions: true,
              },
            },
          },
        },
      },
      orderBy: { class: { year: 'desc' } },
    });

    return links.map((link) => ({
      classId: link.classId,
      role: link.role ?? 'Catequista',
      name: link.class.name,
      year: link.class.year,
      weekday: link.class.weekday,
      time: link.class.time,
      room: link.class.room,
      status: link.class.status,
      stage: link.class.stage,
      community: link.class.community,
      activeEnrollments: link.class._count.enrollments,
      sessionsCount: link.class._count.sessions,
    }));
  }

  /** Encontros da turma com o resumo da chamada (mais recentes primeiro). */
  async listSessions(classId: string, user: CurrentUser) {
    await this.assertClassOperationalAccess(classId, user);
    const sessions = await this.prisma.catechesisSession.findMany({
      where: { classId },
      include: { attendances: { select: { present: true, late: true } } },
      orderBy: { date: 'desc' },
    });
    return sessions.map((session) => ({
      id: session.id,
      date: session.date,
      topic: session.topic,
      marked: session.attendances.length,
      present: session.attendances.filter((a) => a.present).length,
      late: session.attendances.filter((a) => a.late).length,
    }));
  }

  /** Chamada de um encontro (por matrícula) para edição no app. */
  async getSessionAttendance(sessionId: string, user: CurrentUser) {
    const session = await this.prisma.catechesisSession.findUnique({
      where: { id: sessionId },
      include: { class: { select: { id: true } } },
    });
    if (!session) throw new NotFoundException('Encontro não encontrado');
    await this.assertClassOperationalAccess(session.class.id, user);

    const [enrollments, attendances] = await Promise.all([
      this.prisma.catechesisEnrollment.findMany({
        where: { classId: session.class.id, status: 'ACTIVE' },
        include: { member: { select: { id: true, fullName: true } } },
        orderBy: { member: { fullName: 'asc' } },
      }),
      this.prisma.catechesisAttendance.findMany({
        where: { sessionId },
        select: { enrollmentId: true, present: true, late: true },
      }),
    ]);
    const byEnrollment = new Map(attendances.map((a) => [a.enrollmentId, a]));
    return {
      sessionId,
      date: session.date,
      topic: session.topic,
      students: enrollments.map((enrollment) => ({
        enrollmentId: enrollment.id,
        member: enrollment.member,
        present: byEnrollment.get(enrollment.id)?.present ?? null,
        late: byEnrollment.get(enrollment.id)?.late ?? false,
      })),
    };
  }

  /**
   * Membros aptos a serem catequistas da turma: vinculados (ativos) à pastoral
   * da Catequese da comunidade — mesma regra que o addCatechist impõe.
   */
  async listEligibleCatechists(classId: string, user: CurrentUser) {
    const klass = await this.loadClassInScope(classId, user);
    const catechesisPastoral = {
      communityId: klass.communityId,
      deletedAt: null,
      globalPastoral: { name: { contains: 'catequ', mode: 'insensitive' as const } },
    };
    const links = await this.prisma.pastoralMember.findMany({
      where: {
        isActive: true,
        leftAt: null,
        member: { deletedAt: null },
        OR: [
          { communityPastoral: catechesisPastoral },
          { pastoralGroup: { deletedAt: null, communityPastoral: catechesisPastoral } },
        ],
      },
      select: { member: { select: { id: true, fullName: true } } },
    });
    const alreadyLinked = new Set(
      (
        await this.prisma.catechesisCatechist.findMany({
          where: { classId },
          select: { memberId: true },
        })
      ).map((link) => link.memberId),
    );
    const unique = new Map<string, string>();
    for (const link of links) {
      if (!alreadyLinked.has(link.member.id)) unique.set(link.member.id, link.member.fullName);
    }
    return [...unique.entries()]
      .map(([id, fullName]) => ({ id, fullName }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'pt-BR'));
  }

  async addCatechist(classId: string, memberId: string, role: string | undefined, user: CurrentUser) {
    const klass = await this.loadClassInScope(classId, user);

    const member = await this.prisma.member.findFirst({
      where: { id: memberId, deletedAt: null },
      select: { id: true },
    });
    if (!member) throw new NotFoundException('Membro não encontrado');

    // REGRA: catequista precisa estar vinculado à pastoral da CATEQUESE da
    // comunidade da turma (vínculo direto ou via sub-grupo). O vínculo à
    // pastoral é a porta de entrada — a turma só formaliza a função.
    const pastoralLink = await this.prisma.pastoralMember.findFirst({
      where: {
        memberId,
        isActive: true,
        leftAt: null,
        OR: [
          {
            communityPastoral: {
              communityId: klass.communityId,
              deletedAt: null,
              globalPastoral: { name: { contains: 'catequ', mode: 'insensitive' } },
            },
          },
          {
            pastoralGroup: {
              deletedAt: null,
              communityPastoral: {
                communityId: klass.communityId,
                deletedAt: null,
                globalPastoral: { name: { contains: 'catequ', mode: 'insensitive' } },
              },
            },
          },
        ],
      },
      select: { id: true },
    });
    if (!pastoralLink) {
      throw new BadRequestException(
        'O membro precisa estar vinculado à pastoral da Catequese desta comunidade para ser catequista — vincule-o na aba Pastorais primeiro',
      );
    }

    const existing = await this.prisma.catechesisCatechist.findUnique({
      where: { classId_memberId: { classId, memberId } },
    });
    if (existing) {
      throw new BadRequestException('Este membro já é catequista desta turma');
    }

    const created = await this.prisma.catechesisCatechist.create({
      data: { classId, memberId, role: role ?? 'Catequista' },
    });
    await this.auditService.log({ actor: this.auditActor(user), action: 'CREATE', entity: 'CatechesisCatechist', entityId: created.id });
    return created;
  }

  /** Remove o vínculo de catequista/auxiliar — encerra o acesso operacional. */
  async removeCatechist(classId: string, memberId: string, user: CurrentUser) {
    await this.loadClassInScope(classId, user);
    const result = await this.prisma.catechesisCatechist.deleteMany({
      where: { classId, memberId },
    });
    if (result.count === 0) {
      throw new NotFoundException('Catequista não vinculado a esta turma');
    }
    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'DELETE',
      entity: 'CatechesisCatechist',
      entityId: `${classId}:${memberId}`,
    });
    return { removed: result.count };
  }

  /**
   * Matrícula efetiva (ativa ou aguardando) do membro em OUTRA turma.
   * Um catequizando caminha numa etapa por vez — a troca é pela transferência.
   */
  private async findConcurrentEnrollment(memberId: string, excludeClassIds: string[]) {
    return this.prisma.catechesisEnrollment.findFirst({
      where: {
        memberId,
        status: { in: ['ACTIVE', 'PENDING_APPROVAL'] },
        classId: { notIn: excludeClassIds },
        class: { deletedAt: null },
      },
      include: { class: { select: { name: true, year: true } } },
    });
  }

  // ===== MATRÍCULA =====

  async enroll(
    dto: { classId: string; memberId: string; pendingDocuments?: string; requireBaptism?: boolean },
    user: CurrentUser,
  ) {
    const klass = await this.loadClassInScope(dto.classId, user);

    const member = await this.prisma.member.findFirst({
      where: { id: dto.memberId, deletedAt: null },
      select: {
        id: true,
        birthDate: true,
        responsibleId: true,
        sacraments: { select: { type: true } },
      },
    });
    if (!member) {
      throw new NotFoundException('Catequizando (membro) não encontrado');
    }

    // REGRA: uma matrícula efetiva por vez — mudar de turma é transferência
    const concurrent = await this.findConcurrentEnrollment(dto.memberId, [dto.classId]);
    if (concurrent) {
      throw new BadRequestException(
        `Este catequizando já está matriculado na ${concurrent.class.name} (${concurrent.class.year}) — use "Transferir" para trocá-lo de turma`,
      );
    }

    // REGRA: menor de idade só se matricula com pai/mãe (responsável) já
    // cadastrado como membro e vinculado — é por esse vínculo que a família
    // acompanha, autoriza (LGPD) e recebe os avisos no app.
    if (member.birthDate && !member.responsibleId) {
      const age =
        (Date.now() - member.birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      if (age < 18) {
        throw new BadRequestException(
          'Catequizando menor de idade precisa de responsável vinculado — cadastre o pai/mãe como membro e vincule no campo "Responsável" do cadastro do catequizando',
        );
      }
    }

    // Validação de batismo: cruza com o histórico sacramental (Sacrament).
    // Exigida por padrão para etapas cujo sacramento gerado não é o Batismo.
    const requireBaptism =
      dto.requireBaptism ?? (klass.stage.sacramentType !== SacramentType.BAPTISM);
    if (requireBaptism) {
      const isBaptized = member.sacraments.some((s) => s.type === SacramentType.BAPTISM);
      if (!isBaptized) {
        throw new BadRequestException(
          'Catequizando sem Batismo registrado. Registre o Batismo antes de matricular nesta etapa.',
        );
      }
    }

    const enrollment = await this.prisma.catechesisEnrollment.create({
      data: {
        classId: dto.classId,
        memberId: dto.memberId,
        pendingDocuments: dto.pendingDocuments ?? null,
      },
    });
    await this.auditService.log({ actor: this.auditActor(user), action: 'CREATE', entity: 'CatechesisEnrollment', entityId: enrollment.id });
    return enrollment;
  }

  async transferEnrollment(enrollmentId: string, targetClassId: string, user: CurrentUser) {
    const enrollment = await this.prisma.catechesisEnrollment.findUnique({
      where: { id: enrollmentId },
      include: { class: true },
    });
    if (!enrollment) throw new NotFoundException('Matrícula não encontrada');
    await this.assertCommunityScope(enrollment.class.communityId, user);
    await this.loadClassInScope(targetClassId, user);

    if (enrollment.classId === targetClassId) {
      throw new BadRequestException('A matrícula já está nesta turma');
    }
    // Pendentes passam por aprovação; concluídas usam a renovação — transferir
    // esses estados apagaria conclusões ou aprovaria por via lateral.
    if (enrollment.status !== 'ACTIVE') {
      throw new BadRequestException('Apenas matrículas ATIVAS podem ser transferidas');
    }
    // Origem e destino participam do movimento; uma TERCEIRA matrícula efetiva
    // é estado inválido e precisa ser resolvida antes.
    const thirdParty = await this.findConcurrentEnrollment(enrollment.memberId, [
      enrollment.classId,
      targetClassId,
    ]);
    if (thirdParty) {
      throw new BadRequestException(
        `Este catequizando também está matriculado na ${thirdParty.class.name} (${thirdParty.class.year}) — resolva essa matrícula antes de transferir`,
      );
    }

    // A matrícula de origem fica TRANSFERRED (preserva o histórico de presença);
    // no destino, cria uma matrícula ACTIVE nova (ou reativa a existente).
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.catechesisEnrollment.update({
        where: { id: enrollmentId },
        data: { status: 'TRANSFERRED' },
      });
      const existing = await tx.catechesisEnrollment.findUnique({
        where: { classId_memberId: { classId: targetClassId, memberId: enrollment.memberId } },
      });
      if (existing) {
        return tx.catechesisEnrollment.update({
          where: { id: existing.id },
          data: { status: 'ACTIVE', pendingDocuments: enrollment.pendingDocuments },
        });
      }
      return tx.catechesisEnrollment.create({
        data: {
          classId: targetClassId,
          memberId: enrollment.memberId,
          pendingDocuments: enrollment.pendingDocuments,
        },
      });
    });

    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'UPDATE',
      entity: 'CatechesisEnrollment',
      entityId: enrollmentId,
      metadata: { transferredTo: targetClassId, newEnrollmentId: result.id },
    });
    return result;
  }

  // ===== INSCRIÇÃO ONLINE (Fase 3) =====

  /** Vínculo do usuário com a comunidade-alvo (própria ou secundária ativa). */
  private async assertMemberCommunityLink(memberId: string, communityId: string, userCommunityId?: string) {
    if (userCommunityId === communityId) return;
    const link = await this.prisma.memberCommunity.findFirst({
      where: { memberId, communityId, isActive: true },
      select: { id: true },
    });
    if (!link) {
      throw new ForbiddenException('Você não tem vínculo com a comunidade desta turma');
    }
  }

  /** Vagas ocupadas: matrículas ativas + inscrições aguardando aprovação. */
  private occupiedSeatsWhere(classId: string) {
    return {
      classId,
      status: { in: ['ACTIVE', 'PENDING_APPROVAL'] as any },
      member: { deletedAt: null },
    };
  }

  /** Turmas abertas para inscrição na comunidade (com vagas calculadas). */
  async listOpenClasses(user: CurrentUser, communityId?: string) {
    const member = await this.prisma.member.findFirst({
      where: { userId: user.id, deletedAt: null },
      select: { id: true, communityId: true },
    });
    if (!member) return [];
    const targetCommunityId = communityId ?? user.communityId ?? member.communityId;
    if (!targetCommunityId) return [];
    await this.assertMemberCommunityLink(member.id, targetCommunityId, user.communityId ?? member.communityId);

    const classes = await this.prisma.catechesisClass.findMany({
      where: { communityId: targetCommunityId, deletedAt: null, status: 'ACTIVE' },
      include: {
        stage: { select: { id: true, name: true, ordering: true, sacramentType: true } },
        community: { select: { id: true, name: true } },
        _count: { select: { enrollments: { where: { status: { in: ['ACTIVE', 'PENDING_APPROVAL'] }, member: { deletedAt: null } } } } },
      },
      orderBy: [{ year: 'desc' }, { name: 'asc' }],
    });

    return classes.map((klass) => ({
      classId: klass.id,
      name: klass.name,
      year: klass.year,
      weekday: klass.weekday,
      time: klass.time,
      room: klass.room,
      stage: klass.stage,
      community: klass.community,
      capacity: klass.capacity,
      occupied: klass._count.enrollments,
      openSpots: klass.capacity === null ? null : Math.max(0, klass.capacity - klass._count.enrollments),
    }));
  }

  /**
   * Inscrição ONLINE pelo responsável (ou pelo próprio adulto).
   * Nasce AGUARDANDO APROVAÇÃO; batismo ausente vira pendência de documento
   * (não bloqueia — a secretaria confere no papel).
   */
  async apply(
    dto: {
      classId: string;
      forMemberId?: string;
      newChild?: { fullName: string; birthDate?: string };
      consentGiven: boolean;
    },
    user: CurrentUser,
  ) {
    if (dto.consentGiven !== true) {
      throw new BadRequestException('O consentimento (LGPD) é obrigatório para a inscrição');
    }

    const myMember = await this.prisma.member.findFirst({
      where: { userId: user.id, deletedAt: null },
      select: { id: true, communityId: true },
    });
    if (!myMember) {
      throw new BadRequestException('Usuário sem cadastro de membro — procure a secretaria');
    }

    const klass = await this.prisma.catechesisClass.findFirst({
      where: { id: dto.classId, deletedAt: null, status: 'ACTIVE' },
      include: { stage: true },
    });
    if (!klass) throw new NotFoundException('Turma não encontrada ou encerrada');
    await this.assertMemberCommunityLink(myMember.id, klass.communityId, user.communityId ?? myMember.communityId);

    // Valida a entrada do filho novo ANTES de qualquer escrita
    let newChild: { fullName: string; birthDate: Date | null } | null = null;
    if (dto.newChild) {
      const fullName = dto.newChild.fullName?.trim();
      if (!fullName || fullName.length < 5 || fullName.length > 120) {
        throw new BadRequestException('Informe o nome completo do catequizando (5 a 120 caracteres)');
      }
      let birthDate: Date | null = null;
      if (dto.newChild.birthDate) {
        const raw = String(dto.newChild.birthDate).slice(0, 10);
        birthDate = new Date(raw);
        // Round-trip pega tanto formato inválido quanto datas impossíveis (2017-02-31)
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(raw) ||
          Number.isNaN(birthDate.getTime()) ||
          birthDate.toISOString().slice(0, 10) !== raw
        ) {
          throw new BadRequestException('Data de nascimento inválida — use AAAA-MM-DD');
        }
      }
      newChild = { fullName, birthDate };
    }

    // Transação: vagas + cadastro do catequizando + matrícula são atômicos
    // (sem menor órfão se algo falhar; recontagem de vagas junto da escrita).
    const applied = await this.prisma.$transaction(async (tx) => {
      if (klass.capacity !== null) {
        const occupied = await tx.catechesisEnrollment.count({
          where: this.occupiedSeatsWhere(klass.id),
        });
        if (occupied >= klass.capacity) {
          throw new BadRequestException('Turma sem vagas — escolha outra turma ou fale com a secretaria');
        }
      }

      // Quem será matriculado: eu, um dependente meu, ou um filho novo
      let targetMemberId: string;
      if (newChild) {
        // Dedup: reaproveita dependente já cadastrado com o mesmo nome
        const existingChild = await tx.member.findFirst({
          where: {
            responsibleId: myMember.id,
            deletedAt: null,
            fullName: { equals: newChild.fullName, mode: 'insensitive' },
          },
          select: { id: true },
        });
        if (existingChild) {
          targetMemberId = existingChild.id;
        } else {
          const child = await tx.member.create({
            data: {
              fullName: newChild.fullName,
              birthDate: newChild.birthDate,
              communityId: klass.communityId,
              responsibleId: myMember.id,
              status: 'ACTIVE',
              consentGiven: true,
              consentDate: new Date(),
              communityLinks: {
                create: { communityId: klass.communityId, isPrimary: true, consentGiven: true, consentDate: new Date() },
              },
            },
            select: { id: true },
          });
          targetMemberId = child.id;
        }
      } else if (dto.forMemberId && dto.forMemberId !== myMember.id) {
        const dependent = await tx.member.findFirst({
          where: { id: dto.forMemberId, responsibleId: myMember.id, deletedAt: null },
          select: { id: true },
        });
        if (!dependent) {
          throw new ForbiddenException('Você só pode inscrever a si ou aos seus dependentes');
        }
        targetMemberId = dependent.id;
      } else {
        targetMemberId = myMember.id;
      }

      // Uma matrícula efetiva por vez — vale também para a inscrição online
      const concurrent = await tx.catechesisEnrollment.findFirst({
        where: {
          memberId: targetMemberId,
          status: { in: ['ACTIVE', 'PENDING_APPROVAL'] },
          classId: { not: klass.id },
          class: { deletedAt: null },
        },
        include: { class: { select: { name: true, year: true } } },
      });
      if (concurrent) {
        throw new BadRequestException(
          `Este catequizando já está matriculado (ou aguardando aprovação) na ${concurrent.class.name} (${concurrent.class.year}) — fale com a coordenação para transferir`,
        );
      }

      // Batismo: para etapas que não são de Batismo, a ausência vira pendência
      let pendingDocuments: string | null = null;
      if (klass.stage.sacramentType !== SacramentType.BAPTISM) {
        const baptized = await tx.sacrament.findFirst({
          where: { memberId: targetMemberId, type: SacramentType.BAPTISM },
          select: { id: true },
        });
        if (!baptized) pendingDocuments = 'Certidão de Batismo';
      }

      // Reaproveita matrícula anterior (recusada/desistente/transferida);
      // CONCLUÍDA nunca é reaproveitada — apagaria o registro de conclusão.
      const existing = await tx.catechesisEnrollment.findUnique({
        where: { classId_memberId: { classId: klass.id, memberId: targetMemberId } },
      });
      if (existing) {
        if (existing.status === 'ACTIVE' || existing.status === 'PENDING_APPROVAL') {
          throw new BadRequestException('Este catequizando já está matriculado (ou aguardando aprovação) nesta turma');
        }
        if (existing.status === 'COMPLETED') {
          throw new BadRequestException('Este catequizando já concluiu esta turma — a próxima etapa é feita pela renovação');
        }
        const enrollment = await tx.catechesisEnrollment.update({
          where: { id: existing.id },
          data: { status: 'PENDING_APPROVAL', pendingDocuments },
        });
        return { enrollment, targetMemberId };
      }
      const enrollment = await tx.catechesisEnrollment.create({
        data: { classId: klass.id, memberId: targetMemberId, status: 'PENDING_APPROVAL', pendingDocuments },
      });
      return { enrollment, targetMemberId };
    });
    const { enrollment, targetMemberId } = applied;
    const pendingDocuments = enrollment.pendingDocuments;

    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'CREATE',
      entity: 'CatechesisApplication',
      entityId: enrollment.id,
      metadata: { classId: klass.id, memberId: targetMemberId, pendingDocuments },
    });

    // Avisa os catequistas da turma (best-effort)
    try {
      const catechists = await this.prisma.catechesisCatechist.findMany({
        where: { classId: klass.id },
        select: { member: { select: { userId: true } } },
      });
      const userIds = [...new Set(catechists.map((c) => c.member.userId).filter((id): id is string => !!id))];
      if (userIds.length) {
        const applicant = await this.prisma.member.findUnique({
          where: { id: targetMemberId },
          select: { fullName: true },
        });
        await this.notificationsService.notifyUsers(
          userIds,
          NotificationType.CATECHESIS,
          'Nova inscrição na catequese',
          `${applicant?.fullName ?? 'Um catequizando'} se inscreveu na ${klass.name} — aguardando aprovação.`,
          { kind: 'application', classId: klass.id, enrollmentId: enrollment.id },
        );
      }
    } catch (error) {
      // Aviso é conveniência
    }

    return enrollment;
  }

  /** Aprova a inscrição (catequista da turma ou coordenação). */
  async approveEnrollment(enrollmentId: string, user: CurrentUser) {
    const enrollment = await this.prisma.catechesisEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        class: { select: { id: true, name: true } },
        member: { select: { fullName: true, userId: true, responsible: { select: { userId: true } } } },
      },
    });
    if (!enrollment) throw new NotFoundException('Inscrição não encontrada');
    await this.assertClassOperationalAccess(enrollment.class.id, user);
    if (enrollment.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Esta inscrição não está aguardando aprovação');
    }

    // Pode ter sido matriculado noutra turma enquanto a inscrição aguardava
    const concurrentActive = await this.findConcurrentEnrollment(enrollment.memberId, [
      enrollment.class.id,
    ]);
    if (concurrentActive) {
      throw new BadRequestException(
        `Este catequizando já está matriculado na ${concurrentActive.class.name} (${concurrentActive.class.year}) — recuse esta inscrição ou transfira-o de turma`,
      );
    }

    const updated = await this.prisma.catechesisEnrollment.update({
      where: { id: enrollmentId },
      data: { status: 'ACTIVE' },
    });
    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'UPDATE',
      entity: 'CatechesisEnrollment',
      entityId: enrollmentId,
      metadata: { approved: true },
    });
    try {
      const userIds = this.guardianUserIds(enrollment.member);
      if (userIds.length) {
        await this.notificationsService.notifyUsers(
          userIds,
          NotificationType.CATECHESIS,
          'Matrícula aprovada 🎉',
          `${enrollment.member.fullName} foi aprovado(a) na ${enrollment.class.name}. Bem-vindo(a)!`,
          { kind: 'approved', classId: enrollment.class.id, enrollmentId },
        );
      }
    } catch (error) {
      // Aviso é conveniência
    }
    return updated;
  }

  /** Recusa a inscrição (com motivo, auditado e comunicado à família). */
  async rejectEnrollment(enrollmentId: string, reason: string | undefined, user: CurrentUser) {
    if (typeof reason === 'string' && reason.trim().length > 300) {
      throw new BadRequestException('O motivo da recusa deve ter no máximo 300 caracteres');
    }
    const enrollment = await this.prisma.catechesisEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        class: { select: { id: true, name: true } },
        member: {
          select: {
            id: true,
            fullName: true,
            userId: true,
            responsibleId: true,
            createdAt: true,
            responsible: { select: { userId: true } },
          },
        },
      },
    });
    if (!enrollment) throw new NotFoundException('Inscrição não encontrada');
    await this.assertClassOperationalAccess(enrollment.class.id, user);
    if (enrollment.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Esta inscrição não está aguardando aprovação');
    }

    const updated = await this.prisma.catechesisEnrollment.update({
      where: { id: enrollmentId },
      data: { status: 'REJECTED' },
    });

    // LGPD: se o menor foi CADASTRADO por esta inscrição online (criado junto
    // dela, sem conta, sem outra participação), a recusa remove a finalidade da
    // coleta — soft-delete do cadastro e desativação dos vínculos.
    try {
      const memberInfo = enrollment.member;
      const createdWithApplication =
        !memberInfo.userId &&
        !!memberInfo.responsibleId &&
        Math.abs(memberInfo.createdAt.getTime() - enrollment.enrolledAt.getTime()) < 10_000;
      if (createdWithApplication) {
        const [otherEnrollments, sacraments, pastorals] = await Promise.all([
          this.prisma.catechesisEnrollment.count({
            where: { memberId: memberInfo.id, id: { not: enrollmentId } },
          }),
          this.prisma.sacrament.count({ where: { memberId: memberInfo.id } }),
          this.prisma.pastoralMember.count({ where: { memberId: memberInfo.id } }),
        ]);
        if (otherEnrollments === 0 && sacraments === 0 && pastorals === 0) {
          await this.prisma.$transaction([
            this.prisma.member.update({
              where: { id: memberInfo.id },
              data: { deletedAt: new Date() },
            }),
            this.prisma.memberCommunity.updateMany({
              where: { memberId: memberInfo.id, isActive: true },
              data: { isActive: false, leftAt: new Date() },
            }),
            // Binários de documentos enviados morrem junto (retenção mínima)
            this.prisma.catechesisDocument.updateMany({
              where: { enrollment: { memberId: memberInfo.id } },
              data: { data: null },
            }),
          ]);
          await this.auditService.log({
            actor: this.auditActor(user),
            action: 'DELETE',
            entity: 'Member',
            entityId: memberInfo.id,
            metadata: { reason: 'catechesis-application-rejected', enrollmentId },
          });
        }
      }
    } catch (error) {
      // Limpeza é best-effort — a recusa em si já foi registrada
    }

    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'UPDATE',
      entity: 'CatechesisEnrollment',
      entityId: enrollmentId,
      metadata: { rejected: true, reason: reason?.trim() || null },
    });
    try {
      const userIds = this.guardianUserIds(enrollment.member);
      if (userIds.length) {
        await this.notificationsService.notifyUsers(
          userIds,
          NotificationType.CATECHESIS,
          'Inscrição não aprovada',
          `A inscrição de ${enrollment.member.fullName} na ${enrollment.class.name} não foi aprovada${reason?.trim() ? `: ${reason.trim()}` : ''}. Procure a secretaria para orientações.`,
          { kind: 'rejected', classId: enrollment.class.id, enrollmentId },
        );
      }
    } catch (error) {
      // Aviso é conveniência
    }
    return updated;
  }

  // ===== RENOVAÇÃO EM LOTE (Fase 3) =====

  /**
   * Apoio à decisão da virada de ano: concluídos da turma, a PRÓXIMA etapa do
   * itinerário, documentos faltantes e as turmas disponíveis do destino.
   */
  async renewalPreview(classId: string, user: CurrentUser) {
    const klass = await this.loadClassInScope(classId, user);
    const nextStage = await this.prisma.catechesisStage.findFirst({
      where: {
        parishId: klass.stage.parishId,
        deletedAt: null,
        ordering: { gt: klass.stage.ordering },
      },
      orderBy: { ordering: 'asc' },
    });

    const completed = await this.prisma.catechesisEnrollment.findMany({
      where: { classId, status: 'COMPLETED' },
      include: {
        member: {
          select: {
            id: true,
            fullName: true,
            sacraments: { select: { type: true } },
          },
        },
      },
      orderBy: { member: { fullName: 'asc' } },
    });

    const targetClasses = nextStage
      ? await this.prisma.catechesisClass.findMany({
          where: { stageId: nextStage.id, communityId: klass.communityId, deletedAt: null, status: 'ACTIVE' },
          select: { id: true, name: true, year: true, weekday: true, time: true, capacity: true },
          orderBy: { year: 'desc' },
        })
      : [];

    return {
      classId,
      stage: { id: klass.stage.id, name: klass.stage.name },
      nextStage: nextStage
        ? { id: nextStage.id, name: nextStage.name, sacramentType: nextStage.sacramentType }
        : null,
      targetClasses,
      students: completed.map((enrollment) => {
        const baptized = enrollment.member.sacraments.some((s) => s.type === SacramentType.BAPTISM);
        const requiresBaptism = nextStage ? nextStage.sacramentType !== SacramentType.BAPTISM : false;
        return {
          enrollmentId: enrollment.id,
          member: { id: enrollment.member.id, fullName: enrollment.member.fullName },
          eligible: !nextStage ? false : !requiresBaptism || baptized,
          missingDocuments: requiresBaptism && !baptized ? 'Certidão de Batismo' : null,
        };
      }),
    };
  }

  /** Renova em lote: concluídos desta turma viram matrículas ATIVAS no destino. */
  async renewClass(
    classId: string,
    dto: { targetClassId: string; enrollmentIds: string[] },
    user: CurrentUser,
  ) {
    await this.loadClassInScope(classId, user);
    const target = await this.loadClassInScope(dto.targetClassId, user);
    if (dto.targetClassId === classId) {
      throw new BadRequestException('Escolha uma turma de destino diferente');
    }
    const ids = [...new Set(dto.enrollmentIds ?? [])];
    if (!ids.length) throw new BadRequestException('Selecione ao menos um catequizando');

    const source = await this.prisma.catechesisEnrollment.findMany({
      where: { id: { in: ids }, classId, status: 'COMPLETED' },
      select: { id: true, memberId: true },
    });
    if (source.length !== ids.length) {
      throw new BadRequestException('Só é possível renovar matrículas CONCLUÍDAS desta turma');
    }

    // Pendência de batismo acompanha a renovação (mesma regra do apply):
    // a secretaria não perde o rastreio de quem ainda deve a certidão.
    const requiresBaptism = target.stage.sacramentType !== SacramentType.BAPTISM;
    const baptizedIds = requiresBaptism
      ? new Set(
          (
            await this.prisma.sacrament.findMany({
              where: {
                memberId: { in: source.map((e) => e.memberId) },
                type: SacramentType.BAPTISM,
              },
              select: { memberId: true },
            })
          ).map((sacrament) => sacrament.memberId),
        )
      : new Set<string>();

    let renewed = 0;
    let reactivated = 0;
    await this.prisma.$transaction(async (tx) => {
      // Capacidade checada DENTRO da transação (junto da escrita)
      if (target.capacity !== null) {
        const occupied = await tx.catechesisEnrollment.count({
          where: this.occupiedSeatsWhere(target.id),
        });
        if (occupied + source.length > target.capacity) {
          throw new BadRequestException(
            `A turma de destino tem ${Math.max(0, target.capacity - occupied)} vaga(s) para ${source.length} renovação(ões)`,
          );
        }
      }
      for (const enrollment of source) {
        // Já caminhando em outra turma (fora origem/destino)? Pula no lote.
        const concurrent = await tx.catechesisEnrollment.findFirst({
          where: {
            memberId: enrollment.memberId,
            status: { in: ['ACTIVE', 'PENDING_APPROVAL'] },
            classId: { notIn: [classId, target.id] },
            class: { deletedAt: null },
          },
          select: { id: true },
        });
        if (concurrent) continue;
        const pendingDocuments =
          requiresBaptism && !baptizedIds.has(enrollment.memberId) ? 'Certidão de Batismo' : null;
        const existing = await tx.catechesisEnrollment.findUnique({
          where: { classId_memberId: { classId: target.id, memberId: enrollment.memberId } },
        });
        if (existing) {
          // ACTIVE/PENDING já estão lá; COMPLETED no destino é conclusão
          // histórica que a renovação não pode apagar — ambos são pulados.
          if (
            existing.status === 'ACTIVE' ||
            existing.status === 'PENDING_APPROVAL' ||
            existing.status === 'COMPLETED'
          ) {
            continue;
          }
          await tx.catechesisEnrollment.update({
            where: { id: existing.id },
            data: { status: 'ACTIVE', pendingDocuments },
          });
          reactivated++;
        } else {
          await tx.catechesisEnrollment.create({
            data: { classId: target.id, memberId: enrollment.memberId, pendingDocuments },
          });
          renewed++;
        }
      }
    });

    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'CREATE',
      entity: 'CatechesisRenewal',
      entityId: `${classId}:${target.id}`,
      metadata: { renewed, reactivated, requested: ids.length },
    });
    return { renewed, reactivated, skipped: ids.length - renewed - reactivated };
  }

  // ===== ENCONTROS E CHAMADA =====

  /**
   * Meia-noite UTC do dia civil LOCAL do servidor (TZ do público, ex.:
   * America/Sao_Paulo). As sessões guardam date-only como 00:00Z — comparar
   * com meia-noite local direto (setHours) marcaria o encontro de HOJE como
   * passado e calaria os avisos às famílias.
   */
  private startOfTodayUtc(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }

  async createSession(classId: string, dto: { date: string; topic?: string }, user: CurrentUser) {
    const klass = await this.assertClassOperationalAccess(classId, user);
    const session = await this.prisma.catechesisSession.create({
      data: { classId, date: new Date(dto.date), topic: dto.topic ?? null },
    });

    // Aviso às famílias — só para encontros FUTUROS (registro retroativo de
    // chamada não gera notificação). Best-effort: não bloqueia a criação.
    if (session.date.getTime() >= this.startOfTodayUtc().getTime()) {
      try {
        const enrollments = await this.prisma.catechesisEnrollment.findMany({
          where: { classId, status: 'ACTIVE' },
          select: {
            member: {
              select: { userId: true, responsible: { select: { userId: true } } },
            },
          },
        });
        const userIds = [
          ...new Set(enrollments.flatMap((e) => this.guardianUserIds(e.member))),
        ];
        if (userIds.length) {
          await this.notificationsService.notifyUsers(
            userIds,
            NotificationType.CATECHESIS,
            'Novo encontro de catequese',
            `${klass.name}: encontro em ${this.formatDayLabel(session.date)}${klass.time ? ` às ${klass.time}` : ''}${dto.topic ? ` — ${dto.topic}` : ''}.`,
            { kind: 'session', classId, sessionId: session.id },
          );
        }
      } catch (error) {
        // Aviso é conveniência — falha não impede o encontro
      }
    }

    return session;
  }

  async markAttendance(
    sessionId: string,
    entries: Array<{ enrollmentId: string; present: boolean; late?: boolean }>,
    user: CurrentUser,
  ) {
    const session = await this.prisma.catechesisSession.findUnique({
      where: { id: sessionId },
      include: { class: true },
    });
    if (!session) throw new NotFoundException('Encontro não encontrado');
    await this.assertClassOperationalAccess(session.class.id, user);

    // SEGURANÇA/INTEGRIDADE: cada matrícula da chamada precisa pertencer a ESTA
    // turma — sem isso a chamada gravaria presença cruzada e avisaria famílias
    // de turmas alheias.
    const requestedIds = [...new Set(entries.map((e) => e.enrollmentId))];
    const validEnrollments = await this.prisma.catechesisEnrollment.findMany({
      where: { id: { in: requestedIds }, classId: session.classId },
      select: { id: true },
    });
    const validIds = new Set(validEnrollments.map((e) => e.id));
    const invalid = requestedIds.filter((id) => !validIds.has(id));
    if (invalid.length) {
      throw new BadRequestException('Uma ou mais matrículas não pertencem a esta turma');
    }

    // Estado anterior: aviso de falta só quando a marcação MUDA para ausente
    const previous = await this.prisma.catechesisAttendance.findMany({
      where: { sessionId, enrollmentId: { in: requestedIds } },
      select: { enrollmentId: true, present: true },
    });
    const previousByEnrollment = new Map(previous.map((a) => [a.enrollmentId, a.present]));

    const becameAbsent: string[] = [];
    await this.prisma.$transaction(
      entries.map((entry) => {
        // Atrasado conta como presente (marcação de acompanhamento)
        const late = entry.late === true;
        const present = entry.present || late;
        const wasPresent = previousByEnrollment.get(entry.enrollmentId);
        if (!present && wasPresent !== false) {
          becameAbsent.push(entry.enrollmentId);
        }
        return this.prisma.catechesisAttendance.upsert({
          where: { sessionId_enrollmentId: { sessionId, enrollmentId: entry.enrollmentId } },
          create: { sessionId, enrollmentId: entry.enrollmentId, present, late },
          update: { present, late },
        });
      }),
    );

    // Aviso de falta só para encontros de HOJE/futuros — backfill de chamadas
    // históricas não deve gerar rajada de pushes com datas antigas.
    const notifyAbsence = session.date.getTime() >= this.startOfTodayUtc().getTime();

    // Aviso de falta às famílias (best-effort)
    if (becameAbsent.length && notifyAbsence) {
      try {
        const absents = await this.prisma.catechesisEnrollment.findMany({
          where: { id: { in: becameAbsent } },
          select: {
            member: {
              select: {
                fullName: true,
                userId: true,
                responsible: { select: { userId: true } },
              },
            },
            class: { select: { id: true, name: true } },
          },
        });
        const dayLabel = this.formatDayLabel(session.date);
        for (const enrollment of absents) {
          const userIds = this.guardianUserIds(enrollment.member);
          if (!userIds.length) continue;
          await this.notificationsService.notifyUsers(
            userIds,
            NotificationType.CATECHESIS,
            'Falta na catequese',
            `${enrollment.member.fullName} não esteve no encontro de ${dayLabel} (${enrollment.class.name}).`,
            { kind: 'absence', classId: enrollment.class.id, sessionId },
          );
        }
      } catch (error) {
        // Aviso é conveniência
      }
    }

    return { marked: entries.length };
  }

  /** Atualiza os documentos pendentes da matrícula e avisa a família. */
  async updateEnrollmentDocuments(
    enrollmentId: string,
    pendingDocuments: string | null,
    user: CurrentUser,
  ) {
    const enrollment = await this.prisma.catechesisEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        class: { select: { id: true, name: true, communityId: true } },
        member: {
          select: { fullName: true, userId: true, responsible: { select: { userId: true } } },
        },
      },
    });
    if (!enrollment) throw new NotFoundException('Matrícula não encontrada');
    await this.assertCommunityScope(enrollment.class.communityId, user);

    const normalized =
      typeof pendingDocuments === 'string' ? pendingDocuments.trim() || null : null;
    const changed = normalized !== (enrollment.pendingDocuments ?? null);
    const updated = await this.prisma.catechesisEnrollment.update({
      where: { id: enrollmentId },
      data: { pendingDocuments: normalized },
    });

    // Só avisa a família quando há pendência E ela mudou (evita spam de reedição)
    if (normalized && changed) {
      try {
        const userIds = this.guardianUserIds(enrollment.member);
        if (userIds.length) {
          await this.notificationsService.notifyUsers(
            userIds,
            NotificationType.CATECHESIS,
            'Documentos pendentes na catequese',
            `${enrollment.member.fullName} (${enrollment.class.name}): ${normalized}. Fale com a secretaria para regularizar.`,
            { kind: 'documents', classId: enrollment.class.id, enrollmentId },
          );
        }
      } catch (error) {
        // Aviso é conveniência
      }
    }

    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'UPDATE',
      entity: 'CatechesisEnrollment',
      entityId: enrollmentId,
      metadata: { pendingDocuments: normalized },
    });
    return updated;
  }

  /** Mensagem do catequista/coordenação para as famílias da turma. */
  async notifyClassFamilies(classId: string, message: string, user: CurrentUser) {
    const text = message?.trim();
    if (!text) throw new BadRequestException('Escreva a mensagem para as famílias');
    if (text.length > 500) throw new BadRequestException('Mensagem muito longa (máx. 500 caracteres)');

    const klass = await this.assertClassOperationalAccess(classId, user);
    const enrollments = await this.prisma.catechesisEnrollment.findMany({
      where: { classId, status: 'ACTIVE' },
      select: {
        member: { select: { userId: true, responsible: { select: { userId: true } } } },
      },
    });
    const userIds = [...new Set(enrollments.flatMap((e) => this.guardianUserIds(e.member)))];
    if (userIds.length) {
      await this.notificationsService.notifyUsers(
        userIds,
        NotificationType.CATECHESIS,
        `Catequese · ${klass.name}`,
        text,
        { kind: 'message', classId },
      );
    }

    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'CREATE',
      entity: 'CatechesisClassMessage',
      entityId: classId,
      metadata: { notified: userIds.length },
    });
    return { notified: userIds.length };
  }

  /**
   * Acompanhamento da FAMÍLIA: matrículas do próprio usuário e dos seus
   * dependentes (responsibleId), com presença, pendências e próximo encontro.
   */
  async getMyFamilyCatechesis(user: CurrentUser) {
    const member = await this.prisma.member.findFirst({
      where: { userId: user.id, deletedAt: null },
      select: { id: true },
    });
    if (!member) return [];

    const enrollments = await this.prisma.catechesisEnrollment.findMany({
      where: {
        status: { in: ['ACTIVE', 'COMPLETED', 'PENDING_APPROVAL', 'REJECTED'] },
        class: { deletedAt: null },
        member: {
          deletedAt: null,
          OR: [{ id: member.id }, { responsibleId: member.id }],
        },
      },
      include: {
        member: { select: { id: true, fullName: true } },
        class: {
          include: {
            stage: { select: { id: true, name: true, sacramentType: true } },
            community: { select: { id: true, name: true } },
          },
        },
        attendances: { select: { present: true, late: true } },
        documents: {
          select: { id: true, kind: true, status: true, reviewNotes: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { assessments: true } },
      },
      orderBy: { enrolledAt: 'desc' },
    });
    if (!enrollments.length) return [];

    // Próximo encontro por turma
    const classIds = [...new Set(enrollments.map((e) => e.classId))];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const nextSessions = await this.prisma.catechesisSession.findMany({
      where: { classId: { in: classIds }, date: { gte: now } },
      orderBy: { date: 'asc' },
      select: { classId: true, date: true, topic: true },
    });
    const nextByClass = new Map<string, { date: Date; topic: string | null }>();
    for (const session of nextSessions) {
      if (!nextByClass.has(session.classId)) {
        nextByClass.set(session.classId, { date: session.date, topic: session.topic });
      }
    }

    // Taxas de material das turmas + situação de cada matrícula (Fase 5)
    const enrollmentIds = enrollments.map((e) => e.id);
    const fees = await this.prisma.catechesisFee.findMany({
      where: { classId: { in: classIds } },
      include: { payments: { where: { enrollmentId: { in: enrollmentIds } } } },
      orderBy: { createdAt: 'desc' },
    });
    const feesByClass = new Map<string, typeof fees>();
    for (const fee of fees) {
      const list = feesByClass.get(fee.classId) ?? [];
      list.push(fee);
      feesByClass.set(fee.classId, list);
    }

    return enrollments.map((enrollment) => {
      const total = enrollment.attendances.length;
      const present = enrollment.attendances.filter((a) => a.present).length;
      return {
        enrollmentId: enrollment.id,
        member: {
          ...enrollment.member,
          isSelf: enrollment.member.id === member.id,
        },
        status: enrollment.status,
        pendingDocuments: enrollment.pendingDocuments,
        documents: enrollment.documents,
        assessmentsCount: enrollment._count.assessments,
        attendanceRate: total ? Math.round((present / total) * 100) : null,
        sessions: total,
        class: {
          id: enrollment.class.id,
          name: enrollment.class.name,
          year: enrollment.class.year,
          weekday: enrollment.class.weekday,
          time: enrollment.class.time,
          room: enrollment.class.room,
          stage: enrollment.class.stage,
          community: enrollment.class.community,
        },
        nextSession:
          enrollment.status === 'REJECTED' ? null : nextByClass.get(enrollment.classId) ?? null,
        // Taxas só para matrículas efetivas (pendente/recusada não deve cobrança)
        fees:
          enrollment.status === 'ACTIVE' || enrollment.status === 'COMPLETED'
            ? (feesByClass.get(enrollment.classId) ?? []).map((fee) => {
                const payment = fee.payments.find((p) => p.enrollmentId === enrollment.id);
                return {
                  id: fee.id,
                  description: fee.description,
                  amount: fee.amount,
                  dueDate: fee.dueDate,
                  status: payment ? (payment.waived ? 'WAIVED' : 'PAID') : 'PENDING',
                };
              })
            : [],
      };
    });
  }

  // ===== CONCLUSÃO (gera Sacrament) =====

  async completeEnrollment(enrollmentId: string, dto: { date?: string; minister?: string }, user: CurrentUser) {
    const enrollment = await this.prisma.catechesisEnrollment.findUnique({
      where: { id: enrollmentId },
      include: { class: { include: { stage: true, community: true } } },
    });
    if (!enrollment) throw new NotFoundException('Matrícula não encontrada');
    await this.assertCommunityScope(enrollment.class.communityId, user);

    if (enrollment.status === 'COMPLETED') {
      throw new BadRequestException('Matrícula já concluída');
    }
    // Pendentes precisam ser aprovadas antes — concluir direto geraria
    // Sacrament para inscrição que nunca passou pela aprovação.
    if (enrollment.status !== 'ACTIVE') {
      throw new BadRequestException('Apenas matrículas ATIVAS podem ser concluídas');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.catechesisEnrollment.update({
        where: { id: enrollmentId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });

      let sacramentId: string | null = null;
      // Conclusão da etapa gera o Sacrament correspondente (se configurado)
      if (enrollment.class.stage.sacramentType) {
        const sacrament = await tx.sacrament.create({
          data: {
            memberId: enrollment.memberId,
            type: enrollment.class.stage.sacramentType,
            date: dto.date ? new Date(dto.date) : new Date(),
            place: enrollment.class.community.name,
            minister: dto.minister ?? null,
            notes: `Concluído na catequese: ${enrollment.class.stage.name}`,
          },
        });
        sacramentId = sacrament.id;
      }

      return { updated, sacramentId };
    });

    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'UPDATE',
      entity: 'CatechesisEnrollment',
      entityId: enrollmentId,
      metadata: { completed: true, sacramentId: result.sacramentId },
    });

    return result.updated;
  }

  // ===== PAPELADA DA SECRETARIA (Fase 4) =====

  /** Acesso ao documento de UMA matrícula: equipe da turma OU a própria família. */
  private async loadEnrollmentForDocument(enrollmentId: string, user: CurrentUser) {
    const enrollment = await this.prisma.catechesisEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        member: {
          select: { id: true, fullName: true, userId: true, deletedAt: true, responsible: { select: { userId: true } } },
        },
        class: {
          include: {
            stage: { select: { id: true, name: true, sacramentType: true } },
            community: { include: { parish: { select: { name: true } } } },
          },
        },
        attendances: { select: { present: true } },
      },
    });
    // Membro soft-deletado (direito de eliminação LGPD) não emite mais documentos
    if (!enrollment || enrollment.member.deletedAt) {
      throw new NotFoundException('Matrícula não encontrada');
    }

    const isFamily = this.guardianUserIds(enrollment.member).includes(user.id);
    if (!isFamily) {
      await this.assertClassOperationalAccess(enrollment.class.id, user);
    }
    return enrollment;
  }

  private certificateBody(enrollment: {
    completedAt: Date | null;
    class: { name: string; year: number; stage: { name: string }; community: { name: string; parish: { name: string } } };
  }): string[] {
    const conclusion = (enrollment.completedAt ?? new Date()).toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
    });
    return [
      `concluiu a etapa "${enrollment.class.stage.name}" da catequese,`,
      `na ${enrollment.class.name} (${enrollment.class.year}) — ${enrollment.class.community.name}, ${enrollment.class.community.parish.name},`,
      `em ${conclusion}.`,
      '"Ide, pois, e fazei discípulos entre todas as nações" (Mt 28,19)',
    ];
  }

  /** Certificado de conclusão (PDF) — a família baixa o do próprio catequizando. */
  async generateCertificate(enrollmentId: string, user: CurrentUser): Promise<Buffer> {
    const enrollment = await this.loadEnrollmentForDocument(enrollmentId, user);
    if (enrollment.status !== 'COMPLETED') {
      throw new BadRequestException('Certificado disponível apenas para matrículas concluídas');
    }
    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'EXPORT',
      entity: 'CatechesisEnrollment',
      entityId: enrollmentId,
      metadata: { certificate: true },
    });
    return this.pdfService.renderCertificateDocument({
      title: 'Certificado de Conclusão',
      organization: enrollment.class.community.parish.name,
      subtitle: 'Catequese — Iniciação à Vida Cristã',
      pages: [
        {
          recipientName: enrollment.member.fullName,
          bodyParagraphs: this.certificateBody(enrollment),
          signatureLines: ['Pároco', 'Coordenação da Catequese'],
        },
      ],
      footer: `Emitido pelo Parish em ${new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
    });
  }

  /** Certificados da turma em lote (uma página por concluído). */
  async generateClassCertificates(classId: string, user: CurrentUser): Promise<Buffer> {
    const klass = await this.assertClassOperationalAccess(classId, user);
    const completed = await this.prisma.catechesisEnrollment.findMany({
      where: { classId, status: 'COMPLETED', member: { deletedAt: null } },
      include: {
        member: { select: { fullName: true } },
        class: {
          include: {
            stage: { select: { name: true } },
            community: { include: { parish: { select: { name: true } } } },
          },
        },
      },
      orderBy: { member: { fullName: 'asc' } },
    });
    if (!completed.length) {
      throw new BadRequestException('Nenhuma matrícula concluída nesta turma ainda');
    }
    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'EXPORT',
      entity: 'CatechesisClass',
      entityId: classId,
      metadata: { certificates: completed.length },
    });
    const parishName = completed[0].class.community.parish.name;
    return this.pdfService.renderCertificateDocument({
      title: 'Certificado de Conclusão',
      organization: parishName,
      subtitle: 'Catequese — Iniciação à Vida Cristã',
      pages: completed.map((enrollment) => ({
        recipientName: enrollment.member.fullName,
        bodyParagraphs: this.certificateBody(enrollment),
        signatureLines: ['Pároco', 'Coordenação da Catequese'],
      })),
      footer: `${klass.name} · Emitido pelo Parish em ${new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
    });
  }

  /** Lista da turma (PDF) para o primeiro encontro / mural da sala. */
  async generateClassRoster(classId: string, user: CurrentUser): Promise<Buffer> {
    const klass = await this.assertClassOperationalAccess(classId, user);
    const enrollments = await this.prisma.catechesisEnrollment.findMany({
      where: { classId, status: { in: ['ACTIVE', 'PENDING_APPROVAL'] }, member: { deletedAt: null } },
      include: {
        member: {
          select: {
            fullName: true,
            birthDate: true,
            phone: true,
            responsible: { select: { fullName: true, phone: true } },
          },
        },
      },
      orderBy: { member: { fullName: 'asc' } },
    });
    const details = await this.prisma.catechesisClass.findUniqueOrThrow({
      where: { id: classId },
      include: {
        stage: { select: { name: true } },
        community: { include: { parish: { select: { name: true } } } },
        catechists: { include: { member: { select: { fullName: true } } } },
      },
    });
    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'EXPORT',
      entity: 'CatechesisClass',
      entityId: classId,
      metadata: { roster: enrollments.length },
    });
    const weekLabel =
      details.weekday !== null && details.weekday !== undefined
        ? ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][details.weekday]
        : 'a definir';
    return this.pdfService.renderTableDocument({
      title: `Lista da turma — ${details.name} (${details.year})`,
      subtitle: `${details.stage.name} · ${details.community.name} — ${details.community.parish.name} · ${weekLabel}${details.time ? ` às ${details.time}` : ''}${details.room ? ` · ${details.room}` : ''}`,
      sections: [
        {
          heading: `Catequistas: ${details.catechists.map((c) => c.member.fullName).join(', ') || '—'}`,
          columns: ['Catequizando', 'Nascimento', 'Responsável', 'Contato', 'Situação', 'Docs pendentes'],
          widths: [3, 1.4, 2.4, 1.8, 1.4, 2],
          rows: enrollments.map((enrollment) => [
            enrollment.member.fullName,
            enrollment.member.birthDate
              ? enrollment.member.birthDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
              : '—',
            enrollment.member.responsible?.fullName ?? '—',
            enrollment.member.responsible?.phone ?? enrollment.member.phone ?? '—',
            enrollment.status === 'PENDING_APPROVAL' ? 'Aguardando' : 'Ativo',
            enrollment.pendingDocuments ?? '—',
          ]),
        },
      ],
      footer: `Emitido pelo Parish em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
    });
  }

  /** Declaração de matrícula/frequência (pedida por escolas). */
  async generateEnrollmentDeclaration(enrollmentId: string, user: CurrentUser): Promise<Buffer> {
    const enrollment = await this.loadEnrollmentForDocument(enrollmentId, user);
    if (enrollment.status !== 'ACTIVE' && enrollment.status !== 'COMPLETED') {
      throw new BadRequestException('Declaração disponível para matrículas ativas ou concluídas');
    }
    const total = enrollment.attendances.length;
    const present = enrollment.attendances.filter((a) => a.present).length;
    const attendanceLine = total
      ? `Frequência registrada até a presente data: ${Math.round((present / total) * 100)}% (${present} de ${total} encontros).`
      : 'Encontros ainda não registrados no período.';
    const statusLine =
      enrollment.status === 'ACTIVE'
        ? `encontra-se regularmente MATRICULADO(A) e frequente na ${enrollment.class.name} (${enrollment.class.year}), etapa "${enrollment.class.stage.name}",`
        : `CONCLUIU a ${enrollment.class.name} (${enrollment.class.year}), etapa "${enrollment.class.stage.name}",`;
    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'EXPORT',
      entity: 'CatechesisEnrollment',
      entityId: enrollmentId,
      metadata: { declaration: true },
    });
    return this.pdfService.renderCertificateDocument({
      title: 'Declaração de Matrícula',
      organization: enrollment.class.community.parish.name,
      subtitle: 'Catequese — Iniciação à Vida Cristã',
      orientation: 'portrait',
      pages: [
        {
          recipientName: enrollment.member.fullName,
          bodyParagraphs: [
            `Declaramos, para os devidos fins, que ${enrollment.member.fullName}`,
            statusLine,
            `da ${enrollment.class.community.name} — ${enrollment.class.community.parish.name}.`,
            attendanceLine,
          ],
          signatureLines: ['Coordenação da Catequese'],
        },
      ],
      footer: `Emitido pelo Parish em ${new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
    });
  }

  // ===== AGENDA DO ANO EM LOTE (Fase 4) =====

  /**
   * Cria os encontros do período de uma vez (datas escolhidas na prévia do
   * front, já sem feriados). Dias que já têm encontro são pulados; as famílias
   * recebem UM único aviso-resumo, não um push por encontro.
   */
  async generateSessions(classId: string, dto: { dates: string[] }, user: CurrentUser) {
    const klass = await this.assertClassOperationalAccess(classId, user);

    const raw = [...new Set(dto.dates ?? [])];
    if (!raw.length) throw new BadRequestException('Informe as datas dos encontros');
    if (raw.length > 100) throw new BadRequestException('No máximo 100 encontros por geração');

    const currentYear = new Date().getFullYear();
    const dates: Date[] = [];
    for (const value of raw) {
      const parsed = new Date(value);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(String(value)) ||
        Number.isNaN(parsed.getTime()) ||
        parsed.toISOString().slice(0, 10) !== value
      ) {
        throw new BadRequestException(`Data inválida: ${value} — use AAAA-MM-DD`);
      }
      const year = parsed.getUTCFullYear();
      if (year < currentYear - 1 || year > currentYear + 2) {
        throw new BadRequestException(
          `Data fora da janela permitida (${currentYear - 1} a ${currentYear + 2}): ${value}`,
        );
      }
      dates.push(parsed);
    }
    dates.sort((a, b) => a.getTime() - b.getTime());

    // Dedup por DIA CIVIL: encontros legados podem ter hora embutida (pré-Fase 3)
    // e igualdade exata de timestamp não os casaria, dobrando o dia na agenda.
    const rangeStart = dates[0];
    const rangeEnd = new Date(dates[dates.length - 1].getTime() + 24 * 60 * 60 * 1000);
    const existing = await this.prisma.catechesisSession.findMany({
      where: { classId, date: { gte: rangeStart, lt: rangeEnd } },
      select: { date: true },
    });
    const existingDays = new Set(existing.map((session) => session.date.toISOString().slice(0, 10)));
    const toCreate = dates.filter((date) => !existingDays.has(date.toISOString().slice(0, 10)));

    // Teto por turma: freio de flood de linhas/push (agenda real cabe folgada)
    if (toCreate.length) {
      const sessionCount = await this.prisma.catechesisSession.count({ where: { classId } });
      if (sessionCount + toCreate.length > 500) {
        throw new BadRequestException('Limite de encontros da turma atingido — fale com o suporte');
      }
      await this.prisma.catechesisSession.createMany({
        data: toCreate.map((date) => ({ classId, date })),
        skipDuplicates: true,
      });
    }

    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'CREATE',
      entity: 'CatechesisAgenda',
      entityId: classId,
      metadata: { created: toCreate.length, skipped: dates.length - toCreate.length },
    });

    // Um único aviso-resumo às famílias (best-effort) — e só para agendas com
    // datas de HOJE em diante: lançamento retroativo (backfill de chamadas) não
    // deve anunciar "encontros agendados" que já passaram.
    const upcoming = toCreate.filter((date) => date.getTime() >= this.startOfTodayUtc().getTime());
    if (upcoming.length) {
      try {
        const enrollments = await this.prisma.catechesisEnrollment.findMany({
          where: { classId, status: 'ACTIVE' },
          select: {
            member: { select: { userId: true, responsible: { select: { userId: true } } } },
          },
        });
        const userIds = [...new Set(enrollments.flatMap((e) => this.guardianUserIds(e.member)))];
        if (userIds.length) {
          const first = this.formatDayLabel(upcoming[0]);
          const last = this.formatDayLabel(upcoming[upcoming.length - 1]);
          await this.notificationsService.notifyUsers(
            userIds,
            NotificationType.CATECHESIS,
            'Agenda da catequese publicada 📅',
            `${klass.name}: ${upcoming.length} encontro(s) agendado(s) de ${first} a ${last}${klass.time ? `, às ${klass.time}` : ''}.`,
            { kind: 'agenda', classId },
          );
        }
      } catch (error) {
        // Aviso é conveniência
      }
    }

    return { created: toCreate.length, skipped: dates.length - toCreate.length };
  }

  // ===== DOCUMENTOS DA MATRÍCULA (envio pelo app) =====

  private static readonly DOCUMENT_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ]);
  private static readonly DOCUMENT_MAX_BYTES = 8 * 1024 * 1024;

  /**
   * Família envia o documento pendente (foto/PDF). Um envio SUBMITTED por
   * (matrícula, tipo) — reenviar substitui. Binário vive só até a conferência.
   */
  async submitDocument(
    enrollmentId: string,
    dto: { kind: string },
    file: { originalname?: string; mimetype?: string; size?: number; buffer?: Buffer } | undefined,
    user: CurrentUser,
  ) {
    const kind = dto.kind?.trim();
    if (!kind || kind.length < 2 || kind.length > 80) {
      throw new BadRequestException('Informe o tipo do documento (ex.: "Certidão de Batismo")');
    }
    if (!file?.buffer?.length) {
      throw new BadRequestException('Anexe o arquivo (foto ou PDF)');
    }
    if (!CatechesisService.DOCUMENT_MIME_TYPES.has(file.mimetype ?? '')) {
      throw new BadRequestException('Formato não aceito — envie JPG, PNG, WebP ou PDF');
    }
    if (file.buffer.length > CatechesisService.DOCUMENT_MAX_BYTES) {
      throw new BadRequestException('Arquivo muito grande — máximo de 8 MB');
    }

    // Família do catequizando OU equipe da turma (guard já cobre os dois)
    const enrollment = await this.loadEnrollmentForDocument(enrollmentId, user);
    if (enrollment.status !== 'ACTIVE' && enrollment.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Documentos só podem ser enviados para matrículas ativas ou aguardando aprovação');
    }

    // Substitui envio anterior do mesmo tipo ainda não conferido; índice único
    // parcial no banco garante 1 SUBMITTED por (matrícula, tipo) mesmo em corrida
    let document;
    try {
      document = await this.prisma.$transaction(async (tx) => {
        // Freio de flood: o que pesa são os binários (SUBMITTED, até 8MB cada);
        // conferidos/recusados já não têm arquivo e não travam a matrícula
        const submittedCount = await tx.catechesisDocument.count({
          where: { enrollmentId, status: 'SUBMITTED' },
        });
        if (submittedCount >= 10) {
          throw new BadRequestException('Há 10 documentos aguardando conferência nesta matrícula — aguarde a coordenação conferir antes de enviar mais');
        }
        const totalCount = await tx.catechesisDocument.count({ where: { enrollmentId } });
        if (totalCount >= 100) {
          throw new BadRequestException('Limite de documentos desta matrícula atingido — fale com a coordenação');
        }
        await tx.catechesisDocument.deleteMany({
          where: { enrollmentId, kind: { equals: kind, mode: 'insensitive' }, status: 'SUBMITTED' },
        });
        return tx.catechesisDocument.create({
          data: {
            enrollmentId,
            kind,
            fileName: (file.originalname ?? 'documento').slice(0, 120),
            mimeType: file.mimetype ?? 'application/octet-stream',
            sizeBytes: file.buffer!.length,
            data: new Uint8Array(file.buffer!),
          },
          select: { id: true, kind: true, status: true, createdAt: true },
        });
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new BadRequestException('Documento já enviado — atualize a tela');
      }
      throw error;
    }

    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'CREATE',
      entity: 'CatechesisDocument',
      entityId: document.id,
      metadata: { enrollmentId, kind, sizeBytes: file.buffer.length },
    });

    // Avisa a equipe da turma (best-effort)
    try {
      const catechists = await this.prisma.catechesisCatechist.findMany({
        where: { classId: enrollment.class.id },
        select: { member: { select: { userId: true } } },
      });
      const userIds = [...new Set(catechists.map((c) => c.member.userId).filter((id): id is string => !!id))];
      if (userIds.length) {
        await this.notificationsService.notifyUsers(
          userIds,
          NotificationType.CATECHESIS,
          'Documento recebido 📎',
          `${enrollment.member.fullName} enviou "${kind}" — confira na turma para dar baixa na pendência.`,
          { kind: 'document', enrollmentId, documentId: document.id },
        );
      }
    } catch (error) {
      // Aviso é conveniência
    }

    return document;
  }

  /** Documentos da matrícula (metadados) — família ou equipe. */
  async listDocuments(enrollmentId: string, user: CurrentUser) {
    await this.loadEnrollmentForDocument(enrollmentId, user);
    return this.prisma.catechesisDocument.findMany({
      where: { enrollmentId },
      select: {
        id: true,
        kind: true,
        fileName: true,
        mimeType: true,
        sizeBytes: true,
        status: true,
        reviewNotes: true,
        reviewedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Binário do documento — equipe da turma OU a própria família (enquanto SUBMITTED). */
  async getDocumentFile(documentId: string, user: CurrentUser) {
    const document = await this.prisma.catechesisDocument.findUnique({
      where: { id: documentId },
      include: {
        enrollment: {
          include: {
            member: {
              select: { fullName: true, userId: true, deletedAt: true, responsible: { select: { userId: true } } },
            },
            class: { select: { id: true } },
          },
        },
      },
    });
    if (!document || document.enrollment.member.deletedAt) {
      throw new NotFoundException('Documento não encontrado');
    }
    const isFamily = this.guardianUserIds(document.enrollment.member).includes(user.id);
    if (!isFamily) {
      await this.assertClassOperationalAccess(document.enrollment.class.id, user);
    }
    if (!document.data) {
      throw new NotFoundException('O arquivo já foi conferido e removido (retenção mínima)');
    }
    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'EXPORT',
      entity: 'CatechesisDocument',
      entityId: documentId,
      metadata: { view: true },
    });
    return {
      fileName: document.fileName,
      mimeType: document.mimeType,
      buffer: Buffer.from(document.data),
    };
  }

  /**
   * Conferência: aprova (dá baixa na pendência) ou recusa (pede reenvio).
   * Em ambos os casos o binário é APAGADO — retenção mínima (LGPD).
   */
  async reviewDocument(
    documentId: string,
    dto: { approve: boolean; notes?: string },
    user: CurrentUser,
  ) {
    const notes = dto.notes?.trim().slice(0, 300) || null;
    const document = await this.prisma.catechesisDocument.findUnique({
      where: { id: documentId },
      include: {
        enrollment: {
          include: {
            member: {
              select: { fullName: true, userId: true, deletedAt: true, responsible: { select: { userId: true } } },
            },
            class: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!document || document.enrollment.member.deletedAt) {
      throw new NotFoundException('Documento não encontrado');
    }
    await this.assertClassOperationalAccess(document.enrollment.class.id, user);
    if (document.status !== 'SUBMITTED') {
      throw new BadRequestException('Este documento já foi conferido');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Guarda de status no próprio update: duas conferências simultâneas não
      // se sobrescrevem — a segunda falha como "já conferido"
      const guarded = await tx.catechesisDocument.updateMany({
        where: { id: documentId, status: 'SUBMITTED' },
        data: {
          status: dto.approve ? 'VERIFIED' : 'REJECTED',
          reviewNotes: notes,
          reviewedById: user.id,
          reviewedAt: new Date(),
          data: null, // retenção mínima: o arquivo morre na conferência
        },
      });
      if (guarded.count === 0) {
        throw new BadRequestException('Este documento já foi conferido');
      }

      // Aprovado: dá baixa na pendência correspondente da matrícula.
      // Pendência RELIDA aqui dentro — duas aprovações quase simultâneas de
      // documentos diferentes não ressuscitam pendência já baixada.
      if (dto.approve) {
        const fresh = await tx.catechesisEnrollment.findUnique({
          where: { id: document.enrollmentId },
          select: { pendingDocuments: true },
        });
        const pending = fresh?.pendingDocuments;
        if (pending) {
          const remaining = pending
            .split(/[;,]/)
            .map((part) => part.trim())
            .filter((part) => part && part.toLowerCase() !== document.kind.toLowerCase());
          await tx.catechesisEnrollment.update({
            where: { id: document.enrollmentId },
            data: { pendingDocuments: remaining.length ? remaining.join('; ') : null },
          });
        }
      }
      return { id: documentId, kind: document.kind, status: dto.approve ? 'VERIFIED' : 'REJECTED' };
    });

    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'UPDATE',
      entity: 'CatechesisDocument',
      entityId: documentId,
      metadata: { approved: dto.approve, notes },
    });

    try {
      const userIds = this.guardianUserIds(document.enrollment.member);
      if (userIds.length) {
        await this.notificationsService.notifyUsers(
          userIds,
          NotificationType.CATECHESIS,
          dto.approve ? 'Documento conferido ✓' : 'Documento recusado',
          dto.approve
            ? `"${document.kind}" de ${document.enrollment.member.fullName} foi conferido — pendência resolvida. Obrigado!`
            : `"${document.kind}" de ${document.enrollment.member.fullName} foi recusado${notes ? `: ${notes}` : ''}. Envie novamente pelo app.`,
          { kind: 'document-review', enrollmentId: document.enrollmentId, documentId },
        );
      }
    } catch (error) {
      // Aviso é conveniência
    }
    return updated;
  }

  // ===== PARECERES POR PERÍODO (Fase 5) =====

  /** Matrícula operável pela equipe (parecer, taxa): turma + membro vivo. */
  private async loadEnrollmentForTeam(enrollmentId: string, user: CurrentUser) {
    const enrollment = await this.prisma.catechesisEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        member: {
          select: { fullName: true, userId: true, deletedAt: true, responsible: { select: { userId: true } } },
        },
        class: { select: { id: true, name: true } },
      },
    });
    if (!enrollment || enrollment.member.deletedAt) {
      throw new NotFoundException('Matrícula não encontrada');
    }
    await this.assertClassOperationalAccess(enrollment.class.id, user);
    return enrollment;
  }

  /**
   * Cria/atualiza o parecer do período (upsert): o catequista escreve, a
   * família lê. Um parecer por matrícula+período.
   */
  async upsertAssessment(
    enrollmentId: string,
    dto: { period: string; rating?: string; notes: string },
    user: CurrentUser,
  ) {
    const period = dto.period?.trim();
    const notes = dto.notes?.trim();
    if (!period || period.length < 3 || period.length > 60) {
      throw new BadRequestException('Informe o período (ex.: "1º semestre 2026")');
    }
    if (!notes || notes.length < 5 || notes.length > 2000) {
      throw new BadRequestException('O parecer deve ter entre 5 e 2000 caracteres');
    }
    let rating: CatechesisRating | null = null;
    if (dto.rating) {
      if (!Object.values(CatechesisRating).includes(dto.rating as CatechesisRating)) {
        throw new BadRequestException('Conceito inválido');
      }
      rating = dto.rating as CatechesisRating;
    }

    const enrollment = await this.loadEnrollmentForTeam(enrollmentId, user);

    const assessment = await this.prisma.catechesisAssessment.upsert({
      where: { enrollmentId_period: { enrollmentId, period } },
      create: { enrollmentId, period, rating, notes, createdById: user.id },
      update: { rating, notes },
    });
    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'UPDATE',
      entity: 'CatechesisAssessment',
      entityId: assessment.id,
      metadata: { enrollmentId, period },
    });
    try {
      const userIds = this.guardianUserIds(enrollment.member);
      if (userIds.length) {
        await this.notificationsService.notifyUsers(
          userIds,
          NotificationType.CATECHESIS,
          'Parecer da catequese disponível 📝',
          `O catequista registrou o parecer de ${enrollment.member.fullName} (${period}) — veja no acompanhamento da família.`,
          { kind: 'assessment', enrollmentId, assessmentId: assessment.id },
        );
      }
    } catch (error) {
      // Aviso é conveniência
    }
    return assessment;
  }

  /**
   * Parecer em LOTE: o mesmo período/conceito/texto para vários catequizandos
   * de uma vez (ex.: fechamento de semestre). Upsert por matrícula — quem já
   * tem parecer no período recebe o texto novo.
   */
  async upsertAssessmentsBatch(
    classId: string,
    dto: { period: string; rating?: string; notes: string; enrollmentIds: string[] },
    user: CurrentUser,
  ) {
    const period = dto.period?.trim();
    const notes = dto.notes?.trim();
    if (!period || period.length < 3 || period.length > 60) {
      throw new BadRequestException('Informe o período (ex.: "1º semestre 2026")');
    }
    if (!notes || notes.length < 5 || notes.length > 2000) {
      throw new BadRequestException('O parecer deve ter entre 5 e 2000 caracteres');
    }
    let rating: CatechesisRating | null = null;
    if (dto.rating) {
      if (!Object.values(CatechesisRating).includes(dto.rating as CatechesisRating)) {
        throw new BadRequestException('Conceito inválido');
      }
      rating = dto.rating as CatechesisRating;
    }
    const ids = [...new Set(dto.enrollmentIds ?? [])];
    if (!ids.length) throw new BadRequestException('Selecione ao menos um catequizando');
    if (ids.length > 100) throw new BadRequestException('No máximo 100 catequizandos por vez');

    await this.assertClassOperationalAccess(classId, user);

    // Todas as matrículas precisam ser DESTA turma, efetivas e de membros vivos
    const enrollments = await this.prisma.catechesisEnrollment.findMany({
      where: {
        id: { in: ids },
        classId,
        status: { in: ['ACTIVE', 'COMPLETED'] },
        member: { deletedAt: null },
      },
      include: {
        member: { select: { fullName: true, userId: true, responsible: { select: { userId: true } } } },
      },
    });
    if (enrollments.length !== ids.length) {
      throw new BadRequestException('Uma ou mais matrículas não pertencem a esta turma (ou não estão ativas/concluídas)');
    }

    await this.prisma.$transaction(
      enrollments.map((enrollment) =>
        this.prisma.catechesisAssessment.upsert({
          where: { enrollmentId_period: { enrollmentId: enrollment.id, period } },
          create: { enrollmentId: enrollment.id, period, rating, notes, createdById: user.id },
          update: { rating, notes },
        }),
      ),
    );

    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'UPDATE',
      entity: 'CatechesisAssessmentBatch',
      entityId: classId,
      metadata: { period, count: enrollments.length },
    });

    // Cada família recebe o aviso do próprio catequizando (best-effort)
    try {
      for (const enrollment of enrollments) {
        const userIds = this.guardianUserIds(enrollment.member);
        if (!userIds.length) continue;
        await this.notificationsService.notifyUsers(
          userIds,
          NotificationType.CATECHESIS,
          'Parecer da catequese disponível 📝',
          `O catequista registrou o parecer de ${enrollment.member.fullName} (${period}) — veja no acompanhamento da família.`,
          { kind: 'assessment', enrollmentId: enrollment.id },
        );
      }
    } catch (error) {
      // Aviso é conveniência
    }

    return { saved: enrollments.length };
  }

  /** Frequência detalhada da matrícula (por encontro) — equipe OU família. */
  async getEnrollmentAttendance(enrollmentId: string, user: CurrentUser) {
    await this.loadEnrollmentForDocument(enrollmentId, user);
    const attendances = await this.prisma.catechesisAttendance.findMany({
      where: { enrollmentId },
      include: { session: { select: { date: true, topic: true } } },
      orderBy: { session: { date: 'desc' } },
    });
    return attendances.map((attendance) => ({
      date: attendance.session.date,
      topic: attendance.session.topic,
      present: attendance.present,
      late: attendance.late,
    }));
  }

  /** Pareceres da matrícula — equipe da turma OU a própria família. */
  async listAssessments(enrollmentId: string, user: CurrentUser) {
    await this.loadEnrollmentForDocument(enrollmentId, user);
    return this.prisma.catechesisAssessment.findMany({
      where: { enrollmentId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, period: true, rating: true, notes: true, createdAt: true, updatedAt: true },
    });
  }

  // ===== TAXA DE MATERIAL (Fase 5) =====

  /** Cria a taxa da turma (opcional por paróquia: existe se a coordenação criar). */
  async createFee(
    classId: string,
    dto: { description: string; amount: number; dueDate?: string },
    user: CurrentUser,
  ) {
    const description = dto.description?.trim();
    if (!description || description.length < 3 || description.length > 80) {
      throw new BadRequestException('Descreva a taxa (ex.: "Material 2026")');
    }
    const amount = Math.round(Number(dto.amount) * 100) / 100;
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10000) {
      throw new BadRequestException('Valor da taxa inválido');
    }
    let dueDate: Date | null = null;
    if (dto.dueDate) {
      dueDate = new Date(dto.dueDate);
      if (Number.isNaN(dueDate.getTime())) throw new BadRequestException('Vencimento inválido');
    }
    const klass = await this.assertClassOperationalAccess(classId, user);

    const fee = await this.prisma.catechesisFee.create({
      data: { classId, description, amount, dueDate },
    });
    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'CREATE',
      entity: 'CatechesisFee',
      entityId: fee.id,
      metadata: { classId, amount },
    });
    // Aviso às famílias da turma (best-effort)
    try {
      const enrollments = await this.prisma.catechesisEnrollment.findMany({
        where: { classId, status: 'ACTIVE', member: { deletedAt: null } },
        select: { member: { select: { userId: true, responsible: { select: { userId: true } } } } },
      });
      const userIds = [...new Set(enrollments.flatMap((e) => this.guardianUserIds(e.member)))];
      if (userIds.length) {
        await this.notificationsService.notifyUsers(
          userIds,
          NotificationType.CATECHESIS,
          'Taxa de material da catequese 💰',
          `${klass.name}: ${description} — R$ ${amount.toFixed(2).replace('.', ',')}${dueDate ? ` até ${this.formatDayLabel(dueDate)}` : ''}. Procure a coordenação para acertar.`,
          { kind: 'fee', classId, feeId: fee.id },
        );
      }
    } catch (error) {
      // Aviso é conveniência
    }
    return fee;
  }

  /** Painel de taxas da turma: quem pagou, quem foi isento, quem falta. */
  async getClassFees(classId: string, user: CurrentUser) {
    await this.assertClassOperationalAccess(classId, user);
    const [fees, enrollments] = await Promise.all([
      this.prisma.catechesisFee.findMany({
        where: { classId },
        include: { payments: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.catechesisEnrollment.findMany({
        where: { classId, status: { in: ['ACTIVE', 'COMPLETED'] }, member: { deletedAt: null } },
        select: { id: true, member: { select: { fullName: true } } },
        orderBy: { member: { fullName: 'asc' } },
      }),
    ]);
    const shownIds = new Set(enrollments.map((enrollment) => enrollment.id));
    return fees.map((fee) => {
      const paymentByEnrollment = new Map(fee.payments.map((payment) => [payment.enrollmentId, payment]));
      const students = enrollments.map((enrollment) => {
        const payment = paymentByEnrollment.get(enrollment.id);
        return {
          enrollmentId: enrollment.id,
          fullName: enrollment.member.fullName,
          status: payment ? (payment.waived ? 'WAIVED' : 'PAID') : 'PENDING',
          amount: payment?.amount ?? null,
          method: payment?.method ?? null,
          paidAt: payment?.paidAt ?? null,
        };
      });
      // Pagamentos de quem saiu da matriz (transferido/desistente) ficam
      // discriminados — senão o 'arrecadado' contradiz os contadores exibidos
      const shownPayments = fee.payments.filter((payment) => shownIds.has(payment.enrollmentId));
      const otherPayments = fee.payments.filter(
        (payment) => !shownIds.has(payment.enrollmentId) && !payment.waived,
      );
      return {
        id: fee.id,
        description: fee.description,
        amount: fee.amount,
        dueDate: fee.dueDate,
        collected: shownPayments.filter((payment) => !payment.waived).reduce((sum, payment) => sum + payment.amount, 0),
        othersCollected: otherPayments.reduce((sum, payment) => sum + payment.amount, 0),
        othersCount: otherPayments.length,
        paidCount: students.filter((student) => student.status === 'PAID').length,
        waivedCount: students.filter((student) => student.status === 'WAIVED').length,
        pendingCount: students.filter((student) => student.status === 'PENDING').length,
        students,
      };
    });
  }

  /**
   * Registra o pagamento (ou a isenção pastoral) da taxa de UM catequizando.
   * Pagamento entra no financeiro como receita "Catequese" da comunidade.
   */
  async recordFeePayment(
    feeId: string,
    dto: { enrollmentId: string; method?: string; waived?: boolean },
    user: CurrentUser,
  ) {
    const fee = await this.prisma.catechesisFee.findUnique({
      where: { id: feeId },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            communityId: true,
            community: { select: { parishId: true, parish: { select: { dioceseId: true } } } },
          },
        },
      },
    });
    if (!fee) throw new NotFoundException('Taxa não encontrada');
    await this.assertClassOperationalAccess(fee.class.id, user);

    const enrollment = await this.prisma.catechesisEnrollment.findFirst({
      where: {
        id: dto.enrollmentId,
        classId: fee.class.id,
        status: { in: ['ACTIVE', 'COMPLETED'] },
        member: { deletedAt: null },
      },
      include: { member: { select: { fullName: true, userId: true, responsible: { select: { userId: true } } } } },
    });
    if (!enrollment) {
      throw new BadRequestException('Matrícula não pertence a esta turma (ou não está ativa)');
    }
    const existing = await this.prisma.catechesisFeePayment.findUnique({
      where: { feeId_enrollmentId: { feeId, enrollmentId: dto.enrollmentId } },
    });
    if (existing) {
      throw new BadRequestException(existing.waived ? 'Este catequizando já está isento' : 'Pagamento já registrado');
    }

    const waived = dto.waived === true;
    const method = dto.method?.trim().slice(0, 40) || null;

    const payment = await this.prisma.$transaction(async (tx) => {
      let transactionId: string | null = null;
      if (!waived) {
        const financial = await tx.financialTransaction.create({
          data: {
            type: TransactionType.INCOME,
            category: 'Catequese',
            amount: fee.amount,
            description: `${fee.description} — ${enrollment.member.fullName} (${fee.class.name})`,
            date: new Date(),
            communityId: fee.class.communityId,
            parishId: fee.class.community.parishId,
            dioceseId: fee.class.community.parish.dioceseId,
          },
        });
        transactionId = financial.id;
      }
      return tx.catechesisFeePayment.create({
        data: {
          feeId,
          enrollmentId: dto.enrollmentId,
          amount: waived ? 0 : fee.amount,
          method: waived ? null : method,
          waived,
          transactionId,
        },
      });
    });

    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'CREATE',
      entity: 'CatechesisFeePayment',
      entityId: payment.id,
      metadata: { feeId, enrollmentId: dto.enrollmentId, waived, amount: payment.amount },
    });
    try {
      const userIds = this.guardianUserIds(enrollment.member);
      if (userIds.length && !waived) {
        await this.notificationsService.notifyUsers(
          userIds,
          NotificationType.CATECHESIS,
          'Pagamento registrado ✓',
          `${fee.description} de ${enrollment.member.fullName} — R$ ${fee.amount.toFixed(2).replace('.', ',')} recebido. Obrigado!`,
          { kind: 'fee-payment', feeId, enrollmentId: dto.enrollmentId },
        );
      }
    } catch (error) {
      // Aviso é conveniência
    }
    return payment;
  }

  // ===== VISÃO DIOCESANA (Fase 5) =====

  /**
   * Catequizandos por paróquia e etapa em toda a diocese — leitura que nenhum
   * concorrente oferece. DIOCESAN_ADMIN (ou SYSTEM_ADMIN com dioceseId).
   */
  async getDioceseOverview(user: CurrentUser, dioceseId?: string) {
    const targetDioceseId = user.role === UserRole.SYSTEM_ADMIN ? (dioceseId ?? user.dioceseId) : user.dioceseId;
    if (!targetDioceseId) {
      throw new BadRequestException('Informe a diocese (dioceseId)');
    }

    const stages = await this.prisma.catechesisStage.findMany({
      where: { deletedAt: null, parish: { dioceseId: targetDioceseId } },
      select: {
        id: true,
        name: true,
        ordering: true,
        sacramentType: true,
        parishId: true,
        parish: { select: { name: true } },
        classes: {
          where: { deletedAt: null, status: 'ACTIVE' },
          select: { id: true },
        },
      },
      orderBy: [{ parish: { name: 'asc' } }, { ordering: 'asc' }],
    });

    const enrollments = await this.prisma.catechesisEnrollment.findMany({
      where: {
        status: { in: ['ACTIVE', 'PENDING_APPROVAL', 'COMPLETED'] },
        member: { deletedAt: null },
        class: { deletedAt: null, stage: { parish: { dioceseId: targetDioceseId } } },
      },
      select: { status: true, class: { select: { stageId: true } } },
    });
    const byStage = new Map<string, { active: number; pending: number; completed: number }>();
    for (const enrollment of enrollments) {
      const bucket = byStage.get(enrollment.class.stageId) ?? { active: 0, pending: 0, completed: 0 };
      if (enrollment.status === 'ACTIVE') bucket.active++;
      else if (enrollment.status === 'PENDING_APPROVAL') bucket.pending++;
      else bucket.completed++;
      byStage.set(enrollment.class.stageId, bucket);
    }

    const parishes = new Map<
      string,
      {
        parishId: string;
        parishName: string;
        stages: Array<{
          stageId: string;
          stageName: string;
          ordering: number;
          sacramentType: string | null;
          classes: number;
          active: number;
          pending: number;
          completed: number;
        }>;
        totals: { classes: number; active: number; pending: number; completed: number };
      }
    >();
    for (const stage of stages) {
      const counts = byStage.get(stage.id) ?? { active: 0, pending: 0, completed: 0 };
      let parish = parishes.get(stage.parishId);
      if (!parish) {
        parish = {
          parishId: stage.parishId,
          parishName: stage.parish.name,
          stages: [],
          totals: { classes: 0, active: 0, pending: 0, completed: 0 },
        };
        parishes.set(stage.parishId, parish);
      }
      parish.stages.push({
        stageId: stage.id,
        stageName: stage.name,
        ordering: stage.ordering,
        sacramentType: stage.sacramentType,
        classes: stage.classes.length,
        ...counts,
      });
      parish.totals.classes += stage.classes.length;
      parish.totals.active += counts.active;
      parish.totals.pending += counts.pending;
      parish.totals.completed += counts.completed;
    }

    const parishList = [...parishes.values()];
    return {
      dioceseId: targetDioceseId,
      parishes: parishList,
      totals: parishList.reduce(
        (sum, parish) => ({
          parishes: sum.parishes + 1,
          classes: sum.classes + parish.totals.classes,
          active: sum.active + parish.totals.active,
          pending: sum.pending + parish.totals.pending,
          completed: sum.completed + parish.totals.completed,
        }),
        { parishes: 0, classes: 0, active: 0, pending: 0, completed: 0 },
      ),
    };
  }

  // ===== PAINEL DO COORDENADOR =====

  async getClassReport(classId: string, user: CurrentUser) {
    await this.assertClassOperationalAccess(classId, user);

    const catechists = await this.prisma.catechesisCatechist.findMany({
      where: { classId },
      include: { member: { select: { id: true, fullName: true } } },
      orderBy: { member: { fullName: 'asc' } },
    });

    const enrollments = await this.prisma.catechesisEnrollment.findMany({
      // Membro soft-deletado (direito de eliminação) não aparece nem conta
      where: { classId, member: { deletedAt: null } },
      include: {
        member: { select: { id: true, fullName: true } },
        attendances: { select: { present: true } },
        documents: { select: { status: true } },
      },
    });

    const rows = enrollments.map((e) => {
      const total = e.attendances.length;
      const present = e.attendances.filter((a) => a.present).length;
      return {
        enrollmentId: e.id,
        member: e.member,
        status: e.status,
        pendingDocuments: e.pendingDocuments,
        submittedDocs: e.documents.filter((doc) => doc.status === 'SUBMITTED').length,
        docsCount: e.documents.length,
        attendanceRate: total ? Math.round((present / total) * 100) : null,
        sessions: total,
      };
    });

    return {
      catechists: catechists.map((link) => ({
        memberId: link.member.id,
        fullName: link.member.fullName,
        role: link.role ?? 'Catequista',
      })),
      // Recusadas nunca foram matrículas — ficam fora do total (mas na lista)
      total: rows.filter((r) => r.status !== 'REJECTED').length,
      active: rows.filter((r) => r.status === 'ACTIVE').length,
      dropouts: rows.filter((r) => r.status === 'DROPPED_OUT').length,
      completed: rows.filter((r) => r.status === 'COMPLETED').length,
      pending: rows.filter((r) => r.status === 'PENDING_APPROVAL').length,
      students: rows,
    };
  }
}
