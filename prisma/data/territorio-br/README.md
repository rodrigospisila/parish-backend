# Território eclesiástico do Brasil — dioceses, paróquias, comunidades e horários fixos

Dataset pesquisado por enxame de agentes (Claude) a partir de fontes públicas, com
**proveniência e grau de confiança por registro**, para carga no Parish pelo
`prisma/import-territorio.ts` (idempotente, com `DRY_RUN=1`).

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| `dioceses.json` | Todas as circunscrições católicas do Brasil (arquidioceses, dioceses, prelazias, eparquias, exarcado, ordinariato) |
| `paroquias/<UF>/<slug-da-diocese>.json` | Paróquias, comunidades/capelas e horários fixos de uma circunscrição |
| `paroquias/<UF>/RELATORIO-<slug>.md` | Relatório do agente: fontes consultadas, cobertura, dúvidas |
| `PROMPT-pesquisa.md` | Prompt usado pelos agentes de pesquisa (reutilizar para novos estados) |
| `PROMPT-validacao.md` | Prompt do enxame de **validação** — só rodar sob ordem explícita do Rodrigo |

## Escala de confiança (`confidence`)

- **alta** — o dado está explícito em fonte oficial: site da diocese/arquidiocese, site ou
  rede social oficial da paróquia, CNBB, Anuário Católico. Para horários de missa, exige
  publicação oficial com sinal de atualidade (página ativa, post ≤ 12 meses).
- **media** — fonte secundária idônea (Wikipédia com referência, catholic-hierarchy.org,
  gcatholic.org, agregadores de horários como horariodemissa.com.br/missas.com.br, ficha do
  Google Maps) **corroborada** por uma segunda fonte, ou fonte oficial sem sinal de atualidade.
- **baixa** — uma única fonte não oficial, dado inferido ou contraditório entre fontes.

Regra de carga: `alta` e `media` entram no sistema; `baixa` fica só no dataset, aguardando o
enxame de validação. Nunca inventar: campo desconhecido = `null`.

## Formato de `paroquias/<UF>/<slug>.json`

```json
{
  "diocese": {
    "name": "Diocese de Ponta Grossa", "type": "Diocese", "slug": "ponta-grossa",
    "city": "Ponta Grossa", "state": "PR", "address": null, "zipCode": null,
    "phone": null, "email": null, "website": "https://...", "bishopName": null,
    "sources": [{ "url": "https://...", "title": "…", "accessedAt": "2026-09-09" }],
    "confidence": "alta"
  },
  "parishes": [
    {
      "slug": "nossa-senhora-do-rosario-ponta-grossa",
      "name": "Paróquia Nossa Senhora do Rosário",
      "city": "Ponta Grossa", "state": "PR", "neighborhood": null, "address": null,
      "zipCode": null, "phone": null, "email": null, "website": null,
      "priestName": null, "foundedYear": null,
      "sources": [{ "url": "…", "title": "…", "accessedAt": "2026-09-09" }],
      "confidence": "alta",
      "communities": [
        { "name": "Matriz Nossa Senhora do Rosário", "address": null, "neighborhood": null,
          "isMatriz": true, "sources": [], "confidence": "alta" }
      ],
      "schedules": [
        { "community": "Matriz Nossa Senhora do Rosário", "dayOfWeek": 0, "time": "19:00",
          "type": "MASS", "notes": null, "sources": [{ "url": "…" }], "confidence": "media" }
      ]
    }
  ],
  "coverage": { "parishesFound": 12, "parishesExpected": 12, "notes": "…" }
}
```

- `dayOfWeek`: 0 = domingo … 6 = sábado. `time`: `HH:MM` (24 h). `type`: `MASS`,
  `CONFESSION`, `ADORATION`, `ROSARY`.
- `community` do horário deve ser o `name` de uma comunidade listada na paróquia (ou
  `"Matriz"` para a igreja-matriz quando ela não está nomeada).
- Nome da paróquia sempre com o prefixo ("Paróquia …", "Catedral …", "Santuário …",
  "Reitoria …"); sem prefixo de cidade no nome — a cidade vai em `city`.

## Estado do dataset

- 2026-09-09/10 — 1ª rodada (enxame de 13 agentes de pesquisa):
  - `dioceses.json`: 281 circunscrições do Brasil (279 alta, 2 media), carregadas em produção em
    10/09/2026 (280 novas + Ponta Grossa pré-existente).
  - Paraná completo: 17 circunscrições pesquisadas (Ponta Grossa veio do seed antigo) — 853
    entradas de paróquia (inclui 6 capelas/igrejas não paroquiais e 2 de outra jurisdição, que não
    entram), 2.841 comunidades e 5.471 horários fixos no dataset. Carga em produção com
    `alta`/`media` (horários `baixa` = recorrência mensal, agregadores antigos ou divergências —
    aguardam validação).
  - Sem RELATORIO: Jacarezinho (agente interrompido após gravar o JSON completo).
  - Pontos para o enxame de validação estão no fim de cada `RELATORIO-*.md` (telefones malformados,
    e-mails ofuscados, sedes/CEP divergentes, paróquias de rito ucraniano listadas por dioceses
    latinas, missas mensais).
- 2026-09-10 — 2ª rodada: **Santa Catarina** (10 circunscrições) e **Rio Grande do Sul** (18),
  pesquisadas em ondas de 4–5 agentes. Produção fechou a região Sul com **281 dioceses, 2.067
  paróquias, 10.093 comunidades e 9.207 horários fixos**.
  - Melhores fontes: Porto Alegre (site + Guia Pastoral em PDF, 159/159 paróquias e 922 horários),
    Joinville (876 horários), Florianópolis (642 comunidades), Vacaria (Guia Diocesano em PDF com
    510 capelas).
  - Sites fora do ar recuperados pelo Arquivo da Internet: Bagé, Cachoeira do Sul, Santa Cruz do
    Sul, Santa Maria e Cruz Alta (estas duas com bloqueio a leitores automáticos).
  - Sem horário confiável em produção: Bagé, Cachoeira do Sul e Santo Ângelo (0), Chapecó (7).
  - Correção de dados aplicada: `dioceses.json` da Diocese de Cachoeira do Sul (o site registrado
    era a página de "site suspenso" da hospedagem; o correto é diocesenet.com.br).
- **Decisão de produto pendente**: missas de recorrência mensal ("1º e 3º sábado", "todo dia 13")
  não cabem em `MassSchedule` (só dia da semana) e por isso ficam `baixa` — é o maior bloco fora do
  banco (219 só em Osório). Se o Parish for exibi-las, precisa de modelagem.
- Próximos estados: repetir `PROMPT-pesquisa.md` por UF (no máximo 4–5 agentes por vez — 9 em
  paralelo estouraram o limite de sessão).
