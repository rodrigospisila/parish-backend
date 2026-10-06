import { TransactionType } from '@prisma/client';

/**
 * Dinheiro ainda é Float no banco (FinancialTransaction.amount, TitheIntent.amount…):
 * toda soma/diferença passa por centavos inteiros e volta arredondada a 2 casas,
 * para totais e CSV não carregarem resíduo binário (0,1 + 0,2 = 0,30000000000000004).
 */
export const toCents = (value: number) => Math.round(Number(value) * 100);
export const round2 = (value: number) => toCents(value) / 100;
export const sumMoney = (values: number[]) => values.reduce((cents, v) => cents + toCents(v), 0) / 100;

/** Teto de um lançamento manual no Financeiro (acima disso é erro de digitação). */
export const MAX_TRANSACTION_AMOUNT = 1_000_000;

/**
 * Categoria dos lançamentos de taxa do provedor de pagamento (M46): despesa
 * vinculada à receita (titheIntentId/guestGiftId), no centro de custo
 * Administrativo. Não é estorno de receita, apesar do vínculo.
 */
export const PROVIDER_FEE_CATEGORY = 'Taxas de pagamento';
export const PROVIDER_FEE_COST_CENTER = 'Administrativo';

/**
 * Saída que anula receita (estorno do provedor ou de lançamento manual): sai da
 * receita no balancete em vez de virar despesa. A taxa do provedor tem o mesmo
 * vínculo com o Pix, mas é despesa de verdade.
 */
export function isRevenueReversal(t: { type: TransactionType | string; category?: string | null; titheIntentId?: string | null; reversalOfId?: string | null }): boolean {
  if (t.type === TransactionType.INCOME) return false;
  if (t.reversalOfId) return true;
  return !!t.titheIntentId && t.category !== PROVIDER_FEE_CATEGORY;
}
