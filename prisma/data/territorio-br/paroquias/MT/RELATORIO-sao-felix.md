# Relatório — Prelazia de São Félix (MT)

Pesquisa: 2026-09-11 · Arquivo: `sao-felix.json`
**É prelazia territorial, não diocese** (`type: "Prelazia"`). Regional Norte 3 da CNBB.

## Resultado

| Métrica | Valor |
|---|---|
| Paróquias | **14** (12 `alta`, 2 `media`) |
| Comunidades/capelas | **12** (só as matrizes) |
| Horários fixos | **0** |
| Cobertura | 14 encontradas / 14 esperadas |

## Fontes principais

1. **`https://prelaziasfaraguaia.wixsite.com/prelazia/paroquias`** — site oficial da prelazia,
   hospedado em Wix. Publica **12 paróquias**, cada uma com endereço, CEP, telefone, e-mail e a
   *equipe pastoral* (padres, diáconos, religiosas e leigos).
   **O domínio próprio `prelaziasfaraguaia.com.br` está fora do ar** — não resolve por DNS nem pelo
   DNS-over-HTTPS do Google. O endereço `.wixsite.com` é o que funciona hoje, e é o que gravei como
   `website` da prelazia.
2. **Receita Federal via `minhareceita.org`** — varredura das filiais do CNPJ **03.439.338**
   (Prelazia de São Félix do Araguaia), dígitos verificadores gerados de 0001 a 0040: **21 filiais**
   — a cúria, **14 paróquias ativas** e 6 postos de missão de 1974 já baixados.
3. gcatholic.org (`zfel2.htm`, 13 centros pastorais em 31/12/2021) e catholic-hierarchy.org.

## O achado principal

A Receita revelou **duas paróquias que o site da prelazia não lista**:

| Paróquia | Município | Endereço | Ativa desde |
|---|---|---|---|
| **Nossa Senhora Aparecida** | Confresa | Rua Airton Senna, s/n, Setor Pavilhão, 78652-000 | 22/02/2018 |
| **Santo Antônio** | Novo Santo Antônio | Rua 29 de Setembro, 285, Centro, 78674-000 | 16/03/2023 |

A conta fecha: 12 (site) + Confresa/Aparecida (2018) = **13**, que é exatamente o número do
gcatholic para 31/12/2021; somando Novo Santo Antônio (2023) chega-se a **14** hoje. São os dois
únicos registros `media` do arquivo, sem comunidade e sem telefone.

A Receita também **resolveu a paróquia sem nome do site**: a ficha nº 8 do Wix (Santa Cruz do
Xingu) não traz o título; a Receita registra **"Paróquia de Santa Cruz"** (filial 0019,
14/05/2014).

**Confresa tem duas paróquias** (São Sebastião, no Centro, e Nossa Senhora Aparecida, no Setor
Pavilhão) — não é duplicata.

## Postos de missão baixados (não entram)

Filiais de **31/01/1974**, todas com situação BAIXADA, do tempo em que o território ainda pertencia
a Barra do Garças: **Missão Tapirapé** (Luciara), **Pontinópolis**, **Porto Alegre** (Luciara),
**Ribeirão Bonito**, **Serra Nova** e **Santo Antônio** (à beira do rio das Mortes). São a memória
da prelazia de Dom Pedro Casaldáliga; não são paróquias hoje.

## Precisa de validação humana

1. **Zero horários de missa.** Nem o site da prelazia, nem as fichas, nem os agregadores têm nada:
   `horariodemissa.com.br` tem a ficha de Porto Alegre do Norte com *"Nenhum horário de Missa
   informado"* e última atualização em **25/05/2013**. **Pista para o enxame de validação**: uma
   busca devolveu, do perfil `@paroquiaportoalegredonorte` no Instagram, "missas aos domingos às
   19h30 e quintas às 19h30" e o telefone +55 (66) 97400-6734 para a Paróquia N. Sra. da Libertação.
   **Não gravei** — não consegui abrir o Instagram para confirmar, e nesta rodada um leitor
   automático já devolveu uma grade inventada para outra paróquia. Verificar antes de usar.
2. **O site da prelazia está desatualizado: é anterior a março de 2024.** A equipe pastoral da
   Paróquia N. Sra. da Libertação (Porto Alegre do Norte) ainda lista **Dom Adriano Ciocca Vasino**,
   que deixou a prelazia quando **Dom Lúcio Nicoletto** foi nomeado (13/03/2024). Logo, **todos os
   nomes de padre deste arquivo precisam de conferência**. Gravei sempre o primeiro "Pe."/"Frei" da
   equipe, presumindo que seja o pároco — presunção, não afirmação da fonte.
3. **Paróquia São Domingos de Gusmão (Canabrava do Norte)**: a equipe pastoral só tem um diácono
   (Diác. Antônio Eliseo Gobatto) e dois leigos, nenhum padre. `priestName: null`.
4. **Endereço da Catedral divergente**: o site diz "Av. Gov. José Fragelli, **1410**, Vila Nova";
   a Receita diz "Gov. José Fragelli, **812**, Centro". Gravei o do site.
5. **Endereço de N. Sra. Aparecida (Bom Jesus do Araguaia) divergente**: site "Av. Brasil, 358,
   Centro"; Receita "Rua Dom Pedro Casaldáliga, s/n, Centro". Gravei o do site.
6. **Outras divergências menores** (gravei o do site): São José do Xingu nº 132 × 123;
   Querência nº 665 × 733; Santa Terezinha "Félix de Moraes" × "Felix de Maraes" (a Receita tem o
   erro de digitação).
7. **Sede da cúria.** `dioceses.json` e a CNBB registram a cúria em **São Félix do Araguaia**
   (Rua Açucena, 20, Setor São Geraldo); gcatholic dá "Rua do Comércio 66, 78670-000 São Félix do
   Araguaia"; a Receita registra a matriz do CNPJ (filial 0001) em **Porto Alegre do Norte**, Setor
   São Geraldo, Rua Açucena, s/n, CEP 78655-000 — que é o CEP de Porto Alegre do Norte, e o telefone
   bate com o de `dioceses.json` ((66) 3569-1263, prefixo de Porto Alegre do Norte). Ou seja: a
   **sé** é São Félix do Araguaia (onde está a catedral), mas a **cúria administrativa** parece
   estar em Porto Alegre do Norte. Gravei `city: "São Félix do Araguaia"` (a sé) e o endereço de
   Porto Alegre do Norte no campo `address`, explicitando a cidade dentro dele. **Conferir.**
   `dioceses.json` não foi alterado (fora do escopo).
8. **Nenhuma comunidade ou capela publicada.** Numa prelazia de 155 mil km² na Amazônia Legal, com
   14 paróquias, isso significa que centenas de comunidades rurais, ribeirinhas e indígenas ficam
   de fora. Gravei só a matriz de cada uma das 12 paróquias do site (as 2 da Receita ficaram com
   `communities: []` — o importador cria a matriz).
9. **Nome do registro da catedral**: o site diz "Paróquia Nossa Senhora da Assunção"; gcatholic diz
   "Catedral Prelatícia Nossa Senhora da Assunção". Adotei `name: "Catedral Nossa Senhora da
   Assunção"` e o nome longo na comunidade-matriz.
