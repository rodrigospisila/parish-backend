# Relatório — Diocese de Caicó (`caico`, RN)

Pesquisa em 11/09/2026. **É a circunscrição mais bem documentada das oito desta rodada.**

## Fontes

| Fonte | Papel |
|---|---|
| **Anuário 2026 da Diocese (PDF, 142 páginas)** — `https://diocesecaico.com/wp-content/uploads/2026/09/MIOLO-ANUARIO-2026.pdf`, seção "Foranias e Paróquias" (pp. 48–69) | **Fonte principal.** Por paróquia: data do ato de criação, endereço completo com CEP, telefone, e-mail, pároco, vigários, diáconos **e a relação nominal de todas as igrejas e capelas**, cada uma com o bairro/sítio. |
| **https://diocesecaico.com/horario-das-missas** | **Grade oficial de missas**, organizada por dia da semana e, dentro de cada dia, por paróquia — dizendo em que igreja/capela é cada celebração. |
| catholic-hierarchy.org | Bispo, endereço e telefone da Cúria. |

**Truque que vale repetir:** o link do Anuário estava solto no rodapé da home
(`/wp-content/uploads/2026/09/...pdf`). Procurar `uploads/*.pdf` na home de uma diocese custa uma
requisição e pode resolver a circunscrição inteira. O domínio `diocesedecaico.com.br` (o que o
catholic-hierarchy registra) **não responde**; o site vivo é `diocesecaico.com`.

## Cobertura

| Métrica | Valor |
|---|---|
| Entradas | **32** — 30 paróquias + 2 áreas pastorais autônomas |
| Municípios | 24 |
| Confiança das paróquias | **32 alta** |
| Com endereço + CEP | 32 |
| Com telefone | 30 |
| Com e-mail | 30 |
| Com pároco/administrador | 31 |
| Com data de criação | 32 (de 1748 a 2023) |
| **Comunidades/capelas** | **300** |
| **Horários fixos** | **299** — **252 `alta`**, 47 `baixa` |
| Sem nenhum horário | 2 (Santa Marta de Betânia/Caicó e a Área Pastoral de Bodó) |

A Diocese se descreve com "30 paróquias e 1 área pastoral autônoma"; o Anuário 2026 traz **duas**
áreas pastorais autônomas (N. Sra. do Perpétuo Socorro/Ipueira, 2015, e São Pedro e Santa
Luzia/Bodó, 2023) — a segunda é recente.

Foranias: Caicó (7), Vale do Piranhas (7), Currais Novos (9), Jardim do Seridó (9).

## Regra de confiança dos horários

- **alta** — horário semanal fixo publicado na página oficial "Horário das Missas" (site ativo,
  Anuário 2026 do mesmo mês da coleta). 252 registros.
- **baixa** — recorrência **mensal** ("1º SÁBADO", "2º DOMINGO de cada mês", "todo dia 13"), que não
  cabe no `MassSchedule`. 47 registros, com o texto original preservado em `notes`.

A página nomeia a igreja de cada celebração; cada horário aponta para a **comunidade certa**
(`community`), e não para a matriz. Quando a igreja citada na grade não constava da lista do
Anuário, ela foi **acrescentada como comunidade** (fonte: a própria página de horários).

## Conflito de jurisdição resolvido

A **Área Pastoral de São Pedro e Santa Luzia, em Bodó**, aparece nas duas circunscrições: a
Arquidiocese de Natal a lista no Vicariato Norte 1 com a observação "aos cuidados da Diocese de
Caicó", e o Anuário de Caicó a registra como área pastoral autônoma própria, com endereço, telefone,
e-mail e data de criação (04/02/2023).

**Decisão:** o registro completo fica em `RN/caico.json`; a entrada correspondente em
`RN/natal.json` (`area-pastoral-sao-pedro-e-santa-luzia-bodo`) foi marcada com
`status: "duplicada"` e uma nota explicando. **Confirmar com a Cúria de qual circunscrição é o
território** — as duas fontes são oficiais e se contradizem.

## Precisa de validação humana

1. **Jurisdição de Bodó** (acima).
2. **Três paróquias de São Francisco de Assis na Forania de Currais Novos** (Lagoa Nova 2002,
   Tenente Laurentino Cruz 2014, Currais Novos/Parque Dourado 2015) — os slugs foram desambiguados
   pela cidade. Na página de horários elas aparecem como "SÃO FRANCISCO DE ASSIS – LAGOA NOVA",
   "SÃO FRNACISCO DE ASSIS – TENENTE LAURENTINO" (com erro de digitação) e "SÃO FRANCISCO –
   CURRAIS NOVOS"; o mapeamento foi feito à mão.
3. **`Paróquia Nossa Senhora do Patrocínio` (São Fernando) sem pároco** — o Anuário não informa.
4. **Nome do pároco de São Francisco de Assis/Caicó** ficou truncado no PDF como
   "Pe. Ronneyvingli Edley" (o nome completo é "Pe. Ronneyvingli Edley Galvão Bezerra" — a quebra de
   linha do PDF cortou).
5. **Duas capelas com o mesmo nome na mesma paróquia** (p.ex. duas "Capela de São Francisco de
   Assis" em Acari, duas "Capela de Nossa Senhora da Conceição" em Currais Novos/Sant'Ana) — são
   reais (bairros diferentes, registrados em `neighborhood`), mas o importador precisa tolerar
   nomes repetidos dentro da mesma paróquia.
6. **Missas "nas comunidades rurais" sem igreja nomeada** ("16h – Missa nas comunidades rurais",
   "19h – Missa na Matriz ou Comunidades Rurais", "Missas nas Casas – Rodízio") foram gravadas na
   Matriz com o texto original em `notes`. São Vicente Férrer e Tenente Laurentino Cruz são os
   casos mais afetados.
7. **Missas amarradas a dia do mês** ("Todo dia 20", "Todo dia 13") foram **descartadas** — não há
   como representá-las no `MassSchedule`.
