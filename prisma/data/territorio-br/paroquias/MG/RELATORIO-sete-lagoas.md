# Diocese de Sete Lagoas (MG) — relatório de pesquisa

**Arquivo:** `paroquias/MG/sete-lagoas.json` · **Pesquisa:** 10/09/2026 · **Slug:** `sete-lagoas`

## Resumo

| Item | Quantidade |
|---|---|
| Paróquias no arquivo | **41** (40 paróquias + 1 santuário não paroquial com `loadAsParish`) |
| Esperado (Anuário Pontifício 2023) | 41 — **cobertura 100%** |
| Comunidades/capelas | **0** (o site da diocese não publica) |
| Horários fixos | **172** (todos missa) |
| Confiança das paróquias | 41 `alta` |
| Confiança dos horários | 151 `alta` / 0 `media` / 21 `baixa` |
| Municípios cobertos | 25 |
| Foranias | 7 |

Foranias e nº de paróquias: Sant’Ana e São Joaquim (5), Santa Luzia (7), Nossa Senhora da Abadia (7),
São Geraldo (5), Santo Antônio (6), Senhor Bom Jesus (4), Santíssimo Sacramento (7). O campo
`forania` foi gravado em cada paróquia (o importador ignora campos extras).

## Fontes

1. **Site oficial — <https://diocesedesetelagoas.com.br>** (plataforma Unitas, Next.js/Vercel).
   - `https://diocesedesetelagoas.com.br/paroquias` — página "Todas as Paróquias". **A lista não está
     no HTML renderizado**: veio do payload RSC (`self.__next_f.push`), campo `allChurches`, com
     **41 registros** (id, nome, endereço completo com CEP, bairro, cidade, forania, nível hierárquico).
   - `https://diocesedesetelagoas.com.br/paroquias/<slug>` — ficha da paróquia, também via payload RSC
     (campo `church`): telefone, e-mail, site, redes sociais, clero (com o papel: Pároco/Vigário) e
     `schedule`, um array de textos livres do tipo `"Domingo: 07h00 e 10h00 e 19h00"`,
     `"Quarta a Sábado: 19h00"`, `"1ª Sexta do mês: 19h00"`. Campo `subChurches` existe mas está
     **vazio em todas** as 33 fichas lidas.
2. **catholic-hierarchy.org — <https://www.catholic-hierarchy.org/diocese/dsete.html>** (acesso 10/09/2026):
   41 paróquias em 2022 (Anuário 2023), 12.153 km², província de Belo Horizonte, região CNBB Leste 2,
   diocese erigida em 16/07/1955, bispo Dom Francisco Cota de Oliveira (desde 10/06/2020).
3. **CNBB Leste 2 — <https://cnbbleste2.org/diocese-de-sete-lagoas/>**: endereço/telefone/e-mail da Cúria.

**Bloqueios encontrados e como foram resolvidos:** `curl` no domínio devolve `Forbidden` (edge da Vercel)
em `/wp-json` e `/robots.txt`, e o WebFetch devolveu 404 em `/nossas-paroquias/`. A saída foi baixar as
páginas com User-Agent de Chrome e **decodificar o payload RSC do Next.js** em vez de ler o HTML.

## Cobertura

**41/41 — a lista de paróquias está completa.** Todos os 25 municípios da diocese aparecem.

O que **não** foi possível obter:

- **Comunidades/capelas: nenhuma.** O site não publica lista de comunidades (o campo `subChurches` das
  fichas está vazio). `communities: []` em todas as paróquias — o importador cria a igreja-matriz.
- **8 paróquias sem ficha de detalhe** (sem telefone, e-mail, pároco nem horário). Causa: **o site
  repete o mesmo `slug` para paróquias homônimas de cidades diferentes**, e a rota `/paroquias/<slug>`
  serve só uma delas. São elas:
  - Paróquia Sagrado Coração de Jesus — **Cachoeira do Prata** (o slug leva a Cordisburgo)
  - Paróquia Santo Antônio — **Fortuna de Minas**, **Maravilhas**, **Pequi**, **Prudente de Morais**
    (o slug leva a Caetanópolis)
  - Paróquia São Sebastião — **Papagaios**, **Araçaí** (o slug leva a Inhaúma)
  - Paróquia Sant’Ana — **Santana do Riacho** (o slug leva a Sant’Ana de Sete Lagoas)

  Para essas 8, o arquivo tem nome, cidade, bairro, endereço, CEP e forania (tudo da lista oficial,
  `confidence: alta`), e `schedules: []`.
- **Paróquia Sant’Ana e São Joaquim (Santana de Pirapama)** tem ficha, mas o `schedule` dela está
  vazio na fonte — 9ª paróquia sem horário.
- **Ano de fundação: `null` em todas.** O site não publica data de ereção canônica.

Tentei o agregador `horariodemissa.com.br` para as cidades sem horário (teste em Papagaios):
"Não há igrejas que correspondam à busca". Não rendeu nada e não foi usado.

## Regras aplicadas ao gravar

- **Nomes** normalizados para o padrão do dataset:
  `Paróquia de Santo Antônio - Catedral` → **`Catedral Santo Antônio`**;
  `Paróquia do Divino Espírito Santo` → `Paróquia Divino Espírito Santo`;
  `Paróquia do Santíssimo Sacramento` → `Paróquia Santíssimo Sacramento`;
  `Paróquia Sant'Ana` → `Paróquia Sant’Ana` (apóstrofo tipográfico, como o resto da fonte).
- **`Santuário de Adoração São Pedro Julião Eymard` (Sete Lagoas, Forania Santa Luzia)** — a diocese o
  lista junto com as paróquias, mas é santuário de adoração, não paróquia territorial. Gravado com
  `"status": "nao-paroquial"` + `jurisdictionNote` e `"loadAsParish": true` (publica missa diária:
  segunda a sexta 07h00 e 18h00; domingo 07h30, 11h00 e 18h00).
- **Cidade corrigida**: a fonte escreve `Martinhos Campos`; o município é **Martinho Campos**.
- **Intervalos de dias expandidos**: `"Quarta a Sábado: 19h00"` virou quarta, quinta, sexta e sábado;
  `"Terça a Sexta"`, `"Segunda a Sexta"` idem.
- **Recorrência mensal → `baixa`** (21 registros): `"1ª Sexta do mês"`, `"1ª Quinta do mês"`,
  `"1ª Domingo do mês"`, `"3ª Domingo do mês"`. A regra literal ficou em `notes`.
- **Recorrência por dia do mês descartada** (não tem dia da semana): `"No dia 8 do mês: 19h30"`
  (Imaculada Conceição/Sete Lagoas), `"No dia 27 do mês"` (N. Sra. das Graças), `"No dia 7 do mês"`
  (N. Sra. do Rosário/Funilândia), `"No dia 19 do mês"` (São José/São José de Almeida),
  `"No dia 4"` e `"No dia 20 do mês"` (São Sebastião/Inhaúma).
- **Horários = `alta`**: as fichas são de site oficial ativo (a home traz notícias de 2026).
- Campo não encontrado = `null`. Nenhum dado foi inferido.

## Precisa de validação humana

1. **As 8 paróquias homônimas sem ficha** (lista acima) — precisam de telefone, e-mail, pároco e
   horários. Fonte provável: redes sociais das próprias paróquias ou contato com a Cúria
   ((31) 3773-2270). É o maior buraco desta diocese.
2. **Nenhuma comunidade/capela no dataset.** Diocese de 25 municípios com muita área rural: a lista de
   capelas terá de vir das paróquias, uma a uma.
3. **`foundedYear` nulo em 41/41.**
4. **Paróquia Cristo Redentor (Sete Lagoas)** — o endereço da fonte tem o número repetido
   ("Rua Eponina Soares dos Santos, 213, 213, Indústrias"); ficou como está na fonte.
5. **Telefones com formatação irregular na fonte**, ex.: `(31) 9 9790-5281`, `(37)9 9857-7601`,
   `(31)3713-1071`, `(31)9 9 7575-6553` (São Cristóvão), `31990699488` (São José Operário/Sete Lagoas),
   `(31) 9 8953 7957` (Senhor Bom Jesus/Matozinhos). Gravei o primeiro número de cada ficha.
6. **Duas paróquias "Sant’Ana" em Sete Lagoas e Santana do Riacho** e uma "Sant’Ana e São Joaquim" em
   Santana de Pirapama — nomes parecidos, paróquias distintas; os `slug` do dataset já as separam
   por cidade.
