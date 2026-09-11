# Relatório — Diocese de Corumbá (MS)

Pesquisa em 2026-09-11. Arquivo: `corumba.json`.
Nome oficial da circunscrição: **Diocese de Santa Cruz de Corumbá** (o dataset usa "Diocese de Corumbá",
como no `dioceses.json`).

## Resumo

| Item | Valor |
|---|---|
| Paróquias no arquivo | **9** (cobertura integral) |
| Registros totais | 12 (9 paróquias + 3 capelanias `nao-paroquial` com `loadAsParish`) |
| Confiança das paróquias | 12 `alta` |
| Comunidades/capelas | **52** |
| Horários fixos | **102** — 66 `alta`, 23 `media`, 13 `baixa` |
| Cobertura | 9 × 9 esperadas (Wikipédia) — 2/2 municípios, 1/1 forania |
| Paróquias sem horário | 0 |

## Fontes principais

| Fonte | O que deu |
|---|---|
| `https://diocesecorumba.org.br/wp-json/wp/v2/paroquia?per_page=100` | lista canônica: `X-WP-Total: 9`, com slug, link e `modified` |
| Ficha de cada paróquia (`/paroquia/<slug>/`) | endereço, telefone, e-mail, ano de criação, clero com função **e a grade completa de missas, comunidade por comunidade** |
| `https://diocesecorumba.org.br/horarios-de-missas/` | grade agregada da diocese — a **única** fonte das 3 capelanias |
| `https://diocesecorumba.org.br/wp-json/wp/v2/horario-missa` | os 13 posts de grade e, sobretudo, o `modified` de cada um, que calibrou a confiança |
| `https://pt.wikipedia.org/wiki/Diocese_de_Corumb%C3%A1` | nº esperado (9 paróquias, 1 forania), municípios (Corumbá e Ladário), 65.303 km², criação em 10/03/1910, Dom João Batista de Oliveira, S.V.D. (desde 2024) |

### Truque que resolveu este site

O conteúdo dos posts `horario-missa` **não aparece nem na REST API** (`content.rendered` vem vazio, os dados
estão em campos ACF não expostos) **nem na página individual do próprio post** (o template single não
renderiza o repeater). Ele só existe renderizado **dentro da ficha da paróquia**, em blocos
`<div class="dce-acf-repeater-item">` do plugin *Dynamic Content for Elementor*, com os quatro campos
identificáveis pelo atributo `data-settings` (`acf_field_list":"tipo_horario"`, `dia_semana_horario`,
`horario_horario`, `observacoes_horario`). Raspar as 9 fichas foi o caminho.

**E a coluna "Observação" nomeia a comunidade.** Foi daí que saíram as 52 comunidades — a diocese não tem
cadastro separado de capelas, mas publica o nome de cada uma na grade de missas.

## Recorrência mensal — o Pantanal como o briefing previu

13 horários ficaram `baixa` por recorrência mensal, e eles desenham a geografia da diocese:

- **Paróquia São João Bosco** (salesianos) atende 7 comunidades de assentamento no entorno de Corumbá —
  São Marcos (Tamarineiro II Sul), São Paulo e Divino Espírito Santo (Tamarineiro I), Santo Antônio
  (Taquaral–Agrovila III), Bom Jesus e Santa Luzia (Taquaral–Agrovila II) e N. Sra. de Fátima (Taquaral) —
  em **"1º e 3º"** ou **"2º e 4º"** sábado/domingo do mês.
- **Paróquia Imaculada Conceição**, com sede no **distrito de Albuquerque** (a ~70 km da sede, no Pantanal),
  atende Porto Esperança, Mato Grande (duas comunidades) e as duas São Gabriel ("Sr Ney" e "Dona Vera")
  uma vez por mês.
- **Paróquia N. Sra. de Fátima**: Comunidade Santa Dulce dos Pobres, 2º e 4º sábado do mês.

A regra literal de cada uma está em `notes` (ex.: `Recorrência mensal publicada pela diocese: "1º e 3º –
Sábado - mês"`).

## Confiança dos horários

A diocese mantém o site ativo, mas não todas as grades no mesmo ritmo. Usei o `modified` de cada post
`horario-missa`:

- **`alta` (66)** — grades editadas entre **10/08/2026 e 03/09/2026**: Catedral N. Sra. da Candelária,
  N. Sra. de Fátima, São João Bosco, São José Operário, Sagrado Coração de Jesus e N. Sra. dos Remédios
  (Ladário), além das 3 capelanias.
- **`media` (23)** — fonte oficial **sem sinal de atualidade** (>12 meses): Santuário N. Sra. Auxiliadora
  (03/11/2024), São Bartolomeu (02/04/2025) e Imaculada Conceição de Albuquerque (01/04/2025).
- **`baixa` (13)** — recorrência mensal.

## Marcadores aplicados

Três capelanias entram com `status: "nao-paroquial"` **e** `loadAsParish: true`, pela regra do README
("igreja não paroquial com horário publicado entra"):

| Registro | Missa publicada |
|---|---|
| Capela Naval Cristo Redentor (Marinha do Brasil) | domingo 10:00 |
| Capelania Asilo São José | quinta-feira 14:00 |
| Capelania Hospital Santa Casa | quinta-feira 16:00 |

Elas aparecem **só** na página `/horarios-de-missas/`, não na lista de paróquias.

## PRECISA DE VALIDAÇÃO HUMANA

1. **Erro de digitação na fonte oficial**: a grade diocesana publica o dia da missa da Capelania do Hospital
   Santa Casa como **"Quinta-feia"**. Interpretei como quinta-feira e registrei o problema em `notes`.

2. **Paróquia Sagrado Coração de Jesus sem clero publicado** — a ficha exibe literalmente "Nenhum resultado
   encontrado" no bloco de clero. Pela ficha da Paróquia São José Operário, **Pe. Celso Ricardo da Silva** é
   "Pároco Sagrado Coração e Administrador São José Operário", isto é, acumula as duas. Deixei
   `priestName: null` no Sagrado Coração e registrei a informação em `notes`; confirmar.

3. **Endereços sem CEP** (a fonte não publica): Catedral N. Sra. da Candelária ("Praça da República, 01 –
   Centro"), Santuário N. Sra. Auxiliadora ("R. Dom Aquino Correa, 1037 – Centro") e Imaculada Conceição
   (só "Distrito de Albuquerque", sem logradouro).
   **Sem ano de criação**: N. Sra. de Fátima, Sagrado Coração de Jesus e São João Bosco.
   **Sem e-mail próprio** (a ficha só traz o da Cúria): Imaculada Conceição e N. Sra. de Fátima.

4. **Nome do orago da paróquia de Albuquerque.** O slug do post é
   `paroquia-imaculada-conceicao-de-maria`, o título publicado é "Paróquia Imaculada Conceição – Albuquerque"
   e a Wikipédia diz "Imaculada Conceição". Adotei **Paróquia Imaculada Conceição** com a cidade Corumbá e o
   distrito em `neighborhood`/`notes`.

5. **Horários duplicados na própria fonte.** A Paróquia São João Bosco tem **dois** posts `horario-missa`
   (ids 3045 e 3071) que repetem as missas da matriz de domingo, um escrevendo "07h30/19h" e o outro
   "07:30/19:00". Deduplicado por (comunidade, dia, hora) normalizados. Vale pedir à diocese que apague o
   post repetido.

6. **Comunidade que não é comunidade.** A grade do Santuário N. Sra. Auxiliadora traz "Missa da Catequese"
   na coluna Observação do domingo 09:00 — é um rótulo, não um lugar. O gerador foi ajustado para só criar
   comunidade quando a observação começa por Comunidade/Com./Capela/Capelania/Matriz/Catedral/Santuário/
   Paróquia/Igreja; o texto virou `notes` do horário. É o mesmo defeito que o README já documentou.

7. **"Comunidade Nossa Senhora de Caacupé"** (Catedral, domingo 10:00) é a comunidade paraguaia, e a própria
   fonte anota "(local: Catedral)" — ou seja, celebra **dentro da catedral**, não em templo próprio. Ficou
   como comunidade, com a observação em `notes`. Decidir se o Parish deve exibi-la como local separado.

8. **Homônimos entre paróquias** (todos em Corumbá, resolvidos pelo nome da comunidade, não do lugar):
   "Comunidade Santo Antônio de Pádua" existe em São José Operário **e** em N. Sra. dos Remédios (Ladário);
   "Comunidade São Francisco de Assis" existe em N. Sra. de Fátima **e** em Imaculada Conceição (URUCUM);
   "Comunidade Nossa Senhora Aparecida" existe na Catedral **e** em Imaculada Conceição (Mato Grande);
   "Comunidade Santa Luzia" existe em N. Sra. de Fátima **e** em São João Bosco (Taquaral–Agrovila II).
   São lugares distintos — o importador precisa resolvê-los no escopo da paróquia, não do município.
