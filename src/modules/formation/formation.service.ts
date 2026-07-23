import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService, CurrentUser } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';
import { PdfService } from '../pdf/pdf.service';

/**
 * Formação de agentes (roadmap 3.4).
 * Trilhas → cursos → inscrições → conclusão (com validade/renovação) → certificado.
 * Pré-requisito: cursos podem ser exigidos para uma função (checkPrerequisite),
 * base para bloquear escalação sem formação válida.
 */
@Injectable()
export class FormationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
    private readonly auditService: AuditService,
    private readonly pdfService: PdfService,
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

  private requireParish(user: CurrentUser) {
    if (user.role === UserRole.SYSTEM_ADMIN) return user.parishId ?? null;
    if (!user.parishId) throw new BadRequestException('Usuário sem paróquia vinculada');
    return user.parishId;
  }

  // ===== TRILHAS E CURSOS (catálogo por paróquia) =====

  async createTrack(dto: { name: string; description?: string }, user: CurrentUser) {
    if (!this.isParishManager(user.role)) throw new ForbiddenException('Sem permissão');
    const parishId = this.requireParish(user);
    if (!parishId) throw new BadRequestException('parishId é obrigatório');
    return this.prisma.formationTrack.create({
      data: { name: dto.name, description: dto.description ?? null, parishId },
    });
  }

  async listTracks(user: CurrentUser) {
    const where: any = { deletedAt: null };
    if (user.role !== UserRole.SYSTEM_ADMIN && user.parishId) where.parishId = user.parishId;
    return this.prisma.formationTrack.findMany({
      where,
      include: { _count: { select: { courses: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createCourse(
    dto: { name: string; description?: string; trackId?: string; validityMonths?: number; requiredForRole?: string },
    user: CurrentUser,
  ) {
    if (!this.isParishManager(user.role) && user.role !== UserRole.COMMUNITY_COORDINATOR) {
      throw new ForbiddenException('Sem permissão');
    }
    const parishId = this.requireParish(user);
    if (!parishId) throw new BadRequestException('parishId é obrigatório');

    const course = await this.prisma.formationCourse.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        parishId,
        trackId: dto.trackId ?? null,
        validityMonths: dto.validityMonths ?? null,
        requiredForRole: dto.requiredForRole?.trim() || null,
      },
    });
    await this.auditService.log({ actor: this.auditActor(user), action: 'CREATE', entity: 'FormationCourse', entityId: course.id });
    return course;
  }

  async listCourses(user: CurrentUser) {
    const where: any = { deletedAt: null };
    if (user.role !== UserRole.SYSTEM_ADMIN && user.parishId) where.parishId = user.parishId;
    return this.prisma.formationCourse.findMany({
      where,
      include: { track: { select: { name: true } }, _count: { select: { enrollments: true } } },
      orderBy: { name: 'asc' },
    });
  }

  /** Inscrições de um curso (para acompanhamento, conclusão e certificados). */
  async listEnrollments(courseId: string, user: CurrentUser) {
    await this.loadCourseInScope(courseId, user);
    return this.prisma.formationEnrollment.findMany({
      where: { courseId },
      include: { member: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async loadCourseInScope(courseId: string, user: CurrentUser) {
    const course = await this.prisma.formationCourse.findFirst({ where: { id: courseId, deletedAt: null } });
    if (!course) throw new NotFoundException('Curso não encontrado');
    if (user.role !== UserRole.SYSTEM_ADMIN && course.parishId !== user.parishId) {
      throw new ForbiddenException('Curso fora do seu escopo');
    }
    return course;
  }

  // ===== INSCRIÇÃO E CONCLUSÃO =====

  async enroll(courseId: string, memberId: string, user: CurrentUser) {
    await this.loadCourseInScope(courseId, user);
    const member = await this.prisma.member.findFirst({ where: { id: memberId, deletedAt: null } });
    if (!member) throw new NotFoundException('Membro não encontrado');

    const enrollment = await this.prisma.formationEnrollment.upsert({
      where: { courseId_memberId: { courseId, memberId } },
      create: { courseId, memberId },
      update: { status: 'ENROLLED', completedAt: null, expiresAt: null },
    });
    await this.auditService.log({ actor: this.auditActor(user), action: 'CREATE', entity: 'FormationEnrollment', entityId: enrollment.id });
    return enrollment;
  }

  async complete(enrollmentId: string, dto: { date?: string }, user: CurrentUser) {
    const enrollment = await this.prisma.formationEnrollment.findUnique({
      where: { id: enrollmentId },
      include: { course: true },
    });
    if (!enrollment) throw new NotFoundException('Inscrição não encontrada');
    if (user.role !== UserRole.SYSTEM_ADMIN && enrollment.course.parishId !== user.parishId) {
      throw new ForbiddenException('Fora do seu escopo');
    }

    const completedAt = dto.date ? new Date(dto.date) : new Date();
    let expiresAt: Date | null = null;
    if (enrollment.course.validityMonths) {
      expiresAt = new Date(completedAt);
      expiresAt.setMonth(expiresAt.getMonth() + enrollment.course.validityMonths);
    }

    const updated = await this.prisma.formationEnrollment.update({
      where: { id: enrollmentId },
      data: { status: 'COMPLETED', completedAt, expiresAt },
    });
    await this.auditService.log({ actor: this.auditActor(user), action: 'UPDATE', entity: 'FormationEnrollment', entityId: enrollmentId, metadata: { completed: true, expiresAt } });
    return updated;
  }

  /** Inscrições com formação vencida ou pendente (identificação de agentes). */
  async getPendingOrExpired(user: CurrentUser) {
    const where: any = {};
    if (user.role !== UserRole.SYSTEM_ADMIN && user.parishId) {
      where.course = { parishId: user.parishId };
    }
    const now = new Date();
    const enrollments = await this.prisma.formationEnrollment.findMany({
      where: {
        ...where,
        OR: [{ status: 'ENROLLED' }, { status: 'COMPLETED', expiresAt: { lt: now } }],
      },
      include: {
        member: { select: { id: true, fullName: true } },
        course: { select: { name: true } },
      },
    });
    return enrollments.map((e) => ({
      enrollmentId: e.id,
      member: e.member,
      course: e.course.name,
      situation: e.status === 'ENROLLED' ? 'pendente' : 'vencida',
      expiresAt: e.expiresAt,
    }));
  }

  /**
   * Verifica se o membro tem formação VÁLIDA para exercer uma função.
   * Se nenhum curso é exigido para a função, considera-se apto.
   * Base para o bloqueio de escalação (integração opcional com escala).
   */
  async checkPrerequisite(memberId: string, role: string): Promise<{ eligible: boolean; missing: string[] }> {
    const requiredCourses = await this.prisma.formationCourse.findMany({
      where: { requiredForRole: role, deletedAt: null },
      select: { id: true, name: true, validityMonths: true },
    });
    if (requiredCourses.length === 0) {
      return { eligible: true, missing: [] };
    }

    const now = new Date();
    const missing: string[] = [];
    for (const course of requiredCourses) {
      const enrollment = await this.prisma.formationEnrollment.findUnique({
        where: { courseId_memberId: { courseId: course.id, memberId } },
      });
      const valid =
        enrollment?.status === 'COMPLETED' &&
        (!enrollment.expiresAt || enrollment.expiresAt >= now);
      if (!valid) missing.push(course.name);
    }
    return { eligible: missing.length === 0, missing };
  }

  // ===== CERTIFICADO (PDF) =====

  async generateCertificate(enrollmentId: string, user: CurrentUser): Promise<Buffer> {
    const enrollment = await this.prisma.formationEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        course: { include: { parish: { select: { name: true } } } },
        member: { select: { id: true, fullName: true } },
      },
    });
    if (!enrollment) throw new NotFoundException('Inscrição não encontrada');
    if (user.role !== UserRole.SYSTEM_ADMIN && enrollment.course.parishId !== user.parishId) {
      throw new ForbiddenException('Fora do seu escopo');
    }
    if (enrollment.status !== 'COMPLETED' || !enrollment.completedAt) {
      throw new BadRequestException('Certificado disponível apenas para formações concluídas');
    }

    await this.prisma.formationEnrollment.update({
      where: { id: enrollmentId },
      data: { certificateIssuedAt: new Date() },
    });
    await this.auditService.log({ actor: this.auditActor(user), action: 'EXPORT', entity: 'FormationEnrollment', entityId: enrollmentId, metadata: { certificate: true } });

    return this.pdfService.renderTableDocument({
      title: 'Certificado de Formação',
      subtitle: enrollment.course.parish.name,
      sections: [
        {
          columns: ['Campo', 'Valor'],
          widths: [1, 2],
          rows: [
            ['Participante', enrollment.member.fullName],
            ['Curso', enrollment.course.name],
            ['Conclusão', enrollment.completedAt.toLocaleDateString('pt-BR')],
            [
              'Validade',
              enrollment.expiresAt ? enrollment.expiresAt.toLocaleDateString('pt-BR') : 'Sem expiração',
            ],
          ],
        },
      ],
      footer: `Emitido em ${new Date().toLocaleString('pt-BR')}`,
    });
  }
}
