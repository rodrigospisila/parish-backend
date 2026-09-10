# Relatório — Arquidiocese de Belo Horizonte (MG)

Pesquisa: 10/09/2026. Arquivo gerado: `paroquias/MG/belo-horizonte.json`.

---

## 1. Fonte primária: o Catálogo 2026 (PDF oficial)

Toda a lista de paróquias veio de **uma única fonte oficial e atual**: o
**Catálogo 2026 da Arquidiocese de Belo Horizonte**, PDF de 190 páginas publicado pela própria
arquidiocese.

| | |
|---|---|
| Página de download | <https://arquidiocesebh.org.br/catalogo> |
| PDF | <https://arquidiocesebh.org.br/wp-content/uploads/2026/01/catalogo-01.07.26.pdf> |
| Seções usadas | 5 (dados da arquidiocese e da Cúria), **7.13 Paróquias da Arquidiocese**, **7.14 Santuários, Capelas e Capelanias**, **7.15 Paróquias por Região Episcopal e Forania** e **7.15a Paróquias por Municípios** |

Por isso **todas as 293 entradas de paróquia estão com `confidence: "alta"`**: nome, cidade,
bairro, endereço, CEP, telefone, e-mail, pároco, ano de criação, região episcopal e forania saíram
todos do catálogo oficial de 2026.

O portal da arquidiocese **não tem** listagem navegável de paróquias:
`/paroquias-e-santuarios/` devolve HTTP 500, `/minhaparoquia/` é uma página vazia (só JS) e
`/para-voce/missas/` redireciona para uma notícia. Não há custom post type de paróquia no
WordPress REST (`/wp-json/wp/v2/types` só traz `noticias`, `radio` e os tipos do dízimo). O PDF do
catálogo é o único caminho — e é o melhor: traz mais campos do que qualquer site diocesano visto nas
rodadas anteriores.

### Fontes secundárias
| Fonte | Uso |
|---|---|
| <https://www.missadiariabh.com/listacompletademissas> | horários de missa (site colaborativo, **"Site atualizado em 27/08/2026"**) |
| <https://www.missadiariabh.com/confissoes> | horários de confissão + endereços (usados para desambiguar paróquias homônimas) |
| <https://www.missadiariabh.com/adoracao> | horários de adoração |
| <https://www.catholic-hierarchy.org/diocese/dbelo.html> | número esperado de paróquias (295, dado de 2023) |
| <https://pt.wikipedia.org/wiki/Arquidiocese_de_Belo_Horizonte> e portal da arquidiocese | 291 paróquias / "quase 300", 28 municípios |

---

## 2. O que foi gravado

### Paróquias — 293 entradas, todas `alta`

| Tipo (seção do catálogo) | Qtd. | `status` no JSON | Entra no importador? |
|---|---:|---|---|
| Paróquias territoriais (7.13) | 273 | — | sim |
| Santuários arquidiocesanos que **também são paróquias** (7.14a, confirmados em 7.15/7.15a) | 12 | — | sim |
| Curato Divino Espírito Santo (7.13 B) | 1 | — | sim |
| Área Pastoral Rainha dos Mártires (7.13 B) | 1 | — | sim |
| **Subtotal — unidades paroquiais da jurisdição latina** | **287** | | |
| Santuários/reitorias **sem** território paroquial | 3 | `reitoria` | não |
| Paróquias pessoais de rito oriental + paróquia militar | 3 | `outra-jurisdicao` | não |
| **Total de entradas** | **293** | | |

Distribuição por região episcopal: RENSC 85, RENSA 75, RENSB 73, RENSE 46, RENSER 13 (1 sem
região). 28 municípios, 40 foranias.

Municípios (entradas): Belo Horizonte 151, Contagem 32, Betim 20, Ribeirão das Neves 14,
Nova Lima 8, Santa Luzia 8, Sabará 7, Caeté 6, Ibirité 6, Lagoa Santa 6, Brumadinho 5,
Esmeraldas 5, Vespasiano 5, Pedro Leopoldo 3, Bonfim 2, Confins 2, Sarzedo 2, e 1 cada em
Belo Vale, Crucilândia, Moeda, Mário Campos, Nova União, Piedade dos Gerais, Raposos, Rio Acima,
Rio Manso, São José da Lapa e Taquaraçu de Minas.

**Preenchimento dos campos** (de 293): CEP 293, bairro 290, endereço 291, região episcopal 292,
forania 287, ano de criação 287, telefone 284, pároco/administrador 282, e-mail 264, site 20.

### Comunidades — 0

O Catálogo 2026 **não publica lista de comunidades/capelas por paróquia**. A seção 7.14 traz apenas
capelas curiais (4), capelas especiais (1), capela militar (1) e capelanias provisionadas de
hospitais, colégios e cemitérios — nenhuma delas é comunidade de uma paróquia identificável.
Portanto `communities: []` em todas as 293 entradas: **o importador criará a igreja-matriz
automaticamente**.

### Horários — 820, para 96 paróquias

| Tipo | Qtd. |
|---|---:|
| MASS | 706 |
| CONFESSION | 92 |
| ADORATION | 22 |
| **Total** | **820** (767 `media`, 53 `baixa`) |

Cobertura: **96 de 293 entradas (33%)** — 94 em Belo Horizonte e 2 em Nova Lima. Mediana de
7 horários por paróquia atendida. **197 paróquias ficaram sem horário nenhum.**

Por que só isso: o missadiariabh.com — a única fonte de horários fresca e estruturada que encontrei
— cobre **exclusivamente o município de Belo Horizonte**. As outras 27 cidades da arquidiocese
(Contagem, Betim, Ribeirão das Neves, Santa Luzia, Sabará, Nova Lima…) não têm agregador
equivalente. O horariodemissa.com.br tem fichas de BH, mas as que amostrei estavam com
"dados atualizados pela última vez em 04/04/2013" — 13 anos de defasagem, o que as jogaria em
`baixa` de qualquer forma; não foram usadas.

**Critério de confiança dos horários** (o missadiariabh é fonte secundária, colaborativa e
declaradamente não ligada à arquidiocese):
- `media` — o local nomeado pela fonte identifica **sem ambiguidade** uma paróquia/santuário do
  Catálogo 2026 (nome + bairro batem, ou o endereço publicado na página de confissões confere com o
  do catálogo). É a corroboração exigida pelo README.
- `baixa` — vínculo **inferido** (bairro não bate literalmente, ou o nome é ambíguo) **ou**
  recorrência **mensal** ("primeira sexta-feira do mês", "primeiro sábado"), que não cabe em
  `MassSchedule`. Nesses casos a regra literal da fonte foi copiada em `notes`.

Confissões e adorações vêm como intervalos ("Terça a sexta-feira – 17h às 18h30"); foram expandidos
em um registro por dia, com a **hora de início** em `time` e a **regra literal** em `notes`.

---

## 3. Cobertura: 287 encontradas × 291 esperadas

| Fonte | Nº de paróquias |
|---|---:|
| Catálogo 2026 (seções 7.13 + 7.14a), contagem deste levantamento | **287** |
| Portal da arquidiocese / Wikipédia | 291 ("quase 300") |
| catholic-hierarchy.org (2023) | 295 |

A diferença de ~4 unidades é do próprio catálogo, não do levantamento: a seção 7.13 é numerada 1–273
e a 7.14a lista 15 santuários; não há paróquia "perdida" entre elas. Parte da diferença tem
explicação identificada (item 4.1 abaixo).

---

## 4. Pontos para o enxame de validação humana

### 4.1 Inconsistência interna do catálogo — São Norberto × Santa Edwiges (Contagem)
A seção **7.13 traz UMA entrada**: `SÃO NORBERTO E SANTA EDWIGES (Cod. 262)`, criação 09/11/2000,
Forania São Gonçalo, Rua Félix de Almeida 76, Contagem (Bernardo Monteiro) — e é a **única** entrada
das 278 de 7.13 **sem sigla de região episcopal**, sinal de registro incompleto. Mas as seções
**7.15 e 7.15a trazem DUAS paróquias**:
"Santa Edwiges (Bernardo Monteiro)" e "São Norberto (Bela Vista)". Gravei **uma** entrada
(`sao-norberto-e-santa-edwiges-contagem`), seguindo a 7.13. **Precisa de confirmação**: são duas
paróquias, ou uma fusão recente que a 7.15 não acompanhou? Isso sozinho explica 1 das ~4 unidades de
diferença na cobertura.

### 4.2 Endereço da Cúria diverge de `dioceses.json`
O `dioceses.json` do repositório registra `"address": "Curia Metropoitana, Av. Brasil 2079"` e
`"zipCode": "30140-008"`. O Catálogo 2026 e o rodapé do portal dizem
**Rua Campo Verde, 165 – Bairro Juliana (Catedral Cristo Rei), 31744-513**. Gravei o endereço do
catálogo no bloco `diocese` deste arquivo. **Não alterei `dioceses.json`** (fora do escopo) — mas ele
precisa ser corrigido. (Obs.: uma página da própria arquidiocese ainda mostra "nº 103" em vez de
"165" — o catálogo, mais recente, diz 165.)

### 4.3 A Catedral Cristo Rei não é paróquia
A **Catedral Cristo Rei** (Rua Campo Verde, 165, mesmo terreno da Cúria) **não aparece na relação de
paróquias** do Catálogo 2026 — nem em 7.13, nem em 7.14, nem em 7.15/7.15a. Ela é a catedral e sede
administrativa, ainda em obras ("Uma obra em nossas mãos", p. 6 do catálogo), e tem missas
(o missadiariabh registra 3). **Não foi gravada como paróquia.** Decidir se o Parish deve ter um
registro para ela.

### 4.4 Três santuários que NÃO são paróquias (`status: "reitoria"` — não importam)
| Slug | Motivo |
|---|---|
| `nossa-senhora-do-rosario-brumadinho` | Santuário e sede da Região Episcopal RENSER; ausente de 7.15 e 7.15a |
| `sao-francisco-de-assis-belo-horizonte-sao-luiz-pampulha` | Igrejinha da Pampulha — reitoria sem território; ausente de 7.15 e 7.15a |
| `schoenstatt-tabor-da-liberdade-confins` | Santuário do Movimento de Schoenstatt (Confins) |

Os 3 horários de missa que a fonte atribui à Igrejinha da Pampulha estão gravados na entrada, mas
**não serão carregados** porque a entrada é `reitoria`. Se a decisão for tratar reitorias como
paróquias no Parish, basta remover o `status`.

### 4.5 Três entradas de outra jurisdição (`status: "outra-jurisdicao"` — não importam)
| Slug | Jurisdição |
|---|---|
| `nossa-senhora-do-libano-maronitas-catolicos-belo-horizonte` | Eparquia de Nossa Senhora do Líbano em São Paulo (rito maronita) |
| `sagrado-coracao-de-jesus-siriacos-catolicos-belo-horizonte` | Siríacos católicos — **a eparquia/ordinariato de referência não é informada na fonte**; precisa ser identificada |
| `nossa-senhora-de-loreto-militar-lagoa-santa` | Ordinariado Militar do Brasil (Base Aérea de Lagoa Santa) |

Atenção: a paróquia siríaca **tem 8 horários de missa gravados** (é a "Paróquia Sagrado Coração de
Jesus – região hospitalar" do missadiariabh, Av. Carandaí 1010) — que também não serão carregados.

### 4.6 Doze vínculos de horário inferidos (`confidence: "baixa"`)
Casos em que o missadiariabh nomeia o local sem qualificador suficiente. A nota de cada horário traz
a justificativa; todos precisam de confirmação:

| Local na fonte | Atribuído a | Risco |
|---|---|---|
| "Paróquia Santo Antônio" (8 missas) | Santo Antônio, Av. do Contorno (Lourdes) | BH tem **5** paróquias Santo Antônio |
| "Paróquia Santo Antônio da Pampulha" (6 missas) | Santo Antônio (Jaraguá) | catálogo não usa "da Pampulha" no nome |
| "Paróquia Sagrada Família" (10 missas) | Sagrada Família (bairro Sagrada Família) | há outra no Havaí |
| "Paróquia São Dimas (Barreiro)" (3 missas) | São Dimas (Vale do Jatobá) | há outra no Serrano |
| "Paróquia São Vicente de Paulo" (7 missas) | São Vicente de Paulo (Nova Suíça) | há outra no Ipiranga |
| "Paróquia São Luiz Gonzaga" (2 missas) | São Luiz Gonzaga (Padre Eustáquio, BH) | há outra em Contagem |
| "Igreja Nossa Senhora da Paz (Planalto)" (2 missas) | N. Sra. da Paz (Guarani) | catálogo só tem Guarani e Cachoeirinha |
| "Paróquia Nossa Senhora de Fátima" sem bairro (1 missa) | Santuário N. Sra. de Fátima (Santo Agostinho) | — |

Além desses, 14 horários são de **recorrência mensal** ("primeira sexta-feira do mês", "primeiro
sábado", "todo terceiro domingo") — ficaram `baixa` com a regra literal em `notes`, pelo mesmo motivo
já registrado no README (o modelo `MassSchedule` só tem dia da semana). É a mesma decisão de produto
pendente das rodadas do Sul.

### 4.7 Vínculos que foram CONFIRMADOS por endereço (para o validador não refazer)
A página de confissões do missadiariabh publica endereços, o que permitiu resolver quatro
ambiguidades com segurança (viraram `media`, não `baixa`):
- "Igreja São Sebastião" → São Sebastião do **Barro Preto** (Rua Paracatu, 460).
- "Paróquia São Sebastião (Betânia)" → São Sebastião da **Estrela do Oriente**
  (Rua Úrsula Paulino, 1555 — endereço idêntico ao do catálogo; a fonte chama o bairro de Betânia).
- "Igreja da Piedade (Alto Caiçara)" e "Igreja Santa Clara (Caiçara – Carlos Luz)" → ambas da
  **Paróquia Santa Clara da Piedade** (Rua Raimunda Vieira, 80 / Av. Presidente Carlos Luz, 835).
- "Paróquia Sagrado Coração de Jesus (região hospitalar)" → a paróquia **siríaca** da Av. Carandaí.

### 4.8 285 horários descartados por não serem de paróquia
73 locais distintos do missadiariabh (285 ocorrências de missa) **não foram gravados** por serem
capelas de colégio, hospitais, mosteiros, conventos, carmelos, seminários e comunidades novas —
não são paróquias e o importador os ignoraria. Os maiores: Capela N. Sra. do Rosário (Centro, em
reforma, 17), Capela do Colégio Arnaldo (14), Comunidade Católica Gospa Mira (11), Oratório São José
– rito romano antigo (11), CRESAP (10), Capela da PUC Coração Eucarístico (8), Arautos do Evangelho
(8), Mosteiro N. Sra. das Graças (7), Convento das Irmãs Sacramentinas de Bérgamo (7), FAJE (6),
Carmelo Santa Teresa d'Ávila (6), Convivium Emaús (6). Se um dia o Parish quiser registrar
"locais de missa não paroquiais", esta lista está reproduzível pelo mesmo parser.

### 4.9 Campos ausentes na fonte oficial
- **Sem telefone (9)**: Divina Misericórdia e São João Paulo II (BH), Santa Edith Stein (BH),
  Maria, Mãe da Esperança (Betim), São José (Brumadinho), Santuário N. Sra. da Piedade – Serra da
  Piedade (Caeté), São Luiz Gonzaga (Contagem), Cristo Sol Nascente (Ibirité), Área Pastoral Rainha
  dos Mártires (Lagoa Santa), N. Sra. Rainha dos Anjos (Nova Lima).
- **Sem pároco (11)**: o catálogo traz o campo em branco (vacância ou dado não atualizado) em
  Cristo, Luz dos Povos; N. Sra. do Morro; Santa Dulce dos Pobres; Santa Rita de Cássia;
  Santo Antônio (Venda Nova); São Brás; São Miguel Arcanjo (todas em BH); São João Batista
  (Santa Luzia); São José (São José da Lapa); além do Santuário de Schoenstatt e da paróquia militar.
- **Sem endereço (2)**: São José (Brumadinho) e Santuário N. Sra. da Piedade – Serra da Piedade
  (este só publica "Caixa Postal, 60").
- **Sem bairro (3)**, **sem ano de criação (6)**, **sem forania (6)** — nos casos de forania são as
  3 de outra jurisdição, 2 dos santuários-reitoria e a Paróquia N. Sra. Rainha dos Anjos
  (Nova Lima/Alphaville), que o catálogo lista **sem forania** e que **não aparece** na relação
  7.15a de Nova Lima. Vale confirmar se é paróquia plena.
- **Sem e-mail (29)** e **sem site (273)**.

### 4.10 Detalhes menores
- **DDD inferido**: o catálogo publica a maioria dos telefones sem DDD. Como os 28 municípios da
  arquidiocese são todos DDD 31, os números de 8–9 dígitos receberam o prefixo `(31)`. É inferência
  segura, mas é inferência.
- **Grafias divergentes entre seções**: 7.13 diz "NOSSA SENHORA DE NAZARETH" (Caeté, Morro Vermelho)
  e 7.15 diz "Nossa Senhora de Nazaré". Gravei a forma de 7.13. Também "Santa Catarina Labouré"
  (7.13) × "Santa Catarina de Labouré" (7.15) — gravei a de 7.13.
- **E-mails pessoais**: alguns registros trazem e-mail pessoal do pároco em vez de institucional
  (ex.: `georgemassis@hotmail.com`). Mantidos como estão na fonte.
- **E-mail quebrado descartado**: o Santuário de Schoenstatt tem no PDF
  `E-mail: tabor da liberdade@yahoo.com.br` (com espaços); ficou `null` em vez de gravar um endereço
  inventado.
- **URL do PDF é volátil**: `catalogo-01.07.26.pdf` é a edição de 2026. Uma nova edição mudará a URL
  registrada em `sources`.

---

## 5. Reprodutibilidade

O site bloqueia leitor automático via TLS estrito para alguns clientes, mas responde a `curl -k`
com user-agent de navegador. O caminho completo:

1. `GET https://arquidiocesebh.org.br/catalogo` → extrair o `href` do PDF.
2. Baixar o PDF (32 MB, 190 páginas) e extrair o texto com `pypdf` — a extração já sai na ordem
   correta das duas colunas.
3. Recortar as páginas 141–180 e separar as seções 7.13 (entradas numeradas 1–273 + blocos
   "B PARÓQUIAS PESSOAIS / PARÓQUIA MILITAR / CURATOS / ÁREA PASTORAL"), 7.14a (15 santuários) e
   7.15/7.15a (usadas só para conferência de nome e de status paroquial).
4. Cada bloco tem o formato fixo: `N. NOME (REGIÃO) - (Cod. NNN)` / `Criação: dd/mm/aaaa` /
   `Forania X` / endereço + telefone / `CEP - CIDADE (Bairro) - MG` / `E-mail:` / `Pároco:`.
