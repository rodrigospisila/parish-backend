# Relatório de pesquisa — Diocese de São José dos Campos (SP)

- **Arquivo gerado:** `paroquias/SP/sao-jose-dos-campos.json`
- **Data da pesquisa:** 2026-09-10
- **Agente:** enxame de pesquisa do território (`PROMPT-pesquisa.md`)

## Resumo

| Métrica | Valor |
|---|---|
| Paróquias | **45** (45 alta / 0 media / 0 baixa) |
| Comunidades / capelas | **186** (todas alta), em 34 das 45 paróquias |
| Horários fixos | **725** (618 alta / 0 media / 107 baixa) — 587 MASS, 125 CONFESSION, 12 ADORATION, 1 ROSARY |
| Cobertura | **45 / 45 (100 %)** |

Municípios cobertos: São José dos Campos (31), Jacareí (10), Monteiro Lobato, Igaratá,
Paraibuna e Santa Branca (1 cada) — exatamente os seis municípios que a diocese declara
na sua página de história.

## Fontes principais

Tudo veio do **site oficial da diocese** (`https://diocese-sjc.org.br`):

| Fonte | Uso |
|---|---|
| `https://diocese-sjc.org.br/locais/paroquias` | lista canônica (46 entradas, 45 paróquias) |
| `…/local/<slug>/` (46 páginas) | endereço, CEP, telefone, e-mail, site, pároco, região pastoral, comunidades **com endereço** e as abas "Missas", "Atendimento" e "História" |
| `https://diocese-sjc.org.br/contato/` | Cúria Diocesana: Av. São João, 2650 — Jardim das Colinas — 12242-000 |
| `https://diocese-sjc.org.br/biografia/` | Dom José Valmor Cesar Teixeira, SDB — 4º bispo, posse canônica em 17/05/2014 |
| `https://diocese-sjc.org.br/historia/` | diocese instalada em 01/05/1981 com 6 municípios, 21 paróquias e 125 capelas |
| `https://www.catholic-hierarchy.org/diocese/dsajc.html` | conferência: 45 paróquias e 1 missão |

É a **melhor fonte das três circunscrições desta rodada**: cada página traz o bloco de missas
separado por comunidade, com o endereço da capela, além de um bloco de confissões — daí os
125 registros `CONFESSION`, número raro no dataset.

## Cobertura

A listagem oficial traz **46 entradas**; o catholic-hierarchy.org registra **45 paróquias e
1 missão**. A diferença é exatamente a entrada excluída:

**Excluída de propósito:** a **Capelania Militar Nossa Senhora de Loreto**
(Pça. Marechal do Ar Eduardo Gomes, 50, São José dos Campos). A própria página diocesana diz
literalmente *"(pertence à Arquidiocese Militar do Brasil)"* — jurisdição distinta, não entra
como paróquia da diocese. (Mesmo tratamento dado pelo agente de Aparecida à capelania da
Aeronáutica em Guaratinguetá.)

## Pontos para o enxame de validação

### 1. Missas de recorrência mensal — 107 registros `baixa` (maior bloco)

É de longe a maior lacuna desta diocese, e é um problema de **modelagem**, não de coleta: a
região tem muita comunidade rural/periférica atendida uma vez por mês, e `MassSchedule` só
modela dia da semana. Todos ficaram `baixa` com o texto original no `notes`.

| Paróquia | `baixa` / total | Situação |
|---|---|---|
| São Francisco Xavier (SJC) | **13 / 20** | 12 comunidades rurais, **todas** com missa mensal (1ª a 5ª quarta / 2º a 4º sábado / 1º a 5º domingo). Só a Igreja São Sebastião e a matriz têm grade semanal |
| São João Batista (Jacareí) | 11 / 29 | 5 capelas com missa **e confissão** na "Nª terça-feira do mês" |
| Nossa Senhora de Fátima (Altos de Santana, SJC) | 10 / 19 | 6 das 8 comunidades só têm missa mensal |
| Nossa Senhora do Bonsucesso (Monteiro Lobato) | 10 / 16 | **10 capelas rurais**, todas mensais |
| São Silvestre (Jacareí) | 6 / 14 | 6 das 7 capelas |

**Quando a mesma comunidade aparecia em duas linhas mensais que caem no mesmo slot semanal**
(p. ex. Capela São Sebastião "1º Sábado 19h30" **e** "3º Sábado 19h30"), os dois registros
foram **fundidos em um só**, com as duas frases originais preservadas no `notes`. Isso evita
duplicata no banco, mas o registro final não diz "duas vezes por mês" — é preciso ler o `notes`.

### 2. Horários que a fonte publica sem dia da semana — 6 descartados

Missas votivas por **dia do mês**, impossíveis de representar:

| Paróquia | Texto na fonte |
|---|---|
| Nossa Senhora de Fátima (Altos de Santana) | "Todo Dia 13 – Devocional à N. Sra. de Fátima: 19h30" |
| Imaculada Conceição (Eugênio de Melo) | "Missa Votiva (Todo dia 8 de cada mês) — 19h Terço, 19h30 Santa Missa" |
| Nossa Senhora do Perpétuo Socorro (SJC) | "Todo dia 27 de cada mês: 19h30" |
| Santa Rita de Cássia (SJC) | "Missas Votivas de Santa Rita – Todo dia 22 — 19h/19h30" |
| Santa Teresa do Menino Jesus (SJC) | "Todo dia 1º do mês às 07h00, 15h00 e 19h30" |
| Santuário São Judas Tadeu (SJC) | "Todo dia 28 de cada mês: Missa 7h, 15h e 19h; Confissão 15h" |
| Nossa Senhora de Guadalupe (Jacareí) | "Todo dia 12: Terço às 18h30 e Missa votiva às 19h30" |

São justamente as **missas devocionais dos padroeiros**, que costumam ser as mais procuradas.
Se o Parish for exibi-las, precisa da modelagem mensal já registrada no README.

### 3. Onze paróquias sem comunidades listadas

A fonte não publica lista de capelas para: Espírito Santo, Nossa Senhora de Lourdes,
Nossa Senhora do Rosário, São Benedito (Alto da Ponte), São Benedito (Res. Galo Branco),
São José Operário (Vila Paiva), Santo Agostinho (todas em SJC), Imaculada Conceição e
Maria Auxiliadora dos Cristãos (Jacareí), Nossa Senhora do Patrocínio (Igaratá) e
Santo Antônio (Paraibuna). Ficaram com `communities: []`.

Em quatro delas a fonte **menciona** comunidades sem nomeá-las, e esses horários ficaram em
`community: "Matriz"` com aviso no `notes` (não são celebrados na matriz):

- **Espírito Santo (SJC):** "Quarta-feira: 19h30 (Nas Comunidades)";
- **Nossa Senhora do Rosário (SJC):** "Sexta-feira: 8h (Horto São Dimas)" — é no **cemitério**
  Horto São Dimas — e "19h30 (Comunidades)";
- **São Benedito – Res. Galo Branco (SJC):** "Quarta: nos setores do Galo Branco" e
  "Sexta: nos setores do Righi (1ª sexta do mês na Matriz)";
- **Imaculada Conceição (Eugênio de Melo):** "Terça: 19h30" em **condomínios**.

### 4. `foundedYear` em só 10 das 45

O site publica a aba "História" em poucas paróquias, e nem sempre com o ano de criação.
Preenchidos: Catedral São Dimas (1951), N. S. de Fátima/Altos de Santana (2005), Coração de
Jesus (1985), Coração Eucarístico de Jesus (1990), N. S. de Lourdes (1976), Sant'Ana (1935),
São Francisco de Assis/Jacareí (1995), São João Batista/Jacareí (1968), Sagrada Família (1968)
e São João Bosco/SJC (1992). As outras 35 ficaram `null` — nunca inventadas.

### 5. Dados de contato faltando

- **Sem CEP (2):** Santa Teresa do Menino Jesus (SJC) — a fonte publica só "Praça Terezinha
  César da Silva, 145 – Vila Nair" — e São José, Esposo de Maria (SJC).
- **Sem e-mail (1):** Nossa Senhora de Fátima – Jd. Oriente (SJC) publica só um Linktree.
- **`email` da diocese ficou `null`:** a página de contato só divulga o endereço da
  Assessoria de Comunicação (`redacao@diocesesjc.org.br`), que não é o e-mail da Cúria.

### 6. Duas paróquias homônimas em São José dos Campos

Há **duas** "Paróquia Nossa Senhora de Fátima" no mesmo município. A regra de slug do README
(`<nome>-<cidade>`) colidiria, então foram desambiguadas pelo bairro, seguindo o nome que a
própria diocese usa na listagem:

| Nome | Bairro | slug |
|---|---|---|
| Paróquia Nossa Senhora de Fátima | Altos de Santana | `nossa-senhora-de-fatima-altos-de-santana-sao-jose-dos-campos` |
| Paróquia Nossa Senhora de Fátima – Jd. Oriente | Residencial Sol Nascente | `nossa-senhora-de-fatima-jd-oriente-sao-jose-dos-campos` |

Mesmo tratamento (sem colisão, mas com sufixo oficial mantido no nome) para as duas
**São Benedito** de SJC — "Alto da Ponte" e "Residencial Galo Branco".
Já as duas **Imaculada Conceição** (Eugênio de Melo / Jacareí) e as duas **São José Operário**
(Vila Paiva / Jacareí) estão em cidades diferentes e não colidem; o sufixo de bairro foi
retirado do nome apenas quando ele repetia a cidade.

### 7. Detalhes menores

- **Paróquia Nossa Senhora da Santíssima Trindade (Jacareí):** a matriz é **Nossa Senhora do
  Bom Sucesso** e a maior parte das missas dominicais é no **Santuário Nossa Senhora do Carmo**,
  não na matriz. Não é erro de coleta — foi transcrito como a fonte publica.
- **Paróquia Nossa Senhora do Bonsucesso (Monteiro Lobato):** duas capelas são explicitamente
  **particulares** (Santa Luzia e Santo Expedito, região Ponte Nova) e se alternam no
  "3º Domingo". Ambas gravadas com o aviso no `notes`.
- **Nossa Senhora de Guadalupe (Jacareí):** publica "9h – Missa no **Rito Extraordinário
  Tridentino** – Capela São Francisco" no domingo; foi gravada como MASS normal, sem marcação
  de rito (o schema não tem esse campo).
- **Sagrada Família (SJC):** "1º Sábado: 13h (Missa em **Latim**)" — mesmo caso.
- As janelas de confissão ("das 9h às 11h") viraram **um** registro no horário de início,
  com o intervalo completo preservado no `notes`. Como muitas paróquias publicam duas janelas
  no mesmo dia (manhã e tarde), elas foram gravadas como dois registros distintos.
- **Paróquia Coração de Jesus (SJC):** tem uma **Capela de Adoração Permanente** citada no
  expediente da secretaria, mas sem horário próprio publicado — não virou registro.
