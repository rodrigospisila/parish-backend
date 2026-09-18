# Diocese de Zé Doca (MA) — relatório de pesquisa

Data da coleta: **2026-09-18**. Agente de pesquisa (rodada MA — fechamento do Maranhão).

## Resumo

| Item | Valor |
|---|---|
| Paróquias no JSON | **22** |
| Confiança das paróquias | 22 `alta` |
| Comunidades | 7 (só as capelas de Godofredo Viana, `baixa`) |
| Horários fixos | 18, todos `baixa` |
| Cobertura | 22 encontradas × 21 esperadas (catholic-hierarchy 2023) |

## Fontes principais

1. **Receita Federal** (via `minhareceita.org` + Mapa das OSC/IPEA). Esta diocese **não publica
   lista de paróquias**, e a Receita fechou a lista em duas etapas:
   - Busca por razão social "DIOCESE DE ZE DOCA" no Mapa das OSC → 15 inscrições do CNPJ
     **06.932.990** (1 matriz/cúria + 14 paróquias, todas ATIVAS).
   - Nove municípios da diocese não tinham filial da mitra. Varrendo o Mapa das OSC **por
     `cd_municipio`** (um filtro por vez, como manda o README), apareceram **8 paróquias com CNPJ
     próprio**: Amapá do Maranhão, Boa Vista do Gurupi, Centro do Guilherme, Junco do Maranhão,
     Maracaçumé, Nova Olinda do Maranhão, Presidente Médici e São João do Carú.
2. `gcatholic.org/churches/local/zedo0` (22 igrejas, 19 marcadas "Parish", atualizado em
   01/01/2026) e `catholic-hierarchy.org/diocese/dzedo.html` (21 paróquias em 2023).
3. **Blog oficial `https://diocesezedoca-ma.blogspot.com` — ATIVO** (posts de 08, 10 e 14 de
   setembro de 2026). Confirma a diocese e o bispo, mas **não tem página de paróquias, clero,
   comunidades nem horários** — é um blog de notícias.
4. `liriocatolico.com.br` — única fonte de horário.

## O que a Receita revelou e nenhuma outra fonte tem

Três paróquias criadas depois do último censo do catholic-hierarchy e ausentes do gcatholic:

| Paróquia | Cidade | Início na Receita |
|---|---|---|
| Paróquia Nossa Senhora da Conceição | Governador Newton Bello | **27/02/2025** |
| Paróquia São José (Distrito Paruá) | Santa Luzia do Paruá | **27/10/2025** |
| Paróquia São Pedro | Maranhãozinho | **25/05/2026** |

(Também a Paróquia Santa Rita de Carutapera, de 17/07/2024, que o gcatholic ainda não lista.)

Duas paróquias aparecem **duas vezes na Receita**, como filial da mitra e com CNPJ próprio, no
mesmo endereço — são a mesma paróquia, não duplicadas no JSON: Catedral de Santo Antônio
(06.932.990/0011-54 e 12.425.911/0001-40) e São João Batista de La Salle e N. Sra. Aparecida
(06.932.990/0012-35 e 32.919.860/0001-10).

## Igrejas que NÃO entraram

| Igreja | Cidade | Motivo |
|---|---|---|
| Santuário Nossa Senhora Aparecida / São Sebastião (CNPJ 13.809.111/0001-95, razão social "COMUNIDADE CATOLICA DE SAO SEBASTIAO") | Araguanã | o gcatholic marca **Shrine**, não Parish, e não há horário publicado em fonte que sustente `media` |
| Proto-Catedral Nossa Senhora Imaculada Conceição | Cândido Mendes | igreja não paroquial (ex-catedral da Prelazia de Cândido Mendes), sem horário publicado |
| Santuário Nossa Senhora de Nazaré | Cândido Mendes | santuário, sem horário publicado |

## Horários — por que todos são `baixa`

Só o Lírio Católico publica grade nesta diocese, e por regra do README agregador sozinho, com
data de regeneração de base, é `baixa`. Entraram 18 horários (Catedral de Santo Antônio, Basílica
de São Sebastião de Carutapera, N. Sra. da Conceição de Cândido Mendes e N. Sra. Mãe da Igreja de
Godofredo Viana, esta última com as adorações das capelas).

**Descartes por dado implausível ou de outra cidade** (regra "confira cidade e UF de tudo"):

- `Cândido Mendes | Igreja Matriz Sagrada Família | Praça Cardeal Arco-Verde, 100 - Centro |
  tel (11) 4224-2587` → telefone de São Paulo e logradouro que não existe em Cândido Mendes.
- `Maranhãozinho | Igreja Nossa Senhora da Conceição | endereço "Santo Amaro do Maranhão"`,
  `Igreja São José | endereço "Pastos Bons"` e `Oasis Franciscano | endereço "Trizidela do Vale"`
  → três municípios diferentes e distantes registrados como endereço de Maranhãozinho.
- `Maranhãozinho | Igreja São Francisco de Assis | Tv Joaquim Diniz` → sem horário, vínculo
  desconhecido.
- `Carutapera | Igreja Matriz Santa Rita de Cássia` (Instagram `paroquiasantaritadecassiacaru`) →
  é a **Paróquia Santa Rita** já no JSON, mas a ficha não traz horário.

## Comunidades

Só Godofredo Viana tem capelas listadas (6 capelas no Lírio, mais a matriz). Como o município tem
**uma única paróquia** (N. Sra. Mãe da Igreja), as capelas foram gravadas como comunidades dela,
com confiança **`baixa`** — o vínculo é inferido pela unicidade da paróquia no município, não
publicado por fonte oficial. As demais 21 paróquias ficam com `communities: []` (o importador cria
a matriz).

## Para o enxame de validação humana

1. **Párocos**: nenhum. A diocese não publica clero e a Receita não traz responsável útil.
   `priestName: null` nas 22.
2. **`foundedYear` das paróquias**: `null`. A data de início de atividade na Receita (1993-05-20
   em bloco para 8 delas) é a data de **inscrição do CNPJ**, não de ereção canônica — pela lição
   do README ("data repetida em massa → null"), não foi usada.
3. **Godofredo Viana**: confirmar o vínculo das 6 capelas e se as "adorações" do Lírio são mesmo
   adoração ou missa.
4. **Araguanã**: confirmar se o Santuário N. Sra. Aparecida já é paróquia (a razão social na
   Receita é "Comunidade Católica de São Sebastião").
5. **Telefone da cúria**: o `dioceses.json` traz `(98) 98116-4624`, que a Receita registra como
   telefone da **Paróquia N. Sra. do Perpétuo Socorro de Governador Nunes Freire**, não da cúria
   (a matriz 06.932.990/0001-82 não tem telefone cadastrado). Conferir.

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

| Campo | Valor atual | Observação |
|---|---|---|
| `address` | "Av. do Comercio 363, C.P. 5" | a Receita registra a matriz em **Avenida do Comércio, 165**, Centro, e a Catedral em Av. do Comércio, 86. O nº 363 não aparece em nenhuma fonte de 2026 — conferir |
| `phone` | "(98) 98116-4624" | é o telefone da paróquia de Governador Nunes Freire na Receita; a cúria não tem telefone cadastrado — conferir |
| `bishopName` | "Dom Jan Kot, O.M.I." | correto; note que o blog oficial e as paróquias o grafam **"Dom João Kot"** (forma portuguesa). Mantido "Jan Kot" por ser a forma do gcatholic/catholic-hierarchy |
| `website` | `https://diocesezedoca-ma.blogspot.com` | confere, blog ATIVO (post de 14/09/2026) |

`foundedYear` 1961 é a ereção da **Prelazia de Cândido Mendes** (16/10/1961) — está certo pela
convenção do dataset. **Não alterar.**
