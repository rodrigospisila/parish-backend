# Relatório — Arquidiocese de Natal (`natal`, RN)

Pesquisa em 11/09/2026.

## Fontes

| Fonte | Papel |
|---|---|
| **Site oficial da Arquidiocese** — https://www.arquidiocesedenatal.org.br, páginas dos 7 vicariatos episcopais (`/vicariato-urbano`, `/cópia-vicariato-urbano`, `/vicariato-norte`, `/cópia-vicariato-norte`, `/vicariato-sul`, `/cópia-vicariato-sul`, `/cópia-vicariato-sul-01`) | **Lista completa das paróquias**, por vicariato e zonal, com endereço, CEP, telefone e e-mail. |
| **Páginas oficiais "Horários de Missa"** — `/cópia-horários-de-missa` e `/cópia-horários-de-missa-2` | Grade de missas de **59 matrizes** (apenas dos vicariatos Urbano 1 e 2). O próprio título avisa "(Horários apenas da Igreja matriz)". |
| **missas.com.br** (`/rio-grande-do-norte/<cidade>/<paróquia>/`) | 65 paróquias em 23 municípios, com **data de verificação**, **fonte declarada** (WhatsApp/Instagram da paróquia ou "Arquidiocese de Natal") e, o mais valioso, **nomes e endereços de capelas/comunidades**. |
| catholic-hierarchy.org | Arcebispo, endereço e telefone da Cúria. |

**Truques de coleta:** (1) as páginas de vicariato são Wix, mas o conteúdo vem no HTML servido — basta
achatar as tags e cortar o menu em "Use tab to navigate through the menu items."; (2) o
missas.com.br só mostra, na página da cidade, as missas **a partir da hora atual** — a lista completa
de paróquias só aparece varrendo `?tipo=missas|confissoes&dia=<domingo…sabado>` (14 requisições por
cidade); a página de cada paróquia traz então toda a grade; (3) as páginas do agregador têm
**encoding misto** (UTF-8 e latin-1 no mesmo documento).

## Cobertura

| Métrica | Valor |
|---|---|
| Entradas no arquivo | 131 |
| Paróquias/áreas pastorais (sem `status`) | **129**, em **68 municípios** |
| Do site oficial | 127 (123 paróquias + 4 áreas pastorais) — **confiança alta** |
| Só do agregador | 4 (2 áreas pastorais em Natal + 2 igrejas não paroquiais) — **confiança baixa** |
| Não paroquiais (`status: "nao-paroquial"`, `loadAsParish: true`) | 2 |
| Comunidades/capelas | **85** (em 26 paróquias) |
| Horários fixos | **784** — **246 alta**, **500 media**, **38 baixa** |
| Paróquias com horário | **85 de 131**; **46 sem nenhum horário** |

Distribuição por vicariato: Urbano 1 = 41, Urbano 2 = 18, Norte 1 = 14, Norte 2 = 15, Sul 1 = 14,
Sul 2 = 13, Sul 3 = 12.

A Arquidiocese se descreve como tendo **124 paróquias e 3 áreas pastorais**; as páginas dos vicariatos
listam **123 paróquias e 4 áreas pastorais**. A diferença é de 1 para mais e 1 para menos — pode ser
texto institucional defasado ou uma paróquia ausente de alguma página.

## Regra de confiança aplicada aos horários

- **alta** — o horário está na página oficial da Arquidiocese **e** o missas.com.br concorda (mesmo
  dia e hora). 246 registros.
- **media** — só na página oficial da Arquidiocese (fonte oficial sem carimbo de atualização), **ou**
  só no missas.com.br mas com "Fonte: Arquidiocese de Natal" ou com data de verificação (2024–2025).
  500 registros.
- **baixa** — recorrência mensal ("1ª sexta-feira", "todo dia 13", "último domingo"), que não cabe no
  `MassSchedule`, ou registro de agregador sem carimbo nem fonte declarada. 38 registros.

Missas amarradas a **dia do mês** e não a dia da semana ("Todo dia 3", "Dias 13 e 18") foram
**descartadas**, não rebaixadas — não há como representá-las.

## Decisões tomadas

- `Paróquia da Catedral de Nossa Senhora da Apresentação` → gravada como
  **`Catedral Metropolitana de Nossa Senhora da Apresentação`** (Tirol). Não confundir com a
  `Paróquia Nossa Senhora da Apresentação` da Cidade Alta, que é a **antiga catedral** (a matriz dela
  aparece no agregador como "Matriz de Nossa Senhora da Apresentação (antiga Catedral)").
- Artigo de ligação removido do nome ("Paróquia de Nossa Senhora da Conceição" → "Paróquia Nossa
  Senhora da Conceição"), seguindo o padrão dominante do dataset.
- `Paróquia de São Gonçalo do Amarante` → **`Paróquia São Gonçalo`** (a cidade sai do nome).
- `Paróquia de Nossa Senhora de Fátima – Pq. das Dunas` → **`Paróquia Santuário Nossa Senhora de
  Fátima`** (a página de horários e o e-mail `santuariodefatimanatal@` confirmam o santuário).
- Comunidades: só entram as que o missas.com.br nomeia (elas vêm do WhatsApp/Instagram da própria
  paróquia). Quando uma paróquia tem capelas listadas, acrescentei explicitamente a comunidade
  **"Matriz"** com `isMatriz: true`, para a missa da matriz não cair na primeira capela. Variantes
  ("Igreja Matriz", "Matriz de Cristo Rei", "Matriz Santuário", "SECRETARIA PAROQUIAL") foram
  normalizadas para "Matriz".
- Confissão com faixa ("16:30 - 18:30") entra pelo horário de início, com a faixa em `notes`.
- O campo "Site" do missas.com.br foi **ignorado**: aponta para a fonte (o próprio site da
  Arquidiocese), não para a paróquia.

## Precisa de validação humana (em ordem de prioridade)

1. **`nossa-senhora-da-saude-boa-saude`** — a página do Vicariato Sul 3 **repete o título da paróquia
   anterior** ("Paróquia da Imaculada Conceição - Lagoa Salgada") num bloco cujo endereço é
   Boa Saúde/RN e cujo e-mail é `matrizdenossasenhoradasaude@hotmail.com`. Gravei como
   **Paróquia Nossa Senhora da Saúde**, `confidence: baixa`. Confirmar o nome oficial.
2. **`area-pastoral-nossa-senhora-das-dores-natal`** e **`area-pastoral-nossa-senhora-dos-navegantes-natal`**
   — existem só no missas.com.br (que declara a Arquidiocese como fonte) e **não aparecem em nenhuma
   página de vicariato**. Podem ser duplicatas de paróquias já listadas. `confidence: baixa`.
   Atenção: "N. Sra. dos Navegantes" não é a Paróquia Nossa Senhora dos Navegantes da Redinha.
3. **Cidades divergentes no agregador** — o missas.com.br publica sob "Natal" três paróquias que a
   Arquidiocese situa fora da capital. Casei pelo endereço/dedicação, mas convém conferir:
   - `santo-andre-de-soveral-parnamirim` (endereço do agregador confirma Parnamirim/Emaús);
   - `nossa-senhora-da-penha-monte-alegre` (agregador sem endereço);
   - `nossa-senhora-da-piedade-espirito-santo` (agregador sem endereço).
4. **`Paróquia de Sant'Ana` de Natal no missas.com.br** foi **descartada**: existem duas paróquias de
   Sant'Ana em Natal (Capim Macio e Soledade 2) e a ficha do agregador, sem endereço, traz a união
   dos dois conjuntos de horários (7h/10h/17h/19h). Os horários oficiais das duas já estão no arquivo.
5. **CEP 59200-000 repetido** em `nossa-senhora-do-amparo-coronel-ezequiel` e
   `santa-rita-de-cassia-santa-cruz` — o CEP de Santa Cruz/RN é 59200-000; o de Coronel Ezequiel
   parece copiado errado na página oficial.
6. **E-mail malformado na fonte oficial**: `virgem-e-martir-santa-luzia-touros` →
   `igrejadesantaluzia13@gmail.br` (domínio `gmail.br` não existe). Gravado como está.
7. **6 registros sem CEP**: `nossa-senhora-de-fatima-macaiba`, `virgem-e-martir-santa-luzia-touros`,
   `area-pastoral-sao-pedro-e-santa-luzia-bodo`, `area-pastoral-sagrado-coracao-de-jesus-sao-jose-de-mipibu`
   e as duas áreas pastorais só do agregador.
8. **`Paróquia de São Pedro Apóstolo – Alecrim`**: a linha oficial "Domingo - 6h30, 10h30, 17h 2ª"
   termina com um "2ª" solto que pertence à linha seguinte ("2ª Segunda-Feira: 18h00"). O parser
   marcou as três missas de domingo como mensais → `baixa`. São missas semanais normais; podem ser
   promovidas na validação.
9. **`Paróquia do Bom Jesus das Dores – Ribeira`**: a linha oficial diz "Segunda sábado: 17h" (falta
   o "a"). Interpretei como **segunda e sábado**; provavelmente é **segunda a sábado**.
10. **Área Pastoral de São Pedro e Santa Luzia (Bodó)** pertence à Arquidiocese de Natal mas é
    administrada pela **Diocese de Caicó** (a própria página o diz). Cuidado para não duplicá-la no
    arquivo de Caicó.

## O que ficou sem

- **46 paróquias sem nenhum horário** — quase todas do interior (Vicariatos Norte 1 e 2, Sul 1, 2 e 3).
  A Arquidiocese só publica grade dos vicariatos urbanos, e o missas.com.br não tem essas cidades.
- **Sem nome de pároco** em todas as entradas: as páginas de vicariato não trazem o clero por paróquia
  (há uma lista separada de padres, sem vínculo com a paróquia).
- **Sem ano de fundação** em todas as entradas: a Arquidiocese não publica.
- A Arquidiocese está em processo de **desmembramento** (o site tem páginas "Futura Diocese de Santa
  Rita" e "Futura Diocese de São João Batista"). Quando as novas dioceses forem erigidas, boa parte
  destas paróquias mudará de circunscrição.
