# Arquidiocese de Teresina (PI) — relatório de pesquisa

- **Arquivo**: `paroquias/PI/teresina.json`
- **Data da coleta**: 2026-09-17
- **Cobertura**: **102 unidades territoriais, todas `alta`** — 78 paróquias (a Catedral incluída), 12 áreas
  pastorais e 12 diaconias territoriais (quase-paróquias) — mais 9 capelas/capelanias marcadas
  `nao-paroquial` (111 entradas no arquivo)
- **Comunidades**: 120 (102 matrizes + 5 capelas oficiais da Vila Operária + 3 comunidades da página
  oficial de 2018 + 10 tiradas de agregador, `baixa`)
- **Horários fixos**: 415 — **98 `media`** (19 paróquias) e 317 `baixa`; nenhum `alta`. 51 das 102
  unidades têm algum horário no dataset
- Municípios com sede de unidade: 32 (Teresina concentra 65 das 102)

## Fontes principais

| Fonte | Uso |
|---|---|
| `https://arquidiocesedeteresina.org.br/wp-json/wp/v2/pages?per_page=100` | As 13 páginas de forania (Centro, Norte I–II, Leste I–II, Sudeste, Sul I–III, Rural I–IV): nome, endereço, CEP, telefone, e-mail, Instagram, pároco, data de criação. Revistas em 15–18/08/2025 (Centro em 17/06/2026) |
| Notícias oficiais (`/wp-json/wp/v2/posts`) | **Transferências de 2026** (22/11, 16/12 e 19/12/2025) e **criações posteriores às páginas**: Paróquia Santa Edwiges (12/11/2025), Áreas Pastorais São José/Lagoa do Piauí (12/09/2025), Santa Rita de Cássia (22/02/2026), São Francisco das Chagas/Hugo Napoleão (07/03/2026) e Santa Teresinha/David Caldas, União (23/05/2026) |
| `…/horario-de-missa-forania-sul-1/` e `-sul-2/` | Únicas grades que a arquidiocese publica — de **04/09/2018**, pré-pandemia. Usadas só como corroboração (e como `baixa` onde não há outra fonte) |
| `https://www.paroquiavilaoperaria.org.br/portal/` | Site oficial da Paróquia São José Operário: grade (página de horários revista em 16/01/2024) e as 5 capelas |
| `https://www.santuariodesantacruzdosmilagres.com/artigo/horarios.html` | Site oficial do santuário (última notícia em 17/11/2022) |
| `https://www.liriocatolico.com.br/horario_missa/dados/uf/PI.json` | Agregador: 160 fichas no Piauí, 85 em Teresina. É a base dos horários `baixa` |
| `horariodemissa.com.br` (25 fichas de Teresina) e `buscamissa.com.br` (2 fichas) | Corroboração |
| `https://www.catholic-hierarchy.org/diocese/dtere.html` | Nº esperado e série histórica |

## Como a lista foi fechada

O site não tem uma página "Paróquias": a lista está espalhada em **13 páginas de forania**, cada uma
com seções "Paróquias", "Áreas Pastorais", "Diaconias" e "Capelas/Capelanias". A API REST devolveu
o conteúdo de todas de uma vez. Somadas: 77 paróquias + 9 áreas pastorais + 12 diaconias
territoriais + 9 capelas.

**As páginas estavam um ano atrás da realidade.** A busca nas notícias oficiais achou, depois de
agosto de 2025: a elevação da Área Pastoral Santa Edwiges a **paróquia** (a 78ª) e **quatro áreas
pastorais novas**, que entraram só com o que a notícia traz (nome, município, administrador, ano).
Também por isso **27 responsáveis foram atualizados (e 1 ficou vago)** pelas três listas oficiais de transferências
para 2026 — a página da forania ainda mostra o pároco anterior nesses casos; a fonte da
transferência está em `sources` de cada registro.

**Número esperado**: o Anuário Pontifício 2024 dá 110 "paróquias" em 2023, contra 77 em 2022. Um
salto de 33 em um ano não é criação de paróquia — é mudança de critério (passaram a contar áreas
pastorais, diaconias e provavelmente capelanias). A lista nominal oficial tem 78 paróquias canônicas
e 102 unidades com território próprio; gravei `parishesExpected: 110` e a explicação em
`coverage.notes`.

## Decisões tomadas

- **Diaconia Territorial → `Quase-paróquia … (Diaconia Territorial)`**. É uma figura própria de
  Teresina: território confiado a um diácono permanente coordenador, com um "presbítero assistente".
  A própria arquidiocese escreve "(Quase-Paróquia)" em duas delas. Como o validador só aceita os
  prefixos padronizados, o nome ganhou o prefixo `Quase-paróquia` e manteve "Diaconia Territorial"
  entre parênteses, que é como o povo a conhece. Em `priestName` ficou o presbítero assistente (ou o
  diácono coordenador, quando não há padre nomeado).
- **Santuários**: "Santuário Arquidiocesano / Paróquia Nossa Senhora da Paz", "Paróquia Santuário São
  Francisco de Assis" e "Santuário Arquidiocesano / Paróquia Santa Cruz dos Milagres" entraram como
  `Paróquia …`, com o santuário como igreja-matriz (`isMatriz: true`).
- **`neighborhood` = o rótulo que a arquidiocese usa no título** ("– Mafrense", "– Dirceu II",
  "– Capelinha de Palha"), porque é ele que separa as homônimas de Teresina (2× São Francisco de
  Assis, 2× Santa Teresinha, 2× N. Sra. de Fátima, 2× N. Sra. das Graças, 2× Imaculada Conceição). O
  bairro postal está dentro de `address`.
- **Capelas e capelanias** (hospitais, colégios, cemitérios, Assembleia Legislativa): 9 entradas
  `status: "nao-paroquial"`, sem `loadAsParish` — nenhuma tem horário em fonte que carregue. A Capela
  São José (Lar de Misericórdia) tem grade só no agregador (`baixa`); se o enxame confirmar, vale
  `loadAsParish: true`.
- **Campos anulados por defeito na fonte**: CEP genérico `64000-000` (Amarante, Cristo Libertador,
  Diaconia Sagrado Coração), CEP de Teresina em paróquia do interior (São Gonçalo do Piauí, Inhuma),
  CEP malformado (Cacimba Velha `67057-990`, Cerâmica Cil `640041-350`, Agricolândia `6440-000`),
  telefone malformado (Amarante `(86) 399439-1157`, 2º número de São Benedito), e-mails de domínio
  morto (`nsfatima.org.br` não existe mais; `paroquiadelourdesthe.com.br` com delegação quebrada),
  e-mail com `gamil.com` e e-mail com cedilha (Prata do Piauí), perfis de Instagram com acento.
- **Site da Paróquia N. Sra. de Fátima**: a arquidiocese ainda publica `nsfatima.org.br`, mas o domínio
  não resolve. Ficou `website: null`.

## Horários: regra aplicada

A arquidiocese **não publica grade atual**. Regra, na linha do que foi feito em Sinop:

- `media` — (a) site oficial de paróquia sem sinal de atualidade ≤ 12 meses (Vila Operária, Santa
  Cruz dos Milagres), conferido contra o agregador; (b) o mesmo (tipo, dia, hora) em **duas fontes
  independentes**: Lírio Católico + BuscaMissa "Confirmado" (Santa Teresinha/Dirceu II — o pároco
  que o BuscaMissa mostra é o nomeado em 02/2026), Lírio + ficha do Horário de Missa, ou Lírio + a
  página oficial de 2018.
- `baixa` — só o Lírio Católico; só a página oficial de 2018 (regra pré-pandemia); recorrência
  mensal ("1ª sexta-feira"); data fixa do mês (`dayOfWeek: null`: "todo dia 13" em São Cristóvão e
  São João Evangelista, "Missa das Rosas no dia 1" em São Sebastião).

Sobre o Lírio Católico: o campo `ultima_atualizacao` é **2026-09-02 em todas as 160 fichas do
estado** — é a data de regeneração da base, não de conferência da ficha. Não conta como sinal de
atualidade; o conteúdo, porém, é recente (traz a Área Pastoral Santo André, de 2025, e a de Lagoa do
Piauí). As fichas do Horário de Missa em Teresina são 20 de 2013, 3 de 2014, 1 de 2016 e 1 de 2023, e
a maioria nem tem horário.

Todas as grades foram conferidas contra o JSON/HTML bruto (não contra resumo automático).

## Precisa de validação humana

1. **Horários `baixa` de 32 paróquias** que só existem no Lírio Católico — é o maior bloco. As
   divergências com a página oficial de 2018 (ex.: Cristo Rei 18h30 × 18h; N. Sra. de Lourdes domingo
   7h/19h × 8h/18h30) ficaram com o valor do agregador como `baixa`.
2. **Monsenhor Gil — ano de criação**: a página diz "29 de maio de 1980 por Dom Antonio Cândido de
   Alvarenga", bispo do século XIX (o mesmo que criou Regeneração em 1881). Provável 1880; ficou `null`.
3. **Pimenteiras**: a ficha oficial repete endereço, telefone, e-mail, Instagram e data de criação da
   Paróquia São Francisco de Assis de Valença (bloco copiado). Só nome, município e pároco são
   confiáveis; o resto ficou `null`.
4. **Aroazes — ano**: "8 de dezembro de 1994 – ratificada por D. Miguel, pois não se sabe a data
   precisa, mas seria a paróquia mais antiga da arquidiocese, de 1833–1834". Ficou `null`.
5. **CEP repetido**: `64022-350` aparece em São Sebastião (Todos os Santos) e em N. Sra. da Imaculada
   Conceição (Morada Nova). Um dos dois está errado.
6. **Imaculada Conceição (Aeroporto)**: o endereço oficial (Rua Sotero Vaz da Silveira, 4110 – Real
   Copagre) é o da Igreja Santa Clara; a matriz "Imaculada Conceição" que o agregador mostra fica na
   Tv. Crato (Aeroporto). Confirmar qual é a sede.
7. **Paróquia São José (Jacinta Andrade)**: a ficha "Igreja Matriz de São José" do agregador dá outro
   endereço (Av. Deputada Francisca Trindade, 1000). Horários gravados como `baixa`.
8. **N. Sra. do Perpétuo Socorro (Mafrense)**: endereço oficial no Itaperu; o agregador põe a matriz na
   R. Delegado João Braz, 1033 – Mafrense.
9. **N. Sra. de Guadalupe e São Juan Diego**: a página diz "Vila Meio Norte", as listas de
   transferência dizem "Nova Teresina". Nome do orago grafado "S. J. Diego" / "San Juan Diego".
10. **Diaconia Santa Rita de Cássia (Vale do Gavião)** ficou sem responsável: o diácono coordenador foi
    transferido em 01/2026 e o substituto não foi publicado. Não confundir com a **nova Área Pastoral
    Santa Rita de Cássia** (Povoado Santa Rita, PI-113), desmembrada da Diaconia Santa Teresa d'Ávila.
11. **Quatro áreas pastorais novas** sem endereço, CEP nem telefone — só a notícia de criação. A de
    Hugo Napoleão foi atribuída à Forania Rural I por geografia (a notícia não diz).
12. **10 comunidades `baixa`** cujo vínculo com a paróquia foi deduzido do agregador (texto da ficha,
    sufixo `.pnsg` no Instagram, telefone ou endereço em comum). O motivo está em `notes` de cada uma.
13. **Capela de N. Sra. de Fátima (Vila Bom Jesus, Vila Operária)**: o site diz "missas no 2º e 4º
    sábado do mês", sem hora — não gravado.
14. E-mail `_sasfathepi@gmail.com` (Santuário São Francisco/Dirceu I) começa com sublinhado na fonte;
    e-mail pessoal `alanng@secrel.com.br` publicado para a Vila Operária foi trocado pelo do site da
    paróquia.
15. **CNPJ da mitra não consultado** — a lista fechou pela fonte oficial e pelas notícias; a varredura
    de filiais na Receita fica como caminho para completar endereço das 4 áreas novas e de Pimenteiras.

## Revisão do orquestrador (2026-09-17)

55 dos 98 horários `media` foram **rebaixados para `baixa`** antes da carga. Eram grades do Lírio
Católico cuja única corroboração era texto anterior a 2020: a página oficial de 04/09/2018
(foranias Sul 1 e Sul 2) ou fichas do `horariodemissa.com.br` de 2013 a 2016. O agregador pode ter
copiado justamente a página antiga, então a coincidência não prova atualidade — vale a regra
pré-pandemia do README. Seguem `media` os 43 horários com fonte atual: sites oficiais da Vila
Operária e de Santa Cruz dos Milagres, BuscaMissa com selo "Confirmado" e a ficha do
`horariodemissa` de São Cristóvão, atualizada em 26/09/2023. Cada registro rebaixado leva
`confidenceNote`. Paróquias mais afetadas: São Benedito (12), N. Sra. do Amparo (9), N. Sra. de
Fátima, N. Sra. de Lourdes e N. Sra. da Paz (5 cada).
