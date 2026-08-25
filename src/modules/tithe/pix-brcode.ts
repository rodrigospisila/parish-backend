/**
 * Pix "copia e cola" (BR Code estático, padrão EMV-MPM do Banco Central).
 * Gera o payload a partir da chave da paróquia + valor + txid — sem gateway.
 * Referência: Manual de Padrões para Iniciação do Pix (BCB), Anexo I.
 */

export interface PixBrCodeInput {
  /** Chave Pix do recebedor (CPF/CNPJ só dígitos, e-mail, +55 telefone ou chave aleatória) */
  key: string;
  /** Nome do recebedor (até 25 caracteres ASCII) */
  merchantName: string;
  /** Cidade do recebedor (até 15 caracteres ASCII) */
  merchantCity: string;
  /** Valor em reais; omitido = o pagador informa */
  amount?: number | null;
  /** Identificador da transação (até 25 alfanuméricos); '***' = livre */
  txid?: string | null;
  /** Texto curto exibido ao pagador (campo 02 do MAI) */
  description?: string | null;
}

/** Limite do campo 26 (Merchant Account Information) e da chave no DICT. */
export const PIX_MAI_MAX = 99;
export const PIX_KEY_MAX = 77;
const PIX_GUI = 'BR.GOV.BCB.PIX';

/** Campo EMV: ID (2) + tamanho (2) + valor — tamanho nunca passa de 99 (padrão TLV). */
const emv = (id: string, value: string): string => {
  if (value.length > 99) throw new Error(`Campo ${id} do BR Code excede 99 caracteres`);
  return `${id}${String(value.length).padStart(2, '0')}${value}`;
};

/** Remove acentos/caracteres fora do ASCII imprimível e corta no limite. */
export const normalizeAscii = (value: string, max: number): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) em hexa maiúsculo de 4 dígitos. */
export function crc16Ccitt(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** Normaliza o txid para o alfabeto aceito (A-Z a-z 0-9, até 25). */
export const normalizeTxid = (txid?: string | null): string => {
  const clean = (txid ?? '').replace(/[^A-Za-z0-9]/g, '').slice(0, 25);
  return clean || '***';
};

export function buildPixBrCode(input: PixBrCodeInput): string {
  const key = input.key.trim();
  if (!key) throw new Error('Chave Pix vazia');
  if (/[^\x21-\x7E]/.test(key)) throw new Error('Chave Pix com caracteres inválidos (use só ASCII, sem acentos/espaços)');
  if (key.length > PIX_KEY_MAX) throw new Error(`Chave Pix com mais de ${PIX_KEY_MAX} caracteres`);
  // Chave e descrição dividem os 99 caracteres do campo 26: a descrição é
  // cortada (ou omitida) para o BR Code nunca sair com TLV inválido
  const used = 4 + PIX_GUI.length + 4 + key.length;
  const room = PIX_MAI_MAX - used - 4;
  const description = input.description && room >= 4 ? normalizeAscii(input.description, Math.min(72, room)) : '';
  const merchantAccount = emv('00', PIX_GUI) + emv('01', key) + (description ? emv('02', description) : '');
  const amount =
    input.amount !== undefined && input.amount !== null && input.amount > 0 ? emv('54', input.amount.toFixed(2)) : '';
  const payload =
    emv('00', '01') +
    emv('26', merchantAccount) +
    emv('52', '0000') +
    emv('53', '986') +
    amount +
    emv('58', 'BR') +
    emv('59', normalizeAscii(input.merchantName, 25) || 'PAROQUIA') +
    emv('60', normalizeAscii(input.merchantCity, 15) || 'BRASIL') +
    emv('62', emv('05', normalizeTxid(input.txid))) +
    '6304';
  return payload + crc16Ccitt(payload);
}

/**
 * Normaliza a chave para o formato do DICT (é o que o banco pagador consulta):
 * CPF/telefone só dígitos, CNPJ maiúsculo (alfanumérico é válido desde 2026),
 * e-mail e chave aleatória em minúsculas.
 */
export function normalizePixKey(type: string | null | undefined, key: string): string {
  const value = key.trim();
  switch ((type ?? '').toUpperCase()) {
    case 'CNPJ':
      return value.toUpperCase();
    case 'EMAIL':
    case 'RANDOM':
      return value.toLowerCase();
    default:
      return value;
  }
}

/** Validação da chave conforme o tipo declarado (após normalizePixKey). */
export function validatePixKey(type: string | null | undefined, key: string): string | null {
  const value = normalizePixKey(type, key);
  if (value.length > PIX_KEY_MAX) return `Chave Pix com mais de ${PIX_KEY_MAX} caracteres`;
  if (/[^\x21-\x7E]/.test(value)) return 'Chave Pix com caracteres inválidos (sem acentos ou espaços)';
  switch ((type ?? '').toUpperCase()) {
    case 'CPF':
      return /^\d{11}$/.test(value) ? null : 'CPF deve ter 11 dígitos (só números)';
    case 'CNPJ':
      // 12 alfanuméricos + 2 dígitos verificadores (formato numérico continua válido)
      return /^[A-Z0-9]{12}\d{2}$/.test(value) ? null : 'CNPJ deve ter 14 caracteres (letras/números + 2 dígitos finais)';
    case 'EMAIL':
      return /^[a-z0-9.!#$&'*+/=?^_`{|}~-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(value) ? null : 'E-mail inválido';
    case 'PHONE':
      return /^\+55\d{10,11}$/.test(value) ? null : 'Telefone no formato +55DDDNÚMERO (ex.: +5542999990000)';
    case 'RANDOM':
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value)
        ? null
        : 'Chave aleatória deve ser um UUID (ex.: 123e4567-e12b-12d1-a456-426655440000)';
    default:
      return 'Informe o tipo da chave (CPF, CNPJ, EMAIL, PHONE ou RANDOM)';
  }
}
