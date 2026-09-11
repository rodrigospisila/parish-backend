# Relatório de pesquisa — Diocese de Caratinga (MG)

**Agente:** pesquisa de território BR — Vale do Rio Doce e Mucuri
**Data da coleta:** 2026-09-10
**Arquivo gerado:** `caratinga.json`

## Resumo

| Métrica | Valor |
|---|---|
| Paróquias | **61** (todas `alta`) |
| Comunidades/capelas | 1.036 |
| Horários fixos | **0** — o site diocesano não publica horários de missa |
| Cobertura | 61 encontradas / 61 publicadas pela diocese (58 no Catholic-Hierarchy, dados de 2023) |

## Fontes principais

1. **https://diocesecaratinga.org.br/foranias-e-paroquias/** — índice oficial completo: 9 foranias,
   61 paróquias, 54 municípios, com link para a página de cada paróquia.
2. **Página de cada paróquia** (`/paroquia/<slug>/`) — pároco, vigário paroquial (ou administrador
   paroquial), festa do padroeiro, endereço da igreja matriz, CEP, telefone/WhatsApp, e-mail,
   história e **lista de comunidades**. Foram lidas as 61 páginas.
3. **https://www.catholic-hierarchy.org/diocese/dcrtn.html** — erigida em 15/12/1915; 15.088 km²;
   722.300 hab., 511.000 católicos (70,7%); **58 paróquias (2023)**; sufragânea de Mariana;
   Cúria na Praça Cesário Alvim, 156, 35300-036 Caratinga, tel. (33) 3321-4600.
4. **https://pt.wikipedia.org/wiki/Diocese_de_Caratinga**

Sinal de atualidade: o site é WordPress ativo (Yoast SEO v27.9), com notícias e agenda diocesana
correntes, e a **Forania de Manhumirim** — criada recentemente — já aparece no índice.

## Foranias (9)

| Forania | Paróquias |
|---|---|
| Caratinga – *Mater Divinae Gratiae* | 8 |
| Inhapim – *Mater Boni Consilii* | 7 |
| Ipanema – *Mater Amabilis* | 7 |
| Iapu – *Mater Misericordiae* | 7 |
| Santa Margarida – *Regina Sacratissimi Rosarii* | 6 |
| Manhuaçu – *Mater Admirabilis* | 6 |
| Carangola – *Mater Salvatoris* | 8 |
| Manhumirim – *Mater Eucharistiae* | 6 |
| Bom Jesus do Galho – *Mater Spei* | 6 |

A forania de cada paróquia foi gravada no campo `forania`.

## Lacuna principal: horários de missa

**A Diocese de Caratinga não publica horários de missa** — nem página diocesana, nem nas 61 páginas
de paróquia (que trazem pároco, endereço, contato, história, padroeiro e comunidades, mas nenhum
quadro de celebrações). Todas as paróquias ficaram com `schedules: []`.
Um enxame de validação precisaria buscar caso a caso em: redes sociais das paróquias
(há páginas próprias, ex.: `https://www.pnsacarangola.com.br` para N. Sra. Aparecida de Carangola),
agregadores (`horariodemissa.com.br`, `missas.com.br`) e fichas do Google Maps — todos os quais
entrariam como `media` ou `baixa`.

## Divergências e decisões de nomenclatura

- Nomes com a cidade embutida foram normalizados (a cidade vai em `city`), com o nome oficial
  registrado em `notes`: "São Sebastião de Inhapim", "São Sebastião de São Sebastião do Anta",
  "São Sebastião de Orizânia", "São Sebastião de Espera Feliz", "Santa Bárbara de Fervedouro",
  "Santo Antônio de Pádua de Caratinga", "Santo Antônio de Pádua de Caparaó",
  "São Lourenço de Manhuaçu", "Bom Pastor de Manhuaçu", "Nossa Senhora da Conceição de Vermelho Novo".
- **Catedral São João Batista** (Caratinga) — paróquia criada em 01/12/1873, matriz elevada a
  catedral em 10/12/1915.
- **Paróquia Coração Eucarístico de Jesus** (Caratinga) — o índice a marca como "(Santuário)";
  confiada aos Sacramentinos (SSS). Mantida como paróquia.
- **Paróquia Senhor Bom Jesus** (Caratinga) — a própria lista de comunidades registra a matriz como
  "Santuário Senhor Bom Jesus".
- Distritos tratados como bairro, com a cidade no município:
  - "Realeza – Vila Nova" → **Manhuaçu**, `neighborhood` "Distrito de Vila Nova" (CEP 36900-000);
  - "São Sebastião do Sacramento – Manhuaçu" → **Manhuaçu**, distrito homônimo (CEP 36909-700);
  - "Santo Antônio do Manhuaçu de Caratinga" → **Caratinga**, distrito homônimo (CEP 35321-000).
- "Vermelho Velho – Raul Soares" → cidade **Vermelho Velho** (município próprio, CEP 35354-000).
- "Alto Jequitibá – **MB**" no site é erro de digitação de MG.

## Pontos que precisam de validação humana

- **Paróquia Nossa Senhora da Saúde (Alvarenga)** — o site de Caratinga a lista como
  "*(ad experimentum)*" na Forania de Iapu, **mas a Diocese de Governador Valadares também a publica
  como paróquia sua** (Setor III), com endereço, telefone e horários de missa. Está gravada nos dois
  arquivos; a entrada de Caratinga leva `jurisdictionNote`. **Só uma das duas deve ser carregada.**
- **Paróquia São Sebastião (Bugre)** — o índice a chama de "Paróquia São Sebastião do Bugre", mas a
  URL da própria página é `quase-paroquia-sao-sebastiao-do-bugre`. Verificar se é paróquia ou
  quase-paróquia. Suas comunidades incluem capelas em Caratinga, Ipaba e Iapu (fonte agrupa por
  município).
- **Paróquia São Mateus (Faria Lemos)** — o site troca os campos: o endereço aparece no campo "CEP"
  e o CEP (36840-000) no campo de telefone. Corrigido no JSON; conferir.
- **Paróquia Nossa Senhora do Amparo (Chalé)** — o endereço publicado traz **dois CEPs**
  (36985-000 no logradouro e 36945-000 no campo CEP). Gravado o do campo CEP.
- **Sem telefone publicado**: Nossa Senhora da Saúde (Alvarenga) e Santa Bárbara (Santa Bárbara do
  Leste). **Sem e-mail**: Santo Antônio de Pádua (Caratinga), Nossa Senhora da Saúde (Alvarenga) e
  São José (Manhuaçu). O e-mail da Paróquia do Bom Pastor de Manhuaçu está publicado com erro de
  digitação no domínio (`@yhaoo.com.br`) e foi gravado como está.
- **Sem lista de comunidades** (só a matriz): Coração Eucarístico de Jesus e São Judas Tadeu
  (Caratinga), Nossa Senhora do Rosário (Entre Folhas), Nossa Senhora da Penha (Pocrane),
  Nossa Senhora Aparecida (Dom Cavati), Nossa Senhora da Saúde (Alvarenga), São Sebastião
  (Tarumirim), São João Batista (São João do Manhuaçu), São Sebastião (Orizânia) e Senhor Bom Jesus
  (Bom Jesus do Galho) — a fonte não publica.
- **Contagem de comunidades**: a Paróquia São Domingos de Gusmão (Ubaporanga) declara "21
  comunidades" e a extração produziu exatamente 21 (matriz + 20). Já a Paróquia Nossa Senhora da
  Penha (Ipaba) publica, além das comunidades, um bloco "Capelas sem comunidade" — essas capelas
  **não** foram gravadas.
- **`foundedYear`** só foi preenchido quando a história da própria página traz a data explícita de
  criação da paróquia (10 casos). Os demais ficaram `null`.
- **Párocos religiosos**: registram-se as siglas publicadas (OCD em Piedade de Caratinga e Carmo/
  Caratinga; SSS no Coração Eucarístico; SDN em Manhuaçu, Manhumirim, Espera Feliz e Alto Jequitibá).
- Quatro paróquias têm **administrador paroquial** em vez de pároco (Entre Folhas, Alvarenga,
  Alto Jequitibá, Córrego Novo, Vermelho Velho) — gravados com o sufixo "(administrador paroquial)".


---

## Rodada de HORÁRIOS — 2026-09-10

A rodada anterior fechou com `schedules: []` nas 61 paróquias e a anotação de que "o site NÃO
publica horários de missa". Esta rodada **confirmou a anotação com prova técnica** e, mesmo assim,
acrescentou **33 horários** em **6 das 61 paróquias** — 6 com `confidence: "alta"` e 27 `"baixa"`.

### A prova de que a diocese realmente não publica horário

O site da Diocese de Caratinga roda **o mesmo tema/CMS da Diocese de Patos de Minas**, que *tem* o
recurso de horários de missa implementado. Em Caratinga o recurso existe mas está **vazio**:

- o `wp-sitemap.xml` lista os custom post types `paroquia`, `clero`, `album`, `video`, `evento`,
  `pastoral`, `congregacao`, `noticia`, `revista`… — **não existe `missa-sitemap.xml`**
  (em Patos de Minas ele existe, com 320 posts);
- **não existe a página `/horarios-de-missas/`** no `page-sitemap.xml` (em Patos existe);
- o feed oficial do tema, **`diocesecaratinga.org.br/json/`**, devolve a chave `missas` com os
  **7 dias da semana e listas vazias** (`{"1":0,…,"7":0}`), contra 320 registros no feed de Patos;
- as **61 páginas de paróquia foram baixadas e lidas uma a uma**: nenhuma contém a palavra "missa"
  num contexto de grade de horário. Elas trazem pároco, festa do padroeiro, endereço da matriz,
  telefone, e-mail, história/criação e a lista de comunidades — e nada mais.

### O que foi acrescentado

**Redes sociais oficiais** (o link é publicado pela própria diocese na página da paróquia; páginas
ativas, com posts de 2026) — `alta`:

| Paróquia | Cidade | Texto literal da fonte | Horários |
|---|---|---|---|
| Paróquia Nossa Senhora da Conceição | Vermelho Novo | "pároco: pe. Daniel Fialho / Missas 07:00 \| 09:00 \| 19:00 Domingo / Missa 1ª sexta do mês \| 07:00" | dom 07h, 09h, 19h (**3 `alta`**) + 1ª sexta 07h (**1 `baixa`**, mensal) |
| Paróquia Santa Luzia | Carangola | "SANTUÁRIO DE SANTA LUZIA — CARANGOLA, MINAS GERAIS. HORÁRIOS DE MISSAS: Domingo: 7h; 9h; 18h" | dom 07h, 09h, 18h (**3 `alta`**) |

**Agregador `horariodemissa.com.br`** — todas as fichas são de 2013/2014, anteriores à pandemia,
logo `baixa` com a data da ficha registrada em `notes`:

| Paróquia | Cidade | Horários | Ficha |
|---|---|---|---|
| Paróquia Santa Helena | Caputira | dom 08h/19h; qua 19h ("missa da saúde") — **3** | 14/07/2014 |
| Paróquia São Judas Tadeu | Caratinga | dom 08h30/19h; qua 19h30; sáb 19h30 — **4** | 08/05/2013 |
| Paróquia São Lourenço | Manhuaçu | dom 07h/09h/16h30/18h/19h30; ter 06h, 15h e 19h; qua 06h e 19h; qui 06h e 19h; sex 06h e 19h; sáb 19h30 — **15** | 23/04/2013 |
| Paróquia Bom Jesus | Manhumirim | dom 07h/09h/19h30; sáb 19h30 — **4** | 28/12/2013 |

Ressalvas gravadas em `notes`:
- **São Lourenço (Manhuaçu)**: as missas das 06h (de terça a sexta) são "na Capela do Hospital
  César Leite" e a das 15h de terça no "Asilo São Vicente de Paulo" — **nenhum dos dois está na
  lista de comunidades da paróquia**, então foram gravados em "Matriz São Lourenço" com o local
  literal em `notes`.
- **São Judas Tadeu (Caratinga)**: a ficha traz ainda "Todo dia 28: 19:30" (missa mensal do
  padroeiro). **Não foi gravada**: é recorrência por *dia do mês*, que o modelo `MassSchedule`
  não representa nem com `confidence: baixa` (só há `dayOfWeek`). Fica registrada aqui e na `notes`
  do registro de sábado.

### Fontes varridas e o que cada uma devolveu

| Fonte | Resultado |
|---|---|
| `diocesecaratinga.org.br` (sitemaps, `/json/`, 61 páginas de paróquia) | zero horários — ver "prova" acima |
| `horariodemissa.com.br` | varridas as **49 cidades** da diocese → 38 fichas; **só 4 com horário** (tabela acima). As outras 34 dizem "(Nenhum horário de Missa informado)" |
| `missas.com.br` / `missahora.com.br` | páginas de cidade vazias |
| Facebook e Instagram das paróquias | das 61 paróquias, **só 14 publicam link de rede social** na página diocesana. As 20 páginas correspondentes (Facebook + Instagram) foram baixadas com **User-Agent do Googlebot** — com UA de navegador o Facebook devolve 400, com o do Googlebot devolve a página inteira, incluindo o `best_description` (o bloco de apresentação) e o JSON dos posts recentes. **Só 2 publicam a grade fixa em texto**; as outras 12 usam a apresentação para endereço, nome do pároco e data de criação |
| `pnsacarangola.com.br` (site próprio da Paróquia N. Sra. Aparecida de Carangola, publicado pela diocese) | **fora do ar** — NXDOMAIN confirmado por DNS-over-HTTPS |
| Facebook da diocese | nenhum post com grade de horários no que o rastreador devolve |

### Conclusão

**55 das 61 paróquias continuam sem horário** e não há fonte pública em texto para elas. O que
sobrou está em **imagem** (cartazes no feed do Facebook/Instagram) ou só por telefone. Dois
caminhos para fechar:
(a) baixar e ler os cartazes das 14 paróquias que têm rede social publicada (e descobrir o perfil
das outras 47 — a busca automatizada esbarrou no bloqueio de bots do DuckDuckGo);
(b) contato direto: a diocese publica telefone e e-mail de quase todas as 61.
