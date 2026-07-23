import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { PrismaClient, UserRole } from '@prisma/client';
import { AppModule } from '../src/app.module';

/**
 * E2E da Fase 2: sacramentos (2.1), relatórios (2.4), cadastro de pessoas (2.5).
 * DATABASE_URL=postgresql://parish:parish123@localhost:5432/parish_e2e npx jest --config ./test/jest-e2e.json phase2
 */
describe('Fase 2 — Sacramentos, Relatórios e Cadastro (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  let communityAId: string;
  let communityBId: string;
  let memberAId: string;
  let memberBId: string;
  let tokenCoordA: string;
  let tokenAdmin: string;

  const PASSWORD = 'SenhaForte@123';

  async function login(email: string) {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    return res.body.accessToken as string;
  }

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.auditLog.deleteMany();
    await prisma.sacrament.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.member.deleteMany();
    await prisma.user.deleteMany();
    await prisma.community.deleteMany();
    await prisma.parish.deleteMany();
    await prisma.diocese.deleteMany();

    const diocese = await prisma.diocese.create({
      data: { name: 'D', address: 'a', city: 'x', state: 'PR', zipCode: '80000-000' },
    });
    const parish = await prisma.parish.create({
      data: { name: 'P', address: 'a', city: 'x', state: 'PR', zipCode: '80000-000', dioceseId: diocese.id },
    });
    const cA = await prisma.community.create({
      data: { name: 'Com A', address: 'a', city: 'x', state: 'PR', zipCode: '80000-000', parishId: parish.id },
    });
    const cB = await prisma.community.create({
      data: { name: 'Com B', address: 'a', city: 'x', state: 'PR', zipCode: '80000-000', parishId: parish.id },
    });
    communityAId = cA.id;
    communityBId = cB.id;

    const hashed = await bcrypt.hash(PASSWORD, 10);

    // Coordenador da comunidade A
    await prisma.user.create({
      data: {
        email: 'coord.a@test.com',
        password: hashed,
        name: 'Coord A',
        role: UserRole.COMMUNITY_COORDINATOR,
        dioceseId: diocese.id,
        parishId: parish.id,
        communityId: communityAId,
      },
    });
    await prisma.user.create({
      data: { email: 'admin@test.com', password: hashed, name: 'Admin', role: UserRole.SYSTEM_ADMIN },
    });

    memberAId = (
      await prisma.member.create({
        data: { fullName: 'Membro A', communityId: communityAId, status: 'ACTIVE' },
      })
    ).id;
    memberBId = (
      await prisma.member.create({
        data: { fullName: 'Membro B', communityId: communityBId, status: 'ACTIVE' },
      })
    ).id;

    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    tokenCoordA = await login('coord.a@test.com');
    tokenAdmin = await login('admin@test.com');
  }, 60000);

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
  });

  describe('Sacramentos (2.1)', () => {
    let sacramentId: string;

    it('coordenador cria sacramento para membro do seu escopo', async () => {
      const res = await request(app.getHttpServer())
        .post('/sacraments')
        .set('Authorization', `Bearer ${tokenCoordA}`)
        .send({ memberId: memberAId, type: 'BAPTISM', date: '2010-01-01', place: 'Matriz' })
        .expect(201);
      sacramentId = res.body.id;
      expect(res.body.type).toBe('BAPTISM');
    });

    it('coordenador NÃO cria sacramento para membro de outra comunidade (403)', async () => {
      await request(app.getHttpServer())
        .post('/sacraments')
        .set('Authorization', `Bearer ${tokenCoordA}`)
        .send({ memberId: memberBId, type: 'BAPTISM', date: '2010-01-01' })
        .expect(403);
    });

    it('lista sacramentos do membro (com escopo) e a criação foi auditada', async () => {
      const res = await request(app.getHttpServer())
        .get(`/sacraments?memberId=${memberAId}`)
        .set('Authorization', `Bearer ${tokenCoordA}`)
        .expect(200);
      expect(res.body).toHaveLength(1);

      const audit = await prisma.auditLog.findFirst({
        where: { entity: 'Sacrament', entityId: sacramentId, action: 'CREATE' },
      });
      expect(audit).not.toBeNull();
    });

    it('FAITHFUL comum não pode criar sacramento (403 por papel)', async () => {
      // cria um fiel simples e reusa o token do registro (evita colisão de JWT
      // do mesmo segundo — bug latente documentado na Fase 1)
      const reg = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'fiel@test.com', password: PASSWORD, name: 'Fiel', communityId: communityAId })
        .expect(201);
      const tokenFiel = reg.body.accessToken;

      await request(app.getHttpServer())
        .post('/sacraments')
        .set('Authorization', `Bearer ${tokenFiel}`)
        .send({ memberId: memberAId, type: 'BAPTISM', date: '2010-01-01' })
        .expect(403);
    });
  });

  describe('Relatórios (2.4)', () => {
    it('coordenador acessa o relatório pastoral do seu escopo', async () => {
      const res = await request(app.getHttpServer())
        .get('/reports/pastoral-overview')
        .set('Authorization', `Bearer ${tokenCoordA}`)
        .expect(200);
      expect(res.body.totals).toHaveProperty('activeMembers');
    });

    it('exporta o relatório em PDF', async () => {
      const res = await request(app.getHttpServer())
        .get('/reports/pastoral-overview.pdf')
        .set('Authorization', `Bearer ${tokenCoordA}`)
        .expect(200);
      expect(res.headers['content-type']).toContain('application/pdf');
    });
  });

  describe('Cadastro de pessoas (2.5)', () => {
    it('detecta duplicado por nome + telefone', async () => {
      await prisma.member.create({
        data: { fullName: 'Ana Duplicada', phone: '41988887777', communityId: communityAId, status: 'ACTIVE' },
      });

      const res = await request(app.getHttpServer())
        .get('/members/check-duplicates')
        .query({ fullName: 'ana duplicada', phone: '(41) 98888-7777' })
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);

      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].reasons.join(' ')).toContain('telefone');
    });

    it('importa membros em massa, pulando duplicados por e-mail', async () => {
      await prisma.member.create({
        data: { fullName: 'Existente', email: 'existe@test.com', communityId: communityAId, status: 'ACTIVE' },
      });

      const res = await request(app.getHttpServer())
        .post('/members/import')
        .set('Authorization', `Bearer ${tokenCoordA}`)
        .send({
          communityId: communityAId,
          rows: [
            { fullName: 'Novo Um', email: 'novo1@test.com' },
            { fullName: 'Já Existe', email: 'existe@test.com' },
            { nome: '' },
          ],
        })
        .expect(201);

      expect(res.body.imported).toBe(1);
      expect(res.body.skipped).toBe(1);
      expect(res.body.errors.length).toBe(1);
    });

    it('cria membro com contato de emergência e tipo (novos campos 2.5)', async () => {
      const res = await request(app.getHttpServer())
        .post('/members')
        .set('Authorization', `Bearer ${tokenCoordA}`)
        .send({
          fullName: 'Com Emergência',
          communityId: communityAId,
          memberType: 'CATECHIST',
          emergencyContactName: 'Mãe',
          emergencyContactPhone: '41999998888',
          status: 'IN_FORMATION',
        })
        .expect(201);

      expect(res.body.memberType).toBe('CATECHIST');
      expect(res.body.emergencyContactName).toBe('Mãe');
      expect(res.body.status).toBe('IN_FORMATION');
    });
  });
});
