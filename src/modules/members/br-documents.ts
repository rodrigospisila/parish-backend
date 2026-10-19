/**
 * Documentos brasileiros (CPF e CNPJ): só dígitos e dígito verificador.
 * Usado na importação de planilhas (CPF inválido = erro DA LINHA) e no
 * cadastro da paróquia (CNPJ da filial da Mitra — cat-gestao-31).
 */

export function onlyDigits(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '');
}

/** CPF com 11 dígitos, não repetido (000…, 111…) e com os dois verificadores certos. */
export function isValidCpf(value: unknown): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

/** CNPJ com 14 dígitos, não repetido e com os dois verificadores certos. */
export function isValidCnpj(value: unknown): boolean {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const digit = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cnpj[i]) * weights[i];
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return digit(12) === Number(cnpj[12]) && digit(13) === Number(cnpj[13]);
}

/** 12.345.678/0001-90 (só para exibição; o banco guarda só os dígitos). */
export function formatCnpj(value: unknown): string {
  const d = onlyDigits(value);
  if (d.length !== 14) return String(value ?? '');
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}
