# Diocese do Crato (CE) — relatório de pesquisa

Pesquisa em 11/09/2026. Arquivo gerado: `crato.json`.

## ⚠️ O site oficial está FORA DO AR

`https://diocesedecrato.org/` devolve **“Database Error” (HTTP 500) em todas as URLs** —
home, páginas, categorias, `wp-json`, `sitemap.xml`. Não é bloqueio de leitor automático: é o
WordPress sem banco. Testado com UA de Chrome, `-k`, `-L` e por IP; sempre 500.

**Toda a pesquisa foi feita em capturas do Arquivo da Internet de 14/05/2026**, que são recentes e
completas. Toda URL gravada em `sources` é a URL do `web.archive.org` (com a original embutida), para
que o enxame de validação consiga reabrir exatamente o que foi lido.

## Resultado

| | |
|---|---|
| Entradas | **62** — 59 paróquias + 2 áreas pastorais + 1 santuário diocesano, mais a Paróquia Menino Jesus de Praga |
| Confiança `alta` (paróquia) | 61 · `media`: 1 (São Sebastião – Mauriti, ficha não arquivada) |
| Comunidades/capelas | 62 (só as matrizes — a diocese não publica capelas) |
| Horários fixos | 107 — 99 MASS, 7 CONFESSION, 1 ADORATION |
| Horários `media` / `baixa` | 105 / 2 |
| Paróquias com horário | **32 de 62** (Forâneas 1, 2 e 3; as Forâneas 4 e 5 não têm tabela) |
| Endereço: 51 · CEP: 40 · telefone: 35 · pároco: 54 | |
| Municípios cobertos | 33 |

## Fontes

1. **`/paroquias/`** (captura de 14/05/2026) — índice completo, agrupado pelas 5 Regiões Forâneas,
   com 61 links “Leia Mais”. É a espinha dorsal da lista.
2. **Ficha de cada paróquia** (61 páginas, 60 recuperadas) — campos `Setor`, `Telefone`, `Endereço`,
   `Bairro`, `Cidade`, `CEP`, `Redes Sociais`, `Pároco e Cura`, `Vigário paroquial`. Quatro fichas
   também trazem **missas** em texto livre (Aparecida/Crato, Porteiras, Penaforte e São Francisco das
   Chagas/Juazeiro — esta última com grade completa da semana, confissões e adoração).
3. **`/horarios-de-missas/`** (captura de 14/05/2026) — três tabelas (Forânea I, II e III) com a grade
   por dia da semana. **Forâneas IV e V não têm tabela** na página.
4. `catholic-hierarchy.org/diocese/dcrat.html` — 57 paróquias + 3 missões; bispo Dom Magnus Henrique
   Lopes, OFMCap.
5. **Wayback CDX API** (`https://web.archive.org/cdx/search/cdx?url=diocesedecrato.org*`) — foi assim
   que descobri o CPT `paroquias` e as URLs de ficha; vale repetir a receita em qualquer site caído.

## Cobertura

- **62 entradas × 57 paróquias + 3 missões (catholic-hierarchy).** A diferença é de recorte: o site
  conta 2 áreas pastorais e o Santuário Eucarístico Diocesano entre as “paróquias” da Forânea 1.
- A **Paróquia Menino Jesus de Praga (Juazeiro do Norte)** aparece na tabela de horários e no CPT do
  site (`/paroquias/menino-jesus-de-praga/`), **mas não na página de paróquias**. Entrou com nome,
  cidade e horários de domingo; sem endereço nem pároco.
- **30 paróquias ficam sem horário**: as 10 da Forânea 4, as 10 da Forânea 5 e 10 das Forâneas 2 e 3
  cuja linha na tabela está em branco (Santo Antônio/Barbalha, SCJ Salesianos/Juazeiro, SCJ/Palmeirinha,
  Área Pastoral Bom Jesus/Barbalha, São Sebastião/Mauriti, São Francisco de Assis/Brejo Santo,
  SCJ/Palestina, Senhora Santana/Jati, Santo Antônio/Jardim, Imaculado Coração de Maria/Abaiara).
- **Comunidades/capelas: zero.** A diocese não publica nenhuma.

## Decisões de dados

- **Toda URL de `sources` é do Arquivo da Internet** (prefixo `web.archive.org/web/20260514135529/`).
  Quando o site voltar, trocar pelo original é um `sed`.
- **Confiança dos horários: `media`, não `alta`.** A fonte é oficial e a captura é recente, mas a
  página não está no ar, então não há “sinal de atualidade” no sentido do README.
- **Distritos viraram `neighborhood`**: Jamacaru → Missão Velha; Quitaiús e Mangabeira → Lavras da
  Mangabeira; Iara → Barro; Santa Fé, Dom Quintino e Ponta da Serra → Crato; Palmeirinha (Distrito
  Padre Cícero) → Juazeiro do Norte.
- **`Santuário Eucarístico Diocesano – Crato`** entrou com `status: "nao-paroquial"` +
  `loadAsParish: true` — a diocese o lista junto das paróquias da Forânea 1 e publica grade de missas
  (seg 9h e 18h30, ter 18h30, dom 7h e 19h).
- **Nome encurtado**: `Paróquia Santo Antonio | Santuário Diocesano da Divina Misericórdia – Barro`
  virou `Paróquia Santo Antônio` (cidade Barro); o título de santuário está registrado aqui.
- **Dados descartados por erro evidente da fonte** (com `notes` explicando, no próprio registro):
  - *Paróquia Santo Antônio – Araripe*: a ficha repete `Rua Cel. Pedro Onofre, 11` / CEP `63140-000`,
    que são o endereço e o CEP da **Paróquia N. Sra. das Dores de Assaré**. Endereço e CEP zerados.
  - *Paróquia São Gonçalo do Amarante – Umari*: ficha traz CEP `63100-210` (Crato/Juazeiro). Zerado.
- **Horários mensais → `baixa`**: só a Paróquia São Sebastião – Dom Quintino, cuja linha é
  “1º e 2º dom: 17h / 3º e 4º: 19h”.

## Precisa de validação humana — **esta é a diocese mais frágil das quatro do CE nesta rodada**

1. **Site fora do ar.** Prioridade máxima: quando `diocesedecrato.org` voltar, refazer a coleta contra
   o site vivo e substituir as URLs do Arquivo pelas originais. Se não voltar, o dataset inteiro
   permanece dependente de uma captura de 14/05/2026.
2. **`Paróquia São Sebastião – Mauriti`** — a ficha (`/paroquia-sao-sebastiao/`) **nunca foi arquivada**
   (404 em todos os timestamps). Só temos nome e cidade, da página de índice. Confiança `media`.
3. **Erro de digitação na fonte**: a tabela da Forânea II dá `6h, 10h e 29h` para a **Paróquia Nossa
   Senhora Auxiliadora (Juazeiro do Norte)**. As 6h e 10h entraram; **“29h” foi descartado** — quase
   certamente 19h, mas não se inventa. Confirmar.
4. **30 paróquias sem horário** (Forâneas 4 e 5 inteiras). A página de horários nunca teve tabela para
   elas; é coleta nova, paróquia a paróquia.
5. **Zero comunidades/capelas** em 62 paróquias, num território de 33 municípios do Cariri. As 3
   “missões” que o Anuário Pontifício registra não aparecem em lugar nenhum do site.
6. **Menino Jesus de Praga (Juazeiro do Norte)** — existe na tabela de horários e no CPT mas não na
   página de paróquias; confirmar se é paróquia, quase-paróquia ou capela, e completar o cadastro.
7. **`Paróquia São Francisco das Chagas – Juazeiro do Norte`** tem a grade mais rica do dataset
   (27 horários, incluindo confissões de terça a sábado às 16h e adoração às quintas). Confirmar o
   telefone `(88) 2155-3446`, que na ficha aparece como `8821553446` sem formatação.
8. **`foundedYear` vazio em todas as 62** — o site do Crato não publica data de criação.
