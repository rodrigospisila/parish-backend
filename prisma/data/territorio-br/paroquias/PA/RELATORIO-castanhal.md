# Relatório — Diocese de Castanhal (`castanhal`)

Pesquisa em 2026-09-17. Arquivo: `castanhal.json`.

## Resultado

| Item | Valor |
|---|---|
| Paróquias | **40** — 39 `alta` · 1 `media` (São Vicente Ferrer, Inhangapi) · 0 `baixa` |
| Comunidades | **1.137** (40 igrejas-matriz + 1.097 comunidades; 303 urbanas, 825 rurais) — 1.088 `alta`, 49 `media` |
| Horários fixos | 119 — 103 `alta`, 1 `media`, 15 `baixa` (118 missas + 1 confissão) |
| Cobertura | **40/40** (Wikipédia: 40 em 6 foranias; Receita: 37 filiais + 3 sem CNPJ; Anuário Pontifício 2024: 36, dado de 2023) |
| Foranias | São José 11 · Santa Izabel 7 · N. Sra. Auxiliadora 6 · N. Sra. do Rosário 6 · N. Sra. do Perpétuo Socorro 5 · São Pedro 5 |
| Maiores paróquias | Vigia 91 comunidades · São Domingos do Capim 72 · Curuçá 68 · Maracanã 56 · Capanema (Perpétuo Socorro) 54 · Igarapé-Açu 53 |

## Fonte principal — dados embutidos no JavaScript do site

`https://diocesedecastanhal.com.br` é uma SPA (React, feita no Lovable): o HTML de `/paroquias` vem vazio
e **não há API para as paróquias** — só as notícias vêm do Supabase. As fichas estão escritas dentro do
bundle `https://diocesedecastanhal.com.br/assets/index-C1rRf3Sj.js`, em dois arrays literais:

- `Lo=[…]` — 39 fichas de paróquia: nome, cidade, forania, endereço, telefone, e-mail, texto livre de missas,
  pároco, vigário, diáconos e a lista de comunidades (`name`, `location`, `type: urbana|rural`) — 1.137 linhas;
- `Lu=[…]` — 152 membros do clero com cargo, forania e paróquia (deu o pároco e a forania das 5 fichas que
  vinham com forania em branco: todas da **Forania São Pedro**).

Extraí os dois literais por contagem de colchetes e avaliei em sandbox (`vm`), sem nenhuma leitura por
modelo — toda grade foi digitada a partir do texto literal, que ficou guardado em `schedulesOfficialText`.
A URL por paróquia (`/paroquias/<id>`) existe e foi usada como fonte de cada ficha.

**Atualidade**: a imagem de pré-visualização do site é de 30/03/2026, uma ficha traz o link "Inscrição
Catequese Matrimonial 2027" e a última notícia publicada é de 24/08/2026 (li só título e data da tabela
pública de notícias, como o próprio navegador faz). Por isso paróquias, comunidades e horários inequívocos
entram como `alta`.

## A 40ª paróquia estava escondida dentro da ficha 27

A ficha 27 (Paróquia São Sebastião, Igarapé-Açu) **funde duas paróquias**: no meio da lista rural há uma
linha-marcador `INHANGAPI`, seguida de 42 comunidades rurais; na lista urbana há uma segunda sequência
alfabética que termina em `São Vicente Ferrer (matriz) – Centro`; e o texto de missas tem duas grades
("Missas Dominicais: 07h00, 09h00, 19h00 | Sábado: 18h00, 19h300 | **Missas dominicais: 08h00 e 19h00**").
Confirmações independentes de que a **Paróquia São Vicente Ferrer (Inhangapi)** existe:

- Wikipédia lista 40 paróquias e inclui "Paróquia São Vicente Ferrer (Inhangapi)" na Forania N. S. do Rosário;
- Receita Federal: filial **07.258.455/0008-27 — PAROQUIA SAO VICENTE FERRER, Av. Ernani Lameira, 05, Centro,
  Inhangapi, CEP 68770-000, situação ATIVA**.

Separei-a em ficha própria com `confidence: "media"`: 47 comunidades (a matriz, 4 urbanas da Vila Nova
atribuídas por inferência — com nota — e as 42 rurais que vêm depois do marcador). A segunda grade
("08h00 e 19h00") foi atribuída a ela **por inferência** e ficou `baixa`. Pároco não publicado; é provável
que o site tenha fundido as fichas porque o mesmo clero atende as duas (hipótese, não gravada).

### Prova de completude pela Receita

CNPJ-base **07.258.455**: 39 ordens, todas ativas — a matriz (Cúria), um ateliê (AMACOM) e **37 paróquias**.
As 3 paróquias sem filial são São Barnabé e São Carlo Acutis (recentes; a ficha de São Barnabé traz
literalmente "CNPJ: 07.258.455/" no campo de endereço, ainda por preencher) e N. Sra. da Conceição de Santa
Izabel. 37 + 3 = **40**, nada além. Diferente de Belém, aqui os endereços da Receita **batem** com os do site
(mesma rua e número em quase todas), então usei o CEP da Receita: nos municípios de CEP único (todos menos
Castanhal e Capanema) sempre; em Castanhal/Capanema só quando a rua coincide e o CEP não se repete.

## Tratamento das comunidades

A lista veio de uma tabela convertida, com ~58 irregularidades tratadas por uma tabela de correções explícita
(`FIX` no gerador, por id de ficha + índice):

- **nome e localidade colados** num campo só (cerca de 30 casos: "Nossa Senhora do Perpétuo Socorro Ananinteua
  Km 06 PA/MA", "Imaculado Coração de Maria Imperial"…) — separados;
- **matriz indicada pela própria fonte** ("(Matriz)", "- Matriz", "Catedral", localidade "Matriz"/"Centro
  Matriz") em 17 fichas; em outras 14 a matriz é a comunidade homônima da paróquia, no bairro do endereço
  (em Vigia, o Santuário Madre de Deus); em **9 fichas a lista não inclui a igreja-matriz** e ela foi criada
  com o endereço da paróquia (São Carlo Acutis, São Paulo VI, Santa Izabel de Portugal, São Caetano de
  Odivelas, São Francisco do Pará, São Jorge, Perpétuo Socorro de Capanema, Primavera e Rainha da Paz);
- **4 linhas descartadas**: "Macapazinho" e "Matupiriteua | Vila de Caraparu" (continuação da localidade da
  linha anterior), o marcador "INHANGAPI" e uma linha repetida ("Santo André | São Pedro");
- **5 cabeçalhos "Núcleo …"** de Curuçá não são comunidades: viraram o campo `sector` das comunidades seguintes;
- abreviações e acentos faltantes expandidos só por ortografia (Sra.→Senhora, P. Socorro→Perpétuo Socorro,
  Fatima→Fátima); caixa irregular corrigida ("Cristo rei", "Vila nova");
- **homônimas na mesma paróquia** (norma na zona rural — seis "Nossa Senhora de Nazaré" só em Inhangapi)
  recebem a localidade no nome: "Comunidade Nossa Senhora de Nazaré – Pitimandeua". São 496 nomes assim.
- Campo extra `zone` (urbana/rural); a localidade vai em `neighborhood` e, nas rurais, também em `address`.

## Horários

O texto de missas é livre e curto; converti à mão, sempre como missa dominical/sábado na matriz, salvo quando a
fonte diz o local (Paróquia Santa Cruz: "09h00 Capela do Calvário" → comunidade N. Sra. das Dores - Calvário;
"Sábado 17h00 Capela Monte Sinai" → comunidade São Sebastião - Monte Sinai). A única confissão publicada é a
da Paróquia São José (quintas, a partir das 15h30). Datas de Círio (festa anual) ficaram em `notes`.

Ficaram `baixa` (15):
- **Vigia** (6): "06h, 07h, 07h30, 09h30 (3x), 18h00, 19h30" — há missas simultâneas e 42 comunidades urbanas;
  a fonte não diz os locais. Não achei publicação da paróquia com os locais.
- **N. Sra. da Conceição** e **N. Sra. de Fátima** de Santa Izabel (5): "Horários das Missas: …" sem dizer o dia.
- **Santa Izabel de Portugal**: "3ºdom 09h00" (recorrência mensal). **Santo Antônio do Tauá**: "10h00
  (comunidade interior)" — não é na matriz e o local não é dito.
- **Inhangapi** (2): grade atribuída por inferência.

`media` (1): sábado "19h300" de Igarapé-Açu, lido como 19h30. Sem nenhum horário publicado: Jesus Cristo Jovem
(Castanhal) e N. Sra. Imaculada Conceição (Santarém Novo).

## Pontos para validação humana

1. **Inhangapi** — confirmar pároco, forania (Wikipédia diz N. S. do Rosário; a ficha-hospedeira é da N. Sra.
   Auxiliadora), endereço e as 4 comunidades urbanas da "Vila Nova" atribuídas por inferência.
2. **Vigia** — obter os locais das 8 missas dominicais; conferir a adoção do Santuário Madre de Deus como
   igreja-sede (a fonte não marca a matriz). A cidade aparece na fonte como "Vigia de Nazaré"; gravei "Vigia".
3. **Matriz adotada por inferência** (`media`): N. Sra. da Conceição de Santa Izabel (comunidade homônima em
   Americano; a ficha não tem endereço) e N. Sra. do Socorro de Salinópolis (Centro × "Setor São Vicente").
4. **São Paulo VI (Castanhal)** — não há igreja "São Paulo VI" na lista; o endereço é Praça Madre Teresa e a
   primeira comunidade é Santa Teresa de Calcutá: conferir se é a igreja-sede.
5. **Fichas incompletas na fonte**: São Barnabé (sem endereço, telefone e e-mail), São Carlo Acutis (telefone
   "Dia da Festividade:"), N. Sra. de Fátima (e-mail truncado "…@gmail."), São Domingos do Capim (e-mail
   "@gmail.com.br"), Santo Antônio do Tauá (telefone com DDD repetido), Igarapé-Açu e São João de Pirabas
   (telefones de 8 dígitos). A Catedral não tem pároco publicado.
6. **Três paróquias sem lista de comunidades**: São Barnabé, São Jorge (Km 18) e N. Sra. Rainha da Paz.
7. `foundedYear` nulo em todas (nenhuma fonte publica).
8. **`dioceses.json` (não alterei)**: a Cúria está com "Rua Major Wilson 483", CEP 68741-320 e telefone
   malformado "(91) 9881-40278"; o site oficial diz **Rua Major Wilson, 481 – Nova Olinda, 68741-320, (91)
   3711-3370, contato@diocesedecastanhal.com.br** (a Receita registra o nº 413, que é a Catedral).

## Fontes

- https://diocesedecastanhal.com.br/paroquias · `/paroquias/<id>` · bundle `/assets/index-C1rRf3Sj.js`
- https://minhareceita.org/07258455000150 e filiais 0002–0039
- https://pt.wikipedia.org/wiki/Diocese_de_Castanhal · https://www.catholic-hierarchy.org/diocese/dcasb.html
- Contexto sobre Vigia: https://pt.wikipedia.org/wiki/Igreja_da_Madre_de_Deus_(Vigia)
