import { PrismaClient } from '@prisma/client';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Validação dos pinos por evidência — passo 1: montar os LOTES que os agentes vão ler.
 *
 *   npx ts-node prisma/validacao/montar-lotes.ts --dioceses="Curitiba,Ponta Grossa" [--tamanho=20] [--max=400] [--saida=<dir>]
 *   npx ts-node prisma/validacao/montar-lotes.ts --todas --grupos=rua,legado --so-com-missa --nome=onda1 --excluir=<dir do piloto>
 *
 * Cada lote é um JSON com ~20 comunidades, agrupadas por diocese e paróquia (o site da paróquia serve à matriz e às
 * capelas dela), com tudo o que o agente precisa: nome, paróquia e site, diocese e site, endereço, cidade, pino atual e
 * origem, grupo, se tem missa, e as sugestões que já estão na fila. Grava também o prompt de cada lote (prompt-NNN.md),
 * a partir de PROMPT-agente.md. Só leitura no banco.
 *
 * Quem entra, por prioridade (ver PLANO-validacao-pinos.md):
 *   rua            pino por CEP/Nominatim que o Censo não levou até a porta — a quadras da igreja, talvez;
 *   legado         origem desconhecida;
 *   nome-1-fonte   casado pelo nome com uma fonte só;
 *   aproximado     centro da cidade ou do povoado, com missa cadastrada (o agente pode achar a coordenada);
 *   endereco       endereço com número no Censo — amostra, para medir;
 *   nome-2-fontes  duas fontes concordam — amostra, para medir.
 * Ficam de fora: pino conferido por gente (MANUAL / geoVerifiedAt), pino de rua que o Censo confirma a < 60 m
 * (cache/enderecos/validados-censo.json, do `geocode-enderecos.ts --audit`) e quem já esteve num lote anterior (--excluir).
 */

const prisma = new PrismaClient();
const val = (n: string) => process.argv.find((a) => a.startsWith(`${n}=`))?.split('=').slice(1).join('=');
const flag = (n: string) => process.argv.includes(n);
const dioceses = (val('--dioceses') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const TODAS = flag('--todas');
const GRUPOS = (val('--grupos') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const SO_COM_MISSA = flag('--so-com-missa');
const EXCLUIR = (val('--excluir') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const TAMANHO = Number(val('--tamanho')) || 20;
const MAX = Number(val('--max')) || (TODAS ? 100000 : 400);
const NOME = val('--nome') ?? 'piloto';
const CACHE = join(__dirname, '..', 'data', 'geo', 'cache');
const SAIDA = val('--saida') ?? join(CACHE, 'validacao', `${NOME}-${new Date().toISOString().slice(0, 10)}`);
if (!dioceses.length && !TODAS) { console.log('uso: --dioceses="Curitiba,Ponta Grossa" | --todas  [--grupos=rua,legado] [--so-com-missa] [--excluir=<dir>] [--nome=onda1] [--tamanho=20] [--max=400]'); process.exit(1); }

const PRIORIDADE = ['rua', 'legado', 'nome-1-fonte', 'aproximado', 'endereco', 'nome-2-fontes'];
const grupoDe = (precisao: string | null, origem: string | null) => {
  if (precisao === 'CITY' || precisao === 'LOCALITY') return 'aproximado';
  if (!origem || origem === 'legado' || origem === 'legado-centro') return 'legado';
  if (origem === 'cep' || origem === 'osm-endereco') return 'rua';
  if (origem === 'cnefe-endereco' || origem === 'cnefe-endereco-oficial') return 'endereco';
  if (origem === 'cnefe+overture') return 'nome-2-fontes';
  return 'nome-1-fonte';
};
/** Menos que isso no fim de uma diocese: junta com a próxima diocese da mesma UF em vez de abrir um lote quase vazio. */
const RESTO_MINIMO = 10;

(async () => {
  const ds = await prisma.diocese.findMany({
    where: TODAS ? {} : { OR: dioceses.map((n) => ({ name: { contains: n, mode: 'insensitive' } })) },
    select: { id: true, name: true, state: true, website: true }, orderBy: [{ state: 'asc' }, { name: 'asc' }],
  });
  if (!ds.length) throw new Error('nenhuma diocese casou com ' + dioceses.join(', '));
  console.log(TODAS ? `dioceses: todas (${ds.length})` : `dioceses: ${ds.map((d) => `${d.name} (${d.state})`).join(' · ')}`);
  const lidas = await prisma.community.findMany({
    where: { deletedAt: null, ...(TODAS ? {} : { parish: { dioceseId: { in: ds.map((d) => d.id) } } }) },
    select: {
      id: true, name: true, address: true, city: true, state: true, zipCode: true, latitude: true, longitude: true, geoPrecision: true, geoSource: true, geoVerifiedAt: true,
      parish: { select: { id: true, name: true, address: true, city: true, website: true, dioceseId: true } },
      _count: { select: { massSchedules: true } },
    },
  });
  // as sugestões pendentes numa consulta só (a relação aninhada estoura o limite de parâmetros do Postgres no país inteiro)
  const pendentes = await prisma.communityGeoCandidate.findMany({ where: { status: 'PENDING' }, select: { communityId: true, latitude: true, longitude: true, source: true, reason: true, label: true } });
  await prisma.$disconnect();
  const candidatasDe = new Map<string, typeof pendentes>();
  for (const p of pendentes) { if (!candidatasDe.has(p.communityId)) candidatasDe.set(p.communityId, []); candidatasDe.get(p.communityId)!.push(p); }
  const comunidades = lidas.map((c) => ({ ...c, geoCandidates: candidatasDe.get(c.id) ?? [] }));
  const dioceseDe = new Map(ds.map((d) => [d.id, d]));

  // quem já está resolvido sem agente: pino de rua que o Censo confirma na porta
  const arqValidados = join(CACHE, 'enderecos', 'validados-censo.json');
  const validados = new Set<string>(existsSync(arqValidados) ? (JSON.parse(readFileSync(arqValidados, 'utf8')) as Array<{ id: string }>).map((x) => x.id) : []);
  // e quem já esteve num lote anterior (piloto): já foi olhado, com ou sem evidência
  const jaOlhadas = new Set<string>();
  for (const dir of EXCLUIR) for (const a of readdirSync(dir).filter((a) => /^lote-\d+\.json$/.test(a))) for (const c of JSON.parse(readFileSync(join(dir, a), 'utf8')).comunidades) jaOlhadas.add(c.id);

  const R = { validadosCenso: 0, jaOlhadas: 0 };
  const itens = comunidades
    .filter((c) => c.latitude != null && c.geoPrecision !== 'MANUAL' && !c.geoVerifiedAt)
    .map((c) => ({ c, grupo: grupoDe(c.geoPrecision, c.geoSource), temMissa: c._count.massSchedules > 0 }))
    .filter((x) => x.grupo !== 'aproximado' || x.temMissa || x.c.geoCandidates.length > 0)
    .filter((x) => !GRUPOS.length || GRUPOS.includes(x.grupo))
    .filter((x) => !SO_COM_MISSA || x.temMissa)
    .filter((x) => { if (x.grupo === 'rua' && validados.has(x.c.id)) { R.validadosCenso += 1; return false; } return true; })
    .filter((x) => { if (jaOlhadas.has(x.c.id)) { R.jaOlhadas += 1; return false; } return true; });
  const porGrupo = itens.reduce((m: Record<string, number>, x) => { m[x.grupo] = (m[x.grupo] ?? 0) + 1; return m; }, {});
  console.log(`candidatas: ${itens.length} · ${Object.entries(porGrupo).map(([k, v]) => `${k} ${v}`).join(' · ')} · com missa ${itens.filter((x) => x.temMissa).length}`);
  console.log(`fora: validadas pelo Censo (< 60 m) ${R.validadosCenso} · já olhadas em lote anterior ${R.jaOlhadas}`);

  // prioridade: com missa primeiro, depois pelo grupo; corta no máximo; depois reordena por UF/diocese/paróquia para o lote
  itens.sort((a, b) => Number(b.temMissa) - Number(a.temMissa) || PRIORIDADE.indexOf(a.grupo) - PRIORIDADE.indexOf(b.grupo) || a.c.name.localeCompare(b.c.name));
  const escolhidas = itens.slice(0, MAX);
  const chaveDiocese = (id: string) => { const d = dioceseDe.get(id)!; return `${d.state}|${d.name}`; };
  escolhidas.sort((a, b) => chaveDiocese(a.c.parish.dioceseId).localeCompare(chaveDiocese(b.c.parish.dioceseId)) || a.c.parish.name.localeCompare(b.c.parish.name) || a.c.name.localeCompare(b.c.name));

  // lotes por diocese; o resto pequeno de uma diocese junta-se ao das dioceses seguintes (na ordem UF/nome, para ficarem
  // vizinhas) até fechar um lote — cada comunidade leva a própria diocese e o site dela
  type Item = (typeof escolhidas)[number];
  const grupos: Item[][] = [];
  let buffer: Item[] = [];
  const fecharBuffer = (tudo = false) => { while (buffer.length >= TAMANHO || (tudo && buffer.length)) { grupos.push(buffer.slice(0, TAMANHO)); buffer = buffer.slice(TAMANHO); } };
  for (const d of ds) {
    const daDiocese = escolhidas.filter((x) => x.c.parish.dioceseId === d.id);
    if (!daDiocese.length) continue;
    let i = 0;
    for (; i + TAMANHO <= daDiocese.length; i += TAMANHO) grupos.push(daDiocese.slice(i, i + TAMANHO));
    const resto = daDiocese.slice(i);
    if (resto.length >= RESTO_MINIMO) grupos.push(resto);
    else { buffer.push(...resto); fecharBuffer(); }
  }
  fecharBuffer(true);

  if (!existsSync(SAIDA)) mkdirSync(SAIDA, { recursive: true });
  if (!existsSync(join(SAIDA, 'resultados'))) mkdirSync(join(SAIDA, 'resultados'));
  const modelo = readFileSync(join(__dirname, 'PROMPT-agente.md'), 'utf8');
  const largura = String(grupos.length).length > 2 ? 3 : 2;
  const lotes: Array<{ arquivo: string; dioceses: string[]; uf: string; n: number; comMissa: number }> = [];
  grupos.forEach((g, idx) => {
    const n = idx + 1; const num = String(n).padStart(largura, '0');
    const arquivo = join(SAIDA, `lote-${num}.json`);
    const dsDoLote = [...new Set(g.map((x) => x.c.parish.dioceseId))].map((id) => dioceseDe.get(id)!);
    const comunidadesDoLote = g.map(({ c, grupo, temMissa }) => ({
      id: c.id, nome: c.name, endereco: c.address, cidade: c.city, uf: c.state, cep: c.zipCode,
      paroquia: { nome: c.parish.name, endereco: c.parish.address, cidade: c.parish.city, site: c.parish.website },
      diocese: { nome: dioceseDe.get(c.parish.dioceseId)!.name, site: dioceseDe.get(c.parish.dioceseId)!.website },
      pino: { lat: c.latitude, lng: c.longitude, precisao: c.geoPrecision, origem: c.geoSource }, grupo, temMissa,
      sugestoesNaFila: c.geoCandidates.map((cand) => ({ lat: cand.latitude, lng: cand.longitude, fonte: cand.source, motivo: cand.reason, rotulo: cand.label })),
    }));
    writeFileSync(arquivo, JSON.stringify({ lote: n, diocese: dsDoLote.map((d) => d.name).join(' / '), dioceses: dsDoLote.map((d) => ({ nome: d.name, site: d.website })), uf: dsDoLote[0].state, siteDiocese: dsDoLote.length === 1 ? dsDoLote[0].website : null, comunidades: comunidadesDoLote }, null, 1));
    const sites = dsDoLote.map((d) => `${d.name}: ${d.website ?? 'sem site cadastrado — procure'}`).join('; ');
    const posix = (p: string) => p.replace(/\\/g, '/');
    writeFileSync(join(SAIDA, `prompt-${num}.md`), modelo.replace(/\{\{LOTE\}\}/g, posix(arquivo)).replace(/\{\{SAIDA\}\}/g, posix(join(SAIDA, 'resultados', `lote-${num}`))).replace(/\{\{SITE_DIOCESE\}\}/g, sites));
    lotes.push({ arquivo, dioceses: dsDoLote.map((d) => d.name), uf: dsDoLote[0].state, n: comunidadesDoLote.length, comMissa: comunidadesDoLote.filter((c) => c.temMissa).length });
  });
  writeFileSync(join(SAIDA, 'indice.json'), JSON.stringify({ criadoEm: new Date().toISOString(), nome: NOME, grupos: GRUPOS, soComMissa: SO_COM_MISSA, dioceses: TODAS ? 'todas' : ds.map((d) => d.name), lotes }, null, 1));
  const g2 = escolhidas.reduce((m: Record<string, number>, x) => { m[x.grupo] = (m[x.grupo] ?? 0) + 1; return m; }, {});
  console.log(`escolhidas: ${escolhidas.length} (com missa ${escolhidas.filter((x) => x.temMissa).length}) · ${Object.entries(g2).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  const porUf = lotes.reduce((m: Record<string, number>, l) => { m[l.uf] = (m[l.uf] ?? 0) + 1; return m; }, {});
  console.log(`${lotes.length} lotes em ${SAIDA} · por UF: ${Object.entries(porUf).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  if (lotes.length <= 30) for (const l of lotes) console.log(`  ${l.arquivo.split(/[\\/]/).pop()}  ${l.dioceses.join(' / ')}  ${l.n}`);
})().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
