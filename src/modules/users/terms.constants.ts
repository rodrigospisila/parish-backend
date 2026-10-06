import { CURRENT_POLICY_VERSION } from '../consents/consent.constants';

/**
 * Versão vigente dos termos de uso / política de privacidade que a conta
 * precisa ter aceitado (achados M3/M4). Acompanha CURRENT_POLICY_VERSION:
 * ao mudar o texto de forma material, sobe a versão lá e toda conta volta a
 * ver o aviso de aceite (app e painel) no próximo acesso.
 */
export const TERMS_VERSION = CURRENT_POLICY_VERSION;

/**
 * true quando a conta ainda não aceitou os termos vigentes: sem aceite
 * gravado (contas criadas pela gestão, cadastros antigos ou de cliente sem o
 * aceite) ou aceite de uma versão anterior.
 */
export function isTermsAcceptanceRequired(user: {
  acceptedTermsAt?: Date | string | null;
  acceptedTermsVersion?: string | null;
}): boolean {
  return !user.acceptedTermsAt || user.acceptedTermsVersion !== TERMS_VERSION;
}
