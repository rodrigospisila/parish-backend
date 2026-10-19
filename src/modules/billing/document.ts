/**
 * CPF/CNPJ do pagador da assinatura (conta de faturamento): só dígitos e com
 * dígitos verificadores válidos — o Asaas e a NFS-e recusam documento inválido.
 */

export function onlyDigits(value: string | null | undefined): string {
  return String(value ?? '').replace(/\D/g, '');
}

function allSame(digits: string): boolean {
  return /^(\d)\1+$/.test(digits);
}

export function isValidCpf(value: string | null | undefined): boolean {
  const d = onlyDigits(value);
  if (d.length !== 11 || allSame(d)) return false;
  const check = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return check(9) === Number(d[9]) && check(10) === Number(d[10]);
}

export function isValidCnpj(value: string | null | undefined): boolean {
  const d = onlyDigits(value);
  if (d.length !== 14 || allSame(d)) return false;
  const check = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((acc, w, i) => acc + Number(d[i]) * w, 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return check(12) === Number(d[12]) && check(13) === Number(d[13]);
}

/** 'CPF' | 'CNPJ' quando válido; null quando inválido. */
export function documentKind(value: string | null | undefined): 'CPF' | 'CNPJ' | null {
  const d = onlyDigits(value);
  if (d.length === 11) return isValidCpf(d) ? 'CPF' : null;
  if (d.length === 14) return isValidCnpj(d) ? 'CNPJ' : null;
  return null;
}
