# Diocese de Caetité — relatório de pesquisa

- **Slug**: `caetite` · **UF**: BA · **Sede**: Caetité · **Província**: Vitória da Conquista · **Regional**: Nordeste 3
- **Pesquisa**: 18/09/2026
- **Bispo**: Dom José Roberto Silva Carvalho (desde 26/10/2016)
- **Cúria**: Rua Barão de Caetité, 22 · 46400-000 · (77) 3454-4405 · WhatsApp (77) 9837-5238 · curiacte@gmail.com
- **Site oficial**: <https://diocesedecaetite.org.br> — **vivo, atualizado e o melhor das seis dioceses desta rodada**
- **Vicariatos (6)**: Rainha dos Apóstolos · Rainha do Sertão · Rainha dos Patriarcas · Rainha dos Profetas · Rainha dos Mártires · Rainha da Paz

## Resultado

| Métrica | Valor |
|---|---|
| Paróquias | **41** — todas `alta` |
| Comunidades | **46** = 41 matrizes + 5 capelas nomeadas pela tabela de horários |
| Horários fixos | **88**, todos MASS — **todos `media`** |
| Paróquias com algum horário | **40 de 41** |
| Horários carregáveis (`alta`/`media`) | **88** (100%) |

**Cobertura: 41 de 41.** Nenhum agregador foi necessário nem usado.

## Fontes principais

1. **REST do WordPress** — `/wp-json/wp/v2/paroquias?per_page=100` devolve as **41 fichas**
   (`X-WP-Total: 41`); há também `padres` (48 fichas), `vicariatos` (6), `bispos`, `congregacoes` e
   `pastorais`.
2. **A página pública de cada paróquia** (`/paroquias/<slug>/`) — é onde o tema `Dio2021` renderiza
   o que a REST não devolve. Cada ficha traz, em blocos com classes estáveis:
   - `div.lema` → **"Fundação em DD-MM-AAAA"**;
   - link para o **vicariato**;
   - `div.trad-lema` com o marcador ❢ → **endereço da igreja**;
   - blocos `<strong>Pároco</strong>` / `Vigário Cooperador` / `Diácono` → **clero com função**;
   - pares `div.diasemana` + `div.textoagenda` → **a tabela "Horário Celebrações"**, com dia,
     hora e **o nome da igreja ou comunidade** ("na Igreja Matriz", "na Catedral",
     "na Com. Nossa Senhora do Rosário (Mutans)");
   - bloco "Funcionamento Secretaria" → endereço da secretaria, até **dois telefones**, e-mail e
     expediente por dia da semana.
3. **Receita Federal via `minhareceita.org`** — CNPJ raiz **13.778.733**, varredura de `/0001` a
   `/0070`: existem exatamente **48 inscrições**, nada além.
4. **Mapa das OSC / IPEA** — `cd_municipio = 2905206` (Caetité), **um filtro só**, revelou o CNPJ raiz.
5. `gcatholic.org/churches/local/caet0` — 35 igrejas, todas "Parish".
6. `catholic-hierarchy.org/diocese/dcaet.html` — 38 paróquias e 48 presbíteros em 2023 (ap2024).

## Prova de completude — três contagens que fecham em 41

| Fonte | Total |
|---|---|
| `X-WP-Total` do tipo `paroquias` no site oficial | **41** |
| Filiais ATIVAS com nome de paróquia no CNPJ 13.778.733 | **41** |
| A própria narrativa do site (ver abaixo) | **41** |
| catholic-hierarchy (ap2024, dado de 2023) | 38 |
| gcatholic | 35 |

**A narrativa do site é a prova mais bonita**: a ficha da Paróquia Santa Rita de Cássia diz que ela
foi instalada em 13/05/2023 como "a terceira da cidade [Guanambi] e **a 39ª da Diocese de Caetité**".
Depois dela vieram **São Francisco de Assis de Guanambi** (24/09/2023 — a 40ª) e **São Sebastião de
Caturama** (25/12/2024 — a 41ª, desmembrada de Botuporã). 39 + 2 = **41**, o mesmo número da REST e
da Receita. As três contagens casam **uma a uma por município e padroeiro**.

As 7 inscrições do CNPJ que **não** são paróquia: a sede (`/0001`), o **Seminário São José de
Caetité** (`/0033`), a **Comunidade de Formação N. Sra. de Guadalupe** em Belo Horizonte (`/0038`),
a **Comunidade de Formação São Pio X** em Vitória da Conquista (`/0045`), o **Hospital Nossa Senhora
Aparecida** de Caculé (`/0002`, BAIXADA), a **Congregação Pequenas Filhas de São José** (`/0008`,
BAIXADA) e uma inscrição antiga da Paróquia N. Sra. da Boa Viagem de Jacaraci (`/0015`, BAIXADA,
substituída pela `/0012`).

## Horários — por que TUDO é `media` e nada é `alta`

O site é claramente mantido (há notícias de paróquia de **setembro de 2026** e o widget de
celebrações renderiza a data de hoje). Mas o `modified` das fichas de paróquia é quase todo de
**08–12/09/2024**; só 9 foram tocadas em 2025 (a mais recente, Palmas de Monte Alto, em 21/09/2025).
Pela régua do README — fonte **oficial sem sinal de atualidade na própria página** — o grau certo é
`media`, que carrega. **Nenhum horário ficou `baixa`**: a diocese não publica missa de recorrência
mensal, e não usei agregador nenhum.

**O que a tabela publica e não virou horário** (não é missa, pela regra do README):

- **Urandi** — "Tem **Celebração** na Igreja Matriz", sábado 19:00.
- **Pindaí** — "Tem **Culto** na Igreja Matriz", quinta 19:00.
- **Caturama** — linha quebrada: "Segunda-feira | Tem Missa na" (sem hora e sem local). É por isso
  que Caturama é a única paróquia sem nenhum horário no arquivo.

## Comunidades

A diocese **não publica lista nominal de comunidades**. As 5 capelas do arquivo vieram do campo
"local" da tabela de horários — é a única lista nominal que existe no site:

| Paróquia | Comunidade |
|---|---|
| Santo Antônio (Guanambi) | Comunidade Nossa Senhora de Guadalupe (Bairro Alvorada) |
| Santo Antônio (Guanambi) | Comunidade Nossa Senhora do Rosário (Mutans) |
| Santo Antônio (Condeúba) | Comunidade Divino Espírito Santo |
| Santa Rosa de Viterbo (Guajeru) | Capela São Sebastião |
| N. Sra. Mãe de Deus e dos Homens (Palmas de Monte Alto) | Igreja do Divino Espírito Santo |

Duas fichas declaram o **número** de comunidades sem nomeá-las: **Caturama, 21** ("divididas em
quatro zonais") e **Santa Rita de Cássia/Guanambi, 15** (3 urbanas e 12 rurais, incluindo o distrito
de Morrinhos).

## Achados que precisam de atenção

1. **Ibitira não é município.** A ficha se chama "Ibitira – Nossa Senhora do Carmo", mas a Receita
   cadastra o CNPJ `13778733003704` no município de **Rio do Antônio**, bairro **Ibitira**, CEP
   46225-000. Gravei `city: "Rio do Antônio"`, `neighborhood: "Ibitira"`. **É a segunda paróquia de
   Rio do Antônio** (a outra é N. Sra. do Livramento, na sede).
2. **Palmas de Monte Alto** — a ficha abrevia o título para "Nossa Srª Mãe dos Homens"; o texto
   histórico da própria ficha e a Receita dão **Nossa Senhora Mãe de Deus e dos Homens**, nome
   adotado aqui.
3. **7 paróquias sem pároco publicado**: Aracatu, N. Sra. da Conceição Aparecida (Caetité), Iuiú,
   Jacaraci, Piripá, Presidente Jânio Quadros e Sebastião Laranjeiras. A ficha de cada uma
   simplesmente não tem o bloco de clero. O tipo `padres` (48 fichas) traz só o nome do padre, **sem
   a função paroquial** — não deu para desempatar como em Barreiras.
4. **Guajeru** — a ficha registra só um **Vigário Cooperador** (Pe. Ademilson Jesuíno da Silva) e
   nenhum pároco. Gravei-o em `priestName` com a ressalva em `notes`.
5. **Presidente Jânio Quadros** — a ficha não tem endereço, contato nem clero, e a última notícia da
   paróquia no site é de **23/09/2019**. Endereço gravado da Receita.
6. **6 paróquias sem endereço na ficha** (Ibiassucê, Malhada, Matina, Pres. Jânio Quadros, Tanque
   Novo e Tremedal) — todas preenchidas pela Receita, com a ressalva em `notes`.
7. **Endereço da igreja ≠ endereço da secretaria** em várias paróquias (Aracatu, Mortugaba,
   Riacho de Santana, Rio do Antônio, Guanambi/São Francisco, Ibitira…). Gravei o da igreja e pus o
   da secretaria em `notes`.
8. **Telefone de Caraíbas**: `(77) 8862-7924` — 8 dígitos começando por 8, provável celular antigo
   sem o nono dígito.

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

- **`address`**: está `Curia Diocesana, C.P. 06`. O rodapé do site publica o endereço real:
  **"Rua Barão de Caetité, 22, Caetité, BA"**. (A Receita registra a matriz do CNPJ como
  "Praça da Catedral, s/n, Centro".)
- **`email`**: está `null`. O rodapé publica **`curiacte@gmail.com`**.
- **`phone`** `(77) 3454-4405` e **`zipCode`** `46400-970` conferem com o rodapé (que dá
  46400-000 como CEP geral do município; o `-970` é o CEP da caixa postal — os dois são válidos).
- **`website`**, **`bishopName`** e **`foundedYear` (1913)** conferem — **nada a mudar**.

## O que ficou por fazer

- **Comunidades/capelas rurais**: a diocese não publica. Só as 5 que aparecem como local de missa.
- **Confissões e adoração**: a tabela do site só tem "Missa", "Celebração" e "Culto" — a diocese não
  publica confissão nem adoração. Por isso o arquivo tem 0 CONFESSION e 0 ADORATION.
- **Função paroquial dos 48 padres** — o tipo `padres` traz só o nome; não dá para resolver as 7
  paróquias sem pároco por essa via.
- Não consultei Instagram das paróquias (o orçamento foi para fechar as seis dioceses da rodada).
