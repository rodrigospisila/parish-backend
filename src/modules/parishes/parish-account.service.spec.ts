import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PassThrough } from 'stream';
import { CLOSURE_NOTICE_DAYS, ParishAccountService } from './parish-account.service';
import { ParishesService, normalizeCnpj } from './parishes.service';

describe('ParishAccountService (exportação e encerramento)', () => {
  const parish = {
    id: 'p1',
    name: 'Paróquia São José',
    city: 'Imbituva',
    state: 'PR',
    cnpj: '11222333000181',
    closureRequestedAt: null as Date | null,
    closureEffectiveAt: null as Date | null,
  };
  const users: Record<string, any> = {
    holder: { id: 'holder', name: 'Pe. Titular', email: 'pe@x.com', role: UserRole.PARISH_ADMIN, parishId: 'p1', parishHolder: true, isActive: true },
    secretary: { id: 'secretary', name: 'Secretária', email: 's@x.com', role: UserRole.PARISH_ADMIN, parishId: 'p1', parishHolder: false, isActive: true },
    otherHolder: { id: 'otherHolder', name: 'Outro', email: 'o@x.com', role: UserRole.PARISH_ADMIN, parishId: 'p2', parishHolder: true, isActive: true },
    diocesan: { id: 'diocesan', name: 'Cúria', email: 'c@x.com', role: UserRole.DIOCESAN_ADMIN, dioceseId: 'd1', parishHolder: false, isActive: true },
    system: { id: 'system', name: 'Plataforma', email: 'adm@x.com', role: UserRole.SYSTEM_ADMIN, parishHolder: false, isActive: true },
    inactiveHolder: { id: 'inactiveHolder', name: 'X', email: 'x@x.com', role: UserRole.PARISH_ADMIN, parishId: 'p1', parishHolder: true, isActive: false },
  };
  const as = (key: string) => ({ id: key, role: users[key].role }) as any;

  let prisma: any;
  let audit: any;
  let session: any;
  let notifications: any;
  let email: any;
  let config: any;
  let service: ParishAccountService;

  beforeEach(() => {
    parish.closureRequestedAt = null;
    prisma = {
      parish: {
        findUnique: jest.fn(async ({ where }: any) => (where.id === 'p1' ? { ...parish } : null)),
        update: jest.fn(async ({ data }: any) => ({ id: 'p1', ...data })),
      },
      user: {
        findUnique: jest.fn(async ({ where }: any) => users[where.id] ?? null),
        findMany: jest.fn().mockResolvedValue([{ id: 'system', email: 'adm@x.com' }]),
      },
      community: { findMany: jest.fn().mockResolvedValue([]) },
      // Âncoras SQL da exportação (sacramentos/dízimo pela paróquia do registro — S17)
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    for (const model of [
      'member', 'sacrament', 'communityPastoral', 'pastoralMember', 'schedule', 'catechesisClass',
      'catechesisEnrollment', 'tither', 'titheContribution', 'financialTransaction',
    ]) {
      prisma[model] = { findMany: jest.fn().mockResolvedValue([]) };
    }
    audit = { log: jest.fn() };
    session = { assertPassword: jest.fn().mockResolvedValue(undefined) };
    notifications = { notifyUsers: jest.fn().mockResolvedValue(undefined) };
    email = { trySend: jest.fn().mockResolvedValue(false) };
    config = { get: jest.fn().mockReturnValue(undefined) };
    service = new ParishAccountService(prisma, audit, session, notifications, email, config);
  });

  describe('autorização (titular ou SYSTEM_ADMIN, com senha)', () => {
    it.each(['secretary', 'otherHolder', 'diocesan', 'inactiveHolder'])('%s → 403 sem conferir a senha', async (key) => {
      await expect(service.assertHolder('p1', as(key), 'senha')).rejects.toBeInstanceOf(ForbiddenException);
      expect(session.assertPassword).not.toHaveBeenCalled();
    });

    it('titular e plataforma passam; a senha é conferida com o IP (freio de senha)', async () => {
      await expect(service.assertHolder('p1', as('holder'), 'senha', '1.2.3.4')).resolves.toMatchObject({
        parish: { id: 'p1' },
        actor: { id: 'holder' },
      });
      expect(session.assertPassword).toHaveBeenCalledWith('holder', 'senha', { ip: '1.2.3.4' });
      await expect(service.assertHolder('p1', as('system'), 'senha')).resolves.toBeDefined();
    });

    it('senha errada → 400 do SessionSecurityService; paróquia inexistente → 404', async () => {
      session.assertPassword.mockRejectedValue(new BadRequestException('Senha atual incorreta'));
      await expect(service.assertHolder('p1', as('holder'), 'errada')).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.assertHolder('p9', as('system'), 'x')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  it('exportação: audita início e fim (EXPORT) e escreve o ZIP', async () => {
    const ctx = await service.assertHolder('p1', as('holder'), 'senha');
    const out = new PassThrough();
    const chunks: Buffer[] = [];
    out.on('data', (c) => chunks.push(c));
    const files = await service.streamExport(ctx, out);
    expect(files.map((f) => f.name)).toContain('membros.csv');
    expect(Buffer.concat(chunks).subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    expect(audit.log).toHaveBeenCalledTimes(2);
    expect(audit.log.mock.calls[0][0]).toMatchObject({ action: 'EXPORT', entity: 'Parish', entityId: 'p1', metadata: { parishExport: 'started' } });
    expect(audit.log.mock.calls[1][0].metadata.parishExport).toBe('completed');
    expect(service.exportFileName(ctx, new Date('2026-10-19T15:00:00Z'))).toBe('parish-paroquia-sao-jose-2026-10-19.zip');
  });

  it('encerramento: grava os campos (+30 dias), audita e avisa a plataforma (in-app + e-mail)', async () => {
    const before = Date.now();
    const res = await service.requestClosure('p1', as('holder'), 'senha', '  Mudança de sistema ');
    const data = prisma.parish.update.mock.calls[0][0].data;
    expect(data.closureRequestedByUserId).toBe('holder');
    expect(data.closureRequestedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(data.closureEffectiveAt.getTime() - data.closureRequestedAt.getTime()).toBe(CLOSURE_NOTICE_DAYS * 86_400_000);
    expect(res).toMatchObject({ closureRequestedByUserId: 'holder' });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ entity: 'Parish', metadata: { closureRequest: 'requested', reason: 'Mudança de sistema' } }),
    );
    expect(notifications.notifyUsers).toHaveBeenCalledWith(
      ['system'],
      'URGENT_NOTICE',
      'Pedido de encerramento de paróquia',
      expect.stringContaining('Mudança de sistema'),
      expect.objectContaining({ kind: 'PARISH_CLOSURE_REQUESTED', parishId: 'p1' }),
      { skipFallback: true },
    );
    expect(email.trySend).toHaveBeenCalledWith('adm@x.com', expect.any(String), expect.any(String));
    // Nada é apagado
    expect(prisma.parish.update.mock.calls[0][0].data).not.toHaveProperty('status');
  });

  it('encerramento: sem senha certa nada é gravado; pedido em aberto → 409; secretária → 403', async () => {
    session.assertPassword.mockRejectedValueOnce(new BadRequestException('Senha atual incorreta'));
    await expect(service.requestClosure('p1', as('holder'), 'errada', '')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.parish.update).not.toHaveBeenCalled();
    await expect(service.requestClosure('p1', as('secretary'), 'senha', '')).rejects.toBeInstanceOf(ForbiddenException);
    parish.closureRequestedAt = new Date();
    await expect(service.requestClosure('p1', as('holder'), 'senha', '')).rejects.toBeInstanceOf(ConflictException);
  });

  it('cancelar limpa os campos e avisa; sem pedido → 404; não titular → 403', async () => {
    await expect(service.cancelClosure('p1', as('holder'))).rejects.toBeInstanceOf(NotFoundException);
    parish.closureRequestedAt = new Date('2026-10-01T12:00:00Z');
    await expect(service.cancelClosure('p1', as('secretary'))).rejects.toBeInstanceOf(ForbiddenException);
    await service.cancelClosure('p1', as('system'));
    expect(prisma.parish.update.mock.calls[0][0].data).toEqual({
      closureRequestedAt: null,
      closureRequestedByUserId: null,
      closureEffectiveAt: null,
    });
    expect(notifications.notifyUsers).toHaveBeenCalledWith(
      ['system'], 'URGENT_NOTICE', 'Encerramento de paróquia cancelado', expect.any(String), expect.anything(),
      { skipFallback: true },
    );
  });
});

describe('CNPJ da paróquia (cat-gestao-31)', () => {
  it('normaliza para 14 dígitos, limpa com vazio e recusa dígito errado', () => {
    expect(normalizeCnpj('11.222.333/0001-81')).toBe('11222333000181');
    expect(normalizeCnpj('')).toBeNull();
    expect(normalizeCnpj(null)).toBeNull();
    expect(() => normalizeCnpj('11.222.333/0001-82')).toThrow(BadRequestException);
  });

  it('PATCH /parishes/:id grava o CNPJ normalizado e audita a troca', async () => {
    const prisma: any = {
      parish: {
        findUnique: jest.fn().mockResolvedValue({ id: 'p1', dioceseId: 'd1', status: 'ACTIVE', cnpj: null }),
        update: jest.fn(async ({ data }: any) => ({ id: 'p1', dioceseId: 'd1', status: 'ACTIVE', ...data })),
      },
    };
    const audit = { log: jest.fn() };
    const service = new ParishesService(prisma, audit as any);
    await service.update('p1', { cnpj: '11.222.333/0001-81' } as any, {
      id: 'u', role: UserRole.PARISH_ADMIN, parishId: 'p1',
    } as any);
    expect(prisma.parish.update.mock.calls[0][0].data).toEqual({ cnpj: '11222333000181' });
    expect(audit.log.mock.calls[0][0]).toMatchObject({ before: { cnpj: null }, after: { cnpj: '11222333000181' } });
    await expect(
      service.update('p1', { cnpj: '123' } as any, { id: 'u', role: UserRole.PARISH_ADMIN, parishId: 'p1' } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
