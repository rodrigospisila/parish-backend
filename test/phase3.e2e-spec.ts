import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { PrismaClient, UserRole, SacramentType } from '@prisma/client';
import { AppModule } from '../src/app.module';

/**
 * E2E da Fase 3: catequese (3.1), planejamento (3.2), documentos (3.3), formação (3.4).
 * DATABASE_URL=postgresql://parish:parish123@localhost:5432/parish_e2e npx jest --config ./test/jest-e2e.json phase3
 */
describe('Fase 3 — Módulos pastorais (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  let parishId: string;
  let communityId: string;
  let catechizandId: string;
  let token: string; // PARISH_ADMIN (mais simples: gerencia tudo no escopo)

  const PASSWORD = 'SenhaForte@123';

  beforeAll(async () => {
    prisma = new PrismaClient();
    for (const table of [
      'catechesisAttendance', 'catechesisSession', 'catechesisEnrollment', 'catechesisCatechist',
      'catechesisClass', 'catechesisStage', 'documentVersion', 'pastoralDocument',
      'pastoralAction', 'pastoralGoal', 'pastoralObjective', 'pastoralPlan',
      'formationEnrollment', 'formationCourse', 'formationTrack',
      'sacrament', 'auditLog', 'refreshToken', 'member', 'user', 'community', 'parish', 'diocese',
    ] as const) {
      // @ts-expect-error índice dinâmico
      await prisma[table].deleteMany();
    }

    const diocese = await prisma.diocese.create({
      data: { name: 'D', address: 'a', city: 'x', state: 'PR', zipCode: '80000-000' },
    });
    const parish = await prisma.parish.create({
      data: { name: 'P', address: 'a', city: 'x', state: 'PR', zipCode: '80000-000', dioceseId: diocese.id },
    });
    parishId = parish.id;
    const community = await prisma.community.create({
      data: { name: 'Matriz', address: 'a', city: 'x', state: 'PR', zipCode: '80000-000', parishId: parish.id },
    });
    communityId = community.id;

    await prisma.user.create({
      data: {
        email: 'padre@test.com',
        password: await bcrypt.hash(PASSWORD, 10),
        name: 'Pároco',
        role: UserRole.PARISH_ADMIN,
        dioceseId: diocese.id,
        parishId: parish.id,
        communityId,
      },
    });

    catechizandId = (
      await prisma.member.create({ data: { fullName: 'Catequizando', communityId, status: 'ACTIVE' } })
    ).id;

    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'padre@test.com', password: PASSWORD })
      .expect(200);
    token = res.body.accessToken;
  }, 60000);

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });

  describe('Catequese (3.1) — batismo, chamada e conclusão gera sacramento', () => {
    let classId: string;
    let enrollmentId: string;

    it('cria etapa (Crisma) e turma', async () => {
      const stage = await request(app.getHttpServer())
        .post('/catechesis/stages')
        .set(auth())
        .send({ name: 'Crisma', sacramentType: SacramentType.CONFIRMATION })
        .expect(201);

      const klass = await request(app.getHttpServer())
        .post('/catechesis/classes')
        .set(auth())
        .send({ name: 'Crisma 2026', year: 2026, stageId: stage.body.id, communityId })
        .expect(201);
      classId = klass.body.id;
    });

    it('bloqueia matrícula sem batismo (validação sacramental)', async () => {
      await request(app.getHttpServer())
        .post('/catechesis/enrollments')
        .set(auth())
        .send({ classId, memberId: catechizandId })
        .expect(400);
    });

    it('após registrar batismo, matricula e conclui gerando Sacramento de Crisma', async () => {
      // registra o batismo
      await request(app.getHttpServer())
        .post('/sacraments')
        .set(auth())
        .send({ memberId: catechizandId, type: SacramentType.BAPTISM, date: '2015-01-01' })
        .expect(201);

      const enrollment = await request(app.getHttpServer())
        .post('/catechesis/enrollments')
        .set(auth())
        .send({ classId, memberId: catechizandId })
        .expect(201);
      enrollmentId = enrollment.body.id;

      await request(app.getHttpServer())
        .patch(`/catechesis/enrollments/${enrollmentId}/complete`)
        .set(auth())
        .send({ date: '2026-11-01' })
        .expect(200);

      // A conclusão deve ter gerado o Sacramento de Crisma
      const sacraments = await prisma.sacrament.findMany({
        where: { memberId: catechizandId, type: SacramentType.CONFIRMATION },
      });
      expect(sacraments.length).toBe(1);
    });
  });

  describe('Planejamento (3.2) — objetivo e vínculo de atividade', () => {
    it('cria plano, objetivo e vincula um evento ao objetivo', async () => {
      const plan = await request(app.getHttpServer())
        .post('/planning/plans')
        .set(auth())
        .send({ title: 'Plano 2026', year: 2026, communityId })
        .expect(201);

      const objective = await request(app.getHttpServer())
        .post(`/planning/plans/${plan.body.id}/objectives`)
        .set(auth())
        .send({ description: 'Fortalecer a juventude' })
        .expect(201);

      const event = await prisma.event.create({
        data: { title: 'Encontro de Jovens', type: 'COMMUNITY_EVENT', startDate: new Date(), communityId, status: 'PUBLISHED' },
      });

      await request(app.getHttpServer())
        .patch(`/planning/events/${event.id}/objective`)
        .set(auth())
        .send({ objectiveId: objective.body.id })
        .expect(200);

      const linked = await prisma.event.findUnique({ where: { id: event.id } });
      expect(linked?.objectiveId).toBe(objective.body.id);
    });
  });

  describe('Documentos (3.3) — versionamento', () => {
    it('cria documento (v1) e adiciona v2', async () => {
      const doc = await request(app.getHttpServer())
        .post('/documents')
        .set(auth())
        .send({ title: 'Ata da Assembleia', category: 'ata', communityId })
        .expect(201);
      expect(doc.body.currentVersion).toBe(1);

      const updated = await request(app.getHttpServer())
        .post(`/documents/${doc.body.id}/versions`)
        .set(auth())
        .send({ notes: 'correção de nomes', fileUrl: 'http://x/ata-v2.pdf' })
        .expect(201);
      expect(updated.body.currentVersion).toBe(2);
    });
  });

  describe('Formação (3.4) — conclusão, validade e certificado', () => {
    it('cria curso, inscreve, conclui e emite certificado em PDF', async () => {
      const member = await prisma.member.create({
        data: { fullName: 'Agente', communityId, status: 'ACTIVE' },
      });

      const course = await request(app.getHttpServer())
        .post('/formation/courses')
        .set(auth())
        .send({ name: 'Curso de Liturgia', validityMonths: 12, requiredForRole: 'Leitor' })
        .expect(201);

      const enrollment = await request(app.getHttpServer())
        .post(`/formation/courses/${course.body.id}/enroll`)
        .set(auth())
        .send({ memberId: member.id })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/formation/enrollments/${enrollment.body.id}/complete`)
        .set(auth())
        .send({ date: '2026-06-15T12:00:00' })
        .expect(200);

      // pré-requisito atendido para a função "Leitor"
      const check = await request(app.getHttpServer())
        .get('/formation/check')
        .query({ memberId: member.id, role: 'Leitor' })
        .set(auth())
        .expect(200);
      expect(check.body.eligible).toBe(true);

      const cert = await request(app.getHttpServer())
        .get(`/formation/enrollments/${enrollment.body.id}/certificate.pdf`)
        .set(auth())
        .expect(200);
      expect(cert.headers['content-type']).toContain('application/pdf');
    });
  });
});
