import { isResponsiblePlaceholder, phoneDigitVariants, pickAdoptionCandidate } from './phone-adoption';

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

  it('vários → só o "Responsável –" único; dois responsáveis ou nenhum → ambíguo', () => {
    expect(pickAdoptionCandidate([person('a'), resp('b')])).toMatchObject({ member: { id: 'b' }, reason: 'responsible' });
    expect(pickAdoptionCandidate([resp('a'), resp('b')])).toMatchObject({ member: null, reason: 'ambiguous', count: 2 });
    expect(pickAdoptionCandidate([person('a'), person('b')])).toMatchObject({ member: null, reason: 'ambiguous' });
  });

  it('com comunidade: prefere os de lá; sem nenhum lá, olha os demais (cadastro)', () => {
    expect(pickAdoptionCandidate([person('a', 'c2'), person('b', 'c1')], { communityId: 'c1' })).toMatchObject({
      member: { id: 'b' },
    });
    expect(pickAdoptionCandidate([person('a', 'c2')], { communityId: 'c1' })).toMatchObject({ member: { id: 'a' } });
  });

  it('onlyCommunity (escolha de comunidade no app): só os daquela comunidade', () => {
    expect(pickAdoptionCandidate([resp('a', 'c2')], { communityId: 'c1', onlyCommunity: true })).toMatchObject({
      member: null,
      reason: 'none',
    });
  });
});
