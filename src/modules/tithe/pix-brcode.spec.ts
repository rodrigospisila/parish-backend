import { buildPixBrCode, crc16Ccitt, normalizeAscii, normalizePixKey, normalizeTxid, validatePixKey } from './pix-brcode';

describe('Pix BR Code (copia e cola)', () => {
  it('reproduz o exemplo oficial do Manual do BCB (chave aleatória, R$ 1,00, txid ***)', () => {
    const payload = buildPixBrCode({
      key: '123e4567-e12b-12d1-a456-426655440000',
      merchantName: 'Fulano de Tal',
      merchantCity: 'BRASILIA',
      amount: 1,
      txid: '***',
    });
    expect(payload).toBe(
      '00020126580014BR.GOV.BCB.PIX0136123e4567-e12b-12d1-a456-42665544000052040000530398654041.005802BR5913Fulano de Tal6008BRASILIA62070503***630451B8',
    );
  });

  it('CRC-16/CCITT-FALSE bate com o vetor conhecido', () => {
    expect(crc16Ccitt('123456789')).toBe('29B1');
  });

  it('normaliza nome/cidade para ASCII dentro dos limites do padrão', () => {
    expect(normalizeAscii('Paróquia São José — Matriz', 25)).toBe('Paroquia Sao Jose Matriz');
    expect(normalizeAscii('Ponta Grossa', 15)).toBe('Ponta Grossa');
    expect(normalizeAscii('Cidade Com Nome Muito Longo', 15)).toHaveLength(15);
  });

  it('txid aceita só alfanuméricos até 25 e cai em *** quando vazio', () => {
    expect(normalizeTxid('TX-2026_08:abc')).toBe('TX202608abc');
    expect(normalizeTxid('')).toBe('***');
    expect(normalizeTxid('A'.repeat(40))).toHaveLength(25);
  });

  it('inclui o valor com duas casas e a descrição quando informados', () => {
    const payload = buildPixBrCode({
      key: 'paroquia@exemplo.org',
      merchantName: 'Paroquia Exemplo',
      merchantCity: 'CURITIBA',
      amount: 150.5,
      txid: 'PARTX123',
      description: 'Dizimo 2026-08',
    });
    expect(payload).toContain('5406150.50');
    expect(payload).toContain('0214Dizimo 2026-08');
    expect(payload).toContain('62120508PARTX123');
    // o CRC fecha o payload (4 hexa após 6304)
    expect(payload.slice(-8, -4)).toBe('6304');
    expect(payload.slice(-4)).toMatch(/^[0-9A-F]{4}$/);
  });

  it('chave longa: descrição é cortada/omitida e o campo 26 nunca passa de 99', () => {
    const key = 'tesouraria.paroquia.nossa.senhora.aparecida.pontagrossa@gmail.com'; // 65 chars
    const payload = buildPixBrCode({ key, merchantName: 'Paroquia', merchantCity: 'CIDADE', amount: 10, txid: 'ABC', description: 'Dizimo 2026-08' });
    const len26 = Number(payload.slice(8, 10));
    expect(payload.slice(6, 8)).toBe('26');
    expect(len26).toBeLessThanOrEqual(99);
    expect(payload.slice(10, 10 + len26)).toContain(key);
    // chave no limite do DICT (77) ainda cabe sem descrição
    const maxKey = 'a'.repeat(65) + '@paroquia.br';
    expect(maxKey).toHaveLength(77);
    expect(() => buildPixBrCode({ key: maxKey, merchantName: 'P', merchantCity: 'C', description: 'x' })).not.toThrow();
    expect(() => buildPixBrCode({ key: 'a'.repeat(78), merchantName: 'P', merchantCity: 'C' })).toThrow();
    expect(() => buildPixBrCode({ key: 'josé@paroquia.org', merchantName: 'P', merchantCity: 'C' })).toThrow();
  });

  it('CNPJ alfanumérico e normalização de e-mail/aleatória', () => {
    expect(validatePixKey('CNPJ', '12ABC34501DE35')).toBeNull();
    expect(validatePixKey('CNPJ', '12abc34501de35')).toBeNull();
    expect(normalizePixKey('CNPJ', '12abc34501de35')).toBe('12ABC34501DE35');
    expect(validatePixKey('CNPJ', '12ABC34501DEXX')).not.toBeNull();
    expect(normalizePixKey('EMAIL', 'Tesouraria@ParoquiaSantaRita.org')).toBe('tesouraria@paroquiasantarita.org');
    expect(validatePixKey('EMAIL', 'Tesouraria@ParoquiaSantaRita.org')).toBeNull();
    expect(validatePixKey('EMAIL', 'josé@paroquia.org')).not.toBeNull();
    expect(validatePixKey('EMAIL', 'a'.repeat(70) + '@paroquia.br')).not.toBeNull();
    expect(normalizePixKey('RANDOM', '123E4567-E12B-12D1-A456-426655440000')).toBe('123e4567-e12b-12d1-a456-426655440000');
  });

  it('valida a chave conforme o tipo', () => {
    expect(validatePixKey('CNPJ', '12345678000199')).toBeNull();
    expect(validatePixKey('CNPJ', '12.345.678/0001-99')).not.toBeNull();
    expect(validatePixKey('EMAIL', 'tesouraria@paroquia.org')).toBeNull();
    expect(validatePixKey('PHONE', '+5542999990000')).toBeNull();
    expect(validatePixKey('PHONE', '42999990000')).not.toBeNull();
    expect(validatePixKey('RANDOM', '123e4567-e12b-12d1-a456-426655440000')).toBeNull();
    expect(validatePixKey(undefined, 'x')).not.toBeNull();
  });
});
