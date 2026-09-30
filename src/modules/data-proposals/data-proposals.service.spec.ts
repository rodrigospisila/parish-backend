import 'reflect-metadata';
import { BadRequestException, ConflictException, ExecutionContext, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DataProposalKind, UserRole } from '@prisma/client';
import { DataProposalsService, MSG_BULK_NEEDS_EDIT, MSG_CHANGED, MSG_NEEDS_SCHEDULE } from './data-proposals.service';
import { DataProposalsController } from './data-proposals.controller';
import { BulkDataProposalsDto } from './dto/bulk-data-proposals.dto';
import { ApproveDataProposalDto } from './dto/approve-data-proposal.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Banco em memória com o pedaço do Prisma que o serviço usa. `$transaction`
 * desfaz tudo quando a função lança — como o Postgres — para os testes de
 * "a falha não deixa nada pela metade".
 */
function fakeDb() {
  const state = {
    proposals: [] as any[],
    schedules: [] as any[],
    communities: [] as any[],
    parishes: [] as any[],
  };
  let seq = 0;
  const pick = (row: any) => (row ? { ...row } : null);
  const matches = (row: any, where: any = {}) =>
    Object.entries(where).every(([k, v]: [string, any]) => {
      if (v && typeof v === 'object' && !Array.isArray(v) && 'equals' in v) {
        return String(row[k]).toLowerCase() === String(v.equals).toLowerCase();
      }
      return (row[k] ?? null) === v;
    });
  const table = (rows: () => any[], prefix: string) => ({
    findUnique: async ({ where }: any) => pick(rows().find((r) => r.id === where.id)),
    findFirst: async ({ where }: any) => pick(rows().find((r) => matches(r, where))),
    findMany: async ({ where }: any) => rows().filter((r) => matches(r, where)).map(pick),
    create: async ({ data }: any) => {
      const row = { id: `${prefix}${++seq}`, ...data };
      rows().push(row);
      return pick(row);
    },
    update: async ({ where, data }: any) => {
      const row = rows().find((r) => r.id === where.id);
      if (!row) throw new Error('não encontrado');
      for (const [k, v] of Object.entries(data) as [string, any][]) {
        if (v && typeof v === 'object' && 'connect' in v) row[k === 'schedule' ? 'massScheduleId' : `${k}Id`] = v.connect.id;
        else row[k] = v;
      }
      return pick(row);
    },
    updateMany: async ({ where, data }: any) => {
      const hit = rows().filter((r) => matches(r, where));
      hit.forEach((r) => Object.assign(r, data));
      return { count: hit.length };
    },
    delete: async ({ where }: any) => {
      const list = rows();
      const i = list.findIndex((r) => r.id === where.id);
      const [row] = list.splice(i, 1);
      // FK SET NULL das propostas
      state.proposals.forEach((p) => p.massScheduleId === row.id && (p.massScheduleId = null));
      return row;
    },
  });
  const db: any = {
    state,
    dataProposal: table(() => state.proposals, 'dp'),
    massSchedule: table(() => state.schedules, 'ms'),
    community: table(() => state.communities, 'c'),
    parish: table(() => state.parishes, 'p'),
    $transaction: async (fn: any) => {
      const snap = structuredClone({ ...state });
      try {
        return await fn(db);
      } catch (e) {
        Object.assign(state, snap);
        throw e;
      }
    },
  };
  return db;
}

const admin = { id: 'u-admin', email: 'admin@parish.app', role: 'SYSTEM_ADMIN' };

const schedule = (over: any = {}) => ({
  id: 'ms-1',
  communityId: 'c-1',
  type: 'MASS',
  dayOfWeek: 0,
  time: '08:00',
  recurrence: 'WEEKLY',
  weeksOfMonth: [],
  dayOfMonth: null,
  notes: null,
  isSpecial: false,
  ...over,
});

const proposal = (over: any = {}) => ({
  id: 'dp-1',
  kind: 'SCHEDULE_CREATE',
  status: 'PENDING',
  communityId: 'c-1',
  parishId: null,
  massScheduleId: null,
  payload: null,
  current: null,
  batch: 'horarios-rio-2026-09-30',
  reviewNote: null,
  reviewedAt: null,
  reviewedById: null,
  ...over,
});

describe('DataProposalsService — aprovação e rejeição', () => {
  let db: ReturnType<typeof fakeDb>;
  let audit: { log: jest.Mock };
  let service: DataProposalsService;

  beforeEach(() => {
    db = fakeDb();
    db.state.parishes.push(
      { id: 'p-1', name: 'Paróquia São José', website: 'https://errado.example.com' },
      { id: 'p-2', name: 'Paróquia Santa Cruz', website: null },
    );
    db.state.communities.push({
      id: 'c-1',
      name: 'Matriz São José',
      address: 'Rua A, 10',
      parishId: 'p-1',
      website: null,
      deletedAt: null,
    });
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    service = new DataProposalsService(db as any, audit as any);
  });

  const stored = (id = 'dp-1') => db.state.proposals.find((p: any) => p.id === id);

  describe('SCHEDULE_CREATE', () => {
    const payload = { type: 'CONFESSION', dayOfWeek: 6, time: '15:00', recurrence: 'WEEKLY', weeksOfMonth: [], dayOfMonth: null, notes: 'até 17:00' };

    it('cria o horário, marca APPROVED e registra auditoria', async () => {
      db.state.proposals.push(proposal({ payload }));
      const r = await service.approve('dp-1', { note: 'conferido no site' }, admin);

      expect(r.applied).toBe(true);
      expect(db.state.schedules).toHaveLength(1);
      expect(db.state.schedules[0]).toMatchObject({ communityId: 'c-1', type: 'CONFESSION', dayOfWeek: 6, time: '15:00', notes: 'até 17:00' });
      expect(stored()).toMatchObject({ status: 'APPROVED', reviewedById: 'u-admin', reviewNote: 'conferido no site' });
      expect(stored().massScheduleId).toBe(db.state.schedules[0].id);
      expect(stored().reviewedAt).toBeInstanceOf(Date);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DATA_PROPOSAL_APPROVED', entity: 'DataProposal', entityId: 'dp-1' }),
      );
    });

    it('não duplica: horário igual já existente → APPROVED sem criar (applied=false)', async () => {
      db.state.schedules.push(schedule({ id: 'ms-9', type: 'CONFESSION', dayOfWeek: 6, time: '15:00' }));
      db.state.proposals.push(proposal({ payload }));
      const r = await service.approve('dp-1', {}, admin);

      expect(r.applied).toBe(false);
      expect(r.message).toMatch(/Já existe/);
      expect(db.state.schedules).toHaveLength(1);
      expect(stored()).toMatchObject({ status: 'APPROVED', massScheduleId: 'ms-9' });
    });

    it('mensal (MONTHLY_NTH) com semanas do mês', async () => {
      db.state.proposals.push(
        proposal({ payload: { type: 'MASS', dayOfWeek: 6, time: '19:00', recurrence: 'MONTHLY_NTH', weeksOfMonth: [3, 1], dayOfMonth: null } }),
      );
      await service.approve('dp-1', {}, admin);
      expect(db.state.schedules[0]).toMatchObject({ recurrence: 'MONTHLY_NTH', weeksOfMonth: [1, 3], dayOfMonth: null });
    });

    it('edição válida substitui o proposto e fica gravada na proposta', async () => {
      db.state.proposals.push(proposal({ payload }));
      const edit = { ...payload, time: '16:30', type: 'ADORATION' };
      const r = await service.approve('dp-1', { payload: edit }, admin);
      expect(r.applied).toBe(true);
      expect(db.state.schedules[0]).toMatchObject({ time: '16:30', type: 'ADORATION' });
      expect(stored().payload).toEqual(edit);
    });

    it.each([
      [{ time: '25:00' }, /Hora inválida/],
      [{ time: '7h' }, /Hora inválida/],
      [{ dayOfWeek: 7 }, /Dia da semana inválido/],
      [{ type: 'BENCAO' }, /Tipo de celebração inválido/],
      [{ recurrence: 'MONTHLY_NTH', weeksOfMonth: [6] }, /Semanas do mês inválidas/],
      [{ recurrence: 'MONTHLY_NTH', weeksOfMonth: [] }, /ocorrências do mês/],
      [{ recurrence: 'MONTHLY_DAY', dayOfWeek: null, dayOfMonth: 32 }, /Dia do mês inválido/],
      [{ recurrence: 'MONTHLY_DAY', dayOfWeek: null, dayOfMonth: null }, /dia do mês/],
      [{ foo: 1 }, /Campo não permitido/],
    ])('edição inválida %j → 400 e nada muda', async (over, msg) => {
      db.state.proposals.push(proposal({ payload }));
      const p = service.approve('dp-1', { payload: { ...payload, ...over } }, admin);
      await expect(p).rejects.toThrow(BadRequestException);
      await expect(service.approve('dp-1', { payload: { ...payload, ...over } }, admin)).rejects.toThrow(msg);
      expect(db.state.schedules).toHaveLength(0);
      expect(stored().status).toBe('PENDING');
    });

    it('MONTHLY_DAY limpa o dia da semana', async () => {
      db.state.proposals.push(proposal({ payload: { type: 'MASS', dayOfWeek: 3, time: '19:00', recurrence: 'MONTHLY_DAY', dayOfMonth: 13 } }));
      await service.approve('dp-1', {}, admin);
      expect(db.state.schedules[0]).toMatchObject({ recurrence: 'MONTHLY_DAY', dayOfWeek: null, dayOfMonth: 13, weeksOfMonth: [] });
    });

    it('comunidade apagada → 409', async () => {
      db.state.communities[0].deletedAt = new Date();
      db.state.proposals.push(proposal({ payload }));
      await expect(service.approve('dp-1', {}, admin)).rejects.toThrow(ConflictException);
      expect(stored().status).toBe('PENDING');
    });
  });

  describe('SCHEDULE_UPDATE', () => {
    const current = { id: 'ms-1', type: 'MASS', dayOfWeek: 0, time: '08:00', recurrence: 'WEEKLY', weeksOfMonth: [], dayOfMonth: null, notes: null };

    it('aplica os campos que mudam', async () => {
      db.state.schedules.push(schedule());
      db.state.proposals.push(proposal({ kind: 'SCHEDULE_UPDATE', massScheduleId: 'ms-1', payload: { time: '09:30' }, current }));
      const r = await service.approve('dp-1', {}, admin);
      expect(r.applied).toBe(true);
      expect(db.state.schedules[0]).toMatchObject({ time: '09:30', dayOfWeek: 0, type: 'MASS' });
    });

    it('payload vazio sem edição → 400 "Informe o horário certo"', async () => {
      db.state.schedules.push(schedule());
      db.state.proposals.push(proposal({ kind: 'SCHEDULE_UPDATE', massScheduleId: 'ms-1', payload: {}, current }));
      await expect(service.approve('dp-1', {}, admin)).rejects.toThrow(MSG_NEEDS_SCHEDULE);
      await expect(service.approve('dp-1', {}, admin)).rejects.toThrow(BadRequestException);
      expect(stored().status).toBe('PENDING');
    });

    it('payload vazio + edição do aprovador → aplica', async () => {
      db.state.schedules.push(schedule());
      db.state.proposals.push(proposal({ kind: 'SCHEDULE_UPDATE', massScheduleId: 'ms-1', payload: {}, current }));
      await service.approve('dp-1', { payload: { dayOfWeek: 6, time: '19:00' } }, admin);
      expect(db.state.schedules[0]).toMatchObject({ dayOfWeek: 6, time: '19:00' });
      expect(stored().payload).toEqual({ dayOfWeek: 6, time: '19:00' });
    });

    it('409 quando o horário mudou desde a proposta (current desatualizado)', async () => {
      db.state.schedules.push(schedule({ time: '08:30' }));
      db.state.proposals.push(proposal({ kind: 'SCHEDULE_UPDATE', massScheduleId: 'ms-1', payload: { time: '09:30' }, current }));
      await expect(service.approve('dp-1', {}, admin)).rejects.toThrow(MSG_CHANGED);
      await expect(service.approve('dp-1', {}, admin)).rejects.toThrow(ConflictException);
      expect(db.state.schedules[0].time).toBe('08:30');
      expect(stored().status).toBe('PENDING');
    });

    it('horário apagado no meio → 409', async () => {
      db.state.proposals.push(proposal({ kind: 'SCHEDULE_UPDATE', massScheduleId: null, payload: { time: '09:30' }, current }));
      await expect(service.approve('dp-1', {}, admin)).rejects.toThrow(ConflictException);
    });
  });

  it('SCHEDULE_DELETE apaga o horário e guarda o retrato em current', async () => {
    db.state.schedules.push(schedule());
    db.state.proposals.push(proposal({ kind: 'SCHEDULE_DELETE', massScheduleId: 'ms-1', payload: {} }));
    const r = await service.approve('dp-1', {}, admin);
    expect(r.applied).toBe(true);
    expect(db.state.schedules).toHaveLength(0);
    expect(stored()).toMatchObject({ status: 'APPROVED', current: expect.objectContaining({ id: 'ms-1', time: '08:00' }) });
  });

  describe('SCHEDULE_RECURRENCE', () => {
    const current = { recurrence: 'WEEKLY', dayOfWeek: 6, weeksOfMonth: [], dayOfMonth: null };

    it('troca semanal por mensal', async () => {
      db.state.schedules.push(schedule({ dayOfWeek: 6, notes: '1º sábado do mês' }));
      db.state.proposals.push(
        proposal({ kind: 'SCHEDULE_RECURRENCE', massScheduleId: 'ms-1', current, payload: { recurrence: 'MONTHLY_NTH', dayOfWeek: 6, weeksOfMonth: [1], dayOfMonth: null } }),
      );
      await service.approve('dp-1', {}, admin);
      expect(db.state.schedules[0]).toMatchObject({ recurrence: 'MONTHLY_NTH', weeksOfMonth: [1], time: '08:00' });
    });

    it('sem sugestão (payload null) exige edição; com edição aplica', async () => {
      db.state.schedules.push(schedule({ dayOfWeek: 6 }));
      db.state.proposals.push(proposal({ kind: 'SCHEDULE_RECURRENCE', massScheduleId: 'ms-1', current, payload: null }));
      await expect(service.approve('dp-1', {}, admin)).rejects.toThrow(BadRequestException);
      await service.approve('dp-1', { payload: { recurrence: 'MONTHLY_DAY', dayOfMonth: 13 } }, admin);
      expect(db.state.schedules[0]).toMatchObject({ recurrence: 'MONTHLY_DAY', dayOfMonth: 13, dayOfWeek: null });
    });

    it('edição com campo de horário que não é da recorrência → 400', async () => {
      db.state.schedules.push(schedule({ dayOfWeek: 6 }));
      db.state.proposals.push(proposal({ kind: 'SCHEDULE_RECURRENCE', massScheduleId: 'ms-1', current, payload: null }));
      await expect(service.approve('dp-1', { payload: { recurrence: 'WEEKLY', time: '10:00' } }, admin)).rejects.toThrow(/Campo não permitido/);
    });
  });

  it('COMMUNITY_ADDRESS atualiza o endereço', async () => {
    db.state.proposals.push(proposal({ kind: 'COMMUNITY_ADDRESS', payload: { address: 'Rua B, 20 — Centro' }, current: { address: 'Rua A, 10' } }));
    const r = await service.approve('dp-1', {}, admin);
    expect(r.applied).toBe(true);
    expect(db.state.communities[0].address).toBe('Rua B, 20 — Centro');
  });

  it('COMMUNITY_ADDRESS com endereço mudado no meio → 409', async () => {
    db.state.communities[0].address = 'Rua Z, 99';
    db.state.proposals.push(proposal({ kind: 'COMMUNITY_ADDRESS', payload: { address: 'Rua B, 20' }, current: { address: 'Rua A, 10' } }));
    await expect(service.approve('dp-1', {}, admin)).rejects.toThrow(MSG_CHANGED);
  });

  it('COMMUNITY_PARISH move a comunidade; paróquia inexistente → 400', async () => {
    db.state.proposals.push(proposal({ kind: 'COMMUNITY_PARISH', payload: { parishId: 'p-2' }, current: { parishId: 'p-1' } }));
    db.state.proposals.push(proposal({ id: 'dp-2', kind: 'COMMUNITY_PARISH', payload: { parishId: 'p-x' } }));
    await expect(service.approve('dp-2', {}, admin)).rejects.toThrow(/Paróquia de destino/);
    await service.approve('dp-1', {}, admin);
    expect(db.state.communities[0].parishId).toBe('p-2');
  });

  it('COMMUNITY_CREATE cria sem coordenada e liga a proposta; nome repetido não duplica', async () => {
    db.state.proposals.push(
      proposal({ kind: 'COMMUNITY_CREATE', communityId: null, parishId: 'p-1', payload: { name: 'Capela Santa Luzia', address: 'Bairro Uvaranas', city: 'Ponta Grossa', state: 'pr' } }),
    );
    db.state.proposals.push(
      proposal({ id: 'dp-2', kind: 'COMMUNITY_CREATE', communityId: null, parishId: 'p-1', payload: { name: 'capela santa luzia', address: 'Uvaranas', city: 'Ponta Grossa', state: 'PR' } }),
    );
    const r = await service.approve('dp-1', {}, admin);
    expect(r.applied).toBe(true);
    const created = db.state.communities.find((c: any) => c.name === 'Capela Santa Luzia');
    expect(created).toMatchObject({ parishId: 'p-1', state: 'PR', zipCode: '' });
    expect(created.latitude).toBeUndefined();
    expect(stored().communityId).toBe(created.id);

    const again = await service.approve('dp-2', {}, admin);
    expect(again.applied).toBe(false);
    expect(db.state.communities).toHaveLength(2);
  });

  it('COMMUNITY_CREATE sem campo obrigatório → 400', async () => {
    db.state.proposals.push(proposal({ kind: 'COMMUNITY_CREATE', communityId: null, parishId: 'p-1', payload: { name: 'Capela X', city: 'PG', state: 'PR' } }));
    await expect(service.approve('dp-1', {}, admin)).rejects.toThrow(/endereço/);
  });

  it('COMMUNITY_WEBSITE grava o site; URL inválida → 400', async () => {
    db.state.proposals.push(proposal({ kind: 'COMMUNITY_WEBSITE', payload: { website: 'https://matriz.example.org' } }));
    await expect(service.approve('dp-1', { payload: { website: 'javascript:alert(1)' } }, admin)).rejects.toThrow(/Site inválido/);
    await service.approve('dp-1', {}, admin);
    expect(db.state.communities[0].website).toBe('https://matriz.example.org');
  });

  it('PARISH_WEBSITE null apaga o site errado', async () => {
    db.state.proposals.push(
      proposal({ kind: 'PARISH_WEBSITE', communityId: null, parishId: 'p-1', payload: { website: null }, current: { website: 'https://errado.example.com' } }),
    );
    const r = await service.approve('dp-1', {}, admin);
    expect(r).toMatchObject({ applied: true, message: 'Site da paróquia apagado' });
    expect(db.state.parishes[0].website).toBeNull();
  });

  it('409 quando a proposta não está PENDING; 404 quando não existe', async () => {
    db.state.proposals.push(proposal({ status: 'APPROVED', payload: {} }));
    db.state.proposals.push(proposal({ id: 'dp-2', status: 'REJECTED', payload: {} }));
    await expect(service.approve('dp-1', {}, admin)).rejects.toThrow('Esta proposta já foi aprovada');
    await expect(service.approve('dp-2', {}, admin)).rejects.toThrow(ConflictException);
    await expect(service.reject('dp-1', {}, admin)).rejects.toThrow(ConflictException);
    await expect(service.approve('dp-x', {}, admin)).rejects.toThrow(NotFoundException);
    await expect(service.reject('dp-x', {}, admin)).rejects.toThrow(NotFoundException);
  });

  it('reject marca REJECTED sem aplicar e audita', async () => {
    db.state.proposals.push(proposal({ payload: { type: 'MASS', dayOfWeek: 0, time: '10:00' } }));
    const r = await service.reject('dp-1', { note: 'site de 2019' }, admin);
    expect(r.proposal).toMatchObject({ status: 'REJECTED', reviewNote: 'site de 2019', reviewedById: 'u-admin' });
    expect(db.state.schedules).toHaveLength(0);
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'DATA_PROPOSAL_REJECTED', entityId: 'dp-1' }));
  });

  it('bulk aprova uma a uma e pula as que exigem edição', async () => {
    db.state.schedules.push(schedule());
    db.state.proposals.push(proposal({ id: 'dp-ok', payload: { type: 'MASS', dayOfWeek: 0, time: '10:00' } }));
    db.state.proposals.push(proposal({ id: 'dp-upd', kind: 'SCHEDULE_UPDATE', massScheduleId: 'ms-1', payload: {} }));
    db.state.proposals.push(proposal({ id: 'dp-rec', kind: 'SCHEDULE_RECURRENCE', massScheduleId: 'ms-1', payload: null }));
    db.state.proposals.push(proposal({ id: 'dp-bad', payload: { type: 'MASS', dayOfWeek: 9, time: '10:00' } }));

    const { results } = await service.bulk(['dp-ok', 'dp-upd', 'dp-rec', 'dp-bad', 'dp-ok'], 'approve', 'lote conferido', admin);

    expect(results.map((r) => [r.id, r.ok])).toEqual([
      ['dp-ok', true],
      ['dp-upd', false],
      ['dp-rec', false],
      ['dp-bad', false],
    ]);
    expect(results[1].message).toBe(MSG_BULK_NEEDS_EDIT);
    expect(results[3].message).toMatch(/Dia da semana inválido/);
    expect(stored('dp-ok').status).toBe('APPROVED');
    expect(stored('dp-upd').status).toBe('PENDING');
    expect(stored('dp-rec').status).toBe('PENDING');
    expect(stored('dp-bad').status).toBe('PENDING');
    expect(db.state.schedules).toHaveLength(2);
  });

  it('bulk reject rejeita inclusive as que exigiriam edição', async () => {
    db.state.proposals.push(proposal({ id: 'dp-a', kind: 'SCHEDULE_RECURRENCE', massScheduleId: 'ms-1', payload: null }));
    db.state.proposals.push(proposal({ id: 'dp-b', status: 'APPROVED' }));
    const { results } = await service.bulk(['dp-a', 'dp-b'], 'reject', undefined, admin);
    expect(results).toEqual([
      { id: 'dp-a', ok: true, message: 'Proposta rejeitada' },
      { id: 'dp-b', ok: false, message: 'Esta proposta já foi aprovada' },
    ]);
  });

  it('list: status ausente = PENDING; status/kind inválidos → 400', async () => {
    const prisma = { dataProposal: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) } };
    const s = new DataProposalsService(prisma as any, audit as any);
    const r = await s.list({ state: 'rj', pageSize: '999' });
    expect(r).toEqual({ total: 0, page: 1, pageSize: 200, items: [] });
    expect(prisma.dataProposal.findMany.mock.calls[0][0].where).toEqual({ status: 'PENDING', state: 'RJ' });
    await s.list({ status: 'all' });
    expect(prisma.dataProposal.findMany.mock.calls[1][0].where).toEqual({});
    await expect(s.list({ status: 'DONE' })).rejects.toThrow(BadRequestException);
    await expect(s.list({ kind: 'X' })).rejects.toThrow(BadRequestException);
  });

  it('map: bbox inválido → 400', async () => {
    await expect(service.map({ bbox: '1,2,3' })).rejects.toThrow(BadRequestException);
  });
});

describe('DataProposalsController — acesso', () => {
  const ctx = (user: any, handler: any): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
      getHandler: () => handler,
      getClass: () => DataProposalsController,
    }) as unknown as ExecutionContext;

  const guard = new RolesGuard(new Reflector());
  const handlers = ['list', 'summary', 'map', 'approve', 'reject', 'bulk'].map((h) => (DataProposalsController.prototype as any)[h]);

  it('usa JwtAuthGuard + RolesGuard na classe', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, DataProposalsController)).toEqual([JwtAuthGuard, RolesGuard]);
  });

  it.each([UserRole.DIOCESAN_ADMIN, UserRole.PARISH_ADMIN, UserRole.COMMUNITY_COORDINATOR, UserRole.FAITHFUL])(
    '%s → 403 em todas as rotas',
    (role) => {
      for (const h of handlers) expect(guard.canActivate(ctx({ role }, h))).toBe(false);
    },
  );

  it('SYSTEM_ADMIN passa', () => {
    for (const h of handlers) expect(guard.canActivate(ctx({ role: UserRole.SYSTEM_ADMIN }, h))).toBe(true);
  });
});

describe('DTOs', () => {
  const errs = async (cls: any, body: any) =>
    (await validate(plainToInstance(cls, body), { whitelist: true, forbidNonWhitelisted: true })).map((e) => e.property);

  it('bulk: ids 1..200, action approve|reject, sem campo extra', async () => {
    expect(await errs(BulkDataProposalsDto, { ids: ['a'], action: 'approve' })).toEqual([]);
    expect(await errs(BulkDataProposalsDto, { ids: [], action: 'approve' })).toContain('ids');
    expect(await errs(BulkDataProposalsDto, { ids: Array.from({ length: 201 }, (_, i) => `x${i}`), action: 'reject' })).toContain('ids');
    expect(await errs(BulkDataProposalsDto, { ids: ['a'], action: 'delete' })).toContain('action');
    expect(await errs(BulkDataProposalsDto, { ids: ['a'], action: 'approve', payload: {} })).toContain('payload');
  });

  it('approve: payload tem de ser objeto', async () => {
    expect(await errs(ApproveDataProposalDto, { payload: { time: '10:00' }, note: ' ok ' })).toEqual([]);
    expect(await errs(ApproveDataProposalDto, { payload: 'x' })).toContain('payload');
    expect(await errs(ApproveDataProposalDto, { status: 'APPROVED' })).toContain('status');
  });

  it('kinds do contrato existem no enum', () => {
    expect(Object.values(DataProposalKind)).toEqual([
      'SCHEDULE_CREATE',
      'SCHEDULE_UPDATE',
      'SCHEDULE_DELETE',
      'SCHEDULE_RECURRENCE',
      'COMMUNITY_ADDRESS',
      'COMMUNITY_PARISH',
      'COMMUNITY_CREATE',
      'COMMUNITY_WEBSITE',
      'PARISH_WEBSITE',
    ]);
  });
});
