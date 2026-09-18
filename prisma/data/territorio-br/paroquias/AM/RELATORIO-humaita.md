# Relatório — Diocese de Humaitá (AM)

Pesquisa: 2026-09-18. Arquivo: `paroquias/AM/humaita.json`.

## Resultado

| Métrica | Valor |
|---|---|
| Entradas de paróquia | **11** (8 paróquias + 3 áreas missionárias) |
| Confiança das entradas | 11 `alta` |
| Comunidades/capelas | 206 (11 matrizes + 195 comunidades) |
| Horários fixos | **4** — todos `media`, todos MASS, todos de **uma só paróquia** |
| Cobertura | 11/11 (100%), com prova independente do gcatholic.org |

## Fonte principal — REST do WordPress com tipo `paroquias`

`https://diocesedehumaita.com.br` é WordPress com o tema **Parresia** (o mesmo de Tefé e de Lábrea),
e aqui o tema **expõe um tipo de conteúdo próprio**: `/wp-json/wp/v2/types` lista `paroquias` e
`clero`, e `/wp-json/wp/v2/paroquias?per_page=100` devolve **`X-WP-Total: 11`** fichas de uma vez.
O `acf` vem vazio na API — como em Tefé, os campos ACF só aparecem na **ficha renderizada**
(`/paroquias/<slug>/`), que publica:

**Decanato, Ano da criação, E-mail (ofuscado pelo Cloudflare → `data-cfemail`), Telefone,
Secretária(s), Expediente da Secretaria, Endereço com CEP, bloco de Clero com a função de cada um,
repetidor de Comunidades (`dce-acf-repeater-item`: `<h6>`=nome, `<p>`=setor) e bloco Celebrações.**

A taxonomia de categorias (`/wp-json/wp/v2/categories`) resolve o município de cada ficha: há um ramo
**Cidades** (Humaitá, Manicoré, Apuí, Outros Municípios) e um ramo **Decanatos** (Humaitá, Manicoré,
Apuí).

Corroboração: **gcatholic.org** (`huma0.htm`) registra **"8 parishes, 1 mission"** na estatística de
2022, 135.000 km², 83.000 católicos. Bate: as áreas missionárias de São Francisco de Assis e de
Cachoeirinha foram criadas em 2021 e 2025.

### As 11 entradas

| Entrada | Cidade | Decanato | Criação | `modified` |
|---|---|---|---|---|
| Catedral Imaculada Conceição | Humaitá | Humaitá | 1889 | 26/05/2025 |
| Paróquia São Francisco | Humaitá | Humaitá | 1987 | 28/03/2026 |
| Paróquia São Domingos Sávio | Humaitá | Humaitá | 1987 | 21/05/2025 |
| Paróquia Santo Antônio de Pádua | Manicoré (Km 180 / Matupi) | **Apuí** | 1991 | 06/08/2025 |
| Paróquia Maria Auxiliadora dos Cristãos | Manicoré | Manicoré | 1962 | 21/05/2025 |
| Paróquia Nossa Senhora das Dores | Manicoré | Manicoré | *(campo vazio)* | 21/05/2025 |
| Paróquia N. Sra. Auxiliadora do Uruapiara | Manicoré | Manicoré | 05/05/1968 | 21/05/2025 |
| Paróquia São Sebastião | Apuí | Apuí | 1996 | 21/05/2025 |
| Á. M. Nossa Senhora de Nazaré (Beiradão) | **?** | **—** | 2000 | 20/02/2025 |
| Á. M. São Francisco de Assis | Humaitá (Realidade) | Humaitá | 2021 | 10/06/2026 |
| Á. M. Santo Antônio (Cachoeirinha) | Manicoré | Manicoré | 2025 | 20/02/2025 |

## Horários — a diocese quase não publica

O bloco **"Celebrações" existe nas 11 fichas e está VAZIO em 10**. A única exceção é a
**Paróquia São Sebastião (Apuí)**, e o conteúdo é um **cartaz em imagem** — o truque do README.
Baixei e li a imagem para conferir, em vez de confiar no nome do arquivo:

> **HORÁRIOS DAS MISSAS — IGREJA MATRIZ**
> • SEGUNDA-FEIRA ÁS 18:00 HORAS • QUARTA-FEIRA ÁS 19:30 HORAS
> • SÁBADO ÁS 19:30 HORAS • DOMINGO ÁS 08:00 HORAS

O arquivo foi enviado em 09/2023 e a ficha foi modificada em 21/05/2025 → **fonte oficial sem sinal
de atualidade = `media`** (posterior a 2020, logo não cai para `baixa`). São os 4 únicos horários da
diocese.

**Não usei o `liriocatolico.com.br`.** A base do AM (`/horario_missa/dados/uf/AM.json`) tem só 2
fichas em Humaitá: "Igreja Nossa Senhora da Conceição" (sem nenhum horário) e "Nossa Senhora da Rosa
Mística" (quarta 07:00 e sábado 07:30), que **não é paróquia**. O `ultima_atualizacao` de todas as
fichas do estado é o mesmo 02/09/2026 — data de regeneração da base, não de conferência; sozinho é
`baixa`.

## Comunidades — só 5 das 11 fichas preenchem

217 entradas brutas, **16 repetidas dentro do próprio CMS** (descartadas), 195 gravadas + 11 matrizes.

| Paróquia | Comunidades | Organização |
|---|---|---|
| Á. M. N. Sra. de Nazaré (Beiradão) | 46 | 4 setores ribeirinhos: Lago do Antônio, Barreira do Tambaqui, São Paulo, Palhal |
| Maria Auxiliadora dos Cristãos (Manicoré) | 45 | Área Urbana, Área Suburbana e 5 setores: Rio Manicoré, Capanã Grande, Madeira I, Madeira II, Capanãzinho |
| N. Sra. das Dores (Manicoré) | 55 | sem setor; muitas com o rio entre parênteses (Mataurá, Atininga, Uruá) |
| São Sebastião (Apuí) | 26 | por **vicinal** da BR-230 (Vic. Nova Vida, Manto Verde, Cacoal, Três Estados…) e bairro urbano |
| N. Sra. Auxiliadora do Uruapiara (Manicoré) | 23 | sem setor |

**As outras 6 fichas têm o repetidor vazio — inclusive a CATEDRAL.**

Duas dessas listas vinham inteiramente em CAIXA ALTA (Dores e Uruapiara); converti para
capitalização normal, preservando as siglas pontuadas. **Os erros de digitação da fonte foram
mantidos** e estão anotados em `notes`: `MALOCA CIADADE`, `COMUNDADE N.S. DO ROSÁRIO`,
`SÃO JOSÉ – (Rio Atininga` (parêntese aberto e não fechado), `BARÇO GRANDE` ao lado de
`BRAÇO GRANDE`, `MATAURA` ao lado de `MATAURÁ`.

**Homônimos desambiguados com o setor**, como em Tefé: os mesmos oragos se repetem em setores
diferentes da mesma paróquia (São Sebastião aparece em Lago do Antônio, São Paulo e Palhal; Santo
Antônio em Lago do Antônio e Palhal; N. Sra. Aparecida em Lago do Antônio e Palhal, e assim por
diante). Nesses casos o nome ficou `Nome (Setor X)` — **44 comunidades** no Beiradão, em Manicoré e
em Apuí. Sem isso, capelas distintas virariam uma só no importador.

## Precisa de validação humana

1. **Á. M. Nossa Senhora de Nazaré (Beiradão) — MUNICÍPIO INCERTO.** É a única das 11 fichas **sem
   categoria de cidade, sem decanato e sem endereço**. Gravei `city: "Humaitá"` porque as
   comunidades citadas numa notícia da própria diocese (Barreira do Tambaqui, Ilha do Tambaqui,
   São Miguel–Meriti) ficam a cerca de uma hora de Humaitá pelo rio Madeira — **mas** o setor Palhal
   inclui "São Francisco do Uruapiara", já na direção de Manicoré. Pode ser intermunicipal. É o
   único campo do arquivo que gravei por inferência, e está marcado como tal em `notes`.
2. **`priestName` nem sempre é pároco.** Em 5 das 11 fichas o clérigo registrado é **administrador**
   (as 3 áreas missionárias) ou a ficha só traz **vigário**. A **Paróquia São Francisco de Humaitá
   não nomeia pároco nenhum** — `priestName: null`. Todos os casos estão descritos em `notes`.
3. **Ano de criação da Paróquia N. Sra. das Dores (Manicoré)** — o campo está vazio na ficha, apesar
   de a capela ser de 1865 e a Freguesia N. Sra. das Dores de Manicoré ser de 1868. Deixei `null`.
4. **Catedral sem comunidades, sem telefone e sem e-mail próprios** — a ficha da sé é a mais pobre
   da diocese. O e-mail que aparece nela é o da Cúria.
5. **Á. M. Santo Antônio (Cachoeirinha)** — criada em 2025, sem nada publicado além do nome, do
   decanato e do administrador. "Cachoeirinha" também consta na lista de comunidades da Paróquia
   N. Sra. das Dores, de onde provavelmente foi desmembrada: **conferir se não é duplicidade**.
6. **10 das 11 paróquias entram sem nenhum horário** — é a maior lacuna. Só a secretaria diocesana
   (97 98108-1694) fecha.

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

Registro atual: `address: "Curia Diocesana, Praca da Matriz s/n"`, `zipCode: "69800-000"`,
`phone: "(97) 3373-1356"`, `email: null`, `website: "https://diocesedehumaita.com.br"`,
`bishopName: "Dom Antônio Fontinele de Melo"`.

- **`bishopName` está ERRADO e é a correção mais urgente: a diocese está SEDE VACANTE.** Dom Antônio
  Fontinele de Melo foi **transferido para a Diocese de Rio Branco em setembro de 2026** — tanto o
  gcatholic.org quanto a Wikipédia já registram a vacância. No JSON gravei `bishopName: null`.
- **`email`**: hoje está `null`. O rodapé do site publica **`secretaria@diocesedehumaita.com.br`**
  (ofuscado pelo Cloudflare); o segundo e-mail do rodapé é `mitradehumaita@gmail.com`.
- **`phone`**: o rodapé publica hoje **Secretaria Episcopal 97 98108-1694** e **Coordenação de
  Pastoral 97 98805-3265**. O número registrado, (97) 3373-1356, não aparece mais no site
  (o (97) 3373-2100 que o site publica é o da Paróquia São Francisco, não o da Cúria).
- **`regional`**: está "Noroeste" e `province` "Porto Velho" — confere (sufragânea de Porto Velho).
- Endereço, CEP, cidade e UF conferem com o rodapé.
