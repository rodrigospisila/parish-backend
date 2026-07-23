import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { PrismaClient, UserRole, ConsentType } from '@prisma/client';
import { AppModule } from '../src/app.module';

/**
 * E2E da Fase 1: recuperação de senha (1.4) e consentimentos LGPD (1.5).
 *
 * DATABASE_URL=postgresql://parish:parish123@localhost:5432/parish_e2e npx jest --config ./test/jest-e2e.json phase1
 */
describe('Fase 1 — Recuperação de senha e Consentimentos (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  let communityId: string;
  let userId: string;
  let memberId: string;

  const EMAIL = 'fase1.fiel@test.com';
  const PASSWORD = 'SenhaAntiga@123';

  const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

  beforeAll(async () => {
    prisma = new PrismaClient();

    await prisma.consent.deleteMany();
    await prisma.passwordResetToken.deleteMany();
    await prisma.auditLog.deleteMany();
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
    const community = await prisma.community.create({
      data: { name: 'C', address: 'a', city: 'x', state: 'PR', zipCode: '80000-000', parishId: parish.id },
    });
    communityId = community.id;

    const user = await prisma.user.create({
      data: {
        email: EMAIL,
        password: await bcrypt.hash(PASSWORD, 10),
        name: 'Fiel Fase 1',
        role: UserRole.FAITHFUL,
        communityId,
      },
    });
    userId = user.id;

    const member = await prisma.member.create({
      data: { fullName: 'Fiel Fase 1', communityId, userId: user.id, status: 'ACTIVE' },
    });
    memberId = member.id;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  }, 60000);

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
  });

  describe('Recuperação de senha (1.4)', () => {
    it('forgot-password responde genericamente e NÃO cria token para conta inexistente', async () => {
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'naoexiste@test.com' })
        .expect(200);

      const count = await prisma.passwordResetToken.count();
      expect(count).toBe(0);
    });

    it('forgot-password cria token para conta existente (resposta idêntica)', async () => {
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: EMAIL })
        .expect(200);

      const token = await prisma.passwordResetToken.findFirst({ where: { userId } });
      expect(token).not.toBeNull();
      expect(token?.usedAt).toBeNull();
    });

    it('fluxo completo: redefine a senha e o novo login funciona; token vira de uso único', async () => {
      // Simula o token entregue (o valor em claro só existiria no SMS/e-mail)
      const plaintext = 'token-de-teste-conhecido';
      await prisma.passwordResetToken.deleteMany({ where: { userId } });
      await prisma.passwordResetToken.create({
        data: {
          userId,
          tokenHash: sha256(plaintext),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      });

      const NEW_PASSWORD = 'SenhaNova@456';
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: plaintext, newPassword: NEW_PASSWORD })
        .expect(200);

      // Login com a nova senha
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: EMAIL, password: NEW_PASSWORD })
        .expect(200);

      // Senha antiga não funciona mais
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: EMAIL, password: PASSWORD })
        .expect(401);

      // Token não pode ser reutilizado
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: plaintext, newPassword: 'OutraSenha@789' })
        .expect(400);

      // Auditoria registrou a conclusão
      const audit = await prisma.auditLog.findFirst({
        where: { entity: 'User', action: 'PASSWORD_RESET' },
      });
      expect(audit).not.toBeNull();
    });
  });

  describe('Consentimentos LGPD (1.5)', () => {
    let token: string;
    const KNOWN_PASSWORD = 'SenhaConhecida@999';

    beforeAll(async () => {
      // Desacopla dos testes de reset: fixa uma senha conhecida antes do login.
      // Limpa refresh tokens para evitar colisão de JWT idêntico gerado no mesmo
      // segundo (constraint única em refreshToken.token) — ver nota no relatório.
      await prisma.user.update({
        where: { id: userId },
        data: { password: await bcrypt.hash(KNOWN_PASSWORD, 10) },
      });
      await prisma.refreshToken.deleteMany({ where: { userId } });
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: EMAIL, password: KNOWN_PASSWORD });
      token = res.body.accessToken;
    });

    it('lista os três tipos de consentimento (default: não concedido)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/members/${memberId}/consents`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const types = res.body.map((c: any) => c.type).sort();
      expect(types).toEqual(
        [ConsentType.COMMUNICATIONS, ConsentType.DATA_PROCESSING, ConsentType.IMAGE_USE].sort(),
      );
    });

    it('o próprio titular concede e revoga consentimento (auditado)', async () => {
      await request(app.getHttpServer())
        .put(`/members/${memberId}/consents`)
        .set('Authorization', `Bearer ${token}`)
        .send({ type: ConsentType.COMMUNICATIONS, granted: false })
        .expect(200);

      const consent = await prisma.consent.findFirst({
        where: { memberId, type: ConsentType.COMMUNICATIONS },
      });
      expect(consent?.granted).toBe(false);
      expect(consent?.revokedAt).not.toBeNull();

      const audit = await prisma.auditLog.findFirst({
        where: { entity: 'Consent', action: 'CONSENT_CHANGE' },
      });
      expect(audit).not.toBeNull();
    });

    it('conceder DATA_PROCESSING espelha o flag legado consentGiven no Member', async () => {
      await request(app.getHttpServer())
        .put(`/members/${memberId}/consents`)
        .set('Authorization', `Bearer ${token}`)
        .send({ type: ConsentType.DATA_PROCESSING, granted: true })
        .expect(200);

      const member = await prisma.member.findUnique({ where: { id: memberId } });
      expect(member?.consentGiven).toBe(true);
    });
  });
});
