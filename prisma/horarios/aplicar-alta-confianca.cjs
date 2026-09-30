// Grava no banco SÓ o que tem alta confiança (autorizado pelo Rodrigo em 30/09/2026):
//  - horário novo com o trecho literal CONFIRMADO na página oficial e confiança média/alta;
//  - cadastro de Ponta Grossa: endereço de capela (trecho literal da diocese) e mudança
//    de paróquia — exceto as comunidades citadas nas "dúvidas".
// O resto vai para a fila de aprovação no mapa do painel (carregar-propostas.cjs).
//
//   node prisma/horarios/aplicar-alta-confianca.cjs <pasta> [<pasta> ...] [--aplicar]
//
// Sem --aplicar só mostra o que faria. Com --aplicar grava em transação e salva o
// backup em prisma/data/geo/cache/horarios/aplicados/<data>.json (ids criados e
// valores antigos) para desfazer (desfazer-alta-confianca.cjs).
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const APLICAR = process.argv.includes('--aplicar');
const pastas = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!pastas.length) throw new Error('Informe as pastas');

const altaConfianca = (c) => c.status === 'confirmado' && String(c.confidence || '').toLowerCase() !== 'baixa';
const chave = (s) =>
  [s.communityId, s.type, s.recurrence || 'WEEKLY', s.dayOfWeek ?? '', s.time, [...(s.weeksOfMonth || [])].sort().join('.'), s.dayOfMonth ?? ''].join('|');

(async () => {
  const prisma = new PrismaClient();
  const horarios = [];
  const enderecos = [];
  const vinculos = [];

  for (const dir of pastas) {
    const proposta = JSON.parse(fs.readFileSync(path.join(dir, 'proposta.json'), 'utf8'));
    for (const c of proposta.criar.filter(altaConfianca)) horarios.push({ ...c, origem: path.basename(dir) });

    const arqCadastro = path.join(dir, 'proposta-cadastro.json');
    if (fs.existsSync(arqCadastro)) {
      const cad = JSON.parse(fs.readFileSync(arqCadastro, 'utf8'));
      const emDuvida = new Set((cad.duvidas || []).flatMap((d) => (d.comunidades || []).map((x) => x.communityId)));
      for (const e of cad.enderecos || []) {
        if (emDuvida.has(e.communityId) || !e.evidenceQuote || !e.enderecoProposto) continue;
        const novo = e.soBairro ? String(e.enderecoProposto).replace(/^bairro:\s*/i, '').trim() : String(e.enderecoProposto).trim();
        if (novo) enderecos.push({ ...e, novo });
      }
      for (const v of cad.vinculos || []) {
        if (emDuvida.has(v.communityId) || !v.paroquiaProposta?.id || !v.evidenceQuote) continue;
        vinculos.push(v);
      }
    }
  }

  // Reconfere no banco (o retrato é de horas atrás): não duplica horário existente
  const ids = [...new Set(horarios.map((h) => h.communityId))];
  const existentes = await prisma.massSchedule.findMany({
    where: { communityId: { in: ids }, isSpecial: false },
    select: { communityId: true, type: true, recurrence: true, dayOfWeek: true, time: true, weeksOfMonth: true, dayOfMonth: true },
  });
  const jaTem = new Set(existentes.map(chave));
  const vistos = new Set();
  const criar = horarios.filter((h) => {
    const k = chave(h);
    if (jaTem.has(k) || vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });

  const atuais = await prisma.community.findMany({
    where: { id: { in: [...enderecos.map((e) => e.communityId), ...vinculos.map((v) => v.communityId)] } },
    select: { id: true, name: true, address: true, parishId: true, latitude: true, longitude: true, geoPrecision: true, geoSource: true },
  });
  const atual = new Map(atuais.map((c) => [c.id, c]));
  // Só troca o endereço se o banco ainda tem o valor que a proposta viu
  const mudarEndereco = enderecos.filter((e) => atual.get(e.communityId)?.address === e.enderecoAtual && e.novo !== e.enderecoAtual);
  const mudarVinculo = vinculos.filter((v) => atual.get(v.communityId)?.parishId === v.paroquiaAtual.id);

  const porTipo = criar.reduce((m, h) => ((m[h.type] = (m[h.type] || 0) + 1), m), {});
  console.log({
    horariosAltaConfianca: horarios.length,
    horariosACriar: criar.length,
    jaExistiam: horarios.length - criar.length,
    porTipo,
    enderecosACorrigir: mudarEndereco.length,
    vinculosAMudar: mudarVinculo.length,
    comunidadesComPinNaMatriz: mudarEndereco.filter((e) => e.tipo === 'capela-com-endereco-da-matriz').length,
  });

  if (!APLICAR) {
    console.log('Simulação — nada gravado. Use --aplicar para gravar.');
    await prisma.$disconnect();
    return;
  }

  const agora = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = { geradoEm: new Date().toISOString(), horariosCriados: [], enderecos: [], vinculos: [] };
  await prisma.$transaction(
    async (tx) => {
      for (const h of criar) {
        const s = await tx.massSchedule.create({
          data: {
            communityId: h.communityId,
            type: h.type,
            dayOfWeek: h.recurrence === 'MONTHLY_DAY' ? null : h.dayOfWeek,
            time: h.time,
            recurrence: h.recurrence || 'WEEKLY',
            weeksOfMonth: h.recurrence === 'MONTHLY_NTH' ? h.weeksOfMonth : [],
            dayOfMonth: h.recurrence === 'MONTHLY_DAY' ? h.dayOfMonth : null,
            notes: h.notes ? String(h.notes).slice(0, 200) : null,
            isSpecial: false,
          },
          select: { id: true },
        });
        backup.horariosCriados.push({ id: s.id, communityId: h.communityId, type: h.type, time: h.time, dayOfWeek: h.dayOfWeek, evidenceUrl: h.evidenceUrl, evidenceQuote: h.evidenceQuote, origem: h.origem });
      }
      for (const e of mudarEndereco) {
        await tx.community.update({ where: { id: e.communityId }, data: { address: e.novo } });
        backup.enderecos.push({ communityId: e.communityId, antes: e.enderecoAtual, depois: e.novo, evidenceUrl: e.evidenceUrl, evidenceQuote: e.evidenceQuote });
      }
      for (const v of mudarVinculo) {
        await tx.community.update({ where: { id: v.communityId }, data: { parishId: v.paroquiaProposta.id } });
        backup.vinculos.push({ communityId: v.communityId, antes: v.paroquiaAtual.id, depois: v.paroquiaProposta.id, evidenceUrl: v.evidenceUrl, evidenceQuote: v.evidenceQuote });
      }
    },
    { timeout: 120000 },
  );
  const out = path.join(__dirname, '..', 'data', 'geo', 'cache', 'horarios', 'aplicados', `${agora}.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(backup, null, 1));
  console.log('Gravado. Backup:', out);
  await prisma.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
