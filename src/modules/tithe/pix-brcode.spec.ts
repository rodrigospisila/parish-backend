import { buildPixBrCode, crc16Ccitt, normalizeAscii, normalizeTxid, validatePixKey } from './pix-brcode';

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
