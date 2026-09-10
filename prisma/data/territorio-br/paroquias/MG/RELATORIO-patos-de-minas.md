# Relatório de pesquisa — Diocese de Patos de Minas (MG)

- **Arquivo**: `paroquias/MG/patos-de-minas.json`
- **Data da pesquisa**: 2026-09-10
- **Resultado**: 48 paróquias (48 `alta`), 203 comunidades, **320 horários fixos**
  (262 `alta`, 7 `media`, 51 `baixa`)

## Identificação

| Campo | Valor |
|---|---|
| Nome | Diocese de Patos de Minas (*Dioecesis Patensis*) |
| Erigida | 05/04/1955 |
| Metropolitana | Arquidiocese de Uberaba |
| Bispo | Dom Cláudio Nori Sturm, OFM Cap. (posse em 04/01/2009) |
| Cúria | Rua Tiradentes, 388 – Centro, Patos de Minas/MG, CEP 38700-134 |
| Telefone | (34) 3821-3213 / (34) 3821-3184 |
| E-mail | pascom@diocesedepatosdeminas.org.br |
| Site | https://diocesedepatosdeminas.org.br |
| Foranias | 6 — Santo Antônio, São Francisco, Santa Rita, São José, São Sebastião, Nossa Senhora da Abadia |
| Municípios | 24 |

## Fontes principais

Toda a pesquisa saiu de **uma única fonte oficial e viva**: o site da diocese. Ele é um
WordPress com *custom post types* `paroquia` e `missa` que **não** estão expostos na REST API,
mas estão nos sitemaps do Yoast e num endpoint JSON do próprio tema.

| Fonte | O que rendeu | Sinal de atualidade |
|---|---|---|
| `/paroquia-sitemap.xml` | as **48** páginas de paróquia | `lastmod` de 2025-01-03 a **2026-09-01** |
| `/paroquia/<slug>/` (48 páginas lidas) | nome oficial, pároco/administrador, vigário, diácono, festa do padroeiro, endereço da Igreja Matriz, telefone, WhatsApp, e-mail, site, redes sociais e o **decreto/história de criação** | páginas ativas |
| `/horarios-de-missas/` | 6 foranias → 45 paróquias → **312 horários**, cada um com dia, hora, tipo e **o local (comunidade)** | página viva; alimentada pelos posts `missa` |
| `/missa-sitemap.xml` | **320** posts de missa; o slug codifica ordinal, dia, hora e paróquia (`m-0-domingo-07-00-paroquia-…`) | `lastmod` 2025-05-29 (317) e **2026-03-20** (3) |
| `/json/` | feed JSON do tema: as 320 missas por dia da semana **com o campo `local`**, e o contato da Cúria | igual ao conjunto de posts |
| `/bispo-diocesano/` | biografia e nome do bispo | — |
| `catholic-hierarchy.org/diocese/dpadm.html` | ereção, metropolitana, **46 paróquias** (Anuário Pontifício 2023) | AP 2023 |

### Como a atribuição paróquia ↔ horário foi provada

A página de horários dá o nome da paróquia mas não o *slug*; o sitemap das missas dá o *slug*
mas não é agrupado. Cruzei os dois pelo **multiconjunto (ordinal, dia da semana, hora)**: cada um
dos 33 accordions com horário casou com **exatamente um** dos 34 grupos de posts `missa`,
sem ambiguidade — inclusive nos casos em que há três "Paróquia São Sebastião" e três
"Paróquia Nossa Senhora do Rosário" na diocese. Nenhum casamento ficou em aberto.

Sobrou 1 grupo (8 missas): `paroquia-nossa-senhora-do-rosario---sao-sebastiao`. É a
**Paróquia Nossa Senhora do Rosário de São Gotardo**, criada por decreto em 25/10/2023 por
desmembramento da Paróquia São Sebastião — daí o sufixo. A página dela está no site, mas ela
ainda **não tem accordion** na página de horários. Os 8 horários foram recuperados por
**diferença de conjuntos** entre o feed `/json/` (320) e a página (312), o que devolveu também o
`local` de cada um (Matriz, Igreja N. Sra. da Abadia, Igreja Santa Luzia) — comunidades que o
próprio decreto de criação confirma. Esses 8 ficaram com `confidence: "media"` (1 deles `baixa`,
por ser mensal), com a cadeia de inferência escrita em `notes`.

## Cobertura

- **48 paróquias encontradas** contra **46 esperadas** (AP 2023 via catholic-hierarchy).
  A diferença é explicável: as 48 incluem 1 catedral, 1 quase-paróquia e 3 paróquias erigidas
  depois de 2022 — São João Paulo II (2011, mas fora do AP antigo), Santa Cruz e N. Sra. de
  Fátima de Douradoquara (09/11/2022) e N. Sra. do Rosário de São Gotardo (25/10/2023).
- **34 das 48 paróquias (71%) têm horário**; 320 horários no total.
- **14 paróquias sem horário publicado** (nem accordion, nem post `missa`):
  Cristo Redentor, N. Sra. do Rosário, Santa Terezinha do Menino Jesus, São João Batista e
  São Vicente de Paulo (Patos de Minas); N. Sra. do Carmo (Carmo do Paranaíba); Santa Terezinha
  e São José (Patrocínio); N. Sra. Aparecida (São Gotardo); Santa Cruz e N. Sra. de Fátima
  (Douradoquara); N. Sra. de Fátima e N. Sra. do Carmo (Monte Carmelo); N. Sra. do Rosário
  (Iraí de Minas); Quase-Paróquia N. Sra. Aparecida (Coromandel).
  Para elas o dataset tem a igreja-matriz e, quando o decreto publica, as comunidades.

## Comunidades

O bloco **"COMUNIDADES DA PARÓQUIA"** existe em todas as 48 páginas mas o carrossel está
**vazio em todas** — a diocese nunca preencheu esse campo. As 203 comunidades do dataset vieram de
duas fontes oficiais alternativas:

1. **O `local` de cada missa** (página de horários / feed `/json/`) — dá o nome da igreja/capela
   onde a missa é celebrada. Cobre as 34 paróquias com horário.
2. **Os decretos de criação transcritos nas páginas paroquiais** — 7 paróquias publicam a lista
   nominal de comunidades urbanas e rurais: N. Sra. do Rosário (São Gotardo), N. Sra. de Fátima
   (Monte Carmelo), São João Paulo II e São José (Patrocínio), Santa Cruz e N. Sra. de Fátima
   (Douradoquara), Santa Rita de Cássia (Presidente Olegário) e São Benedito (Patos de Minas).

Toda comunidade referenciada em `schedules[].community` existe em `communities[]` da mesma
paróquia (verificado por script: 0 órfãs).

## Escala de confiança adotada

- **Diocese e paróquias — `alta`**: site oficial, páginas com `lastmod` de 2025/2026.
- **Comunidades — `alta`**: nome publicado pela própria diocese (local da missa ou decreto).
- **Horários semanais ("Todo Domingo às 19h00") — `alta`**: publicação oficial em página viva.
  O `lastmod` do grosso dos posts `missa` é 2025-05-29 (regravação em lote) e os mais recentes são
  de 2026-03-20; a página de horários é o canal ativo de divulgação da diocese e as páginas
  paroquiais foram atualizadas até 2026-09-01. **Registro a data para conferência humana.**
- **Horários mensais — `baixa` (51 registros)**: "1ª Sexta-feira", "3º Sábado", "2ª Terça-feira"
  etc. não cabem em `MassSchedule` (que só tem dia da semana). O `dayOfWeek`/`time` foram
  preservados e a regra literal está em `notes`. É o mesmo bloqueio de modelagem já registrado no
  README (Osório, PR/RS).
- **8 horários da N. Sra. do Rosário (São Gotardo) — `media`** (7) **e `baixa`** (1, mensal):
  fonte oficial, mas a paróquia foi atribuída por inferência (slug do post + forania).

## Pontos para o enxame de validação

1. **`Paróquia Divino Espírito Santo` (Patos de Minas, bairro Ipanema)** — o *slug* da página é
   `paroquia-sao-pedro-e-sao-paulo` e a página de horários ainda a chama de "Paróquia São Pedro e
   São Paulo", mas o **título da página** (modificada em 2026-02-03) e o Instagram oficial
   (`@paroquia.des`) dizem **Divino Espírito Santo**. Adotei o nome novo. **Confirmar.**
2. **`Paróquia São Damião de Molokai` (Patrocínio)** — mesma situação: slug
   `paroquia-padre-damiao-de-molokai`, título atual "Paróquia São Damião de Molokai". Adotei o novo.
3. **`Paróquia Santa Cruz e Nossa Senhora de Fátima` (Douradoquara)** — a página de horários a
   lista como "Quase-Paróquia Santa Cruz", mas o decreto de 09/11/2022 transcrito na própria página
   a **eleva a paróquia** com esse nome. Adotei o nome do decreto.
4. **Distritos tratados como cidade** — `Major Porto` (Paróquia N. Sra. das Dores) é distrito de
   Patos de Minas e `Guarda dos Ferreiros` (Paróquia Santa Cruz) é distrito de São Gotardo.
   Mantidos como o oficial publica; precisa de decisão humana.
5. **Endereço da matriz de N. Sra. do Rosário (São Gotardo)** — o bloco de contato diz
   "Rua Vereador Antônio Inácio da Silva, **665** – Taquaril" e o decreto diz
   "Avenida Vereador Antônio Inácio da Silva, **685**, Bairro Taquaril, CEP 38800-000".
   Gravei o número do bloco de contato (mais atual) e deixei `zipCode: null`.
6. **Comunidades sem invocação** — a Paróquia N. Sra. das Dores (Major Porto) publica localidades
   soltas como comunidade ("Bom Sucesso", "Chapadão", "Ranchinho", "Vertente", "Serra da Quina").
   São nomes de povoado, não de capela; ficaram como estão.
7. **Erros de digitação da fonte já normalizados** (registrar caso a validação queira o literal):
   "Matriz São benedito" → "Matriz São Benedito"; "Igreja sagrada Família" → "Igreja Sagrada
   Família"; "Capela N. Sra. Do Rosário" → "Capela N. Sra. do Rosário"; "Comunidade  Divino
   Espirito Santo(Ipanema)" → "Comunidade Divino Espírito Santo (Ipanema)"; e **uma missa da
   Paróquia São Sebastião (São Gotardo) cujo `local` está gravado literalmente como "Missa"** —
   mapeada para "Matriz".
8. **Telefones em formato irregular** — Paróquia Cristo Redentor: `34 3825-2037` (sem
   parênteses no original).
9. **`foundedYear`** só foi preenchido quando a página traz a data explícita do decreto/lei
   (19 paróquias); nas demais ficou `null`.
