# Relatório — Diocese de Guajará-Mirim (RO)

Pesquisa: 2026-09-18. Agente de pesquisa do território (enxame Parish).

## Resumo

| Item | Valor |
|---|---|
| Paróquias gravadas | **13** |
| Confiança das paróquias | 13 `alta` |
| Comunidades nomeadas | **14** (13 matrizes + a Igrejinha N. Sra. do Perpétuo Socorro) |
| Comunidades **declaradas** pelas fichas | **362** — nenhuma nomeada pela fonte |
| Horários fixos | **36** (34 `alta`, 2 `baixa`) |
| Cobertura | **13/13** — fechada por três fontes independentes |
| Bispo | **SÉ VACANTE**. Administrador Diocesano: **Pe. Wilian Lino Orcesi** |

## Fontes principais

1. **Site oficial — <https://dioceseguajaramirim.org.br>** (WordPress + Elementor, **ativo**:
   notícias de 11/09/2026 e a página "Agenda do Administrador Diocesano" modificada em 17/06/2026).
2. **REST do WordPress** — as fichas de paróquia são **posts na categoria `paroquias` (id 7)**,
   subdivididas em **Região Pastoral Sede (id 39)**, **Centro (id 40)** e **Sul (id 41)**.
   `/wp-json/wp/v2/posts?categories=7&per_page=100` devolveu as 13 de uma vez, com `content.rendered`.
3. **`/curia-diocesana/`** — "ADMINISTRADOR DIOCESANO: Pe. Wilian Lino Orcesi", endereço, telefone e
   e-mail da cúria.
4. **gcatholic.org** (`guaj0.htm`) — **13 paróquias**, 91.282 km², **sé vacante**.
5. **Receita Federal via Mapa das OSC/IPEA** — CNPJ raiz **04.290.318**
   ("MITRA DIOCESANA SEDE GUAJARA MIRIM"), **15 estabelecimentos**.
6. **liriocatolico.com.br** (`RO.json`) — usado só para corroborar Colorado d'Oeste.
7. **ViaCEP** — CEPs.

## Cobertura — a paróquia que a página oficial esconde

**A página `/paroquias/` só mostra 12 cards.** Falta a **Paróquia Nossa Senhora Aparecida de
Colorado d'Oeste**, cujo slug está fora do padrão (`nossa-sra-aparecida-colorado-doeste-ro`, sem o
prefixo `paroquia-`) e por isso não entra no *loop* do Elementor. Achei-a por dois caminhos:
a busca interna do site (`/?s=Colorado`) e a **REST filtrada pela categoria `paroquias`**, que
devolve 13. É a **maior paróquia da diocese** (53 comunidades declaradas) — teria sido uma perda
grave.

Confirmação cruzada:

- gcatholic: **13**.
- Receita: dos **15** estabelecimentos do CNPJ 04.290.318, **13 casam um a um com as 13 fichas**
  (cada ficha publica o **CNPJ próprio da paróquia**, o que torna o cruzamento trivial), 1 é a sede
  (Av. Costa Marques, 561) e 1 é uma obra em Guajará-Mirim (Av. Porto Carreiro, 755, Bairro São José)
  que a diocese não lista como paróquia.

## Qualidade das fichas

São as **melhores fichas de paróquia das cinco circunscrições desta rodada**. Cada uma traz:
região pastoral, data de fundação, endereço, CEP, **CNPJ próprio**, telefone, e-mail, festa do
padroeiro, **quantidade de comunidades**, clero — e **9 das 13** publicam "Missas na Matriz".

**Sem missa publicada (4)**: N. Sra. de Fátima de Nova Dimensão, São Miguel Arcanjo,
São Domingos de Gusmão e Divino Espírito Santo de Costa Marques. Não é omissão do agente: nenhuma
fonte consultada publica missa dessas quatro. No caso de **São Domingos de Gusmão** isso é coerente
com a própria ficha: a paróquia é **administrada por um DIÁCONO** ("Administrador Paroquial:
Diácono Braz Almeida"), sem padre residente.

A página **`/horarios-de-missas/` é um placeholder**: abas dos dias da semana com
*"Lorem ipsum dolor sit amet…"* e "Conteúdo da aba". Descartada — é exatamente o caso que o README
descreve.

## Comunidades — 362 declaradas, nenhuma nomeada

Cada ficha diz "Quantidade de Comunidades: N, inclusa a Matriz" e **para por aí**:

| Paróquia | Comunidades declaradas |
|---|---|
| N. Sra. Aparecida — Colorado d'Oeste | 53 |
| São Miguel Arcanjo — São Miguel do Guaporé | 51 |
| Cristo Salvador — Cerejeiras | 40 |
| Cristo Rei — Seringueiras | 39 |
| São Francisco de Assis — São Francisco do Guaporé | 37 |
| N. Sra. do Perpétuo Socorro — Corumbiara | 33 |
| N. Sra. de Fátima — Nova Dimensão | 24 |
| Cristo Rei — Cabixi | 24 |
| Divino Espírito Santo — Costa Marques | 16 |
| São Francisco de Assis — Nova Mamoré | 14 |
| Catedral N. Sra. do Seringueiro | 12 |
| São Domingos de Gusmão | 10 |
| N. Sra. Aparecida — Guajará-Mirim | 9 |
| **Total** | **362** |

A **única** comunidade nomeada além das matrizes é a **"Igrejinha N. Sra. do Perpétuo Socorro"**,
antiga igreja paroquial de Guajará-Mirim, que tem **grade de missa própria** na ficha da Catedral
(segunda, terça e quinta 18h30; sábado e domingo 7h). Esse é o maior buraco desta diocese e o alvo
mais óbvio do enxame de validação.

## Pontos que precisam de validação humana

1. **Sé vacante e o `bishopName`**. Dom Benedito Araújo foi transferido para a **Diocese de Campo
   Maior (PI)** em 07/11/2025 (posse em 17/01/2026). Até 18/09/2026 nenhuma fonte registra novo
   bispo. A diocese é governada pelo **Administrador Diocesano Pe. Wilian Lino Orcesi**, que é
   também pároco da Catedral. Gravei `bishopName: null` no JSON (é administrador, não bispo).
   A página `/bispo/` do site ainda lista Dom Benedito em primeiro lugar, sem avisar da vacância.
2. **Endereços que divergem entre a ficha e a Receita** (gravei o da ficha):
   | Paróquia | Ficha | Receita |
   |---|---|---|
   | São Francisco de Assis (Nova Mamoré) | Av. Antônio Lucas de Araújo, 3800 | **Av. Sebastião João Clímaco, 7226** |
   | Divino Espírito Santo (Costa Marques) | Avenida Mamoré, 1462 | **Av. Forte Príncipe da Beira, s/n** |
   | São Francisco de Assis (S. Fco. do Guaporé) | Rua Chico Mendes, 3612 | **Casa Paroquial, BR-429, km 110** |
   | N. Sra. Aparecida (Colorado d'Oeste) | Rua Rio de Janeiro, **4358** | Rua Rio de Janeiro, **4311** |
   | Cristo Salvador (Cerejeiras) | Avenida das Nações, **2440** | Avenida das Nações, **s/n** |
3. **Telefone malformado**: N. Sra. de Fátima de Nova Dimensão publica "(69) 9994-6810" — 8 dígitos
   depois do DDD. `phone: null`.
4. **"Paróquia Basílica Divino Espírito Santo"** (Costa Marques): é o nome que a diocese publica,
   mas a fonte **não explica o título de basílica** e o gcatholic não registra basílica menor em
   Costa Marques. Gravei o nome oficial; conferir antes de exibir.
5. **CEPs**: São Francisco do Guaporé não é publicado pela ficha e a Receita ainda traz o antigo
   78973-000 → usei **76935-000** (ViaCEP, CEP único do município). O mesmo padrão de CEP antigo de
   8 dígitos aparece na Receita para Seringueiras (78990000), São Miguel do Guaporé (78970000) e
   Cabixi (78999000) — as fichas trazem os corretos.
6. **CNPJ com formatação errada nas fichas** (normalizei no JSON): Colorado d'Oeste publica
   "04.290.318/0005**/**39" (barra no lugar do hífen); Guajará-Mirim/Aparecida, Corumbiara e
   Seringueiras publicam sem pontuação ou com barra no meio.
7. **Duas datas de festa que são de um ano específico, não da festa litúrgica** — não gravadas:
   São Francisco do Guaporé ("04/06/2020", quando a festa de São Francisco é 04/10), São Miguel
   ("29/09/2020"), Cabixi ("20/11/2020"), Colorado ("12/10/2020"), Seringueiras ("22/11/2020"),
   São Domingos ("08/08/2020"). Sinal de que esse campo foi preenchido em 2020 e não foi revisto.
8. **Horário de comunidade que não consegui atribuir**: o liriocatolico publica uma
   "**Comunidade Cristo Redentor**" em Guajará-Mirim (sábado 20h). A cidade tem **duas** paróquias
   e nenhuma nomeia suas comunidades — ficou fora do JSON.
9. **Fichas do liriocatolico vazias**: "Catedral NS do Seringueiro" e "Senhor Divino Espírito Santo"
   (Costa Marques) existem no agregador mas com o campo de missas **vazio**.
10. **Ficha desatualizada**: N. Sra. do Perpétuo Socorro de Corumbiara foi modificada em
    **21/02/2025**; todas as outras 12 são de 2026.
11. **Fronteira e povos indígenas**: a diocese faz divisa com a **Bolívia** e tem terras indígenas.
    **Nenhuma fonte pública nomeia as comunidades indígenas ou ribeirinhas atendidas** — elas estão
    dentro dos 362 totais declarados.
12. **Homônimas entre paróquias** (cidades diferentes, sem conflito de slug, mas vale saber):
    duas "Paróquia Cristo Rei" (Seringueiras e Cabixi), duas "Paróquia São Francisco de Assis"
    (Nova Mamoré e São Francisco do Guaporé) e duas "Paróquia Nossa Senhora Aparecida"
    (Guajará-Mirim e Colorado do Oeste).
13. **Duas paróquias em distritos de outro município**: N. Sra. de Fátima fica no **distrito de
    Nova Dimensão**, município de **Nova Mamoré**; São Domingos de Gusmão fica no **distrito de
    São Domingos do Guaporé**, município de **Costa Marques**. Gravei `city` com o município e
    `neighborhood` com o distrito.

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

| Campo | Valor atual | Valor encontrado | Fonte |
|---|---|---|---|
| `phone` | `(69) 3541-2275` | **`(69) 99381-1154`** | `/curia-diocesana/` (o fixo antigo não é mais publicado pelo site) |
| `email` | `null` | **`diocese@dioceseguajaramirim.org.br`** | `/curia-diocesana/` |
| `bishopName` | `null` | **continua `null` — SÉ VACANTE**; o governo é do Administrador Diocesano **Pe. Wilian Lino Orcesi** | `/curia-diocesana/` + gcatholic |

Conferem e não precisam de mudança: nome, `type`, cidade, endereço (Av. Costa Marques, 561),
CEP (76850-000) e site (`https://dioceseguajaramirim.org.br` — o `www.` devolve 404).

`foundedYear: 1929` é o ano da **erecção da Prelazia de Guajará-Mirim** (diocese só em 1979) —
está certo pela convenção do dataset, **não corrigir**.
