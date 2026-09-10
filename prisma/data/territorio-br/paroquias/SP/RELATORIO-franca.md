# Relatório de pesquisa — Diocese de Franca (SP)

- **Arquivo gerado**: `paroquias/SP/franca.json`
- **Data da pesquisa**: 2026-09-10 (todos os `accessedAt`)
- **Resultado**: 45 paróquias, 184 comunidades, 540 horários fixos
- **Confiança**: paróquias 45 alta / 0 media / 0 baixa · comunidades 179 alta / 5 media · horários
  478 alta / 4 media / 58 baixa

## Fontes principais

Praticamente todo o dataset veio do **portal oficial da diocese** (`https://diocesefranca.org.br`),
que mantém uma página por paróquia com endereço, CEP, telefone, e-mail, pároco, vigários, data de
criação canônica, lista de capelas com endereço e horários de missa. O site está ativo (notícias de
2026, edição de maio/2026 de "A Voz da Diocese" no menu), o que sustenta a classificação `alta`.

| Fonte | Uso |
|---|---|
| `https://diocesefranca.org.br/` | portal, menu de foranias |
| `?menu=noticia_detalhe&id=323&id_menu_c=5` | contato: endereço da Cúria, telefones, e-mails |
| `?menu=noticia_detalhe&id=1865&id_menu_c=1&id_orgao=1` | bispo atual — Dom Paulo Roberto Beloto |
| `?menu=noticia_detalhe&id=1991&id_menu_c=1&id_orgao=1` | história: 19 municípios, 6.634,5 km² |
| `?menu=noticia_detalhe&id=5770&id_menu_c=201&id_orgao=1` | Forania Beata Rita Amada de Jesus (8 paróquias) |
| `?menu=noticia_detalhe&id=5781&id_menu_c=201&id_orgao=1` | Forania Nossa Senhora Aparecida (10) |
| `?menu=noticia_detalhe&id=5771&id_menu_c=201&id_orgao=1` | Forania Nossa Senhora da Conceição (7) |
| `?menu=noticia_detalhe&id=5779&id_menu_c=201&id_orgao=1` | Forania Santa Gianna (8) |
| `?menu=noticia_detalhe&id=5780&id_menu_c=201&id_orgao=1` | Forania São Joaquim (8) |
| `?menu=noticia_detalhe&id=<2014..2257>&id_orgao=1` | uma página por paróquia (45 páginas) |
| `https://diocesefranca.org.br/compartilhar.php?id_conteudo=<id>` | mesma ficha em versão leve; usada para as páginas que o template principal não renderiza |
| `https://www.catholic-hierarchy.org/diocese/dfran.html` | nº esperado de paróquias (45, estatísticas de 2023), criação em 20/02/1971 |
| `https://pt.wikipedia.org/wiki/Diocese_de_Franca` | conferência (informa 43 paróquias — número desatualizado) |
| `https://diocesefranca.org.br/paroquiasaojudastadeufranca/` | portal paroquial (nome oficial "Paróquia São Judas Tadeu") |
| `https://diocesefranca.org.br/nossasenhoradaguia/` | portal paroquial |

Nenhum agregador (horariodemissa, missas.com.br, Google Maps) foi usado como fonte de dado gravado —
o site oficial cobriu tudo.

## Cobertura

**45 de 45 paróquias esperadas** (catholic-hierarchy, dados de 2023), distribuídas exatamente pelos
19 municípios da diocese: Franca 24, Ituverava 2, Orlândia 2, São Joaquim da Barra 2 e 1 em cada um
de Aramina, Buritizal, Cristais Paulista, Guará, Igarapava, Itirapuã, Jeriquara, Nuporanga,
Patrocínio Paulista, Pedregulho, Restinga, Ribeirão Corrente, Rifaina, Sales Oliveira e São José da
Bela Vista.

As 5 foranias do menu listam **41** paróquias. As outras **4** só foram encontradas com uma varredura
das páginas de conteúdo do portal (ids 1990–6119 via `compartilhar.php`), porque não constam de
nenhuma lista de forania:

- **Paróquia Sagrada Família** (Franca, id 2052)
- **Paróquia Santa Cruz** (Ribeirão Corrente, id 2054)
- **Paróquia Santa Edwiges** (Franca, id 2055)
- **Paróquia Santa Gianna** (Franca, id 2056)

A mesma varredura não achou nenhuma outra página de paróquia, o que confirma o total de 45. Duas
delas foram detectadas antes pela citação em textos de outras paróquias ("faz divisa com a Paróquia
Santa Cruz — Ribeirão Corrente/SP", "Paróquia Santa Edwiges", "Paróquia Santa Gianna Beretta Molla").

Todas as 45 paróquias têm ao menos um horário de missa gravado. 8 paróquias ficaram com
`communities: []` porque o site não lista capela nenhuma (só a matriz): Buritizal, Rifaina,
Jeriquara, Nossa Senhora das Graças (Franca), Santuário Diocesano Santo Antônio, São Sebastião
(Franca), São Judas Tadeu (Franca — ver abaixo) e Santa Mônica (Franca).

## Decisões de normalização

- **"Sé Catedral Nossa Senhora da Conceição"** → gravada como `Catedral Nossa Senhora da Conceição`
  (prefixo padronizado do README; o "Sé" do site é registrado aqui).
- **"Paróquia São Judas"** (listagem da forania) × **"Paróquia São Judas Tadeu"** (portal paroquial
  oficial no domínio da diocese) → adotado `Paróquia São Judas Tadeu`.
- **"Paróquia Nossa Senhora da D'Abadia"** (título da página) → gravada como
  `Paróquia Nossa Senhora da Abadia`, forma usada em todo o resto do site.
- **"Nossa Senhora do Patrocínio (Patrocínio Paulista-SP)"**, cujo título no site vem sem o prefixo
  → gravada como `Paróquia Nossa Senhora do Patrocínio`.
- **"Menino Jesus de Praga (Franca-SP)"**, idem → `Paróquia Menino Jesus de Praga`.
- **Santuário Diocesano Santo Antônio** manteve o nome oficial; slug `santo-antonio-franca`
  (mesmo padrão de `jundiai.json`/`mogi-das-cruzes.json`).
- **Capelas homônimas dentro da mesma paróquia** ganharam desambiguador entre parênteses, para que
  o campo `community` dos horários aponte para um nome único. Ocorrências: Nossa Senhora do Carmo
  (Ituverava) tem 3 "Capela Nossa Senhora Aparecida" → `(Capivari)`, `(Aparecida do Salto)`,
  `(Rua Sebastiana Monteiro Cassiano)`; Restinga tem 2 → `(Assentamento Boa Sorte)`,
  `(Fazenda Santa Maria)`; Aramina tem 2 comunidades N. S. Aparecida → `(Paraíso)`, `(Aramina)`, além
  de `(Canindé)`; Pedregulho tem 2 São Sebastião → `Capela São Sebastião` e
  `Capela São Sebastião (Taquari)`, e `Capela Sagrada Família (Alto Lageado)`.
- **Horários não gravados** (não cabem em `dayOfWeek`/`time` ou não são missa):
  - missas de **dia fixo do mês** ("todo dia 13", "todo dia 22"): Santa Rita de Cássia (Franca),
    Santa Luzia (Franca), São Sebastião (Franca), Nossa Senhora Rosa Mística, Nossa Senhora das
    Graças (Franca), Capela Santa Rita da Paróquia N. S. da Abadia e São José (São José da Bela
    Vista);
  - **Celebração da Palavra** de quinta-feira (6h30/11h30/19h) na Paróquia Nossa Senhora das Graças —
    não é missa;
  - missas em locais que não são comunidade listada: Lar São Vicente de Paulo (Patrocínio Paulista),
    asilo / Santa Casa / casa das Irmãs (São Joaquim da Barra), "missa nas casas" (Santa Mônica);
  - festas, tríduos, novenas, missas votivas de padroeiro e "missas votivas conforme avisos
    semanais" (Buritizal).
- **Recorrência mensal** ("1ª sexta-feira do mês", "2º e 4º domingo", "último sábado") entrou com o
  `dayOfWeek` correto, `confidence: "baixa"` e o texto original em `notes` — 58 horários. Quando a
  missa mensal coincidia com um horário semanal já gravado (mesma comunidade, dia, hora e tipo), a
  entrada mensal foi descartada em favor da semanal (3 casos: Sagrado Coração de Jesus, São
  Sebastião e Santa Teresinha, todas em Franca).

## Precisa de validação humana

1. **Pároco de Aramina possivelmente desatualizado.** A página da Paróquia Santo Antônio (Aramina)
   registra `Pe. Rodrigo Anael de Paulo` como pároco, mas a notícia do próprio portal de 18/01/2026
   (`?menu=noticia_detalhe&id=5818&id_orgao=1`) diz que ele foi apresentado como **vigário paroquial
   da Paróquia São Pedro (Franca)**, substituindo o Pe. Diego Gonçalves. Gravei o campo como
   publicado na ficha da paróquia; conferir quem é o pároco atual de Aramina.
2. **Pároco de Buritizal contraditório na própria página.** O campo estruturado diz
   `Pe. Fabiano Rosa de Oliveira` (que também consta como pároco de Jeriquara) e a "Descrição" da
   mesma página diz que o terceiro e atual pároco é `Padre Juliano Gonçalves Delgado` — nome que
   aparece como pároco da São Vicente de Paulo (Franca). Usei o campo estruturado.
3. **Capelas duplicadas entre paróquias (desmembramentos não refletidos na página antiga).**
   A página da **Paróquia São Judas Tadeu** lista 5 capelas que também aparecem, com o mesmo endereço
   e o mesmo horário, nas páginas de duas paróquias criadas depois dela:
   - Nossa Senhora de Guadalupe, Santa Clara e Santa Maria dos Anjos → também na **Paróquia Sagrada
     Família** (criada em 31/10/2020), cuja ficha traz os endereços completos com CEP;
   - Santo Antônio de Santana Galvão (Rua Dil(l)co Rosa Faria — nº 274 na São Judas, nº 2740 na Rosa
     Mística) e Nossa Senhora Aparecida do Bom Jardim → também na **Paróquia Nossa Senhora Rosa
     Mística** (criada em 02/02/2021).

   Atribuí as 5 às paróquias novas (marcadas `media` na Sagrada Família) e deixei a São Judas Tadeu
   só com a matriz. **Confirmar com a diocese** a jurisdição atual de cada capela e o número da Rua
   Dilco Rosa Faria.
4. **Telefone sem DDD** — Paróquia São Francisco de Assis (Franca): o site publica `3701-5903`.
   Gravado como está, sem inferir o DDD.
5. **CEPs suspeitos publicados pelo site**:
   - Capela Nossa Senhora de Lourdes (Catedral, Rua Major Claudiano, 1488): CEP publicado
     `14.000-690`, inválido para Franca (a faixa é 144xx). Comunidade marcada `media`, com o aviso
     dentro do campo `address`.
   - Capela Nossa Senhora Aparecida do Distrito de Capivari (Paróquia N. S. do Carmo, Ituverava):
     CEP publicado `13.360-000`, que é de Capivari/SP, município de outra região. Comunidade
     marcada `media`.
   - Paróquia Menino Jesus de Praga: CEP publicado `14.400-970` (é o CEP genérico de caixa postal de
     Franca); agregadores indicam `14405-052` para a Rua Sacramento, 605. Gravei o publicado.
6. **Sites paroquiais publicados que não respondem** — não gravei `website` nesses casos:
   - Capelinha: o site publica `www.diocesedefranca.org.br/capelinha`; esse domínio não resolve
     (o correto é `diocesefranca.org.br`, sem o "de") e `diocesefranca.org.br/capelinha` devolve 404.
   - Menino Jesus de Praga: `www.paroquiameninojesus.org.br` não resolve.
   - São Vicente de Paulo: `www.paroquiasaovicentefranca.com.br` gravado, mas o certificado TLS
     falhou na verificação.
   - Santa Rita de Cássia (Sales Oliveira): `paroquiasantaritasales.org.br` gravado; responde 403 a
     leitor automático (bloqueio de bot, o domínio existe).
7. **"Terço dos Homens" do Santuário Diocesano Santo Antônio**: o site publica `20:` (sem os
   minutos). Gravado como `20:00`, terça-feira, tipo `ROSARY`, `confidence: media`.
8. **Comunidade Irmã Dulce (Paróquia Santa Rita de Cássia, Igarapava)**: horário publicado
   "2ª e 4ª-feira do mês 9h30" é ambíguo (segunda e quarta-feira? 2ª e 4ª semana do mês?).
   **Não gravado.** A Comunidade João Paulo II, da mesma paróquia, não tem horário publicado.
9. **Data de criação de Itirapuã**: campo estruturado diz `20/01/1968`, a descrição da mesma página
   diz "criada em 02 de fevereiro de 1968, instalada a 24 de março". Gravei `foundedYear: 1968`.
10. **Campos ausentes no site oficial** (gravados como `null`, sem recorrer a agregador):
    - Paróquia Santa Cruz (Ribeirão Corrente): sem telefone e sem e-mail;
    - Paróquia Nossa Senhora Aparecida (Itirapuã): sem e-mail;
    - Paróquia Santa Gianna (Franca) e Paróquia Nosso Senhor Jesus Cristo Rei do Universo
      (Orlândia): sem CEP.
11. **4 paróquias fora das foranias.** Sagrada Família, Santa Cruz (Ribeirão Corrente), Santa
    Edwiges e Santa Gianna não constam de nenhuma das 5 páginas de forania do site. Vale confirmar a
    qual forania pertencem (o campo não é gravado no JSON, mas a lacuna sugere página de forania
    desatualizada).
12. **Erros de rótulo no site** que não afetaram o dado gravado: a ficha de Patrocínio Paulista tem
    o subtítulo "Conheça a Paróquia Nossa Senhora Aparecida" (é do Patrocínio); várias páginas
    trazem texto-modelo residual ("asdsada", "John Doe, New York").
