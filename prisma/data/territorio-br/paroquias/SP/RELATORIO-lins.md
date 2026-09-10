# Relatório de pesquisa — Diocese de Lins (SP)

- **Arquivo**: `paroquias/SP/lins.json`
- **Data da pesquisa**: 2026-09-10
- **Agente**: pesquisa de território BR — oeste paulista (onda SP)

## Resumo

| Métrica | Valor |
|---|---|
| Entradas no JSON | 46 |
| Paróquias efetivas | **45** (20 `alta`, 25 `media`) |
| Entradas de outra jurisdição | 1 (igreja greco-melquita, `status: "outra-jurisdicao"`) |
| Comunidades/capelas | 141 |
| Horários fixos | 290 (207 `media`, 83 `baixa`) |
| Paróquias esperadas (Catholic-Hierarchy, ap2024) | 46 |
| Regiões pastorais | 3 (Lins: 20, Penápolis: 13, Pirajuí: 12) |

Cobertura estimada: **98%** (45 de 46). É a diocese mais difícil das quatro desta rodada.

## O problema: os dois sites estão inacessíveis

1. **`diocesedelins.org`** (o site que aparece no Catholic-Hierarchy e nos resultados de busca)
   **não existe mais** — o domínio dá **NXDOMAIN** na resolução autoritativa (`.org` responde SOA,
   sem registro A). Nada é servido de lá desde ~2025.
2. **`diocesedelins.com.br`** (site atual, Astro/Vercel) responde **HTTP 429 "Vercel Security
   Checkpoint"** a **qualquer** leitor automático — curl com UA de navegador e cabeçalhos completos,
   WebFetch, `/robots.txt`, `/sitemap.xml`, tudo. É um desafio JavaScript; não há como contornar
   sem navegador.

**Solução**: reconstruí a diocese a partir de **três fontes oficiais recuperadas do Arquivo da
Internet**, todas publicadas pela própria diocese:

| Fonte | Data | O que forneceu |
|---|---|---|
| `diocesedelins.org/arquivos/elenco.pdf` — *Diretório Diocesano 2019-2020, seção PARÓQUIAS* (84 pág.) | 2019/2020 (snapshot 09/12/2023) | **44 paróquias** com nome, município, endereço, CEP, telefone, e-mail e **data de criação**; composição das 3 regiões pastorais |
| `diocesedelins.org/regiao-pastoral-de-lins/` | publicada 24/01/2025 (snapshot 29/05/2025) | Confirma as **20 paróquias** da Região de Lins com datas de criação; revela a Paróquia Santa Teresinha do Menino Jesus (Macucos/Getulina), criada em 01/10/2022 |
| `diocesedelins.org/arquivos/HORARIOS.pdf` (21 pág.) | **última atualização 25/11/2021** (snapshot 15/12/2024) | Horários de missa e atendimento de 33 paróquias, por ordem de cidade, com as comunidades nomeadas |

As páginas `regiao-pastoral-de-penapolis/` e `regiao-pastoral-de-pirajui/` **nunca foram
arquivadas** — por isso as 25 paróquias dessas duas regiões ficaram com confiança `media`
(só o Diretório 2019-2020, sem corroboração recente), enquanto as 20 da Região de Lins são `alta`
(Diretório + página oficial de 2025).

## ⚠️ Alerta principal para validação humana

**TODOS os 290 horários vêm de um PDF cuja última atualização é 25/11/2021** — quase 5 anos antes
desta pesquisa. Gravei-os como `media` porque o README classifica "fonte oficial sem sinal de
atualidade" como `media`, e o PDF continuava publicado no site oficial até pelo menos fevereiro de
2025. **Mas é o bloco de dados mais frágil de todas as quatro dioceses desta rodada** e deveria ser
o primeiro alvo do enxame de validação (ou de uma checagem manual por telefone). Se o critério for
mais rígido, o correto é rebaixar tudo para `baixa`.

## Outros pontos para validação humana

1. **Falta 1 paróquia** (45 encontradas × 46 esperadas pelo anuário 2024). Provavelmente foi criada
   depois de 2020 nas regiões de **Penápolis** ou **Pirajuí** — exatamente as duas cujas páginas não
   estão no Arquivo da Internet.
2. **10 paróquias sem nenhum horário** (não constam do PDF de 2021): Nossa Senhora Aparecida
   (Barbosa), São Sebastião (Braúna), Santuário São Francisco de Assis (Penápolis), São José
   Operário (Penápolis), Concatedral Santa Isabel da Hungria (Cafelândia), São José (Pongaí), Santa
   Cecília (Presidente Alves), Santo Antônio (Uru), Santo Expedito (Promissão) e Santa Teresinha do
   Menino Jesus (Macucos/Getulina). As duas últimas foram criadas em 2019 e 2022.
3. **Paróquia Santa Teresinha do Menino Jesus (Macucos, Getulina)**: só temos nome, cidade, distrito
   e data de criação (01/10/2022). Sem endereço, telefone, e-mail ou horários. Antes de 2022 Macucos
   era comunidade da Paróquia Nossa Senhora da Assunção (Getulina) — **removi as missas de Macucos
   da ficha de Getulina** para não duplicar, e registrei os horários antigos em `notes`.
4. **Nomes divergentes entre as fontes oficiais** (usei a forma indicada e registrei a outra em
   `notes`):
   - Lins: "Paróquia São José Operário" (Diretório + PDF) × "Paróquia São José" (página 2025);
     também divergem as datas 01/05/1955 × 01/01/1955.
   - Lins, Paróquia Santo Expedito: criada em 10/01/2013 (Diretório) × 06/01/2013 (página 2025).
   - Getulina: "Paróquia Nossa Senhora da Assunção" × "Nossa Senhora Assunção".
   - Lins: "Catedral - Paróquia Santo Antônio" × "Catedral Diocesana Santo Antônio" → gravei
     **"Catedral Santo Antônio"**.
5. **Erros do próprio PDF oficial de horários**:
   - A ficha da **Paróquia São Sebastião (Pirajuí)** começa com um bloco copiado por engano da
     Paróquia Nossa Senhora de Guadalupe (Pirajuí). Descartei o bloco duplicado.
   - Os e-mails do **Santuário Diocesano Nossa Senhora de Fátima (Lins)** e da **Paróquia São José
     Operário (Lins)** aparecem **trocados**. Usei os do Diretório 2019-2020.
   - Na Paróquia São Lucas Evangelista (Lins), a igreja-matriz aparece como "Comunidade São Lucas".
6. **`priestName` = `null` em todas as paróquias**: o Diretório é de 2019/2020 e o clero certamente
   mudou (o próprio bispo mudou duas vezes desde então). Preferi não gravar nomes desatualizados.
7. **Bispo**: gravei **Dom João Gilberto de Moura**, que aparece como bispo diocesano no site oficial
   em 2025 (páginas `/dom-joao-gilberto-de-moura/` e "Mensagem de Dom João Gilberto de Moura para a
   Semana Santa", 12/04/2025). O Catholic-Hierarchy ainda lista Francisco Carlos da Silva
   (30/09/2015 – 26/06/2024). Confiança da diocese = `media` por isso.
8. **Igreja Panaghia Tsambika ("Nossa Senhora da Luz")**, Lins — Monastério Católico Greco-Melquita
   de **rito bizantino**, listado pelo Diretório junto à Paróquia Nossa Senhora Aparecida. Gravada
   com `status: "outra-jurisdicao"`; **não deve entrar** como paróquia latina.
9. **Missas por dia do mês** (não cabem no modelo semanal, só em `notes`): dia 11 (Santa Clara de
   Assis/Penápolis), dia 13 e 22 (Santa Rita de Cássia/Penápolis), dia 13 e 28 (São Judas
   Tadeu/Lins), dia 29 (São Miguel Arcanjo/Lins).
10. **Missas "nos setores"/"nas comunidades" sem local nomeado** — registradas só em `notes`:
    São João Batista (Balbinos, quartas 19h30), Santa Terezinha (Glicério, segunda a quarta 19h30),
    Nossa Senhora Aparecida (Guaimbê, sextas e sábados), Santa Teresinha (Penápolis, 3ª terça 19h30),
    Comunidade Córrego Rico (Sabino, 5º sábado, sem horário).
11. **83 horários `baixa`** são recorrências mensais/quinzenais ("1ª e 3ª quarta", "2ª e 4ª semana",
    "3º sábado do mês"), típicas das capelas rurais desta diocese. A regra literal está em `notes`.
12. **CEP/telefone** vêm do Diretório 2019-2020 e podem estar desatualizados (vários telefones fixos
    de 5 dígitos foram trocados por celulares nesse período).
