# Relatório de pesquisa — Diocese de Jaboticabal (SP)

- **Arquivo**: `paroquias/SP/jaboticabal.json`
- **Data da pesquisa**: 2026-09-10 (todos os `accessedAt`)
- **Resultado**: 45 paróquias · 216 comunidades · 385 horários fixos
- **Confiança**: 45 paróquias `alta`; horários 297 `alta`, 7 `media`, 81 `baixa`

## Identificação

| Campo | Valor |
|---|---|
| Nome | Diocese de Jaboticabal |
| Sede | Jaboticabal, SP |
| Ereção | 25/01/1929 |
| Metropolitana | Arquidiocese de Ribeirão Preto |
| Bispo | Dom Eduardo Pinheiro da Silva, sdb (desde 2015) |
| Cúria | Rua José Bonifácio, 432 — Bairro Aparecida — CEP 14882-035 — Cx. P. 48 |
| Telefone | (16) 3202-0390 / 3202-6611 |
| E-mail | recepcao@diocesejaboticabal.org.br |
| Site | https://www2.diocesejaboticabal.org.br |
| Foranias | 5 · 20 municípios |

## Fontes principais

A diocese mantém um cadastro próprio de paróquias que alimenta a página "Horários de
Missas" por chamadas AJAX. Foi essa a fonte de **todo** o dataset — é oficial, está
completa e traz, por paróquia: nome, endereço, bairro, CEP, telefone, WhatsApp,
coordenadas, link oficial (Facebook/Instagram), histórico com data de criação e o bloco
de horários com as comunidades e o nome do pároco e dos vigários.

| URL | O que forneceu |
|---|---|
| https://www2.diocesejaboticabal.org.br/horarios-de-missas | Página de busca; lista as 5 foranias e as 24 localidades cadastradas |
| https://www2.diocesejaboticabal.org.br/busca-cidades-por-forania | Endpoint JSON oficial: cidades de cada forania |
| https://www2.diocesejaboticabal.org.br/busca-forania-cidade | Endpoint JSON oficial: **todas as paróquias** de cada forania/cidade, com dados completos |
| https://www2.diocesejaboticabal.org.br/busca-cidade e /busca-paroquia | Conferência cruzada (mesmo conjunto, nenhum registro extra) |
| https://www2.diocesejaboticabal.org.br/paroquia/&lt;slug&gt; | Página individual de cada paróquia (registrada como `source` de cada registro) |
| https://www2.diocesejaboticabal.org.br/contato | Endereço, CEP, telefone e e-mail da Cúria |
| https://www2.diocesejaboticabal.org.br/bispos | Bispo diocesano atual e antecessores |
| https://www2.diocesejaboticabal.org.br/clero | Clero incardinado (sem atribuição de paróquia — ver "Dúvidas") |
| https://www.catholic-hierarchy.org/diocese/djabo.html | Número esperado de paróquias (43, dado de 2023), ereção, endereço |
| https://pt.wikipedia.org/wiki/Diocese_de_Jaboticabal | Municípios, foranias, catedral, conferência do nº de paróquias |

O site oficial esteve no ar e não bloqueou leitura automatizada; **não foi preciso**
recorrer ao Arquivo da Internet, ao Anuário Católico nem a agregadores
(horariodemissa.com.br, missas.com.br, Google Maps). Nenhum dado do dataset vem de
agregador.

## Cobertura

| | |
|---|---|
| Encontradas | **45** |
| Esperadas | **43** (Catholic-Hierarchy, estatística de 2023; Wikipédia repete o número) |
| Varredura | 5/5 foranias · 24/24 localidades cadastradas |

Os registros do cadastro oficial têm ids **1 a 45, sem lacunas** — a lista está completa.

A diferença de 2 para o número esperado se explica por duas paróquias criadas em
**31/05/2023**, posteriores ao levantamento do Catholic-Hierarchy:

- Paróquia Nossa Senhora da Conceição Aparecida — Barrinha
- Paróquia Nossa Senhora Aparecida — Pitangueiras

Distribuição por forania: Nossa Senhora do Carmo 9 · São Sebastião 10 · Senhor Bom Jesus
11 · São João Batista 8 · Nossa Senhora Aparecida 7.

Completude dos campos: **45/45** com endereço, CEP, telefone, bairro, pároco, ano de
criação e ao menos um horário. **0/45** com e-mail publicado (campo `null` — a diocese não
divulga e-mail por paróquia). 44/45 com `website` (a página oficial no Facebook ou
Instagram informada pela própria diocese).

## Decisões de modelagem

1. **Nomes padronizados.** Onde o cadastro oficial usa prefixo duplo ou abreviatura, o
   `name` foi normalizado e o rótulo oficial fica registrado aqui:

   | `name` no JSON | Rótulo oficial no site |
   |---|---|
   | Catedral Nossa Senhora do Carmo | Paróquia Sé Catedral Nossa Senhora do Carmo |
   | Santuário Nossa Senhora da Conceição Aparecida | Paróquia Santuário Nossa Senhora da Conceição Aparecida |
   | Santuário Nossa Senhora do Rosário de Fátima | Paróquia Santuário Nossa Sra. do Rosário de Fátima |
   | Santuário Nossa Senhora da Conceição Montesina | Paróquia Santuário N. Sra. da Conceição Montesina |
   | Basílica Menor Senhor Bom Jesus | Basílica Menor Senhor Bom Jesus (sem "Paróquia" no cadastro) |

2. **Basílica Menor Senhor Bom Jesus (Monte Alto)** entra como paróquia: é a paróquia-mãe
   do município (criada em 28/01/1898, elevada a santuário perpétuo e depois a basílica
   menor), está no cadastro oficial de paróquias e tem pároco (Pe. Audive José Bissoli) e
   vigários próprios.

3. **Comunidades.** O nome vem do cabeçalho de cada bloco de horários no site. O prefixo
   genérico "Comunidade"/"Comunidade de" foi removido; "Igreja Matriz X" virou "Matriz X";
   os prefixos "Capela", "Santuário", "Basílica" e "Sé Catedral" foram preservados. Cada
   paróquia tem exatamente **uma** comunidade com `isMatriz: true`, que herda o endereço e
   o bairro da paróquia.

4. **Instituições com igreja fixa entraram como comunidade** (hospitais, asilos, lares,
   Santa Casa, capelas de congregações), porque a diocese as publica como local de missa
   com nome próprio — ex.: "Capela da Santa Casa" (Taquaritinga), "Lar São Vicente de Paulo"
   (Monte Alto), "Hospital Unimed" (Monte Alto), "Recanto São Vicente de Paulo (Passionistas)"
   (Bebedouro), "Comunidade Terapêutica Feminina 'Jesus em Damasco'" (Taquaritinga).

5. **Horários de recorrência mensal** ("1ª sexta-feira do mês", "2ª e 4ª quarta-feira",
   "última quinta-feira", "3º sábado") entraram com o `dayOfWeek` correspondente,
   `confidence: "baixa"` e o texto original no `notes` — 81 registros. É o mesmo tratamento
   das rodadas anteriores e a decisão de produto sobre `MassSchedule` ainda está pendente.

## Registros que precisam de validação humana

### Missas fora do dataset (não cabem em `dayOfWeek`)

**Dia fixo do mês** — 11 blocos, todos oficiais, perdidos por falta de modelagem:

| Paróquia / cidade | Texto do site |
|---|---|
| Nossa Senhora de Lourdes — Jaboticabal | "Todo dia 11: Novena Perpétua - Missa pelos Enfermos: 19h30" |
| São Judas Tadeu — Jaboticabal | "Todo dia 28, Missa votiva ao Padroeiro; durante a semana às 19h30, sábado e domingo às 19h" |
| Santa Teresa de Jesus — Jaboticabal | "Todo dia 18: 19h30 (Missa da Aliança de Amor)" |
| São Francisco de Paula — Dobrada | "Todo dia 2 (Padroeiro)" — sem horário publicado |
| São Joaquim e Sant'Ana — Santa Ernestina | "Todo dia 29: 19h30" |
| Nossa Senhora Aparecida — Bebedouro | "Todo dia 29: São Miguel" — sem horário publicado |
| São Judas Tadeu — Bebedouro | "Todo dia 28 de cada mês, de segunda a sexta: 19h30; sábado e domingo: 19h" |
| Sagrado Coração de Jesus — Ibitiuva | "Todo dia 29: 19h30" |
| Santuário N. Sra. da Conceição Montesina — Aparecida de Monte Alto | "Todo dia 8: 9h, 15h e 19h" e "Todo dia 29: 19h30" |
| Santo Antônio — Pirangi | "Todo dia 13 do mês: 19h30" |
| Santa Rita de Cássia — Vista Alegre do Alto | "Todo dia 22 do mês: 19h" |

**Datas especiais** (excluídas por regra): Paróquia São Benedito (Jaboticabal), Capela São
Miguel Arcanjo (Cemitério) — "Dia das Mães, Dia dos Pais, Dia de São Miguel Arcanjo e
Finados: 7h30".

**Sem dia da semana no site** — 3 blocos que a diocese publica sem dia:

- São Benedito — Jaboticabal · "Capela São Vicente de Paulo (Vila Vicentina): 19h" (a
  comunidade **está** no dataset, sem horário)
- São Benedito — Monte Alto · "Capela Santo Antônio (Bairro Rural): Uma vez ao mês: 19h30"
  (comunidade no dataset, sem horário)

**Missas itinerantes em casas** — 13 blocos que o site publica como local de missa mas que
não têm igreja fixa; **não** viraram comunidade nem horário, para não criar "igrejas"
fictícias. Se o Parish quiser exibi-las, precisa de outra modelagem:

| Paróquia / cidade | Rótulo no site | Horário publicado |
|---|---|---|
| Nossa Senhora de Lourdes — Jaboticabal | Missa nas Casas (Setores da Paróquia) | última sexta-feira do mês, 19h30 |
| São João Batista — Barrinha | CEB's | 3ª terça-feira do mês, 19h30 |
| Nossa Senhora da Conceição Aparecida — Barrinha | Setores (nas casas) | quarta-feira, 19h30 |
| São Francisco de Assis — Taquaritinga | Pequenas Comunidades | quinta-feira, 20h |
| São Joaquim e Sant'Ana — Santa Ernestina | Missa das CEB's (Residências) | terça-feira, 19h30 |
| Sagrada Família de Nazaré — Taquaritinga | Setores | quarta-feira, 19h30 |
| Sagrado Coração de Jesus — Bebedouro | Pequenas Comunidades / Missas nas Casas | última quinta-feira do mês, 20h |
| Nossa Senhora Aparecida — Botafogo | Comunidades | quinta-feira, 19h30 |
| Senhor Bom Jesus — Taquaral | Comunidades (casas) | quarta-feira, 19h30 |
| São Sebastião — Pitangueiras | Setores | 4ª quarta-feira, 19h30 |
| Nossa Senhora Aparecida — Pitangueiras | Missa nas Casas | terça-feira, 19h30 |
| Santo Antônio de Pádua — Cândido Rodrigues | Setores (casas) I / II / III | quarta, quinta e sexta (a cada 15 dias), 19h |
| Santo Antônio — Pirangi | Pequenas Comunidades (Casas) | 1ª quarta-feira do mês, 19h30 |

### Divergências e dados suspeitos

- **Cidade em distrito, não no município.** Quatro paróquias estão cadastradas pela diocese
  com o nome do distrito no campo cidade. O JSON reproduz o valor oficial; se o Parish
  normalizar por município IBGE, é aqui que vai divergir:
  - `Guariroba` → distrito de **Taquaritinga** (Paróquia São Pedro Apóstolo)
  - `Botafogo` → distrito de **Bebedouro** (Paróquia Nossa Senhora Aparecida)
  - `Ibitiuva` → distrito de **Pitangueiras** (Paróquia Sagrado Coração de Jesus)
  - `Aparecida de Monte Alto` → distrito de **Monte Alto** (Santuário N. Sra. da Conceição
    Montesina)
- **Telefone malformado.** Paróquia Santo Antônio (Pradópolis): o site publica
  `(16) 3981-150` — 7 dígitos, falta um. Mantido como está (não inventar).
- **Telefone com dois números.** Paróquia São Sebastião (Taquaritinga): o site publica
  `(16) 3252-2331 e 3252-3516 (WhatsApp)`. Ficou só o primeiro em `phone`; o segundo,
  **(16) 3252-3516 (WhatsApp)**, precisa de campo próprio.
- **Comunidade repetida.** Basílica Menor Senhor Bom Jesus (Monte Alto) lista
  "Comunidade São Cristóvão" **duas vezes**, com horários diferentes (sábado 19h e domingo
  8h). Foram unificadas numa comunidade só, com os dois horários. É provável que uma das
  duas seja outra dedicação digitada errado no site — conferir com a paróquia.
- **Missa diária em outro templo.** Santuário Nossa Senhora da Conceição Aparecida
  (Jaboticabal): o site diz "Todos os dias: 19h (sábado e domingo no Santuário); (durante a
  semana na Capela do Milagre)". Os 7 registros das 19h ficaram na comunidade do Santuário
  com `confidence: "media"` e nota explicativa — a Capela do Milagre **não** é listada como
  comunidade pela diocese, então não foi criada.
- **Pároco a empossar.** Paróquia São Pedro Apóstolo (Guariroba): o site traz
  "Pe. Paulo César Colângelo (a ser empossado em 2026)". Gravado só o nome; confirmar a
  posse.
- **Sem link oficial.** Paróquia São Joaquim e Sant'Ana (Santa Ernestina) é a única sem
  Facebook/Instagram publicado pela diocese (`website: null`).
- **Comunidades de nome genérico**, transcritas literalmente do site e que merecem um nome
  próprio na validação: "Hospital" e "Vila Vicentina" (São Francisco de Assis,
  Taquaritinga), "Asilo" (Senhor Bom Jesus, Monte Azul Paulista), "Lar do Idoso" (Santo
  Inácio de Loyola, Bebedouro), "Centro Catequético" (Nossa Senhora Aparecida, Botafogo),
  "Creche dos Idosos" (Nossa Senhora Aparecida, Monte Alto), "Salão Maria de Nazaré"
  (Nossa Senhora Aparecida, Pitangueiras), "Fazenda Santa Irene" (Santo Antônio de
  Sant'Anna Galvão, Bebedouro).
- **Página /clero sem atribuição pastoral.** A lista de clero da diocese traz ~70 padres com
  data de nascimento e ordenação, mas **não** diz em que paróquia cada um serve. Os
  `priestName` do dataset vêm todos do bloco de horários de cada paróquia — que é a fonte
  oficial mais atual, mas não é uma tabela de nomeações. Os **vigários e colaboradores** que
  o site nomeia não têm campo no formato e ficaram de fora: Pe. José Vinícius Bonfante
  (Santuário N. Sra. Aparecida e N. Sra. de Lourdes, Jaboticabal), Pe. João Francisco da
  Silva e Pe. Rodrigo Gonçalves da Silva (São Sebastião, Taquaritinga), Pe. Everton Leandro
  Piotto (São João Batista, Bebedouro), Pe. Eder Carlos Simi Pereira (N. Sra. Aparecida,
  Bebedouro), Pe. Fr. Gilmar Vasques Carreira ofm (Sagrado Coração, Bebedouro),
  Pe. José Sidney Gouvea Lima (colaborador, Viradouro), Pe. Cícero de Brito (Senhor Bom
  Jesus, Monte Azul Paulista), Pe. José Felippe Netto e Pe. Marcelo Adriano Cervi
  (Basílica Menor, Monte Alto).

### Atualidade das fontes

O cadastro traz `updated_at` por paróquia: **8 registros de 2026** (7 em 03/2026, 1 em
06/2026), **33 de 2025** (19 em 12/2025, 13 em 10/2025, 1 em 08/2025) e **4 de 2024**.
Todas foram classificadas `alta` por serem publicação oficial com sinal de atualidade na
página; os 4 registros de 2024 são os candidatos naturais a uma reconferência:

| Paróquia / cidade | Última atualização |
|---|---|
| São Judas Tadeu — Jaboticabal | 09/08/2024 |
| Santa Teresa de Jesus — Jaboticabal | 09/08/2024 |
| Santo Antônio de Pádua — Taiúva | 12/11/2024 (só 2 horários publicados) |
| Santuário N. Sra. da Conceição Aparecida — Jaboticabal | 26/12/2024 |

### Paróquias com poucos horários publicados

Não é falha da pesquisa — é o que a diocese publica. Vale confirmar direto com a paróquia:

- Santo Antônio de Pádua — Taiúva (2 horários, 1 comunidade)
- Sagrado Coração de Jesus — Ibitiuva (3 horários, só a matriz)
- São Pedro Apóstolo — Guariroba (4)
- São Pedro Claver — Bebedouro (4)
- Senhor Bom Jesus — Taquaral (4, só a matriz)
- São Judas Tadeu — Jaboticabal (5, só a matriz — a paróquia não publica comunidades)
