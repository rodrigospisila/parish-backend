import {
  AuditService,
  AUDIT_ACCESS_RETENTION_DAYS,
  AUDIT_REDACTED,
  AUDIT_RETENTION_DAYS,
} from './audit.service';

/**
 * M49 da auditoria: a trilha guardava e-mail, nome e nascimento (inclusive de
 * menores) sem prazo, e eles sobreviviam à exclusão/anonimização.
 */
describe('AuditService — dados pessoais e retenção (M49)', () => {
  let prisma: any;
  let service: AuditService;

  beforeEach(() => {
    prisma = {
      auditLog: {
        create: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        update: jest.fn(),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      user: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn(async (ops: any[]) => Promise.all(ops)),
    };
    service = new AuditService(prisma);
  });

  it('com o id do autor, o e-mail NÃO é gravado', async () => {
    await service.log({ actor: { id: 'u1', email: 'a@b.com', role: 'FAITHFUL' }, action: 'UPDATE', entity: 'User' });
    const data = prisma.auditLog.create.mock.calls[0][0].data;
    expect(data.actorUserId).toBe('u1');
    expect(data.actorEmail).toBeNull();
  });

  it('sem id (tentativa de login), fica só o pseudônimo estável do e-mail', async () => {
    await service.log({ actor: { email: 'A@B.com ' }, action: 'LOGIN_FAILED', entity: 'User' });
    await service.log({ actor: { email: 'a@b.com' }, action: 'LOGIN_FAILED', entity: 'User' });
    const [first, second] = prisma.auditLog.create.mock.calls.map((call: any[]) => call[0].data.actorEmail);
    expect(first).toMatch(/^pseud:[0-9a-f]{16}$/);
    expect(first).toBe(second);
    expect(first).not.toContain('a@b.com');
  });

  it('nome, nascimento, e-mail e conta em before/after/metadata viram pseudônimo (inclusive aninhados)', async () => {
    await service.log({
      action: 'UPDATE',
      entity: 'CatechesisEnrollment',
      before: { fullName: 'Joãozinho Silva', birthDate: '2015-03-02', status: 'ACTIVE' },
      after: { fullName: 'João Silva', birthDate: '2015-03-03' },
      metadata: { account: 'mae@x.com', nested: { email: 'pai@x.com' }, name: 'Pastoral da Criança' },
    });
    const data = prisma.auditLog.create.mock.calls[0][0].data;
    const stored = JSON.stringify(data);
    for (const pii of ['Joãozinho', 'João Silva', '2015-03-02', 'mae@x.com', 'pai@x.com']) {
      expect(stored).not.toContain(pii);
    }
    expect(data.before.status).toBe('ACTIVE');
    expect(data.before.fullName).toMatch(/^pseud:/);
    // Nome de pastoral/comunidade (chave "name") não é dado pessoal
    expect(data.metadata.name).toBe('Pastoral da Criança');
  });

  it('consulta devolve o e-mail do autor por join enquanto a conta existe', async () => {
    prisma.auditLog.findMany.mockResolvedValue([
      { id: 'a1', actorUserId: 'u1', actorEmail: null },
      { id: 'a2', actorUserId: null, actorEmail: 'pseud:abc' },
    ]);
    prisma.user.findMany.mockResolvedValue([{ id: 'u1', email: 'a@b.com' }]);
    const res = await service.findAll({});
    expect(res.items.map((item: any) => item.actorEmail)).toEqual(['a@b.com', 'pseud:abc']);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['u1'] }, anonymizedAt: null } }),
    );
  });

  it('pseudonymizeSubject: registros em que o titular é ALVO perdem os dados pessoais (#26)', async () => {
    prisma.auditLog.updateMany.mockResolvedValue({ count: 0 });
    prisma.auditLog.findMany.mockResolvedValueOnce([
      { id: 'r1', entityId: 'u1', actorUserId: 'u1', before: { email: 'a@b.com', role: 'FAITHFUL' }, after: null, metadata: { selfService: true } },
      { id: 'r2', entityId: 'm1', actorUserId: 'adm', before: null, after: null, metadata: { changedFields: ['name'] } },
    ]);

    await service.pseudonymizeSubject({ userId: 'u1', memberId: 'm1', email: 'a@b.com' });

    const where = prisma.auditLog.findMany.mock.calls[0][0].where;
    expect(where.OR).toEqual(
      expect.arrayContaining([
        { actorUserId: 'u1' },
        { entityId: { in: ['u1', 'm1'] } },
        { metadata: { path: ['account'], equals: expect.stringMatching(/^pseud:/) } },
      ]),
    );
    // Só o registro com dado pessoal é reescrito
    expect(prisma.auditLog.update).toHaveBeenCalledTimes(1);
    expect(prisma.auditLog.update).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: { before: { email: AUDIT_REDACTED, role: 'FAITHFUL' } },
    });
  });

  it('#26: registros em que ele foi AUTOR mantêm actorUserId e ganham o e-mail como pseudônimo (HMAC), sem redigir o detalhe', async () => {
    const pseud = service.pseudonymize('a@b.com');
    prisma.auditLog.updateMany.mockResolvedValueOnce({ count: 5 }).mockResolvedValueOnce({ count: 2 });
    prisma.auditLog.findMany.mockResolvedValueOnce([
      // o gestor (titular) editou o membro m9: detalhe dele fica (já pseudonimizado na gravação)
      { id: 'r3', entityId: 'm9', actorUserId: 'u1', before: { fullName: 'pseud:aaaa', status: 'ACTIVE' }, after: null, metadata: null },
      // registro antigo, com o dado de terceiro ainda em claro: vira pseudônimo (não "[removido]")
      { id: 'r4', entityId: 'm8', actorUserId: 'u1', before: { phone: '42999990000' }, after: null, metadata: null },
    ]);

    await service.pseudonymizeSubject({ userId: 'u1', email: 'A@B.com ' });

    const [authored, attempts] = prisma.auditLog.updateMany.mock.calls.map((call: any[]) => call[0]);
    expect(authored).toEqual({
      where: { actorUserId: 'u1', OR: [{ actorEmail: null }, { actorEmail: { not: pseud } }] },
      data: { actorEmail: pseud },
    });
    // tentativas de login contra a conta (sem id): o pseudônimo sai
    expect(attempts.where.actorUserId).toBeNull();
    expect(attempts.where.OR).toEqual(expect.arrayContaining([{ actorEmail: pseud }]));
    expect(attempts.data).toEqual({ actorEmail: null });
    // r3 intacto; r4 só troca o telefone em claro pelo pseudônimo
    expect(prisma.auditLog.update).toHaveBeenCalledTimes(1);
    expect(prisma.auditLog.update).toHaveBeenCalledWith({
      where: { id: 'r4' },
      data: { before: { phone: service.pseudonymize('42999990000') } },
    });
  });

  it('#26: tentativa de força bruta contra a conta (metadata.account) é ALVO → redigida', async () => {
    const pseud = service.pseudonymize('a@b.com');
    prisma.auditLog.findMany.mockResolvedValueOnce([
      { id: 'r5', entityId: null, actorUserId: null, before: null, after: null, metadata: { reason: 'brute-force-suspected', account: pseud } },
    ]);
    await service.pseudonymizeSubject({ userId: 'u1', email: 'a@b.com' });
    expect(prisma.auditLog.update).toHaveBeenCalledWith({
      where: { id: 'r5' },
      data: { metadata: { reason: 'brute-force-suspected', account: AUDIT_REDACTED } },
    });
  });

  it('#32: produção sem AUDIT_PSEUDONYM_KEY registra erro no boot (sem derrubar)', () => {
    const env = { NODE_ENV: process.env.NODE_ENV, KEY: process.env.AUDIT_PSEUDONYM_KEY };
    const error = jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.AUDIT_PSEUDONYM_KEY;
      expect(() => service.onModuleInit()).not.toThrow();
      expect(error).toHaveBeenCalledWith(expect.stringContaining('AUDIT_PSEUDONYM_KEY'));
      error.mockClear();
      process.env.AUDIT_PSEUDONYM_KEY = 'chave';
      service.onModuleInit();
      expect(error).not.toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = env.NODE_ENV;
      if (env.KEY === undefined) delete process.env.AUDIT_PSEUDONYM_KEY;
      else process.env.AUDIT_PSEUDONYM_KEY = env.KEY;
      error.mockRestore();
    }
  });

  it('pseudonymizeSubject nunca lança (auditoria não derruba a exclusão da conta)', async () => {
    prisma.auditLog.updateMany.mockRejectedValue(new Error('banco fora'));
    await expect(service.pseudonymizeSubject({ userId: 'u1' })).resolves.toBe(0);
  });

  it('purgeExpired apaga pelo prazo: acesso em 6 meses, demais em 5 anos', async () => {
    const now = new Date('2026-10-06T12:00:00Z');
    prisma.auditLog.deleteMany.mockResolvedValueOnce({ count: 7 }).mockResolvedValueOnce({ count: 2 });

    await expect(service.purgeExpired(now)).resolves.toEqual({ access: 7, others: 2 });

    const day = 24 * 60 * 60 * 1000;
    const [accessCall, othersCall] = prisma.auditLog.deleteMany.mock.calls.map((call: any[]) => call[0].where);
    expect(accessCall.action.in).toContain('LOGIN_FAILED');
    expect(accessCall.createdAt.lt).toEqual(new Date(now.getTime() - AUDIT_ACCESS_RETENTION_DAYS * day));
    expect(othersCall.action.notIn).toContain('LOGIN');
    expect(othersCall.createdAt.lt).toEqual(new Date(now.getTime() - AUDIT_RETENTION_DAYS * day));
  });
});
