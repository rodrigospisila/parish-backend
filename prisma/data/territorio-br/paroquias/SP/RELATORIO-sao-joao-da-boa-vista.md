# Relatório de pesquisa — Diocese de São João da Boa Vista (SP)

- **Arquivo**: `paroquias/SP/sao-joao-da-boa-vista.json`
- **Data da pesquisa**: 2026-09-10
- **Agente**: pesquisa de território BR — SP, Diocese de São João da Boa Vista
- **Diocese**: erigida em 16/01/1960 pela bula *In Similitudinem Christi* (João XXIII), desmembrada da
  Arquidiocese de Ribeirão Preto (sua metropolitana). Bispo: **Dom Eugênio Barbosa Martins, sss**
  (nomeado 04/01/2024, ordenação e posse 07/04/2024). 18 municípios, 4 foranias.

## Fontes

| Fonte | URL | Uso |
|---|---|---|
| Site oficial — 18 páginas por município | `https://diocesesaojoao.org.br/<cidade>-sp/` | lista canônica de paróquias, pároco, endereço, CEP, telefone, e-mail, ano de criação |
| Site oficial — Cúria Diocesana | `https://diocesesaojoao.org.br/curia-diocesana/` | endereço, CEP, telefone e e-mail da diocese |
| Site oficial — Bispo Diocesano | `https://diocesesaojoao.org.br/bispo-diocesano/` | bispo atual |
| Site oficial — Santuários | `https://diocesesaojoao.org.br/santuarios/` | 3 santuários (Desterro/Casa Branca, Beato Donizetti/Tambaú, Rosa Mística/Estiva Gerbi) |
| **Site oficial arquivado — 79 posts "Missas e Comunidades da Paróquia …"** | `https://web.archive.org/web/2020*/https://www.diocesesaojoao.org.br/missas-e-comunidades-*` | **todas as comunidades/capelas e todos os horários** |
| Wikipédia — Paróquias da diocese | `https://pt.wikipedia.org/wiki/Paróquias_da_diocese_de_São_João_da_Boa_Vista` | conferência da cobertura (79 paróquias em 18 municípios) |
| catholic-hierarchy.org | `https://www.catholic-hierarchy.org/diocese/dsajb.html` | nº esperado de paróquias (79, estatística de 2023) |

### Notas técnicas (importantes para quem reexecutar)

1. **`diocesesaojoao.org.br` está bloqueado pelo DNS local (Fortinet)** — devolve HTTP 403
   "Web Page Blocked" e `WebFetch` falha com *self signed certificate*. O site está no ar. Contorno usado:
   ```
   curl -s -A "<UA de navegador>" --resolve diocesesaojoao.org.br:443:213.190.7.179 "https://diocesesaojoao.org.br/<caminho>"
   ```
2. O site é WordPress + Elementor, **sem custom post type de paróquia** e com a **REST API fechada (401)**.
   O índice veio de `https://diocesesaojoao.org.br/wp-sitemap-posts-page-1.xml`.
3. O site atual publica **apenas 50 posts** (migração recente). A série institucional
   "Missas e Comunidades da Paróquia X de Y" — **uma página por paróquia, com horários e a lista completa
   de comunidades urbanas e rurais** — foi removida do ar e recuperada integralmente pelo **Arquivo da
   Internet** (CDX API + `.../web/<ts>id_/<url>`). Foram 79 posts, um por paróquia, capturas de
   **setembro de 2020**; o conteúdo cita datas de **2018** (ex.: curso de noivos "17, 18 e 19 de Agosto
   de 2018"), então a redação é anterior à pandemia.
4. Existe um **site antigo em staging** (`darkgrey-bison-133942.hostingersite.com`, `f<forania>_<cidade>.php`)
   com o mesmo conteúdo das páginas de município — não acrescentou dados novos.

## Cobertura

| Métrica | Valor |
|---|---|
| Registros de paróquia | **79** |
| Esperado | **79** (catholic-hierarchy, estatística de 2023; e a lista da Wikipédia) → cobertura **100%** |
| Confiança das paróquias | 78 `alta` / 1 `media` / 0 `baixa` |
| Comunidades / capelas | **587** |
| Horários fixos | **922** — 30 `alta`, 665 `media`, 227 `baixa` |
| Tipos de horário | 852 `MASS`, 36 `ROSARY`, 29 `ADORATION`, 5 `CONFESSION` |
| Paróquias sem nenhum horário | 0 |
| Paróquias sem nenhuma comunidade listada | 1 (Santa Rita de Cássia / Santa Cruz das Palmeiras — a seção do post estava vazia) |

Distribuição por município (paróquias / comunidades / horários):

| Município | Par. | Com. | Hor. |
|---|---|---|---|
| Mogi Guaçu | 18 | 118 | 171 |
| São João da Boa Vista | 11 | 63 | 145 |
| Mococa | 10 | 63 | 163 |
| São José do Rio Pardo | 7 | 80 | 54 |
| Espírito Santo do Pinhal | 5 | 39 | 76 |
| Vargem Grande do Sul | 5 | 23 | 44 |
| Casa Branca | 4 | 19 | 31 |
| Aguaí | 3 | 21 | 36 |
| Santa Cruz das Palmeiras | 3 | 9 | 37 |
| Tambaú | 3 | 22 | 43 |
| Águas da Prata | 2 | 12 | 21 |
| Divinolândia | 2 | 23 | 15 |
| Caconde | 1 | 38 | 16 |
| Estiva Gerbi | 1 | 11 | 13 |
| Itobi | 1 | 6 | 8 |
| Santo Antônio do Jardim | 1 | 14 | 28 |
| São Sebastião da Grama | 1 | 19 | 9 |
| Tapiratiba | 1 | 7 | 12 |

Foranias (campo extra `forania`, ignorado pelo importador): São João Batista 19, Imaculada Conceição 22,
Nossa Senhora das Dores 21, São José 17.

## Escala de confiança adotada

- **Paróquias — `alta`**: as 79 saem da página oficial do município (2026), com pároco, endereço,
  CEP, telefone e e-mail. Exceção: `sao-sebastiao-tambau` ficou `media` (ver abaixo).
- **Comunidades — `media`**: fonte oficial da diocese **sem sinal de atualidade** (posts arquivados de
  2020/2018), conforme a definição do README. A lista de capelas é o dado mais estável do conjunto.
- **Horários — `media` por padrão**, pelo mesmo motivo. **`alta`** só para as 4 paróquias que publicam
  horários no site atual (2026). **`baixa`** quando (a) a recorrência é mensal, (b) o local citado não
  consta na lista de comunidades da paróquia.

### As 4 paróquias com horários `alta` (site atual, 2026)

| Paróquia | Página |
|---|---|
| Paróquia Santo Antônio — São João da Boa Vista | `/sao-joao-da-boa-vista-sp/` |
| Paróquia Imaculada Conceição — São João da Boa Vista | `/sao-joao-da-boa-vista-sp/` |
| Paróquia São Benedito — Mococa | `/mococa-sp/` |
| Paróquia São João Batista — Espírito Santo do Pinhal | `/espirito-santo-do-pinhal-sp/` |

Nessas 4, os horários de missa do post arquivado foram **substituídos** pelos do site atual; os de
adoração / terço / confissão que só o post arquivado publica foram preservados (com `media`).

## Decisão pendente do Rodrigo: a confiança dos 665 horários arquivados

Os horários que vêm dos posts arquivados estão gravados como **`media`**, seguindo a letra do README
(*"media — … ou **fonte oficial sem sinal de atualidade**"*): são do site oficial da diocese, não são
fonte não-oficial, dado inferido nem contraditório (que é a definição de `baixa`). Cada um traz um campo
**`provenance`** com a data exata da captura e o aviso de que o texto é de ~2018.

Durante a revisão, um agente do enxame rebaixou os 665 para `baixa`. **Revertido**, porque o efeito é
grande e a decisão não é técnica: com tudo em `baixa`, o importador (`min-confidence=media`) deixaria
**75 das 79 paróquias sem nenhum horário** — a carga de horários da diocese inteira iria a zero.

- **Manter `media`** (estado atual): entram 695 horários; assume-se que uma grade de missas de 2018
  ainda descreve razoavelmente a realidade, com o aviso em `provenance`.
- **Rebaixar para `baixa`**: entram só os 30 `alta` (4 paróquias). Um `sed` resolve:
  `s/"confidence": "media"/"confidence": "baixa"/` nos `schedules`.

Recomendação: manter `media` e priorizar a revalidação por agregadores/redes sociais, que é barata
e transforma boa parte desses 665 em `alta`.

## Ajustes de carga aplicados (heurística `isMatrizName` do importador)

`import-territorio.ts` (l.62) trata como igreja-matriz **qualquer** comunidade cujo nome case
`/matriz|catedral|santuário/i`. Três registros deste dataset caíam nessa armadilha e sequestravam
os horários que apontam para `"Matriz"`:

| Paróquia | Problema | Correção |
|---|---|---|
| São José — Estiva Gerbi | "Santuário Rosa Mística" casava o regex → a matriz sintética não era criada e os **8 horários da matriz** iam para o santuário | `"status": "nao-paroquial"` (é santuário diocesano, não comunidade — regra do prompt); o importador volta a criar `Matriz São José` |
| Divino Espírito Santo e N. S. das Dores — E. S. do Pinhal | "Comunidade Santuário Santa Luzia" vinha **antes** da "Matriz" na lista → assumiria o papel de matriz, levando **18 horários** | "Santuário" retirado do `name` das duas comunidades (nome integral da fonte em `notes`) |
| Santa Teresa D'Ávila — Mogi Guaçu | eu havia marcado `isMatriz: true` em "Comunidade Perpétuo Socorro – **Futura** Matriz" (é a futura matriz, em outro bairro) → **2 horários** no lugar errado | `isMatriz: false`, "Matriz" retirado do `name`, horários devolvidos a `"Matriz"` |

Além disso, a comunidade-matriz declarada foi movida para a **1ª posição** de `communities` em todas as
paróquias que a declaram, para ser a primeira criada no banco.

**Simulação da lógica do importador (l.184–222) sobre o arquivo final**: 0 matrizes mal resolvidas,
0 horários órfãos, **695 horários** e **641 comunidades** entram na carga (o importador cria 55 matrizes
sintéticas `Matriz <padroeiro>` para as paróquias cuja fonte não nomeia a matriz — comportamento correto
e esperado, ver l.188-191).

## Pontos que precisam de validação humana

### 1. Paróquia São Sebastião de Tambaú — paróquia ou comunidade? (`confidence: media`)

A página oficial de Tambaú (2026) lista três blocos: *Paróquia Santo Antônio e Beato Donizetti* (1902),
*Santuário Nossa Senhora Aparecida e Beato Donizetti* (2009) e, em texto corrido sem prefixo de paróquia,
**"Comunidade São Sebastião 2014"**. Já o próprio site oficial arquivado publicava
*"Missas e Comunidades da **Paróquia** São Sebastião de Tambaú"* (com pároco, horários e comunidades
próprias) e a Wikipédia a lista como paróquia de 2014. **É exatamente essa entrada que fecha 78 → 79.**
Ela foi gravada como paróquia, com `jurisdictionNote`, e também como comunidade da Paróquia Santo Antônio
e Beato Donizetti (para não perder o dado do site atual). **Uma das duas precisa cair depois da validação.**

### 2. Divergências de nome entre o site oficial e a Wikipédia

Em todos os casos foi mantido o nome do **site oficial**. A Wikipédia pode estar defasada ou o
padroeiro pode ter mudado:

| Município | Site oficial (usado) | Wikipédia |
|---|---|---|
| São João da Boa Vista | Paróquia **Senhor Bom Jesus** (1999) | Paróquia **São Paulo** (1999) |
| Mococa | Paróquia **Santo Antônio** (1995) | Paróquia **Santa Clara** (1995) |
| Divinolândia | Paróquia **Nossa Senhora Aparecida** (1996) | Paróquia **Nossa Senhora Rainha da Família** (1996) |
| Vargem Grande do Sul | Paróquia **Santo Antônio** (1994) | Paróquia **Nossa Senhora da Rosa Mística** (1994) |
| Espírito Santo do Pinhal | Paróquia **dos Santos Mártires, São Pantaleão, Santa Luzia e São Sebastião** (2003) | Paróquia dos Santos Mártires (2004) |

> O e-mail da Paróquia Santo Antônio de Vargem Grande do Sul é `misticarosa@terra.com.br`, o que reforça
> a hipótese de dupla invocação (Santo Antônio + Nossa Senhora Rosa Mística) ou de mudança de nome.

### 3. Divergências de `foundedYear` (mantido o ano do site oficial)

| Paróquia | Site | Wikipédia |
|---|---|---|
| Santuário Santo Antônio — São José do Rio Pardo | 2007 | 2003 |
| Paróquia São João Batista — Casa Branca | 2006 | 2004 |
| Santuário Nossa Senhora Aparecida e Beato Donizetti — Tambaú | 2009 | 2001 |
| Paróquia Nossa Senhora de Fátima — São João da Boa Vista | 1995 | 1996 |
| Paróquia Santa Cruz e Nossa Senhora Aparecida — Pinhal | 2004 | 2004 (idem) |

Os anos do site **não** parecem datas de cadastro no CMS: são variados e coerentes (1740 Mogi Guaçu,
1775 Caconde, 1814 Casa Branca, 1832 a Catedral, 1856 Mococa…), então foram gravados.

### 4. Idade dos horários (**o maior risco deste dataset**)

**Todos os 892 horários que não vêm das 4 páginas atuais foram redigidos em ~2018 e capturados em
setembro de 2020** — ver a seção "Decisão pendente" no topo. Entram como `media` porque são fonte oficial
sem sinal de atualidade (regra do README), mas **têm 6–8 anos** e atravessaram a pandemia. Cada registro
traz o campo **`provenance`** com a data exata da captura; a UI deveria exibir essa ressalva. Revalidação
por amostragem é a próxima tarefa mais valiosa nesta diocese.

### 5. 227 horários `baixa`

- **183 são de recorrência mensal** ("todo dia 13", "1ª e 3ª sexta", "última quinta do mês", "a cada 15
  dias"), que não cabem em `MassSchedule` (só dia da semana). A regra literal está copiada em `notes`,
  começando por `Recorrência mensal:`. É a mesma decisão de produto pendente registrada no README.
  Onde a recorrência é por **dia do mês** ("Dia 13", "Dia 18"), foi preciso gravar um `dayOfWeek`
  arbitrário (0) — esses registros **não devem entrar no banco** sem a modelagem nova.
- **65 têm local que não consta na lista de comunidades da paróquia** (colégios, asilos, hospitais,
  santas casas, salão paroquial, fazendas, "Zona Rural", "Comunidades"). Foram gravados em `Matriz`
  com o local literal em `notes` (`Local informado pela fonte: "…"`). Os mais relevantes:
  Colégio Divino Espírito Santo (Pinhal), Colégio/Lar Maria Imaculada (Mococa — São Sebastião),
  Santuário de Adoração Sagrado Coração de Jesus (Casa Branca — N. S. das Dores),
  Capela Jesus Misericordioso / Alameda Dom David Dias Pimentel (Mogi Guaçu — Santo André),
  Creche Padre Vitório (Itobi), Rádio Comunitária Esperança e Vida (Mococa — Santa Teresinha),
  Capela do Igaçaba (Mogi Guaçu — São Pedro Pescador), Capela São Genaro (Mococa — Santo Antônio),
  Igreja São Domingos de Silos (SJRP — Santuário São Roque), Salão Paroquial (Santo Antônio do Jardim).

### 6. Post de Santa Rita de Cássia (Santa Cruz das Palmeiras) parece trocado

O post oficial dessa paróquia **não lista nenhuma comunidade** e todos os horários citam
*"Igreja Matriz **Santo Antônio**"* — que não é a invocação da paróquia. Ou a matriz dela é de fato
dedicada a Santo Antônio, ou o post foi montado com o conteúdo de outra paróquia. Os horários foram
gravados em `Matriz`. **Conferir com a paróquia.**

### 7. Santuário Rosa Mística (Estiva Gerbi) — não paroquial

A página `/santuarios/` lista o *Santuário Rosa Mística* com o **mesmo pároco/reitor, telefone e e-mail**
da Paróquia São José de Estiva Gerbi, e a página do município lista **só** a Paróquia São José. Foi
gravado como **comunidade** dessa paróquia (`confidence: alta`, com `notes`), **não** como paróquia,
para não inflar a contagem.

### 8. Outros pontos menores

- **Casas religiosas** (`/casas-masculinas/`, `/casas-femininas/`, `/novas-comunidades/`) **não** foram
  incluídas — a diocese tem 16 novas comunidades e várias casas religiosas listadas, mas nenhuma é
  paróquia e o importador as ignoraria pelo nome.
- **Paróquia Santuário Nossa Senhora da Conceição (Caconde)**: o site chama o templo de "Basílica"
  no endereço; gravada como `Santuário Nossa Senhora da Conceição` (o e-mail é
  `paroquiaimaculadacaconde@`, e a Wikipédia a chama de "Imaculada Conceição").
- **CEP da Paróquia São José (São José do Rio Pardo)**: o site publica `13.7200-77`, malformado.
  Foi normalizado para `13720-077` — **conferir**.
- Alguns telefones do site vêm como celular pessoal do pároco (ex.: São Benedito/Aguaí,
  `dara.76@terra.com.br` como e-mail paroquial) — gravados como estão.
- **Um erro de digitação da própria fonte** impediu um casamento: em Espírito Santo do Pinhal
  (Santa Cruz e N. S. Aparecida) a comunidade é "Cachoerinha" na lista e "Cachoeirinha" no horário,
  então uma missa da Capela de Santa Cruz caiu em `Matriz Santa Cruz`.
- Nenhuma **Celebração da Palavra** foi encontrada rotulada como tal nos posts; "Eucaristia do Caminho"
  e "Celebração do Caminho Neocatecumenal" (Neocatecumenato) aparecem em várias paróquias e foram
  gravadas como `MASS` — conferir se a diocese as considera missa.

## O que ficou de fora

- **Websites e redes sociais próprios das paróquias**: só 5 links oficiais aparecem no site da diocese
  (Facebook/Instagram/YouTube de 4 paróquias de São João da Boa Vista e o site do Santuário do Beato
  Donizetti). Apenas este último foi gravado em `website`. Não houve varredura de Facebook/Instagram
  paróquia a paróquia.
- **Agregadores** (horariodemissa.com.br, missas.com.br, Google Maps): não foram usados, porque a fonte
  oficial arquivada cobre 100% das paróquias e é mais confiável. Continuam sendo o caminho para
  **atualizar** os horários de 2018/2020, que é a próxima tarefa mais valiosa nesta diocese.
- **Endereço das comunidades**: os posts só dão nome + bairro; `address` das comunidades ficou `null`.
