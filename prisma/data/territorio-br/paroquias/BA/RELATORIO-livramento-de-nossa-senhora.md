# Diocese de Livramento de Nossa Senhora — relatório de pesquisa

- **Slug**: `livramento-de-nossa-senhora` · **UF**: BA · **Sede**: Livramento de Nossa Senhora · **Província**: Vitória da Conquista · **Regional**: Nordeste 3
- **Pesquisa**: 18/09/2026
- **Bispo**: Dom Vicente de Paula Ferreira, C.Ss.R.
- **Cúria**: Rua Deoclides Alcântara, 110, Centro (Cx. Postal 02) · 46140-000 · Secretaria (77) 9 9916-6506 · Financeiro (77) 3444-2433 · curialivramento@gmail.com
- **Site oficial**: **<https://www.diocesedelivramento.org>** — vivo, em Wix, © 2026
- **Vicariatos (5)**: N. Sra. do Livramento (4) · Imaculada Conceição (4) · N. Sra. do Alívio (3) · N. Sra. do Rosário (4) · N. Sra. do Carmo (6)

## O achado principal: o `dioceses.json` aponta para o site errado

O `dioceses.json` registra **`http://diocesedelivramento.blogspot.com`**. Esse blog **está congelado
em fevereiro de 2022** (o arquivo do Blogger termina aí) e a sua página "Paróquias e Vicariatos"
**está vazia** — só o título. O site oficial vivo é **`https://www.diocesedelivramento.org`**, em
Wix, com © 2026 no rodapé, notícias de setembro de 2026 e Instagram @diocesedelivramento. É ele que
publica a lista das 21 paróquias por vicariato e **uma ficha completa por paróquia**.

O blogspot ainda serve como registro histórico (a página da Cúria, de 2022, traz o mesmo endereço e
telefone, e ainda dá **Dom Armando Bucciol** como bispo).

## Resultado

| Métrica | Valor |
|---|---|
| Paróquias | **21** — todas `alta` |
| Comunidades | **28** = 21 matrizes + 7 capelas nomeadas no quadro de horários |
| Horários fixos | **43**, todos MASS — **36 `alta`**, 7 `baixa` |
| Paróquias com algum horário | **16 de 21** |
| Horários carregáveis (`alta`/`media`) | **36** |

**Cobertura: 21 de 21.**

## Fontes principais

1. **`/paroquias`** — a lista oficial, agrupada nos 5 vicariatos: 4 + 4 + 3 + 4 + 6 = **21**.
2. **As 21 fichas individuais** (`/paroquianossasenhoradolivramento`, `/paroquiasantissimosacramento`,
   `/paroquiadombasilio`…) — cada uma com **breve histórico, endereço, CEP, telefone, e-mail, clero
   com função e o quadro "Horário de Missas"**, este último com dia, hora e **o local**
   ("Igreja catedral", "Bairro Estocada", "Torre do Bom Jesus", "Igreja Nossa Senhora do Rosário").
3. **`/clero-diocesano`** — 25 presbíteros incardinados, com data de nascimento e de ordenação.
4. **`/governodiocesano`** — bispo, cúria, telefones da secretaria e do financeiro, conselhos.
5. **Receita Federal via `minhareceita.org`** — CNPJ raiz **14.696.868**, varredura de `/0001` a
   `/0060`: existem exatamente **26 inscrições**, nada além.
6. **Mapa das OSC / IPEA** — `cd_municipio = 2919504`, um filtro só, deu o CNPJ raiz.
7. `catholic-hierarchy.org/diocese/dldns.html` — 21 paróquias e 26 presbíteros em 2023 (ap2024).

## Prova de completude — três contagens que fecham em 21

| Fonte | Total |
|---|---|
| Página `/paroquias` do site oficial (5 vicariatos) | **21** |
| Filiais ATIVAS com nome de paróquia no CNPJ 14.696.868 | **21** |
| catholic-hierarchy (ap2024, dado de 2023) | **21** |

As três casam **uma a uma por município e padroeiro**. As 5 inscrições restantes do CNPJ não são
paróquia: a sede (`/0001`), o **CDTP – Centro Diocesano de Treinamento Pastoral** (`/0030`), a
**Casa de Formação Dom Hélio Paschoal** (`/0032`) e **duas BAIXADAS** substituídas por inscrições
novas (N. Sra. do Bonfim de Rio do Pires, `/0003`, e N. Sra. do Alívio de Ituaçu, `/0004`).

## Por que os horários são `alta` — a prova de atualidade

Páginas Wix não expõem data de modificação. Mas duas fichas dão a prova pelo conteúdo:

- **Jussiape** tem como administrador paroquial o **Pe. Douglas Silva Cruz, ordenado em 23/05/2026**;
- **Contendas do Sincorá**, o **Pe. Anderson Rodrigues dos Santos, ordenado em 31/01/2026**.

Só é possível publicar esses nomes depois dessas datas. Somado ao rodapé © 2026 e às notícias de
setembro de 2026, as fichas são **fonte oficial com sinal de atualidade** → `alta`.

São `baixa` os **7 horários de recorrência mensal** (1ª sexta-feira do mês em 5 paróquias, e o 2º
domingo do mês no bairro Canjerana, em Ibicoara), cada um com a regra literal em `notes`.

## 5 paróquias sem nenhum horário — e o site diz por quê

| Paróquia | O que o quadro "Horário de Missas" publica |
|---|---|
| Santíssimo Sacramento (Rio de Contas) | só a palavra **"Domingo"**, sem hora |
| N. Sra. do Alívio (Ituaçu) | só a palavra **"Domingo"**, sem hora |
| São João Batista (Dom Basílio) | **"Em Breve"** |
| N. Sra. do Carmo (Érico Cardoso) | **"Em Breve"** |
| Senhor do Bonfim (Rio do Pires) | **"Em Breve"** |

Não é falha de leitura: é o que está publicado. São o alvo nº 1 do enxame de validação nesta diocese.

## Achados que merecem nota

1. **Mucugê: a matriz não leva o nome da paróquia.** A Paróquia São João Batista tem como
   igreja-matriz a **Matriz Santa Isabel**, e a segunda igreja é a **Igreja Nossa Senhora do
   Rosário** — é assim que a própria ficha nomeia os locais das missas, e o Lírio Católico registra
   as duas separadamente, confirmando domingo 08:00 no Rosário e 19:00 na Matriz.
2. **Geminação com a Diocese de Vittorio Veneto (Itália)**: o pároco de Tanhaçu é o **Pe. Paolo
   Salatin**, italiano, e conta com a colaboração de **Dom Corrado Pizziolo, bispo emérito de
   Vittorio Veneto**. Em 2026 o site noticiou um intercâmbio missionário com 16 jovens de Tanhaçu e
   Ibipitanga.
3. **A URL da ficha de Tanhaçu no Wix ainda é `cópia-paróquia-de-são-joão-batista-d-1`** — a página
   foi criada duplicando a de Dom Basílio. E o endereço sai grafado **"Tanhuaçu"** (com U a mais).
4. **Paróquia mais antiga**: Santíssimo Sacramento de Rio de Contas, herdeira da "Freguesia do Sertão
   de Cima" de **1718**, transferida para Rio de Contas por Provisão Régia de **02/10/1745** (data
   que gravei como `foundedYear`).
5. **Pároco emérito**: Mons. Pedro Olímpio dos Santos (n. 1937, ord. 1967), em Paramirim — o
   presbítero mais antigo da diocese.
6. **Érico Cardoso**: a ficha dá Pe. José Aparecido de Souza como pároco, mas a página do clero o
   registra **"em experiência missionária"**. Divergência interna do site — precisa de validação.
7. **Confissões e adoração**: a diocese não publica nenhuma. O arquivo tem 0 CONFESSION e 0 ADORATION.

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

- **`website`**: está `http://diocesedelivramento.blogspot.com` (blog congelado em 02/2022, página de
  paróquias vazia). O correto é **`https://www.diocesedelivramento.org`**.
- **`email`**: está `null`. O site e o blog publicam **`curialivramento@gmail.com`**.
- **`address`**: está `Rua Deoclides Alcantara 110` — confere; o site acrescenta "Centro" e a
  "Caixa Postal 02".
- **`phone`** `(77) 3444-2433` confere (é o do **financeiro**); a **secretaria** atende no
  **(77) 9 9916-6506**.
- **`zipCode`** `46140-000`, **`bishopName`** (Dom Vicente de Paula Ferreira, C.Ss.R., confirmado na
  página `/governodiocesano`) e **`foundedYear` (1967)** conferem — **nada a mudar**.

## O que ficou por fazer

- **Comunidades/capelas rurais**: a diocese não publica lista nominal. As 7 do arquivo são as que
  aparecem como local de missa. O blog antigo cita, de passagem, as comunidades de Abaíra (Assento,
  Curralinho, Malhada, Matriz, Rio de Contas) e de Ibicoara (Cascavel) — não gravadas por virem de
  notícia de 2022, não de lista oficial.
- **As 5 paróquias sem horário** (ver tabela).
- Não consultei Instagram das paróquias.
