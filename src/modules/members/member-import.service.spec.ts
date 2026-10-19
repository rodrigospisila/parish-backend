import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Gender, UserRole } from '@prisma/client';
import { MemberImportService, fillEmptyFields } from './member-import.service';
import { parseImportDate, parseImportRow } from './member-import';
import { isValidCnpj, isValidCpf } from './br-documents';

const NOW = new Date('2026-10-19T15:00:00Z');
const VALID_CPF = '529.982.247-25';
const VALID_CPF_DIGITS = '52998224725';
const OTHER_VALID_CPF = '111.444.777-35';

describe('member-import — regras puras', () => {
  it('datas: dd/mm/aaaa, AAAA-MM-DD, dd/mm (sem ano → 1900) e inválidas', () => {
    expect(parseImportDate('05/03/1980', { now: NOW })).toEqual({
      date: new Date(Date.UTC(1980, 2, 5)),
      yearUnknown: false,
    });
    expect(parseImportDate('1980-03-05', { now: NOW })).toEqual({
      date: new Date(Date.UTC(1980, 2, 5)),
      yearUnknown: false,
    });
    expect(parseImportDate('5/3', { now: NOW })).toEqual({ date: new Date(Date.UTC(1900, 2, 5)), yearUnknown: true });
    expect(parseImportDate('05/03/85', { now: NOW })).toEqual({
      date: new Date(Date.UTC(1985, 2, 5)),
      yearUnknown: false,
    });
    expect(parseImportDate('05/03/12', { now: NOW })).toMatchObject({ date: new Date(Date.UTC(2012, 2, 5)) });
    expect(parseImportDate('31/02/2020', { now: NOW })).toBe('invalid');
    expect(parseImportDate('01/01/2030', { now: NOW })).toBe('invalid'); // futura
    expect(parseImportDate('ontem', { now: NOW })).toBe('invalid');
    expect(parseImportDate('5/3', { now: NOW, allowNoYear: false })).toBe('invalid');
    expect(parseImportDate('  ', { now: NOW })).toBeNull();
  });

  it('CPF e CNPJ com dígito verificador', () => {
    expect(isValidCpf(VALID_CPF)).toBe(true);
    expect(isValidCpf('529.982.247-26')).toBe(false);
    expect(isValidCpf('111.111.111-11')).toBe(false);
    expect(isValidCpf('123')).toBe(false);
    expect(isValidCnpj('11.222.333/0001-81')).toBe(true);
    expect(isValidCnpj('11.222.333/0001-82')).toBe(false);
    expect(isValidCnpj('00.000.000/0000-00')).toBe(false);
  });

  it('linha: apelidos de coluna, telefone em E.164, CPF inválido é erro DA LINHA', () => {
    const ok = parseImportRow(
      { Nome: '  José  da Silva ', Telefone: '(42) 99999-1234', 'Data de nascimento': '12/05', Sexo: 'M', CPF: VALID_CPF },
      1,
      'MEMBERS',
      NOW,
    );
    expect(ok.errors).toEqual([]);
    expect(ok.data).toMatchObject({
      fullName: 'José da Silva',
      phone: '+5542999991234',
      cpf: VALID_CPF_DIGITS,
      gender: Gender.MALE,
      birthDate: new Date(Date.UTC(1900, 4, 12)),
    });
    expect(ok.birthYearUnknown).toBe(true);
    expect(ok.nameKey).toBe('jose da silva');

    const bad = parseImportRow({ fullName: 'Ana Souza', cpf: '123.456.789-00', email: 'x@' }, 2, 'MEMBERS', NOW);
    expect(bad.errors).toEqual(expect.arrayContaining(['CPF inválido (confira os dígitos)', 'E-mail inválido']));
    expect(parseImportRow({ email: 'a@b.com' }, 3, 'MEMBERS', NOW).errors).toContain('Nome ausente');
  });

  it('mesclar só preenche campos vazios', () => {
    const fill = fillEmptyFields(
      { phone: '+5542988887777', email: null, city: '' } as any,
      { fullName: 'X', phone: '+5542999991234', email: 'a@b.com', city: 'Imbituva' } as any,
    );
    expect(fill).toEqual({ email: 'a@b.com', city: 'Imbituva' });
  });
});

describe('MemberImportService', () => {
  const parishAdmin = { id: 'u-adm', role: UserRole.PARISH_ADMIN, parishId: 'p1', dioceseId: 'd1' } as any;
  const coordinator = { id: 'u-coord', role: UserRole.COMMUNITY_COORDINATOR, parishId: 'p1', communityId: 'c1' } as any;

  let prisma: any;
  let tx: any;
  let hierarchy: any;
  let audit: any;
  let members: any;
  let planAccess: any;
  let service: MemberImportService;
  let candidates: any[];
  let globalCpfs: string[];

  const candidate = (over: Partial<any>) => ({
    id: 'm-x',
    communityId: 'c1',
    community: { name: 'Matriz' },
    tither: null,
    fullName: 'Fulano',
    cpf: null,
    rg: null,
    email: null,
    phone: null,
    birthDate: null,
    gender: null,
    notes: null,
    zipCode: null,
    street: null,
    number: null,
    complement: null,
    neighborhood: null,
    city: null,
    state: null,
    fatherName: null,
    motherName: null,
    ...over,
  });

  beforeEach(() => {
    candidates = [];
    globalCpfs = [];
    let seq = 0;
    tx = {
      member: {
        create: jest.fn(async () => ({ id: `m-new-${++seq}` })),
        update: jest.fn(async ({ where }: any) => ({ id: where.id })),
      },
      tither: { create: jest.fn(), upsert: jest.fn() },
    };
    prisma = {
      community: {
        findFirst: jest.fn(async ({ where }: any) => ({ id: where.id, name: 'Matriz', parishId: 'p1' })),
      },
      $queryRaw: jest.fn(async () => candidates.map((c) => ({ id: c.id }))),
      member: {
        findMany: jest.fn(async ({ where }: any) => {
          if (where.cpf) return globalCpfs.map((cpf) => ({ cpf }));
          return candidates;
        }),
      },
      tither: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn(async (fn: any) => fn(tx)),
    };
    hierarchy = {
      applyMemberFilter: jest.fn().mockReturnValue({ community: { parishId: 'p1' } }),
      getCommunityScopeIds: jest.fn().mockResolvedValue(['c1']),
    };
    audit = { log: jest.fn() };
    members = { canManageMembersIn: jest.fn().mockResolvedValue(true) };
    planAccess = { enforcement: jest.fn().mockReturnValue('log'), memberLimitStatus: jest.fn().mockResolvedValue(null) };
    service = new MemberImportService(prisma, hierarchy, audit, members, planAccess);
  });

  it('dryRun: prévia por linha, nada gravado nem auditado', async () => {
    const res = await service.run(
      {
        communityId: 'c1',
        dryRun: true,
        rows: [
          { fullName: 'Maria Souza', phone: '42 99999-0000', birthDate: '1980-01-02' },
          { fullName: 'João Lima', cpf: '123.456.789-00' },
        ],
      },
      parishAdmin,
    );
    expect(res.dryRun).toBe(true);
    expect(res.rows[0]).toMatchObject({
      line: 1,
      status: 'OK',
      action: 'CREATE',
      normalized: { phone: '+5542999990000', birthDate: '02/01/1980' },
    });
    expect(res.rows[1]).toMatchObject({ line: 2, status: 'ERROR', action: null });
    expect(res.rows[1].errors).toContain('CPF inválido (confira os dígitos)');
    expect(res).toMatchObject({ total: 2, created: 1, failed: 1, imported: 1 });
    expect(res.errors).toEqual([{ line: 2, reason: 'CPF inválido (confira os dígitos)' }]);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('duplicados prováveis: CPF, nome sem acento + nascimento (fortes) e telefone de outro nome (fraco)', async () => {
    candidates = [
      candidate({ id: 'm-cpf', fullName: 'Carlos Pereira', cpf: VALID_CPF_DIGITS }),
      candidate({ id: 'm-nb', fullName: 'José Antônio', birthDate: new Date(Date.UTC(1975, 6, 20)) }),
      candidate({ id: 'm-tel', fullName: 'Rita Gomes', phone: '+5542988887777' }),
    ];
    const res = await service.run(
      {
        communityId: 'c1',
        dryRun: true,
        rows: [
          { fullName: 'Carlos P.', cpf: VALID_CPF },
          { fullName: 'JOSE ANTONIO', birthDate: '20/07/1975' },
          { fullName: 'Pedro Gomes', phone: '(42) 98888-7777' },
          { fullName: 'Rita Gomes', phone: '42988887777' },
        ],
      },
      parishAdmin,
    );
    expect(res.rows[0]).toMatchObject({ status: 'DUPLICATE', action: 'SKIP', duplicate: { memberId: 'm-cpf', reasons: ['CPF'], strong: true } });
    expect(res.rows[1]).toMatchObject({ status: 'DUPLICATE', action: 'SKIP', duplicate: { memberId: 'm-nb', reasons: ['NAME_BIRTH'] } });
    // Mesmo celular, outro nome: provável familiar → cadastro novo, mas sinalizado
    expect(res.rows[2]).toMatchObject({ status: 'DUPLICATE', action: 'CREATE', duplicate: { memberId: 'm-tel', strong: false } });
    expect(res.rows[3]).toMatchObject({ status: 'DUPLICATE', action: 'SKIP', duplicate: { memberId: 'm-tel', strong: true } });
    expect(res).toMatchObject({ skipped: 3, created: 1 });
  });

  it('linha repetida na planilha e CPF de fora do escopo viram erro (sem revelar onde)', async () => {
    globalCpfs = [OTHER_VALID_CPF.replace(/\D/g, '')];
    const res = await service.run(
      {
        communityId: 'c1',
        dryRun: true,
        rows: [
          { fullName: 'Ana Clara', birthDate: '01/02/2010' },
          { fullName: 'Ana  Clára', birthDate: '2010-02-01' },
          { fullName: 'Bruno Dias', cpf: OTHER_VALID_CPF },
        ],
      },
      parishAdmin,
    );
    expect(res.rows[1].errors).toEqual(['Repetida na planilha (mesma pessoa da linha 1)']);
    expect(res.rows[2].status).toBe('ERROR');
    expect(res.rows[2].errors[0]).toMatch(/procure a secretaria/);
    expect(res.rows[2].errors[0]).not.toMatch(/paróquia de|cadastrad[oa] em/);
  });

  it('rowActions: CREATE em cima de CPF existente é erro; UPDATE de membro fora da gestão do coordenador é erro', async () => {
    candidates = [
      candidate({ id: 'm-cpf', fullName: 'Carlos', cpf: VALID_CPF_DIGITS }),
      candidate({ id: 'm-out', fullName: 'Dora Lins', communityId: 'c-outra', birthDate: new Date(Date.UTC(1990, 0, 1)) }),
    ];
    const res = await service.run(
      {
        communityId: 'c1',
        dryRun: true,
        rows: [
          { fullName: 'Carlos', cpf: VALID_CPF },
          { fullName: 'Dora Lins', birthDate: '01/01/1990' },
        ],
        rowActions: { '1': 'CREATE', '2': 'UPDATE' },
      },
      coordinator,
    );
    expect(res.rows[0].errors[0]).toMatch(/CPF já cadastrado para Carlos/);
    expect(res.rows[1].errors[0]).toMatch(/fora da sua gestão/);
  });

  it('ação inválida em rowActions → 400', async () => {
    await expect(
      service.run({ communityId: 'c1', rows: [], rowActions: { '1': 'APAGAR' as any } }, parishAdmin),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('grava: cria membro com vínculo principal, telefone E.164 e nascimento sem ano; audita', async () => {
    const res = await service.run(
      { communityId: 'c1', rows: [{ nome: 'Lúcia Prado', celular: '42999991111', nascimento: '15/08' }] },
      parishAdmin,
    );
    expect(tx.member.create).toHaveBeenCalledTimes(1);
    const data = tx.member.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      fullName: 'Lúcia Prado',
      phone: '+5542999991111',
      birthDate: new Date(Date.UTC(1900, 7, 15)),
      communityId: 'c1',
      status: 'ACTIVE',
      communityLinks: { create: { communityId: 'c1', isPrimary: true } },
    });
    expect(tx.tither.create).not.toHaveBeenCalled();
    expect(res.rows[0]).toMatchObject({ status: 'OK', action: 'CREATE', memberId: 'm-new-1' });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', entity: 'Member', metadata: expect.objectContaining({ bulkImport: true, kind: 'MEMBERS', created: 1 }) }),
    );
  });

  it('TITHERS: novo vira membro + Tither; duplicado forte vira UPDATE (só vazios) + upsert do Tither', async () => {
    candidates = [
      candidate({
        id: 'm-old',
        fullName: 'Paulo Reis',
        cpf: VALID_CPF_DIGITS,
        phone: '+5542911112222',
        tither: { id: 't1', registrationNumber: '10', status: 'INACTIVE' },
      }),
    ];
    const res = await service.run(
      {
        kind: 'TITHERS',
        communityId: 'c1',
        rows: [
          { fullName: 'Marta Reis', registrationNumber: '77', joinedAt: '01/03/2020' },
          { fullName: 'Paulo Reis', cpf: VALID_CPF, phone: '42933334444', email: 'paulo@x.com', registrationNumber: '12' },
        ],
      },
      parishAdmin,
    );
    expect(tx.tither.create).toHaveBeenCalledWith({
      data: { memberId: 'm-new-1', registrationNumber: '77', joinedAt: new Date(Date.UTC(2020, 2, 1)) },
    });
    // Mesclar: o telefone que já existe fica; o e-mail vazio é preenchido
    expect(tx.member.update).toHaveBeenCalledWith({
      where: { id: 'm-old' },
      data: { email: 'paulo@x.com' },
      select: { id: true },
    });
    expect(tx.tither.upsert).toHaveBeenCalledWith({
      where: { memberId: 'm-old' },
      create: { memberId: 'm-old', registrationNumber: '12' },
      update: { status: 'ACTIVE', registrationNumber: '12' },
    });
    expect(res.rows[1]).toMatchObject({ action: 'UPDATE', memberId: 'm-old' });
    expect(res.rows[1].warnings).toContain('Nº de dizimista muda de 10 para 12');
    expect(res).toMatchObject({ created: 1, updated: 1 });
  });

  it('bloco que falha vira erro nas suas linhas, sem derrubar a importação', async () => {
    prisma.$transaction.mockRejectedValueOnce(new Error('P2002'));
    const res = await service.run({ communityId: 'c1', rows: [{ fullName: 'Teste Um' }] }, parishAdmin);
    expect(res.rows[0].status).toBe('ERROR');
    expect(res.failed).toBe(1);
    expect(res.created).toBe(0);
  });

  it('limite da faixa: PLAN_ENFORCEMENT=on recusa o lote que passaria; log só avisa', async () => {
    planAccess.memberLimitStatus.mockResolvedValue({ communityId: 'c1', maxMembers: 2, activeMembers: 1, reached: false });
    const rows = [{ fullName: 'Pessoa Um' }, { fullName: 'Pessoa Dois' }];

    const preview = await service.run({ communityId: 'c1', rows, dryRun: true }, parishAdmin);
    expect(preview.memberLimit).toEqual({ maxMembers: 2, activeMembers: 1, afterImport: 3, exceeds: true });

    await expect(service.run({ communityId: 'c1', rows }, parishAdmin)).resolves.toMatchObject({ created: 2 });

    planAccess.enforcement.mockReturnValue('on');
    await expect(service.run({ communityId: 'c1', rows }, parishAdmin)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('comunidade fora da gestão → 403; mais de 2.000 linhas → 400', async () => {
    members.canManageMembersIn.mockResolvedValue(false);
    await expect(service.run({ communityId: 'c9', rows: [{ fullName: 'Zeca' }] }, parishAdmin)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    const many = Array.from({ length: 2001 }, (_, i) => ({ fullName: `P ${i}` }));
    await expect(service.run({ communityId: 'c1', rows: many }, parishAdmin)).rejects.toBeInstanceOf(BadRequestException);
  });
});
