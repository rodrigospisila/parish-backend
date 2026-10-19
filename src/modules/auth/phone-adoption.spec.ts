import {
  adoptMember,
  buildAdoptionData,
  findAdoptionCandidates,
  isKnownMinor,
  isResponsiblePlaceholder,
  phoneDigitVariants,
  pickAdoptionCandidate,
} from './phone-adoption';

/** ux-acesso-01: quem a conta nova adota pelo telefone verificado. */
describe('phone-adoption — escolha do membro a adotar', () => {
  const resp = (id: string, communityId = 'c1') => ({ id, fullName: `Responsável – Filho ${id}`, communityId });
  const person = (id: string, communityId = 'c1') => ({ id, fullName: `Pessoa ${id}`, communityId });

  it('reconhece o "Responsável –" da importação (com/sem acento, hífen ou travessão)', () => {
    expect(isResponsiblePlaceholder('Responsável – Ana')).toBe(true);
    expect(isResponsiblePlaceholder('Responsavel - Ana')).toBe(true);
    expect(isResponsiblePlaceholder('responsável — Ana')).toBe(true);
    expect(isResponsiblePlaceholder('Responsável Ana')).toBe(false);
    expect(isResponsiblePlaceholder('Ana Responsável – x')).toBe(false);
  });

  it('dígitos com e sem o 55; número curto não busca', () => {
    expect(phoneDigitVariants('+5542999998883')).toEqual({ digits: '5542999998883', local: '42999998883' });
    expect(phoneDigitVariants('(42) 9999-8888')).toEqual({ digits: '4299998888', local: '4299998888' });
    expect(phoneDigitVariants('99998888')).toBeNull();
  });

  it('nenhum candidato → ninguém', () => {
    expect(pickAdoptionCandidate([])).toEqual({ member: null, reason: 'none', count: 0 });
  });

  it('candidato único → adota (mesmo sem o prefixo)', () => {
    expect(pickAdoptionCandidate([person('a')])).toMatchObject({ member: { id: 'a' }, reason: 'single' });
  });

  it('com comunidade, vários → só o "Responsável –" único; dois responsáveis ou nenhum → ambíguo', () => {
    const opts = { communityId: 'c1' };
    expect(pickAdoptionCandidate([person('a'), resp('b')], opts)).toMatchObject({ member: { id: 'b' }, reason: 'responsible' });
    expect(pickAdoptionCandidate([resp('a'), resp('b')], opts)).toMatchObject({ member: null, reason: 'ambiguous', count: 2 });
    expect(pickAdoptionCandidate([person('a'), person('b')], opts)).toMatchObject({ member: null, reason: 'ambiguous' });
  });

  it('R11: sem comunidade, só o candidato ÚNICO — vários (mesmo com um "Responsável –") → ninguém', () => {
    expect(pickAdoptionCandidate([resp('a')])).toMatchObject({ member: { id: 'a' }, reason: 'single' });
    expect(pickAdoptionCandidate([person('a'), resp('b')])).toMatchObject({ member: null, reason: 'ambiguous', count: 2 });
  });

  it('R11: comunidade escolhida sem candidato lá → os de fora só se houver um único', () => {
    expect(pickAdoptionCandidate([person('a', 'c2'), resp('b', 'c3')], { communityId: 'c1' })).toMatchObject({
      member: null,
      reason: 'ambiguous',
    });
  });

  it('com comunidade: prefere os de lá; sem nenhum lá, olha os demais (cadastro)', () => {
    expect(pickAdoptionCandidate([person('a', 'c2'), person('b', 'c1')], { communityId: 'c1' })).toMatchObject({
      member: { id: 'b' },
    });
    expect(pickAdoptionCandidate([person('a', 'c2')], { communityId: 'c1' })).toMatchObject({ member: { id: 'a' } });
  });

  describe('R11: dependentes e menores nunca são adotados', () => {
    const now = new Date('2026-10-19T12:00:00Z');
    const child = (id: string, extra: Record<string, unknown>) => ({ ...person(id), ...extra });

    it('dependente (responsibleId) sai da escolha; o "Responsável –" do mesmo celular fica único', () => {
      const decision = pickAdoptionCandidate([child('filho', { responsibleId: 'r' }), resp('r')], { now });
      expect(decision).toMatchObject({ member: { id: 'r' }, reason: 'single' });
      expect(pickAdoptionCandidate([child('filho', { responsibleId: 'r' })], { now })).toMatchObject({ member: null, reason: 'none' });
    });

    it('menor de 18 pela data de nascimento sai; adulto e data sem ano (1900) ficam', () => {
      expect(pickAdoptionCandidate([child('m', { birthDate: new Date('2012-03-01T12:00:00Z') })], { now })).toMatchObject({
        member: null,
      });
      expect(pickAdoptionCandidate([child('a', { birthDate: new Date('1980-03-01T12:00:00Z') })], { now })).toMatchObject({
        member: { id: 'a' },
      });
      expect(pickAdoptionCandidate([child('x', { birthDate: new Date('1900-03-01T12:00:00Z') })], { now })).toMatchObject({
        member: { id: 'x' },
      });
    });

    it('isKnownMinor: 18 anos completos hoje é adulto; um dia antes, menor; sem data ou ano 1900 → desconhecido', () => {
      expect(isKnownMinor(new Date('2008-10-19T00:00:00Z'), now)).toBe(false);
      expect(isKnownMinor(new Date('2008-10-20T00:00:00Z'), now)).toBe(true);
      expect(isKnownMinor('2010-05-05', now)).toBe(true);
      expect(isKnownMinor(null, now)).toBe(false);
      expect(isKnownMinor(new Date('1900-12-25T00:00:00Z'), now)).toBe(false);
      expect(isKnownMinor('data-ruim', now)).toBe(false);
    });

    it('a consulta já filtra dependentes e menores no banco', async () => {
      const tx = { $queryRaw: jest.fn().mockResolvedValue([]) };
      await findAdoptionCandidates(tx, '+5542999998883');
      const sql = (tx.$queryRaw.mock.calls[0][0] as TemplateStringsArray).join('?');
      expect(sql).toContain('m."responsibleId" IS NULL');
      expect(sql).toContain("INTERVAL '18 years'");
      expect(sql).toContain('<= 1900');
    });
  });

  describe('R11: o que a adoção grava', () => {
    const account = { userId: 'u1', fullName: 'Ana Lima', email: 'ana@x.com', phone: '+5542999998883' };

    it('"Responsável –" sem e-mail: assume o nome real e o e-mail; telefone já gravado fica', () => {
      expect(buildAdoptionData({ fullName: 'Responsável – Lucas', email: null, phone: '(42) 99999-8883' }, account)).toEqual({
        userId: 'u1',
        fullName: 'Ana Lima',
        email: 'ana@x.com',
      });
    });

    it('cadastro de outra pessoa: nada além do userId (nome, e-mail e telefone existentes ficam)', () => {
      expect(
        buildAdoptionData({ fullName: 'Joaquim Lima', email: 'joaquim@x.com', phone: '(42) 99999-8883' }, account),
      ).toEqual({ userId: 'u1' });
    });

    it('campo vazio (ou só espaços) é preenchido; o nome de outra pessoa nunca', () => {
      expect(buildAdoptionData({ fullName: 'Joaquim Lima', email: '  ', phone: null }, account)).toEqual({
        userId: 'u1',
        email: 'ana@x.com',
        phone: '+5542999998883',
      });
    });

    it('adoptMember: lê o cadastro e grava condicionalmente (sem conta e como foi lido)', async () => {
      const tx = {
        member: {
          findFirst: jest.fn().mockResolvedValue({ fullName: 'Responsável – Lucas', email: null, phone: '(42) 99999-8883' }),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      };
      await expect(adoptMember(tx, 'm1', account)).resolves.toBe(true);
      expect(tx.member.updateMany).toHaveBeenCalledWith({
        where: { id: 'm1', userId: null, deletedAt: null, fullName: 'Responsável – Lucas', email: null, phone: '(42) 99999-8883' },
        data: { userId: 'u1', fullName: 'Ana Lima', email: 'ana@x.com' },
      });
    });

    it('adoptMember: membro já adotado (não encontrado sem conta) → false, sem gravar', async () => {
      const tx = { member: { findFirst: jest.fn().mockResolvedValue(null), updateMany: jest.fn() } };
      await expect(adoptMember(tx, 'm1', account)).resolves.toBe(false);
      expect(tx.member.updateMany).not.toHaveBeenCalled();
    });
  });

  it('onlyCommunity (escolha de comunidade no app): só os daquela comunidade', () => {
    expect(pickAdoptionCandidate([resp('a', 'c2')], { communityId: 'c1', onlyCommunity: true })).toMatchObject({
      member: null,
      reason: 'none',
    });
  });
});
