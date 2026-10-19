import { Logger } from '@nestjs/common';

/**
 * Adoção do membro pré-cadastrado pelo telefone VERIFICADO (ux-acesso-01).
 *
 * A gestão (ou a importação de planilha, como em Imbituva) cadastra membros
 * sem conta — por exemplo "Responsável – <catequizando>", com os filhos
 * apontando para ele. Quando a pessoa cria a conta com o mesmo celular
 * confirmado por SMS, a conta ADOTA esse membro em vez de criar outro: assume
 * o nome real e herda os dependentes e as matrículas.
 *
 * Regras (não podem regredir):
 * - Só telefone verificado adota. Número digitado à mão nunca (evita sequestro
 *   do cadastro de outra família).
 * - Na dúvida, ninguém: vários candidatos sem um "Responsável –" único → não
 *   adota e registra só a contagem no log (sem dado pessoal).
 * - A gravação é condicional (`userId` ainda nulo): duas contas criadas ao
 *   mesmo tempo não adotam o mesmo membro.
 */

export interface AdoptionCandidate {
  id: string;
  fullName: string;
  communityId: string;
}

export type AdoptionDecision =
  | { member: AdoptionCandidate; reason: 'single' | 'responsible' }
  | { member: null; reason: 'none' | 'ambiguous'; count: number };

/** "Responsável – Ana", "Responsavel - Ana", "Responsável — Ana" */
const RESPONSIBLE_PREFIX = /^\s*respons[aá]vel\s*[–—-]/i;

export const isResponsiblePlaceholder = (fullName: string | null | undefined): boolean =>
  RESPONSIBLE_PREFIX.test(String(fullName ?? ''));

/** Dígitos do telefone com e sem o 55 (o painel grava "(42) 99999-8888", o SMS "+5542999998888"). */
export const phoneDigitVariants = (phone: string): { digits: string; local: string } | null => {
  const digits = String(phone ?? '').replace(/\D/g, '');
  const local = digits.startsWith('55') ? digits.slice(2) : digits;
  if (local.length < 10) return null;
  return { digits, local };
};

/** Um candidato só, ou um único "Responsável –" entre vários; senão ninguém. */
const decide = (candidates: AdoptionCandidate[]): AdoptionDecision => {
  if (candidates.length === 0) return { member: null, reason: 'none', count: 0 };
  if (candidates.length === 1) return { member: candidates[0], reason: 'single' };
  const responsible = candidates.filter((candidate) => isResponsiblePlaceholder(candidate.fullName));
  if (responsible.length === 1) return { member: responsible[0], reason: 'responsible' };
  return { member: null, reason: 'ambiguous', count: candidates.length };
};

/**
 * Escolhe o membro a adotar entre os candidatos.
 * - `communityId` + `onlyCommunity`: só os daquela comunidade (troca de comunidade no app).
 * - `communityId` sem `onlyCommunity`: prefere os daquela comunidade; sem nenhum lá, os demais.
 * - sem `communityId`: todos.
 */
export const pickAdoptionCandidate = (
  candidates: AdoptionCandidate[],
  options: { communityId?: string | null; onlyCommunity?: boolean } = {},
): AdoptionDecision => {
  if (options.communityId) {
    const inCommunity = candidates.filter((candidate) => candidate.communityId === options.communityId);
    if (inCommunity.length || options.onlyCommunity) return decide(inCommunity);
  }
  return decide(candidates);
};

/**
 * Membros sem conta, não apagados e de comunidade ativa com o mesmo telefone
 * (comparação por dígitos, com e sem o 55 — cobre o E.164 e o formatado).
 */
export const findAdoptionCandidates = async (
  tx: { $queryRaw: (...args: any[]) => Promise<any> },
  phone: string,
): Promise<AdoptionCandidate[]> => {
  const variants = phoneDigitVariants(phone);
  if (!variants) return [];
  const rows: AdoptionCandidate[] = await tx.$queryRaw`
    SELECT m.id, m."fullName", m."communityId"
    FROM "members" m
    JOIN "communities" c ON c.id = m."communityId" AND c."deletedAt" IS NULL
    WHERE m."userId" IS NULL AND m."deletedAt" IS NULL AND m.phone IS NOT NULL
      AND regexp_replace(m.phone, '\\D', '', 'g') IN (${variants.digits}, ${variants.local})
    ORDER BY m."createdAt" ASC
    LIMIT 20`;
  return rows ?? [];
};

/** Procura e decide; loga só a contagem quando fica ambíguo. */
export const resolveAdoption = async (
  tx: { $queryRaw: (...args: any[]) => Promise<any> },
  phone: string,
  options: { communityId?: string | null; onlyCommunity?: boolean; logger?: Logger; context: string },
): Promise<AdoptionCandidate | null> => {
  const decision = pickAdoptionCandidate(await findAdoptionCandidates(tx, phone), options);
  if (decision.member) return decision.member;
  if (decision.reason === 'ambiguous') {
    options.logger?.warn(
      `Adoção por telefone não feita (${options.context}): ${decision.count} membros sem conta com o mesmo telefone, sem um "Responsável –" único`,
    );
  }
  return null;
};

/**
 * Grava a adoção só se o membro continua sem conta (CAS). Devolve se adotou.
 * O telefone verificado (E.164) substitui o digitado no painel.
 */
export const adoptMember = async (
  tx: { member: { updateMany: (args: any) => Promise<{ count: number }> } },
  memberId: string,
  data: { userId: string; fullName: string; email: string; phone: string },
): Promise<boolean> => {
  const { count } = await tx.member.updateMany({
    where: { id: memberId, userId: null, deletedAt: null },
    data,
  });
  return count === 1;
};
