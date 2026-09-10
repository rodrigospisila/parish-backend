// Valida o dataset do território (formato, chaves, duplicatas) antes da carga.
//   node prisma/data/territorio-br/validate.cjs [UF]
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const CONF = new Set(['alta', 'media', 'baixa']);
const TYPES = new Set(['MASS', 'CONFESSION', 'ADORATION', 'ROSARY']);
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
let problems = 0;
const warn = (file, msg) => { problems += 1; console.log(`  ! ${path.basename(file)}: ${msg}`); };

const totals = { dioceses: 0, parishes: 0, communities: 0, schedules: 0, byConf: { alta: 0, media: 0, baixa: 0 } };

function checkSources(file, label, sources) {
  if (!Array.isArray(sources) || sources.length === 0) warn(file, `${label}: sem fontes`);
  else for (const s of sources) if (!s.url || !/^https?:\/\//.test(s.url)) warn(file, `${label}: fonte sem url válida`);
}

function validateDioceses() {
  const file = path.join(ROOT, 'dioceses.json');
  if (!fs.existsSync(file)) { console.log('dioceses.json ausente'); return; }
  const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log(`dioceses.json: ${rows.length} circunscrições`);
  const slugs = new Set(); const names = new Set();
  for (const d of rows) {
    totals.dioceses += 1;
    if (!d.name || !d.slug || !d.city || !/^[A-Z]{2}$/.test(d.state ?? '')) warn(file, `${d.name ?? '?'}: name/slug/city/state inválidos`);
    if (!CONF.has(d.confidence)) warn(file, `${d.name}: confidence inválida (${d.confidence})`); else totals.byConf[d.confidence] += 1;
    if (slugs.has(d.slug)) warn(file, `slug duplicado: ${d.slug}`); slugs.add(d.slug);
    if (names.has(norm(d.name))) warn(file, `nome duplicado: ${d.name}`); names.add(norm(d.name));
    checkSources(file, d.name, d.sources);
  }
}

function validateDioceseFile(file) {
  let data;
  try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { warn(file, `JSON inválido: ${e.message}`); return; }
  const d = data.diocese;
  if (!d || !d.name || !d.slug || !d.city || !/^[A-Z]{2}$/.test(d.state ?? '')) warn(file, 'bloco diocese incompleto');
  if (!Array.isArray(data.parishes)) { warn(file, 'parishes não é lista'); return; }
  const seen = new Set();
  for (const p of data.parishes) {
    totals.parishes += 1;
    // Homônimas na mesma cidade são legítimas se o bairro/endereço difere (o
    // importador acrescenta o bairro ao nome); duplicata real = mesmo bairro também
    const key = `${norm(p.name)}|${norm(p.city)}|${norm(p.neighborhood || p.address || '')}`;
    if (seen.has(key)) warn(file, `paróquia duplicada: ${p.name} (${p.city}, ${p.neighborhood || p.address || 'sem bairro'})`); seen.add(key);
    if (/^(Capela|Igreja|Capelania|Miss[ãa]o|Orat[óo]rio|Comunidade|Mosteiro|Convento|Monjas|Monges|Abadia|Carmelo)\b/i.test(p.name || '')) console.log(`  · ${path.basename(file)}: unidade não paroquial (o importador ignora): ${p.name}`);
    // "Rede de Comunidades", "Área Pastoral/Missionária" e "Unidade Pastoral" são
    // unidades com pároco (Rio Grande, Mogi, São Miguel, Campo Limpo, S.J. do Rio Preto)
    else if (!p.name || !/^(Par[óo]quia|Catedral|Concatedral|Santu[áa]rio|Reitoria|Quase-par[óo]quia|Bas[íi]lica|Rede de Comunidades|[ÁA]rea (Pastoral|Mission[áa]ria)|Unidade Pastoral)/i.test(p.name)) warn(file, `nome sem prefixo padronizado: ${p.name}`);
    if (!p.city || !/^[A-Z]{2}$/.test(p.state ?? '')) warn(file, `${p.name}: city/state inválidos`);
    if (!p.slug) warn(file, `${p.name}: sem slug`);
    if (!CONF.has(p.confidence)) warn(file, `${p.name}: confidence inválida (${p.confidence})`); else totals.byConf[p.confidence] += 1;
    checkSources(file, p.name, p.sources);
    const commNames = new Set();
    const commPlain = new Set();
    for (const c of p.communities ?? []) {
      totals.communities += 1;
      if (!c.name) warn(file, `${p.name}: comunidade sem nome`);
      const ckey = `${norm(c.name)}|${norm(c.address || c.neighborhood || '')}`;
      if (commNames.has(ckey)) warn(file, `${p.name}: comunidade duplicada ${c.name} (mesmo endereço)`); commNames.add(ckey);
      commPlain.add(norm(c.name));
      if (c.confidence && !CONF.has(c.confidence)) warn(file, `${p.name}/${c.name}: confidence inválida`);
    }
    for (const s of p.schedules ?? []) {
      totals.schedules += 1;
      if (!Number.isInteger(s.dayOfWeek) || s.dayOfWeek < 0 || s.dayOfWeek > 6) warn(file, `${p.name}: dayOfWeek inválido (${s.dayOfWeek})`);
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.time ?? '')) warn(file, `${p.name}: time inválido (${s.time})`);
      if (s.type && !TYPES.has(String(s.type).toUpperCase())) warn(file, `${p.name}: type inválido (${s.type})`);
      const target = norm(s.community ?? 'Matriz');
      if (target && target !== 'matriz' && !/matriz|catedral|santuario/.test(target) && commPlain.size && ![...commPlain].some((n) => n.includes(target) || target.includes(n))) {
        warn(file, `${p.name}: horário aponta para comunidade não listada "${s.community}"`);
      }
      if (s.confidence && !CONF.has(s.confidence)) warn(file, `${p.name}: horário com confidence inválida`);
    }
  }
  console.log(`${path.basename(file)}: ${data.parishes.length} paróquias · ${data.parishes.reduce((a, p) => a + (p.communities?.length ?? 0), 0)} comunidades · ${data.parishes.reduce((a, p) => a + (p.schedules?.length ?? 0), 0)} horários · cobertura ${data.coverage?.parishesFound ?? '?'}/${data.coverage?.parishesExpected ?? '?'}`);
}

validateDioceses();
const uf = process.argv[2];
const base = path.join(ROOT, 'paroquias');
if (fs.existsSync(base)) {
  for (const dir of fs.readdirSync(base).filter((d) => !uf || d === uf)) {
    const full = path.join(base, dir);
    for (const f of fs.readdirSync(full).filter((f) => f.endsWith('.json'))) validateDioceseFile(path.join(full, f));
  }
}
console.log(`\nTotais: ${totals.dioceses} dioceses · ${totals.parishes} paróquias · ${totals.communities} comunidades · ${totals.schedules} horários · confiança alta ${totals.byConf.alta} / media ${totals.byConf.media} / baixa ${totals.byConf.baixa}`);
console.log(problems ? `\n${problems} problema(s) encontrado(s)` : '\nSem problemas de formato.');
process.exit(problems ? 1 : 0);
