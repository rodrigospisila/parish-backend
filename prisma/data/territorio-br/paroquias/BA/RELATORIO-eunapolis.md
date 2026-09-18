# Diocese de Eunápolis — relatório de pesquisa

- **Slug**: `eunapolis` · **UF**: BA · **Sede**: Eunápolis · **Província**: São Salvador da Bahia · **Regional**: Nordeste 3
- **Pesquisa**: 18/09/2026
- **Bispo**: Dom José Edson Santana de Oliveira (desde 12/06/1996 — o bispo mais antigo em exercício das seis dioceses desta rodada)
- **Cúria**: Praça Frei Calixto, s/nº, Centro · 45820-430 · Caixa Postal 02/45820-970 · (73) 3281-4851 · curiadiocesanadeeunapolis@gmail.com
- **Site oficial**: <https://www.diocesedeeunapolis.org> — **vivo, em Wix**
- **Foranias (4)**: Centro · Jequitinhonha · Descobrimento · Monte Pascoal

## Resultado

| Métrica | Valor |
|---|---|
| Paróquias | **47** — 46 `alta` · 1 `media` (só na Receita) |
| das quais quase-paróquias | **14** (o site as mantém assim; Receita e gcatholic já as chamam de paróquia) |
| Comunidades | **187** = 47 matrizes + **140 capelas com nome**, todas `alta` |
| Horários fixos | **117** (72 MASS · 20 CONFESSION · 25 ADORATION) — **todos `baixa`** |
| Paróquias com algum horário | **15 de 47** |
| Horários carregáveis (`alta`/`media`) | **0** |

**Cobertura: 47 de 47.** Mas **a diocese entra em produção sem nenhum horário** — ver abaixo.

## Fontes principais

1. **As quatro páginas de forania** — `/forania-centro1`, `/forania-jequitinhonha`,
   `/forania-descobrimento`, `/forania-montepascoal`. Cada verbete traz **data de criação,
   pároco/administrador e vigários, endereço, e-mail, telefone e a LISTA NOMINAL das comunidades**.
   Foi daí que saíram as 140 capelas.
   O site é Wix, mas **não tem `wix-warmup-data` nestas páginas**: o conteúdo é texto estático, lido
   direto do HTML (o truque do `recordsByCollectionId` não se aplica aqui).
2. **Receita Federal via `minhareceita.org`** — CNPJ raiz **01.532.438**, varredura de `/0001` a
   `/0070`: existem exatamente **51 inscrições**, nada além.
3. **Mapa das OSC / IPEA** — `cd_municipio = 2910727` (Eunápolis), um filtro só, deu o CNPJ raiz.
4. `gcatholic.org/churches/local/euna0` (01/01/2026) — 47 igrejas, 45 marcadas "Parish".
5. `catholic-hierarchy.org/diocese/deuna.html` — 45 paróquias e 54 presbíteros em 2023 (ap2024).
6. `liriocatolico.com.br` — 24 fichas no território da diocese; **única fonte de horário existente**.

## Prova de completude — as quatro contagens

| Fonte | Total |
|---|---|
| Verbetes nas 4 páginas de forania | 16 + 5 + 18 + 7 = **46** |
| Inscrições ATIVAS de paróquia/quase-paróquia/santuário no CNPJ 01.532.438 | **47** |
| gcatholic (01/01/2026) | 47 igrejas (45 "Parish") |
| catholic-hierarchy (ap2024, dado de 2023) 45 + 2 criadas depois | **47** |

A Receita casa **uma a uma** com os 46 verbetes do site e acrescenta **um registro que o site não
publica**: a **QUASE-PAROQUIA SAO FRANCISCO DE ASSIS** do bairro Paraguai, em Porto Seguro
(inscrição de **26/07/2024**, Rua Trinta e Cinco, s/n). O **Lírio Católico corrobora**: tem uma ficha
"Paróquia São Francisco" na mesma Rua Trinta e Cinco, com missa de domingo às 18h. Gravada `media`.

As 4 inscrições ativas que **não** são paróquia: a sede (`/0001`), a **Comissão Pastoral do Turismo**
de Porto Seguro (`/0018`) e o **Instituto Diocesano de Teologia – Escola Mater Ecclesiae** (`/0021`);
há ainda uma inscrição **BAIXADA** da Paróquia São João Batista de Eunápolis (`/0023`, substituída
pela `/0048`).

O gcatholic **não** registra as duas mais novas (São Pedro de Arraial d'Ajuda, de 02/02/2025, e a do
Paraguai) e **inclui duas igrejas não paroquiais** que não entraram neste arquivo: **São Sebastião de
Belmonte** e **Nossa Senhora do Brasil**, em Porto Seguro (esta última é comunidade da Paróquia
N. Sra. da Pena, segundo a própria lista do site).

## O problema desta diocese: nenhum horário oficial

**O site não publica horário de missa em lugar nenhum** — nem nas foranias, nem em página própria.
Os 117 horários do arquivo vêm **todos do Lírio Católico**, agregador cujo `ultima_atualizacao`
(02/09/2026) é a data de regeneração da base e não de conferência da ficha. Pela régua do README,
fonte única não oficial = **`baixa`** → **a Diocese de Eunápolis entra em produção com 0 horários**.
É o maior buraco das seis dioceses desta rodada, e o item nº 1 para o enxame de validação.

**5 fichas do Lírio no território da diocese não foram atribuídas** (identificação insegura):

| Ficha do Lírio | Por que não entrou |
|---|---|
| Eunápolis / Comunidade Católica Shalom | comunidade de vida, não é paróquia nem capela da lista |
| Porto Seguro / Igreja Nossa Senhora do Brasil | é comunidade da Par. N. Sra. da Pena, mas o endereço do Lírio (Av. Psa. do Álcool, 82) não bate com "Centro" |
| Porto Seguro / Igreja São João Batista (Praça São João) | não dá para saber se é Trancoso ou uma capela |
| Porto Seguro / Igreja de N. Sra. das Graças (R. Getúlio Vargas) | idem |
| Santa Cruz Cabrália / Comunidade Igreja Católica São Francisco | idem |

## Comunidades — o ponto forte

**140 capelas nomeadas**, com o povoado/bairro junto ao orago, todas de fonte oficial. As maiores:

| Paróquia | Capelas |
|---|---|
| N. Sra. do Carmo (Belmonte) | 10 |
| São João Batista (Itabela) | 10 |
| São José (Eunápolis) | 7 · Quase-par. São Jorge (Colônia) | 8 |
| N. Sra. da Conceição e São José Operário (Itapebi) | 8 · São João Batista (Itagimirim) | 8 |
| São Pedro (Arraial d'Ajuda) | 8 |

Inclui **capelas em aldeias indígenas Pataxó**: Capela Santa Cruz na Aldeia do Descobrimento
(Monumento da 1ª Missa no Brasil), Santa Luzia na Aldeia Imbiriba, São Pedro na Aldeia Xandó,
Santo Antônio no Paraíso dos Pataxós.

## Achados que precisam de atenção

1. **Santuário Nossa Senhora d'Ajuda** (Arraial d'Ajuda) — "Primeiro Santuário Mariano do Brasil".
   **Ambiguidade de estatuto**: o site o titula "SANTUÁRIO" e dá um **Reitor** (Pe. Vilmar Correia,
   CSSR), mas o publica dentro de "Nossas Paróquias" e o gcatholic o marca "Parish". Mantive como
   registro de paróquia, sem `status: nao-paroquial`. **Precisa de decisão humana.**
2. **A Paróquia São Pedro de Arraial d'Ajuda foi criada em 02/02/2025**, aparentemente desmembrando
   o território do Santuário — as duas ficam em Arraial d'Ajuda. É a paróquia mais nova da diocese.
3. **Paróquia São Sebastião de Vera Cruz está na forania errada**: fica em Porto Seguro, mas o site a
   publica na **Forania Centro**, cujo cabeçalho diz "Cidade: Eunápolis - BA". Gravei
   `city: "Porto Seguro"`.
4. **`foundedYear` muito antigos e reais**: N. Sra. da Pena (Porto Seguro) **1534** — a freguesia de
   Pero do Campo Tourinho, a data mais antiga do dataset inteiro —, N. Sra. da Conceição de Santa
   Cruz Cabrália **1715**, N. Sra. do Carmo de Belmonte **1718**, São João Batista de Trancoso
   **1759**, Divino Espírito Santo de Vale Verde **1775**.
5. **Quase-paróquia São João Batista (São João do Sul, Guaratinga)** — o campo "Administrador
   Paroquial" da ficha oficial está **em branco**. Fica sem pároco no arquivo.
6. **E-mail quebrado no HTML**: Sagrado Coração de Jesus (Rosa Neto, Eunápolis) sai como
   "sagradocoraçã odejesusrn@gmail.com". Gravei sem o espaço — **precisa de validação humana**.
7. **Telefones malformados**: N. Sra. da Conceição de Guaratinga `(73)81576416`; Santa Luzia de
   Pindorama `73 9156-9866` (8 dígitos); Santa Terezinha `(73) 981186161`.
8. **Endereços que divergem entre site e Receita** (gravei sempre o do site): N. Sra. Aparecida de
   Eunápolis, São Pedro de Eunápolis, Santa Isabel, N. Sra. da Pena, São João Batista de Itagimirim,
   São Francisco de Assis de Eunápolis (nº 365 × 380).
9. **Endereços aparentemente trocados no cadastro da Receita em Itabela**: a Receita põe "Rua David
   Manzoli, 100" na São João Batista e "Rua Davi Manzoli, s/n" na N. Sra. Aparecida; o site dá "Praça
   Inocêncio Pereira, s/n" para a primeira e "Rua David Manzoli, 100" para a segunda.
10. **Duas quase-paróquias com o mesmo nome na mesma forania**: Nossa Senhora Aparecida do **Cambolo**
    (Porto Seguro) e de **Nova Cabrália** (Santa Cruz Cabrália). Distinguidas por município no slug.
11. **CEP truncado** na ficha de Itapebi ("45.855-00"); gravei o da Receita, 45855-000.

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

- **`zipCode`**: está `45820-970`, que é o CEP da **caixa postal**. O rodapé do site publica
  **45820-430** para a Praça Frei Calixto, s/nº, Centro — e a Receita usa 45820430 nas inscrições
  desse endereço. Os dois existem; o de logradouro é o 45820-430.
- **`email`**: está `null`. O rodapé publica **`curiadiocesanadeeunapolis@gmail.com`**.
- **`address`**: está `Bispado, Praca Frei Calixto s/n, C.P. 02` — confere, só sem acento.
- **`phone`** `(73) 3281-4851`, **`website`**, **`bishopName`** e **`foundedYear` (1996)** conferem —
  **nada a mudar**.

## O que ficou por fazer

- **Horários**: o item mais importante. Seria preciso ir ao Instagram/Facebook de cada uma das 47
  paróquias, uma a uma — não coube no orçamento das seis dioceses.
- **Endereço e contato das 140 comunidades**: o site publica só nome + povoado/bairro.
- **Confirmar o estatuto do Santuário N. Sra. d'Ajuda** (paróquia ou reitoria).
