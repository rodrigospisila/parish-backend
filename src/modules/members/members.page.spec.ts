import { BadRequestException } from '@nestjs/common';
import { MemberStatus, UserRole } from '@prisma/client';
import { MembersService } from './members.service';
import { parsePaging } from '../communities/list-paging';

/** GET /members?page= (C5 / ux-web-04): paginação, busca sem acento e `access` por item. */
describe('MembersService.findPage', () => {
  const parishAdmin = { id: 'u-adm', role: UserRole.PARISH_ADMIN, parishId: 'p1', dioceseId: 'd1' } as any;
  let prisma: any;
  let hierarchy: any;
  let service: MembersService;

  beforeEach(() => {
    prisma = {
      member: {
        count: jest.fn().mockResolvedValue(3),
        findMany: jest.fn().mockResolvedValue([
          { id: 'm1', fullName: 'Ana', userId: 'u1', status: MemberStatus.ACTIVE },
          { id: 'm2', fullName: 'Bia', userId: null, status: MemberStatus.ACTIVE },
          { id: 'm3', fullName: 'Caio', userId: null, status: MemberStatus.ACTIVE },
          { id: 'm4', fullName: 'Anônimo', userId: 'u4', status: MemberStatus.ANONYMIZED },
        ]),
      },
      userInvite: {
        findMany: jest.fn().mockResolvedValue([
          { memberId: 'm2', createdAt: new Date('2026-10-01T10:00:00Z'), lastSentAt: new Date('2026-10-10T10:00:00Z') },
        ]),
      },
      // COUNT da busca → { total }; página da busca → ids
      $queryRaw: jest.fn(async (sql: any) =>
        sql.sql.includes('COUNT(*)') ? [{ total: 2 }] : [{ id: 'm1' }, { id: 'm2' }],
      ),
    };
    hierarchy = {
      applyMemberFilter: jest.fn().mockReturnValue({ community: { parishId: 'p1' } }),
      getCommunityScopeIds: jest.fn().mockResolvedValue(['c1']),
    };
    service = new MembersService(prisma, hierarchy, { log: jest.fn() } as any);
  });

  it('pagina com escopo + filtros em AND e devolve access ACTIVE/INVITED/NONE em lote', async () => {
    const res = await service.findPage(parishAdmin, parsePaging('2', '10')!, { communityId: 'c1', status: MemberStatus.ACTIVE });
    expect(res).toMatchObject({ total: 3, page: 2, pageSize: 10 });
    const args = prisma.member.findMany.mock.calls[0][0];
    expect(args.skip).toBe(10);
    expect(args.take).toBe(10);
    expect(args.where.AND).toEqual(
      expect.arrayContaining([
        { community: { parishId: 'p1' } },
        { deletedAt: null },
        { status: MemberStatus.ACTIVE },
        { OR: [{ communityId: 'c1' }, { communityLinks: { some: { communityId: 'c1', isActive: true } } }] },
      ]),
    );
    const access = Object.fromEntries(res.items.map((item: any) => [item.id, item.access]));
    expect(access.m1).toEqual({ state: 'ACTIVE' });
    expect(access.m2).toEqual({ state: 'INVITED', invitedAt: new Date('2026-10-10T10:00:00Z') });
    expect(access.m3).toEqual({ state: 'NONE' });
    // Anonimizado nunca mostra a conta (revisão #24)
    expect(access.m4).toEqual({ state: 'NONE' });
    expect(res.items.find((i: any) => i.id === 'm4').userId).toBeNull();
    // Uma consulta de convites para a página inteira (sem N+1), só pendentes
    expect(prisma.userInvite.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.userInvite.findMany.mock.calls[0][0].where).toMatchObject({
      memberId: { in: ['m2', 'm3', 'm4'] },
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: expect.any(Date) },
    });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('busca sem acento: ids pelo SQL (escopo da paróquia) e o filtro do Prisma reaplicado', async () => {
    await service.findPage(parishAdmin, parsePaging('1', undefined, 'José (42) 9999')!);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    const sql = prisma.$queryRaw.mock.calls.find(([q]: any) => !q.sql.includes('COUNT(*)'))[0];
    expect(sql.sql).toContain('translate(lower(');
    expect(sql.sql).toContain(`regexp_replace(COALESCE(m.phone, '')`);
    expect(sql.values).toEqual(expect.arrayContaining(['p1', '%jose (42) 9999%', '%429999%']));
    const where = prisma.member.findMany.mock.calls[0][0].where;
    expect(where.AND).toEqual(expect.arrayContaining([{ community: { parishId: 'p1' } }, { id: { in: ['m1', 'm2'] } }]));
  });

  it('S20: busca com muitos resultados — total real (COUNT separado), ORDER BY estável e LIMIT/OFFSET no SQL', async () => {
    prisma.$queryRaw.mockImplementation(async (sql: any) =>
      sql.sql.includes('COUNT(*)') ? [{ total: 12345 }] : [{ id: 'm41' }, { id: 'm42' }],
    );
    const res = await service.findPage(parishAdmin, parsePaging('3', '20', 'silva')!, {
      communityId: 'c1',
      status: MemberStatus.ACTIVE,
    });
    expect(res.total).toBe(12345);
    expect(res).not.toHaveProperty('truncated');
    expect(prisma.member.count).not.toHaveBeenCalled();

    const [countSql] = prisma.$queryRaw.mock.calls.find(([q]: any) => q.sql.includes('COUNT(*)'));
    const [pageSql] = prisma.$queryRaw.mock.calls.find(([q]: any) => !q.sql.includes('COUNT(*)'));
    expect(pageSql.sql).toMatch(/ORDER BY m\."fullName" ASC, m\.id ASC\s+LIMIT \? OFFSET \?/);
    expect(pageSql.sql).not.toContain('5000');
    expect(pageSql.values.slice(-2)).toEqual([20, 40]);
    // Mesmo recorte no COUNT e na página: escopo + comunidade + situação + termo
    for (const q of [countSql, pageSql]) {
      expect(q.sql).toContain('member_communities mc');
      expect(q.sql).toContain('m.status::text = ');
      expect(q.values).toEqual(expect.arrayContaining(['p1', 'c1', 'ACTIVE', '%silva%']));
    }
    // A página já veio do SQL: o Prisma só reaplica o escopo, sem pular de novo
    const args = prisma.member.findMany.mock.calls[0][0];
    expect(args.skip).toBe(0);
    expect(args.take).toBe(20);
    expect(args.where.AND).toEqual(expect.arrayContaining([{ community: { parishId: 'p1' } }, { id: { in: ['m41', 'm42'] } }]));
    expect(args.orderBy).toEqual([{ fullName: 'asc' }, { id: 'asc' }]);
  });

  it('S20: página além do fim mantém o total real', async () => {
    prisma.$queryRaw.mockImplementation(async (sql: any) => (sql.sql.includes('COUNT(*)') ? [{ total: 7 }] : []));
    await expect(service.findPage(parishAdmin, parsePaging('9', '20', 'ana')!)).resolves.toEqual({
      items: [],
      total: 7,
      page: 9,
      pageSize: 20,
    });
    expect(prisma.member.findMany).not.toHaveBeenCalled();
  });

  it('busca sem resultado e escopo impossível → página vazia sem consultar a lista', async () => {
    prisma.$queryRaw.mockResolvedValue([]);
    await expect(service.findPage(parishAdmin, parsePaging('1', undefined, 'zzz')!)).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
    hierarchy.applyMemberFilter.mockReturnValue({ id: '__none__' });
    await expect(
      service.findPage({ id: 'u', role: UserRole.PARISH_ADMIN } as any, parsePaging('1')!),
    ).resolves.toMatchObject({ total: 0 });
    expect(prisma.member.findMany).not.toHaveBeenCalled();
  });

  it('fiel/voluntário: colunas básicas, sem userId na resposta', async () => {
    const faithful = { id: 'u-f', role: UserRole.FAITHFUL, communityId: 'c1', member: { id: 'm1' } } as any;
    hierarchy.applyMemberFilter.mockReturnValue({ OR: [{ id: 'm1' }, { responsibleId: 'm1' }] });
    const res = await service.findPage(faithful, parsePaging('1')!);
    expect(prisma.member.findMany.mock.calls[0][0].select).toMatchObject({ id: true, fullName: true, userId: true });
    expect(res.items[0]).not.toHaveProperty('userId');
    expect(res.items[0].access).toEqual({ state: 'ACTIVE' });
  });

  it('status inválido → 400', async () => {
    await expect(service.findPage(parishAdmin, parsePaging('1')!, { status: 'XYZ' as any })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('check-duplicates: telefone em E.164 casa com o digitado sem 55; mesmo CPF com outro nome', async () => {
    prisma.member.findMany.mockResolvedValue([
      { id: 'a', fullName: 'Maria Souza', birthDate: null, phone: '+5542999990000', cpf: null, community: { id: 'c1', name: 'Matriz' } },
      { id: 'b', fullName: 'M. de Souza', birthDate: null, phone: null, cpf: '52998224725', community: { id: 'c1', name: 'Matriz' } },
    ]);
    const res = await service.findPotentialDuplicates(
      { fullName: 'MARIA SOUZA', phone: '(42) 99999-0000', cpf: '529.982.247-25' },
      parishAdmin,
    );
    expect(res.find((r) => r.id === 'a')!.reasons).toContain('mesmo nome e telefone');
    expect(res.find((r) => r.id === 'b')!.reasons).toEqual(['mesmo CPF']);
  });
});
