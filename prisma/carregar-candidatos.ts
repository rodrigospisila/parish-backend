import { PrismaClient } from '@prisma/client';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Leva para a FILA DE REVISÃO (tabela community_geo_candidates) o que as cargas de pino não gravaram sozinhas:
 *
 *   cache/sugestoes-fontes.json               geocode-fontes.ts --plan    conflito, fonte única recusada, disputa, mesmo ponto
 *   cache/sugestoes-suspeitos.json            geocode-fontes.ts --audit   pino nosso que duas fontes desmentem (e não se corrige sozinho)
 *   cache/enderecos/sugestoes-enderecos.json  geocode-enderecos.ts --audit  pino de máquina que o endereço no Censo desmente
 *
 *   npx ts-node prisma/carregar-candidatos.ts --dry-run
 *   npx ts-node prisma/carregar-candidatos.ts
 *
 * Recarregar é seguro: as sugestões PENDENTES são trocadas pelas novas; as já resolvidas (aceitas, descartadas ou
 * superadas por um pino posto à mão) ficam — e, como a sugestão é única por comunidade + fonte + coordenada, a que
 * alguém já descartou NÃO volta. Agregador de horários nunca entra aqui: enquanto não houver autorização, ele só confirma.
 */

const prisma = new PrismaClient();
const DRY = process.argv.includes('--dry-run');
const CACHE = join(__dirname, 'data', 'geo', 'cache');
const ARQUIVOS = [join(CACHE, 'sugestoes-fontes.json'), join(CACHE, 'sugestoes-suspeitos.json'), join(CACHE, 'enderecos', 'sugestoes-enderecos.json')];
const FONTES_PERMITIDAS = new Set(['cnefe', 'overture', 'cnefe-endereco']);

type Sugestao = { id: string; motivo: string; detalhe: string; opcoes: Array<{ fonte: string; lat: number; lng: number; rotulo: string }> };

(async () => {
  const linhas: Array<{ communityId: string; latitude: number; longitude: number; source: string; reason: string; label: string | null; detail: string | null }> = [];
  for (const arq of ARQUIVOS) {
    if (!existsSync(arq)) { console.log(`(ausente, pulado) ${arq}`); continue; }
    const sugestoes: Sugestao[] = JSON.parse(readFileSync(arq, 'utf8'));
    let n = 0;
    for (const s of sugestoes) for (const o of s.opcoes) {
      if (!FONTES_PERMITIDAS.has(o.fonte) || !Number.isFinite(o.lat) || !Number.isFinite(o.lng)) continue;
      linhas.push({ communityId: s.id, latitude: o.lat, longitude: o.lng, source: o.fonte, reason: s.motivo, label: o.rotulo?.slice(0, 200) || null, detail: s.detalhe?.slice(0, 400) || null });
      n += 1;
    }
    console.log(`${arq.split(/[\\/]/).slice(-2).join('/')}: ${sugestoes.length} comunidades · ${n} sugestões`);
  }
  // só entra quem ainda existe e não foi conferido por gente — pino MANUAL não precisa de sugestão de máquina
  const ids = [...new Set(linhas.map((l) => l.communityId))];
  const validas = new Set<string>();
  for (let i = 0; i < ids.length; i += 5000) {
    for (const c of await prisma.community.findMany({ where: { id: { in: ids.slice(i, i + 5000) }, deletedAt: null, NOT: { geoPrecision: 'MANUAL' } }, select: { id: true } })) validas.add(c.id);
  }
  const paraGravar = linhas.filter((l) => validas.has(l.communityId));
  const porMotivo = paraGravar.reduce((m: Record<string, number>, l) => { m[l.reason] = (m[l.reason] ?? 0) + 1; return m; }, {});
  console.log(`${DRY ? 'DRY RUN — ' : ''}sugestões a gravar: ${paraGravar.length} para ${new Set(paraGravar.map((l) => l.communityId)).size} comunidades · ${Object.entries(porMotivo).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  if (DRY) return;

  const saiu = await prisma.communityGeoCandidate.deleteMany({ where: { status: 'PENDING' } });
  let entrou = 0;
  for (let i = 0; i < paraGravar.length; i += 1000) entrou += (await prisma.communityGeoCandidate.createMany({ data: paraGravar.slice(i, i + 1000), skipDuplicates: true })).count;
  const fila = await prisma.communityGeoCandidate.groupBy({ by: ['status'], _count: { _all: true } });
  console.log(`pendentes antigas removidas: ${saiu.count} · gravadas: ${entrou} (as que faltam já tinham sido resolvidas por alguém)`);
  console.log(`tabela agora: ${fila.map((f) => `${f.status} ${f._count._all}`).join(' · ')}`);
})()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
