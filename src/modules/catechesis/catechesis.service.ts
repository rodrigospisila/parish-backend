import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SacramentType, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService, CurrentUser } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';

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
  ) {}

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

  private async assertCommunityScope(communityId: string, user: CurrentUser) {
    const inScope = await this.hierarchyService.isCommunityInScope(user, communityId);
    if (!inScope) {
      throw new ForbiddenException('Comunidade fora do seu escopo');
    }
  }

  // ===== ETAPAS (catálogo por paróquia) =====

  async createStage(
    dto: { name: string; description?: string; ordering?: number; sacramentType?: SacramentType },
    user: CurrentUser,
  ) {
    if (!this.isParishManager(user.role)) {
      throw new ForbiddenException('Somente a administração paroquial cadastra etapas de catequese');
    }
    if (!user.parishId && user.role !== UserRole.SYSTEM_ADMIN) {
      throw new BadRequestException('Usuário sem paróquia vinculada');
    }
    // SYSTEM_ADMIN precisa informar a paróquia via escopo; usamos o parishId do usuário
    const parishId = user.parishId;
    if (!parishId) {
      throw new BadRequestException('parishId é obrigatório');
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
    dto: { name: string; year: number; stageId: string; communityId: string; weekday?: number; time?: string; room?: string },
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
        _count: { select: { enrollments: true, sessions: true } },
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

    const updated = await this.prisma.catechesisEnrollment.update({
      where: { id: enrollmentId },
      data: { classId: targetClassId, status: 'TRANSFERRED' },
    });
    await this.auditService.log({ actor: this.auditActor(user), action: 'UPDATE', entity: 'CatechesisEnrollment', entityId: enrollmentId, metadata: { transferredTo: targetClassId } });
    return updated;
  }

  // ===== ENCONTROS E CHAMADA =====

  async createSession(classId: string, dto: { date: string; topic?: string }, user: CurrentUser) {
    await this.assertClassOperationalAccess(classId, user);
    return this.prisma.catechesisSession.create({
      data: { classId, date: new Date(dto.date), topic: dto.topic ?? null },
    });
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

    for (const entry of entries) {
      // Atrasado conta como presente (marcação de acompanhamento)
      const late = entry.late === true;
      const present = entry.present || late;
      await this.prisma.catechesisAttendance.upsert({
        where: { sessionId_enrollmentId: { sessionId, enrollmentId: entry.enrollmentId } },
        create: { sessionId, enrollmentId: entry.enrollmentId, present, late },
        update: { present, late },
      });
    }
    return { marked: entries.length };
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
      total: rows.length,
      active: rows.filter((r) => r.status === 'ACTIVE').length,
      dropouts: rows.filter((r) => r.status === 'DROPPED_OUT').length,
      completed: rows.filter((r) => r.status === 'COMPLETED').length,
      students: rows,
    };
  }
}
