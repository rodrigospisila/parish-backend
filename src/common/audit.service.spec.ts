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

  it('pseudonymizeSubject limpa o e-mail gravado e os dados pessoais dos registros do titular', async () => {
    prisma.auditLog.updateMany.mockResolvedValue({ count: 3 });
    prisma.auditLog.findMany.mockResolvedValueOnce([
      { id: 'r1', before: { email: 'a@b.com', role: 'FAITHFUL' }, after: null, metadata: { selfService: true } },
      { id: 'r2', before: null, after: null, metadata: { changedFields: ['name'] } },
    ]);

    const changed = await service.pseudonymizeSubject({ userId: 'u1', memberId: 'm1', email: 'a@b.com' });

    const where = prisma.auditLog.updateMany.mock.calls[0][0].where;
    expect(where.OR).toEqual(
      expect.arrayContaining([
        { actorUserId: 'u1' },
        { entityId: { in: ['u1', 'm1'] } },
        { actorEmail: expect.stringMatching(/^pseud:/) },
      ]),
    );
    expect(prisma.auditLog.updateMany.mock.calls[0][0].data).toEqual({ actorEmail: null });
    // Só o registro com dado pessoal é reescrito
    expect(prisma.auditLog.update).toHaveBeenCalledTimes(1);
    expect(prisma.auditLog.update).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: { before: { email: AUDIT_REDACTED, role: 'FAITHFUL' } },
    });
    expect(changed).toBe(4);
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
