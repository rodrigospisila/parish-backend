/**
 * Máscaras para log (LGPD): telefone e e-mail nunca vão inteiros para o log
 * de produção. O suficiente para o suporte reconhecer o caso, nada além.
 */

/** "+5542999998883" → "+55•••••••83" */
export const maskPhone = (raw: string | null | undefined): string => {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.length < 4) return '•••';
  const prefix = digits.startsWith('55') ? '+55' : '';
  return `${prefix}•••••••${digits.slice(-2)}`;
};

/** "maria.silva@gmail.com" → "m•••@gmail.com" */
export const maskEmail = (raw: string | null | undefined): string => {
  const text = String(raw ?? '');
  const at = text.indexOf('@');
  if (at < 1) return '•••';
  return `${text[0]}•••${text.slice(at)}`;
};

/** Produção: nada de conteúdo de mensagem, código ou token no log. */
export const isProductionEnv = (): boolean => process.env.NODE_ENV === 'production';

/**
 * Normaliza telefone brasileiro para E.164 (+5511999999999); null quando não
 * dá para normalizar. Função pura — a mesma regra de MessagingService.normalizePhone,
 * usada também nos DTOs de membro.
 */
export const normalizeBrazilianPhone = (raw: string | null | undefined): string | null => {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) return `+${digits}`;
  if (digits.length === 11 || digits.length === 10) return `+55${digits}`;
  return null;
};
