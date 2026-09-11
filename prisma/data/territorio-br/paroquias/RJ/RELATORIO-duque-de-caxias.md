# Relatório — Diocese de Duque de Caxias (RJ)

Pesquisa em 2026-09-11. Arquivo: `duque-de-caxias.json`.

## Resumo

| | |
|---|---|
| Paróquias encontradas | **24 ativas** (22 `alta`, 2 `media`) + 2 registros baixados (`baixa`, `status: nao-paroquial`) |
| Paróquias esperadas | 24 (catholic-hierarchy.org, dados de 2023) |
| Comunidades/capelas | **6** (1 `alta`, 1 `media`, 4 `baixa`) — a diocese não publica lista de capelas |
| Horários fixos | **55** (todos `baixa`), cobrindo 7 das 24 paróquias |
| Cobertura de paróquias | **100 %** |

Municípios: Duque de Caxias (15 paróquias) e São João de Meriti (9).
Regiões pastorais confirmadas: **Centro**, **Periferia** e **São João de Meriti** (campo extra `pastoralRegion`).

## O caminho até a lista (o site não tem diretório)

1. O site oficial **`diocesededuquedecaxias.org.br`** estava atrás de dois bloqueios:
   - `curl` direto dava **exit 60 / SSL** e depois **403 "Fortinet Secure DNS Service Portal"** — é o filtro da
     rede local, não o servidor. Resolvido com o truque do README: IP por DNS-over-HTTPS
     (`https://dns.google/resolve?name=diocesededuquedecaxias.org.br&type=A` → `192.185.212.152`) e
     `curl --resolve diocesededuquedecaxias.org.br:443:192.185.212.152`. Depois disso o site responde 200.
   - O WebFetch também bate no mesmo filtro ("self signed certificate"); **só o curl com `--resolve` funciona**.
2. Com o site aberto, **não há lista de paróquias**: o item de menu "Paróquias" aponta para uma *categoria de
   notícias*. A API REST confirma: `wp/v2/pages` devolve `X-WP-Total: 14` e nenhuma é de paróquia; `wp/v2/types`
   não tem nenhum *custom post type* de paróquia; o `sitemap_index.xml` só tem post/page/category/tag/author.
3. O blog antigo da Pascom (`diocesededuquedecaxiasrj.blogspot.com/p/paroquias.html`, de ~2012) tem uma lista,
   mas **incompleta**: 12 paróquias e a seção "Região São João de Meriti" **vazia** (um comentário de 2018 no
   próprio blog corrige a padroeira de Parada Angélica). Serviu só como corroboração de nomes.
4. **O que fechou a lista foi o cadastro da Receita** (truque do README): as paróquias são filiais do CNPJ
   **27.212.968** da Mitra Diocesana de Duque de Caxias. Varri `minhareceita.org/<cnpj>` de `0001` a `0047`
   calculando os dígitos verificadores; achei **35 filiais** e parei após 12 respostas 404 seguidas.
   Saíram **24 paróquias ATIVAS** — exatamente o número que catholic-hierarchy publica para 2023 — mais
   2 baixadas e 9 registros não-paroquiais (colégio, creche, RCC, secretariado, regionais pastorais).
5. Corroboração: os dois posts do **Mutirão de Confissões da Quaresma de 2026** listam as paróquias por região
   pastoral e deram os nomes oficiais (ex.: "Paróquia Santa Teresinha do Menino Jesus", "Paróquia Sagrada Família
   (Igreja Senhor do Bonfim)"). Com isso 22 das 24 ficaram `alta`.

## Confiança, registro a registro

- **`alta` (22)** — nome/cidade/bairro confirmados por Receita **e** por uma segunda fonte (post oficial de 2026
  do Mutirão de Confissões, ou ficha do horariodemissa.com.br com o mesmo endereço).
- **`media` (2)** — só o cadastro da Receita, sem segunda fonte:
  - Paróquia São Francisco de Assis (Campos Elíseos, Duque de Caxias);
  - Paróquia Nossa Senhora do Rosário (Parque Uruguaiana, Duque de Caxias) — filial aberta em **25/02/2022**,
    ainda não aparece em nenhuma comunicação pública da diocese.
- **`baixa` + `status: "nao-paroquial"` (2)** — não devem entrar na carga:
  - **Paróquia Nossa Senhora de Fátima (Vila Rosali, São João de Meriti)** — CNPJ 27.212.968/0017-**BAIXADO**.
    Cuidado: existe outra N. Sra. de Fátima ativa em Vilar dos Teles, no mesmo município.
  - **Curato São Judas Tadeu (Grande Rio, São João de Meriti)** — CNPJ **BAIXADO**; "curato" nem é paróquia.
- **Paróquia Sagrada Família (Parque Senhor do Bonfim)** é a mais nova: filial aberta em **03/01/2024**.
  Não estava na contagem de 2023 do catholic-hierarchy — por isso a diocese hoje tem 24 e não 23.

## Horários — por que todos ficaram `baixa`

A diocese não publica grade de missas em nenhum canal indexável. Os 55 horários vêm **só** de
`horariodemissa.com.br` (fonte única não oficial, sem data por registro) → `baixa` pela escala do README.
Cobertura no agregador: Duque de Caxias 24 igrejas / 5 com grade; São João de Meriti 18 / 3.

Com horário: Catedral de Santo Antônio, N. Sra. de Fátima (Jd. 25 de Agosto), Imaculada Conceição, São Bento
(Duque de Caxias); São João Batista, N. Sra. da Conceição (Coelho da Rocha) e N. Sra. da Glória (São João de Meriti).

O caso de **N. Sra. da Conceição (Coelho da Rocha)** é o mais informativo: o agregador distribui as missas
dominicais por igreja — 8h na matriz, 9h30 na Igreja São José, 11h na Igreja N. Sra. da Saúde e 19h na Igreja
N. Sra. de Fátima. Foi a única fonte de comunidades de verdade da diocese, e por isso essas 3 igrejas entraram
como comunidades `baixa`.

Excluídos por regra: as confissões do Mutirão da Quaresma de 2026 (datas específicas, não recorrência semanal)
e as missas mensais da Comunidade Santa Rosa de Lima ("primeiro/terceiro/quarto domingo", "segundo sábado").

## Pontos para validação humana

1. **Os 55 horários** (`baixa`) — nenhum tem confirmação oficial. O endereço da Catedral no agregador ainda usa
   o nome antigo da avenida ("Av. Presidente Kennedy, 1861"), que hoje é Av. Gov. Leonel de Moura Brizola — é o
   mesmo lugar, mas indica ficha antiga.
2. **Paróquia Nossa Senhora do Rosário (Parque Uruguaiana)** — existe só no cadastro da Receita (2022).
   Confirmar com a Cúria se é paróquia ou capela/comunidade.
3. **Paróquia São Francisco de Assis (Campos Elíseos)** — idem, fonte única.
4. **As duas filiais baixadas** (N. Sra. de Fátima/Vila Rosali e Curato São Judas Tadeu) — descobrir se foram
   extintas, incorporadas ou apenas regularizadas sob outro CNPJ.
5. **Comunidades**: só 6 registradas, todas de passagem. É o maior buraco desta diocese — 24 paróquias em duas
   cidades densas da Baixada certamente têm dezenas de capelas. Nenhuma fonte pública as lista; precisa de
   contato com a Cúria ou do **Anuário Diocesano impresso**, que o blog da Pascom diz ser vendido na
   "livraria Santo Antônio" (não existe versão on-line).
6. **Nomes de matriz**: Paróquia São Bento tem por matriz a **Igreja Sagrada Família** (Parque Fluminense), e
   Paróquia Sagrada Família tem por matriz a **Igreja Senhor do Bonfim** — as duas inversões são reais e vieram
   de fontes oficiais; não "corrigir".
7. **Párocos**: nenhum foi gravado. O site publica as nomeações em notícias soltas (Frei Jorge Luiz Maoski em
   São Francisco de Assis, Frei Jean Ajluni em Santa Clara, Padre Elmir da Silva Mendes em Coelho da Rocha,
   Padre Josias Leal na Imaculada Conceição), mas sem página consolidada e sem data de vigência — não dá para
   saber quem está hoje em cada paróquia sem varrer o feed inteiro.
8. **CEPs** vêm do cadastro da Receita e podem estar desatualizados (vários registros são de 1981).
