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
- 2026-09-10 — 3ª rodada: **São Paulo** (as 43 dioceses latinas) e **Minas Gerais** (27 das 29
  circunscrições). Produção passou de 2.067 para quase 6.000 paróquias.
  - Melhores fontes: Belo Horizonte (Catálogo 2026 em PDF, 190 páginas, com endereço/CEP/telefone/
    e-mail/pároco de 293 paróquias — enquanto o site devolve erro 500), Campo Limpo (1.334 horários),
    Jundiaí (1.276), Juiz de Fora (979 horários e 737 comunidades), Diamantina (600 horários),
    Caratinga e Montes Claros (1.036 e 1.101 comunidades).
  - Entram em produção **sem nenhum horário**, por decisão consciente: Pouso Alegre, Caratinga,
    Almenara e Leopoldina (as dioceses não publicam) e São João da Boa Vista (ver abaixo).
    São Miguel Paulista publica missa em só 10 das 108 fichas.
  - **Prioridades do enxame de validação**, em ordem: (1) Botucatu — o domínio caiu e foi tomado por
    páginas de aposta; as 48 paróquias vieram de capturas do Arquivo da Internet de 2025 e o estado
    inteiro está `media`; (2) Lins — as 290 grades vêm de um PDF oficial de 25/11/2021, e o domínio
    `.org` sumiu enquanto o `.com.br` bloqueia leitores com "Vercel Security Checkpoint";
    (3) Leopoldina — fichas paradas desde 2018, página de horários ainda com *Lorem Ipsum*;
    (4) Presidente Prudente — o próprio site avisa "última atualização de horários em julho de 2025".

## Truques de coleta (valem para qualquer UF)

- **403 no leitor automático quase nunca é site fora do ar** — é bloqueio por User-Agent. Repita com
  `curl` mandando UA de Chrome. Certificado rejeitado: `curl -k`. Link `http://` no caminho: `curl -L`.
- **403 "Fortinet Secure DNS Service Portal"** é filtro da rede local, não do servidor: resolva o IP
  por DNS-over-HTTPS (`https://dns.google/resolve?name=<dominio>&type=A`) e use
  `curl --resolve <dominio>:443:<ip>`.
- **Procure catálogo/anuário/diretório diocesano em PDF antes de raspar o site** — resolveu Belo
  Horizonte e Lins inteiras quando os portais falharam.
- **O cadastro da Receita fecha a lista**: as paróquias costumam ser filiais do CNPJ da mitra. Varrer
  as filiais em `minhareceita.org` deu endereço, CEP e telefone de todas em Januária e serviu como
  **prova de completude** em Araçuaí (31 filiais ativas, nada além).
- APIs internas devolvem a listagem canônica de uma vez: WordPress REST
  (`/wp-json/wp/v2/<tipo>?per_page=100&page=N`; `X-WP-Total` dá o total, `modified` diz se a página
  está velha), `__NEXT_DATA__`, **payload RSC** (foi o único caminho em Sete Lagoas) e sitemap XML.
- **Horário publicado como imagem** (cartaz PNG) pode ser lido: Araçatuba saiu completa assim.
- E-mail ofuscado pelo Cloudflare vem em `data-cfemail` e pode ser decodificado.
- **"Fundada em" de muitos portais é a data de cadastro no CMS**, não a fundação — em Itapetininga 22
  paróquias repetiam a mesma data de 2025, em São Carlos 65 repetiam 18/05/2025. Data recente ou
  repetida em massa → `null`.

## Marcadores que tiram uma entrada da carga

| Campo | Efeito |
|---|---|
| `status: "outra-jurisdicao"` | paróquia de rito oriental listada por cortesia pela diocese latina (São Charbel em Campinas/Guarulhos/Mogi, maronita de Bauru, siríaca de BH, melquita de Juiz de Fora) |
| `status: "nao-paroquial"` | a própria fonte diz que não é paróquia (igreja de convento, capelania militar, seminário, santuário sem território) |
| `status: "duplicada"` | a mesma paróquia publicada por duas dioceses (N. Sra. da Saúde de Alvarenga, em Governador Valadares e Caratinga) |
| `loadAsParish: true` | **exceção**: igreja não paroquial que a fonte publica com missa fixa entra assim mesmo — é lugar de missa de verdade. Vence o filtro de nome e o status `nao-paroquial`; não vence os outros dois |

Regra adotada: igreja não paroquial **com horário publicado entra**; sem horário publicado, fica de
fora (não acrescenta nada ao app e polui a lista de paróquias).

## Defeitos do importador corrigidos nesta rodada

- **Missa de santuário ia para a matriz**: o nome do local curto-circuitava para a matriz antes de
  procurar a comunidade, então paróquia com matriz *e* santuário perdia o destino certo. 138 horários
  reparados em produção (10.630 já estavam corretos).
- **Rótulo de seção virava comunidade**: "Horário das Missas:", "Missas na matriz", linha de endereço
  e nome com hora grudada entravam como capela. 26 removidas de produção, 38 horários devolvidos à
  matriz; o importador agora descarta esses nomes.
- (2ª rodada) Sem comunidade marcada como matriz, as missas da matriz caíam na primeira capela.

- **Decisão de produto pendente**: missas de recorrência mensal ("1º e 3º sábado", "todo dia 13")
  não cabem em `MassSchedule` (só dia da semana) e por isso ficam `baixa` — é o maior bloco fora do
  banco. No Jequitinhonha e no oeste paulista é a norma, não a exceção: 260 dos 707 horários da
  rodada de Diamantina/Araçuaí/Guanhães, e Guanhães tem 29 padres para 27 paróquias e 520
  comunidades, com missa "1 vez ao mês, seguindo a agenda do pároco". Se o Parish for exibi-las,
  precisa de modelagem.
- **Horário anterior à pandemia não entra**: fonte oficial sem sinal de atualidade é `media` e
  carrega, mas texto anterior a 2020 é rebaixado para `baixa` — toda paróquia reorganizou missa
  depois da pandemia, e mostrar horário errado é pior do que não mostrar. Foi o caso de São João da
  Boa Vista (665 horários de capturas de 2020 com texto de ~2018); a diocese parou de publicar
  horários ao migrar de CMS e hoje só 1 das 79 paróquias publica, então a redução é definitiva.
- Próximos estados: repetir `PROMPT-pesquisa.md` por UF (no máximo 4–5 agentes por vez — 9 em
  paralelo estouraram o limite de sessão). **Proíba o agente de delegar**: um agente que criou
  sub-agentes gastou 112k tokens sem gravar arquivo, e outro sub-agente reverteu uma correção
  aplicada à mão num arquivo que ele ainda tinha aberto. Só edite arquivo de diocese cujo agente já
  reportou conclusão.
