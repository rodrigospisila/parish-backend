/**
 * Lista branca dos eventos de uso do produto (eng-qualidade-17, saas-implantacao-30).
 *
 * Só estes nomes são gravados em `product_events`; qualquer outro é ignorado
 * (contado em `ignored` na resposta). Para medir algo novo, ACRESCENTE aqui
 * — nunca mande dado pessoal no nome (o nome é fixo, não um texto livre).
 *
 * Convenção: `app_*`/`screen_*` = app do fiel/gestor; `web_*` = painel;
 * ações de negócio sem prefixo de plataforma (a plataforma vai no campo `platform`).
 */
export const PRODUCT_EVENT_NAMES = [
  // ---- App (abertura e telas) ----
  'app_open', // app aberto (cold start ou volta do segundo plano)
  'screen_home', // início
  'screen_liturgy', // liturgia do dia
  'screen_nearby', // missas perto de mim / mapa
  'screen_community', // página da comunidade
  'screen_schedule', // minhas escalas
  'screen_catechesis', // catequese (família/catequista)
  'screen_tithe', // dízimo
  'screen_events', // agenda/eventos
  'screen_profile', // perfil/conta

  // ---- Painel web (login e páginas) ----
  'web_login', // login concluído no painel
  'web_dashboard', // início do painel
  'web_members', // membros
  'web_schedules', // escalas
  'web_catechesis', // catequese
  'web_finance', // financeiro/dízimo
  'web_pastorals', // pastorais
  'web_onboarding', // checklist de implantação
  'web_billing', // plano e pagamento

  // ---- Ações do funil de implantação/venda ----
  'invite_sent', // convite de equipe enviado
  'invite_accepted', // convite aceito
  'import_done', // importação de membros/dizimistas concluída
  'checkout_started', // contratação iniciada (painel)
  'claim_started', // reivindicação de paróquia iniciada (site/app)
  'landing_view', // visita ao site de vendas
  'demo_request_sent', // pedido de demonstração enviado
] as const;

export type ProductEventName = (typeof PRODUCT_EVENT_NAMES)[number];

const NAMES: ReadonlySet<string> = new Set(PRODUCT_EVENT_NAMES);

export function isProductEventName(value: unknown): value is ProductEventName {
  return typeof value === 'string' && NAMES.has(value);
}

export const PRODUCT_EVENT_PLATFORMS = ['web', 'app'] as const;
export type ProductEventPlatform = (typeof PRODUCT_EVENT_PLATFORMS)[number];
