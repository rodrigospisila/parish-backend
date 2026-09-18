# Relatório — Prelazia de Marajó (PA)

Pesquisa: 18/09/2026. Arquivo: `marajo.json`.

## Resultado

| | |
|---|---|
| Entradas | **10** paróquias (uma delas a paróquia da Sé, com a Catedral Prelatícia) |
| Confiança das entradas | 10 `alta` |
| Comunidades | **76** (68 `alta`, 4 `media`, 4 `baixa`) |
| Horários fixos | **91** — 58 `alta`, 10 `media`, 23 `baixa` (14 de recorrência mensal + os 9 de Sant'Ana, que vêm de agregador) — 87 missas, 2 confissões e 2 adorações |
| Cobertura | 10/10 |

## Fonte principal: o site oficial `prelaziadomarajo.com`

Site novo, em Astro/Hostinger, com **sitemap atualizado em 11/09/2026** — uma semana antes desta pesquisa.
A página `/prelazia` declara: *"Atualmente compreende 9 municípios: Afuá, Anajás, Bagre, Breves, Chaves,
Melgaço, Portel, Salvaterra e Soure, totalizando 10 paróquias"*.

**Mas só 5 das 10 paróquias têm ficha publicada** (`Mais informações`): Soure, Anajás, Salvaterra, Melgaço e
São José e Santa Terezinha (Breves). Essas 5 são excelentes e trazem:

- endereço com CEP, pároco, vigários, telefone e e-mail próprios;
- **grade de missas igreja por igreja**, com as missas mensais explicitadas ("1ª quarta-feira", "2º sábado");
- **lista de comunidades com endereço** — inclusive as 36 comunidades ribeirinhas de Melgaço, agrupadas em
  7 setores (Campinas, Tajapuru Grande, Maparí Grande, Laguna e três setores do Anapú/Caxiuanã);
- horário de confissão, adoração, atendimento dos padres e funcionamento da secretaria.

As outras 5 aparecem só na lista: **Sant'Ana (Breves), Nossa Senhora da Conceição (Afuá), Santo Antônio
(Chaves), Santa Maria (Bagre) e Nossa Senhora da Luz (Portel)**. Para elas usei endereço, CEP e telefone da
**Receita Federal** e o clero anunciado nas notícias oficiais de 2025–2026 do próprio site.

Outras fontes: `/clero`, `/contato`, `/prelazia`, três notícias oficiais (Comunicados nº 010/2025 e 017/2025 e
a posse de Frei Danilo em Portel), `gcatholic.org`, `catholic-hierarchy.org`, o **Mapa das OSC/IPEA** (achou o
CNPJ raiz) e o agregador **Lírio Católico**.

## A Receita fechou a lista, sem surpresas

CNPJ raiz **01.759.302**. Varri as ordens 0001–0026: existem **13 estabelecimentos, TODOS ATIVOS** —
nenhuma filial suspensa, nenhuma baixada, nenhuma filial-fóssil:

| Ordem | Razão social | Município |
|---|---|---|
| 0001 | PRELAZIA DO MARAJO (Cúria) | Soure |
| 0002 | PAROQUIA NOSSA SENHORA DA LUZ | Portel |
| 0003 | PAROQUIA SAO MIGUEL ARCANJO | Melgaço |
| 0004 | PARQUIA NOSSA SENHORA DA CONCEICAO *(sic)* | Afuá |
| 0005 | PAROQUIA SANTA MARIA | Bagre |
| 0006 | PAROQUIA MENINO DEUS | Anajás |
| 0007 | PAROQUIA DE SANT ANA | Breves |
| 0008 | SEMINARIO MAIOR SANTA MARIA MAE DA IGREJA | **Marituba** (fora do território) |
| 0009 | PAROQUIA SANTO ANTONIO | Chaves |
| 0010 | PAROQUIA MENINO DEUS | Soure |
| 0011 | SEMINARIO MENOR SAO JOSE | Soure |
| 0012 | PAROQUIA SAO JOSE OPERARIO E STA TEREZINHA DO MENINO JESUS | Breves |
| 0013 | PAROQUIA NOSSA SENHORA DA CONCEICAO | Salvaterra |

10 paróquias exatas — o mesmo número do site, do gcatholic e do catholic-hierarchy.

## As comunidades: 600 declaradas, 67 publicadas

A página `/clero` diz que o clero acompanha **"mais de 600 comunidades eclesiais"**. O site publica o nome de
**67** (14 em Soure, 40 em Melgaço, 6 em Anajás, 5 em Breves/São José e 2 em Salvaterra). O arquivo traz 76 —
essas 67 mais as 5 matrizes das paróquias sem ficha e 4 igrejas que vieram do gcatholic e do agregador em
municípios de **paróquia única** (Salvaterra e Afuá), onde o vínculo é seguro.

**As centenas de comunidades ribeirinhas restantes não estão publicadas em lugar nenhum** — é o limite da
fonte, não da pesquisa.

## Horários: 5 paróquias com grade oficial completa, 5 sem nada

- **Soure (Catedral)** — 33 horários: missa diária às 6h30 na Catedral, novena de terça, missa de sábado em
  São Sebastião, **10 missas de domingo em 8 igrejas diferentes** e confissão às sextas. Além disso, **11
  missas de recorrência mensal** em capelas urbanas e nas vilas (Pedral, Pesqueiro, Caju Una, Céu).
- **Anajás** — 14 horários, todos semanais, distribuídos pelas 6 igrejas da cidade.
- **Melgaço** — 13 horários: missa e novena diferente cada dia da semana, em quatro igrejas urbanas, mais uma
  adoração às quintas e a "Missa dos Idosos" do último sábado do mês.
- **Breves / São José e Santa Terezinha** — 16 horários, incluindo a "Hora da Graça" (adoração de quinta às
  15h) e 7 missas de domingo.
- **Salvaterra** — 6 horários, sendo um mensal em Joanes.
- **Breves / Sant'Ana** — 9 horários **`baixa`**, só do agregador Lírio Católico.
- **Afuá, Chaves, Bagre e Portel — nenhum horário.** Nem o site, nem o agregador, nem o gcatholic publicam.

**Catorze horários ficaram `baixa` por recorrência mensal** (11 em Soure, 1 em Melgaço, 1 em Breves/São José e
1 em Salvaterra), com a regra literal em `notes`; os outros 9 `baixa` são a grade de Sant'Ana. Em Soure a
regra é a norma: a Igreja Santa Rita tem missa na 1ª, 3ª e 5ª quinta-feira; Nossa Senhora das Graças na 2ª e
na 4ª; e cada sexta-feira do mês tem uma capela diferente. **É o caso clássico que o Parish ainda não modela.**

Dez horários de domingo de Soure ficaram `media` porque a própria ficha intitula o bloco
**"Domingo (Missa ou Celebração da Palavra)"** — nas capelas sem padre é celebração da Palavra, e a fonte não
diz em quais. Os três horários da Catedral do mesmo bloco ficaram `alta`.

## Armadilhas e divergências encontradas

- **A paróquia da Sé não se chama como a Catedral.** A paróquia é **Menino Deus**; a igreja-matriz é a
  **Catedral Prelatícia Nossa Senhora da Consolação**. O gcatholic registra as duas designações na mesma
  linha. Gravei `name` = "Paróquia Menino Deus", `unitType` = catedral e a matriz com o nome da Catedral.
- **Duas paróquias Menino Deus** (Soure e Anajás) e **duas paróquias em Breves**. Os slugs incluem a cidade.
- **Duas igrejas São Sebastião em Soure** (Pacoval e Vila do Pedral) e uma terceira em **Caju Una**, que
  aparece só na grade de missas, não na lista de comunidades da mesma página. Desambiguadas com a localidade
  entre parênteses.
- **Missa em escola e em hospital**: a grade de Breves/São José publica missa de terça às 17h30 na **Escola
  Maria Rafols** e de quinta às 9h no **Hospital Regional**. Não são comunidades da paróquia; registrei os dois
  horários na matriz, `media`, com o local literal em `notes`, para não inventar comunidade.
- **A matriz de Breves/São José ainda não existe como igreja**: a ficha diz que as missas são no salão
  paroquial e que a antiga igreja de madeira foi demolida para a construção da nova Matriz.
- **DDD 96 (Amapá) em duas paróquias do Pará**: Afuá (96) 3689-1210 e Chaves (96) 3689-1324, como registrado
  na Receita — os dois municípios ficam na divisa/foz, o que torna plausível.
- **Razão social com erro de digitação na Receita**: "PARQUIA NOSSA SENHORA DA CONCEICAO" (Afuá).
- **Pároco publicado só com o primeiro nome**: "Frei Danilo" (Portel), na notícia oficial de 18/01/2026.
- **Endereço divergente em Breves/Sant'Ana**: Receita diz Avenida Rio Branco 91; o agregador diz Avenida
  Presidente Getúlio Vargas 407.
- **"Celebração da Palavra" não vira horário**: a ficha do agregador de Nossa Senhora do Rosário (Joanes,
  Salvaterra) publica "Celebração da palavra: domingos 8:00" — descartada; só a missa mensal de 1ª sexta
  entrou, `baixa`.
- **Seminário Maior fora do território**: o Seminário Maior Santa Maria Mãe da Igreja (filial 0008) fica em
  **Marituba**, na região metropolitana de Belém, não no Marajó. Não é paróquia e ficou fora do JSON.

## Igrejas com missa que NÃO entraram no JSON (vínculo não confirmado)

Em Breves há duas paróquias, então o agregador Lírio Católico traz sete igrejas que não consigo atribuir com
segurança. **Ficaram fora do arquivo**:

| Igreja (Breves) | Endereço | Missas publicadas |
|---|---|---|
| Igreja Perpétuo Socorro | Av. Rio Branco, 1335-1563 | dom 7h, 9h e 20h; ter 20h |
| Igreja Santo Antônio | José Rodrigues da Fonseca | dom 9h; ter 19h30 |
| Igreja Nossa Senhora de Fátima | Jardim Tropical | dom 9h; qua 19h |
| Igreja de Santa Mônica | R. Dr. Teixeira da Costa | dom 18h; seg 18h |
| Igreja de Santo Ezequiel Moreno | R. do Parque Industrial | dom 7h |
| Igreja Nossa Senhora da Consolação | Bananal 1 | dom 9h |
| Comunidade Divino Pai Eterno | próximo a José Anchieta da Conceição | dom 10h30 |

(A Igreja Perpétuo Socorro fica na mesma Av. Rio Branco da matriz de Sant'Ana, e Santo Ezequiel Moreno é um
santo agostiniano recoleto — as duas provavelmente são de Sant'Ana, mas **não está confirmado**.)

## Precisa de validação humana

1. **Cinco paróquias sem ficha oficial** — Sant'Ana (Breves), Nossa Senhora da Conceição (Afuá), Santo Antônio
   (Chaves), Santa Maria (Bagre) e Nossa Senhora da Luz (Portel): confirmar pároco, e-mail, horários e
   comunidades. Quatro delas entram em produção **sem nenhum horário**.
2. **As sete igrejas de Breves da tabela acima** — a qual das duas paróquias pertencem.
3. **Endereço da matriz de Sant'Ana (Breves)**: Av. Rio Branco 91 (Receita) × Av. Pres. Getúlio Vargas 407
   (agregador); e os 9 horários dela são `baixa`, de agregador sem data de conferência.
4. **Nome completo de "Frei Danilo"**, pároco de Portel desde 18/01/2026, e o pároco de Afuá (só o vigário foi
   anunciado).
5. **Igreja da 1ª Rua (Salvaterra)**: a ficha oficial não dá nome à igreja, só o local da missa de segunda.
6. **Bloco "Missa ou Celebração da Palavra" de Soure**: em quais das 8 igrejas há de fato missa aos domingos.
7. **Igreja São Sebastião (Caju Una), Soure**: está na grade de missas mas não na lista de comunidades.
8. **As "mais de 600 comunidades"**: só 67 estão publicadas. Vale pedir à Cúria a lista por paróquia — é o
   maior buraco de dado desta circunscrição.
9. **Data de criação** só foi publicada para duas paróquias (Salvaterra, 06/11/1949, e Breves/São José,
   04/02/2012). As outras oito entram com `foundedYear: null`.

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

- `address`: está `"3a Rua N. 1428"`. O site e a Receita escrevem **"Terceira Rua, 1428, Centro"** (o gcatholic
  usa "Terceira Rua 1428"). Vale normalizar.
- `phone`: está `"(91) 99129.5190"` — com ponto e não confirmado em nenhuma fonte de 2026. O site publica
  **(91) 99328-0469**. (O gcatholic ainda traz o fixo antigo "(091) 3741-1333".)
- `email`: está `null`; o site publica **`prmarajo@gmail.com`**.
- `website`: está `null`; o site oficial é **`https://www.prelaziadomarajo.com`**, ativo e atualizado em
  11/09/2026.
- `zipCode` 68870-000, `city` Soure e `bishopName` "Dom José Ionilton Lisboa de Oliveira, S.D.V." estão
  corretos. Nota: o gcatholic data a nomeação em **03/11/2023**, o site da prelazia também; a posse em Soure
  foi em **27/07/2024**.
- `foundedYear` 1928 está correto e é o ano de ereção da prelazia (bula *Romanus Pontifex*, 14/04/1928).
  **Não mexer.**
