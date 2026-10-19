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
 *   adota e registra só a contagem no log (sem dado pessoal). Sem comunidade
 *   escolhida (cadastro pelo app), só o candidato ÚNICO.
 * - Dependente (`responsibleId` preenchido) e menor de 18 anos nunca são
 *   adotados: o celular da mãe gravado no filho não entrega o cadastro do
 *   filho à conta dela. Nascimento só com dia/mês (ano 1900) é idade
 *   desconhecida e não exclui.
 * - Cadastro de outra pessoa não é sobrescrito: o nome real só substitui o
 *   marcador "Responsável –"; e-mail e telefone só preenchem campo vazio.
 * - A gravação é condicional (`userId` ainda nulo): duas contas criadas ao
 *   mesmo tempo não adotam o mesmo membro.
 */

export interface AdoptionCandidate {
  id: string;
  fullName: string;
  communityId: string;
  birthDate?: Date | string | null;
  responsibleId?: string | null;
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

/** Maioridade exigida de quem é adotado (o titular da conta é adulto). */
const ADULT_AGE = 18;

/**
 * Menor de 18 pela data de nascimento (dia civil em UTC, como o resto do
 * sistema). Sem data, ou só dia/mês (ano 1900), a idade é desconhecida → não
 * conta como menor aqui.
 */
export const isKnownMinor = (birthDate: Date | string | null | undefined, now: Date = new Date()): boolean => {
  if (!birthDate) return false;
  const birth = birthDate instanceof Date ? birthDate : new Date(birthDate);
  if (Number.isNaN(birth.getTime()) || birth.getUTCFullYear() <= 1900) return false;
  // Último instante em que alguém nascido pode já ter 18 anos completos hoje
  const adultUntil = Date.UTC(now.getUTCFullYear() - ADULT_AGE, now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999);
  return birth.getTime() > adultUntil;
};

/** Pode ser adotado: não é dependente de ninguém nem menor de idade conhecido. */
export const isAdoptableCandidate = (candidate: AdoptionCandidate, now: Date = new Date()): boolean =>
  !candidate.responsibleId && !isKnownMinor(candidate.birthDate, now);

/**
 * Um candidato só, ou um único "Responsável –" entre vários; senão ninguém.
 * `onlySingle` (sem comunidade escolhida): só o candidato único.
 */
const decide = (candidates: AdoptionCandidate[], onlySingle = false): AdoptionDecision => {
  if (candidates.length === 0) return { member: null, reason: 'none', count: 0 };
  if (candidates.length === 1) return { member: candidates[0], reason: 'single' };
  if (onlySingle) return { member: null, reason: 'ambiguous', count: candidates.length };
  const responsible = candidates.filter((candidate) => isResponsiblePlaceholder(candidate.fullName));
  if (responsible.length === 1) return { member: responsible[0], reason: 'responsible' };
  return { member: null, reason: 'ambiguous', count: candidates.length };
};

/**
 * Escolhe o membro a adotar entre os candidatos (dependentes e menores saem antes).
 * - `communityId` + `onlyCommunity`: só os daquela comunidade (troca de comunidade no app).
 * - `communityId` sem `onlyCommunity`: prefere os daquela comunidade; sem nenhum lá, os
 *   demais — mas aí só o candidato único, como sem comunidade.
 * - sem `communityId` (cadastro pelo app): só adota se houver UM candidato.
 */
export const pickAdoptionCandidate = (
  candidates: AdoptionCandidate[],
  options: { communityId?: string | null; onlyCommunity?: boolean; now?: Date } = {},
): AdoptionDecision => {
  const eligible = candidates.filter((candidate) => isAdoptableCandidate(candidate, options.now));
  if (options.communityId) {
    const inCommunity = eligible.filter((candidate) => candidate.communityId === options.communityId);
    if (inCommunity.length || options.onlyCommunity) return decide(inCommunity);
  }
  return decide(eligible, true);
};

/**
 * Membros sem conta, não apagados e de comunidade ativa com o mesmo telefone
 * (comparação por dígitos, com e sem o 55 — cobre o E.164 e o formatado).
 * Dependentes e menores de 18 (com ano de nascimento conhecido) já saem na
 * consulta; `pickAdoptionCandidate` confere de novo.
 */
export const findAdoptionCandidates = async (
  tx: { $queryRaw: (...args: any[]) => Promise<any> },
  phone: string,
): Promise<AdoptionCandidate[]> => {
  const variants = phoneDigitVariants(phone);
  if (!variants) return [];
  const rows: AdoptionCandidate[] = await tx.$queryRaw`
    SELECT m.id, m."fullName", m."communityId", m."birthDate", m."responsibleId"
    FROM "members" m
    JOIN "communities" c ON c.id = m."communityId" AND c."deletedAt" IS NULL
    WHERE m."userId" IS NULL AND m."deletedAt" IS NULL AND m.phone IS NOT NULL
      AND m."responsibleId" IS NULL
      AND (
        m."birthDate" IS NULL
        OR EXTRACT(YEAR FROM m."birthDate") <= 1900
        OR m."birthDate" <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') - INTERVAL '18 years'
      )
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
      `Adoção por telefone não feita (${options.context}): ${decision.count} membros sem conta com o mesmo telefone, sem um candidato único`,
    );
  }
  return null;
};

const isBlank = (value: string | null | undefined): boolean => !String(value ?? '').trim();

/**
 * O que a adoção grava no membro: sempre o `userId`; o nome real só no lugar
 * do marcador "Responsável –"; e-mail e telefone só onde estão vazios. Dado
 * existente do cadastro nunca é trocado.
 */
export const buildAdoptionData = (
  current: { fullName: string | null; email?: string | null; phone?: string | null },
  account: { userId: string; fullName: string; email: string; phone: string },
): { userId: string; fullName?: string; email?: string; phone?: string } => ({
  userId: account.userId,
  ...(isResponsiblePlaceholder(current.fullName) && !isBlank(account.fullName) ? { fullName: account.fullName } : {}),
  ...(isBlank(current.email) && !isBlank(account.email) ? { email: account.email } : {}),
  ...(isBlank(current.phone) && !isBlank(account.phone) ? { phone: account.phone } : {}),
});

type AdoptionTx = {
  member: {
    findFirst: (args: any) => Promise<{ fullName: string | null; email: string | null; phone: string | null } | null>;
    updateMany: (args: any) => Promise<{ count: number }>;
  };
};

/**
 * Grava a adoção só se o membro continua sem conta (CAS). Devolve se adotou.
 * Lê o cadastro atual na mesma transação e grava só o que `buildAdoptionData`
 * permite; o CAS inclui os valores lidos, para não decidir sobre dado velho.
 */
export const adoptMember = async (
  tx: AdoptionTx,
  memberId: string,
  account: { userId: string; fullName: string; email: string; phone: string },
): Promise<boolean> => {
  const where = { id: memberId, userId: null, deletedAt: null };
  const current = await tx.member.findFirst({ where, select: { fullName: true, email: true, phone: true } });
  if (!current) return false;
  const { count } = await tx.member.updateMany({
    where: { ...where, fullName: current.fullName, email: current.email, phone: current.phone },
    data: buildAdoptionData(current, account),
  });
  return count === 1;
};
