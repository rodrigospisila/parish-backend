import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { NotificationType, SacramentType, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService, CurrentUser } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

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
    if (user.role !== UserRole.SYSTEM_ADMIN && user.parishId) {
      where.parishId = user.parishId;
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
        _count: { select: { enrollments: { where: { status: 'ACTIVE' } }, sessions: true } },
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
                enrollments: { where: { status: 'ACTIVE' } },
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

  async addCatechist(classId: string, memberId: string, role: string | undefined, user: CurrentUser) {
    await this.loadClassInScope(classId, user);
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

  // ===== MATRÍCULA =====

  async enroll(
    dto: { classId: string; memberId: string; pendingDocuments?: string; requireBaptism?: boolean },
    user: CurrentUser,
  ) {
    const klass = await this.loadClassInScope(dto.classId, user);

    const member = await this.prisma.member.findFirst({
      where: { id: dto.memberId, deletedAt: null },
      select: { id: true, sacraments: { select: { type: true } } },
    });
    if (!member) {
      throw new NotFoundException('Catequizando (membro) não encontrado');
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
    return { classId, status: { in: ['ACTIVE', 'PENDING_APPROVAL'] as any } };
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
        _count: { select: { enrollments: { where: { status: { in: ['ACTIVE', 'PENDING_APPROVAL'] } } } } },
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

  // ===== PAINEL DO COORDENADOR =====

  async getClassReport(classId: string, user: CurrentUser) {
    await this.assertClassOperationalAccess(classId, user);

    const enrollments = await this.prisma.catechesisEnrollment.findMany({
      where: { classId },
      include: {
        member: { select: { id: true, fullName: true } },
        attendances: { select: { present: true } },
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
        attendanceRate: total ? Math.round((present / total) * 100) : null,
        sessions: total,
      };
    });

    return {
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
