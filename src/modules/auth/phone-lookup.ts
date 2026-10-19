import { phoneDigitVariants } from './phone-adoption';

/**
 * Compatibilidade com telefones gravados fora do padrão (ux-acesso-18): até a
 * normalização no cadastro pela gestão, `users.phone` podia ficar como
 * "(42) 99999-8888" ou "+55 42 9…". Login e recuperação por celular procuram
 * primeiro o E.164 exato (índice único) e, sem achar, comparam só os dígitos.
 * Os registros antigos não são reescritos aqui (dado de produção).
 *
 * Devolve até 2 ids: quem chama só aceita resultado ÚNICO (dois cadastros
 * com os mesmos dígitos = ambíguo = nenhuma conta).
 */
export const findUserIdsByPhoneDigits = async (
  db: { $queryRaw: (...args: any[]) => Promise<any> },
  phone: string,
  options: { activeOnly?: boolean } = {},
): Promise<string[]> => {
  const variants = phoneDigitVariants(phone);
  if (!variants) return [];
  const rows: Array<{ id: string }> = options.activeOnly
    ? await db.$queryRaw`
        SELECT id FROM "users"
        WHERE phone IS NOT NULL AND "isActive" = true
          AND regexp_replace(phone, '\\D', '', 'g') IN (${variants.digits}, ${variants.local})
        LIMIT 2`
    : await db.$queryRaw`
        SELECT id FROM "users"
        WHERE phone IS NOT NULL
          AND regexp_replace(phone, '\\D', '', 'g') IN (${variants.digits}, ${variants.local})
        LIMIT 2`;
  return Array.isArray(rows) ? rows.map((row) => row.id) : [];
};

/** Id da única conta com aqueles dígitos; null se nenhuma ou mais de uma. */
export const findUniqueUserIdByPhoneDigits = async (
  db: { $queryRaw: (...args: any[]) => Promise<any> },
  phone: string,
  options: { activeOnly?: boolean } = {},
): Promise<string | null> => {
  const ids = await findUserIdsByPhoneDigits(db, phone, options);
  return ids.length === 1 ? ids[0] : null;
};
