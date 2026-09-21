# Geolocalização das comunidades

Dois scripts, duas fases:

1. `prisma/geocode-territorio.ts` — deu **um pino a cada uma** das 53 mil comunidades
   (18/09/2026): CEP da sede paroquial, senão o centro do município.
2. `prisma/geocode-fontes.ts` — **sobe a precisão** de quem ficou no centro do
   município, cruzando o cadastro com bases abertas que trazem a coordenada do
   templo (21/09/2026).

## Arquivos

- `municipios.csv` e `estados.csv` — os 5.570 municípios do IBGE com latitude e
  longitude da sede ([kelvins/municipios-brasileiros](https://github.com/kelvins/municipios-brasileiros)).
- `casamento.cjs` + `casamento.test.cjs` — o casador de nomes (padroeiro, povoado,
  regras de unicidade). Funções puras, com testes: `node prisma/data/geo/casamento.test.cjs`.
- `preparar-cnefe.sh`, `preparar-malhas.sh`, `overture-br.sql` — montam o `cache/`.
- `backfill-origem.cjs` — preencheu `geoSource` nos pinos que já existiam.
- `cache/`, `cache-*.json`, `plano-*.json` — gerados, fora do git. Apagar só força a refazer.

## Precisão (`Community.geoPrecision`) e origem (`Community.geoSource`)

| Precisão | O que é | Entra no "missas por perto"? |
|---|---|---|
| `MANUAL` | pino posto ou conferido por uma pessoa (mapa do território, cadastro, GPS do app) | sim |
| `STREET` | nível de rua **ou melhor**: CEP específico da sede, endereço geocodificado, templo casado numa base aberta | sim |
| `LOCALITY` | centro do povoado/bairro declarado, ou um templo católico dele — aproximado | **não** |
| `CITY` | centro do município | **não** |
| nulo | pino legado, anterior ao campo | sim |

`geoSource` diz de onde veio a coordenada e permite auditar — ou desfazer — uma
fonte inteira: `manual`, `gps`, `cep`, `osm-endereco`, `cnefe`, `overture`,
`cnefe+overture`, `cnefe-localidade`, `cnefe-templo`, `ibge-municipio`,
`legado-centro`, `legado`.

`CITY` e `LOCALITY` ficam fora da busca por proximidade porque quarenta capelas
rurais empilhadas na praça da cidade apareceriam todas "a 2 km", quando estão a 20.

## A armadilha que molda tudo

O importador do território grava em **toda** comunidade o CEP — e, na falta de
endereço próprio, o endereço — **da paróquia**. Só a sede paroquial está de fato
ali. Por isso `STREET` por CEP vale só para a sede (comunidade com "matriz" ou
"catedral" no nome; na falta, "santuário" ou "basílica"; na falta, a comunidade
única da paróquia), e o casador ignora o endereço **herdado** ao procurar o povoado.

## Fase 1 — `geocode-territorio.ts`

```bash
npx ts-node prisma/geocode-territorio.ts --fetch          # lê o banco 1x, resolve, grava o plano
npx ts-node prisma/geocode-territorio.ts --apply          # grava (só quem está sem pino)
npx ts-node prisma/geocode-territorio.ts --refine         # endereço das sedes em CITY, 1 req/s no Nominatim
npx ts-node prisma/geocode-territorio.ts --apply-refine   # sobe CITY → STREET
```

Sede + CEP específico → AwesomeAPI/BrasilAPI; o resto → centro do município (IBGE);
nome de cidade que o IBGE não conhece → Nominatim por nome; refino das sedes pelo
endereço (`place_rank >= 26`).

## Fase 2 — `geocode-fontes.ts`

### As fontes

| Fonte | O que traz | Uso |
|---|---|---|
| **CNEFE** (IBGE, Censo 2022) | todo endereço do país com o GPS do recenseador; 580 mil estabelecimentos religiosos, 94 mil deles católicos; 429 mil localidades | **grava** — é a única que chega à zona rural |
| **Overture Maps** (Meta/Microsoft, CDLA Permissive) | 239 mil lugares com cara de templo, 38 mil católicos | **grava**, mas só em cima de um templo que o Censo também viu |
| agregador de horários de missa | 15 mil igrejas com coordenada | **só confirma ou contesta** — não vira pino sem autorização de uso |

Google Maps ficou de fora por contrato: os termos proíbem guardar coordenada além
de 30 dias e usá-la fora de um mapa do Google.

### Como casa

Dentro do **mesmo município** (pelo nome, senão pela malha do IBGE), o padroeiro
identifica o templo: "Capela N. Sra. Aparecida" ↔ "IGREJA CATOLICA NOSSA SENHORA
APARECIDA". A unicidade vale dos **dois lados** — duas "São José" nossas sem pino e
uma só na fonte não casam. Homônimas se resolvem pelo povoado, pelo bairro ou pela
rua. Sede só casa com sede e capela com capela. Templo em cima de uma homônima
nossa que já tem pino preciso está "tomado" — e templo **sem padroeiro**, em cima
de qualquer comunidade nossa já resolvida. O mesmo templo reivindicado por duas
comunidades não vai para nenhuma. A regra `matriz` ("IGREJA MATRIZ", sem
padroeiro) só vale onde temos **uma matriz só** no município. Tudo isso está em
`casamento.cjs`, com testes.

Três conferências de **lugar**, porque padroeiro igual não basta:

- o povoado/bairro que a comunidade declara (no nome ou no endereço próprio) é
  localizado nas localidades do Censo; candidato fora dele é descartado;
- sede da única paróquia do município fica a até 4 km do centro dele;
- capela a mais de 60 km da própria matriz não é dessa paróquia.

### O que grava

| Situação | Grava | Erro medido |
|---|---|---|
| duas fontes independentes a até 500 m uma da outra | `STREET` | < 1% acima de 5 km; 94% a até 1 km do pino que já tínhamos |
| uma fonte só, aprovada na política abaixo | `STREET` | desacordo de ~1–2% nas sedes e ~5% nas capelas |
| templo católico **sem padroeiro**, único no povoado declarado | `LOCALITY` (`cnefe-templo`) | 1 em 4 não é o templo da comunidade — por isso aproximado |
| nenhum templo casado, mas o povoado declarado existe no Censo | `LOCALITY` (`cnefe-localidade`) — centro dos endereços do povoado | mediana de ~0,5 km; extensão máxima aceita: 12 km |
| fontes em conflito (> 2 km), templo disputado, fonte única recusada | nada — vai para `cache/revisao-fontes.csv` | — |

**Política de fonte única** (`recusaDeFonteUnica`). Saiu da medição, não do palpite:
onde duas fontes casaram a mesma comunidade, contamos quando discordam.

- ponto da Overture sem templo do Censo a 300 m → recusa (página de capela rural
  costuma ser marcada "na cidade": 18% de erro, contra 5% com templo por perto);
- padroeiro só parecido, ou "a que sobrou", sem o lugar bater → recusa (40–50%);
- cidade de várias paróquias: a comunidade declara outro lugar → recusa (30–40%);
  templo a mais de 5 km da própria matriz → recusa (metade é a capela homônima de
  outra paróquia); matriz sem pino para conferir → recusa.

Por isso roda em **duas passadas**: primeiro as sedes, depois as capelas, que aí já
sabem onde fica a própria matriz.

### Comandos

```bash
bash prisma/data/geo/preparar-cnefe.sh     # ~2 GB do FTP do IBGE → 100 MB de extratos (retomável)
bash prisma/data/geo/preparar-malhas.sh    # malha municipal dos 27 estados
# Overture: com o DuckDB CLI, a partir de prisma/data/geo/cache/overture:  duckdb < ../../overture-br.sql

npx ts-node prisma/geocode-fontes.ts --audit             # erro contra os pinos JÁ precisos + pinos nossos suspeitos
npx ts-node prisma/geocode-fontes.ts --plan              # plano + tabelas de concordância entre fontes (só leitura)
npx ts-node prisma/geocode-fontes.ts --apply --dry-run
npx ts-node prisma/geocode-fontes.ts --apply [--so=predio|localidade]
npx ts-node prisma/geocode-fontes.ts --apply-correcoes   # ver abaixo
npx ts-node prisma/geocode-fontes.ts --desfazer=prisma/data/geo/cache/backup-....json
```

Todo `--apply` grava antes uma cópia (`cache/backup-*.json`) do que estava lá.
`--apply` só toca em pino `CITY`; `MANUAL`, `STREET` e legado nunca são sobrescritos.
O `--plan` tem uma rede final: dois pinos novos no mesmo ponto não gravam, vão para a revisão.

**Resultado em produção (21/09/2026):** 10.288 templos casados → `STREET`, 10.332
pinos de povoado → `LOCALITY`, 169 pinos de máquina corrigidos. Pino preciso foi de
14% para 33% das comunidades; entre as que têm missa cadastrada, de 25% para 49%.

### A auditoria também audita a gente

`--audit` finge que cada comunidade de pino preciso está no centro da cidade, casa
do mesmo jeito e mede a distância. Quando **duas fontes concordam entre si** e o
nosso pino está a mais de 2 km das duas, o suspeito é o nosso pino: CEP que o
serviço devolveu em outro bairro, endereço geocodificado na rua homônima. Esses
vão para `cache/pinos-suspeitos.csv`; os de origem de máquina (`cep`,
`osm-endereco`) com templo do Censo no ponto novo entram em
`cache/plano-correcoes.json`, aplicado por `--apply-correcoes`. Pino de gente
(`manual`, `gps`, legado) só gente corrige.

Mexer num pino que já existe pede mais que subir um do centro da cidade: só entra
na correção o casamento por regra forte (`unico` ou `localidade`) **na fonte que
grava e em quem confirma**, e duas comunidades corrigidas para o mesmo ponto saem
as duas.

### O incidente de Belo Horizonte (21/09/2026)

A primeira gravação mandou 28 matrizes de BH para a Catedral Cristo Rei. A regra
`matriz` valia para "a única matriz ainda sem pino" × "o único templo marcado como
matriz/catedral", sem olhar o padroeiro; a auditoria testa **uma sede por vez**, com
todas as outras dadas como resolvidas — então, em cidade grande, cada matriz virava
"a única sem pino" e casava com a catedral, no Censo e no agregador ao mesmo tempo
("duas fontes concordam"). Quem pegou foi a conferência pós-gravação (coordenada
repetida); tudo foi desfeito pelas cópias em minutos, corrigido e refeito.

O que ficou: (1) **conferir o plano antes de gravar**, não só depois — ponto
repetido, aglomerado, amostra com o nome do que casou (`casouCom`); (2) duas fontes
que casam pela MESMA regra fraca não são confirmação independente; (3) regra que
depende dos outros pinos não serve para julgar esses mesmos pinos.

## O que ainda falta

- **Fila de revisão** (`revisao-fontes.csv`): conflitos, disputas e fontes únicas
  recusadas já têm a coordenada candidata — falta mostrá-la no editor do mapa do
  território para um clique de confirmação.
- **Pinos antigos duvidosos**: `pinos-suspeitos.csv` lista os que duas fontes
  desmentem e não entraram na correção automática (legados, regra fraca); e ~21
  pinos novos caíram a menos de 50 m de OUTRA comunidade que já tinha pino — em
  geral é o pino antigo dessa outra que está errado, ou cadastro duplicado.
- **Capelas com endereço de rua próprio**: candidatas a geocodificação por endereço.
- **Quem não declara povoado nem tem templo com padroeiro nas fontes** só se
  resolve com gente: pino manual no mapa do território ou GPS pelo app.
