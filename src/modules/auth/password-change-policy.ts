/**
 * Troca de senha obrigatória (M18). Conta criada ou redefinida pela gestão
 * nasce com `forcePasswordChange`: até a pessoa trocar a senha, a sessão só
 * serve para trocar a senha, ler o próprio perfil e sair.
 *
 * PASSWORD_CHANGE_ENFORCEMENT:
 * - `on`  → as demais rotas respondem 403 com `code: PASSWORD_CHANGE_REQUIRED`;
 * - `log` (padrão) → só registra no log. O app 1.1.0 não tem a tela de troca:
 *   ligar `on` só depois que o app novo chegar aos aparelhos (sob ordem).
 * - `off` → nem registra.
 * O painel e o app novo já levam à tela de troca pelo `forcePasswordChange`
 * devolvido no login e no /users/me, independentemente desta chave.
 */
export const PASSWORD_CHANGE_REQUIRED = 'PASSWORD_CHANGE_REQUIRED';

export type PasswordChangeEnforcement = 'on' | 'log' | 'off';

export const parseEnforcement = (raw: string | undefined | null): PasswordChangeEnforcement => {
  const value = String(raw ?? '').trim().toLowerCase();
  return value === 'on' || value === 'off' ? value : 'log';
};

/** Rotas liberadas enquanto a troca está pendente (caminho sem a query; prefixo global ignorado). */
const ALLOWED: Array<{ method: string; pattern: RegExp }> = [
  { method: 'GET', pattern: /\/users\/me\/?$/ },
  { method: 'POST', pattern: /\/users\/[^/]+\/change-password\/?$/ },
  { method: 'POST', pattern: /\/auth\/logout(-all)?\/?$/ },
  { method: 'PATCH', pattern: /\/users\/me\/push-token\/?$/ },
  // Aviso de termos (M3/M4) e troca de senha não podem travar um ao outro
  { method: 'POST', pattern: /\/users\/me\/accept-terms\/?$/ },
];

export const isAllowedDuringPasswordChange = (method: string | undefined, url: string | undefined): boolean => {
  const path = String(url ?? '').split('?')[0];
  const verb = String(method ?? '').toUpperCase();
  return ALLOWED.some((rule) => rule.method === verb && rule.pattern.test(path));
};
