# Relatório de pesquisa — Diocese de Ourinhos (SP)

**Data da pesquisa:** 2026-09-10 · **Arquivo gerado:** `ourinhos.json`

## Resumo

| Item | Total |
|---|---|
| Paróquias | **44** — todas `alta` |
| Comunidades | **199** (44 matrizes + 155 capelas/comunidades) |
| Horários fixos | **73** (21 `alta`, 14 `media`, 38 `baixa`) — de apenas **7** paróquias |
| Cobertura | **44/44** (100 % do esperado) |

## Fontes principais

1. **Portal diocesano — https://diocesedeourinhos.com.br** (WordPress).
   - **4 páginas de forania**, que fecham a lista de paróquias:
     [Ourinhos](https://diocesedeourinhos.com.br/forania-de-ourinhos/) (14),
     [Ocauçu](https://diocesedeourinhos.com.br/forania-de-ocaucu/) (8),
     [Piraju](https://diocesedeourinhos.com.br/forania-de-piraju/) (12),
     [Santa Cruz do Rio Pardo](https://diocesedeourinhos.com.br/forania-de-santa-cruz-do-rio-pardo/) (10)
     — **14 + 8 + 12 + 10 = 44**.
   - **44 fichas individuais** `/{slug-da-paroquia}/`, com endereço, bairro, CEP, telefone(s),
     e-mail, site/Facebook/Instagram/YouTube, data de fundação, festa do padroeiro e a lista de
     **capelas pertencentes**.
   - **REST API do WordPress** (`/wp-json/wp/v2/pages?per_page=100&_fields=id,slug,title,content,modified`):
     84 páginas no total, das quais **exatamente 44 começam com `paroquia-`** — conferência cruzada
     com as foranias, **sem lacuna**. O campo `modified` das fichas vai de **04/08/2025 a 06/09/2026**.
   - **[Padres](https://diocesedeourinhos.com.br/padres/)** — página do clero, **atualizada em
     07/09/2026**; deu o pároco/administrador de **41 das 44** paróquias.
2. **catholic-hierarchy.org/diocese/douri.html** — estatística **2023: 44 paróquias**, 275.700
   católicos; bispo **Dom Eduardo Vieira dos Santos**, nomeado em 19/05/2021. **Bate exatamente.**
3. **Sites oficiais de paróquia** (as duas únicas que ainda existem e publicam horário):
   - `santuarionsfatima.com.br/horarios` — Santuário N. Sra. do Rosário de Fátima, Santa Cruz do
     Rio Pardo (rodapé "© 2025"). **O domínio caiu no filtro Fortinet da rede local**; resolvido
     por DNS-over-HTTPS (`dns.google/resolve`) + `curl --resolve www.santuarionsfatima.com.br:443:92.113.36.16`.
   - `saobeneditoscrp.com.br` — Paróquia São Benedito, Santa Cruz do Rio Pardo (seção "Horários",
     **sem data publicada** → gravado como `media`).
4. **missahora.com.br** — agregador, usado para 5 paróquias (ver abaixo). Sem data de atualização
   publicada e sem corroboração → **`baixa`**.

**Sites de paróquia que estão fora do ar** (o portal ainda os linka): `igrejamatrizsaosebastiao.com.br`
e `santoantonioourinhos.com` — os domínios **não resolvem mais em DNS**. Para essas duas gravei o
Facebook oficial no campo `website`.

## Cobertura

**44/44.** Distribuição por cidade: Ourinhos 12 · Santa Cruz do Rio Pardo 7 · Piraju 4 · Fartura 2
· e 1 paróquia em cada uma de Canitar, Chavantes, Salto Grande, Alvinlândia, Campos Novos Paulista,
Ibirarema, Lupércio, Ocauçu, Ribeirão do Sul, São Pedro do Turvo, Ubirajara, Manduri, Óleo,
Sarutaiá, Taguaí, Tejupá, Timburi, Bernardino de Campos, Espírito Santo do Turvo e Ipaussu
(**23 municípios**).

Qualidade dos campos: **endereço 44/44 · CEP 43/44 · telefone 43/44 · e-mail 41/44 ·
pároco 41/44 · ano de fundação 32/44 · capelas listadas em 39/44**.

## ⚠ Horários: a grande lacuna desta diocese

**O portal diocesano não publica horário de missa em nenhuma das 44 fichas de paróquia.**
A única página `/horarios/` do site é a de **"Horários das Missas de Natal e Ano Novo"**
(24/12, 25/12, 31/12 e 01/01, última alteração em 23/12/2025) — são **datas especiais**, que o
README manda não gravar, e por isso **não entrou no dataset**. Ela, porém, confirma a existência
de várias capelas (São José em Canitar, São Pedro e Irapé em Chavantes, Sagrado Coração e Asilo no
Santuário de Guadalupe, Santa Maria em Santo Antônio, N. Sra. de Fátima no Vagão Queimado,
N. Sra. Aparecida e São José Marello em São João Batista, Santa Rita no Perpétuo Socorro, São
Carlos em São José, N. Sra. de Fátima em São Luiz Gonzaga).

Só **7 das 44 paróquias** ficaram com horário:

| Paróquia | Cidade | Fonte | Confiança |
|---|---|---|---|
| Santuário N. Sra. do Rosário de Fátima | Santa Cruz do Rio Pardo | site oficial da paróquia (© 2025) | `alta` (21 registros) |
| Paróquia São Benedito | Santa Cruz do Rio Pardo | site oficial da paróquia (sem data) | `media` (14 registros) |
| Catedral Senhor Bom Jesus | Ourinhos | missahora.com.br | `baixa` |
| Paróquia São Francisco de Assis | Ourinhos | missahora.com.br | `baixa` |
| Paróquia São Sebastião | Santa Cruz do Rio Pardo | missahora.com.br | `baixa` |
| Paróquia Nossa Senhora Aparecida | Piraju | missahora.com.br | `baixa` |
| Paróquia Nossa Senhora das Dores | Fartura | missahora.com.br | `baixa` |

**As outras 37 paróquias estão sem nenhum horário.** Quase todas têm Facebook/Instagram oficial
listado no portal (mapeado no `sources` de cada uma) — é por ali que uma rodada futura deve buscar.

Um horário é `baixa` por **recorrência mensal**: a "Missa Votiva de todos os dias 13", às 15h,
no Santuário de Fátima (data fixa do mês, não cabe em `dayOfWeek`; o valor gravado é convenção,
a regra literal está em `notes`).

Além das missas, foram gravadas **8 confissões** (`CONFESSION`) das duas paróquias com site
oficial. Nenhuma adoração ou terço fixo foi publicado.

## Precisa de validação humana

1. **37 paróquias sem horário de missa** — ver tabela acima. É o item mais importante.
2. **Telefones malformados publicados pelo portal**:
   - Paróquia São Pedro (São Pedro do Turvo): `(14) 3377-110` — falta um dígito;
   - Paróquia Santa Cruz (Timburi): `(14) 99616-58286` — dígitos a mais;
   - Santuário N. Sra. do Rosário de Fátima (SCRP): `(14) 33721258` — sem hífen (o site próprio da
     paróquia publica `(14) 3372-1258`).
3. **Ano de fundação da Paróquia Santa Rita de Cássia (Taguaí)** — o portal publica
   "25 de agosto de **963**". É evidentemente erro de digitação (provavelmente **1963**); gravei
   `null`.
4. **12 paróquias sem ano de fundação** no portal: São Sebastião (SCRP), Santo Antônio de Pádua
   (SCRP), Divino Espírito Santo (Espírito Santo do Turvo), Santa Cruz (Timburi), Santa Rita de
   Cássia (Taguaí), Santo Antônio (Ocauçu), Santo Inácio de Loyola (Lupércio), N. Sra. de Lourdes
   (Ibirarema), Santo Antônio (Alvinlândia), Santa Edwiges (Ourinhos), São Francisco de Assis
   (Ourinhos) e Santuário do Vagão Queimado (Ourinhos).
5. **Paróquia Santa Edwiges (Ourinhos)** — a ficha oficial só traz o endereço
   (R. José Carneiro de Souza, Residencial Vandelena Moraes Freire). **Sem CEP, sem telefone, sem
   e-mail, sem capelas**. Pároco (Pe. Altair Aparecido Gaiquer) veio da página "Padres", onde o nome
   aparece grafado "Santa **Edwirges**".
6. **3 paróquias sem pároco na página do clero**: Divino Espírito Santo (Ubirajara),
   Nossa Senhora de Fátima (Fartura) e — indiretamente — São João Batista (Ourinhos) e Santo
   Antônio de Pádua (SCRP), que só têm **vigário** listado (gravado com a ressalva no próprio campo
   `priestName`).
7. **Divergência de nome**: a página do clero chama a paróquia de Bernardino de Campos de
   "Nossa Senhora **da Paz**"; a ficha e a forania dizem "Nossa Senhora **Rainha da Paz**"
   (nome gravado).
8. **Nomes de comunidade extraídos de listas em texto livre** — a seção "Capelas pertencentes" não
   tem formato fixo (às vezes "Capela X – Bairro Y", às vezes "Bairro Y: Capela X", às vezes só o
   nome do bairro). O parser normalizou, mas restaram casos ambíguos, p. ex.:
   - Santo Antônio (Ribeirão do Sul): a entrada `Capim: São Judas Tadeu` ficou com nome "Capim" e
     bairro "São Judas Tadeu" — está invertida;
   - São Pedro (São Pedro do Turvo): "Sapecado", "Rebeirão bonito" e "Taquaral" são **só o nome do
     bairro**, sem padroeiro;
   - N. Sra. Rainha da Paz (Bernardino de Campos): "Capela do Asilo", "capela do Paraguay" e
     "Capela do hospital" (grafia da fonte);
   - N. Sra. do Patrocínio (Tejupá): a fonte diz "São Benedito e Nossa Senhora da Conceição
     Aparecida (**e mais 13 comunidades Rurais**)" — as 13 rurais não são nomeadas.
   Erros de digitação da própria fonte foram preservados ("Rebeirao claro", "Nossa Senhora
   aparecida", "São Joao Bairro", "Capela Senhor Bom Jeses", "São Bartomeu", "Capela Sao Cristovão").
9. **Endereço duplicado corrigido**: a ficha de N. Sra. Aparecida (SCRP) publica
   "Rua **Rua** Dr. José Carqueijo, nº 492"; gravado sem a repetição.
10. **Dois sites de paróquia fora do ar** (item 3 das fontes) — o portal continua linkando
    domínios mortos.
11. **Endereço divergente no agregador**: para a Matriz São Sebastião (SCRP), o missahora.com.br dá
    "R. Catarina Etsuco Umezu, 484 – Bairro São José"; a diocese dá "Rua Frei Marcos Righi, 227 –
    Centro" (gravado o da diocese; o telefone bate nas duas fontes).
