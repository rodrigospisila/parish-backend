# Arquidiocese de Fortaleza (CE) — relatório de pesquisa

Pesquisa em 11/09/2026. Arquivo gerado: `fortaleza.json`.

## Resultado

| | |
|---|---|
| Entradas de paróquia | **151** (144 paróquias + 1 paróquia-santuário + 6 áreas pastorais) |
| Confiança `alta` | 151 (todas) |
| Confiança `media` / `baixa` | 0 |
| Comunidades/capelas | 271 (151 matrizes + 120 capelas/comunidades nominadas) |
| Horários fixos | 1.341 — 1.067 MASS, 243 CONFESSION, 29 ADORATION, 2 ROSARY |
| Horários `alta` / `media` / `baixa` | 1.101 / 238 / 2 |
| Paróquias com endereço + CEP | 150 de 151 |
| Paróquias com telefone | 149 · e-mail: 147 · pároco: 136 |
| Municípios cobertos | 30 |

## Fonte principal

**Site oficial da arquidiocese** — `https://www.arquidiocesedefortaleza.org.br/`. O portal é WordPress
e mantém **uma página por paróquia**, com ficha estruturada: endereço, bairro, CEP, cidade, fixo,
celular, WhatsApp, e-mail, site, Facebook/Instagram/YouTube, **grade de missa da matriz por dia da
semana**, horário de secretaria, pároco/colaboradores/diáconos/secretária, horário de confissões,
histórico com o decreto de criação e, em parte delas, a lista de capelas/comunidades.

Caminho de coleta (vale repetir em outras dioceses):

1. O CPT `paroquias` da REST API (`/wp-json/wp/v2/paroquias`) tem **1 registro só** (`Paróquia Teste`) —
   não serve. As paróquias são **páginas** comuns.
2. As URLs saíram do **sitemap**: `sitemap_index.xml` → `page-sitemap1..8.xml`, filtrando
   `/arquidiocese/regioes/<regiao>/(paroquias-da-regiao|paroquias-da-regiao-sao-jose|agenda-da-regiao-2)/<slug>/`
   → **154 URLs, 151 únicas** (3 URLs repetidas entre sitemaps; e 2 paróquias diferentes com o mesmo
   último segmento `paroquia-nossa-senhora-aparecida`, que precisaram ser baixadas com nome de arquivo
   prefixado pela região).
3. `curl` com User-Agent de Chrome; o domínio sem `www` devolve 301 (usar `-L` ou já pedir com `www`).
4. Os e-mails vêm ofuscados pelo Cloudflare (`data-cfemail`) e foram decodificados (XOR com o 1º byte).

As 9 regiões episcopais do site: Metropolitana São José, Metropolitana Nossa Senhora da Conceição,
Metropolitana Nossa Senhora da Assunção, Metropolitana Bom Jesus dos Aflitos, Metropolitana Sagrada
Família, Metropolitana Nossa Senhora dos Prazeres, Praia São Pedro e São Paulo, Serra Nossa Senhora
da Palma, Sertão São Francisco das Chagas.

### Fontes secundárias consultadas

- `catholic-hierarchy.org/diocese/dforz.html` — 124 paróquias, 8.099 km² (dado do Anuário Pontifício,
  desatualizado; ver "Cobertura").
- PDFs oficiais do próprio portal, usados só para conferir a espinha dorsal da lista:
  - `LISTA DAS PARÓQUIAS E ÁREAS PASTORAIS POR ORDEM DE CRIAÇÃO` (19 pp., **147 entradas**,
    “Atualizado – MAIO 2017”) — traz endereço, CEP, telefone, e-mail, pároco e **data do decreto**.
  - `RELAÇÃO DAS PARÓQUIAS E ÁREAS PASTORAIS` (por município/bairro, mais antigo, ~2011).
  Nenhum dado foi copiado desses PDFs para o JSON: são de 2017 e anteriores, e as fichas do site
  estão atualizadas. **Ficam disponíveis para o enxame de validação** (é a única fonte oficial com
  ano de criação por paróquia — o campo `foundedYear` saiu `null` em todas).
- Página da Cúria (`/arquidiocese/curia/`) — endereço e telefone da Mitra.

## Cobertura

- **Encontrado: 151. Esperado (catholic-hierarchy): 124.** A divergência é de *fonte desatualizada*,
  não de excesso: já em 2017 a própria arquidiocese contava 124 paróquias + 7 áreas pastorais + 2
  reitorias (147 entradas), e desde então houve elevações de área pastoral a paróquia
  (p. ex. N. Sra. de Fátima do Álvaro Weyne, 2013; São Pedro da Barra do Ceará, 2012).
- Todas as 151 fichas foram lidas integralmente; **nenhuma paróquia ficou sem horário** por falta de
  leitura. Uma única ficha publica a grade de missas **em branco**:
  **Paróquia Nossa Senhora da Conceição, Pajuçara, Maracanaú** (entrou só com o horário de confissão).
- 78 das 151 entradas estão no município de Fortaleza; as demais em 29 municípios da região
  metropolitana, do maciço de Baturité, do sertão de Canindé e do litoral leste.

## Marcadores aplicados

| Slug | Marcador | Motivo |
|---|---|---|
| `nossa-senhora-do-libano-fortaleza` | `status: "outra-jurisdicao"` | Paróquia **maronita** (Eparquia Nossa Senhora do Líbano em São Paulo), listada por cortesia pela arquidiocese latina. Única ficha sem endereço/CEP no padrão do site (os dados estão em texto corrido, transcritos manualmente). |
| `santuario-basilica-sao-francisco-das-chagas-caninde` | `status: "nao-paroquial"` + `loadAsParish: true` | Reitoria/Santuário nacional de Canindé, com reitor próprio (Frei Gilmar Nascimento da Silva, OFM) e grade completa de missas na Basílica/Quadra da Gruta. A **Paróquia** São Francisco das Chagas de Canindé é entrada separada e tem matriz na **Igreja das Dores**. |

## Decisões de dados

- **Nome**: usado o título oficial da ficha, retirando o sufixo de bairro/cidade
  (“Paróquia São Pedro, Barra do Ceará” → `name: "Paróquia São Pedro"`, `neighborhood: "Barra do Ceará"`).
  As **Áreas Pastorais** (quase-paróquias em Fortaleza) mantiveram o prefixo `Área Pastoral`.
- **Slug**: `<nome-sem-prefixo>-<cidade>`; onde a mesma dedicação se repete na mesma cidade
  (São José, Nossa Senhora da Conceição, São Francisco de Assis… em Fortaleza), o **bairro** entra no
  meio: `sao-jose-papicu-fortaleza`, `sao-jose-passare-fortaleza`, etc. Nenhum slug duplicado.
- **Matrizes com nome próprio** (não “Matriz <padroeiro>”), tirados da própria ficha:
  `Igreja Mãe da Divina Providência` (Paróquia São Diogo, Cajazeiras), `Matriz Igreja das Dores`
  (São Francisco das Chagas, Canindé), `Matriz Nossa Senhora dos Navegantes` (São Francisco de Assis,
  Jacarecanga), `Catedral Metropolitana de Fortaleza`, `Matriz-Santuário São Benedito`,
  `Igreja Santo Antônio (Capuan)`.
- **Confissões** (`type: "CONFESSION"`, sempre `media`): extraídas do texto corrido da ficha. Quando a
  fonte dá **intervalo** (“quintas-feiras das 15h às 17h”), gravamos a **hora de início** e o texto
  integral em `notes`. Quando a fonte tem mais de um intervalo por dia, só o primeiro virou horário.
- **Horários mensais não entraram** (“1ª sexta-feira”, “dia 13 às 12h”, “todo dia 12”) — não cabem em
  `MassSchedule`. É um bloco grande em Fortaleza: quase toda ficha tem “missa votiva”. Os únicos dois
  registros `baixa` do arquivo são grades semanais com ressalva de recorrência dentro da própria
  célula (“Seg 19h somente na última segunda do mês”, “Sáb 17h no 3º sábado”).
- `foundedYear` ficou `null` em todas: o site publica o decreto em prosa/imagem, sem campo estruturado.

## Comunidades

120 capelas/comunidades nominadas vieram das fichas que as publicam. As maiores listas:

- **Paróquia Santo Antônio, Capuan (Caucaia)** — 25 comunidades em 4 setores, com padroeiro por
  comunidade.
- **Paróquia de São José, Bela Vista (Canindé)** — 22 comunidades (6 urbanas + 16 rurais).
- **Paróquia São João Batista, Centro (Acarape)** — 16 comunidades com padroeiro.
- **Paróquia de Nossa Senhora Aparecida, Praia do Futuro** — 10 comunidades.
- **Paróquia Santo Antônio de Pádua, Maraponga** e **Paróquia Nossa Senhora de Nazaré, Montese** —
  5 comunidades cada, **com grade de missa e adoração próprias** (transcritas para `schedules`).
- **Paróquia Cristo Redentor** — 6 capelas com endereço e horário próprios.
- **Catedral (Paróquia São José)** — Igreja N. Sra. da Conceição (Seminário da Prainha, com missa
  tridentina aos domingos 10h), Igreja São Pedro (Praia de Iracema) e Igreja do Rosário
  (**fechada para reforma** — sem horário).
- **Paróquia São Benedito** — administra a **Reitoria Nossa Senhora do Patrocínio**
  (Rua Guilherme Rocha, 536), com missas próprias de segunda a sábado.
- **Paróquia São Gerardo Majella** — administra a **Reitoria São Judas Tadeu**, com grade própria.

As demais ~100 fichas não publicam lista de capelas; ficaram só com a matriz.

## Precisa de validação humana

1. **`foundedYear` vazio em 151 paróquias.** O PDF oficial “por ordem de criação” (maio/2017) tem a
   data de decreto de 147 delas — é um cruzamento mecânico que vale a pena, mas exige casar
   nome+cidade entre a lista de 2017 e as fichas de hoje (houve renomeações).
2. **Paróquia Nossa Senhora da Conceição, Pajuçara (Maracanaú)** — a grade de missas da ficha oficial
   está **vazia**. Confirmar com a paróquia.
3. **Paróquia Nossa Senhora dos Prazeres, Caucaia** — o texto diz “23 comunidades (10 rurais, 13
   urbanas)”, mas o site só nomeia as 6 do Setor 4 (Adoração, Bom Jesus, Menino Jesus, Village das
   Palmeiras, Sagrada Família, Taba dos Anacés). Faltam 17.
4. **Paróquia São Francisco das Chagas × Santuário-Basílica, ambos em Canindé.** Foram tratados como
   duas entradas (a paróquia celebra na Igreja das Dores; a Basílica tem reitor e grade próprios).
   O PDF de 2017 os tratava como **uma** entrada (“Paróquia e Santuário São Francisco das Chagas”).
   Confirmar se o app deve mostrar dois lugares ou um.
5. **Paróquia Nossa Senhora do Líbano (Meireles)** — rito maronita, marcada `outra-jurisdicao`;
   só entra se o Parish decidir carregar paróquias orientais listadas por dioceses latinas.
6. **Confissões**: 243 registros são *aproximação* de intervalo (hora de início). Se o app for exibir
   “confissão às 15h”, convém revisar os casos em que a fonte dá dois blocos no mesmo dia
   (ex.: N. Sra. dos Prazeres/Caucaia, São Raimundo Nonato, N. Sra. da Imaculada Conceição/Pavuna).
7. **Missas votivas/mensais descartadas** — se o Parish passar a modelar recorrência mensal, Fortaleza
   tem material farto: “dia 13 às 12h” aparece em dezenas de fichas, e a Paróquia N. Sra. de Fátima
   (bairro Fátima) publica **11 missas no dia 13** (5h, 6h, 7h30, 9h, 10h30, 12h, 14h, 15h30, 17h,
   18h30 e 20h).
8. **Adoração em janela longa** gravada como horário único de início: N. Sra. da Glória
   (“segunda a sábado das 7h às 22h”) e São Benedito (“todos os dias das 7h às 18h”).
