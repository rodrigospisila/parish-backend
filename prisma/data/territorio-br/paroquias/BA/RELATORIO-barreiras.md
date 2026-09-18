# Diocese de Barreiras — relatório de pesquisa

- **Slug**: `barreiras` · **UF**: BA · **Sede**: Barreiras · **Província**: Feira de Santana · **Regional**: Nordeste 3
- **Pesquisa**: 18/09/2026
- **Bispo**: Dom Moacir Silva Arantes (desde 21/10/2020)
- **Cúria**: Rua 26 de Maio, 427, Centro · 47800-145 · (77) 3611-5926 / (77) 9 9995-5515 (WhatsApp)
- **Site oficial**: <https://diocesedebarreiras.org.br> — **vivo, completo e organizado por foranias**
- **Foranias**: I São Mateus (8 paróquias) · II São Marcos (7) · III São Lucas (4) · IV São João Evangelista (5)

## Resultado

| Métrica | Valor |
|---|---|
| Paróquias | **24** — todas `alta` |
| Registros no arquivo | 25 (as 24 paróquias + a Reitoria São Bento, `status: nao-paroquial` + `loadAsParish`) |
| Comunidades | **540** = 25 matrizes + 515 capelas/comunidades, todas `alta` |
| Horários fixos | **138** (115 MASS · 18 CONFESSION · 5 ADORATION) — **127 `alta`**, 11 `baixa` |
| Paróquias com algum horário | **25 de 25** |
| Horários carregáveis (`alta`/`media`) | **127** |

**Cobertura: 24 de 24.** A melhor fonte das quatro dioceses desta rodada.

## Fontes principais

1. **As quatro páginas de forania** — `/paroquiasforaniasaomateus`, `/paroquiasforaniasaomarcos`,
   `/paroquiasforaniasaolucas`, `/paroquiasforaniasaojoaoevangelista`. Cada uma traz, **para cada
   paróquia**: endereço, CEP, telefone/WhatsApp, e-mail, ano de criação, pároco, diáconos,
   **horário das missas** (matriz e comunidades, com o nome da igreja de cada uma), horário das
   confissões, expediente da secretaria, pastorais e a **lista nominal de comunidades**.
   Datas de publicação: **28/07/2026** (São Mateus) e **06–09/12/2025** (as outras três).
   O conteúdo é Elementor; li pela REST `/wp-json/wp/v2/pages?per_page=100` (128 páginas).
2. **`/presbiteros`** — republicada em **06/08/2026**, mais recente que três das quatro páginas de
   forania. Lista os 22 presbíteros incardinados residentes, os premonstratenses, os pavonianos e a
   função paroquial de cada um. **Foi a fonte que resolveu (ou expôs) 9 divergências de pároco.**
3. **Receita Federal via `minhareceita.org`** — CNPJ raiz **14.760.136**, varredura de `/0001` a
   `/0042`: existem exatamente **30 inscrições**, nada além.
4. **`perpetuosocorrobarreiras.com.br`** — site próprio do Santuário N. Sra. do Perpétuo Socorro,
   com aviso de **08/02/2026** (posse do novo pároco) e grade de celebrações mais completa e mais
   nova que a da página diocesana.
5. `/santuariosenhordosaflitos` e `/igrejasaobento` — as duas igrejas não paroquiais.
6. `catholic-hierarchy.org/diocese/dbaas.html` — 24 paróquias e 22 presbíteros em 2022.

## Prova de completude — três contagens que fecham em 24

| Fonte | Total |
|---|---|
| Páginas de forania do site oficial | 8 + 7 + 4 + 5 = **24** |
| Filiais ATIVAS com nome de paróquia no CNPJ 14.760.136 | **24** |
| Annuario Pontificio 2023 (`ap2023`) | **24** |

As 30 inscrições da Receita são: a sede (`/0001`), **24 paróquias ATIVAS**, o Centro de Eventos
Gruta Nossa Senhora Aparecida em LEM (`/0030`, ATIVA, não é paróquia) e **4 BAIXADAS** — Livraria
São Bento (`/0002`), Igreja São Bento (`/0028`) e dois CNPJs antigos de paróquias que foram
reinscritas com outro número (Santa Rafaela Maria `/0014` e N. Sra. Aparecida de Barreiras `/0018`).
Casam uma a uma com o site por nome e município.

## Horários — o achado desta rodada

**127 horários `alta`**: o site publica grade oficial e datada para **todas as 24 paróquias**,
inclusive as rurais. Nenhum agregador foi necessário nem usado.

Os 11 `baixa` são todos de recorrência que o modelo não cobre, com a regra literal em `notes`:

| Paróquia | Regra publicada |
|---|---|
| Catedral São João Batista | Santuário do Senhor dos Aflitos: "1º e 3º domingo de cada mês, Santa Missa às 10h" |
| Santa Rafaela Maria | Confissões "das 09h às 11h na Igreja Matriz" — **sem dia da semana** (`dayOfWeek: null`) |
| Nosso Senhor do Bonfim (Baianópolis) | "Primeira sexta-feira de cada mês às 20h00" |
| Menino Deus (Cristópolis) | "Sábado às 6h30 (não são todos os sábados)" |
| Santa Rita de Cássia (Santa Rita) | "1ª sexta-feira do mês: Missa do Apostolado da Oração às 19:30" |
| São José (LEM) | "1º sexta-feira às 19h30, dedicado ao Sagrado Coração de Jesus" |
| São Francisco de Assis (LEM) | "Primeira sexta-feira do mês às 07h00" |
| Sagrado Coração de Jesus (Formosa do Rio Preto) | **4 entradas** — "de terça à sexta-feira às 18h missas na Zona Rural", missa itinerante sem dizer em qual das 34 comunidades rurais |

**Não viraram horário**, conforme o README: a "Celebração da Palavra" do 2º e 4º domingo no
Santuário do Senhor dos Aflitos, as novenas sem missa, o Terço dos Homens, as reuniões de pastoral
e os expedientes de secretaria (que o site publica junto com as missas em todas as fichas).

Faixas de confissão/adoração ("das 16h às 18h", "14h30, 15h, 15h30…") entraram com a hora de início
e o texto literal em `notes`.

### O Santuário do Perpétuo Socorro — a página diocesana se contradiz

A ficha diocesana traz, em linhas seguidas, "Terça à sexta: 06:45 **e 19:30**" e
"Quarta, quinta e sexta: 06:45". O **site da própria paróquia** desfaz o nó e foi a fonte adotada:
domingo 07h30 / 09h30 / 20h00; terça 06h45 **e** 19h30 (Novena); quarta a sexta 06h45; sábado 18h00.
O site da paróquia ainda acrescenta a missa de **domingo 19h30** na Comunidade Santa Catarina de
Alexandria e a **Comunidade Santo Agostinho** (bairro Jardins), fundada em 10/10/2025 e ainda
ausente da página diocesana.

## Igrejas não paroquiais

| Igreja | Tratamento |
|---|---|
| **Santuário Diocesano do Senhor dos Aflitos** (Povoado Cantinho do Senhor dos Aflitos, ~20 km de Barreiras; santuário desde 16/04/2016) | **Não** virou registro próprio: a própria Catedral o lista como sua comunidade ("Cantinho do Senhor dos Aflitos – Senhor dos Aflitos"). A missa mensal foi gravada nessa comunidade. |
| **Reitoria São Bento** (Rua Ipanema, 200, Vila Dulce; reitoria desde 21/03/2016, cân. 556-563) | Registro próprio com `status: "nao-paroquial"` **+ `loadAsParish: true`**, por publicar missa fixa (domingo 10h) e confissão (quarta 09h–11h). CNPJ próprio **baixado**. |

## Divergências de pároco — 9 casos, todas resolvidas pela página mais nova

A página `/presbiteros` (06/08/2026) e as páginas de forania (12/2025, e 07/2026 na São Mateus)
discordam em 9 paróquias. **Adotei sempre a `/presbiteros`** e registrei a versão da forania em
`notes` de cada paróquia. Sinal de que a `/presbiteros` está certa: ela põe Pe. Jocleilson Sebastião
da Silva como formador de seminário em Goiânia, enquanto a forania ainda o dava como pároco do
Santuário do Perpétuo Socorro — e o próprio site da paróquia noticia a **posse do sucessor em
08/02/2026**.

| Paróquia | Forania | Presbíteros (adotado) |
|---|---|---|
| Catedral São João Batista | Pe. Uóxiton da Silva Carvalho | **Pe. Manoel Aparecido da Silva** |
| São José (Barreiras) | Pe. Gustavo Santos Freitas | **Pe. Marco Túlio Araújo de Morais** (pavoniano) |
| Santuário N. Sra. do Perpétuo Socorro | Pe. Jocleilson Sebastião da Silva | **Pe. Verneson Francisco de Souza** |
| Senhora Sant'Ana (Angical) | Pe. Cícero Pinto de Almeida | **Pe. Uóxiton da Silva Carvalho** |
| Menino Deus (Cristópolis) | Pe. Onildo Novais Rodrigues | **Pe. Jaivalton Moreira de Souza** |
| N. Sra. da Conceição (Tabocas) | Pe. Assis Alexandre da Silva | **Cônego Pe. Andréz Segundo M. González** |
| São João Batista (Wanderley) | Pe. José Trindade Dantas dos Reis | **Pe. Cícero Pinto de Almeida** |
| Santa Rita de Cássia (Santa Rita) | Pe. José Grigório da Silva | **Pe. Pedro Felipe Macedo Ramos** |
| N. Sra. Aparecida (LEM) | Pe. Verneson Francisco de Souza | **Pe. Onildo Novais Rodrigues** |

**Duas paróquias ficaram com `priestName: null`** porque a página nova não nomeia ninguém e o nome
da forania está contraditado: **Santa Cruz (Cotegipe)** e **Santo Antônio (Roda Velha)**.

## Pontos para o enxame de validação

1. **Pároco de Cotegipe e de Roda Velha** — os dois `null` acima.
2. **Confissão sem dia em Santa Rafaela Maria** (`dayOfWeek: null`).
3. **Missa itinerante de Formosa do Rio Preto** — ter–sex 18h "na Zona Rural"; saber em quais das 34
   comunidades e com que rodízio.
4. **Roda Velha**: gravei `city: "São Desidério"` com `neighborhood: "Roda Velha"`, seguindo a
   Receita (Distrito Roda Velha, CEP 47827-000). O site da diocese escreve "Roda Velha, BA" como se
   fosse município. Conferir com quem conhece a região qual forma o app deve exibir.
5. **Angical publica três listas de comunidades** — sede (21), "Reforma Agrária de Angical" (13) e
   "Distrito de Missão de Aricobé" (13), com lugares repetidos entre elas sob padroeiros diferentes
   (Junco / São José e Junco / São José Operário; Benfica / Santa Cruz e Benfica / Bom Jesus;
   Mandacaru com três padroeiros). Mantive as três como publicadas, com o bloco de origem em
   `notes` de cada comunidade — **pode haver duplicata real**.
6. **Divergências de endereço site × Receita** em 8 paróquias (Cristópolis, Tabocas, Wanderley,
   Riachão das Neves, São Desidério, Santa Rita, Formosa, São José de Barreiras e São José de LEM).
   Gravei sempre o do **site** e anotei o da Receita em `notes`.
7. **Comunidades sem padroeiro publicado**: 23 rurais de Santa Rafaela Maria, 15 de Wanderley e
   "Parque da Cidade" de São Sebastião entraram como `Comunidade <lugar>`.

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

- `address`: hoje `"Curia Diocesana, Rua 26 de Maio 427"` → o site publica **"Rua 26 de Maio, 427,
  Centro"**; o prefixo "Curia Diocesana" pode sair.
- `zipCode` `47800-145`, `phone` `(77) 3611-5926`, `website` e `bishopName` **conferem** com o site.
- `email` continua `null`: o site não publica e-mail da cúria (só o `/contato` com telefone e
  WhatsApp **(77) 9 9995-5515**, que vale registrar).
