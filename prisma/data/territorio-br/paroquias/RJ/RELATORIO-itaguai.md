# Relatório — Diocese de Itaguaí (RJ)

Pesquisa em 2026-09-11. Arquivo: `itaguai.json`.

## Resumo

| | |
|---|---|
| Paróquias encontradas | **20** (todas `alta`) |
| Paróquias esperadas | 21 (catholic-hierarchy.org, dados de 2023) |
| Comunidades/capelas | **196** (192 `alta`, 4 `media`) |
| Horários fixos | **73** (todos `media`) — 72 missas + 1 adoração, cobrindo **15 das 20 paróquias** |
| Cobertura de paróquias | **95 %** |

Municípios: Angra dos Reis (8), Itaguaí (4), Mangaratiba (4), Seropédica (3), Paraty (1).
Setores confirmados: Itaguaí, Seropédica, Angra 1, Angra 2 e Paraty; regionais **PAR** e **SIM**
(campo extra `setor`).

## O site oficial está fora do ar — tudo veio do Arquivo da Internet

`dioceseitaguai.org.br` devolve **HTTP 500 em toda URL** (raiz, `/paroquias/`, `/wp-json/`, sitemaps) em
11/09/2026 — é um WordPress quebrado, não um domínio perdido: o certificado e o DNS estão ativos, atrás da
Cloudflare. O Fortinet da rede local também bloqueia o domínio; contornei com DNS-over-HTTPS
(`dns.google/resolve`) + `curl --resolve`, e mesmo assim o servidor responde 500.

O Arquivo da Internet salvou a diocese inteira, e com capturas **recentes**:

| Página arquivada | Última captura usada | O que deu |
|---|---|---|
| `/paroquias/` | 2026 | índice com endereço e link de cada ficha |
| `/paroquia/<slug>/` (19 fichas) | 2025-06 a 2026-05 | ano de criação, telefone, e-mail, endereço, CEP, comunidades, pároco |
| `/comunidades-da-*/` (19 posts) | 2021 a 2026-05 | **as listas nominais de comunidades**, com a matriz numerada em 1º |
| `/horarios-das-missas/` | **2026-03-14** | a grade semanal inteira da diocese, por dia da semana |
| `paroquia-sitemap1.xml` | 2025-05-01 | a lista canônica de 19 fichas de paróquia |

**O sitemap XML do tipo de post `paroquia` foi o achado que fechou a lista** — vale repetir a jogada em
qualquer diocese cujo portal caia: `web.archive.org/web/<ts>id_/<dominio>/<tipo>-sitemap1.xml`.

### Armadilhas desta diocese

1. **Slug mentiroso**: `/paroquia/paroquia-nossa-senhora-das-gracas-ecologia/` abre a paróquia de
   **Muriqui (Mangaratiba)**, não a de Ecologia (Seropédica). São **duas** paróquias N. Sra. das Graças,
   e as duas têm post de comunidades próprio (`…-das-gracas` = Muriqui, `…-das-gracas-2` = Ecologia).
   A de Ecologia **nunca teve ficha capturada** — nome, endereço e comunidades vieram do post de
   comunidades e da página de horários.
2. Outro slug trocado: `/paroquia/paroquia-nossa-senhora-da-imaculada-conceicao-centro/` é a
   **Paróquia Nossa Senhora da Conceição** (matriz de Angra dos Reis); e
   `/paroquia/paroquia-nossa-senhroa-aparecida-balneario/` tem "senhroa" (typo) no slug.
3. **Três fichas nunca foram capturadas** (Santíssima Trindade/Jacuecanga, São Francisco de Assis/Brisamar e
   São Paulo Apóstolo/Califórnia) — reconstruídas pelo post de comunidades + página de horários, por isso
   ficam sem CEP e, em dois casos, sem endereço completo.
4. **Capturas com desafio de bot**: as capturas de 2024 de alguns posts de comunidades vieram como
   "Please wait while your request is being verified…". A solução foi descer na lista do CDX e pegar a
   captura de **2021**, que veio limpa (foi assim com N. Sra. da Conceição/Angra e São Sebastião/Ilha Grande).
5. A matriz da **Paróquia Cristo Rei (Japuíba)** chama-se "Matriz do Divino Espírito Santo – Nova Angra" —
   nome diferente do da paróquia; está correto, veio da fonte.

## Horários — por que todos ficaram `media`

Os 73 horários vêm da página oficial **"Horários das Missas"** da diocese, o que normalmente daria `alta`.
Mas comparei duas capturas distantes — **02/04/2025** e **14/03/2026** — e o texto é **idêntico**: 142 linhas
iguais, com uma única diferença (um e-mail que num dos casos veio ofuscado pelo Cloudflare). Ou seja, a página
ficou **um ano inteiro sem nenhuma alteração**. Isso é "fonte oficial sem sinal de atualidade" → `media`
pela escala do README. Ainda assim carrega, e é de longe o melhor conjunto de horários das quatro dioceses
desta rodada.

Não há captura de `/horarios-das-missas/` anterior a abril de 2025, então o conteúdo não é pré-pandemia.

Sem horário publicado (5 paróquias): Santa Teresinha do Menino Jesus (Piranema/Itaguaí), São Francisco de
Assis (Brisamar/Itaguaí), N. Sra. de Sant'Ana (Itacuruçá), N. Sra. da Conceição (Conceição de Jacareí) e
N. Sra. do Rosário (Camorim Grande).

**Omitida por regra**: a missa de "1ª segunda do mês" na Igreja Santa Luzia (Paróquia N. Sra. da Conceição,
Angra) — recorrência mensal não cabe em `MassSchedule`.

## Pontos para validação humana

1. **A 21ª paróquia**. catholic-hierarchy conta 21 em 2023; achei 20. Falta uma, e não sei qual.
   O melhor palpite está na própria página de horários: na terça-feira ela lista
   **"Paroquia São Francisco Xavier – Rua Xavier – Rio de Janeiro – 19h30"**, que não existe em nenhuma outra
   fonte, não bate com nenhum município da diocese e provavelmente é erro de digitação da Catedral São
   Francisco Xavier (Rua Coronel Freitas, Itaguaí). **Esse horário foi descartado.** Confirmar com a Cúria.
2. **Paróquia N. Sra. das Graças (Ecologia, Seropédica)** — sem ficha oficial capturada. Falta CEP, telefone,
   e-mail e pároco; o endereço diverge entre fontes ("Rua do Cruzeiro, 37" na página de horários,
   "Rua do Cruzeiro, 2, Km 47" no post de comunidades). Gravei o primeiro.
3. **Santíssima Trindade (Jacuecanga)** — o endereço "Rua Marquês de Tamandaré, 95" veio da linha de
   *segunda-feira* da página de horários, enquanto a linha de domingo só diz "Jacuecanga". Conferir.
4. **Listas de comunidades de 17/03/2015** — quase todos os posts `/comunidades-da-*/` têm essa data de
   publicação. Foram republicados/recapturados até 2026, mas o conteúdo pode ter 11 anos. As anotações da
   própria fonte ("não tem igreja", "igreja em construção", "igreja em restauração") foram preservadas em
   `notes` e são o sinal mais claro de que a lista precisa de revisão.
5. **N. Sra. do Rosário (Camorim Grande)** vs **Santíssima Trindade (Jacuecanga)** — as duas listam
   "Nossa Senhora Aparecida – Praia do Machado", "Camorim Pequeno" e "Lambicada" entre suas comunidades.
   A paróquia do Rosário foi criada em **2016**, depois dos posts de comunidades de 2015: provavelmente foi
   desmembrada da Santíssima Trindade e essas capelas migraram. **Há duplicidade a resolver.**
6. **Duas paróquias "Santa Teresinha do Menino Jesus"** (Piranema/Itaguaí e Boa Esperança/Seropédica) e
   **duas "N. Sra. das Graças"** (Muriqui/Mangaratiba e Ecologia/Seropédica) e **duas "São Sebastião"**
   (Frade e Ilha Grande, ambas em Angra) e **duas "N. Sra. da Conceição"** (Centro/Angra e Conceição de
   Jacareí/Mangaratiba). Todas reais; os slugs levam o bairro para desambiguar.
7. **Ano de criação 1646** (N. Sra. dos Remédios, Paraty) e **1795** (Catedral, Itaguaí) vêm do texto
   histórico da própria ficha, não de campo estruturado — plausíveis, mas confira antes de exibir.
8. **Telefone da Catedral**: a ficha diz (21) 2688-1200 e o rodapé da diocese diz (21) 2688-3292 (Cúria).
   Mantive o da ficha na paróquia e o da Cúria na diocese.
9. **Quando o site voltar**, refazer a coleta: as 3 fichas faltantes, a ficha da paróquia de Ecologia e a
   página de horários (para ver se ela finalmente mudou) devem resolver quase tudo desta lista.
