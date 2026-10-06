/**
 * Aceite dos termos vigentes cobrado também no servidor (revisão #29). Até
 * aqui só o cliente (app/painel) abria o aviso: um cliente antigo ou um script
 * seguia usando a conta sem aceite.
 *
 * TERMS_ENFORCEMENT (mesmo padrão do PASSWORD_CHANGE_ENFORCEMENT):
 * - `on`  → conta sem o aceite da versão vigente recebe 403 com
 *   `code: TERMS_ACCEPTANCE_REQUIRED` nas demais rotas;
 * - `log` (padrão) → só registra no log. O app 1.1.0 não tem o aviso de
 *   aceite: ligar `on` só depois que o app novo chegar aos aparelhos (sob ordem);
 * - `off` → nem registra.
 */
export const TERMS_ACCEPTANCE_REQUIRED = 'TERMS_ACCEPTANCE_REQUIRED';

/** Rotas liberadas com o aceite pendente (caminho sem a query; prefixo global ignorado). */
const ALLOWED: Array<{ method: string; pattern: RegExp }> = [
  // Perfil (o aviso pergunta por aqui) e exclusão da própria conta — recusar
  // os termos não pode impedir o titular de sair do serviço
  { method: 'GET', pattern: /\/users\/me\/?$/ },
  { method: 'DELETE', pattern: /\/users\/me\/?$/ },
  { method: 'POST', pattern: /\/users\/me\/accept-terms\/?$/ },
  { method: 'POST', pattern: /\/auth\/logout(-all)?\/?$/ },
  { method: 'PATCH', pattern: /\/users\/me\/push-token\/?$/ },
  // Troca de senha obrigatória e aceite não podem travar um ao outro
  { method: 'POST', pattern: /\/users\/[^/]+\/change-password\/?$/ },
];

export const isAllowedDuringTermsAcceptance = (method: string | undefined, url: string | undefined): boolean => {
  const path = String(url ?? '').split('?')[0];
  const verb = String(method ?? '').toUpperCase();
  return ALLOWED.some((rule) => rule.method === verb && rule.pattern.test(path));
};
