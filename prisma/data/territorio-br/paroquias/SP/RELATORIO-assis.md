# Relatório de pesquisa — Diocese de Assis (SP)

**Data da pesquisa:** 2026-09-10 · **Arquivo gerado:** `assis.json`

## Resumo

| Item | Total |
|---|---|
| Paróquias | **28** (28 `alta`, 0 `media`, 0 `baixa`) |
| Comunidades | **42** (28 matrizes + 14 capelas) |
| Horários fixos | **72** (67 `alta`, 5 `baixa`) |
| Cobertura | **28/28** (100 % do esperado) |

## Fontes principais

1. **Site oficial da diocese — https://www.diocesedeassis.org** (fonte de praticamente todo o dataset).
   - `/paroquias` → índice por **4 Regiões Pastorais** e **19 cidades**:
     Região I (Assis, Cândido Mota), Região II (Quatá, João Ramalho, Paraguaçu Paulista,
     Rancharia, Iepê, Nantes), Região III (Tarumã, Maracaí, Florínea, Cruzália, São José das
     Laranjeiras, Pedrinhas Paulista), Região IV (Palmital, Echaporã, Platina, Oscar Bressane,
     Lutécia).
   - `/paroquia/<id>/<slug>` → ficha oficial de cada paróquia com **fundação, região, endereço,
     bairro, cidade, telefone, e-mail, pároco, vigário paroquial** e, em 7 casos, um campo
     "Observações" com o **horário de missas** da matriz e das capelas.
   - `/capelas/...` e `/capela/<id>/<slug>` → só **2 capelas** cadastradas (Capela São Francisco
     de Assis, Vila Glória, e Capela Cristo Rei, Vila Ribeiro).
   - **Sinal de atualidade:** a home traz notícias de **setembro de 2026** (coleta do 19º Congresso
     Eucarístico Nacional, ordenação diaconal de 25/08/2026, retiro do clero de 30/07/2026).
     Site ativo → confiança `alta`.
   - Observação técnica: o WebFetch funciona, mas o site também responde bem a `curl` com
     User-Agent de Chrome. O CMS é da WEB5 (`/paroquia/<id>/qualquer-coisa` resolve pelo id).
2. **catholic-hierarchy.org — https://www.catholic-hierarchy.org/diocese/dassi.html** —
   estatística **2023: 28 paróquias**, 207.000 católicos em 320.000 habitantes (64,7 %),
   bispo Dom Argemiro de Azevedo, C.M.F. (desde 14/12/2016).
3. Wikipédia (pt) — `Diocese de Assis`, para corroborar sede e província (Botucatu).

## Cobertura

**28 encontradas / 28 esperadas — coincidência exata com o Catholic-Hierarchy (2023).**

Os ids do CMS diocesano vão de 2 a 30 e foram varridos um a um: **não há lacuna de paróquia**.
Os ids 27 e 31 existem mas são **capelas** (Capela São Francisco de Assis e Capela Cristo Rei),
e por isso entraram como `communities`, não como paróquias. O id 1 e os ids ≥ 32 retornam
página vazia.

Distribuição por cidade: Assis 9 · Palmital 2 · e 1 paróquia em cada uma das outras 17
localidades (Cândido Mota, Quatá, João Ramalho, Paraguaçu Paulista, Rancharia, Iepê, Nantes,
Tarumã, Maracaí, Florínea, Cruzália, São José das Laranjeiras, Pedrinhas Paulista, Echaporã,
Platina, Oscar Bressane, Lutécia).

## Qualidade dos campos

- **Endereço, bairro, telefone, e-mail e pároco: 28/28** (todos publicados pela própria diocese).
- **CEP: 0/28** — a diocese não publica CEP em nenhuma ficha (`zipCode: null`).
- **Site próprio: 0/28** — nenhuma ficha traz site ou rede social da paróquia (`website: null`).
- **Ano de fundação: 24/28.** Quatro ficam `null`: N. Sra. de Fátima (Assis), São Nicolau
  (Assis), N. Sra. do Carmo (Platina) — campo vazio na fonte — e Santo André (Tarumã), cuja
  ficha traz `01/01/0001` (placeholder do CMS, gravado como `null`).

## Horários

A diocese **só publica horário de missa em 7 das 28 paróquias**, todas na cidade de Assis:

| Paróquia | Horários gravados |
|---|---|
| Catedral Sagrado Coração de Jesus | 15 (matriz seg–sáb 6h30 e 19h; dom 7h, 9h30, 19h) + 4 de capelas |
| Santuário Nossa Senhora das Graças | 7 + 2 de capelas |
| Paróquia Nossa Senhora das Dores (Assis) | 7 + 4 de capelas |
| Paróquia Nossa Senhora de Fátima | 5 + 3 de capelas |
| Paróquia Nossa Senhora Aparecida (Bonfim) | 1 + 1 de capela |
| Basílica São Vicente de Paulo | 15 |
| Paróquia Santa Cecília | 5 + 2 de capelas |

**As outras 21 paróquias ficaram sem nenhum horário** — a diocese não publica e não há site ou
rede social oficial indicada nas fichas. Isso é a maior lacuna desta diocese.

### Horários gravados como `baixa` (5) — recorrência mensal, não cabe em `dayOfWeek`

1. **Catedral** — 1ª sexta-feira do mês, 5h30: procissão da penitência, missa e adoração ao
   Santíssimo o dia todo.
2. **N. Sra. das Dores (Assis)** — 1ª sexta-feira do mês, 19h.
3. **N. Sra. das Dores (Assis)** — 4ª sexta-feira do mês, 7h.
4. **N. Sra. de Fátima** — Capela São Sebastião (rural), 1ª e 3ª terça-feira do mês, 19h30.
5. **Santa Cecília** — 1ª sexta-feira do mês, 19h.

A regra literal está em `notes` de cada registro.

## Precisa de validação humana

1. **Paróquia Nossa Senhora Aparecida (Assis, Bonfim)** — a ficha oficial traz o texto truncado
   `"PARÓQUIA NOSSA SENHORA APARECIDA - Sábado: 19h - e 19h"`. Só o **sábado 19h** é legível;
   provavelmente falta o horário de domingo. Gravado só o sábado, com a ressalva em `notes`.
2. **Paróquia São José — "Distrito de São José das Laranjeiras/SP"** — o cadastro oficial informa
   o **distrito** como cidade. São José das Laranjeiras é distrito de **Maracaí**. O campo `city`
   reproduz o nome do distrito (`"São José das Laranjeiras"`); se o Parish exigir município do
   IBGE, o correto é Maracaí.
3. **Datas de fundação com dia 01/01** — a Catedral consta como `01/01/1915`. O ano é plausível
   (a diocese é de 1928 e a paróquia é anterior), mas o dia/mês é placeholder. Só o **ano** foi
   gravado.
4. **Capela Cristo Rei** — a diocese cadastra a capela sem dizer a que paróquia pertence; foi
   vinculada à **Basílica São Vicente de Paulo** porque a ficha da capela traz o mesmo pároco
   (Pe. Luciano Vilalba Moura) e o mesmo vigário. Confirmar.
5. **Capela São Francisco de Assis (Vila Glória)** — a ficha da capela dá "Domingo 8h" e a ficha
   da Catedral repete o mesmo horário; foi gravada **uma vez só**, sob a Catedral.
6. **Vigários paroquiais** — o site publica vigários em 12 paróquias, mas o modelo só tem
   `priestName`; só o **pároco** foi gravado. Em Nantes e São José das Laranjeiras o site informa
   **administrador paroquial** (não pároco), registrado com a ressalva no próprio campo.
7. **21 paróquias sem horário** — para completar seria preciso ir de paróquia em paróquia no
   Facebook/Instagram; não há agregador que cubra a região (a busca em horariodemissa.com.br não
   retornou nenhuma igreja da diocese).
8. **Duas paróquias homônimas em Palmital** (São Sebastião e Santo Antônio) e duas
   "Nossa Senhora das Dores" (Assis e Cândido Mota) e duas "Nossa Senhora do Carmo" (Platina e
   Oscar Bressane) — são paróquias distintas, os slugs já as separam pela cidade.
