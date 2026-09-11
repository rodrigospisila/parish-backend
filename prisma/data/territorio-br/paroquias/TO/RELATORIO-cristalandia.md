# Relatório — Diocese de Cristalândia (TO)

**Pesquisa:** 2026-09-11 · **Arquivo:** `paroquias/TO/cristalandia.json`

## Atenção: é **Diocese**, não Prelazia

A tarefa pedia "Prelazia de Cristalândia". Foi prelazia de **1956 a julho de 2019**, quando o
Papa Francisco a **elevou a Diocese** (Vatican News, 07/2019). O `dioceses.json` do repositório
já a registra corretamente como `"type": "Diocese"`, e foi assim que gravei — mudar para
Prelazia quebraria a consistência com o registro já carregado em produção.

## Resultado

| Métrica | Valor |
|---|---|
| Paróquias | **20** (20 alta) |
| Comunidades/capelas | **62** |
| Horários fixos | **93** (63 alta, 2 media, 28 baixa) |
| Cobertura | 20/20 (100%) |

Bispo: **Dom Wellington Tadeu de Queiroz Vieira**. Cúria: Av. Dom Jaime Antônio Schuck, 2050,
Centro, Cristalândia/TO, 77490-000, (63) 99287-8320.

## Fontes principais

1. **API REST do site oficial** — `GET /wp-json/wp/v2/posts?categories=22,24,25,81` devolve
   `X-WP-Total: 20`, a lista canônica das paróquias agrupadas nas **4 foranias**:

   | Forania | Paróquias |
   |---|---|
   | Nossa Senhora da Piedade | 7 (as 7 de Goiás) |
   | São João Batista | 4 |
   | Nossa Senhora do Perpétuo Socorro | 4 |
   | São José Operário | 5 |

   **As 20 fichas têm endereço, CEP e pároco**, e foram modificadas entre 08/2024 e 07/2026 —
   sinal de atualidade forte, por isso tudo `alta`.
2. **Página diocesana "Horário de Missa"** — <https://diocesedecristalandia.org.br/horario-de-missa/>.
   Organizada por **horário** (07h, 07h30, 09h, 15h, 17h, 18h, 19h, 19h30), cada linha no
   formato `Dia | Comunidade – Paróquia (Cidade)`. É o que permitiu montar as 62 comunidades
   **já ligadas à paróquia certa**, sem inferência.

## A diocese está em dois estados

Cristalândia abrange municípios do **Tocantins e de Goiás**. **7 das 20 paróquias ficam em GO**
e receberam `state: "GO"`: Porangatu (três — N. Sra. da Piedade, Santíssima Trindade e Santo
Antônio de Pádua), São Miguel do Araguaia, Novo Planalto, Bonópolis e Mutunópolis. Não são
duplicatas de dioceses goianas: estão no território desta diocese.

## Horários: 7 paróquias de 20

A página de horários cobre **N. Sra. da Piedade** e **Santíssima Trindade** (Porangatu-GO),
**São José Operário** e **N. Sra. do Perpétuo Socorro** (Paraíso do Tocantins), a **Catedral**
(Cristalândia) e **N. Sra. do Carmo** de **Pium** e de **Divinópolis**. As outras 13 entram sem
nenhum horário.

Concentração: N. Sra. da Piedade (27 horários, 20 comunidades) e São José Operário (26 horários)
são as duas maiores grades.

## Os 28 horários `baixa` — recorrência mensal

Cerca de **30% da grade** é mensal, o padrão do sertão: "1º Sábado do Mês", "3ª Sexta-feira do
Mês", "3ª Quinta-feira do Mês". Cada registro traz a **regra literal publicada** em `notes`.
As comunidades rurais de N. Sra. da Piedade, Santíssima Trindade e São José Operário são
atendidas quase todas nesse esquema.

## Pontos para o enxame de validação

1. **Contradição dentro da página de horários — Santíssima Trindade (Porangatu)**: a
   *Comunidade Nossa Senhora Aparecida (Rural)* aparece **duas vezes no 2º sábado do mês**, às
   **17h** e às **19h30**. Gravei as duas como `baixa`, com a contradição anotada.
2. **Paróquia fantasma na página de horários**: uma missa de domingo às 07h30 é atribuída a uma
   *"Paróquia N. Sra. Aparecida (Divinópolis-TO)"*, que **não existe** na lista de paróquias.
   Atribuí à *Paróquia Nossa Senhora do Carmo* de Divinópolis — que tem a mesma **Comunidade
   Nossa Senhora Aparecida** às 09h — e marquei `media`.
3. **Rótulo "V. Matriz"** em N. Sra. da Piedade (missa de domingo às 18h): a fonte escreve
   "Com. N. Sra. da Piedade (V. Matriz)" sem explicar o "V.". Tratei como a matriz, `media`.
4. **E-mail truncado — Santíssima Trindade (Porangatu)**: publicado como
   `parsantissimatrindade@gmail`, **sem o domínio**. Não gravei.
5. **Telefone fixo repetido**: `(62) 3362-3530` aparece em **Santíssima Trindade** e em
   **Santo Antônio de Pádua**, ambas em Porangatu.
6. **Sem telefone** (2): N. Sra. da Abadia (Bonópolis-GO) e Santo Antônio de Pádua (Dueré-TO) —
   nesta última o site publica o rótulo "Fone: Secretaria da Paróquia –" com o valor vazio.
7. **Bonópolis-GO**: outras fontes a registram como **Quase-Paróquia** N. Sra. da Abadia; o site
   da diocese a publica como Paróquia. Gravei como Paróquia, com a divergência em `notes`.
8. **Duas paróquias homônimas** — N. Sra. da Abadia em **Bonópolis-GO** e em **Lagoa da
   Confusão-TO**; N. Sra. do Carmo em **Pium** e em **Divinópolis**; N. Sra. Aparecida em
   **Sandolândia** e em **Nova Rosalândia**; Santo Antônio de Pádua em **Porangatu-GO** e em
   **Dueré-TO**. Todas desambiguadas pelo slug com a cidade.
9. **Comunidades quase homônimas dentro da mesma paróquia**, mantidas separadas como a fonte
   publica (podem ser a mesma): em N. Sra. da Piedade, *Santa Luzia* × *Santa Luzia (Rural)* e
   *N. Sra. Aparecida* × *N. Sra. Aparecida (Rural)*; em São José Operário, *Capela Divino Pai
   Eterno (Rural)* × *Comunidade Divino Pai Eterno (Rural)* × *Comunidade Divino Pai Eterno*.
10. **13 das 20 paróquias sem nenhum horário**: Formoso do Araguaia, Araguaçu, Sandolândia,
    Dueré, Lagoa da Confusão, Nova Rosalândia, Marianópolis, Caseara (TO) e São Miguel do
    Araguaia, Novo Planalto, Bonópolis, Mutunópolis, Santo Antônio de Pádua/Porangatu (GO).
11. **Sem comunidades** nessas mesmas 13 — o arquivo não tem `communities` para elas; o
    importador cria a igreja-matriz sozinho.
