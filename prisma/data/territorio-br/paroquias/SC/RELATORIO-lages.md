# Relatório — Diocese de Lages (SC)

Pesquisa de 2026-09-10; relatório escrito a partir do JSON já gravado (o agente de pesquisa foi
interrompido antes de redigi-lo). Arquivo de dados: `lages.json`. Todas as estatísticas abaixo foram
computadas do próprio JSON.

## Resumo

| Item | Quantidade |
|---|---|
| Paróquias | **26** (26 alta / 0 media / 0 baixa) |
| Comunidades/capelas | **2** (todas alta) — só **1** paróquia tem lista nominal |
| Horários fixos | **88** (73 alta / 2 media / 13 baixa) |
| Cobertura | 26 / 26 esperadas (site diocesano e catholic-hierarchy 2024) — **100 %** |
| Cidades cobertas | 18 municípios |

> **Causa raiz das lacunas:** o site diocesano **não tem páginas individuais de paróquia** — os botões
> "Clique aqui" da listagem não têm link. Sobrou a página de horários (rica) e a de presbíteros; tudo o
> mais (endereço, telefone, comunidades) teve de vir de agregador ou ficou nulo.

## Fontes principais

22 URLs distintas, todas acessadas em **2026-09-10**.

1. **Site oficial `diocesedelages.org.br` — 5 URLs (só páginas de seção):**
   - `https://diocesedelages.org.br/paroquias/` — as 26 unidades (25 paróquias + Catedral).
   - `https://diocesedelages.org.br/horarios-de-missa/` — **a fonte de 75 dos 88 horários** (73 `alta` + 2 `media`).
   - `https://diocesedelages.org.br/presbiteros/` — 25 dos 26 `priestName`.
   - `https://diocesedelages.org.br/contato/` — Cúria: Rua Correia Pinto, 247, Caixa Postal 20, 88502-970; (49) 3222-1520; curiadelages@hotmail.com.
   - `https://diocesedelages.org.br/bispo-diocesano/` — Dom Gilson Meurer.
2. **`www.horariodemissa.com.br` — 14 URLs** (`igreja.php?k=…`), usadas para **endereço e telefone de
   13 paróquias** e para 13 horários `baixa` da Catedral. **13 das 14 fichas não informam data de
   atualização**; a única datada é a da Catedral: **05/05/2014**.
3. `https://www.catholic-hierarchy.org/diocese/dlage.html` — 26 paróquias (2024); ereção 17/01/1927;
   Dom Gilson Meurer nomeado 05/11/2025.
4. `https://www.gcatholic.org/churches/local/lage0` — 25 igrejas (inclui o Santuário N. Sra. Aparecida
   de Bom Retiro e **omite** N. Sra. Aparecida de Curitibanos).
5. `https://pt.wikipedia.org/wiki/Diocese_de_Lages` — sufragânea de Chapecó; padroeira N. Sra. dos Prazeres.

## Cobertura

`coverage`: `parishesFound` 26, `parishesExpected` 26.

### Preenchimento por campo (de 26 paróquias)

| Campo | Preenchido | Nulo |
|---|---|---|
| `priestName` | 25 (96 %) | 1 |
| `address` | 14 (54 %) | 12 |
| `phone` | 14 (54 %) | 12 |
| `neighborhood` | 14 (54 %) | 12 |
| `zipCode` | **1 (4 %)** | **25** |
| `email` | **0** | **26** |
| `website` | **0** | **26** |
| `foundedYear` | **0** | **26** |

Confiança: 26 `alta`, 0 `media`, 0 `baixa` — nenhuma paróquia fica fora da carga.

## Comunidades

- **2 comunidades** no dataset inteiro, ambas `alta`, ambas da **Paróquia Nossa Senhora do Perpétuo
  Socorro (Bom Jardim da Serra)**: "Matriz Nossa Senhora do Perpétuo Socorro" (`isMatriz: true`) e
  "Capela Divino Espírito Santo (Cohab)".
- **25 das 26 paróquias ficaram sem lista nominal** (`communities: []`) — o importador criará apenas a
  igreja-matriz de cada uma. É a maior lacuna das três dioceses de SC desta rodada.
- Nenhuma comunidade homônima, nenhum nome suspeito, nenhuma paróquia com mais de uma matriz.

## Horários

- **88 horários**:

| Tipo | Total | alta | media | baixa |
|---|---|---|---|---|
| MASS | 83 | 73 | 2 | 8 |
| CONFESSION | 5 | 0 | 0 | 5 |
| ADORATION | 0 | — | — | — |
| ROSARY | 0 | — | — | — |
| **Total** | **88** | **73** | **2** | **13** |

- Origem: 75 do site diocesano (73 `alta` + 2 `media`), 13 do horariodemissa (todos `baixa`, e **todos
  da Catedral**).
- Por dia da semana: domingo 34, quarta 20, sábado 14, terça 6, sexta 6, quinta 5, segunda 3.
- Faixa: 08:00 às 19:40. Nenhum `time`/`dayOfWeek` malformado, nenhum duplicado, nenhum sem `sources`,
  nenhum `community` órfão.
- **3 paróquias sem nenhum horário:** N. Sra. da Boa Viagem (Bocaina do Sul), Imaculada Conceição
  (Capão Alto), N. Sra. Aparecida (Curitibanos).
- **`notes`: 11 horários** — e **0 com recorrência mensal/quinzenal**. As 6 notas distintas são:
  "Missa e novena em honra a Nossa Senhora do Perpétuo Socorro", "Novena de Nossa Senhora do Perpétuo
  Socorro", "Novena das Famílias (a página diocesana lista o horário entre as missas)", "Novena de
  Nossa Senhora Desatadora dos Nós (a página diocesana lista o horário entre as missas)" e duas
  variantes de "das 8h às 11h e das 14h às 17h" (confissões da Catedral).
- Distribuição por local: **84 dos 88 horários usam o literal `"Matriz"`** — consequência direta de
  não haver comunidades listadas. Correto pelo README, mas significa que nenhuma capela terá horário
  próprio no app.

## Pontos para o enxame de validação

1. **`foundedYear`, `email` e `website` nulos em 100 % das paróquias; `zipCode` só na Catedral**
   (88502-030). Não é falha do agente: o site diocesano não publica páginas de paróquia. Preencher
   exige fontes por paróquia (redes sociais, Anuário Católico) ou contato com a Cúria.
2. **A Catedral entra em produção sem missa de domingo.** Seus 18 horários se dividem em 5 `alta` da
   página diocesana — apenas **terça (12:10 e 19:00) e quarta (12:10, 16:00, 19:00)** — e 13 `baixa`
   do horariodemissa (**atualização 05/05/2014**), que são justamente as missas de domingo (08:00,
   10:00, 19:00), segunda, sexta e sábado, mais as 5 confissões. Com a regra `alta`+`media`, tudo o
   que é fim de semana some. **Prioridade nº 1.**
3. **Paróquia Sagrada Família (Lages)** tem 1 único horário (sábado) e também entra sem missa de
   domingo.
4. **As 5 CONFESSION são todas da Catedral e todas `baixa`** — com a regra de carga, a diocese entra
   com **zero confissões**, zero adoração e zero terço.
5. **13 paróquias com endereço e telefone vindos de agregador sem data de atualização**
   (`horariodemissa.com.br`): N. Sra. do Perpétuo Socorro (Bom Retiro), N. Sra. dos Campos (Correia
   Pinto), Imaculada Conceição (Curitibanos), N. Sra. Aparecida, N. Sra. da Saúde, N. Sra. das Graças,
   N. Sra. do Rosário, Sagrada Família, São Cristóvão e São Judas Tadeu (todas em Lages), Santa
   Catarina (Otacílio Costa), São Joaquim (São Joaquim), N. Sra. Mãe dos Homens (Urubici).
   São dados de contato de idade desconhecida — validar antes de exibir no app.
6. **3 paróquias sem nenhum horário** (item repetido aqui para o checklist): N. Sra. da Boa Viagem
   (Bocaina do Sul), Imaculada Conceição (Capão Alto), N. Sra. Aparecida (Curitibanos). Note que
   Curitibanos tem duas paróquias e só a Imaculada Conceição recebeu horários (9).
7. **`priestName` nulo** em Nossa Senhora da Saúde (Lages) — a paróquia aparece na listagem, mas o
   pároco não foi casado com a página de presbíteros.
8. **Novenas gravadas como `MASS`:** "Novena das Famílias" e "Novena de Nossa Senhora Desatadora dos
   Nós" foram registradas com `type: MASS` porque a página diocesana as lista entre as missas. Decidir
   se viram outro tipo ou se o `notes` basta.
9. **Horários de minuto incomum:** 12:05 (N. Sra. do Rosário, quarta) e 19:40 (o mais tardio do
   arquivo). Plausíveis para missas de meio-dia/à noite, mas convém reconferir na fonte.
10. **Divergência entre fontes secundárias, já registrada na nota de cobertura:** gcatholic lista o
    Santuário N. Sra. Aparecida de Bom Retiro e omite N. Sra. Aparecida de Curitibanos; o JSON segue o
    site diocesano (26 unidades). Se o Santuário de Bom Retiro existir como unidade própria, a diocese
    teria 27.
11. **Bispo:** catholic-hierarchy registra a nomeação de **Dom Gilson Meurer em 05/11/2025** —
    confirmar a data de posse (o campo `bishopName` está preenchido, sem data no schema).
12. **Homônimos entre paróquias — sem conflito, mas confirmar as cidades:** duas "Nossa Senhora do
    Perpétuo Socorro" (Bom Jardim da Serra e Bom Retiro), duas "São Cristóvão" (Lages e São Cristóvão
    do Sul), duas "Imaculada Conceição" (Capão Alto e Curitibanos). Os slugs são distintos e não há
    duas paróquias de mesmo nome na mesma cidade.
13. **3 endereços sem número** (`s/n`): Imaculada Conceição (Curitibanos), N. Sra. Aparecida (Lages),
    Santa Catarina (Otacílio Costa). Um endereço é uma rodovia: "Rodovia BR-116, km 247".
14. Nenhum problema de forma detectado em: prefixos de nome (25 "Paróquia" + 1 "Catedral"), slugs
    (kebab-case ASCII, sem duplicatas), `state` (26 × "SC"), telefones (14, todos DDD 49 e no padrão
    `(NN) NNNN-NNNN`), párocos (25, todos com prefixo "Pe.", sem repetição entre paróquias).
    "Paróquia São Joaquim / São Joaquim" repete a cidade no nome, mas é o padroeiro real do município.
