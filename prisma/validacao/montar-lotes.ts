import { PrismaClient } from '@prisma/client';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Validação dos pinos por evidência — passo 1: montar os LOTES que os agentes vão ler.
 *
 *   npx ts-node prisma/validacao/montar-lotes.ts --dioceses="Curitiba,Ponta Grossa" [--tamanho=20] [--max=400] [--saida=<dir>]
 *
 * Cada lote é um JSON com ~20 comunidades da MESMA diocese, agrupadas por paróquia (o site da paróquia serve à
 * matriz e às capelas dela), com tudo o que o agente precisa: nome, paróquia e site, diocese e site, endereço, cidade,
 * pino atual e origem, grupo, se tem missa, e as sugestões que já estão na fila. Só leitura no banco.
 *
 * Quem entra, por prioridade (ver PLANO-validacao-pinos.md):
 *   rua            pino por CEP/Nominatim que o Censo não levou até a porta — a quadras da igreja, talvez;
 *   legado         origem desconhecida;
 *   nome-1-fonte   casado pelo nome com uma fonte só;
 *   aproximado     centro da cidade ou do povoado, com missa cadastrada (o agente pode achar a coordenada);
 *   endereco       endereço com número no Censo — amostra, para medir;
 *   nome-2-fontes  duas fontes concordam — amostra, para medir.
 * Pino conferido por gente (MANUAL / geoVerifiedAt) fica de fora: já está resolvido.
 */

const prisma = new PrismaClient();
const val = (n: string) => process.argv.find((a) => a.startsWith(`${n}=`))?.split('=').slice(1).join('=');
const dioceses = (val('--dioceses') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const TAMANHO = Number(val('--tamanho')) || 20;
const MAX = Number(val('--max')) || 400;
const SAIDA = val('--saida') ?? join(__dirname, '..', 'data', 'geo', 'cache', 'validacao', `piloto-${new Date().toISOString().slice(0, 10)}`);
if (!dioceses.length) { console.log('uso: --dioceses="Curitiba,Ponta Grossa" [--tamanho=20] [--max=400]'); process.exit(1); }

const PRIORIDADE = ['rua', 'legado', 'nome-1-fonte', 'aproximado', 'endereco', 'nome-2-fontes'];
const grupoDe = (precisao: string | null, origem: string | null) => {
  if (precisao === 'CITY' || precisao === 'LOCALITY') return 'aproximado';
  if (!origem || origem === 'legado' || origem === 'legado-centro') return 'legado';
  if (origem === 'cep' || origem === 'osm-endereco') return 'rua';
  if (origem === 'cnefe-endereco') return 'endereco';
  if (origem === 'cnefe+overture') return 'nome-2-fontes';
  return 'nome-1-fonte';
};

(async () => {
  const ds = await prisma.diocese.findMany({ where: { OR: dioceses.map((n) => ({ name: { contains: n, mode: 'insensitive' } })) }, select: { id: true, name: true, state: true, website: true } });
  if (!ds.length) throw new Error('nenhuma diocese casou com ' + dioceses.join(', '));
  console.log('dioceses:', ds.map((d) => `${d.name} (${d.state})`).join(' · '));
  const comunidades = await prisma.community.findMany({
    where: { deletedAt: null, parish: { dioceseId: { in: ds.map((d) => d.id) } } },
    select: {
      id: true, name: true, address: true, city: true, state: true, zipCode: true, latitude: true, longitude: true, geoPrecision: true, geoSource: true, geoVerifiedAt: true,
      parish: { select: { id: true, name: true, address: true, city: true, website: true, dioceseId: true } },
      _count: { select: { massSchedules: true } },
      geoCandidates: { where: { status: 'PENDING' }, select: { latitude: true, longitude: true, source: true, reason: true, label: true } },
    },
  });
  await prisma.$disconnect();
  const dioceseDe = new Map(ds.map((d) => [d.id, d]));

  const itens = comunidades
    .filter((c) => c.latitude != null && c.geoPrecision !== 'MANUAL' && !c.geoVerifiedAt)
    .map((c) => ({ c, grupo: grupoDe(c.geoPrecision, c.geoSource), temMissa: c._count.massSchedules > 0 }))
    .filter((x) => x.grupo !== 'aproximado' || x.temMissa || x.c.geoCandidates.length > 0);
  const porGrupo = itens.reduce((m: Record<string, number>, x) => { m[x.grupo] = (m[x.grupo] ?? 0) + 1; return m; }, {});
  console.log(`candidatas ao piloto: ${itens.length} · ${Object.entries(porGrupo).map(([k, v]) => `${k} ${v}`).join(' · ')} · com missa ${itens.filter((x) => x.temMissa).length}`);

  // prioridade: com missa primeiro, depois pelo grupo; corta no máximo; depois reordena por diocese/paróquia para o lote
  itens.sort((a, b) => Number(b.temMissa) - Number(a.temMissa) || PRIORIDADE.indexOf(a.grupo) - PRIORIDADE.indexOf(b.grupo) || a.c.name.localeCompare(b.c.name));
  const escolhidas = itens.slice(0, MAX);
  escolhidas.sort((a, b) => a.c.parish.dioceseId.localeCompare(b.c.parish.dioceseId) || a.c.parish.name.localeCompare(b.c.parish.name) || a.c.name.localeCompare(b.c.name));

  if (!existsSync(SAIDA)) mkdirSync(SAIDA, { recursive: true });
  const lotes: Array<{ arquivo: string; diocese: string; n: number }> = [];
  let n = 0;
  for (const d of ds) {
    const daDiocese = escolhidas.filter((x) => x.c.parish.dioceseId === d.id);
    for (let i = 0; i < daDiocese.length; i += TAMANHO) {
      n += 1;
      const arquivo = join(SAIDA, `lote-${String(n).padStart(2, '0')}.json`);
      const comunidadesDoLote = daDiocese.slice(i, i + TAMANHO).map(({ c, grupo, temMissa }) => ({
        id: c.id, nome: c.name, endereco: c.address, cidade: c.city, uf: c.state, cep: c.zipCode,
        paroquia: { nome: c.parish.name, endereco: c.parish.address, cidade: c.parish.city, site: c.parish.website },
        diocese: { nome: d.name, site: d.website },
        pino: { lat: c.latitude, lng: c.longitude, precisao: c.geoPrecision, origem: c.geoSource }, grupo, temMissa,
        sugestoesNaFila: c.geoCandidates.map((g) => ({ lat: g.latitude, lng: g.longitude, fonte: g.source, motivo: g.reason, rotulo: g.label })),
      }));
      writeFileSync(arquivo, JSON.stringify({ lote: n, diocese: d.name, uf: d.state, siteDiocese: d.website, comunidades: comunidadesDoLote }, null, 1));
      lotes.push({ arquivo, diocese: d.name, n: comunidadesDoLote.length });
    }
  }
  writeFileSync(join(SAIDA, 'indice.json'), JSON.stringify({ criadoEm: new Date().toISOString(), dioceses: ds.map((d) => d.name), lotes }, null, 1));
  const g2 = escolhidas.reduce((m: Record<string, number>, x) => { m[x.grupo] = (m[x.grupo] ?? 0) + 1; return m; }, {});
  console.log(`escolhidas: ${escolhidas.length} (com missa ${escolhidas.filter((x) => x.temMissa).length}) · ${Object.entries(g2).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  console.log(`${lotes.length} lotes em ${SAIDA}`);
  for (const l of lotes) console.log(`  ${l.arquivo.split(/[\\/]/).pop()}  ${l.diocese}  ${l.n}`);
})().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
