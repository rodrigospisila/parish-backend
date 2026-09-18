# Diocese de Alagoinhas — relatório de pesquisa

- **Slug**: `alagoinhas` · **UF**: BA · **Sede**: Alagoinhas · **Província**: São Salvador da Bahia · **Regional**: Nordeste 3
- **Pesquisa**: 18/09/2026
- **Bispo**: Dom Francisco de Oliveira Vidal (desde 27/09/2022)
- **Cúria**: Rua Manoel Vitorino, 368, Centro · 48005-500 · (75) 3422-3209 · curia@diocesedealagoinhas.com
- **Site oficial**: <https://diocesedealagoinhas.com> — **vivo**, WordPress com tipo de conteúdo próprio `paroquias`

## Resultado

| Métrica | Valor |
|---|---|
| Paróquias | **42** — 33 `alta` (site oficial) · 9 `media` (só no cadastro da Receita) |
| Comunidades | **42** (só as igrejas-matriz — nenhuma paróquia publica lista nominal) |
| Horários fixos | **116** (107 MASS · 5 CONFESSION · 4 ADORATION) — 83 `media`, 33 `baixa` |
| Paróquias com algum horário | **29 de 42** |
| Horários carregáveis (`alta`/`media`) | **83** |

**Cobertura: 42 de 42.**

## Fontes principais

1. **REST do WordPress do site oficial** — `/wp-json/wp/v2/paroquias?per_page=100` devolve as **33 fichas**
   publicadas (`X-WP-Total: 33`) e `/wp-json/wp/v2/clero?per_page=100` as 29 fichas de clero. O corpo
   da ficha é Elementor: os dados úteis só aparecem no HTML da página pública
   (`/paroquias/<slug>/`), que baixei uma a uma.
2. **A tabela `dce-acf-repeater-table` de cada ficha** — é o repetidor ACF do Elementor com as colunas
   **Tipo / Dia da Semana / Horário / Observações**. Foi de onde saíram os 107 horários de missa.
   Os e-mails vêm ofuscados pelo Cloudflare (`data-cfemail`) e foram decodificados.
3. **Receita Federal via `minhareceita.org`** — CNPJ raiz **13.646.252**, varredura de `/0001` a
   `/0060`: existem exatamente **48 inscrições**, nada além. Foi o que **fechou a lista** e acrescentou
   9 paróquias que o site não publica.
4. **Mapa das OSC / IPEA** — busca avançada por `cd_municipio = 2900702` (Alagoinhas) com **um filtro
   só**; foi assim que achei o CNPJ raiz (5 inscrições da "DIOCESE DE ALAGOINHAS" em Alagoinhas).
5. **`gcatholic.org/churches/local/alag0`** (atualizada em 01/01/2026) — 38 igrejas, 35 marcadas
   "Parish". Corrobora 6 das 9 paróquias que só a Receita registra.
6. **`catholic-hierarchy.org/diocese/dalag.html`** — 34 paróquias e 53 presbíteros em 2022 (ap2023).
7. **`liriocatolico.com.br`** (`/horario_missa/dados/uf/BA.json`) — 9 fichas no território da diocese.
8. **ViaCEP** — para conferir três CEPs.

## Prova de completude — as três contagens

| Fonte | Total |
|---|---|
| Fichas publicadas pelo site oficial | 33 |
| Filiais ATIVAS com nome de paróquia no CNPJ 13.646.252 | **42** |
| Annuario Pontificio 2023 (catholic-hierarchy) + 8 inscrições novas de 2023–2026 | 34 + 8 = **42** |
| gcatholic (01/01/2026) | 35 "Parish" (não registra as 7 mais novas) |

As 48 inscrições do CNPJ são: **42 paróquias ATIVAS**, a sede (`/0001`), o Centro Diocesano
(`/0022`), o Seminário Dom Jaime Mota de Farias em Salvador (`/0024`), uma inscrição **sem nome
fantasia em Teodoro Sampaio** (`/0017`, Praça da Matriz, 11, bairro Lustosa — possível capela), a
**Rede Fale Fácil** (`/0025`, SUSPENSA) e uma inscrição **NULA** da Paróquia N. Sra. das Graças
(`/0040`, substituída pela `/0042`).

### As 9 paróquias que o site da diocese NÃO publica

| Paróquia | Município | Inscrição na Receita | gcatholic |
|---|---|---|---|
| N. Sra. da Divina Pastora | Cardeal da Silva | 28/10/2009 | sim |
| Bom Jesus | Crisópolis | 26/01/1994 | sim |
| São José (Buril) | Crisópolis | **12/03/2026** | não |
| N. Sra. dos Prazeres | Entre Rios | 04/11/1975 | sim |
| São Sebastião (Porto de Sauípe) | Entre Rios | 04/02/2021 | não |
| N. Sra. da Piedade | Esplanada | 04/11/1975 | sim |
| N. Sra. Rainha da Paz (Baixa Grande) | Inhambupe | 29/03/2019 | não |
| N. Sra. da Abadia e Santo Antônio | Jandaíra | 04/11/1975 | sim |
| São Francisco de Assis do Litoral (Praia do Forte) | Mata de São João | 11/03/2010 | sim |

Todas `media`. As três sem corroboração do gcatholic (São José do Buril, São Sebastião do Porto de
Sauípe e N. Sra. Rainha da Paz) são as que mais precisam de validação humana.

## Horários — por que quase tudo é `media`

As fichas do site foram **modificadas em outubro/novembro de 2024** (duas em 30/07/2025 e uma em
05/10/2025). É fonte **oficial sem sinal de atualidade** pela régua do README — logo `media`, que
carrega. Nenhum horário é `alta`.

São `baixa`:

- **22 celebrações de recorrência mensal** ("1ª sexta-feira do mês", "2º sábado do mês", "último
  sábado do mês", "2º domingo do mês", "1º sábado do mês") — gravadas com o `dayOfWeek` da semana e a
  regra literal em `notes`; e **uma de data fixa** ("Dia 18 de cada mês", Renovação da Aliança em Rio
  Real) com `dayOfWeek: null`.
- **20 horários vindos só do Lírio Católico**, para 4 paróquias sem grade oficial: Santuário São
  Francisco de Assis (Alagoinhas), N. Sra. dos Prazeres (Entre Rios), São Francisco de Assis do
  Litoral (Praia do Forte) e as confissões/adoração de Santa Dulce e de Inhambupe. O campo
  `ultima_atualizacao` do Lírio é 02/09/2026 em quase todas as fichas da Bahia — é a **data de
  regeneração da base**, não de conferência.

**Exceção anotada**: a ficha de Santa Dulce dos Pobres no Lírio tem carimbo próprio
(`2026-09-04T13:54:54.923Z`, com hora) e **confirma item a item** a grade oficial.

## Corroborações e divergências entre o site e o Lírio Católico

| Paróquia | Confere | Diverge |
|---|---|---|
| Santa Dulce dos Pobres | dom 08:00/18:00, ter 19:00, qui 19:00 | — |
| N. Sra. do Livramento (Rio Real) | dom 07:30/19:30, qui 19:30 | — |
| Divino Espírito Santo (Inhambupe) | dom 08:00/19:00, qui 19:00 | endereço: site "Centro"; Lírio "Praça Cônego Maximiano" |
| Catedral de Santo Antônio | dom 07:30, seg–sex 12:00 | Lírio acrescenta dom 12:00 e dá 18:00 onde o site dá 18:30 — **não gravei** |
| N. Sra. de Nazaré (Itapicuru) | — | Lírio só registra dom 19:00; o site dá 07:30 e 19:00 |

## Comunidades — a lacuna desta diocese

**Nenhuma** das 33 fichas publica lista nominal de comunidades. A de Nova Soure chega a exibir o
bloco "Comunidades" com o texto **"25 comunidades"** — só o número. Por isso `communities` traz
apenas a igreja-matriz de cada paróquia (42 no total), e o importador não vai criar capelas.

## Igrejas não paroquiais deixadas de fora

Listadas pelo gcatholic, sem missa em fonte que sustente `media`/`alta` — pela regra do README, não
entram:

- **Convento/Mosteiro Nossa Senhora do Rosário de Pompeia** (Esplanada) — tem grade no Lírio
  (dom 07:00/17:00, ter 07:00, qua–sex 19:00, sáb 19:00, adoração sexta 18:00–19:00), mas só nele.
- **Santuário da Divina Misericórdia** (Crisópolis).
- **Igreja Santo Antônio** (Alagoinhas) — segunda igreja de Santo Antônio na cidade, sem marca de
  paróquia no gcatholic.

## Precisa de validação humana

1. **Pároco da Catedral** — a ficha lista três presbíteros sem dizer qual é o pároco; gravei o
   primeiro (Pe. Pedro Miquel Costa dos Reis). A diocese não publica página com função paroquial de
   cada padre (o tipo `clero` traz só o nome).
2. **6 paróquias sem pároco publicado**: Santa Terezinha, Santuário São Francisco de Assis e N. Sra.
   das Graças/Raso; e as 3 fichas **inteiramente vazias** — Deus Menino (Araçás), São Francisco de
   Assis (Itanagra) e N. Sra. da Ajuda e Santana (Teodoro Sampaio), das quais só conheço o endereço
   pela Receita.
3. **As 3 paróquias que só a Receita registra** (São José do Buril, São Sebastião do Porto de Sauípe,
   N. Sra. Rainha da Paz).
4. **`13646252001700`** — inscrição ativa do CNPJ diocesano em Teodoro Sampaio (Praça da Matriz, 11,
   bairro Lustosa), **sem nome fantasia**, ao lado da N. Sra. da Ajuda e Santana. Capela, endereço
   antigo ou segunda paróquia? Não virou paróquia neste arquivo.
5. **Endereço do Santuário N. Sra. do Monte (Conde)** — a Receita dá Praça Severino Vieira, 309, o
   mesmo endereço da Paróquia Nosso Senhor do Bomfim, também em Conde. A ficha oficial só diz "Vila
   do Conde - BA".
6. **E-mail da Paróquia São José (Itamira/Aporá)**: `paroquiajose@gmail.com.br` — provável erro de
   digitação do CMS.
7. **Telefone da Paróquia São Pedro e São Paulo (Lagoa Redonda)**: a Receita dá `7996089101` —
   DDD 79 (Sergipe) com 8 dígitos. Gravei como `(79) 9608-9101`.
8. **Sagrado Coração de Jesus (Heliópolis)** — a ficha oficial põe o **endereço dentro do campo
   "E-mail"**; a paróquia fica sem e-mail no arquivo.
9. **Grafia "Bomfim" × "Bonfim"** (Conde) — mantida a do site e da Receita ("Bomfim").

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

- **`phone`**: está `(75) 3421-1842`. O **rodapé do site oficial** publica **`(75) 3422-3209`**, que
  é também o telefone da matriz do CNPJ na Receita. O `3421-1842` aparece na Receita como
  `754211842` (8 dígitos, anterior ao nono dígito) para o **Centro Diocesano** — pode estar
  desatualizado.
- **`email`**: está `null`. O rodapé publica **`curia@diocesedealagoinhas.com`**.
- **`address`**: está `Rua Dr. Manoel Vitorino 368`. O rodapé publica **"Rua Manoel Vitorino, 368,
  Alagoinhas/BA"** (sem "Dr.") e dá o CEP **48.018-060**, que é o da **matriz do CNPJ** (Rua Manoel
  Vitorino, **584**, bairro Terezópolis) — enquanto a Receita atribui **48005-500** à Rua Manoel
  Vitorino, **368** (Centro Diocesano). O `zipCode` atual (48005-500) parece certo para o nº 368;
  a divergência é do próprio rodapé do site.
- `website`, `bishopName` e `foundedYear` conferem — **nada a mudar**.

## O que ficou por fazer

- **Comunidades/capelas**: a diocese não as publica em lugar nenhum. Seria preciso ir às redes
  sociais de cada paróquia, uma a uma.
- **13 paróquias sem nenhum horário** (6 do site com ficha vazia ou sem tabela + as 7 da Receita sem
  grade em fonte alguma).
- Não consultei Instagram das paróquias (o orçamento foi para fechar as seis dioceses da rodada).
