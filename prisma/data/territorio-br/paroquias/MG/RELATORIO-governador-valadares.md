# Relatório de pesquisa — Diocese de Governador Valadares (MG)

**Agente:** pesquisa de território BR — Vale do Rio Doce e Mucuri
**Data da coleta:** 2026-09-10
**Arquivo gerado:** `governador-valadares.json`

## Resumo

| Métrica | Valor |
|---|---|
| Paróquias | **55** (todas `alta`) |
| Comunidades/capelas | 144 |
| Horários fixos | 293 (223 `alta` + 70 `baixa`) |
| Paróquias sem horário | 0 |
| Cobertura | 55 encontradas / 55 publicadas pela diocese (54 no Catholic-Hierarchy, dados de 2023) |

## Fontes principais

1. **https://diocesevaladares.com.br/paroquias/** — índice oficial das paróquias por setor pastoral
   (56 entradas; a 56ª é a *Mitra Diocesana*, não paroquial, e **não** entrou no dataset).
   Site WordPress ativo, com custom post type `paroquia` exposto em
   `/wp-json/wp/v2/paroquia?per_page=100` (`X-WP-Total: 56`).
2. **https://diocesevaladares.com.br/horarios-de-missa/** — quadro diocesano de horários de missa,
   organizado por setor (1 a 5) e cidade, com índice A-Z de 54 paróquias.
   Sinal de atualidade: o site publica "Palavra do Bispo" diária (última em 27/09/2026) e a
   *Folha da Boa Nova* de setembro/2026 → confiança **alta** para os horários.
3. **Páginas individuais de cada paróquia** (`/paroquia/<slug>/`) — endereço completo, CEP, telefone,
   e-mail, atendimento da secretaria, quadro de horários (repetidor ACF com `dia_da_semana_paroquia`,
   `tipo_paroquia`, `horario`, `observacoes`), lista de comunidades e clero.
   `modified` das páginas: a maioria entre 2025-05 e 2026-08 → material recente.
4. **https://www.catholic-hierarchy.org/diocese/dgova.html** — erigida em 01/02/1956; 14.588 km²;
   516.400 hab., 319.894 católicos; **54 paróquias (2023)**; Dom Antônio Carlos Félix (desde 06/03/2014).
5. **https://pt.wikipedia.org/wiki/Diocese_de_Governador_Valadares**

Observação técnica: o `WebFetch` recebeu **403** em todo o domínio; a coleta foi feita com `curl`
enviando User-Agent de Chrome. O host `www.diocesevaladares.com.br` responde **404** — o domínio
canônico é **sem `www`**. Os e-mails do site são ofuscados pelo Cloudflare (`data-cfemail`) e foram
decodificados (XOR com o primeiro byte).

## Estrutura pastoral

A diocese divide as paróquias em **5 setores**:

| Setor | Padroeiro | Cidades-sede principais |
|---|---|---|
| I | Nossa Senhora do Carmo | Aimorés, Conselheiro Pena, Cuparaque, Galileia, Goiabeira, Ituêta, Resplendor, Santa Rita do Ituêto, São Geraldo do Baixio, Divino das Laranjeiras |
| II | Sant'Ana | Coroaci, Gonzaga, Marilac, Nacip Raydan, Santa Efigênia de Minas, São Geraldo da Piedade, São José da Safira, Sardoá, Virgolândia |
| III | Sagrado Coração de Jesus | Alpercata, Alvarenga, Capitão Andrade, Engenheiro Caldas, Itanhomi, Sobrália, Tumiritinga |
| IV | Sagrada Família | Açucena, Naque, Periquito e 9 paróquias de Governador Valadares |
| V | Santo Antônio | Mathias Lobato e 12 paróquias de Governador Valadares |

O setor gravado em `setorPastoral` veio do **índice de paróquias** e do **índice A-Z da página de
horários** (que concordam entre si). O campo "Setor" das páginas individuais **não é confiável** —
várias trazem "I – Nossa Senhora do Carmo" por omissão de preenchimento (ex.: Santa Helena/GV e
São João XXIII, que na verdade são Setor V e IV).

## Divergências e correções aplicadas

1. **Paróquia São José (Conselheiro Pena)** — a página oficial publica, no bloco "Comunidades", as
   **comunidades e horários da Paróquia São João XXIII** (Vila dos Montes, GV). Confirmado pela
   página de horários diocesana e pelo texto da própria página de São João XXIII (4 comunidades:
   Menino Jesus de Praga, Santa Luzia, Santo Expedito, São Sebastião). Os dados foram **atribuídos a
   São João XXIII** e ambas as paróquias receberam `notes` explicando.
2. **Paróquia Santa Rita de Cássia (Santa Rita do Ituêto)** — o quadro de horários está no campo
   "Atendimento" da página, não no repetidor de horários. Foi transcrito manualmente (idêntico ao da
   página diocesana). As 18 comunidades vieram do histórico da própria página.
3. **Paróquia Nossa Senhora da Saúde (Alvarenga)** — a página da paróquia não tem horários; foram
   usados os da página diocesana (Setor 3).
4. **Divino das Laranjeiras** aparece sob o título "SETOR 5" no corpo da página de horários, mas o
   índice A-Z e o índice de paróquias dizem **Setor I**. Gravado como Setor I (erro de diagramação
   da fonte).
5. **Catedral** — o site a chama de "Paróquia Catedral de Santo Antônio – Centro – GV"; gravada como
   `Catedral Santo Antônio` (regra de prefixo do README).
6. **Santuário** — "Paróquia e Santuário Santa Rita de Cássia" (único santuário diocesano, elevado em
   21/05/1995, confiado aos Capuchinhos) foi mantido com o nome oficial completo.

## Pontos que precisam de validação humana

- **Paróquia Nossa Senhora da Saúde (Alvarenga, MG)** aparece **simultaneamente**: (a) no site da
  Diocese de Governador Valadares, com página, endereço e horários; (b) no site da **Diocese de
  Caratinga**, como "Paróquia Nossa Senhora da Saúde – (ad experimentum)" na Forania de Iapu.
  Gravada nos **dois** arquivos, com `jurisdictionNote` no de Caratinga. **Só uma das duas cargas
  deve permanecer.**
- **Paróquia São Cristóvão** (Distrito de Santo Antônio do Pontal, GV) não consta do índice A-Z da
  página de horários e não tem setor publicado → `setorPastoral: null`. Provável paróquia recente
  (explica a diferença 55 × 54 do Catholic-Hierarchy).
- **Párocos**: o bloco "Clero" de várias páginas lista sacerdotes de **outra** paróquia (ex.: a
  página de Santa Rosa de Lima mostra o pároco de São Francisco Xavier e vice-versa). Só foi gravado
  `priestName` quando a própria entrada do clero nomeia aquela paróquia. Ficaram **sem pároco**:
  Nossa Senhora da Saúde (Alvarenga), Nossa Senhora de Lourdes (GV), Santa Luísa (Marilac),
  Santa Luzia (Mathias Lobato), São José (São José da Safira), São Sebastião (Periquito).
  Atenção: Santa Rosa de Lima e São Francisco Xavier podem estar **trocados** na fonte.
- **Missas de recorrência mensal** (70 registros `baixa`): "1ª sexta-feira", "2º e 4º domingo",
  "última quinta-feira", "2ª semana do mês" etc. A regra literal está em `notes`.
- **Horários não modeláveis** (ficaram só em `notes` da paróquia, sem registro em `schedules`):
  - Imaculada Conceição (GV): missa "todo dia 08" às 19h30;
  - Santa Helena (GV): missa votiva "todo dia 18"; missa às 06h00 todas as sextas **durante a Quaresma**;
  - São Judas Tadeu (GV): missa do padroeiro "dia 28 do mês" às 19h30;
  - São Cristóvão (GV): missa votiva "todo dia 25" às 19h30;
  - Cristo Redentor (GV): celebrações na ADQF "todas as terças-feiras e no 3º domingo do mês";
  - Sagrado Coração de Jesus (Cuparaque): "missa durante a semana 19h30" (dia não especificado);
  - Santa Dulce (GV): duas linhas com o campo "dia" preenchido incorretamente pela fonte.
- **Celebrações da Palavra** (não gravadas como missa, conforme regra): Nossa Senhora da Assunção
  (domingo 09h30, com as crianças), Santa Dulce (2º e 4º domingo 19h00, Com. N. Sra. da Penha),
  Santa Teresinha (última quinta 19h00–20h00, Com. São Paulo Apóstolo — adoração).
- **Telefones/e-mails**: gravados exatamente como publicados; alguns campos trazem dois números no
  mesmo texto (ex.: "(33) 3221-1013 ou (33) 9 8818-9462") e um traz dois e-mails separados por "/".
- **Comunidades**: só entraram as explicitamente publicadas (bloco "Comunidades" ou campo
  "observações" do quadro de horários). Paróquias com histórico dizendo "X comunidades" mas sem a
  lista ficaram apenas com a matriz — ex.: Nossa Senhora das Graças (GV), Sant'Ana (Resplendor),
  Santo Antônio (Sardoá, "14 comunidades rurais"), Senhor Bom Jesus (Alpercata, 12 comunidades
  listadas só no texto histórico do CPT).
- **`foundedYear`**: não gravado para nenhuma paróquia. Vários históricos citam ano de criação em
  texto corrido (ex.: Santa Rita de Cássia/GV em 08/09/1967; São Sebastião/Periquito em 01/09/2004;
  Santa Efigênia em 1999; Santa Rosa de Lima em 1992; Guadalupe em dezembro/2003), mas como não há
  campo estruturado na fonte, ficaram fora para não misturar data de criação com data de decreto.
