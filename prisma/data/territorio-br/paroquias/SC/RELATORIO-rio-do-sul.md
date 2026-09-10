# Diocese de Rio do Sul (SC) — relatório de pesquisa

- **Arquivo**: `paroquias/SC/rio-do-sul.json`
- **Data da coleta**: 2026-09-10
- **Circunscrição**: Diocese de Rio do Sul — erigida em 23/11/1968 e instalada em 03/08/1969;
  sufragânea da Arquidiocese de Joinville. Sé: Catedral São João Batista, Rio do Sul.
  Bispo: Dom Adalberto Donadelli Júnior (5º bispo, desde 07/06/2024).

## Resumo

| Item | Total |
|---|---|
| Paróquias | **31** (31 `alta`, 0 `media`, 0 `baixa`) |
| Comunidades | **425** (31 matrizes + 394 comunidades/capelas) |
| Horários fixos | **97** (0 `alta`, 88 `media`, 9 `baixa`) |
| Cobertura | 31 encontradas / 31 esperadas (site oficial e catholic-hierarchy) |

Todos os 97 horários são `MASS`. Distribuição por região pastoral (divisão do próprio site):
Rio do Sul 7, Taió 5, Rio do Oeste 5, Presidente Getúlio 5, Ituporanga 5, Rodeio 4.
Composição: 1 catedral e 30 paróquias, sediadas em 25 municípios (a diocese abrange 32; os demais
são atendidos por paróquias com sede em município vizinho — ex.: Atalanta, Chapadão do Lageado e
Petrolândia pertencem à Paróquia Santo Estêvão, de Ituporanga).

## Fontes principais

Toda a base veio do **site oficial da diocese**.

| Fonte | Uso |
|---|---|
| https://www.dioceseriodosul.com.br/KU53L6JpeiSqHtAPUj2mukD0ARBWP2AQrM7BeY*UGoc: | Índice das 31 paróquias e filtro por região pastoral (6 páginas: Taió, Rio do Oeste, Presidente Getúlio, Rio do Sul, Ituporanga, Rodeio) |
| https://www.dioceseriodosul.com.br/46v5EGxrwtESElg7rVjci… (31 páginas) | Data de criação, paróquia de origem, município(s), nº de comunidades, pároco/administrador, vigários, diáconos, horários de missa da matriz, endereço da matriz e da secretaria, CEP, telefone, WhatsApp, e-mail, redes sociais e lista nominal das comunidades |
| https://www.dioceseriodosul.com.br/XyGVEaiHO0ZhkL8PUGjnG2SEAWVYePURaVcPKz7UpQY: | Página "A Diocese": 6 regiões pastorais, 31 paróquias, 437 comunidades, 32 municípios, instalação em 03/08/1969 |
| https://www.catholic-hierarchy.org/diocese/drids.html | Corroboração: 31 paróquias, ereção em 23/11/1968, bispo Adalberto Donadelli Júnior (2024), ~272 mil católicos |
| https://pt.wikipedia.org/wiki/Diocese_de_Rio_do_Sul | Corroboração de sé, bispos e sufraganeidade |

Endereço da Cúria (rodapé do site): Rua São Ludgero, 79 — Centro, Rio do Sul/SC, 89160-061,
(47) 3521-0315, diocesederiodosul@gmail.com. CNPJ da Mitra: 85.788.289/0001-08.

## Cobertura

- **Paróquias: 31/31.** O total bate em três fontes (site oficial, página "A Diocese" e
  catholic-hierarchy). Nenhuma paróquia ficou de fora.
- **Comunidades: 420 nomeadas de 437 declaradas.** As páginas paroquiais listam os nomes das
  comunidades; somando os "Número de Comunidades" de cada página chega-se exatamente a 437, mas
  três páginas não trazem a lista nominal e uma paróquia lista a mais:
  - Catedral São João Batista (Rio do Sul) — declara 1, não lista (matriz sintetizada);
  - Paróquia Santa Catarina (Vitor Meireles) — declara 17, não lista nenhuma;
  - Paróquia São Sebastião (José Boiteux) — declara 10, não lista nenhuma;
  - Paróquia Nossa Senhora de Fátima (Pouso Redondo) — declara 15 e lista 26 nomes (a lista parece
    repetir um bloco inteiro — ver ponto 5);
  - Paróquia Cristo Rei (Taió) — declara 21 e lista 22;
  - Paróquia Nossa Senhora do Santíssimo Rosário (Presidente Getúlio) — declara 16 e lista 15.

  Dataset: 420 nomeadas + 3 matrizes sintetizadas + 2 locais citados apenas nos títulos de
  horário (`Comunidade Estreito`, em Alfredo Wagner, e `Complexo Turístico Nossa Senhora de
  Lourdes e do Louvor`, em Ituporanga) = **425**.
- **Horários: só da igreja matriz.** O site não publica horário por comunidade — apenas
  "Horários de Missa na Igreja Matriz" e, em dois casos, um segundo bloco para um local
  específico. Duas paróquias não publicam horário nenhum.

## Critérios aplicados

- **`alta`** para paróquias e comunidades: o índice e as páginas são a publicação oficial vigente
  da diocese.
- **Horários `media`, não `alta`.** As páginas paroquiais têm data de publicação de **agosto e
  setembro de 2022** e nenhum sinal de atualização posterior. O README exige, para horário de
  missa `alta`, "publicação oficial com sinal de atualidade (página ativa, post ≤ 12 meses)" —
  condição não satisfeita. Enquadram-se em "fonte oficial sem sinal de atualidade" = `media`.
  Ainda entram na carga, mas convém revalidar por telefone/redes sociais.
- **Horários `baixa` (9)**: recorrência mensal — "Primeira sexta-feira do mês",
  "Última quinta-feira do mês", "1º e 3º Sábado", "Primeiro sábado do mês". Texto original
  preservado em `notes`.
- **Tipo**: todos os horários estão sob a rubrica "Horários de Missa", então foram gravados como
  `MASS` mesmo quando a observação cita Rosário/Adoração (ex.: Sant'Ana/Apiúna, sexta 19:30
  "Rosário"; Santa Luzia/Lontras, quarta 19h "Missa com Adoração ao Santíssimo Sacramento e
  Bênção da Água"). São missas com devoção associada, não celebrações separadas.
- **Slug**: `<nome-sem-prefixo>-<cidade>`. Não houve colisão: as duas "Paróquia Cristo Rei" ficam
  em Dona Emma, Taió e Trombudo Central; as duas "Paróquia São José" em Presidente Nereu e Rio do
  Campo; as duas "Nossa Senhora das Graças" em Rio do Sul e Witmarsum; as duas "São Sebastião" em
  José Boiteux e Vidal Ramos.

## Excluído do dataset (2 registros)

Celebrações em dia fixo do mês, que o campo `dayOfWeek` não representa:
- Paróquia Nossa Senhora de Fátima (Pouso Redondo): "Dia 13 de cada mês: 19h (Missa Devocional)".
- Paróquia São Judas Tadeu (Santana, Rio do Sul): "Todo dia 28: 19h".

## Pontos para validação humana

1. **Endereço errado no site — Paróquia São José (Rio do Campo).** O bloco "Endereço da Igreja
   Matriz" repete o endereço da Paróquia Cristo Rei de Taió ("Rua Padre Eduardo, 112 — Centro,
   Taió/SC, CEP 89.190-000"), enquanto o município declarado é Rio do Campo e a secretaria fica na
   "Rua Padre Paulino, 168 — Centro, Rio do Campo/SC, CEP 89.198-000". Gravamos o endereço da
   secretaria (coerente com o município); **confirmar o endereço real da matriz**.
2. **Paróquia Santa Catarina (Vitor Meireles) — página quase vazia.** Só traz data de criação
   (23/02/1976), paróquia de origem, município, "17 Comunidades", pároco (Pe. Rene Valberto
   Gesser) e o Facebook. Ficou sem endereço, CEP, telefone, e-mail, bairro, comunidades e
   horários. Único registro do arquivo com `address`, `zipCode`, `phone` e `email` nulos.
3. **Paróquia São Miguel Arcanjo (Mirim Doce) — sem horário publicado** e sem bairro; o telefone
   informado é celular ((47) 99996-0693, também usado como WhatsApp). O endereço da matriz
   ("Estrada Geral Paleta") não traz número nem bairro.
4. **Paróquia São Sebastião (José Boiteux)** declara 10 comunidades mas não lista nenhuma; ficou
   só com a matriz sintetizada. Idem Catedral São João Batista (declara 1).
5. **Paróquia Nossa Senhora de Fátima (Pouso Redondo)** — a lista de comunidades tem 26 nomes para
   15 declaradas, com um bloco de 11 nomes aparentemente repetido (Nossa Senhora Aparecida,
   Nossa Senhora de Lourdes, Santo Antônio de Pádua, Santíssima Trindade, Nossa Senhora das
   Graças, Sagrado Coração de Jesus, Santa Rita de Cássia, Senhor Bom Jesus, São Luiz Gonzaga,
   Nossa Senhora do Perpétuo Socorro, São José Operário). Os repetidos entraram com sufixo `(2)`;
   provavelmente são duplicatas a remover.
6. **Duas linhas "Matriz" na Paróquia Cristo Rei (Taió)** — a lista traz `Matriz Cristo Rei` (a
   verdadeira, marcada `isMatriz: true`) e `Matriz Sagrada Família`, que foi gravada como
   comunidade comum. Conferir se é comunidade ou erro de rótulo.
7. **Paróquia Nossa Senhora do Santíssimo Rosário (Presidente Getúlio)** — o nome oficial da
   paróquia usa "Santíssimo Rosário", mas a matriz na lista aparece como
   `Matriz Nossa Senhora do Rosário` (nome mantido como está na fonte) e as redes sociais também
   usam "Nossa Senhora do Rosário". Padronizar depois de confirmar o nome canônico.
8. **Comunidades homônimas dentro da mesma paróquia** (50 registros em 14 paróquias) receberam
   sufixo numérico `(2)`, `(3)`, `(4)` porque o site só publica o nome, sem localidade nem
   endereço. Casos mais numerosos: Santo Estêvão/Ituporanga (14), Nossa Senhora de
   Fátima/Pouso Redondo (11), Sagrada Família/Rio do Campo (6), Cristo Rei/Taió (5).
   **Precisam da localidade real** para virar nome utilizável.
9. **Padres acumulando paróquias** — `Pe. Anésio Dalcastagner, SCJ` é pároco de Nossa Senhora das
   Graças (Boa Vista) e São Judas Tadeu (Santana), ambas em Rio do Sul; `Pe. Leandro Edmar Nandi`
   é administrador paroquial em Rio do Oeste e Witmarsum; `Pe. Rene Valberto Gesser` em Dona Emma
   e Vitor Meireles; `Pe. Rinaldo César da Silva` em Canoas (Rio do Sul) e Rio da Prata (grafado
   "Rinaldo Cesar" numa página e "Rinaldo César" noutra). Plausível, mas confirmar — dados de 2022.
10. **Grafia de nomes de padres** — `Padre Amarido Bertoldi` (Santo Ambrósio/Ascurra) provavelmente
    é "Amarildo Bertoldi", o mesmo pároco de Cristo Rei/Trombudo Central. `Pe.Carlos Valteórgenes
    de Almeida` (José Boiteux) está sem espaço após "Pe.". Mantidos como na fonte.
11. **Sites paroquiais** — só duas paróquias publicam site próprio: Catedral São João Batista
    (catedralderiodosul.com.br) e Santo Estêvão/Ituporanga (matrizituporanga.com.br). As demais
    ficaram com `website: null`; muitas têm Facebook/Instagram, não gravados (o schema não tem
    campo para redes sociais).
12. **Bairro do Santo Estêvão (Ituporanga)** — o endereço é "Praça Frei Gabriel, 148 - Caixa
    Postal 19" com o bairro "Centro" em linha separada; a caixa postal ficou dentro de `address`.
13. **Bairro do São Francisco de Assis (Rodeio)** — `address` ficou "Rua Barão do Rio Branco, 1140
    - Anexo ao Centro Pastoral", bairro "Centro". Conferir se o número da matriz é o mesmo do
    Centro Pastoral.
14. **`Paróquia Sant´Ana` (Apiúna)** — o site usa apóstrofo tipográfico invertido (`´`). Nome
    mantido como na fonte; slug `sant-ana-apiuna`.
15. **Revalidar todos os horários.** Com páginas de 2022 e 4 anos de trocas de párocos, é o item
    mais provável de estar desatualizado em toda a circunscrição.
