# Diocese de Itabira-Fabriciano (MG) — relatório de pesquisa

**Arquivo:** `paroquias/MG/itabira-fabriciano.json` · **Pesquisa:** 10/09/2026 · **Slug:** `itabira-fabriciano`

## Resumo

| Item | Quantidade |
|---|---|
| Paróquias no arquivo | **53** (52 paróquias + 1 santuário não paroquial com `loadAsParish`) |
| Esperado (Anuário Pontifício 2024, dados de 2023) | 51 |
| Comunidades/capelas | **533** |
| Horários fixos | **622** (617 missas, 5 adorações) |
| Confiança das paróquias | 53 `alta` / 0 `media` / 0 `baixa` |
| Confiança dos horários | 298 `alta` / 34 `media` / 290 `baixa` |
| Municípios cobertos | 25 |

## Fontes

1. **Site oficial da diocese — <https://dioceseitabira.org.br>** (fonte principal, praticamente tudo veio dela).
   - `https://dioceseitabira.org.br/paroquia-sitemap.xml` — sitemap Yoast do custom post type `paroquia`,
     com **53 fichas** e `lastmod` por ficha (de 23/01/2025 a 27/07/2026). Foi a lista canônica.
   - Uma ficha por paróquia (`/paroquia/<slug>/`), cada uma com: nome, endereço completo + CEP,
     data de ereção canônica, pároco, vigário(s), diácono, telefone/WhatsApp, e-mail, site, redes
     sociais, **bloco "Comunidades"** (nome + endereço de cada capela) e **bloco "Horários de Missas
     e Celebrações"**. Todas as 53 fichas têm os dois blocos.
   - `https://dioceseitabira.org.br/curia-diocesana/` — endereço, CEP, telefone e e-mail da Cúria
     (Rua Coronel Linhares Guerra, 100 – Centro, Itabira, 35900-020).
2. **catholic-hierarchy.org — <https://www.catholic-hierarchy.org/diocese/ditfa.html>** (acesso 10/09/2026):
   51 paróquias em 2023, 8.888 km², província eclesiástica de Mariana, região CNBB Leste 2,
   diocese erigida em 14/06/1965 (nome mudou para Itabira-Fabriciano em 01/06/1979).

Não houve bloqueio nem site fora do ar: `curl` com User-Agent de Chrome resolveu tudo.

## Cobertura

53 fichas × 51 paróquias esperadas. A diferença é explicada e **não** é duplicação:

- **Santuário Nossa Senhora da Piedade (Coronel Fabriciano)** — a própria ficha diz que é santuário
  diocesano (decreto de 22/04/2016), situado **em território da Paróquia São Francisco Xavier**, que o
  administra. Gravado com `"status": "nao-paroquial"`, `jurisdictionNote` e `"loadAsParish": true`
  (publica missa fixa).
- **Paróquia São Francisco de Assis (Timóteo)** — erigida em 24/12/2024, posterior ao censo de 2023.
- **Paróquia Nossa Senhora de Fátima (Coronel Fabriciano)** — erigida em 09/05/2021.

Os 25 municípios batem com a descrição oficial da diocese ("24 municípios"): o site lista também o
distrito de Nossa Senhora do Carmo, que pertence a Itabira (gravado como `city: Itabira`,
`neighborhood: Distrito de Nossa Senhora do Carmo`).

## Regras aplicadas ao gravar

- **Nomes**: mantidos os da fonte, com prefixo padronizado. Dois ajustes de forma:
  `Paróquia Nossa Senhora do Rosário (Catedral Diocesana)` → `Catedral Nossa Senhora do Rosário`;
  `Paróquia São Sebastião / Co-Catedral` → `Concatedral São Sebastião` (Coronel Fabriciano).
  `Paróquia São Luis de Maria Montfort` → `Paróquia São Luís Maria de Montfort` (grafia do santo).
- **Comunidades**: 416 vieram do bloco "Comunidades" das fichas (`confidence: alta`, com endereço);
  as outras 117 foram deduzidas do bloco de horários, quando a paróquia publica missa num local que
  não está na lista de comunidades (`confidence: media`, sem endereço). A matriz recebe `isMatriz: true`
  quando identificável pelo nome ("Matriz …", "Catedral …", "Igreja Matriz …") ou pelo padroeiro +
  endereço da paróquia; nas demais, o importador cria a matriz automaticamente.
- **Horários**: `alta` quando o `lastmod` da ficha é dos últimos 12 meses (≥ 10/09/2025); `media`
  quando é anterior; `baixa` para **recorrência mensal** e para a ficha desatualizada citada abaixo.
- **Recorrência mensal → `baixa`** (290 registros, quase metade do total): a diocese publica muitíssima
  missa rural do tipo "1º domingo", "toda 2ª quarta-feira do mês", "último sábado". O `MassSchedule`
  só guarda dia da semana, então esses horários ficam `baixa` com a regra literal em `notes`
  (`Recorrência mensal na fonte: "…"`). Paróquias inteiras caem nessa categoria: **São Miguel
  (Rio Piracicaba)**, **Santo Antônio (Mesquita)**, **São Sebastião (Dionísio)**, **São Gonçalo
  (São Gonçalo do Rio Abaixo)** — a escala delas é toda mensal.
- **Celebração da Palavra não entrou como missa**: entradas marcadas só como "Celebração",
  "Celebração da Catequese" ou "Culto" foram descartadas; "Missa/Celebração" entrou como `MASS`.
  Novena, Ofício Divino, Via Sacra, batizado e reunião também foram descartados.
- **Recorrência por dia do mês** ("todo dia 13", "todo dia 28 em honra a São Judas Tadeu") foi
  **descartada**, porque não tem dia da semana algum — nem cabe no modelo nem em `baixa` útil.
- Campo não encontrado = `null`. Nenhum dado foi inferido.

## Precisa de validação humana

1. **Bispo diocesano = `null`.** A diocese está **vacante**: Dom Marco Aurélio Gubiotti foi nomeado
   arcebispo de Juiz de Fora em 08/01/2026 e o site traz **Pe. Pascifal José do Nascimento como
   Administrador Diocesano** — que não é bispo. Deixei `bishopName: null` de propósito; se o Parish
   quiser exibir o administrador, é decisão de produto.
2. **Paróquia São Sebastião / Concatedral (Coronel Fabriciano)** — a ficha de horários abre com
   *"(Não os horários durante a Quarentena)"*, texto de 2020/2021, e o `lastmod` é 12/02/2025.
   Os 13 horários dessa paróquia foram gravados como **`baixa`** e precisam de reconferência.
3. **Seis paróquias sem nenhum horário publicado** (bloco vazio na fonte): Nossa Senhora da Piedade
   (Itabira), Nossa Senhora de Fátima (Coronel Fabriciano), Santo Antônio (Coronel Fabriciano),
   Santo Antônio de Pádua (São Domingos do Prata), São João Batista (Itabira), São Sebastião (Timóteo).
4. **Duas paróquias sem lista de comunidades**: São João Batista (Itabira) e São Sebastião (Timóteo).
5. **Telefones fora do padrão** (como estão na fonte, sem parênteses/separador):
   `31995044158` (Bom Jesus/Bom Jesus do Amparo), `31 99170-0054` (N. Sra. de Fátima/Coronel
   Fabriciano), `31 3193-0490` (Santo Antônio de Pádua/São Domingos do Prata), `31 98824-8875`
   (São Francisco de Assis/Timóteo), `31 98212 9174` (São José/São José do Goiabal).
6. **Paróquia Santo Antônio (Mesquita)** — a ficha traz `CEP:` vazio; a cidade foi lida do endereço
   ("Praça Benedito Valadares 36, Centro - Mesquita") e o CEP ficou `null`. O DDD publicado é (33),
   diferente do resto da diocese (31) — plausível para Mesquita, mas vale conferir.
7. **10 paróquias sem ano de fundação** — a ficha não traz "Ereção Canônica".
8. **Nomes de comunidade deduzidos do texto de horários** (117, `confidence: media`) podem estar
   abreviados como a paróquia escreveu ("Nossa Sra. Aparecida - Parque das Águas", "Bairro Fátima",
   "Asilo", "Hospital"). O importador casa por nome com busca aproximada; convém revisar antes de
   exibir no app.
