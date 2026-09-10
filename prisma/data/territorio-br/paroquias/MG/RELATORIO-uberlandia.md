# Diocese de Uberlândia (MG) — relatório de pesquisa

- **Arquivo**: `paroquias/MG/uberlandia.json`
- **Data da pesquisa**: 2026-09-10
- **Agente**: pesquisa do território — Triângulo Mineiro (Uberaba / Uberlândia / Ituiutaba)

## Resumo

| | |
|---|---|
| Paróquias no arquivo | **52** (48 paróquias, 1 catedral, 2 santuários, 1 capelania) |
| Confiança das paróquias | 52 alta, 0 media, 0 baixa |
| Municípios | 8 dos 9 do território (Grupiara é atendida pela paróquia de Estrela do Sul) |
| Foranias | 7 |
| Comunidades/capelas | **229** — 113 alta, 116 media |
| Horários fixos | **585** — 260 alta, 238 media, 87 baixa |
| Tipos de horário | 563 MASS, 19 ADORATION, 3 ROSARY |
| Paróquias sem nenhum horário | 1 (São João Batista, Cascalho Rico) |

Cobertura: **52 encontradas / 52 declaradas** pela própria diocese na página institucional
("52 paróquias, mais de 200 comunidades, 7 foranias, 9 municípios"). O catholic-hierarchy.org
registra 50 paróquias no Anuário Pontifício 2023 (dado de 2022) — a diferença são erecções
posteriores. **Cobertura completa.**

## Fontes principais

| Fonte | Uso |
|---|---|
| https://diocesedeuberlandia.org.br/paroquias/ | lista das 52 circunscrições por forania e município |
| https://diocesedeuberlandia.org.br/wp-json/wp/v2/paroquia?per_page=100 | **API REST do WordPress** — devolveu as 52 de uma vez, com slug, taxonomias (`cidade`, `forania`, `tipo-de-organizacao`) e, crucialmente, a data `modified` de cada página |
| https://diocesedeuberlandia.org.br/paroquias/&lt;slug&gt;/ (52 páginas) | pároco, vigários, diáconos, data de fundação, endereço com CEP, e-mail, telefone/WhatsApp, expediente da secretaria e a aba **"Horários de Missas"** com comunidade + endereço + horários |
| https://diocesedeuberlandia.org.br/sobre/ | 9 municípios, 7 foranias, bispo, criação (22/07/1961) |
| https://diocesedeuberlandia.org.br/contato/ | endereço, CEP, telefone e e-mail da Cúria |
| https://www.catholic-hierarchy.org/diocese/dubrl.html | nº esperado de paróquias |

**Nota de método**: o site é WordPress + Elementor. A API REST (`/wp-json/wp/v2/paroquia`) é
pública e resolve a lista inteira num único GET — foi o caminho mais barato. O conteúdo das
páginas (endereço, horários) **não** está exposto na API (o CPT não declara `content`), então as
52 páginas foram baixadas e lidas. A aba de horários é um `<div data-tab-index="3">` com
`<strong>Nome da comunidade</strong><br>endereço</p><p>Dia: horários</p>` — estrutura muito
regular, o que rendeu 229 comunidades com endereço próprio.

## Escala de confiança usada nos horários

A API entrega `modified` por paróquia, então a regra do README ("post ≤ 12 meses") pôde ser
aplicada literalmente:

- página atualizada **em ou depois de 2025-09-10** → horário `alta` (28 paróquias);
- página atualizada **antes disso** → horário `media` (**24 paróquias** — fonte oficial sem
  sinal de atualidade). Daí os 238 `media`, que **entram em produção** normalmente;
- recorrência **mensal** → `baixa` (87), independentemente da data.

Além disso:

- Linhas com dois pares dia+hora são divididas por dia (sem produto cartesiano).
- Intervalos (`de 9h às 11h30`) gravam só o início, com o texto original em `notes`.
- Missas mensais **sem dia da semana** (`Todo dia 15 do mês: 17h e 19h30`, `Todo dia 18 de cada
  mês`, `Santa Missa uma vez por mês / Data Móvel (Consultar Secretaria)`) **não geram registro**
  — não há `dayOfWeek` possível. A Paróquia Nossa Senhora Mãe dos Homens (Estrela do Sul) é o
  caso extremo: 12 comunidades listadas e só 3 horários gravados, porque as outras 9 são
  "uma vez por mês, data móvel".

## Regras de nome aplicadas

O site publica o título **sem prefixo** (só "São Pedro", "Cristo Rei"), com o tipo numa
taxonomia à parte. O prefixo foi reconstruído a partir dela:

- `tipo-de-organizacao: paroquia` → `Paróquia …` (49);
- `tipo-de-organizacao: santuario` → `Santuário …` (2: Nossa Senhora Aparecida e Nossa Senhora
  da Abadia, ambos em Uberlândia);
- `tipo-de-organizacao: capelania` → `Capelania …` (1: Jesus Bom Pastor, Uberlândia);
- `Catedral Santa Teresinha do Menino Jesus` já vinha com prefixo.

Homônimas na mesma cidade receberam o bairro no **slug** (não no nome) para evitar colisão:
`nossa-senhora-da-abadia-uberlandia-copacabana` (paróquia, forania São Marcos) e
`nossa-senhora-da-abadia-uberlandia-custodio-pereira` (santuário, forania São Lucas). O
`disambiguateNames` do importador cuida do nome exibido.

## Distribuição por município

| Município | Paróquias |
|---|---|
| Uberlândia | 37 |
| Araguari | 9 |
| Araporã, Cascalho Rico, Estrela do Sul, Indianópolis, Monte Alegre de Minas, Tupaciguara | 1 cada |

Grupiara não tem paróquia própria: é atendida pela Paróquia Nossa Senhora Mãe dos Homens
(Estrela do Sul), que mantém a Igreja São Sebastião em Grupiara como comunidade.

## Precisa de validação humana

1. **Capelania Jesus Bom Pastor (Uberlândia)** — a diocese a lista entre as 52 circunscrições,
   mas o `isNonParishUnit` do `import-territorio.ts` filtra nomes que começam com "Capelania".
   Ela **não entrará em produção**; suas 4 comunidades e 10 horários ficam só no dataset.
   Decisão de produto: virar paróquia, virar comunidade de outra paróquia, ou ficar de fora.
2. **Paróquia São João Batista (Cascalho Rico)** — nenhum horário, nenhum e-mail, nenhum
   telefone publicado. É a única paróquia da diocese em branco.
3. **24 de 52 páginas paroquiais não são atualizadas há mais de 12 meses** (a mais antiga é de
   03/06/2025). Os horários dessas paróquias foram gravados como `media` — entram no sistema,
   mas são o primeiro alvo do enxame de validação.
4. **Sem e-mail (10)**: Divino Espírito Santo Paráclito e N. Sra. do Rosário e São Benedito
   (Araguari); N. Sra. da Guia (Araporã); São João Batista (Cascalho Rico); N. Sra. Mãe dos
   Homens (Estrela do Sul); N. Sra. da Abadia (Tupaciguara); Bom Jesus, N. Sra. de Fátima,
   N. Sra. de Guadalupe e São Vicente de Paulo (Uberlândia). Em vários casos o site escreve
   literalmente "Email não informado".
5. **Sem ano de fundação (2)**: Divino Espírito Santo Paráclito (Araguari) e São José
   (Uberlândia).
6. **`website` quase sempre `null`** — só 3 paróquias declaram site externo ("Visite o Site");
   no caso da Catedral o link aponta para o próprio site diocesano e foi descartado. Facebook,
   Instagram e YouTube existem para a maioria e podem ser colhidos numa 2ª passada.
7. **Comunidades sem endereço próprio herdam o da paróquia** só quando são a matriz; as demais
   ficam com `address: null` quando o site não publicou.
8. **`Cemitério Bom Jesus`** aparece como comunidade da Paróquia São Sebastião (Araguari), com
   missa às segundas 08h — é capela de cemitério, decidir se deve figurar como comunidade.
9. **Bairro extraído por heurística** do endereço (o site não separa o campo). Está correto na
   grande maioria, mas é o campo mais frágil do arquivo.
