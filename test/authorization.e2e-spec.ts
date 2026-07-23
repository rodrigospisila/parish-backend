import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { PrismaClient, UserRole } from '@prisma/client';
import { AppModule } from '../src/app.module';

/**
 * E2E de autorização — Definition of Done da Fase 0 (Blindagem).
 *
 * Requer banco dedicado (parish_e2e) já migrado:
 *   docker exec parish-postgres createdb -U parish parish_e2e
 *   DATABASE_URL=postgresql://parish:parish123@localhost:5432/parish_e2e npx prisma migrate deploy
 *
 * Executar com:
 *   DATABASE_URL=postgresql://parish:parish123@localhost:5432/parish_e2e npx jest --config ./test/jest-e2e.json authorization
 */
describe('Autorização e LGPD (Fase 0 - e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  let communityAId: string;
  let communityBId: string;
  let memberAId: string;
  let memberBId: string;
  let tokenUserA: string;
  let tokenAdmin: string;

  const PASSWORD = 'SenhaForte@123';

  async function login(email: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    return res.body.accessToken;
  }

  beforeAll(async () => {
    prisma = new PrismaClient();

    // Limpeza total do banco de teste (ordem respeita FKs via cascade)
    await prisma.auditLog.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.prayerRequest.deleteMany();
    await prisma.member.deleteMany();
    await prisma.user.deleteMany();
    await prisma.community.deleteMany();
    await prisma.parish.deleteMany();
    await prisma.diocese.deleteMany();

    // Estrutura eclesial mínima: 1 diocese, 1 paróquia, 2 comunidades
    const diocese = await prisma.diocese.create({
      data: { name: 'Diocese Teste', address: 'Rua 1', city: 'X', state: 'PR', zipCode: '80000-000' },
    });
    const parish = await prisma.parish.create({
      data: {
        name: 'Paróquia Teste',
        address: 'Rua 2',
        city: 'X',
        state: 'PR',
        zipCode: '80000-000',
        dioceseId: diocese.id,
      },
    });
    const communityA = await prisma.community.create({
      data: {
        name: 'Comunidade A',
        address: 'Rua A',
        city: 'X',
        state: 'PR',
        zipCode: '80000-000',
        parishId: parish.id,
      },
    });
    const communityB = await prisma.community.create({
      data: {
        name: 'Comunidade B',
        address: 'Rua B',
        city: 'X',
        state: 'PR',
        zipCode: '80000-000',
        parishId: parish.id,
      },
    });
    communityAId = communityA.id;
    communityBId = communityB.id;

    const hashed = await bcrypt.hash(PASSWORD, 10);

    // Usuário FAITHFUL da comunidade A com Member vinculado
    const userA = await prisma.user.create({
      data: {
        email: 'fiel.a@test.com',
        password: hashed,
        name: 'Fiel A',
        role: UserRole.FAITHFUL,
        communityId: communityAId,
      },
    });
    const memberA = await prisma.member.create({
      data: {
        fullName: 'Fiel A',
        communityId: communityAId,
        userId: userA.id,
        status: 'ACTIVE',
      },
    });
    memberAId = memberA.id;

    // Membro da comunidade B (com dados pessoais que NÃO podem vazar)
    const memberB = await prisma.member.create({
      data: {
        fullName: 'Membro B Sigiloso',
        cpf: '12345678901',
        phone: '41999990000',
        communityId: communityBId,
        status: 'ACTIVE',
        consentGiven: false,
      },
    });
    memberBId = memberB.id;

    // SYSTEM_ADMIN
    await prisma.user.create({
      data: {
        email: 'admin@test.com',
        password: hashed,
        name: 'Admin',
        role: UserRole.SYSTEM_ADMIN,
      },
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    tokenUserA = await login('fiel.a@test.com');
    tokenAdmin = await login('admin@test.com');
  }, 60000);

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
  });

  describe('0.1b — registro público sem escalada de privilégio', () => {
    it('rejeita auto-registro como SYSTEM_ADMIN (403)', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'hacker@test.com',
          password: 'SenhaForte@123',
          name: 'Hacker',
          role: 'SYSTEM_ADMIN',
        })
        .expect(403);
    });

    it('registro público sempre resulta em FAITHFUL', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'novo.fiel@test.com', password: 'SenhaForte@123', name: 'Novo Fiel' })
        .expect(201);

      expect(res.body.user.role).toBe('FAITHFUL');
    });
  });

  describe('0.1 — escopo na leitura de dados pessoais', () => {
    it('FAITHFUL da comunidade A NÃO lê membro da comunidade B (403)', async () => {
      await request(app.getHttpServer())
        .get(`/members/${memberBId}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(403);
    });

    it('FAITHFUL lê o próprio cadastro (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/members/${memberAId}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);
      expect(res.body.id).toBe(memberAId);
    });

    it('busca por nome não vaza membros de outra comunidade', async () => {
      const res = await request(app.getHttpServer())
        .get('/members/search?name=Sigiloso')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);
      expect(res.body).toHaveLength(0);
    });

    it('estatísticas de escala de outro membro são negadas (403)', async () => {
      await request(app.getHttpServer())
        .get(`/schedules/members/${memberBId}/stats`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(403);
    });

    it('export LGPD de outro membro é negado (403)', async () => {
      await request(app.getHttpServer())
        .get(`/members/${memberBId}/export`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(403);
    });

    it('SYSTEM_ADMIN mantém acesso total (200) e a leitura fica auditada', async () => {
      await request(app.getHttpServer())
        .get(`/members/${memberBId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);

      const auditEntry = await prisma.auditLog.findFirst({
        where: { entity: 'Member', entityId: memberBId, action: 'READ_SENSITIVE' },
      });
      expect(auditEntry).not.toBeNull();
    });

    it('rotas de leitura exigem autenticação (401 sem token)', async () => {
      await request(app.getHttpServer()).get(`/members/${memberBId}`).expect(401);
      await request(app.getHttpServer()).get('/events/upcoming').expect(401);
      await request(app.getHttpServer()).get('/mass-intentions/upcoming').expect(401);
      await request(app.getHttpServer()).get('/prayer-requests/approved').expect(401);
    });
  });

  describe('0.1/0.3 — pedidos de oração: escopo e anonimato', () => {
    it('FAITHFUL não cria pedido para outra comunidade (403)', async () => {
      await request(app.getHttpServer())
        .post('/prayer-requests')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          communityId: communityBId,
          title: 'Pedido',
          description: 'Descrição',
          category: 'HEALTH',
        })
        .expect(403);
    });

    it('pedido anônimo aprovado não expõe o autor na lista pública', async () => {
      const created = await request(app.getHttpServer())
        .post('/prayer-requests')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          communityId: communityAId,
          title: 'Pedido anônimo',
          description: 'Saúde de um familiar',
          category: 'HEALTH',
          isAnonymous: true,
          memberId: memberAId,
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/prayer-requests/${created.body.id}/approve`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);

      const list = await request(app.getHttpServer())
        .get('/prayer-requests/approved')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      const anonymous = list.body.find((item: any) => item.id === created.body.id);
      expect(anonymous).toBeDefined();
      expect(anonymous.member).toBeNull();
    });
  });

  describe('0.4/0.6 — anonimização e soft-delete', () => {
    it('anonimiza membro SEM consentimento prévio e marca ANONYMIZED', async () => {
      const res = await request(app.getHttpServer())
        .post(`/members/${memberBId}/anonymize`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(201);

      expect(res.body.status).toBe('ANONYMIZED');
      expect(res.body.cpf).toBeNull();
      expect(res.body.fullName).toBe('Usuário Anônimo');

      const auditEntry = await prisma.auditLog.findFirst({
        where: { entity: 'Member', entityId: memberBId, action: 'ANONYMIZE' },
      });
      expect(auditEntry).not.toBeNull();
    });

    it('excluir membro é soft-delete: some da API mas permanece recuperável no banco', async () => {
      await request(app.getHttpServer())
        .delete(`/members/${memberBId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/members/${memberBId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(404);

      const row = await prisma.member.findUnique({ where: { id: memberBId } });
      expect(row).not.toBeNull();
      expect(row?.deletedAt).not.toBeNull();
    });
  });
});
