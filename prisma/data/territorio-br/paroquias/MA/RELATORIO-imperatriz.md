# Diocese de Imperatriz (MA) — relatório de pesquisa

- **Arquivo**: `paroquias/MA/imperatriz.json`
- **Data da coleta**: 2026-09-11
- **Cobertura**: **34 / 34 paróquias (100%)**
- **Comunidades**: 141 (inclui 33 matrizes)
- **Horários fixos**: 263 (122 `media`, 141 `baixa`, 0 `alta`)

## Fontes principais

| Fonte | Uso |
|---|---|
| `https://diocesedeimperatriz.org.br/wp-json/wp/v2/paroquias?per_page=100` | Listagem canônica das paróquias. `X-WP-Total: 34` |
| `https://diocesedeimperatriz.org.br/paroquias/<slug>/` (34 páginas) | Endereço, CEP, telefone, WhatsApp, e-mail, site, pároco, ano de criação, cidade, microrregião |
| `https://diocesedeimperatriz.org.br/locais-sitemap.xml` | 142 URLs do tipo `locais` (comunidades + matrizes) |
| `https://diocesedeimperatriz.org.br/locais/<slug>/` (141 páginas) | Nome da comunidade, paróquia-mãe, endereço e **grade de missas por comunidade** |
| `https://diocesedeimperatriz.org.br/paroquias-sitemap.xml` | Confere as mesmas 34 URLs da API (35 entradas = 34 + a página de arquivo) |
| `https://www.catholic-hierarchy.org/diocese/dimpe.html` | Nº esperado de paróquias: **34** (Anuário Pontifício 2024, dados de 2023) |

## O que funcionou

O site é WordPress com **três tipos personalizados expostos**: `paroquias` (34), `clero` (53) e
`horarios` (3). O caminho decisivo, porém, foi descobrir um **quarto tipo, `locais`, que não aparece
em `/wp-json/wp/v2/types`** mas tem sitemap próprio: cada comunidade e cada matriz é um post com
página própria contendo a paróquia-mãe, o endereço e a tabela de horários. Foi daí que saíram as
141 comunidades e os 263 horários.

Detalhe que quase custou dados: a página da paróquia mostra o acordeão de comunidades **limitado a
10**. Quatro paróquias paravam exatamente em 10 — a lista completa estava nos links relacionais
(`dce-acf-relational-post-link`) e, mais completa ainda, no sitemap de `locais`. Senador La Rocque
tem 25 comunidades, não 10.

E-mails vêm ofuscados pelo Cloudflare (`data-cfemail`) e foram decodificados.

## Por que quase nada é `alta` nos horários

O `lastmod` do sitemap de `locais` é **2024-02-21** e o de `paroquias` é **2023-02-26** — fonte
oficial, mas **sem sinal de atualidade nos últimos 12 meses**. Pela escala do README isso é `media`,
não `alta`. Os dados cadastrais das paróquias (endereço, telefone, pároco) ficaram `alta` porque são
a publicação oficial da diocese e não caducam da mesma forma que uma grade de missa.

## Os 141 horários `baixa` — três motivos

1. **Recorrência mensal** (~89 registros): "1º Domingo do Mês", "3º Sábado do Mês",
   "Último Sábado do Mês". `dayOfWeek` recebe o dia da semana e a **regra literal vai em `notes`**.
   É a norma nas comunidades rurais da diocese, não a exceção.
2. **Recorrência por dia do mês** (5 registros): "Dia 13 de cada mês" (missa votiva de N. Sra. de
   Fátima, na Catedral), "Dia 15", "Dia 19". Não têm dia da semana — `dayOfWeek: null` e a regra
   literal em `notes`. O importador descarta entrada com `dayOfWeek` fora de 0–6, então não há risco.
3. **Celebração da Palavra** (52 registros): a fonte distingue "Missa" de "Celebração da Palavra"
   (sem padre). Como o enum `MassScheduleType` só tem MASS/CONFESSION/ADORATION/ROSARY, esses
   registros ficam `type: "MASS"` mas com `confidence: "baixa"` e `notes` dizendo
   *"Celebração da Palavra (sem missa), conforme a fonte"* — assim **não entram em produção como
   missa** e ficam preservados para o enxame de validação decidir. Em várias comunidades rurais é a
   única celebração fixa que existe.

## Precisa de validação humana

1. **`Paróquia Santa Rita de Cássia` em Governador Edison Lobão — nome provavelmente errado no
   site.** O título do post é "Paróquia Santa Rita de Cássia – Gov. Edison Lobão", mas a matriz
   cadastrada é **"Matriz – Paróquia Maria Mãe da Igreja"**, o e-mail é `maedaigrejast@gmail.com`,
   o site é `linktr.ee/Paroquiamariamaedaigreja` e 5 das 12 comunidades ficam no bairro "Mãe da
   Igreja". Tudo indica que a paróquia se chama **Paróquia Maria Mãe da Igreja**. Mantive o título
   oficial do site como `name` (regra: usar o nome da fonte oficial), mas isto deve ser corrigido.
   Agrava o risco existir outra `Paróquia Santa Rita de Cássia` de verdade, em Imperatriz.
2. **`Paróquia São Rafael` (Açailândia)** — a matriz está cadastrada como
   "Matriz – **Área Pastoral** São Rafael". Pode ser área pastoral e não paróquia ainda; o Anuário
   conta 34, o que bate com ela dentro. Confirmar o status canônico.
3. **19 das 34 paróquias não publicam nenhum horário** (Açailândia inteira menos São Francisco,
   Cidelândia, Davinópolis, Itinga, João Lisboa, São Pedro da Água Branca, Brejão e 7 de Imperatriz).
   A matriz existe no cadastro, mas com tabela de missas vazia. Não é falha da coleta: o campo está
   em branco na fonte.
4. **`Paróquia São José` (Imperatriz, criada em 2022)** é a única sem ficha preenchida — sem
   endereço, sem contato, sem comunidade. Só o nome, a cidade e o pároco (Pe. Sandro Lima, que
   também consta como pároco de N. Sra. da Penha em Vila Nova dos Martírios). `communities: []`,
   o importador cria a matriz sozinho.
5. **Conflito de grade na Catedral.** A página da paróquia lista 15 horários e a página do local
   (`/locais/catedral-nossa-senhora-de-fatima-centro/`) lista 18, com divergência real no domingo
   (16:00 na página da paróquia × 17:00 na do local) e missas a mais na quarta, quinta e sábado.
   Adotei a página de `locais`, que é a mais recente (lastmod 2024-02 contra 2023-02). Vale conferir.
6. **Ano de criação**: 28 das 34 têm ano preenchido, com valores variados (1953 a 2022) e sem
   repetição em massa — não parecem data de cadastro no CMS. Mantidos.
7. **Cidade "Amarante"** aparece assim no campo da ficha; usei **Amarante do Maranhão**, que é como
   a própria taxonomia do site grafa (`secao_paroquia-amarante-do-maranhao`) e é o nome do município.
8. Duas comunidades da Paróquia N. Sra. da Assunção (Senador La Rocque) têm endereço em **Buritirana
   e João Lisboa**, municípios de outras paróquias da diocese — provável atendimento cruzado em
   povoado de divisa. Não alterei; `city` da paróquia continua Senador La Rocque.
9. `Paróquia Santo Antônio de Pádua` (Davinópolis) e `Paróquia Sagrado Coração de Jesus`
   (Amarante do Maranhão) têm **o mesmo endereço** na fonte ("Rua Dom Cesário, nº 203, Santo
   Antônio, CEP 65927-000"). Um dos dois está errado no site.

## Não consultado

Não foi preciso recorrer a `minhareceita.org`, Anuário Católico nem agregadores: a própria diocese
fecha a lista e ela bate com o Anuário Pontifício. Agregadores foram descartados de propósito —
acrescentariam horário de qualidade pior sobre uma base oficial já completa.
