# Diocese de Oeiras (PI) — relatório de pesquisa

- **Arquivo**: `paroquias/PI/oeiras.json`
- **Data da coleta**: 2026-09-17
- **Cobertura**: **21 / 17 — todas `alta`**: 18 paróquias (a Catedral incluída) + 3 áreas pastorais (São
  João da Varjota, Barra D'Alcântara e São Miguel do Fidalgo). O Anuário Pontifício 2024 dá 17 (dados de
  2023); a 18ª é a Imaculada Conceição de Francisco Ayres, elevada em 29/11/2021
- **Comunidades**: 23 (21 igrejas-sede + 2 igrejas de Oeiras) — **a diocese não publica capelas**
- **Horários fixos**: 58 — **1 `media`, 57 `baixa`**. A diocese tem grade oficial, mas ela é de 2019
- 19 municípios com sede de unidade (o território tem 21: Floresta do Piauí é atendida por Santo Inácio e
  Cajazeiras do Piauí por Santa Rosa)
- **Sé vacante** desde 13/05/2026 — `bishopName: null`

## Fontes principais

| Fonte | Uso |
|---|---|
| `https://diocesedeoeiras.org/paroquias/` | Lista canônica: 21 fichas em 4 setores |
| `https://diocesedeoeiras.org/wp-json/wp/v2/posts?slug=<ficha>` | Texto de cada ficha e a data `modified` (as fichas são *posts* da categoria "Paroquias", 21 itens) |
| `…/wp-json/wp/v2/posts?categories=129` | Os **48 lançamentos da grade "Horários de Missa"** com data de criação e de alteração |
| Decretos de nomeação no próprio site (25/11/2022, 10/07/2024, 16/12/2024, 26/12/2025) e o comunicado das posses (02/01/2026) | `priestName` atual — 8 das 21 fichas estão com o pároco vencido, em branco ou duplicado |
| `https://minhareceita.org/<cnpj>` | **Prova de completude**: filiais do CNPJ 06.577.100 (Diocese de Oeiras) |
| `buscamissa.com.br` (10 fichas) e `liriocatolico.com.br` (8 fichas) | Horários — ver abaixo por que não sobem a confiança |
| `https://www.catholic-hierarchy.org/diocese/doeir.html` | 17 paróquias (AP 2024); sé vacante |

Plataforma Parresia (WordPress + Elementor). Aqui, ao contrário de Campo Maior e Picos, **a REST entrega
o texto inteiro da ficha** em `content` — o HTML foi baixado só para conferência (as 21 batem).

## Como a lista foi fechada

As 21 fichas do site batem com a Receita Federal: a matriz do CNPJ (0001, Rua Prof. Rafael Farias, 534) e
**18 filiais paroquiais ativas — 0002, 0003 e 0008 a 0023 —, uma por paróquia, sem sobra**. As ordens
0004 a 0007 são as antigas filiais de Floriano e Itaueira, baixadas em 16/04/2008, quando a diocese de
Oeiras-Floriano foi dividida. A varredura foi até a ordem 0045 sem achar mais nada. As 3 áreas pastorais
não têm CNPJ, como esperado. As próprias fichas publicam o CNPJ de cada paróquia, e todos conferem.

Seis fichas guardam o endereço antigo `area-pastoral-…` mas já são paróquia no título, na data de criação
e na Receita: Santo Antônio (Colônia do Piauí), Senhora Sant'Ana (Arraial), Imaculada Conceição (Francisco
Ayres), N. Sra. da Conceição (Conceição do Canindé), Sant'Ana e São Joaquim (Isaías Coelho) e São José
(Paes Landim). Paes Landim pertencia à Diocese de São Raimundo Nonato: lá a filial foi baixada em
18/07/2008 e a de Oeiras abriu em 14/05/2009.

## Horários: por que quase tudo ficou `baixa`

A página `/horarios-de-missa/` tem data de 25/06/2020 e está ligada na barra lateral de todas as páginas.
Parece atual, mas a REST mostra a verdade: **os 48 lançamentos foram criados em 09/10/2019 e nunca
alterados** (`date` = `modified` = 2019-10-09 em todos). É texto pré-pandemia → `baixa` pela regra do
README.

Os agregadores não salvam:

- **BuscaMissa** tem 10 paróquias desta diocese com selo "Confirmado", mas as fichas são **cópia literal
  do site da diocese** — mesmos endereços (até "Av: Vereador…" e "Rua: Né Felismina" com os dois-pontos),
  mesmos e-mails pessoais dos padres e a mesma grade de 2019. A cópia foi feita por nome: a ficha de Bela
  Vista do Piauí soma "19h00 19h30" porque juntou as duas paróquias São José (Bela Vista e Paes Landim).
  A raspagem é de 2026 (já traz o Pe. Welson em Simplício Mendes, empossado em 02/2026, e ainda o Pe.
  Rogério em Socorro), mas o horário que ela carrega é o de 2019. **O selo "Confirmado" aqui não é
  confirmação independente.**
- **Lírio Católico** parece independente (endereços diferentes, igrejas que a diocese não lista) e repete a
  grade em Catedral, Sagrada Família, Rosário, Campinas e Barra D'Alcântara — mas não tem data de ficha, e
  a ficha da Catedral herdou endereço e telefone de um cadastro de 2013 do Horário de Missa. Agregador sem
  data + página oficial pré-pandemia não sobe. A coincidência está anotada em cada horário, para o enxame.

**O único `media`**: domingo 7h30 na Matriz da Sagrada Família. A grade de 2019 e o Lírio dão esse
horário, e a própria diocese marcou a posse canônica do novo pároco para o **domingo 01/03/2026 às 7h30,
na Igreja Matriz** (comunicado de 02/01/2026 e notícia de 02/03/2026) — sinal oficial e atual de que a
missa dominical da manhã continua nesse horário. As outras posses de 2026 também coincidem com a grade
(Catedral sexta 19h, Socorro quarta 19h, Simplício Mendes sexta 19h), mas 19h é o horário genérico de toda
missa de posse, e a de São Francisco de Assis do Piauí caiu num sábado 19h que a grade não tem — por isso
não foram promovidas.

`baixa` só do Lírio: terça 19h na Catedral; quinta 19h e confissões (quinta e domingo 18h30) em Campinas;
domingo 7h e adoração de quinta 19h em Várzea Grande (diverge da grade, que dá domingo 19h); adoração de
quinta 19h em Barra D'Alcântara; e as missas das igrejas N. Sra. da Conceição e São Vicente de Paulo.

Instagram e Facebook das paróquias (@paroquiadavitoriaoeiras, @paroquiasaofranciscodeassis__) devolvem
tela de login ao leitor automático; não foi possível conferir postagens.

## Decisões tomadas

- **Nomes**: a diocese escreve "Paróquia de Nossa Senhora da Vitória", "Paróquia da Sagrada Família";
  ficou `Catedral Nossa Senhora da Vitória`, `Paróquia Sagrada Família` etc., com a cidade em `city` no
  nome oficial do município (Colônia **do Piauí**, Santa Rosa **do Piauí**, Tanque **do Piauí**, Socorro
  **do Piauí**, Bela Vista **do Piauí**, Barra D'Alcântara).
- **`address` = endereço da igreja matriz**; secretaria, casa paroquial e horário de atendimento foram
  para `notes`.
- **`priestName` vem do decreto mais novo, não da ficha**, quando os dois divergem: Sagrada Família
  (Pe. Possidônio, posse 01/03/2026), Rosário (Pe. José Geraldo de Albuquerque, SDB, administrador),
  Bela Vista (Pe. Juarez Donato), São Francisco de Assis do Piauí (Frei Antônio José da Silva, OFMConv.,
  administrador), Barra D'Alcântara (Pe. Benedito, pároco de Várzea Grande), São Miguel do Fidalgo
  (Pe. Nailson, pároco de Paes Landim), Campinas (Pe. Odair — a ficha deixa o campo em branco) e
  Colônia (a ficha traz dois párocos; vale o Pe. Julielmo).
- **E-mail**: só os institucionais foram gravados (Catedral, Várzea Grande, Isaías Coelho). As fichas
  publicam o e-mail **pessoal do padre** sob o nome dele; como 8 fichas estão com o padre vencido ou em branco, esses
  endereços ficaram `null`. Anulado também o de Francisco Ayres, que tem cedilha e til
  (`imaculadaconceição1978@…`).
- **Telefone**: o primeiro da ficha; o segundo contato da Catedral foi para `notes`.
- **Igrejas não paroquiais**: o **Santuário Santa Isabel** (diocesano, à beira do rio, em Campinas do
  Piauí; reitor Pe. Kleyton em 11/2025) não tem missa fixa publicada e ficou de fora, citado nas notas
  de Campinas.

## Precisa de validação humana

1. **Horários**: 57 de 58 estão `baixa`. Se alguém da diocese confirmar que a grade de 2019 continua
   valendo, os 48 lançamentos oficiais podem subir de uma vez — é a decisão de maior ganho aqui.
2. **Socorro do Piauí está vacante**: o Pe. Rogério Nascimento Santos, empossado em 11/02/2026, faleceu em
   08/2026; em 31/08 o Colégio de Consultores ainda ia decidir a sucessão. `priestName: null`.
3. **Conceição do Canindé**: a ficha é de 07/2020 e nenhum decreto de 2022–2025 cita a paróquia. Gravado o
   Pe. João Francisco dos Santos, da ficha — confirmar.
4. **Santa Rosa do Piauí** (ficha de 02/2023) e **Tanque do Piauí** (06/2023): párocos do decreto de
   25/11/2022, sem notícia posterior de mudança.
5. **Igreja N. Sra. da Conceição (Praça Mafrense, Oeiras)**: ligada à Catedral por inferência — a notícia
   de 10/12/2025 mostra o vigário e os coroinhas da Catedral na missa da padroeira. Comunidade `media`.
6. **Igreja São Vicente de Paulo (R. João Ferraz, 957, Oeiras)**: só o Lírio; atribuída à Sagrada Família
   pelo endereço. Comunidade `baixa`.
7. **Francisco Ayres na grade**: aparece como "Área Pastoral de Nossa Senhora da Conceição – José Ferreira,
   355", endereço que a ficha não tem. Identificada por eliminação (Conceição do Canindé está na grade como
   "Paróquia de N. Sra. da Conceição – Praça Central").
8. **Barra D'Alcântara**: a ficha dá Rua José Raimundo dos Santos, 25, para igreja, secretaria e casa
   paroquial; a grade e o Lírio situam a igreja na Av. Francisco Guedes de Sousa (nº 100 × nº 496).
9. **Paes Landim**: a ficha diz Travessa São Pedro, **70**; a grade, **170**; a Receita, s/n.
10. **Catedral**: a Receita registra a filial na Praça Visconde da Parnaíba, 159; a ficha dá a igreja na
    Praça das Vitórias e a secretaria na Av. Cônego Acelino Portela, 72.
11. **Área Pastoral de São João da Varjota**: o único telefone é o celular do padre (DDD 86), cedido por
    convênio pela Arquidiocese de Teresina.

## Correções sugeridas para o `dioceses.json` (não aplicadas)

- `email`: **contato@diocesedeoeiras.org** (página Contato). A página Governo Diocesano (10/2023) usa
  `diocesedeoeiras@yahoo.com.br`.
- `bishopName`: continua `null` — **sé vacante desde 13/05/2026** (Dom Edilson Soares Nobre nomeado para
  Guarabira/PB). Administrador Diocesano desde 06/07/2026: **Pe. Kleyton Vieira da Silva**.
- `address`: "Avenida Professor Rafael Farias, 534 – Centro" (hoje sem o bairro e sem acento).
