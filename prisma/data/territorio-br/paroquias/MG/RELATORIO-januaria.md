# Diocese de Januária (MG) — relatório de pesquisa

- **Arquivo**: `paroquias/MG/januaria.json`
- **Slug**: `januaria` · **Sede**: Januária/MG · **Pesquisa**: 2026-09-10
- **Bispo**: Dom Dorival Souza Barreto Júnior (nomeado em 18/06/2025)
- **Criação**: 15/06/1957, pela bula *Laeto Auspicio* de Pio XII, desmembrada de Montes Claros e da
  Prelazia de Paracatu. Perdeu território para Paracatu (1964) e para a nova Diocese de Janaúba
  (2000). Sufragânea de Diamantina até 25/04/2001, depois de Montes Claros.
- **Território**: 38.187 km², 18 municípios, ~292.846 habitantes (dado da própria diocese);
  313.000 católicos em 349.600 habitantes segundo o catholic-hierarchy (2023).

## Números

| Item | Quantidade |
|---|---|
| Registros no arquivo | **22** |
| — com dados completos (site oficial) | 8 |
| — só nome + cidade | 14 |
| Confiança | 11 `alta`, 11 `media`, 0 `baixa` |
| Comunidades/capelas | **0** |
| Horários fixos | **0** |
| Cidades distintas | 16 |

## Estrutura declarada pela diocese

A página "Quem somos" do site oficial declara **20 paróquias, 1 pró-paróquia e 1 santuário
diocesano** (= 22), em **4 setores pastorais**:

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

1. **`https://diocesedejanuaria.com.br/paroquias/`** — página oficial. Detalha **apenas 8
   paróquias** (forania, vigário forâneo, endereço, CEP, pároco, vigário, e-mail e telefones), em
   ordem alfabética, parando em "Nossa Senhora da Abadia – Pintópolis".
2. **`https://diocesedejanuaria.com.br/quem-somos/`** — marco situacional: municípios, setores
   pastorais, total de paróquias, área, clero (32 presbíteros, 5 diáconos permanentes, 6
   religiosas, 11 seminaristas) e histórico da criação da diocese.
3. **`https://gcatholic.org/churches/local/janu0`** — **a fonte que fechou a lista**: 21 igrejas
   paroquiais da diocese, por cidade, atualizada em 02/06/2026.
4. **`https://www.catholic-hierarchy.org/diocese/djanu.html`** — 22 paróquias (dados de 2023),
   sucessão episcopal, área, endereço da cúria.
5. **Notícias do próprio site** (inclusive versões arquivadas do site antigo em
   `diocesedejanuaria.com.br/site/…`) — confirmaram a Paróquia Sagrado Coração de Jesus de
   Itacarambi, a Paróquia Sagrada Família de Januária e a **criação da Paróquia São Vicente de
   Paulo em Cônego Marinho** (por volta de 2019).

## Cobertura

**22/22 em nomes**, mas com qualidade de dado muito desigual: **8 registros completos e 14 só com
nome, cidade e setor**.

Como o número 22 fecha: as 21 igrejas paroquiais do GCatholic **mais** a Paróquia São Vicente de
Paulo de Cônego Marinho, criada por volta de 2019 e ainda ausente do GCatholic. Isso bate com as
22 paróquias do catholic-hierarchy (2023) e com as "20 paróquias + 1 pró-paróquia + 1 santuário"
declaradas pela diocese.

### Por que o site oficial não deu mais

Investigado e descartado: a página `/paroquias/` **não tem paginação** (`/paroquias/page/2/`,
`/page/3/` … devolvem HTTP 200 com exatamente o mesmo conteúdo das 8 primeiras); o WordPress
**não tem *custom post type*** de paróquia (`/wp-json/wp/v2/types` lista só posts, páginas e os
tipos do The Events Calendar); o site inteiro tem **10 páginas** (`/wp-json/wp/v2/pages` →
`X-WP-Total: 10`) e o `sitemap.xml` (All in One SEO) só expõe posts, páginas, categorias e tags.
O site foi reconstruído em 2025 (tema Astra + Elementor) e a lista de paróquias ficou pela metade.
O site antigo, no Arquivo da Internet (`/site/a-diocese/paroquias/`, captura de 2016), tem a página
"Endereço das Paróquias" **vazia** — o conteúdo devia estar em imagem ou PDF já perdido.

## O que ficou de fora / precisa de validação humana

### 1. As 14 paróquias sem endereço, telefone, e-mail nem pároco

Bonito de Minas (Senhor Bom Jesus), Chapada Gaúcha (Santo Agostinho), Icaraí de Minas (N. Sra. da
Conceição), Itacarambi (Sagrado Coração de Jesus), Januária (Sagrada Família), Juvenília (N. Sra.
de Fátima), Miravânia (Sagrado Coração de Jesus), Santa Fé de Minas (N. Sra. da Conceição), São
Francisco (São José), São João das Missões (Sagrado Coração de Jesus), Januária/distrito de São
Joaquim (Pró-paróquia São Joaquim), Chapada Gaúcha/Serra das Araras (Santuário Diocesano de Santo
Antônio), Urucuia (N. Sra. da Conceição) e Cônego Marinho (São Vicente de Paulo).

Onze delas ficaram com `confidence: "media"` — o nome vem do GCatholic (fonte secundária idônea)
corroborado pela página "Quem somos" do próprio site. Três subiram para `alta` por terem
confirmação direta em página ou notícia do site diocesano: Itacarambi, Sagrada Família (Januária) e
o Santuário de Serra das Araras.

### 2. Zero horários de missa e zero comunidades

**Nenhuma** das fontes consultadas publica horário fixo de missa, nem lista de comunidades.
O site diocesano não tem essa seção; a Catedral tem canal no YouTube
(`youtube.com/@catedraldiocesanadejanuari8589`) usado para transmissões, mas sem grade fixa
publicada em página consultável.

Esta é a **maior lacuna do arquivo** e o item nº 1 para uma segunda rodada: precisa de contato
direto (a Pascom diocesana é `pascom@diocesedejanuaria.com.br`, telefone (38) 3621-1342) ou de
raspagem das páginas de Facebook/Instagram das paróquias.

### 3. Pontos que precisam de confirmação humana

- **Pró-paróquia São Joaquim**: a diocese declara "uma Pró-Paróquia" no Setor Centro e cita "São
  Joaquim"; o GCatholic registra "Igreja São Joaquim (Parish)" na localidade de São Joaquim. Ficou
  gravada como "Pró-paróquia São Joaquim", cidade **Januária**, `neighborhood` "Distrito de São
  Joaquim". Confirmar o status e o município.
- **Segunda paróquia em São Francisco**: o GCatholic lista "Igreja São José (Parish)" além da
  Paróquia Nossa Senhora Aparecida. O site da diocese só cita São Francisco uma vez. Confirmar se a
  Paróquia São José existe de fato.
- **Contagem do Setor Centro**: a página "Quem somos" diz "6 Municípios/Paróquias e uma
  Pró-Paróquia" mas lista 6 nomes (Januária, Cônego Marinho, Bonito de Minas, Itacarambi, Pedras de
  Maria da Cruz e São Joaquim) — ou falta um nome, ou São Joaquim é a pró-paróquia e são 5
  municípios. Da mesma forma, o Setor Oeste diz "5 Municípios/Paróquias e um Santuário Diocesano"
  listando 5 nomes, sendo que Serra das Araras é distrito de Chapada Gaúcha (o santuário), não
  município.
- **Municípios divergentes**: a Wikipédia lista 16 municípios; a diocese declara 18. Faltam na
  Wikipédia **Cônego Marinho** e **Santa Fé de Minas** — ambos confirmados como território da
  diocese pela página "Quem somos".
- **"Paróquia de São Roque"**: existe a página `diocesedejanuaria.com.br/paroquia-de-sao-roque/`
  (capturada pelo Arquivo da Internet em 12/06/2025), mas ela não aparece na listagem oficial nem
  no GCatholic. **Não foi incluída no arquivo.** Precisa ser verificada.
- **Padres identificados só pelo prenome**: "Padre Tiago" e "Padre Ricardo" (Paróquia Nossa Senhora
  Aparecida de São Francisco) e "Padre Paulo Roberto" (vigário forâneo, Riachinho) foram gravados
  como publicados.
- **Endereço e CEP publicados como "–"** na Paróquia Nossa Senhora Aparecida de São Francisco →
  `null` no arquivo.
- **CEP da Paróquia Nossa Senhora Aparecida de Riachinho é 38640-000**, faixa de Unaí/Noroeste de
  Minas, e não da região de Januária. Está correto (Riachinho fica na divisa), mas chama atenção.
- **`foundedYear` = `null` em todas as 22**: nenhuma fonte publica ano de criação de paróquia. Só se
  sabe que a Paróquia Sagrada Família de Januária foi fundada por volta de **1965** (notícias do
  site antigo celebravam 52 anos em 2017, 53 e 54 anos depois) — não gravado, por não haver data
  exata.
- **Cúria**: o endereço "Rua Gualberto de Almeida, 216" vem do catholic-hierarchy; o site oficial só
  publica telefone e e-mail da Pascom. Sem CEP.

### 4. ⚠️ O site oficial da diocese está comprometido

As páginas `/paroquias/` e `/quem-somos/` trazem **blocos de links de spam de SEO injetados**
(`mostbet`, `pin up kz`, `1win`, `lucky jet` — cassinos), visíveis no HTML renderizado e no texto
extraído. O conteúdo eclesiástico continua íntegro e foi usado normalmente, mas o site aparenta
estar invadido. Vale avisar a diocese e, sobretudo, **reconferir esses dados numa segunda rodada**,
porque um site comprometido pode ter conteúdo alterado sem que se perceba.
