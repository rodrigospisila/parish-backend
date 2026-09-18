# Relatório — Prelazia de Alto Xingu-Tucumã (PA)

Pesquisa: 18/09/2026. Arquivo: `alto-xingu-tucuma.json`.

## Resultado

| | |
|---|---|
| Unidades pastorais | **8** (1 catedral, 3 paróquias, 2 pró-paróquias, 1 área pastoral, 1 área missionária) |
| Confiança das unidades | 8 `alta` |
| Comunidades | **68** (todas `alta`) — 8 matrizes + 60 capelas |
| Horários fixos | **80**, todos `alta` |
| Cobertura | 8/8 — lista fechada por duas fontes independentes |

**É a melhor das quatro circunscrições desta rodada.** O site está ativo, publica ficha de cada capela e
grade de missa da matriz **e de cada capela**.

## Fontes principais

1. **Site oficial — `https://prelaziadoaltoxingu.org`** (plataforma Cúria Online; o `dioceses.json` tem
   `website: null`). **Ativo**: notícias de 18/06, 28/06 e 04/07/2026; fotos de capelas carregadas em
   agosto e setembro de 2025.
   - `/historia` → texto oficial com a lista numerada de 1 a 8 ("A Prelazia possui 8 paróquias") e a origem
     do território.
   - `/paroquias` → 8 fichas (`/paroquias/63..70/<slug>`) com cidade, atendimento, atendentes, fundação,
     pároco, endereço, bairro, CEP, telefone, e-mail, padroeiro **e a grade de missa da matriz e de todas as
     capelas da paróquia**.
   - `/capelas` → **59 capelas agrupadas por paróquia**, cada uma com ficha própria
     (`/capelas/<id>/<slug>`) trazendo matriz, cidade, endereço, bairro, CEP, data de fundação, festa do
     padroeiro e grade de missa.
   - `/curia` → Av. Amazonas s/n, Tapajós, Tucumã-PA, CEP 68385-000, (94) 99115-3865,
     `prelaziaaltoxingu@gmail.com`.
2. **Receita Federal** (via `minhareceita.org`), CNPJ raiz **36.622.923**, achado pelo **Mapa das OSC/IPEA**
   (busca por "PRELAZIA" nos 6 municípios). Varri as ordens 0001–0014: existem **9, todas ATIVAS** — a Cúria
   e **exatamente as 8 unidades pastorais**. Prova de completude.
3. `catholic-hierarchy.org/diocese/dalxt.html` (erigida 06/11/2019, 139.418 km², 7 paróquias em 2023).
4. Portal extinto da **Prelazia do Xingu** (Arquivo da Internet), que confirma que Tucumã, São Félix do
   Xingu e Ourilândia do Norte vinham de lá.

## Como a lista fechou

A página de história e a Receita coincidem unidade por unidade:

| # | Unidade | Município | Filial na Receita |
|---|---|---|---|
| 1 | Catedral Nossa Senhora Aparecida | Tucumã | 0002 (24/03/2020) |
| 2 | Paróquia Santa Rita de Cássia | Ourilândia do Norte | 0004 (24/03/2020) |
| 3 | Paróquia São Félix | São Félix do Xingu | 0005 (24/03/2020) |
| 4 | Paróquia São João Batista | Água Azul do Norte | 0003 (24/03/2020) |
| 5 | Área Missionária São João Batista | São Félix do Xingu (distrito de Sudoeste) | 0009 (14/06/2022) |
| 6 | Área Pastoral São Raimundo Nonato | São Félix do Xingu (distrito de Taboca) | 0008 (24/03/2020) |
| 7 | Pró-Paróquia Nossa Senhora Aparecida | Cumaru do Norte | 0006 (24/03/2020) |
| 8 | Pró-Paróquia Santa Catarina de Sena | Bannach | 0007 (24/03/2020) |

O Anuário Pontifício 2024 registra **7** paróquias em 2023: a oitava unidade (Área Missionária de Sudoeste)
só abriu filial em 14/06/2022 e provavelmente ainda não entrara na contagem.

**Origem do território** (página de história): Tucumã, Ourilândia do Norte e São Félix do Xingu vieram da
**Prelazia do Xingu**; Água Azul do Norte, da **Diocese de Marabá**; Bannach e Cumaru do Norte, da **Diocese
de Conceição do Araguaia**. Isso importa para os agentes dessas duas dioceses: essas paróquias **não** são
mais delas.

## Armadilhas encontradas e tratadas

- **Placeholder "00h00" do CMS** — exatamente a armadilha descrita no README. Descartei 7 ocorrências:
  4 na matriz da Pró-Paróquia de Cumaru do Norte (segunda a sábado), 1 em Santa Rosa (sábado), 1 em São
  Lázaro (domingo, que também tem 16:00 real) e 1 em Senhor do Bonfim (domingo, que também tem sábado 19:30).
- **Missa da matriz que não é na matriz**: a grade da Catedral traz "Quarta – 18h00 **Capela São José na
  Av. Brasil**". Criei a comunidade "Capela São José" (que não tem ficha própria) e pendurei ali a missa de
  quarta, em vez de jogá-la na matriz — o mesmo defeito de importador já corrigido em outras rodadas.
- **Nomes de capela repetidos dentro da mesma paróquia**: São Félix do Xingu tem 4 "Nossa Senhora do
  Perpétuo Socorro", 3 "Bom Jesus da Lapa", 2 "Santo Antônio", 2 "São Francisco de Assis" e 2 "Nossa Senhora
  Aparecida". Desambiguei pelo bairro/endereço da ficha de cada uma, porque o campo `community` do horário
  precisa casar com um nome único.
- **Erros de digitação do site** normalizados: "Nossa Senhra das Dores" → Nossa Senhora, "Nossa Senhora
  Apareceida" → Aparecida, nomes terminados em " -" (p. ex. "Santa Luzia -").
- **Campo "Endereço" preenchido com o nome do município** em algumas fichas de capela — descartado.
- **"Festa do Padroeiro: solteiro(a)"** em 5 fichas: valor de outro campo do CMS vazando; ignorado.

## Precisa de validação humana

1. **Duas capelas possivelmente duplicadas** na Paróquia São Félix: dois registros de "Nossa Senhora do
   Perpétuo Socorro" e dois de "Santo Antônio", todos em Linha 07 / Colônia Tancredo Neves, com endereços
   quase idênticos. Ficaram com sufixo "II" e nota; confirmar se são duas capelas ou registro duplicado.
2. **Capela "São João Batista - Sudoeste"** está agrupada sob a Catedral (Tucumã) na página de capelas, mas
   a ficha dela diz cidade **São Félix do Xingu, Distrito de Sudoeste** — provavelmente é a sede da Área
   Missionária São João Batista, que virou unidade própria em 2022 e cujo vínculo antigo não foi atualizado.
3. **Capela "Comunidade São Sebastião Paraíso"**: agrupada sob a Pró-Paróquia Santa Catarina de Sena
   (Bannach), mas a ficha diz cidade **Cumaru do Norte**.
4. **Endereço da Paróquia Santa Rita de Cássia** (Ourilândia do Norte): o site diz "Rua 10" e a Receita
   "Rua 12".
5. **Telefone da Pró-Paróquia de Bannach**: (94) 99256-8582 no site, (94) 99256-8585 na Receita.
6. **E-mail da Paróquia São João Batista** (Água Azul do Norte): publicado como
   `paroquiasjb13@gmail.com.br` — provável erro de digitação de `@gmail.com`. Gravei como publicado.
7. **Pró-Paróquia Santa Catarina de Sena (Bannach) não publica horário da matriz** — é a única unidade sem
   missa na sede (só a capela N. Sra. Aparecida IV, domingo 16:00).
8. **Datas de fundação**: 5 das 8 fichas trazem "00/00/0000" (Santa Rita de Cássia, São Félix, São João
   Batista, as duas pró-paróquias e as duas áreas). Só a Catedral (01/01/1989) e a Área Pastoral São
   Raimundo Nonato (10/08/1992) têm data.

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

- `website`: está `null`; o correto é **`https://prelaziadoaltoxingu.org`** (site oficial e ativo).
- `email`: está `null`; a página da Cúria publica **`prelaziaaltoxingu@gmail.com`**.
- `address`: está "Rua Castanheira, Setor Monte Castelo" (vem do catholic-hierarchy). A Cúria e a Receita
  dão **"Avenida Amazonas, s/n – Tapajós"**.
- `phone`: está "(94) 991.144.381" (formato inválido e número diferente). A Cúria publica
  **(94) 99115-3865** e a Receita registra **(94) 3433-1478**.
- `zipCode` 68385-000 confere.
- `name`: o `dioceses.json` grava "Prelazia de Alto Xingu-Tucumã"; a prelazia se chama a si mesma
  **"Prelazia do Alto Xingu-Tucumã"** no site. Mantive o nome do `dioceses.json` no arquivo, como pedido.
