import { Prisma } from '@prisma/client';

/**
 * Trava da linha do usuário (revisão #39): a renovação de sessão (consumir o
 * refresh token + emitir o par novo) e toda revogação (troca/redefinição de
 * senha, "sair de todos", ativar/redefinir o 2FA, logout, anonimização) rodam
 * numa transação que começa por este SELECT ... FOR UPDATE. Sem ela, um
 * refresh que já tinha lido o token antes da revogação gravava o token novo
 * DEPOIS do deleteMany — e a sessão que devia cair sobrevivia.
 *
 * Para transação interativa (`tx`) ou como primeiro item de uma transação em
 * lote (`prisma.$transaction([lockUserRowQuery(prisma, id), ...])`).
 */
export const lockUserRowQuery = (db: Pick<Prisma.TransactionClient, '$queryRaw'>, userId: string) =>
  db.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;

export async function lockUserRow(tx: Pick<Prisma.TransactionClient, '$queryRaw'>, userId: string): Promise<void> {
  await lockUserRowQuery(tx, userId);
}
