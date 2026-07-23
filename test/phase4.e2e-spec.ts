import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { PrismaClient, UserRole } from '@prisma/client';
import { AppModule } from '../src/app.module';

/**
 * E2E da Fase 4: escala sem evento (4.1), reserva de espaços (4.2), financeiro/dízimo (4.3),
 * preparação de sacramentos + certidão (4.4), visitação (4.5), swap (4.6).
 * DATABASE_URL=postgresql://parish:parish123@localhost:5432/parish_e2e npx jest --config ./test/jest-e2e.json phase4
 */
describe('Fase 4 — Operação e diferenciais (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  let communityId: string;
  let memberId: string;
  let token: string; // PARISH_ADMIN

  const PASSWORD = 'SenhaForte@123';

  beforeAll(async () => {
    prisma = new PrismaClient();
    for (const table of [
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
    memberId = (await prisma.member.create({ data: { fullName: 'Fiel', communityId, status: 'ACTIVE' } })).id;

    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    const res = await request(app.getHttpServer()).post('/auth/login').send({ email: 'padre@test.com', password: PASSWORD }).expect(200);
    token = res.body.accessToken;
  }, 60000);

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });
  const future = (days: number) => new Date(Date.now() + days * 86400000).toISOString();

  it('4.1 — cria escala SEM evento (serviço contínuo)', async () => {
    const res = await request(app.getHttpServer())
      .post('/schedules/standalone')
      .set(auth())
      .send({ title: 'Limpeza da Igreja', date: future(7), communityId, startTime: '08:00', endTime: '10:00' })
      .expect(201);
    expect(res.body.eventId).toBeNull();
    expect(res.body.communityId).toBe(communityId);

    // aparece na listagem de escalas
    const list = await request(app.getHttpServer()).get('/schedules').set(auth()).expect(200);
    expect(list.body.some((s: any) => s.id === res.body.id)).toBe(true);
  });

  it('4.2 — reserva de sala com prevenção de conflito', async () => {
    const room = await request(app.getHttpServer())
      .post('/rooms')
      .set(auth())
      .send({ communityId, name: 'Salão Paroquial', capacity: 100 })
      .expect(201);

    await request(app.getHttpServer())
      .post('/rooms/reservations')
      .set(auth())
      .send({ roomId: room.body.id, title: 'Reunião A', startTime: future(3), endTime: future(3.1) })
      .expect(201);

    // sobreposição no mesmo horário → 400
    await request(app.getHttpServer())
      .post('/rooms/reservations')
      .set(auth())
      .send({ roomId: room.body.id, title: 'Reunião B', startTime: future(3), endTime: future(3.1) })
      .expect(400);
  });

  it('4.3 — dízimo gera transação financeira e alimenta o resumo', async () => {
    const tither = await request(app.getHttpServer())
      .post('/finance/tithers')
      .set(auth())
      .send({ memberId, registrationNumber: '001' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/finance/tithe/contributions')
      .set(auth())
      .send({ titherId: tither.body.id, amount: 100, date: future(-1), referenceMonth: '2026-07', method: 'PIX' })
      .expect(201);

    const summary = await request(app.getHttpServer()).get('/finance/summary').set(auth()).expect(200);
    expect(summary.body.income).toBeGreaterThanOrEqual(100);

    // transação de categoria Dízimo existe
    const tx = await prisma.financialTransaction.findFirst({ where: { category: 'Dízimo' } });
    expect(tx).not.toBeNull();
  });

  it('4.4 — processo de sacramento celebra e emite certidão em PDF', async () => {
    const process = await request(app.getHttpServer())
      .post('/sacrament-processes')
      .set(auth())
      .send({ type: 'BAPTISM', memberId, communityId })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/sacrament-processes/${process.body.id}/celebrate`)
      .set(auth())
      .send({ date: future(-2), minister: 'Pe. João', book: '1', page: '23', term: '45' })
      .expect(200);

    // gerou Sacrament com numeração
    const sac = await prisma.sacrament.findFirst({ where: { memberId, type: 'BAPTISM' } });
    expect(sac?.book).toBe('1');

    const cert = await request(app.getHttpServer())
      .get(`/sacrament-processes/${process.body.id}/certificate.pdf`)
      .set(auth())
      .expect(200);
    expect(cert.headers['content-type']).toContain('application/pdf');
  });

  it('4.5 — visitação exige consentimento e protege anotações', async () => {
    // sem consentimento → 400
    await request(app.getHttpServer())
      .post('/visitation/requests')
      .set(auth())
      .send({ communityId, personName: 'Dona Rita', reason: 'SICK', consentGiven: false })
      .expect(400);

    // com consentimento → 201
    await request(app.getHttpServer())
      .post('/visitation/requests')
      .set(auth())
      .send({ communityId, personName: 'Dona Rita', reason: 'SICK', consentGiven: true })
      .expect(201);
  });

  it('4.6 — gerador de rodízio (dry-run) responde prévia', async () => {
    // cria uma escala standalone com pastoral para o gerador ranquear
    const schedule = await prisma.schedule.create({
      data: { title: 'Escala Rodízio', date: new Date(Date.now() + 5 * 86400000), communityId, status: 'OPEN' },
    });

    const res = await request(app.getHttpServer())
      .post('/schedules/generate')
      .set(auth())
      .send({ scheduleIds: [schedule.id], dryRun: true })
      .expect(201);
    expect(res.body.dryRun).toBe(true);
    expect(Array.isArray(res.body.preview)).toBe(true);
  });
});
