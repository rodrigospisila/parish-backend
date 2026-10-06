import { ValidationPipe } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { parseMoneyAmount } from './finance.service';
import { isRevenueReversal, sumMoney } from './money';

/** B42 da auditoria: POST /finance/transactions aceitava NaN, centésimos de centavo, valor sem teto e tipo livre. */
describe('CreateTransactionDto + valores em dinheiro (B42)', () => {
  // Mesma configuração do main.ts
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const validate = (body: unknown) => pipe.transform(body, { type: 'body', metatype: CreateTransactionDto });
  const ok = { type: 'INCOME', category: 'Coleta', amount: 123.45, date: '2026-10-05', communityId: 'c1', costCenter: 'Liturgia', description: 'Missa' };

  it('aceita o que o painel manda', async () => {
    await expect(validate(ok)).resolves.toMatchObject({ amount: 123.45, type: TransactionType.INCOME });
    await expect(validate({ ...ok, communityId: undefined, parishId: 'p1', costCenter: undefined })).resolves.toBeInstanceOf(CreateTransactionDto);
  });

  it.each([
    ['tipo livre', { type: 'XPTO' }],
    ['valor string', { amount: '1e9' }],
    ['valor nulo (NaN no JSON)', { amount: null }],
    ['centésimo de centavo', { amount: 0.001 }],
    ['acima do teto', { amount: 1_000_000.01 }],
    ['zero', { amount: 0 }],
    ['negativo', { amount: -5 }],
    ['categoria vazia', { category: '' }],
    ['campo desconhecido', { foo: 'bar' }],
  ])('recusa %s', async (_label, patch) => {
    await expect(validate({ ...ok, ...patch })).rejects.toBeDefined();
  });

  it('o serviço também valida (qualquer chamador) e arredonda em centavos', () => {
    expect(parseMoneyAmount(10.1)).toBe(10.1);
    expect(parseMoneyAmount(0.29)).toBe(0.29);
    expect(() => parseMoneyAmount(Number.NaN)).toThrow('positivo');
    expect(() => parseMoneyAmount('10' as unknown)).toThrow('positivo');
    expect(() => parseMoneyAmount(0.001)).toThrow('2 casas');
    expect(() => parseMoneyAmount(2_000_000)).toThrow('limite');
  });

  it('somas sem resíduo binário', () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(sumMoney([0.1, 0.2])).toBe(0.3);
    expect(sumMoney([19.99, 0.01, 80])).toBe(100);
  });

  it('taxa do provedor é despesa; estorno de receita sai da receita', () => {
    expect(isRevenueReversal({ type: 'EXPENSE', category: 'Taxas de pagamento', titheIntentId: 'i1' })).toBe(false);
    expect(isRevenueReversal({ type: 'EXPENSE', category: 'Dízimo', titheIntentId: 'i1' })).toBe(true);
    expect(isRevenueReversal({ type: 'EXPENSE', category: 'Ofertas', reversalOfId: 'ft1' })).toBe(true);
    expect(isRevenueReversal({ type: 'EXPENSE', category: 'Água, luz e telefone' })).toBe(false);
    expect(isRevenueReversal({ type: 'INCOME', category: 'Taxas de pagamento', titheIntentId: 'i1' })).toBe(false);
  });
});
