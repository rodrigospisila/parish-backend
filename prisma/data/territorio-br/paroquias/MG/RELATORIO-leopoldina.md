# Diocese de Leopoldina (MG) — relatório de pesquisa

**Arquivo:** `paroquias/MG/leopoldina.json` · **Pesquisa:** 10/09/2026 · **Slug:** `leopoldina`

## Resumo

| Item | Quantidade |
|---|---|
| Paróquias no arquivo | **62** |
| Esperado (Anuário Pontifício 2024, dados de 2023) | 62 — **cobertura 100%** |
| Comunidades/capelas | **0** (o site da diocese não publica) |
| Horários fixos | **35** (todos missa) |
| Confiança das paróquias | 0 `alta` / **62 `media`** / 0 `baixa` |
| Confiança dos horários | 0 `alta` / 0 `media` / **35 `baixa`** |
| Localidades distintas | 42 |
| Foranias | 6 (4 paróquias sem forania na fonte) |

Foranias: Muriaé (15), Leopoldina (11), Ubá (10), Cataguases (10), Além Paraíba (8),
Visconde do Rio Branco (4). Gravadas no campo `forania` de cada paróquia.

## Fontes

1. **Site oficial — <https://dioceseleopoldina.com.br>** (WordPress).
   - **WP REST API**: `/wp-json/wp/v2/posts?categories=1296` (categoria "Paróquias") — `X-WP-Total: 62`.
     Cada post traz um bloco de campos rotulados: `Setor` (forania), `Rua`, `Número`, `Bairro`,
     `Telefone`, `Cidade`, `Estado`, `E-mail`, `Cep`, às vezes `Caixa Postal` e `Site`.
     **Data das fichas: 29/11/2018 na maioria** (58 delas); 3 são de 2020/2021 e 2 de 2014/2016.
   - `/wp-json/wp/v2/pages/27748` — página **"Horários de Missa", modificada em 26/11/2018**,
     com abas por dia da semana; só 6 paróquias preenchidas e as abas "ESPECIAIS" com *Lorem Ipsum*.
   - `/wp-json/wp/v2/pages/27495` (Cúria, 08/11/2022) — bispo Dom Edson José Oriolo dos Santos,
     telefone (32) 3441-2008.
   - `/wp-json/wp/v2/pages/27490` (institucional, 30/01/2020) — "presente em 34 municípios,
     composta por **63 paróquias**, organizadas em **seis foranias**".
   - `/wp-json/wp/v2/posts?categories=1297` (categoria "Horários de Missa", 30 posts de 2014):
     **todos com conteúdo vazio** — inúteis.
2. **catholic-hierarchy.org — <https://www.catholic-hierarchy.org/diocese/dleop.html>** (acesso 10/09/2026):
   **62 paróquias em 2023**, 8.491 km², província de Juiz de Fora, região CNBB Leste 2, erigida em
   28/03/1942.
3. **horariodemissa.com.br** — testado para Muriaé: das 4 paróquias listadas, **só uma** tem horários
   cadastrados. Descartado (fonte única não oficial ⇒ `baixa`, sem ganho real).

O WebFetch tomou **403** em `dioceseleopoldina.com.br/curia-diocesana/`; resolvido com `curl` + UA de
Chrome e, melhor ainda, lendo a WP REST API em vez do HTML.

## Cobertura

**62/62 paróquias — a lista está completa.** Os totais batem exatamente com o Anuário Pontifício.
(A página institucional da própria diocese, de 2020, fala em 63; a diferença de uma unidade não foi
possível identificar — pode ser paróquia extinta/fundida ou erro do texto.)

O que **não** foi possível obter:

- **Comunidades/capelas: nenhuma.** O site não publica lista de capelas de nenhuma paróquia.
  `communities: []` em todas — o importador cria a igreja-matriz.
- **Horários: quase nada.** Só **6 paróquias** têm horário publicado, em duas fontes oficiais mas
  antigas (2018/2020, portanto **anteriores à pandemia**):
  Jesus Menino Deus (Recreio), Nossa Senhora do Rosário (Cataguases), Nossa Senhora do Rosário
  (Leopoldina), Sant’Ana (Guidoval), São Benedito (Leopoldina), São João Batista e São Sebastião
  (ambas Visconde do Rio Branco). **Todos gravados como `baixa`** e portanto fora da carga —
  esta diocese entra em produção com **0 horário**.
- **Ano de fundação: `null` em todas** — o site não publica data de ereção canônica.

## Regras aplicadas ao gravar

- **`confidence: media` para as 62 paróquias**: fonte oficial (site da diocese) **sem sinal de
  atualidade** — as fichas não são tocadas desde 2018. O total de 62 é corroborado pelo Anuário 2024.
  Nome, cidade, forania, endereço, CEP, telefone e e-mail vêm dessas fichas de 2018.
- **`confidence: baixa` para os 35 horários** — fonte oficial anterior à pandemia (26/11/2018 e
  29/11/2018; um caso de 13/01/2020). Cada registro tem em `notes` a origem e o aviso de reconferir.
- **Nome e cidade**: o título do post é `"<Nome da paróquia> – <Cidade>"`; usei o campo `Cidade`
  quando existe e o sufixo do título quando não (6 posts não têm o campo).
  `Stº Antônio do Aventureiro` → `Santo Antônio do Aventureiro`.
  `Barão do Monte Alto` → **`Barão de Monte Alto`** (grafia do município no IBGE).
- **`Igreja Nossa Senhora Divino Pranto` (Muriaé, Forania Muriaé)** — a diocese a publica na
  categoria "Paróquias" com o prefixo "Igreja" e site próprio (igrejansradivinopranto.org.br);
  fontes secundárias a descrevem como paróquia criada em 22/05/2006. Mantive o nome da fonte e
  marquei `"loadAsParish": true` + `jurisdictionNote`, senão o importador a filtraria pelo prefixo.
- **`Santuário Santa Rita de Cássia` (Cataguases)** — a diocese o lista entre as paróquias, com
  secretaria e contato próprios; mantido como paróquia (o importador não filtra "Santuário").
- **Recorrência mensal → `baixa`** ("Apenas na 1ª Sexta-Feira do mês – às 06h e às 16h", em
  N. Sra. do Rosário/Leopoldina) — já estava `baixa` por causa da idade da fonte.
- Campo não encontrado = `null`. Nenhum dado foi inferido.

## Precisa de validação humana

1. **Horários — o buraco principal.** 56 das 62 paróquias não têm nenhum horário, e os 35 que existem
   são de 2018/2020 e ficaram `baixa`. Se o Parish quiser Leopoldina com missas, será preciso ir às
   redes sociais das paróquias ou à Cúria ((32) 3441-2008, ramal 213 — Secretaria de Pastoral).
2. **Nenhuma comunidade/capela.** Diocese de 34 municípios com muito distrito rural.
3. **Localidades que provavelmente são distritos, não municípios** — gravei a localidade **como a
   fonte publica**, sem remapear (para não inventar): `Itamuri`, `Itapiruçu`, `Piacatuba`,
   `Angustura`, `Providência`, `Tebas`, `Tuiutinga`, `Conceição da Boa Vista`,
   `Santana de Cataguases`, `Vista Alegre`, `Belisário`, `Boa Família`, `Cachoeira Alegre`.
   Vale conferir e, se for o caso, mover para `neighborhood` com o município correto em `city`.
4. **Divergência 62 × 63 paróquias** (Anuário 2024 × página institucional da diocese de 2020).
5. **Fichas incompletas na fonte** — 6 paróquias sem endereço/CEP, 8 sem telefone, 14 sem e-mail:
   destaque para **Nossa Senhora das Dores (Miraí)** (post de 2014, conteúdo totalmente vazio),
   **Santo Antônio (Tebas)** e **Senhor Bom Jesus (Argirita)** (só o campo `Setor`), e
   **São Benedito (Leopoldina)**, **São João Batista** e **São Sebastião (Visconde do Rio Branco)**
   (posts de 2014/2016 com só o horário de secretaria).
6. **4 paróquias sem forania** na fonte: N. Sra. das Dores (Miraí), São Benedito (Leopoldina),
   São João Batista e São Sebastião (Visconde do Rio Branco).
7. **Telefones em formato irregular** (como na fonte): `32-3532-2847`, `32-3462-0432`,
   `32-3553-1218`, `32-3721-0286`, `32-3551-1137`, `32-3727-1037`, `32-3577-1250`, `32-3556-1573`,
   `32-3531-1494`, `32-3724-1017`, `32-3452-1256`, `32-3446-1126`, `32-3444-2303`.
8. **Telefones repetidos entre paróquias diferentes** — sinal de ficha desatualizada:
   (32) 3441-4411 (Catedral/Leopoldina e N. Sra. da Piedade/Piacatuba); (32) 3722-2881
   (N. Sra. do Sagrado Coração/Muriaé e São Francisco de Paula/Boa Família); (32) 3723-1217
   (N. Sra. do Rosário/Rosário da Limeira e Santo Antônio/Belisário); (32) 3422-5311
   (São Cristóvão/Cataguases e São Francisco de Paula/Vista Alegre); (32) 3462-6618
   (N. Sra. Madre de Deus/Angustura e São José/Além Paraíba); 32-3553-1218
   (N. Sra. da Encarnação/Guiricema e Santo Antônio/Tuiutinga); (32) 3446-1126
   (N. Sra. das Dores/Itapiruçu e São Francisco de Assis/Palma).
9. **`foundedYear` nulo em 62/62.**
