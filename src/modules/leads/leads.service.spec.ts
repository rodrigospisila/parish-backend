import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LeadsService, PUBLIC_LEAD_OK } from './leads.service';

const PARISH_ID = 'ckparish0000000000000001';

describe('LeadsService (contrato C4 — leads)', () => {
  let prisma: any;
  let notifications: any;
  let email: any;
  let env: Record<string, string>;
  let service: LeadsService;

  const flush = () => new Promise((resolve) => setImmediate(resolve));

  beforeEach(() => {
    prisma = {
      lead: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'lead1', ...data })),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'lead1', ...data })),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      parish: {
        findUnique: jest.fn().mockResolvedValue({ id: PARISH_ID }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      user: { findMany: jest.fn().mockResolvedValue([{ id: 'admin1' }, { id: 'admin2' }]) },
    };
    notifications = { notifyUsers: jest.fn().mockResolvedValue(undefined) };
    email = { configured: true, trySend: jest.fn().mockResolvedValue(true) };
    env = {};
    service = new LeadsService(prisma, notifications, email, { get: (k: string) => env[k] } as any);
  });

  const base = { name: '  Pe. João  ', email: 'Joao@Exemplo.com ', consent: true as const };

  it('cria o lead (SITE, NEW, consentimento) e avisa os SYSTEM_ADMIN', async () => {
    env.SUPPORT_EMAIL = 'suporte@exemplo.com.br';
    const res = await service.createPublic({
      ...base,
      phone: '(42) 99999-0000',
      parishName: 'Paróquia São Pedro',
      city: 'Imbituva',
      state: 'pr',
      parishId: PARISH_ID,
      message: ' Quero conhecer ',
    });
    expect(res).toEqual(PUBLIC_LEAD_OK);
    const data = prisma.lead.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      name: 'Pe. João',
      email: 'joao@exemplo.com',
      phone: '42999990000',
      state: 'PR',
      parishId: PARISH_ID,
      message: 'Quero conhecer',
      source: 'SITE',
      status: 'NEW',
    });
    expect(data.consentAt).toBeInstanceOf(Date);

    await flush();
    expect(notifications.notifyUsers).toHaveBeenCalledWith(
      ['admin1', 'admin2'],
      'URGENT_NOTICE',
      'Novo contato comercial',
      expect.stringContaining('Pe. João'),
      expect.objectContaining({ kind: 'LEAD', leadId: 'lead1' }),
    );
    expect(prisma.user.findMany.mock.calls[0][0].where).toEqual({ role: 'SYSTEM_ADMIN', isActive: true });
    expect(email.trySend).toHaveBeenCalledWith('suporte@exemplo.com.br', expect.any(String), expect.any(String));
  });

  it('sem SUPPORT_EMAIL não manda e-mail (só in-app)', async () => {
    await service.createPublic(base);
    await flush();
    expect(notifications.notifyUsers).toHaveBeenCalled();
    expect(email.trySend).not.toHaveBeenCalled();
  });

  it('honeypot preenchido: mesma resposta, nada gravado nem avisado', async () => {
    const res = await service.createPublic({ ...base, website: 'http://spam' });
    expect(res).toEqual(PUBLIC_LEAD_OK);
    expect(prisma.lead.create).not.toHaveBeenCalled();
    await flush();
    expect(notifications.notifyUsers).not.toHaveBeenCalled();
  });

  it('exige e-mail ou telefone e telefone com DDD', async () => {
    await expect(service.createPublic({ name: 'Ana', consent: true })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.createPublic({ name: 'Ana', phone: '9999-0000', consent: true })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.createPublic({ name: 'Ana', phone: '42 99999-0000', consent: true })).resolves.toEqual(PUBLIC_LEAD_OK);
  });

  it('parishId fora do formato ou inexistente é descartado (sem erro)', async () => {
    await service.createPublic({ ...base, parishId: "x' OR 1=1" });
    expect(prisma.parish.findUnique).not.toHaveBeenCalled();
    expect(prisma.lead.create.mock.calls[0][0].data.parishId).toBeNull();

    prisma.parish.findUnique.mockResolvedValue(null);
    await service.createPublic({ ...base, parishId: PARISH_ID });
    expect(prisma.lead.create.mock.calls[1][0].data.parishId).toBeNull();
  });

  it('mesmo contato em 24 h atualiza o lead aberto, sem novo aviso', async () => {
    prisma.lead.findFirst.mockResolvedValue({ id: 'old' });
    const res = await service.createPublic({ ...base, phone: '42999990000' });
    expect(res).toEqual(PUBLIC_LEAD_OK);
    expect(prisma.lead.create).not.toHaveBeenCalled();
    expect(prisma.lead.update.mock.calls[0][0].where).toEqual({ id: 'old' });
    const where = prisma.lead.findFirst.mock.calls[0][0].where;
    expect(where.status).toBe('NEW');
    expect(where.OR).toEqual([{ email: 'joao@exemplo.com' }, { phone: '42999990000' }]);
    await flush();
    expect(notifications.notifyUsers).not.toHaveBeenCalled();
  });

  it('falha no aviso não derruba o pedido', async () => {
    notifications.notifyUsers.mockRejectedValue(new Error('push fora'));
    await expect(service.createPublic(base)).resolves.toEqual(PUBLIC_LEAD_OK);
    await flush();
  });

  it('lista com filtro, contadores por status e paróquia resolvida', async () => {
    prisma.lead.findMany.mockResolvedValue([{ id: 'l1', name: 'Ana', parishId: PARISH_ID, status: 'NEW' }]);
    prisma.lead.count.mockResolvedValue(1);
    prisma.lead.groupBy.mockResolvedValue([{ status: 'NEW', _count: { _all: 3 } }]);
    prisma.parish.findMany.mockResolvedValue([{ id: PARISH_ID, name: 'São Pedro', city: 'Imbituva', state: 'PR', managedAt: null }]);
    const res = await service.list({ status: 'NEW', search: 'ana', limit: 9999 });
    expect(prisma.lead.findMany.mock.calls[0][0].where.status).toBe('NEW');
    expect(prisma.lead.findMany.mock.calls[0][0].take).toBe(200);
    expect(res.total).toBe(1);
    expect(res.counts).toEqual({ NEW: 3, CONTACTED: 0, DEMO_SCHEDULED: 0, WON: 0, LOST: 0 });
    expect(res.items[0].parish).toEqual({ id: PARISH_ID, name: 'São Pedro', city: 'Imbituva', state: 'PR', managed: false });
    await expect(service.list({ status: 'XPTO' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('PATCH: status e notas; inexistente → 404; vazio → 400', async () => {
    prisma.lead.findUnique.mockResolvedValue({ id: 'l1' });
    await service.update('l1', { status: 'CONTACTED' as any, notes: '  ligar segunda ' });
    expect(prisma.lead.update.mock.calls[0][0].data).toEqual({ status: 'CONTACTED', notes: 'ligar segunda' });
    await service.update('l1', { notes: null });
    expect(prisma.lead.update.mock.calls[1][0].data).toEqual({ notes: null });
    await expect(service.update('l1', {})).rejects.toBeInstanceOf(BadRequestException);
    prisma.lead.findUnique.mockResolvedValue(null);
    await expect(service.update('x', { status: 'WON' as any })).rejects.toBeInstanceOf(NotFoundException);
  });
});
