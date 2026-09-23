import { spawnSync } from 'child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Validação por evidência — passo 2: CONFERIR o que os agentes disseram. Um agente afirma "o site diz X" com um URL e um
 * trecho literal; este script abre o URL e procura o trecho. O que não está lá é descartado. Dois alertas de agente na carga
 * do território eram falsos — daí a regra: nada de "o site diz" sem o trecho, e nada de trecho sem conferência.
 *
 *   npx ts-node prisma/validacao/verificar-evidencias.ts --piloto=<dir do piloto>
 *
 * Lê resultados/lote-*.jsonl (ou .json), grava verificacao.json e para-verificador.json (o que ficou sem confirmação,
 * para um segundo agente tentar — página que o fetch não abre, trecho reescrito).
 */

const val = (n: string) => process.argv.find((a) => a.startsWith(`${n}=`))?.split('=').slice(1).join('=');
const PILOTO = val('--piloto');
if (!PILOTO) { console.log('uso: --piloto=<dir>'); process.exit(1); }
const RESULTADOS = join(PILOTO, 'resultados');
const UA = 'ParishApp/1.0 (validacao de enderecos de paroquias)';
const MIN_TRECHO = 15;
const CURL_WINDOWS = 'C:/Windows/System32/curl.exe';

// Fonte proibida pelo plano (contrato do Google; agregadores sem autorização; guias de empresas)
const PROIBIDAS = /(^|\.)(google\.[a-z.]+|goo\.gl|maps\.app\.goo\.gl|horariodemissa\.com\.br|liriocatolico\.[a-z.]+|buscamissa\.[a-z.]+|missas\.com\.br|horariosdemissa\.[a-z.]+|missasonline\.[a-z.]+|apontador\.com\.br|telelistas\.net|cybo\.com|kekanto\.com\.br|encontracuritiba\.com\.br|guiamais\.com\.br)$/i;

type Evidencia = { url: string; trecho: string; tipo?: 'endereco' | 'coordenada'; status?: string; motivo?: string };
type Resultado = { id: string; nome: string; enderecoOficial: string | null; enderecoConfere: boolean | null; coordenada: { lat: number; lng: number; origem: string } | null; evidencias: Evidencia[]; observacao?: string; lote?: string };

// entidades HTML: numéricas (&#8211; &#x2013;) e as de letra acentuada (&ccedil; &atilde; &Eacute;) — o acento sai depois, no NFD;
// o travessão e as aspas tipográficas viram hífen/aspas simples, como o agente costuma copiar
const ENTIDADES: Record<string, string> = { nbsp: ' ', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', ndash: '-', mdash: '-', ordm: 'º', ordf: 'ª', deg: '°', rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"', hellip: '...' };
const decodifica = (s: string) => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([a-zA-Z])(acute|grave|tilde|circ|cedil|uml);/g, '$1')
  .replace(/&([a-z]+);/gi, (m, n) => ENTIDADES[n.toLowerCase()] ?? m)
  .replace(/[–—−]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/ /g, ' ');
const normaliza = (s: string) => decodifica(s).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
const semTags = (html: string) => html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ');
// truncado (não arredondado) em 3 casas: "-50.621" está em "-50.62169318"; o arredondado "-50.6217" não estaria
const numeros4 = (n: number) => (String(n).match(/^-?\d+\.\d{0,3}/) ?? [String(n)])[0];

const cache = new Map<string, { ok: boolean; status: number; html: string }>();
async function abrir(url: string) {
  if (cache.has(url)) return cache.get(url)!;
  let r = { ok: false, status: 0, html: '' };
  try {
    // 429/503 é limite de requisições (a Wikidata devolve isso com vários agentes consultando): espera e tenta de novo
    for (let tentativa = 1; tentativa <= 4; tentativa += 1) {
      const resp = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,application/json;q=0.9,*/*;q=0.8', 'Accept-Language': 'pt-BR,pt;q=0.9' }, redirect: 'follow', signal: AbortSignal.timeout(30000) });
      r = { ok: resp.ok, status: resp.status, html: resp.ok ? await resp.text() : '' };
      if (resp.status !== 429 && resp.status !== 503) break;
      await new Promise((f) => setTimeout(f, 5000 * tentativa));
    }
  } catch (e: any) {
    r = { ok: false, status: -1, html: String(e).slice(0, 80) };
    // site com cadeia de certificado incompleta (arquidiocesebh.org.br): o Node recusa; o curl do Windows (Schannel) busca o
    // intermediário e abre. Só para erro de certificado — nunca desliga a verificação de TLS.
    const codigo = String(e?.cause?.code ?? '');
    if (/CERT|VERIFY|SIGNATURE|ISSUER/.test(codigo) && existsSync(CURL_WINDOWS)) {
      const c = spawnSync(CURL_WINDOWS, ['-s', '-L', '-m', '30', '-A', UA, '-w', '\n%{http_code}', url], { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
      const saida = c.stdout ?? ''; const i = saida.lastIndexOf('\n'); const status = Number(saida.slice(i + 1));
      if (c.status === 0 && status >= 200 && status < 300) r = { ok: true, status, html: saida.slice(0, i) };
      else r = { ok: false, status: status || -1, html: `curl.exe: ${codigo}` };
    }
  }
  cache.set(url, r);
  await new Promise((f) => setTimeout(f, 400)); // gentileza com os sites das dioceses
  return r;
}

function lerResultados(): Resultado[] {
  const porId = new Map<string, Resultado>();
  for (const arq of readdirSync(RESULTADOS).filter((a) => /^lote-\d+\.(jsonl|json)$/.test(a)).sort()) {
    const texto = readFileSync(join(RESULTADOS, arq), 'utf8');
    const linhas: any[] = arq.endsWith('.jsonl')
      ? texto.split(/\r?\n/).filter((l) => l.trim()).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean)
      : (() => { try { const j = JSON.parse(texto); return Array.isArray(j) ? j : []; } catch { return []; } })();
    for (const l of linhas) if (l?.id) porId.set(l.id, { ...l, evidencias: Array.isArray(l.evidencias) ? l.evidencias : [], lote: arq.replace(/\.(jsonl|json)$/, '') }); // o .json (final) vem depois do .jsonl e prevalece
  }
  return [...porId.values()];
}

(async () => {
  const resultados = lerResultados();
  const R = { comunidades: resultados.length, evidencias: 0, confirmadas: 0, naoEncontradas: 0, falhaFetch: 0, proibidas: 0, curtas: 0 };
  const paraVerificador: Array<{ id: string; nome: string; evidencias: Evidencia[] }> = [];
  for (const r of resultados) {
    for (const e of r.evidencias) {
      R.evidencias += 1;
      let host = ''; try { host = new URL(e.url).hostname; } catch { e.status = 'url-invalida'; R.naoEncontradas += 1; continue; }
      // sites.google.com é hospedagem de site próprio (Google Sites), não o Google Maps: o conteúdo é da paróquia
      if (PROIBIDAS.test(host) && host !== 'sites.google.com') { e.status = 'fonte-proibida'; R.proibidas += 1; continue; }
      const trecho = normaliza(String(e.trecho ?? ''));
      if (trecho.length < MIN_TRECHO) { e.status = 'trecho-curto'; R.curtas += 1; continue; }
      // o site da Arquidiocese de Curitiba responde 200 com uma página genérica (endereço da Cúria) para slug inexistente:
      // o endereço da Cúria nunca é evidência de paróquia
      if (/jaime reis,? 369/.test(trecho)) { e.status = 'pagina-generica'; e.motivo = 'endereço da Cúria, não da paróquia'; R.naoEncontradas += 1; continue; }
      const pag = await abrir(e.url);
      if (!pag.ok) { e.status = 'falha-fetch'; e.motivo = `HTTP ${pag.status}`; R.falhaFetch += 1; continue; }
      const texto = normaliza(semTags(pag.html)); const cru = normaliza(pag.html);
      const achou = texto.includes(trecho) || cru.includes(trecho);
      // coordenada: além do trecho, os números têm de estar no HTML cru (parâmetro do mapa, JSON-LD, Wikidata)
      const coordOk = e.tipo !== 'coordenada' || !r.coordenada || (cru.includes(numeros4(r.coordenada.lat)) && cru.includes(numeros4(r.coordenada.lng)));
      if (achou && coordOk) { e.status = 'confirmada'; R.confirmadas += 1; }
      else { e.status = 'nao-encontrada'; e.motivo = !achou ? 'trecho não está na página' : 'os números da coordenada não estão no HTML'; R.naoEncontradas += 1; }
    }
    const pendentes = r.evidencias.filter((e) => e.status === 'nao-encontrada' || e.status === 'falha-fetch');
    if (pendentes.length) paraVerificador.push({ id: r.id, nome: r.nome, evidencias: pendentes });
  }
  writeFileSync(join(PILOTO, 'verificacao.json'), JSON.stringify(resultados, null, 1));
  writeFileSync(join(PILOTO, 'para-verificador.json'), JSON.stringify(paraVerificador, null, 1));
  const comAlgo = resultados.filter((r) => r.evidencias.some((e) => e.status === 'confirmada')).length;
  console.log(`comunidades com resultado: ${R.comunidades} · evidências: ${R.evidencias} → confirmadas ${R.confirmadas} · não encontradas ${R.naoEncontradas} · fetch falhou ${R.falhaFetch} · fonte proibida ${R.proibidas} · trecho curto ${R.curtas}`);
  console.log(`comunidades com ao menos uma evidência confirmada: ${comAlgo} · para o verificador (2ª tentativa): ${paraVerificador.length}`);
  const dominios = new Map<string, number>(); for (const r of resultados) for (const e of r.evidencias) if (e.status === 'confirmada') { const h = new URL(e.url).hostname; dominios.set(h, (dominios.get(h) ?? 0) + 1); }
  console.log('domínios confirmados:', [...dominios].sort((a, b) => b[1] - a[1]).map(([h, n]) => `${h} ${n}`).join(' · '));
})().catch((e) => { console.error(e); process.exit(1); });
