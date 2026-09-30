// Lê os horários publicados pela Cúria da Arquidiocese do Rio de Janeiro (fonte
// OFICIAL) e grava no formato dos agentes de horários, para o conferidor.
//
//   node prisma/horarios/ler-arqrio.cjs <pasta-do-piloto> [--limite N]
//
// Entrada: <pasta>/retrato.json (banco, somente leitura) e o JSON da carga do
//          território (ponte paróquia → código da Cúria).
// Saída:   <pasta>/paginas/<sha1 da URL>.html (cópia das páginas lidas),
//          <pasta>/resultados/lote-01.json e <pasta>/leitura.json (relatório).
//
// Páginas lidas (públicas, as mesmas que o site da Cúria abre no navegador):
//   https://arqrio.com.br/curia/ajaxParoquiasRecuperarDetalhes.php?id=<paróquia>
//   https://arqrio.com.br/curia/ajaxExibeAtividadesLocal.php?id=<local de culto>
// Uma requisição por vez, com pausa, sem dado pessoal em cabeçalho.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { lerRecorrencia } = require('../data/territorio-br/recorrencia.cjs');

const dir = process.argv[2];
if (!dir) throw new Error('Informe a pasta do piloto');
const limiteArg = process.argv.indexOf('--limite');
const LIMITE = limiteArg > 0 ? Number(process.argv[limiteArg + 1]) : Infinity;

const UA = 'ParishApp/1.0 (conferencia de horarios de paroquias)';
const PAUSA_MS = 350;
const BASE = 'https://arqrio.com.br/curia';
const HOJE = new Date().toISOString().slice(0, 10);
const TERRITORIO = path.join(__dirname, '..', 'data', 'territorio-br', 'paroquias', 'RJ', 'sao-sebastiao-do-rio-de-janeiro.json');

const norm = (s) =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&nbsp;/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
const texto = (html) =>
  html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const dormir = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

const pagDir = path.join(dir, 'paginas');
fs.mkdirSync(pagDir, { recursive: true });
fs.mkdirSync(path.join(dir, 'resultados'), { recursive: true });
const arquivoDe = (url) => path.join(pagDir, `${crypto.createHash('sha1').update(url).digest('hex')}.html`);

let baixadas = 0;
function abrir(url) {
  const arq = arquivoDe(url);
  if (fs.existsSync(arq)) return fs.readFileSync(arq, 'utf8');
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    try {
      const out = execFileSync('curl', ['-s', '-L', '-m', '40', '--compressed', '-A', UA, '-w', '\n%{http_code}', url], { maxBuffer: 20 * 1024 * 1024 }).toString('utf8');
      const i = out.lastIndexOf('\n');
      const status = Number(out.slice(i + 1));
      if (status === 200) {
        const corpo = out.slice(0, i);
        fs.writeFileSync(arq, corpo);
        baixadas++;
        dormir(PAUSA_MS);
        return corpo;
      }
      if (status === 429 || status >= 500) dormir(5000 * tentativa);
      else return null;
    } catch {
      dormir(3000 * tentativa);
    }
  }
  return null;
}

// ---------- categorias da Cúria → tipos do Parish ----------
const TIPO = (categoria) => {
  const c = norm(categoria);
  if (/^missa/.test(c)) return 'MASS';
  if (/confiss/.test(c)) return 'CONFESSION';
  if (/adoracao|santissimo|hora santa/.test(c)) return 'ADORATION';
  if (/^terco|^rosario/.test(c)) return 'ROSARY';
  return null;
};
const DIA = (t) => {
  const d = norm(t);
  if (/^domingo$/.test(d)) return 0;
  const m = d.match(/^(segunda|terca|quarta|quinta|sexta)( feira)?$/);
  if (m) return ['segunda', 'terca', 'quarta', 'quinta', 'sexta'].indexOf(m[1]) + 1;
  if (/^sabado$/.test(d)) return 6;
  return null;
};

/** Atividades de um local: [{ categoria, linha (literal), dia, itens: [{ time, nota }] }] */
function lerAtividades(html) {
  const blocos = [];
  const re = /<span[^>]*>([^<]+)<\/span>\s*<br\s*\/?>\s*<ul>([\s\S]*?)<\/ul>/gi;
  let m;
  while ((m = re.exec(html))) {
    const categoria = texto(m[1]);
    for (const li of m[2].split(/<li[^>]*>/i).slice(1)) {
      const linha = texto(li);
      if (!linha) continue;
      const corte = linha.indexOf(' - ');
      const diaTxt = linha.startsWith('- ') ? '' : corte >= 0 ? linha.slice(0, corte) : '';
      const itens = [];
      const rh = /(\d{1,2}):(\d{2})\s*h(?:\s*\(([^)]*)\))?/g;
      let h;
      while ((h = rh.exec(linha))) itens.push({ time: `${h[1].padStart(2, '0')}:${h[2]}`, nota: (h[3] || '').trim() || null });
      blocos.push({ categoria, linha, dia: DIA(diaTxt), diaTxt, itens });
    }
  }
  return blocos;
}

/** Locais de culto da ficha da paróquia: [{ id, nome, temAtividades }] */
function lerLocais(html) {
  const i = html.search(/Locais de culto/i);
  if (i < 0) return [];
  const locais = [];
  for (const li of html.slice(i).split(/<li>/i).slice(1)) {
    const nome = texto(li.split(/&nbsp;|<a |<div|<br/i)[0]);
    const ati = li.match(/exibirAtividades\((\d+)/);
    const div = li.match(/id="DIV(?:MAP|ATI)?(\d+)"/);
    const id = ati ? Number(ati[1]) : div ? Number(div[1]) : null;
    if (nome) locais.push({ id, nome, temAtividades: !!ati });
  }
  return locais;
}

// ---------- ponte: paróquia do banco ↔ código da Cúria ----------
const retrato = JSON.parse(fs.readFileSync(path.join(dir, 'retrato.json'), 'utf8'));
const porParoquia = new Map();
for (const c of retrato) {
  if (!porParoquia.has(c.parish.id)) porParoquia.set(c.parish.id, { id: c.parish.id, nome: c.parish.name, comunidades: [] });
  porParoquia.get(c.parish.id).comunidades.push(c);
}
const doBanco = new Map([...porParoquia.values()].map((p) => [norm(p.nome), p]));
const territorio = JSON.parse(fs.readFileSync(TERRITORIO, 'utf8'));

const relatorio = { paroquiasNoTerritorio: territorio.parishes.length, semCodigo: [], semParoquiaNoBanco: [], fichaNaoAbriu: [], locaisSemComunidade: [], semDia: [], naoEhMissa: [], categorias: {}, requisicoes: 0 };
const paroquias = [];
let feitas = 0;

for (const p of territorio.parishes) {
  if (feitas >= LIMITE) break;
  const fonte = (p.sources || []).map((s) => s.url.match(/RecuperarDetalhes\.php\?id=(\d+)/)).find(Boolean);
  if (!fonte) { relatorio.semCodigo.push(p.name); continue; }
  const banco = [p.name, `${p.name} (${p.neighborhood})`].map((n) => doBanco.get(norm(n))).find(Boolean);
  if (!banco) { relatorio.semParoquiaNoBanco.push(`${p.name} | ${p.neighborhood}`); continue; }
  feitas++;

  const urlFicha = `${BASE}/ajaxParoquiasRecuperarDetalhes.php?id=${fonte[1]}`;
  const ficha = abrir(urlFicha);
  if (!ficha) { relatorio.fichaNaoAbriu.push(p.name); continue; }

  const achados = [];
  const observacoes = [];
  const fontes = [{ url: urlFicha, titulo: 'Ficha da paróquia na Cúria Metropolitana (ArqRio)', tipo: 'site-diocese', lida: true, data: null }];
  const usadas = new Set();

  for (const local of lerLocais(ficha)) {
    // Comunidade do banco com o mesmo nome (a carga do território usou os nomes da Cúria)
    const candidatas = banco.comunidades.filter((c) => norm(c.name) === norm(local.nome) && !usadas.has(c.id));
    const comunidade = candidatas[0];
    if (!comunidade) { relatorio.locaisSemComunidade.push(`${banco.nome} › ${local.nome}`); continue; }
    usadas.add(comunidade.id);
    if (!local.temAtividades || !local.id) continue;

    const urlAti = `${BASE}/ajaxExibeAtividadesLocal.php?id=${local.id}`;
    const html = abrir(urlAti);
    if (!html) { observacoes.push(`Atividades de "${local.nome}" não abriram.`); continue; }
    fontes.push({ url: urlAti, titulo: `Atividades do local de culto — ${local.nome}`, tipo: 'site-diocese', lida: true, data: null });

    for (const b of lerAtividades(html)) {
      relatorio.categorias[b.categoria] = (relatorio.categorias[b.categoria] || 0) + b.itens.length;
      const type = TIPO(b.categoria);
      if (!type || !b.itens.length) continue;
      if (b.dia == null) { relatorio.semDia.push(`${banco.nome} › ${local.nome} › ${b.categoria}: ${b.linha}`); continue; }
      for (const it of b.itens) {
        // "Celebração da Palavra" vem na categoria Missa, mas não é missa (não tem padre)
        if (type === 'MASS' && /celebra[cç][aã]o da palavra|culto ecum/i.test(it.nota || '')) {
          relatorio.naoEhMissa.push(`${banco.nome} › ${local.nome}: ${b.linha}`);
          continue;
        }
        // Mesma regra da carga do território: a nota diz se é mensal; na dúvida, semanal com a nota.
        // Mas nota com cara de mensal que não deu para ler ("Segunda Sexta do mês") NÃO vira
        // semanal sozinha: vai para conferência humana (confiança baixa).
        const rec = lerRecorrencia(it.nota);
        const pareceMensal = !rec && /\bm[eê]s\b|mensal|primeir|terceir|[uú]ltim|\b[1-5] ?[ºªo°]|\bdia \d/i.test(it.nota || '');
        achados.push({
          parishId: banco.id,
          communityId: comunidade.id,
          type,
          dayOfWeek: rec ? rec.dayOfWeek : b.dia,
          time: it.time,
          endTime: null,
          recurrence: rec ? rec.recurrence : 'WEEKLY',
          weeksOfMonth: rec ? rec.weeksOfMonth : [],
          dayOfMonth: rec ? rec.dayOfMonth : null,
          notes: it.nota ? it.nota.slice(0, 120) : null,
          evidenceUrl: urlAti,
          evidenceQuote: b.linha.slice(0, 200),
          sourceKind: 'site-diocese',
          sourceDate: null,
          confidence: pareceMensal ? 'baixa' : 'alta',
          categoriaNaFonte: b.categoria,
        });
      }
    }
  }
  paroquias.push({ parishId: banco.id, fontes, achados, contestados: [], semHoraFixa: [], pistas: [], observacoes: observacoes.join(' ') });
  if (feitas % 25 === 0) console.log(`${feitas} paróquias lidas · ${baixadas} páginas baixadas`);
}

relatorio.requisicoes = baixadas;
relatorio.paroquiasLidas = paroquias.length;
relatorio.achados = paroquias.reduce((n, p) => n + p.achados.length, 0);
fs.writeFileSync(path.join(dir, 'resultados', 'lote-01.json'), JSON.stringify({ lote: 'arqrio', geradoEm: HOJE, paroquias }, null, 1));
fs.writeFileSync(path.join(dir, 'leitura.json'), JSON.stringify(relatorio, null, 1));
console.log(JSON.stringify({ ...relatorio, locaisSemComunidade: relatorio.locaisSemComunidade.length, semDia: relatorio.semDia.length, naoEhMissa: relatorio.naoEhMissa.length }, null, 1));
