# Relatório — Arquidiocese de Cuiabá (MT)

Pesquisa em 2026-09-11. Arquivo: `cuiaba.json`.

## Resumo

| Métrica | Valor |
|---|---|
| Paróquias no arquivo | 33 (32 `alta`, 1 `media`, 0 `baixa`) |
| Paróquias esperadas | 31 (catholic-hierarchy.org, estatística de 2023) |
| Comunidades | 85 |
| Horários fixos | 387 (380 `alta`, 7 `baixa`) |
| Paróquias sem nenhum horário | 2 |

Distribuição por município: Cuiabá 20, Várzea Grande 7, Santo Antônio de Leverger 2,
Nobres 1, Rosário Oeste 1, Acorizal 1, Jangada 1.

## Fontes principais

- **Site oficial** — <https://arquidiocesecuiaba.org.br> (WordPress + Elementor).
  O caminho que resolveu tudo foi a **API REST do custom post type `paroquia`**:
  `https://arquidiocesecuiaba.org.br/wp-json/wp/v2/paroquia?per_page=100` devolve a lista
  canônica de uma vez (`X-WP-Total: 33`). As páginas têm `modified` entre **02/06/2026 e
  19/08/2026** — sinal de atualidade forte, o que justifica `alta` em quase tudo.
- Cada ficha de paróquia (`/paroquia/<slug>/`) publica, em widgets Elementor:
  ano de criação, telefone, e-mail (ofuscado pelo Cloudflare, decodificado via `data-cfemail`),
  atendimento/confissões, endereço, história, clero com função (Pároco/Vigário/Reitor) e
  **grade de missas por dia da semana** (repetidor ACF com colunas Tipo / Dia / Horário / Observações).
- <https://arquidiocesecuiaba.org.br/horarios-de-missas/> — agregado de todas as grades;
  conferido contra a extração ficha a ficha, **bate 100%** (serviu de prova de completude).
- <https://www.catholic-hierarchy.org/diocese/dcuia.html> — 31 paróquias (2023), 872.000 católicos,
  113 presbíteros, 24.542 km².
- Complementos pontuais (3 fichas sem endereço no site):
  - Facebook oficial da Paróquia Nossa Senhora do Pantanal (Várzea Grande);
  - site oficial <https://guadalupecba.com.br> (Paróquia Nossa Senhora de Guadalupe, Cuiabá);
  - matéria da própria Arquidiocese sobre a novena de Nossa Senhora das Dores (setembro/2026).

## Decisões tomadas

- **Sé vacante.** Dom Mário Antônio da Silva foi transferido para a Arquidiocese de Aparecida (SP),
  onde tomou posse em 02/05/2026. A Arquidiocese está sob o administrador arquidiocesano
  **padre Deusdedit Monge de Almeida**. Por isso `bishopName: null`, com a explicação em `notes`.
- **Cobertura 33 × 31.** As duas entradas a mais são compatíveis com as paróquias criadas em 2024
  (São Mateus Apóstolo e Evangelista, e São Sebastião — Três Barras), posteriores à estatística
  de 2023 do catholic-hierarchy.
- **Três santuários entram como paróquia**: Santuário Eucarístico São João Paulo II,
  Santuário Eucarístico Nossa Senhora do Bom Despacho e Santuário Nossa Senhora da Medalha
  Milagrosa. A Arquidiocese os publica dentro do diretório de paróquias, com pároco/reitor,
  endereço e missa fixa — e a regra do README manda entrar igreja com horário publicado.
  Não recebem `status: "nao-paroquial"` porque a fonte oficial **não** diz que não são paróquias.
- **Nome sem cidade.** As fichas usam sufixo de cidade para desambiguar homônimos
  ("São Sebastião – Nobres", "Nossa Senhora da Guia – Várzea Grande"). O sufixo foi removido do
  `name` e jogado em `city`/`neighborhood`; a desambiguação foi para o `slug`
  (`nossa-senhora-da-guia-coxipo-cuiaba`, `nossa-senhora-da-guia-distrito-da-guia-cuiaba`,
  `nossa-senhora-da-guia-varzea-grande`).
- **Horários mensais → `baixa`**, com a regra literal em `notes` (7 registros):
  N. Sra. Aparecida/Cuiabá (1ª sexta 19h30), N. Sra. do Rosário e São Benedito (1ª sexta 19h),
  N. Sra. do Pantanal (1ª sexta 19h30), N. Sra. Aparecida/Jangada (1ª sexta 19h),
  N. Sra. Mãe dos Homens (1ª sexta 12h), Santuário da Medalha Milagrosa (1ª sexta 19h30 + adoração).
- **Confissões/adoração/terço** foram extraídos do bloco "Atendimento" das fichas quando o dia da
  semana e o horário de início estavam explícitos; o intervalo completo ficou em `notes`
  (ex.: `"Terça a quinta-feira - 16h às 18h"`). Distribuição dos 387 registros:
  **298 MASS, 80 CONFESSION, 8 ADORATION, 1 ROSARY**.
- **Missas por dia do mês foram descartadas** por não caberem em `dayOfWeek`:
  Paróquia São Mateus — "missa votiva a São Mateus todo dia 21 de cada mês, às 19h30".
  (Mesmo bloqueio de modelagem já registrado no README.)
- **"Ano de Criação" foi aceito** aqui: os valores são heterogêneos e historicamente plausíveis
  (1722, 1730, 1781, 1833, 1835, 1947, 1953, 1960, 1968…), sem o padrão de data única repetida em
  massa que denunciou cadastro de CMS em Itapetininga/São Carlos.

## Precisa de validação humana

1. **Paróquia Nossa Senhora das Dores (Cuiabá, Jardim Florianópolis)** — `confidence: "media"`.
   Está no diretório oficial de paróquias, mas sem endereço, telefone, pároco ou horário. Uma
   matéria da própria Arquidiocese (setembro/2026) a descreve como **comunidade** e "futura igreja
   matriz da **Área Pastoral Santíssima Trindade**", desmembrada da Paróquia Nossa Senhora do
   Rosário e São Benedito e administrada pelo padre José Pereira. É paróquia, quase-paróquia ou
   área pastoral? Sem horário publicado.
2. **Paróquia Rural de Santa Cruz das Palmeiras (Santo Antônio de Leverger)** — entra sem nenhum
   horário: a ficha traz endereço e pároco (Padre Lucas Nunes Teco dos Santos), mas a grade de
   missas está vazia no site. Paróquia rural de território extenso; provavelmente atende
   comunidades em rodízio mensal não publicado.
3. **Paróquia Nossa Senhora da Guia – Distrito da Guia (Cuiabá)** — sem endereço, telefone e
   e-mail no site (só a grade de missas e o pároco).
4. **Paróquia Nossa Senhora de Brotas (Acorizal)** — o campo "Endereço" da ficha contém apenas o
   CEP `78485-000`; o logradouro ficou `null`. A cidade (Acorizal) foi confirmada pelo texto da
   ficha da Paróquia N. Sra. Aparecida de Jangada ("A divisão da Paróquia Nossa Senhora de Brotas,
   em Acorizal…") e pelo CEP.
5. **Pároco da Paróquia Nossa Senhora do Rosário e São Benedito** — a ficha lista
   Padre Pedro Canísio Schoeder SJ como *Pároco* e Padre José Pereira Santos como *Reitor*;
   a matéria de setembro/2026 confirma Pedro Canísio como pároco. Foi adotado o Pároco.
   Para Nossa Senhora Aparecida (Cuiabá) e Nossa Senhora da Guia (Coxipó) o site não marca ninguém
   como pároco → `priestName: null`.
6. **Telefones em formato livre** (`"65 - 99277 1705"`, `"65 999264-5956 / 65 3691-6220"`,
   `"(65) 2127-0617 - 9 89403 4757"`) e um e-mail com domínio provavelmente digitado errado:
   `paseba@cuiabaarquidiosece.net` (São Sebastião/Várzea Grande) — note "arquidiosece".
7. **Comunidades** só existem para 10 das 33 paróquias (85 no total), porque só essas publicam a
   lista no texto da ficha. A maior é Nossa Senhora do Rosário (Rosário Oeste), com 43 comunidades
   (8 urbanas + 35 rurais) — e a fonte repete "Nossa Senhora Aparecida – Fonte Estevão" duas vezes,
   deduplicada aqui. As outras 23 paróquias ficaram com `communities: []`.
8. **Paróquia Nossa Senhora da Guia (Várzea Grande)** — a matriz onde se celebra é a
   **Igreja Matriz Nossa Senhora do Carmo** (a "Igrejinha de Nossa Senhora da Guia", no centro, é
   patrimônio e sedia celebrações menores). Foi marcada `isMatriz: true` a N. Sra. do Carmo,
   conforme o texto oficial — conferir se o app deve exibir a paróquia com esse nome de matriz.
