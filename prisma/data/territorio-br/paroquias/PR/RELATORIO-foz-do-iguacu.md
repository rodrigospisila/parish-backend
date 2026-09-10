# Relatório de pesquisa — Diocese de Foz do Iguaçu (PR)

Data da pesquisa: 2026-09-10 (retomada e conclusão; um agente anterior havia gravado 8 paróquias em
2026-09-09). Arquivo de dados: `foz-do-iguacu.json` — reescrito integralmente, sem o marcador
`"__PART2__"` que encerrava o arquivo parcial.

## Fontes principais

| Fonte | Uso | Confiança |
|---|---|---|
| https://diocesedefoz.org.br/paroquias/ | Listagem oficial: 30 unidades em 5 decanatos (N. S. de Guadalupe 6, São Francisco de Assis 5, São João Batista 5, N. S. Medianeira 8, N. S. de Caravaggio 6), todas com página própria | alta |
| https://diocesedefoz.org.br/<slug-da-paroquia>/ (30 páginas) | Página de cada unidade: pároco/vigários/diáconos, lista de capelas, endereço, CEP, telefone, WhatsApp, e-mail, redes, expediente e tabela "Horários de missa" (dia / horário / capela) | alta |
| https://diocesedefoz.org.br/curia-diocesana/ | Endereço, CEP, telefones e e-mails da Cúria | alta |
| https://www.catholic-hierarchy.org/diocese/dfodi.html | Nº esperado de paróquias (28 em 2023), bispo (Dom Sérgio de Deus Borges), ereção (1978) | media |
| https://pt.wikipedia.org/wiki/Diocese_de_Foz_do_Igua%C3%A7u | "28 paróquias e três Áreas Pastorais"; 14 municípios; catedral | media |
| WebSearch (diocesedefoz.org.br/decretos-portarias-e-comunicados/, blogdolago.com.br) | Indício de decreto de 11/06/2026 renomeando a Paróquia Bom Jesus do Migrante para Paróquia Santo Antônio — não lido diretamente | baixa |

Método: as 30 páginas foram baixadas em HTML bruto (`curl`) e a tabela de horários foi lida **posicionalmente**
(linha *i* da célula "dia" ↔ linha *i* de "horário" ↔ linha *i* de "capela", com quebras `<br>`), que é o que o
visitante vê no navegador. Isso foi necessário porque o resumo automático das páginas desalinhava as células
(descoberto ao conferir os 8 registros herdados do agente anterior contra a fonte).

## Cobertura

- **Paróquias encontradas: 30** — **esperadas: 30** (site oficial, 2026). Catholic-Hierarchy registra 28 (2023) e a
  Wikipédia "28 paróquias e 3 áreas pastorais"; o site não distingue área pastoral de paróquia (duas unidades têm
  "Administrador Paroquial" em vez de pároco: Serranópolis do Iguaçu e Ramilândia). Todas gravadas como
  "Paróquia …" (nome do site) com `confidence: "alta"`.
- Confiança das paróquias: **30 alta**, 0 media, 0 baixa.
- Comunidades: **367** registros em 28 paróquias (28 matrizes explícitas com `isMatriz: true` + 339 capelas/comunidades
  do site oficial). Duas paróquias sem lista no site ficaram com `communities: []` (São José das Palmeiras e Vera
  Cruz do Oeste) — os horários delas usam `"Matriz"`.
- Horários: **310** registros, todos `MASS`: **192 alta** e **118 baixa**. Os "baixa" são missas com recorrência
  mensal ("1º domingo do mês", "2ª e 4ª quintas-feiras" etc.), mantidas com a recorrência em `notes` para validação,
  pois o esquema só representa recorrência semanal (mesma convenção do relatório de Paranavaí). Quatro registros
  "baixa" da Paróquia N. S. de Caravaggio (Matelândia) são ambíguos quanto à capela (ver abaixo).
- Sem horários publicados (tabela vazia no site): N. S. Aparecida (Itaipulândia), N. S. de Fátima (Serranópolis do
  Iguaçu) e São José Operário (Céu Azul). Várias paróquias do interior publicam só a matriz ("para horários nas
  capelas, consultar a secretaria"): São Miguel do Iguaçu, Santa Helena (Santo Antônio e São Roque), Medianeira
  (ambas), Missal, Vera Cruz do Oeste, Diamante D'Oeste.
- Nenhum horário fixo de confissão/adoração/terço é publicado de forma estruturada (0 CONFESSION/ADORATION/ROSARY).
- `foundedYear`: o site não informa ano de criação — `null` em todas.

## Correções em relação ao arquivo parcial anterior (8 paróquias)

Conferidas contra o HTML bruto; as demais paróquias herdadas estavam corretas.

1. **Paróquia São Pedro**: missa de quarta-feira 15h na matriz é semanal (estava "1ª quarta"); Capela Santo Inácio de
   Loyola 19h30 é todo sábado (estava "1º sábado"); Capela São Sebastião 17h é no 1º e 3º sábados (estava só "3º").
2. **Paróquia N. S. da Luz**, domingos: Matriz 19h30 semanal (estava "1º domingo"); Santa Edwiges 9h30 no 1º domingo;
   Santa Luzia 9h30 no 2º; N. S. da Paz 10h45 no 3º; N. S. da Saúde 9h30 no 4º (estavam deslocados).
3. **Paróquia São Francisco de Assis**: a linha "Domingo 19h30 – Capela São Francisco de Assis" é a matriz (erro de
   digitação do site), gravada como Matriz.
4. Convenção de confiança: recorrências mensais passaram de "alta" para "baixa" (com `notes`), em todo o arquivo.
5. `accessedAt` atualizado para 2026-09-10; fonte da listagem oficial adicionada a todas as paróquias.

## Regras aplicadas

- Nome oficial do site com prefixo ("Paróquia …", "Catedral …"); a Paróquia de Porto Meira mantém o nome do site
  "Paróquia do Espírito Santo e Nossa Senhora Aparecida" (slug sem o "do").
- `address` = rua e número (pontos de milhar removidos: "5.440" → "5440") + bairro; `neighborhood` = bairro do
  endereço; CEP normalizado ("85.860-290" → "85860-290").
- `phone`: telefone fixo; na falta, WhatsApp com DDD (45) acrescentado quando o site o omite.
- `website`: site próprio quando há (Catedral, São João Batista); Instagram oficial quando o identificador é claro
  (N. S. das Graças, São Francisco de Assis, Anunciação do Senhor); caso contrário `null`.
- `priestName`: "Pároco" da página; "Administrador Paroquial" gravado no mesmo campo (Serranópolis: Pe. Sidnei Felski;
  Ramilândia: Pe. Silvester Anas, SVD). Vigários e diáconos não têm campo no esquema.
- Comunidades: nome como no site; quando o site informa a localidade ("Capela X – Bairro Y"), ela fica no nome (para
  evitar homônimos: Medianeira tem cinco "Capela N. S. Aparecida") e em `neighborhood`. Listas no formato
  "Localidade – Padroeiro" (São Miguel do Iguaçu, Diamante D'Oeste) foram normalizadas para "Capela Padroeiro –
  Localidade"; a lista de Santa Helena (só localidades) virou "Comunidade <localidade>". Abreviações expandidas
  ("Nossa Sra." → "Nossa Senhora"; "La." → "Linha"; "B." → "Bairro"). Erros de digitação corrigidos: "Aparecido" →
  Aparecida (Medianeira), "Copabana" → Copacabana (Anunciação), "Santa Lucia" → Santa Lúcia e "Tome De Souza" →
  Tomé de Souza (Matelândia), "São Sabastião" → São Sebastião (Missal).
- Missas da Catedral em "Capela do Santíssimo" e "Cripta" foram atribuídas à Catedral com a observação em `notes`.
- Missas em locais não paroquiais **não** foram importadas: Catedral — Condomínio Terras Alpha I (1ª segunda 19h30),
  Condomínio Vila "A" Park (4ª segunda 19h30) e Lar dos Velhinhos (última sexta 16h); Santa Terezinha de Itaipu —
  Cemitério Municipal (1ª segunda 8h30).
- Linhas com dia em branco na tabela herdam o rótulo anterior (ex.: Santa Terezinha de Itaipu, 1ª sexta: 15h matriz,
  15h N. S. do Carmo e 19h30 São Cristóvão); quando o número de rótulos coincide com o de horários, pareou-se na
  ordem (Catedral, sábado: 19h30 catedral / 1º sábado 8h cripta).

## Registros que precisam de validação humana

1. **Paróquia N. S. de Caravaggio (Matelândia)** — a tabela cita "Capela São José" (1ª quarta 19h30, 1ª quinta 19h30,
   2º sábado 15h) e "Capela Nossa Senhora Aparecida" (4ª segunda 19h30) sem localidade, mas a paróquia tem três
   capelas São José (Linha Duarte, Picada Benjamim, Rio Ocoy) e três N. S. Aparecida (Silva Jardim, Tomé de Souza,
   Bananal). Os quatro horários foram atribuídos à primeira capela da lista com `confidence: "baixa"` e a dúvida em
   `notes`.
2. **Paróquia São Pedro (Foz)** — a página lista apenas "Vigário: Pe. Dirceu Lopes, MSC" e "Vigário: Pe. Eugenio Luedke
   Filho, MSC", sem pároco; `priestName: null`.
3. **Paróquia Santo Antônio (Foz, Jardim América)** — segundo resultado de busca, é a antiga Paróquia Bom Jesus do
   Migrante, renomeada por decreto de 11/06/2026; a capela "Bom Jesus do Migrante – Vila Portes" consta na lista.
   Confirmar no site (decretos-portarias-e-comunicados).
4. **Paróquia N. S. de Fátima (Serranópolis do Iguaçu)** — lista duas "Comatriz" (São Paulo – Flor da Serra; São
   Sebastião – Jardinópolis), gravadas como comunidades com o nome do site.
5. **Paróquia São Miguel (São Miguel do Iguaçu)** — o texto diz 42 capelas, a lista tem 45 (todas gravadas);
   "Santuário do Rocio – N. Sra. do Rocio" gravado como "Santuário Nossa Senhora do Rocio – Santuário do Rocio".
   **Medianeira** diz 30 capelas e lista 29.
6. **Paróquia N. S. da Saúde** — quinta 20h na Capela São Cristóvão "celebrado nas casas" (nota mantida).
7. **Paróquia Menino Jesus** — quinta 6h30 "com exposição do Santíssimo" e 19h "Bênção do Santíssimo" mantidas como
   MASS com nota; capela N. S. Aparecida tem missa toda quarta 20h além dos sábados (leitura posicional).
8. **Paróquia N. S. da Conceição (Missal)** — 1ª sexta na Capela Cristo Rei o site traz "15" sem "h"; assumido 15h.
9. Duas unidades com "Administrador Paroquial" (Serranópolis, Ramilândia) podem ser as "áreas pastorais" da Wikipédia.
10. Diocese: bispo (Dom Sérgio de Deus Borges) vem do Catholic-Hierarchy/Wikipédia — a página da Cúria não o nomeia.

## Dúvidas abertas

- Quais são as três "Áreas Pastorais" citadas pela Wikipédia (o site trata as 30 unidades igualmente).
- Anos de criação das paróquias (não publicados no site).
- Horários das capelas das paróquias do interior que só publicam a matriz.
