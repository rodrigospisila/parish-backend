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

    // Onda 0 (81e3746, eng-acessos-08): coordenador leigo só lavra assento
    // (recordKind RECORD, o padrão) se a comunidade do membro ligar
    // `laySacramentRecords` — desligado por padrão.
    it('com laySacramentRecords=false (padrão), coordenador NÃO registra assento (403)', async () => {
      const community = await prisma.community.findUnique({ where: { id: communityAId } });
      expect(community?.laySacramentRecords).toBe(false);

      const res = await request(app.getHttpServer())
        .post('/sacraments')
        .set('Authorization', `Bearer ${tokenCoordA}`)
        .send({ memberId: memberAId, type: 'BAPTISM', date: '2010-01-01', place: 'Matriz' })
        .expect(403);
      expect(res.body.message).toContain('secretaria paroquial');
      expect(await prisma.sacrament.count({ where: { memberId: memberAId } })).toBe(0);
    });

    it('com laySacramentRecords=true, coordenador cria sacramento para membro do seu escopo', async () => {
      await prisma.community.update({ where: { id: communityAId }, data: { laySacramentRecords: true } });

      const res = await request(app.getHttpServer())
        .post('/sacraments')
        .set('Authorization', `Bearer ${tokenCoordA}`)
        .send({ memberId: memberAId, type: 'BAPTISM', date: '2010-01-01', place: 'Matriz' })
        .expect(201);
      sacramentId = res.body.id;
      expect(res.body.type).toBe('BAPTISM');
      expect(res.body.recordKind).toBe('RECORD');
      // Assento guarda a pessoa (sobrevive à anonimização LGPD do cadastro)
      expect(res.body.personSnapshot?.fullName).toBe('Membro A');
    });

    it('coordenador NÃO cria sacramento para membro de outra comunidade (403)', async () => {
      // Comunidade B também liberada: a negação vem só do escopo
      await prisma.community.update({ where: { id: communityBId }, data: { laySacramentRecords: true } });
      try {
        const res = await request(app.getHttpServer())
          .post('/sacraments')
          .set('Authorization', `Bearer ${tokenCoordA}`)
          .send({ memberId: memberBId, type: 'BAPTISM', date: '2010-01-01' })
          .expect(403);
        expect(res.body.message).toContain('não tem permissão');
        expect(await prisma.sacrament.count({ where: { memberId: memberBId } })).toBe(0);
      } finally {
        await prisma.community.update({ where: { id: communityBId }, data: { laySacramentRecords: false } });
      }
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

    it('PATCH que retifica o assento exige rectificationReason (400 sem motivo)', async () => {
      await request(app.getHttpServer())
        .patch(`/sacraments/${sacramentId}`)
        .set('Authorization', `Bearer ${tokenCoordA}`)
        .send({ place: 'Capela São José' })
        .expect(400);

      // Motivo curto demais (mínimo de 10 caracteres)
      await request(app.getHttpServer())
        .patch(`/sacraments/${sacramentId}`)
        .set('Authorization', `Bearer ${tokenCoordA}`)
        .send({ place: 'Capela São José', rectificationReason: 'erro' })
        .expect(400);

      const unchanged = await prisma.sacrament.findUnique({ where: { id: sacramentId } });
      expect(unchanged?.place).toBe('Matriz');
    });

    it('PATCH com motivo retifica, anota no assento e audita antes/depois', async () => {
      const reason = 'Local digitado errado no lançamento';
      const res = await request(app.getHttpServer())
        .patch(`/sacraments/${sacramentId}`)
        .set('Authorization', `Bearer ${tokenCoordA}`)
        .send({ place: 'Capela São José', rectificationReason: reason })
        .expect(200);
      expect(res.body.place).toBe('Capela São José');
      expect(res.body.notes).toContain(`Retificação em`);
      expect(res.body.notes).toContain(reason);

      const audit = await prisma.auditLog.findFirst({
        where: { entity: 'Sacrament', entityId: sacramentId, action: 'UPDATE' },
      });
      expect(audit).not.toBeNull();
      expect(audit?.before).toMatchObject({ place: 'Matriz' });
      expect(audit?.after).toMatchObject({ place: 'Capela São José' });
      expect(audit?.metadata).toMatchObject({ rectification: true, rectificationReason: reason });
    });

    it('com laySacramentRecords desligado de novo, coordenador não retifica (403)', async () => {
      await prisma.community.update({ where: { id: communityAId }, data: { laySacramentRecords: false } });
      try {
        await request(app.getHttpServer())
          .patch(`/sacraments/${sacramentId}`)
          .set('Authorization', `Bearer ${tokenCoordA}`)
          .send({ place: 'Outro Lugar', rectificationReason: 'Teste de permissão negada' })
          .expect(403);
      } finally {
        await prisma.community.update({ where: { id: communityAId }, data: { laySacramentRecords: true } });
      }
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

    // Assento não se apaga: DELETE só SYSTEM_ADMIN (cat-gestao-08)
    it('DELETE de sacramento é negado ao coordenador, mesmo com laySacramentRecords (403)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/sacraments/${sacramentId}`)
        .set('Authorization', `Bearer ${tokenCoordA}`)
        .expect(403);
      expect(res.body.message).toContain('não se apaga');
      expect(await prisma.sacrament.findUnique({ where: { id: sacramentId } })).not.toBeNull();
    });

    it('SYSTEM_ADMIN apaga o sacramento e o assento inteiro fica na auditoria', async () => {
      await request(app.getHttpServer())
        .delete(`/sacraments/${sacramentId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);
      expect(await prisma.sacrament.findUnique({ where: { id: sacramentId } })).toBeNull();

      const audit = await prisma.auditLog.findFirst({
        where: { entity: 'Sacrament', entityId: sacramentId, action: 'DELETE' },
      });
      expect(audit?.before).toMatchObject({ memberId: memberAId, type: 'BAPTISM', place: 'Capela São José' });
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
