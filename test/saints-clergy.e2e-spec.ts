import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { PrismaClient, UserRole } from '@prisma/client';
import { AppModule } from '../src/app.module';

/**
 * E2E — Santos (catálogo + padroeiros) e Palavra do Pastor (mensagens do clero).
 * DATABASE_URL=postgresql://parish:parish123@localhost:5432/parish_e2e npx jest --config ./test/jest-e2e.json saints-clergy
 */
describe('Santos + Palavra do Pastor (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  let communityId: string;
  let memberId: string;
  let bishopToken: string; // DIOCESAN_ADMIN
  let priestToken: string; // PARISH_ADMIN
  let faithfulToken: string; // FAITHFUL (com member vinculado)

  const PASSWORD = 'SenhaForte@123';

  beforeAll(async () => {
    prisma = new PrismaClient();
    for (const table of [
      'clergyMessage', 'saintPatronage', 'saint', 'notification',
      'assignmentSwapRequest', 'visit', 'visitRequest', 'titheContribution', 'tither',
      'financialTransaction', 'roomReservation', 'room', 'sacramentProcess',
      'scheduleAssignment', 'schedulePastoral', 'schedule', 'event',
      'sacrament', 'auditLog', 'refreshToken', 'member', 'user', 'community', 'parish', 'diocese',
    ] as const) {
      // @ts-expect-error índice dinâmico
      await prisma[table].deleteMany();
    }

    const diocese = await prisma.diocese.create({ data: { name: 'D', address: 'a', city: 'x', state: 'PR', zipCode: '80000-000' } });
    const parish = await prisma.parish.create({ data: { name: 'P', address: 'a', city: 'x', state: 'PR', zipCode: '80000-000', dioceseId: diocese.id } });
    const community = await prisma.community.create({ data: { name: 'Matriz', address: 'a', city: 'x', state: 'PR', zipCode: '80000-000', parishId: parish.id } });
    communityId = community.id;

    const password = await bcrypt.hash(PASSWORD, 10);
    await prisma.user.create({
      data: { email: 'bispo@test.com', password, name: 'Bispo', role: UserRole.DIOCESAN_ADMIN, dioceseId: diocese.id },
    });
    await prisma.user.create({
      data: {
        email: 'padre@test.com', password, name: 'Pároco', role: UserRole.PARISH_ADMIN,
        dioceseId: diocese.id, parishId: parish.id, communityId,
      },
    });
    const faithfulUser = await prisma.user.create({
      data: {
        email: 'fiel@test.com', password, name: 'Fiel', role: UserRole.FAITHFUL,
        dioceseId: diocese.id, parishId: parish.id, communityId,
      },
    });
    memberId = (
      await prisma.member.create({ data: { fullName: 'Fiel', communityId, status: 'ACTIVE', userId: faithfulUser.id } })
    ).id;

    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    const login = async (email: string) => {
      const res = await request(app.getHttpServer()).post('/auth/login').send({ email, password: PASSWORD }).expect(200);
      return res.body.accessToken as string;
    };
    bishopToken = await login('bispo@test.com');
    priestToken = await login('padre@test.com');
    faithfulToken = await login('fiel@test.com');
  }, 60000);

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
  });

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  it('catálogo: bispo cadastra santo; pároco não (403)', async () => {
    await request(app.getHttpServer())
      .post('/saints')
      .set(auth(priestToken))
      .send({ name: 'São Pedro' })
      .expect(403);

    const today = new Date();
    const res = await request(app.getHttpServer())
      .post('/saints')
      .set(auth(bishopToken))
      .send({
        name: 'Nossa Senhora Aparecida',
        feastMonth: today.getMonth() + 1,
        feastDay: today.getDate(),
        patronOf: 'Brasil',
      })
      .expect(201);
    expect(res.body.name).toBe('Nossa Senhora Aparecida');
  });

  it('santo do dia retorna o santo com festa hoje', async () => {
    const res = await request(app.getHttpServer()).get('/saints/today').set(auth(faithfulToken)).expect(200);
    expect(res.body.some((s: any) => s.name === 'Nossa Senhora Aparecida')).toBe(true);
  });

  it('padroado: pároco vincula padroeira à comunidade e a consulta lista', async () => {
    const saints = await request(app.getHttpServer()).get('/saints').set(auth(priestToken)).expect(200);
    const saintId = saints.body[0].id;

    await request(app.getHttpServer())
      .post(`/saints/${saintId}/patronages`)
      .set(auth(priestToken))
      .send({ communityId, isPrimary: true })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get(`/saints/patronages?communityId=${communityId}`)
      .set(auth(faithfulToken))
      .expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].saint.name).toBe('Nossa Senhora Aparecida');
  });

  it('palavra do pastor: fiel não publica (403)', async () => {
    await request(app.getHttpServer())
      .post('/clergy-messages')
      .set(auth(faithfulToken))
      .send({ title: 'Oi', body: 'x', audience: 'COMMUNITY', communityId })
      .expect(403);
  });

  it('pároco publica vídeo para a comunidade e o fiel vê no feed', async () => {
    await request(app.getHttpServer())
      .post('/clergy-messages')
      .set(auth(priestToken))
      .send({
        title: 'Mensagem de domingo',
        videoUrl: 'https://youtube.com/watch?v=abc123',
        senderTitle: 'Pe. João — Pároco',
        audience: 'COMMUNITY',
        communityId,
      })
      .expect(201);

    const feed = await request(app.getHttpServer()).get('/clergy-messages').set(auth(faithfulToken)).expect(200);
    const message = feed.body.find((m: any) => m.title === 'Mensagem de domingo');
    expect(message).toBeDefined();
    expect(message.videoUrl).toContain('youtube.com');
    expect(message.senderTitle).toBe('Pe. João — Pároco');
  });

  it('mensagem direcionada ao membro chega no feed dele (e gera notificação)', async () => {
    await request(app.getHttpServer())
      .post('/clergy-messages')
      .set(auth(priestToken))
      .send({ title: 'Palavra pessoal', body: 'Deus te abençoe', audience: 'MEMBER', memberId })
      .expect(201);

    const feed = await request(app.getHttpServer()).get('/clergy-messages').set(auth(faithfulToken)).expect(200);
    expect(feed.body.some((m: any) => m.title === 'Palavra pessoal')).toBe(true);

    // push/in-app: criada para o usuário do membro
    const notification = await prisma.notification.findFirst({ where: { type: 'CLERGY_MESSAGE' } });
    expect(notification).not.toBeNull();
  });

  it('pároco não fala à diocese inteira (403); bispo sim', async () => {
    await request(app.getHttpServer())
      .post('/clergy-messages')
      .set(auth(priestToken))
      .send({ title: 'Carta', body: 'x', audience: 'DIOCESE' })
      .expect(403);

    await request(app.getHttpServer())
      .post('/clergy-messages')
      .set(auth(bishopToken))
      .send({ title: 'Carta pastoral', body: 'Aos diocesanos...', audience: 'DIOCESE' })
      .expect(201);

    const feed = await request(app.getHttpServer()).get('/clergy-messages').set(auth(faithfulToken)).expect(200);
    expect(feed.body.some((m: any) => m.title === 'Carta pastoral')).toBe(true);
  });
});
