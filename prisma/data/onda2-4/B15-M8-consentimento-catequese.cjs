/**
 * B15 + M8 (dados) — consentimento na catequese. SÓ DIAGNÓSTICO: não existe correção
 * automática. Consentimento do responsável (LGPD art. 14 §1º) não se infere nem se
 * presume — só a família dá, no app ou no termo em papel lançado pela equipe. Por isso
 * este script não tem --apply (recusa).
 *
 * O que ele mede, por paróquia e por turma (ids, sem nome de pessoa):
 *   - matrículas sem Consent DATA_PROCESSING do catequizando;
 *   - matrículas com uso de imagem "não respondido" (imageConsent nulo);
 *   - catequizandos sem responsável vinculado (responsibleId nulo) e, deles, quantos
 *     não têm nenhum dado para achar o responsável (telefone, e-mail, nome dos pais,
 *     contato de emergência);
 *   - se a coluna guardianConsentAt (termo do responsável, migration
 *     20261006190000_catechesis_guardian_consent, outra frente) já existe no banco.
 * Gera saida/B15-M8-pendencias.json: a lista que a coordenação usaria para a coleta.
 *
 * Imbituva (cmrxqe3eg00htcv4c7g2z3rvy) é REAL: qualquer lançamento de termo é ação da
 * equipe da paróquia pelo painel, com ordem do Rodrigo — nunca por script.
 *
 *   node prisma/data/onda2-4/B15-M8-consentimento-catequese.cjs --env=.env.imbituva [--paroquia=<id>]
 */
const fs = require('fs');
const path = require('path');
const { iniciar, SAIDA } = require('./_comum.cjs');

const ITEM = 'B15-M8';

(async () => {
  const ctx = iniciar(ITEM);
  const { prisma, apply } = ctx;
  if (apply) { console.error(`[${ITEM}] não há correção automática de consentimento — este script é só diagnóstico.`); process.exit(1); }
  const arg = ctx.argv.find((a) => a.startsWith('--paroquia='));
  const paroquia = arg ? arg.slice(11) : null;
  await ctx.preparar();

  const [{ existe }] = await prisma.$queryRawUnsafe(
    `SELECT count(*)::int > 0 AS existe FROM information_schema.columns WHERE table_name = 'catechesis_enrollments' AND column_name = 'guardianConsentAt'`);
  const termo = existe ? `e."guardianConsentAt" IS NOT NULL` : 'false';

  const linhas = await prisma.$queryRawUnsafe(`
    SELECT c."parishId" AS paroquia, e."classId" AS turma, e.status::text AS status, e.id AS matricula, m.id AS membro,
           m."responsibleId" IS NOT NULL AS tem_responsavel,
           (m.phone IS NOT NULL OR m.email IS NOT NULL OR m."fatherName" IS NOT NULL OR m."motherName" IS NOT NULL OR m."emergencyContactPhone" IS NOT NULL) AS tem_pista,
           EXISTS (SELECT 1 FROM consents x WHERE x."memberId" = m.id AND x.type = 'DATA_PROCESSING' AND x.granted AND x."revokedAt" IS NULL) AS consent_dados,
           m."consentGiven" AS flag_legada,
           e."imageConsent" AS imagem,
           ${termo} AS termo_responsavel
      FROM catechesis_enrollments e
      JOIN catechesis_classes k ON k.id = e."classId"
      JOIN communities c ON c.id = k."communityId"
      JOIN members m ON m.id = e."memberId"
     WHERE m."deletedAt" IS NULL ${paroquia ? `AND c."parishId" = $1` : ''}`, ...(paroquia ? [paroquia] : []));

  const porParoquia = {};
  const pendencias = [];
  for (const l of linhas) {
    const p = (porParoquia[l.paroquia] ||= { matriculas: 0, semConsentDados: 0, semTermoResponsavel: 0, imagemNaoRespondida: 0, semResponsavel: 0, semResponsavelESemPista: 0, flagLegada: 0, turmas: new Set() });
    p.matriculas += 1; p.turmas.add(l.turma);
    if (!l.consent_dados) p.semConsentDados += 1;
    if (!l.termo_responsavel) p.semTermoResponsavel += 1;
    if (l.imagem == null) p.imagemNaoRespondida += 1;
    if (!l.tem_responsavel) { p.semResponsavel += 1; if (!l.tem_pista) p.semResponsavelESemPista += 1; }
    if (l.flag_legada) p.flagLegada += 1;
    const falta = [!l.consent_dados && !l.termo_responsavel && 'termo LGPD', l.imagem == null && 'uso de imagem', !l.tem_responsavel && 'responsável'].filter(Boolean);
    if (falta.length) pendencias.push({ paroquia: l.paroquia, turma: l.turma, matricula: l.matricula, membro: l.membro, falta });
  }
  for (const p of Object.values(porParoquia)) p.turmas = p.turmas.size;

  const tot = { colunaTermoResponsavelNoBanco: existe, paroquias: Object.keys(porParoquia).length, matriculas: linhas.length, porParoquia };
  console.log(JSON.stringify(tot, null, 1));
  fs.writeFileSync(path.join(SAIDA, `${ITEM}-pendencias.json`), JSON.stringify(pendencias, null, 1));
  console.log('prévia:', ctx.salvarPrevia(tot));
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
