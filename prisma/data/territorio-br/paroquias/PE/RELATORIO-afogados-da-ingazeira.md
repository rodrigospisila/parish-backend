# Diocese de Afogados da Ingazeira (PE) — relatório de pesquisa

- **Agente**: pesquisa de território, 2026-09-17
- **Arquivo**: `paroquias/PE/afogados-da-ingazeira.json`
- **Cobertura**: **24 / 24 paróquias (100%)**, todas `alta`, + 6 entradas que não contam: 5 áreas
  pastorais (4 `alta`, 1 `media`) e o seminário propedêutico (`baixa`)
- **Comunidades**: 30 (só as igrejas-sede) — a diocese **não publica capelas**
- **Horários fixos**: 70, **todos `baixa`** (65 missas, 4 adorações, 1 confissão), em 20 das 30
  entradas. **A diocese entra em produção sem nenhum horário** — como Palmares e Nazaré.

## Três avisos antes de carregar

1. **Em 13/10/2026 a diocese passa a ter 25 paróquias.** A Área Pastoral Nossa Senhora de Fátima
   (distrito de Fátima, Flores) será elevada a paróquia nessa data (anúncio oficial de 26/05/2026).
   Hoje ela está no arquivo como área pastoral (`nao-paroquial` + `loadAsParish: true`); depois
   do dia 13 basta trocar o nome para "Paróquia Nossa Senhora de Fátima" e tirar o `status`.
2. **O site ainda não reflete as transferências anunciadas em 10/09/2026.** `priestName` segue o
   site (fonte oficial), mas três titulares vão mudar — está tudo em `notes`:
   - Flores (N. Sra. da Conceição): sai Pe. Juacir Delmiro dos Santos → entra **Pe. Alison José
     Zeferino Maciel** (pároco);
   - São José do Belmonte (N. Sra. das Dores): sai Pe. Adenildo da Silva Santos → entra **Pe. Lucas
     Emmanuel Lacerda Ferraz** (administrador paroquial);
   - Área Pastoral São Sebastião (Ibitiranga, Carnaíba): sai Pe. Alison → entra **Pe. Cícero André
     da Silva Júnior** (administrador).
   As datas de posse não foram divulgadas.
3. **Existe uma 5ª área pastoral que o site não lista**: Nossa Senhora da Conceição e dos Remédios,
   em **Jabitacá (Iguaracy)**, instalada em 13/07/2026 com o Pe. Renato Pereira de Almeida.
   Gravada `media` (filial 0033 da Receita, aberta em 02/07/2026, + duas notícias locais).

## Fontes principais

| Fonte | URL | O que deu |
|---|---|---|
| Paróquias | `https://dioceseafogadosdaingazeira.org.br/paroquias/` | 24 paróquias + 4 áreas pastorais, com cidade |
| 28 fichas | `…/paroquia?paroquiaid=<n>` (1–22, 24, 25, 28–31) | endereço, bairro, **CEP**, telefone/celular/WhatsApp, e-mail, redes, padroeiro, **pároco/administrador, vigários e diáconos com a função** |
| Seminários | `…/paroquia?paroquiaid=26` e `=27` | Seminário Propedêutico São Judas Tadeu (Afogados) e Seminário Maior São Carlos Borromeu (Recife) |
| Cúria / Bispos | `/curia-diocesana/`, `/bispos/` | governo diocesano; Dom Limacêdo Antônio da Silva, 5º bispo, desde 2023 |
| Receita Federal | `https://minhareceita.org/<cnpj>` (raiz **09.654.914**) | varredura 0001–0060: **prova de completude**, a 5ª área pastoral e conferência de endereços |
| Notícias locais | Blog do Cauê Rodrigues, Blog do Erbi, Blog TV Web Sertão | elevação de Fátima, criação de Jabitacá e as transferências de 27/05 e 10/09/2026 |
| Wikipédia / catholic-hierarchy / gcatholic | — | 24 paróquias (2023); Concatedral Nossa Senhora da Penha |

### O site é novíssimo

`dioceses.json` já aponta para `dioceseafogadosdaingazeira.org.br`, mas o conteúdo é de **setembro
de 2026**: a REST API mostra todas as páginas criadas em 02/09/2026 e alteradas até o dia desta
coleta (17/09); o rodapé é "Cúria Online do Brasil © 2026" e ainda sobram restos do modelo (links
para o Facebook/Instagram da **Catedral de Maringá** e um WhatsApp com DDD 44). As paróquias não
são posts do WordPress: vêm do plugin `curiaonline-diocese`, que renderiza `/paroquia?paroquiaid=N`
a partir do sistema de gestão da cúria — por isso a REST API não as lista (o tipo `portfolio`
devolve zero). IDs 23 e 32+ respondem "Registro não encontrado"; 26 e 27 são os seminários. Existe
um modelo `capela-page`, mas **nenhuma capela foi cadastrada ainda** (`capelaid=1` → não
encontrado) — vale revisitar em alguns meses: é de onde sairão as comunidades.

O domínio antigo citado pelos agregadores (`dioceseafogadosdaingazeira.com.br`) não foi usado.

### Prova de completude (CNPJ)

Raiz **09.654.914**, última ordem 0034. **24 paróquias ativas** (0002–0016, 0018–0022, 0025–0028)
— exatamente as 24 do site, da Wikipédia e do catholic-hierarchy. Além delas: cúria, 2 seminários,
o Centro Pastoral Stella Maris (Triunfo, aberto em 04/08/2026) e **5 áreas pastorais** — as 4 do
site (Tabira, Fátima/Flores e São Francisco/Serra Talhada, todas de abril/2024; Ibitiranga, de
12/03/2026) mais **Jabitacá/Iguaracy (02/07/2026)**, que o site não publica.

## Horários: só agregadores, todos `baixa`

A diocese não publica grade em lugar nenhum, e as páginas oficiais de paróquia que existem
(Taplink de Triunfo) só trazem horário de visitação.

- **horariodemissa.com.br**: 19 fichas em 15 dos 19 municípios, **todas de 13/01/2013 a
  18/09/2015** → pré-pandemia, `baixa` pela regra do README (18 têm horário e foram gravadas; a
  nota de cada horário traz a data da ficha).
- **liriocatolico.com.br** (carga de 2026-09, data de conferência desconhecida): 11 registros no
  território, dos quais **2 são erro de geocodificação** — "Paróquia Nossa Senhora da Paz" e
  "Capela de São Paulo Apóstolo" ficam no *bairro* de Afogados, no Recife, e foram ignoradas. A
  ficha da Catedral é cópia literal da de 2015 do horariodemissa. Onde o Lírio repete um horário
  do outro agregador, as duas fontes ficaram no mesmo registro — **continua `baixa`**: uma das
  fontes é pré-pandemia e a outra não tem data. As fichas de Carnaíba e Triunfo parecem mais
  recentes (telefone atual da paróquia; link do Taplink) e são as melhores candidatas à validação.
- **buscamissa.com.br**: nenhum município da diocese. **vempramissa.com.br**: tem uma página
  "Diocese de Afogados da Ingazeira" com 14 igrejas, mas é casca vazia gerada por proximidade
  geográfica (inclui Piancó, Monteiro e Princesa Isabel, na Paraíba) e **nenhuma tem horário**.

## Decisões de modelagem

- **Catedral**: a fonte a chama de "Paróquia Senhor Bom Jesus dos Remédios"; gravada como
  `Catedral Senhor Bom Jesus dos Remédios`.
- **Concatedral**: a matriz de Nossa Senhora da Penha (Serra Talhada) é concatedral (gcatholic;
  Instagram oficial). Mantive o prefixo "Paróquia" (é o do site e "Concatedral" não está entre os
  prefixos do README); a informação foi para `notes`.
- **Erros de digitação do site corrigidos no nome**: "Ressucitado" → Ressuscitado; "Loudes" →
  Lourdes (nos dois casos o campo "Padroeiro(a)" da própria ficha traz a grafia certa).
- **Municípios na grafia do IBGE**: Iguaracy (site: "Iguaraci"), Quixaba ("Quixabá"), Carnaíba
  ("Carnaiba").
- **Pároco × administrador**: a função vem explícita na ficha. "Administrador Paroquial" → nome em
  `priestName`, condição em `notes` (Ingazeira, Solidão e as áreas pastorais).
- **`foundedYear`**: o site não publica ano de criação. Só têm valor São Francisco de Assis (2000,
  no histórico da ficha) e a Área Pastoral de Jabitacá (2026, instalação noticiada). **Não usei a
  "data de início de atividade" da Receita** — é a data do CNPJ (1984/85 para quase todas as
  paróquias; abril/2024 e março/2026 para as outras áreas pastorais), não a da criação canônica;
  essas datas ficaram só em `notes`.
- **Área Pastoral São Francisco (Serra Talhada)**: a ficha oficial repete o endereço da Paróquia
  da Penha (Rua Joca Magalhães, 264) — preenchimento provisório evidente. Gravei o endereço da
  filial da Receita (Rua Um, s/n, Tancredo Neves) e registrei a divergência.
- **Seminário Propedêutico São Judas Tadeu**: endereço e reitor são oficiais, mas a missa da capela
  só aparece no Lírio Católico → entrada inteira `baixa`. O Seminário Maior fica no Recife
  (território de Olinda e Recife) e não entrou.
- **CEP**: o da ficha oficial, exceto São José (São José do Belmonte), onde o site publica
  56950-970 (faixa de caixa postal) e gravei o geral, 56950-000, que é o da Receita.

## Pontos que precisam de validação humana

1. **Horários — tudo.** 70 horários `baixa`, nenhum oficial. Caminho mais curto: Instagram de cada
   paróquia (o site publica o @ de algumas) ou telefone/WhatsApp da secretaria, que agora está
   completo para 24/24 paróquias.
2. **Aplicar as transferências de 10/09/2026** depois das posses (item 2 do topo) e acompanhar a
   **elevação de Fátima em 13/10/2026** (item 1).
3. **Calumbi sem padre na ficha** (seção "Administração" ausente) — vacância ou cadastro incompleto.
4. **Mesmo pároco em duas paróquias**: Pe. Antônio Rogério Veríssimo Duarte aparece em Santa
   Terezinha e em São Judas Tadeu (São José do Egito). Acumula ou uma ficha está errada?
5. **Vigários desatualizados no site** (anúncio de 27/05/2026): Pe. Renato Pereira de Almeida ainda
   consta como vigário da Catedral (foi para Jabitacá; entrou o Pe. Carlos Antônio Martins Leite);
   Pe. Walter Rodrigues Rocha foi para Itapetim; Pe. Jacson Douglas Rodrigues Ferreira foi
   designado para Triunfo (a notícia não diz a função).
6. **Número do logradouro diverge entre site e Receita**: Catedral (289 × 149), São Francisco de
   Assis (367 × 673 — parece inversão de dígitos), Carnaíba (25 × 130; o agregador de 2013 também
   diz 130). Em Triunfo e São José do Egito o site dá a secretaria e a Receita/Taplink dão a matriz
   (em Triunfo gravei os dois: secretaria na paróquia, matriz na comunidade-sede).
7. **Telefone suspeito**: Brejinho — `(87) 93300-9613` (prefixo incomum), gravado como publicado.
8. **Sem e-mail na ficha**: Ingazeira, Itapetim, Santa Cruz da Baixa Verde, São Judas Tadeu,
   Triunfo. **Sem telefone nem e-mail**: as 5 áreas pastorais.
9. **Comunidades**: zero além das sedes. Pista antiga (ficha de 2013 do horariodemissa) para N. Sra.
   do Rosário de Serra Talhada: capelas N. Sra. da Conceição, São Cristóvão, São Sebastião
   (Cagepe), São Francisco (COHAB — provável origem da Área Pastoral São Francisco) e Sagrada
   Família (Mutirão), com missa em rodízio quinzenal. Não gravadas (fonte não oficial de 13 anos).
10. **`dioceses.json`**: site e bispo corretos. O site novo publica como contato o celular
    **(87) 98805-3826** e o e-mail **diocesedopajeu@hotmail.com** (o arquivo traz o fixo
    (87) 3838-1582, que é o do cadastro da Receita). A cúria se apresenta como "Rua Roberto
    Nogueira, 366 - Centro" (Receita: Rua Dr. Roberto Nogueira Lima, 366, CEP 56800-204).
