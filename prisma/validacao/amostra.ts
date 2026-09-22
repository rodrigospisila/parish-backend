import { PrismaClient } from '@prisma/client';
import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Validação por evidência — passo 5: a AMOSTRA para conferência humana, montada do estado final do banco (não de uma rodada
 * do aplicador, que pode ter sido repetida). Sorteia N comunidades entre as que tiveram ação, estratificadas por tipo.
 *
 *   npx ts-node prisma/validacao/amostra.ts --piloto=<dir> [--n=30]
 */

const prisma = new PrismaClient();
const val = (n: string) => process.argv.find((a) => a.startsWith(`${n}=`))?.split('=').slice(1).join('=');
const PILOTO = val('--piloto'); const N = Number(val('--n')) || 30;
if (!PILOTO) { console.log('uso: --piloto=<dir> [--n=30]'); process.exit(1); }

const osmLink = (lat: number, lng: number) => `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`;

(async () => {
  const lotes = readdirSync(PILOTO).filter((a) => /^lote-\d+\.json$/.test(a)).flatMap((a) => JSON.parse(readFileSync(join(PILOTO, a), 'utf8')).comunidades as any[]);
  const doLote = new Map(lotes.map((c) => [c.id, c]));
  const verificacao: any[] = JSON.parse(readFileSync(join(PILOTO, 'verificacao.json'), 'utf8'));
  const urlDe = (id: string) => verificacao.find((v) => v.id === id)?.evidencias?.find((e: any) => e.status === 'confirmada')?.url as string | undefined;
  const atuais = await prisma.community.findMany({ where: { id: { in: lotes.map((c) => c.id) } }, select: { id: true, name: true, city: true, state: true, address: true, latitude: true, longitude: true, geoPrecision: true, geoSource: true, geoVerifiedBy: true, geoCandidates: { where: { status: 'PENDING', reason: { in: ['evidencia', 'endereco-oficial'] } }, select: { latitude: true, longitude: true, source: true, detail: true } } } });
  await prisma.$disconnect();

  type Linha = { grupo: string; nome: string; cidade: string; endereco: string; pino: string; novo?: string; fonte?: string; motivo: string };
  const linhas: Linha[] = [];
  for (const c of atuais) {
    const l = doLote.get(c.id); if (!l || c.latitude == null) continue;
    const by = c.geoVerifiedBy ?? '';
    const base = { nome: c.name, cidade: `${c.city}/${c.state}`, endereco: c.address ?? '', pino: osmLink(c.latitude, c.longitude as number), fonte: urlDe(c.id) };
    if (by.startsWith('usuario')) continue; // conferido pelo Rodrigo hoje — não é o piloto
    if (String(c.geoSource).endsWith('+evidencia')) linhas.push({ ...base, grupo: 'grava-duas-fontes', motivo: `coordenada publicada coincide com a sugestão ${String(c.geoSource).split('+')[0]}; pino gravado` });
    else if (by.startsWith('templo:')) linhas.push({ ...base, grupo: 'conferido-templo', motivo: `templo com o padroeiro a ≤ 150 m em fonte independente (${by.slice(7) === 'cnefe' ? 'Censo' : 'Overture'})` });
    else if (by === 'endereco-oficial+cnefe') linhas.push({ ...base, grupo: 'conferido-endereco', motivo: 'endereço oficial confere e o pino é o endereço com número no Censo' });
    else if (by.startsWith('evidencia:')) linhas.push({ ...base, grupo: 'conferido-coordenada', motivo: `coordenada publicada (${by.slice(10)}) a ≤ 150 m do pino` });
    else if (l.grupo === 'legado' && c.geoPrecision === 'CITY' && c.geoSource === 'ibge-municipio') linhas.push({ ...base, grupo: 'fora-do-municipio', motivo: `pino legado estava em ${l.pino.lat.toFixed(2)},${l.pino.lng.toFixed(2)} (fora do município) → centro do município` });
    else if (c.geoCandidates.length) { const g = c.geoCandidates[0]; linhas.push({ ...base, grupo: 'sugestao', novo: osmLink(g.latitude, g.longitude), fonte: (g.detail?.match(/https?:\/\/\S+/) ?? [base.fonte])[0], motivo: `sugestão nova na fila (${g.source})` }); }
  }
  const porGrupo = linhas.reduce((m: Record<string, Linha[]>, x) => { (m[x.grupo] ??= []).push(x); return m; }, {});
  console.log('ações no estado final:', Object.entries(porGrupo).map(([k, v]) => `${k} ${v.length}`).join(' · '));
  // estratificada: proporcional, mínimo 3 por grupo quando há
  let seed = 2026; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const grupos = Object.keys(porGrupo); const total = linhas.length; const escolhidas: Linha[] = [];
  for (const g of grupos) { const v = [...porGrupo[g]].sort(() => rnd() - 0.5); escolhidas.push(...v.slice(0, Math.max(3, Math.round((v.length / total) * N)))); }
  const amostra = escolhidas.sort(() => rnd() - 0.5).slice(0, N);
  const md = ['# Amostra para conferência humana — piloto Curitiba + Ponta Grossa', '', `${N} comunidades sorteadas entre as ${total} que tiveram ação (${Object.entries(porGrupo).map(([k, v]) => `${k} ${v.length}`).join(', ')}).`, '',
    'Como conferir: abra o **pino** (OpenStreetMap, com o satélite se preferir) e a **fonte**. Marque OK se o pino está na igreja (ou, na sugestão, se a sugestão está); ERRO se não. Critério do piloto: pelo menos 28 de 30 certas.', '',
    '| # | Comunidade | Endereço | Ação | Motivo | Pino | Fonte | OK? |', '|---|---|---|---|---|---|---|---|'];
  amostra.forEach((x, i) => md.push(`| ${i + 1} | ${x.nome} (${x.cidade}) | ${x.endereco.replace(/\|/g, '/')} | ${x.grupo} | ${x.motivo.replace(/\|/g, '/')} | [pino](${x.pino})${x.novo ? ` → [sugestão](${x.novo})` : ''} | ${x.fonte ? `[fonte](${x.fonte})` : '—'} | |`));
  writeFileSync(join(PILOTO, 'amostra-30.md'), md.join('\n'));
  console.log(`amostra: ${amostra.length} → ${join(PILOTO, 'amostra-30.md')}`);
})().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
