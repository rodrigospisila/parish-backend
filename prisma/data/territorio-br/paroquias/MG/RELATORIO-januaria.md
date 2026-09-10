# Diocese de Januária (MG) — relatório de pesquisa

- **Arquivo**: `paroquias/MG/januaria.json`
- **Slug**: `januaria` · **Sede**: Januária/MG · **Pesquisa**: 2026-09-10
- **Bispo**: Dom Dorival Souza Barreto Júnior (nomeado em 18/06/2025, posse canônica em 23/08/2025)
- **Criação**: 15/06/1957, pela bula *Laeto Auspicio* de Pio XII, desmembrada de Montes Claros e da
  Prelazia de Paracatu. Perdeu território para Paracatu (1964) e para a nova Diocese de Janaúba
  (2000). Sufragânea de Diamantina até 25/04/2001, depois de Montes Claros.
- **Território**: 38.187 km², 18 municípios, ~292.846 habitantes (dado da própria diocese);
  313.000 católicos em 349.600 habitantes segundo o catholic-hierarchy (2023). Clero: 32
  presbíteros (26 diocesanos e 6 da Congregação dos Missionários da Sagrada Família), 5 diáconos
  permanentes, 6 religiosas e 11 seminaristas.
- **Cúria**: Rua Gualberto de Almeida, 216 – Centro, 39480-000 Januária/MG · (38) 3621-1342 ·
  pascom@diocesedejanuaria.com.br · mitrajanuaria@hotmail.com

## Números

| Item | Quantidade |
|---|---|
| Registros no arquivo | **25** |
| — as 22 unidades declaradas pela diocese | 22 |
| — unidades extras reveladas pelo cadastro da Receita | 3 |
| Confiança dos registros | 15 `alta`, 8 `media`, 2 `baixa` |
| Com endereço e CEP | 24 de 25 |
| Comunidades/capelas | **18** (todas de uma única paróquia) |
| Horários fixos | **19** (13 missas, 4 terços, 2 adorações) |
| — confiança dos horários | 7 `alta`, 7 `media`, 5 `baixa` |
| Paróquias com ao menos um horário | 4 de 25 |
| Cidades distintas | 18 |

## A descoberta de método que destravou esta diocese

O site oficial só publica 8 paróquias. O que fechou a lista e deu **endereço, bairro, CEP e
telefone de praticamente todas** foi o **cadastro da Receita Federal**: todas as paróquias da
diocese são **filiais do CNPJ da Mitra Diocesana de Januária (raiz 21.463.187)**. Varrendo as
filiais 0001–0045 (calculando o dígito verificador) em `minhareceita.org` e `brasilapi.com.br`,
aparecem **29 filiais ativas** (0001 a 0029) e nenhuma a partir de 0030.

**Vale repetir isso em toda diocese cujo site esteja incompleto.** Dois vieses a respeitar:

1. A **data de início de atividade do CNPJ é cadastral, não a ereção canônica** — as filiais de 2010
   e 2014 são regularizações em bloco. Por isso `foundedYear` ficou `null` em quase tudo.
2. O **telefone (38) 3621-1342 é o da Cúria** e aparece repetido no cadastro de várias paróquias —
   não foi gravado como contato local em nenhuma delas.

O cadastro ainda traz filiais antigas de **Espinosa, Mato Verde e Monte Azul** (todas de 21/05/1971),
municípios que hoje pertencem à Diocese de Janaúba — resíduo cadastral, não paróquias atuais de
Januária. **Não foram gravadas.**

## Estrutura declarada pela diocese

A página "Quem somos" declara **20 paróquias, 1 pró-paróquia e 1 santuário diocesano** (= 22), em
**4 setores pastorais**:

| Setor | Sede | Municípios/unidades citados |
|---|---|---|
| Centro | Januária | Januária, Cônego Marinho, Bonito de Minas, Itacarambi, Pedras de Maria da Cruz, São Joaquim |
| Norte | Manga | Manga, Montalvânia, Miravânia, Juvenília, São João das Missões |
| Oeste | São Francisco | São Francisco, Chapada Gaúcha, São Romão, Icaraí de Minas, Serra das Araras |
| Sul | Urucuia | Urucuia, Santa Fé de Minas, Pintópolis, Riachinho |

Já a página "Paróquias" usa outra divisão, em **foranias** (Nossa Senhora das Dores, Nossa Senhora
Aparecida, São José e Nossa Senhora da Conceição). As duas convivem no mesmo site; o arquivo grava
`setorPastoral` para todos e `forania` só para os 8 registros em que ela é declarada.

## Fontes principais

1. **`https://diocesedejanuaria.com.br/paroquias/`** — detalha **apenas 8 paróquias** (forania,
   vigário forâneo, endereço, CEP, pároco, vigário, e-mail e telefones), em ordem alfabética,
   parando em "Nossa Senhora da Abadia – Pintópolis".
2. **`https://diocesedejanuaria.com.br/quem-somos/`** — marco situacional, setores pastorais, total
   de paróquias, área, clero e histórico.
3. **`https://minhareceita.org/<cnpj>`** (Receita Federal) — as 29 filiais do CNPJ da Mitra.
4. **`https://gcatholic.org/churches/local/janu0`** — 21 igrejas paroquiais por cidade, atualizado
   em 02/06/2026.
5. **`https://www.catholic-hierarchy.org/diocese/djanu.html`** — 22 paróquias (2023), sucessão
   episcopal, área, endereço da cúria.
6. **`https://www.sagradafamiliajanuaria.com`** — o **único site paroquial próprio** da diocese, e a
   única fonte com grade de missas e lista nominal de comunidades.
7. **`https://diocesedejanuaria.com.br/santuario-de-santo-antonio/`** — horários do Santuário.
8. **Notícias do site oficial** (inclusive capturas do site antigo no Arquivo da Internet) —
   confirmaram Itacarambi, Sagrada Família de Januária, Juvenília, Icaraí de Minas, Bonito de Minas,
   São João das Missões, Sagrada Família de Nazaré/São Francisco e a criação da Paróquia São Vicente
   de Paulo em Cônego Marinho.
9. **`https://mapaosc.ipea.gov.br`** — e-mails de Chapada Gaúcha e Urucuia.

## Cobertura

**22/22 das unidades declaradas, mais 3 reveladas pela Receita.** A aritmética fecha assim: as 21
igrejas paroquiais do GCatholic **mais** a Paróquia São Vicente de Paulo de Cônego Marinho (criada
em 16/06/2019, ainda ausente do GCatholic) = 22, o mesmo número do catholic-hierarchy (2023) e o
mesmo que a diocese declara (20 paróquias + 1 pró-paróquia + 1 santuário).

### Por que o site oficial não deu mais

Investigado e descartado: a página `/paroquias/` **não tem paginação** (`/paroquias/page/2/`,
`/page/3/` … devolvem HTTP 200 com exatamente o mesmo conteúdo das 8 primeiras); o WordPress
**não tem *custom post type*** de paróquia (`/wp-json/wp/v2/types` lista só posts, páginas e os
tipos do The Events Calendar); o site inteiro tem **10 páginas** (`/wp-json/wp/v2/pages` →
`X-WP-Total: 10`) e o `sitemap.xml` (All in One SEO) só expõe posts, páginas, categorias e tags.
O site foi reconstruído em 2025 (tema Astra + Elementor) e a lista de paróquias ficou pela metade.
O site antigo, no Arquivo da Internet (`/site/a-diocese/paroquias/`, captura de 2016), tem a página
"Endereço das Paróquias" **vazia**. Os decretos de **nomeações** de 21/11/2024, 27/11/2024 e
07/02/2025, que provavelmente trazem a escala completa de párocos, foram publicados como **imagens
escaneadas** e esses arquivos hoje retornam 404 no servidor.

## O que ficou de fora / precisa de validação humana

### 1. ⚠️ Três unidades que só o cadastro da Receita conhece

| Registro | Cidade | CNPJ (inscrição) | Confiança | Situação |
|---|---|---|---|---|
| Paróquia Sagrada Família de Nazaré | São Francisco | 21.463.187/0029-30 (06/07/2021) | `media` | Confirmada por **duas notícias do site diocesano** (pároco Pe. Ismael Rodrigues de Oliveira, 2023; vigário Pe. Eduardo Martins de Meira, 2024). É a **terceira** paróquia de São Francisco e é distinta da Sagrada Família de Januária — o GCatholic lista "Sagrada Familia" só sob Januária, daí a confusão. |
| Paróquia Nossa Senhora Rainha da Paz | Januária (Riacho da Cruz) | 21.463.187/0028-50 (30/03/2021) | `baixa` | Só a Receita. Pode ser paróquia recente ainda não publicada, ou comunidade com CNPJ próprio. |
| Paróquia Nossa Senhora do Amparo | Januária (Brejo do Amparo) | 21.463.187/0002-10 (21/05/1971) | `baixa` | Igreja histórica do distrito. Provavelmente hoje é comunidade da Catedral. Registrada como indício. |

**Consequência aritmética**: se a Sagrada Família de Nazaré for de fato paróquia, a diocese tem 23,
não 22 — e nem o GCatholic nem o catholic-hierarchy a contam. **É o ponto que mais precisa de
confirmação da cúria.** As duas em `baixa` não entram na carga.

Resultado do levantamento por cidade: **Januária tem até 5 unidades** (Catedral N. Sra. das Dores;
Sagrada Família; Pró-paróquia São Joaquim; N. Sra. Rainha da Paz/Riacho da Cruz; N. Sra. do
Amparo/Brejo do Amparo) e **São Francisco tem 3 paróquias** (N. Sra. Aparecida, São José e Sagrada
Família de Nazaré). **Itacarambi tem apenas uma** — não há segunda paróquia lá.

### 2. Horários: só 4 de 25, e só 2 em fonte oficial atual

| Paróquia | Horários | Fonte | Confiança |
|---|---|---|---|
| Sagrada Família — Januária | 7 missas (Dom 09h e 19h; Seg, Ter, Qui, Sex e Sáb 19h) | site próprio `sagradafamiliajanuaria.com`, ativo (notícias de set/2026) | `alta` |
| Santuário de Santo Antônio — Serra das Araras | 3 missas, 3 terços, 1 adoração | página do site diocesano, publicada em **04/12/2022** | `media` |
| Senhor Bom Jesus — Bonito de Minas | 1 missa, 1 terço, 1 adoração | Portal Minas Gerais (Setur-MG), captura do Arquivo da Internet de **16/01/2020** | `baixa` |
| Sagrado Coração de Jesus — Itacarambi | 1 missa dominical | **indício** em notícia do site diocesano de 07/01/2025 ("logo após a Santa Missa Dominical das 19:00") | `baixa` |

**21 unidades ficaram sem nenhum horário.** Detalhes:

- A Sagrada Família de Januária publica também "Quarta: só tem missa em datas festivas" — **não
  gravado**, por não ser horário fixo.
- O Santuário publica "(último domingo do mês, Santa Missa às 09h da manhã)" — **recorrência
  mensal**, gravada com `baixa` e a regra literal em `notes`; a página não diz se substitui a das
  19h. A festa de Santo Antônio (13 de junho, com romaria de 09 a 14) é data especial e não foi
  gravada.
- Bonito de Minas: a fonte é de 2020 e não é da paróquia; a missa dominical não aparece nela.
- **Nenhuma Celebração da Palavra foi encontrada** — não houve nada a descartar nesse quesito.

Por que faltam: nenhuma dessas paróquias tem site próprio nem verbete em agregador com horários.
O `horariodemissa.com.br` tem fichas de Januária, Manga, Montalvânia, São Francisco, São Romão,
Pedras de Maria da Cruz, Itacarambi e Urucuia, mas **todas com zero horários** e atualizações de
2013/2019. Os horários estão em posts e imagens de Facebook/Instagram, que exigem login (testado
inclusive proxy de leitura — retornou tela de login). **É a maior lacuna do arquivo**, e o caminho é
contato direto com a Pascom diocesana.

### 3. Comunidades: só as 18 da Sagrada Família de Januária

É a única fonte com lista nominal, publicada no site próprio da paróquia em dois setores:

- **Setor Pe. Berthier**: São Paulo (Boa Vista), São Cristóvão (Bom Jardim), N. Sra. de Nazaré
  (Estância Nazaré), Santa Rosa de Lima (Moradeiras), N. Sra. de Fátima (Novo Milênio), Santo
  Antônio (Cidade), São Vicente de Paulo, São Pedro (Cidade), Comunidade Matriz Sagrada Família,
  N. Sra. dos Pobres.
- **Setor Apóstolo Paulo**: Imaculada Conceição (Marreca), Sagrado Coração de Jesus (Tanque), São
  Pedro (Pau D'Óleo), São Raimundo Nonato (Sítio Novo), N. Sra. de Guadalupe (Tatu), Pas Cavalo,
  N. Sra. Rainha da Paz (Umburana), N. Sra. das Graças (Umburana II).

Duas comunidades chamam-se "São Pedro"; para não se fundirem na carga nem confundirem o casamento
de horário, ficaram gravadas como "São Pedro – Cidade" e "São Pedro – Pau D'Óleo". "Pas Cavalo" é a
grafia literal da fonte (provável abreviação de "Passagem do Cavalo"). Note que a **Comunidade São
Vicente de Paulo** desta lista é a que virou a Paróquia São Vicente de Paulo de Cônego Marinho em
2019 — a lista do site pode estar desatualizada nesse ponto.

### 4. Divergências de nome e status

- **São João das Missões**: a Receita Federal ("PAROQUIA SAO JOAO BATISTA DE SAO JOAO DAS MISSOES")
  e a própria diocese (notícia de 07/01/2025: "padre Diego (Paróquia São João Batista, São João das
  Missões)") dizem **São João Batista**; o GCatholic diz "Sagrado Coração de Jesus". **Adotado São
  João Batista**; o GCatholic parece desatualizado.
- **Icaraí de Minas**: o site da diocese a chama de "Paróquia **Imaculada** Conceição"; a Receita e
  o GCatholic usam "Nossa Senhora da Conceição". Gravado o segundo, com a divergência em `notes`.
- **Pró-paróquia São Joaquim**: a Receita registra "PAROQUIA SAO JOAQUIM DO DISTRITO DE SAO JOAQUIM"
  e o GCatholic, "Igreja São Joaquim (Parish)"; só a página "Quem somos" diz "Pró-Paróquia".
  Gravada como pró-paróquia, cidade **Januária**, `neighborhood` "Distrito de São Joaquim".
- **Padre em duas paróquias ao mesmo tempo**: **Padre João Rafael Urcine de Araújo** aparece como
  pároco de Juvenília (notícia de posse, 02/10/2024) **e** de São Romão (página `/paroquias/`,
  modificada em 03/08/2025). Provável transferência posterior — gravado nas duas, com a ressalva em
  `notes`.
- **Contagem do Setor Centro**: a página "Quem somos" diz "6 Municípios/Paróquias e uma
  Pró-Paróquia" mas lista 6 nomes (Januária, Cônego Marinho, Bonito de Minas, Itacarambi, Pedras de
  Maria da Cruz e São Joaquim). O Setor Oeste diz "5 Municípios/Paróquias e um Santuário Diocesano"
  listando 5 nomes, sendo que Serra das Araras é distrito de Chapada Gaúcha (o santuário), não
  município.
- **Municípios divergentes**: a Wikipédia lista 16 municípios; a diocese declara 18. Faltam na
  Wikipédia **Cônego Marinho** e **Santa Fé de Minas**.

### 5. Divergências de endereço (site x Receita x agregador)

| Paróquia | Site da diocese | Receita Federal | Gravado |
|---|---|---|---|
| Catedral N. Sra. das Dores | Praça Dom Daniel, **112** | Praça Dom Daniel, **96** (agregador: 134) | o do site |
| N. Sra. Aparecida — Riachinho | Rua São Sebastião, **384** | Rua São Sebastião, **684** | o do site |
| N. Sra. da Abadia — Pintópolis | Rua Germano Pinto | Rua Juscelino Kubitschek, 238 | o do site |
| Divino Espírito Santo — São Romão | Praça Padre Paulo Matulinski, 02 | Rua Major Teófilo, 200 | o do site |
| N. Sra. da Conceição — Urucuia | (não publicado) | Avenida Vicente Lima, **67** (agregador: Rua Vicente Lima, 57) | o da Receita |
| São José — São Francisco | (não publicado) | "Casa Paroquial, s/n, Centro" (agregador: Praça Januária, 141) | Praça Januária, 141 |

### 6. Outros pontos

- **`foundedYear` só em 2 registros**: Sagrada Família de Januária (**1965** — criada em 21/07/1965
  por Dom João Batista, MSF, com 1ª missa em 22/07/1965 na Capela Santa Cruz) e São Vicente de Paulo
  de Cônego Marinho (**2019** — 16/06/2019, missa presidida por Dom José Moreira). Itacarambi
  celebrou 60 anos em 2024/2025 (≈1964/1965) mas sem data exata → `null`. Um resultado de busca
  sugeria 06/11/1866 para a São José de São Francisco — **não confirmado, não gravado**.
- **Padres só pelo prenome**: "Padre Tiago" e "Padre Ricardo" (N. Sra. Aparecida/São Francisco),
  "Padre Paulo Roberto" (vigário forâneo, Riachinho), "Padre Diego" (São João das Missões),
  "Padre Claudeslei" (São José/São Francisco — registro de 2019, grafado "Causdelei" em outro
  cadastro, provavelmente desatualizado).
- **CEP de Riachinho é 38640-000**, faixa de Unaí/Noroeste de Minas. Está correto (Riachinho fica na
  divisa), mas chama atenção.
- **Decreto de 23/08/2025**: na posse, Dom Dorival confirmou em seus ofícios todos os párocos,
  administradores e vigários paroquiais — os nomes de 2024/2025 seguem válidos salvo mudança
  posterior.

### 7. ⚠️ Armadilhas confirmadas (não caia nelas na validação)

- **"Paróquia de São Roque"** (`diocesedejanuaria.com.br/paroquia-de-sao-roque/`): **NÃO é desta
  diocese e NÃO foi incluída no arquivo.** A URL hoje dá HTTP 404 e a página sumiu da listagem do
  WordPress. A captura do Arquivo da Internet (publicada em 02/06/2025, arquivada em 12/06/2025)
  descreve uma igreja "fundada em meados do século XVII", reformada "por volta de 1836… concluída em
  1837", reconstruída "em 1937", "mais antiga que a própria cidade… antes mesmo da **Estância
  turística** ser reconhecida como município", com documentos "realocados para a guarda da
  **Arquidiocese de São Paulo**". É a **Igreja Matriz de São Roque, da Estância Turística de São
  Roque/SP (Diocese de Osasco)** — texto praticamente idêntico ao verbete da Wikipédia, com as datas
  conferindo uma a uma. Foi conteúdo publicado por engano e depois removido.
- **Cônego Marinho**: um resultado de busca traz "pároco Cônego João Francisco Ribeiro, vigário Pe.
  Mauro Lúcio de Carvalho, criada em 24/07/2023" — são dados da **Diocese de Patos de Minas**.
  Descartado.

### 8. ⚠️ O site oficial da diocese está comprometido

As páginas `/paroquias/` e `/quem-somos/` trazem **blocos de links de spam de SEO injetados**
(`mostbet`, `pin up kz`, `1win`, `lucky jet` — cassinos), e cerca de 100 dos posts recentes do
WordPress são lixo injetado. O conteúdo eclesiástico continua íntegro e foi isolado via `wp-json`,
mas o site aparenta estar invadido. Vale avisar a diocese e **reconferir esses dados numa segunda
rodada**, porque um site comprometido pode ter conteúdo alterado sem que se perceba.
