# Relatório — Diocese de Dourados (MS)

Pesquisa em 2026-09-11. Arquivo: `dourados.json`.

## Resumo

| Item | Valor |
|---|---|
| Paróquias no arquivo | **38** |
| Registros totais | 40 (inclui 2 `nao-paroquial`) |
| Confiança das paróquias | 40 `alta` |
| Comunidades/capelas | **40** — só as matrizes (a diocese não publica capelas) |
| Horários fixos | **110** — 96 `alta`, 0 `media`, 14 `baixa` |
| Paróquias com horário | 18 de 38 |
| Cobertura | 38 encontradas × 30 esperadas (Wikipédia) — 17/17 municípios |

## Fontes principais

| Fonte | O que deu |
|---|---|
| `https://diocesededourados.org.br/paroquias/?paged=N` | listagem oficial paginada (5 páginas × 9), com nome, cidade e link de cada ficha |
| `https://diocesededourados.org.br/paroquia/<slug>/` | 40 fichas lidas: fundação, endereço completo com CEP, telefone, e-mail, padroeiro, clero com função, horário da secretaria e a grade de missas |
| `https://diocesededourados.org.br/horarios-de-missa/` (2 páginas) | grade agregada das 18 paróquias que publicam horário, com o selo **Semanal / Mensal** de cada linha |
| `https://pt.wikipedia.org/wiki/Diocese_de_Dourados` | nº esperado de paróquias (30), 17 municípios, 38.127 km², ~392 mil católicos, Dom Henrique Aparecido de Lima, C.Ss.R. |

### Truques que resolveram este site

- **A paginação não é `?page=`, é `?paged=`** — `?page=2` devolve a página 1 em silêncio. O JS
  (`institution-list.js`) monta na verdade `/paroquias/page/N/`; `?paged=N` dá o mesmo resultado e é mais
  simples de varrer. Sem isso só se enxergam 9 das 40 paróquias.
- **Os horários vêm em JSON dentro do HTML**: cada linha da tabela tem
  `data-item="{...&quot;recurrence&quot;:&quot;monthly&quot;,&quot;weekDays&quot;:[&quot;friday&quot;],&quot;schedules&quot;:[{&quot;hour&quot;:&quot;19:00&quot;}]...}"`.
  A própria diocese distingue `weekly` de `monthly` e traz a descrição literal ("1ª do mês", "Dia 12 de cada
  mês") — não foi preciso adivinhar recorrência.
- **E-mails ofuscados pelo Cloudflare** (`data-cfemail`), decodificados com o XOR do primeiro byte. Todos os
  39 e-mails de paróquia saíram assim.
- **A API interna `wp-json/wp-parresia-dashboard/register/institutions` existe mas exige login** (HTTP 401):
  devolveria a lista canônica de uma vez. O `paroquia`/`capela` **não** está exposto no `wp/v2` (404) nem no
  sitemap, então a raspagem da listagem paginada foi o único caminho.

## O que NÃO existe nesta diocese

1. **Nenhuma comunidade/capela publicada.** A página `/capelas/` existe mas contém apenas um registro de
   teste (`/capela/capela-01`). Todas as 40 entradas ficaram só com a matriz.
   **Isso é grave aqui**: a diocese tem forte presença indígena — as reservas de **Jaguapiru e Bororó**
   (~16 mil indígenas em Dourados) e aldeias em Amambai, Caarapó, Aral Moreira e Coronel Sapucaia — e três
   municípios de fronteira com o Paraguai (Ponta Porã, Antônio João, Coronel Sapucaia). É exatamente o
   perfil de comunidade atendida uma vez por mês, e nada disso aparece no cadastro oficial.
   A **Região Pastoral Missionária** (sede no distrito de Itahum/Vista Alegre, administrador Pe. Pedro Alves
   Mendes) é a estrutura que atende essas frentes, mas a ficha dela também não lista comunidades.
2. **20 das 38 paróquias não publicam nenhum horário** — a seção de missas da ficha está vazia no próprio
   CMS. Não é falha de coleta: a página agregada `/horarios-de-missa/` lista as mesmas 18 paróquias.

## PRECISA DE VALIDAÇÃO HUMANA

1. **"Fundada em 22 de agosto de 2025" é data de cadastro, não de ereção.** Aparece idêntica em **6 fichas**
   (São José Operário/Dourados, Jesus Misericordioso e Santa Faustina, São José e São Vicente de Paulo/Ponta
   Porã, Divino Espírito Santo/Rio Brilhante, N. Sra. Rainha dos Apóstolos/Vicentina) e na Região Pastoral
   Missionária — algumas delas são paróquias antigas. `foundedYear` ficou `null` nas 7 e o `notes` registra o
   motivo. As demais datas (1931 a 2025) não se repetem e parecem genuínas.
   - Caso à parte: **Paróquia Santa Edwiges** (Dourados) diz "3 de março de 2025" — data única, pode ser
     ereção real de paróquia nova. Mantida como 2025; conferir.

2. **As 20 paróquias sem horário.** Prioridade para o enxame de validação, buscando redes sociais próprias:
   Aral Moreira, Antônio João, Coronel Sapucaia, Deodápolis, Glória de Dourados, Laguna Carapã, Maracaju (2),
   Nova Alvorada do Sul, Rio Brilhante, Vicentina, Caarapó (Senhor Bom Jesus), Ponta Porã (Divino Espírito
   Santo), e em Dourados: N. Sra. Aparecida (Jd. Vista Alegre), N. Sra. de Fátima (Vila Alba), Sagrado Coração
   de Jesus, Santa Edwiges, Santo Elias, São João Batista, São José Operário.
   Duas delas têm site/página próprios que valem a visita: **saojoseoperario.org** (Paróquia São José Operário
   de Dourados) e a página da Catedral.

3. **Homônimos — cuidado no import.** A diocese tem repetições de orago em cidades diferentes, resolvidas
   pelo sufixo de cidade no slug: **Nossa Senhora Aparecida** em 5 cidades (Dourados, Douradina, Deodápolis,
   Aral Moreira, Maracaju); **Nossa Senhora Auxiliadora** em 3 (Dourados, Amambai, Maracaju); **São José** em
   3 (Dourados/Operário, Ponta Porã, Itaporã); **Divino Espírito Santo** em 2 (Rio Brilhante, Ponta Porã);
   **Nossa Senhora de Fátima** em 2 (Dourados, Fátima do Sul); **São Francisco** (Dourados) × **São Francisco
   de Assis** (Caarapó); **Rainha dos Apóstolos** (Dourados) × **Nossa Senhora Rainha dos Apóstolos**
   (Vicentina). Maracaju tem **duas** paróquias: N. Sra. Aparecida (Av. Mário Correia, 1931) e N. Sra.
   Auxiliadora (Bairro Paraguai, 2014).

4. **Nomes normalizados por decisão minha** (o site publica o título composto):
   - "Paróquia Nossa Senhora da Conceição - Catedral Diocesana" → **Catedral Nossa Senhora da Conceição**;
   - "Paróquia São Pedro - Santuário Diocesano Nossa Senhora Aparecida" → **Paróquia São Pedro** (o santuário
     ficou em `notes`).

5. **Marcadores aplicados:** `status: "nao-paroquial"` no **Mosteiro Santa Maria dos Anjos** e na **Região
   Pastoral Missionária** — nenhum dos dois publica horário, então ficam de fora da carga pela regra do
   README. Se a Região Pastoral Missionária for, na prática, a unidade que celebra nas aldeias, ela precisa
   de decisão humana: pode merecer `loadAsParish` com horários levantados à mão.

6. **Telefone ausente:** Paróquia Santa Edwiges e Região Pastoral Missionária.
   **Bairro ausente** em 10 fichas porque o endereço publicado não separa o bairro (ex.: "Av. Pres. Dutra,
   1345, Douradina - MS").

7. **1 horário descartado**: Paróquia Bom Jesus publica "Sexta-feira / Mensal / 1ª do mês" **sem hora** —
   entrada incompleta na fonte.
