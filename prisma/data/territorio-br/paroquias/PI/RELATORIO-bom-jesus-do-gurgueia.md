# Diocese de Bom Jesus do Gurguéia (PI) — relatório de pesquisa

- **Agente**: pesquisa de território, 2026-09-18
- **Arquivo**: `paroquias/PI/bom-jesus-do-gurgueia.json`
- **Cobertura**: **26 / 26 paróquias (100%)**, todas `alta`, em **21 municípios** (5 paróquias na
  cidade de Bom Jesus, 2 em Corrente)
- **Comunidades**: 28 (26 igrejas-sede + o Santuário São Raimundo Nonato de Gilbués e a Capela São
  Benedito da Palmeira de Riacho Frio)
- **Horários fixos**: 15 — **8 `media` e 7 `baixa`** (10 missas e 5 confissões), em apenas **5 das
  26 paróquias**
- **Párocos**: 13 identificados, todos pela página do clero

## As três fontes que se completam

Esta é a única das cinco dioceses da rodada com site **vivo** (`diocesedebomjesus.org.br`,
notícias de agosto e setembro de 2026, rodapé "© 2016-2026"), mas o site sozinho não fecha a lista.

1. **gcatholic.org** (`/churches/local/bomj1`, "Last updated on 2026.01.01") — 27 igrejas em 21
   municípios, marcando quais são paroquiais: **25 paróquias** (incluindo a catedral e o Santuário
   Bom Jesus da Boa Sentença, marcado pelo próprio gcatholic como *"Parish, Shrine"*) e 2 não
   paroquiais.
2. **Site oficial, `/paroquias`** — publica só **9 fichas**; a varredura por id (`/paroquia/p/<n>`,
   1 a 70) encontrou **11**, sendo uma delas (id 44) uma ficha duplicada e vazia de Avelino Lopes.
   As fichas trazem endereço, CEP, telefone e uma **tabela de missas por dia da semana**; o campo
   "Data de criação" é quase sempre o placeholder `00/00/0000` → gravado `null`.
3. **Site oficial, `/clero`** — a fonte mais rica e mais atual: função atual, paróquia, telefone/
   WhatsApp e e-mail de cada padre e diácono, incluindo um presbítero ordenado em **21/11/2025**.
   Deu **13 párocos**.

### A 26ª paróquia saiu da ficha do clero

A página do clero traz "Pe. Arestides Medeiros dos Santos Filho — **Pároco da Paróquia São José**",
uma paróquia que **não existe no gcatholic nem na listagem do site**. A notícia da
**CNBB Regional Nordeste 4** fecha o caso: Dom Marcos Tavoni erigiu a **Paróquia São José, no
bairro Aeroporto de Bom Jesus-PI**, desmembrando-a da Paróquia Menino Jesus de Praga, e deu posse
ao Pe. Arestides Medeiros como primeiro pároco. Por isso `parishesExpected` = **26**, e não os 24
que o catholic-hierarchy publica para 2018, 2020 e 2022.

### A Receita Federal quase não serve aqui

Ao contrário de Floresta, Floriano e São Raimundo Nonato, **a varredura do CNPJ da mitra não
funciona nesta diocese**: a raiz **06.556.427** tem apenas **4 ordens** —

| Ordem | Nome fantasia | Município | Desde |
|---|---|---|---|
| 0001 | DIOCESE DE BOM JESUS DO GURGUEIA (cúria) | Bom Jesus | 09/05/1972 |
| 0002 | (paróquia) Praça Barão do Paraim | Santa Filomena | 19/04/1993 |
| 0003 | PAROQUIA DIVINO ESPIRITO SANTO | Corrente | **11/03/2022** |
| 0004 | PAROQUIA NOSSA SENHORA DA CONCEICAO | Corrente | **21/05/2024** |

A busca do Mapa das OSC/IPEA por razão social nos 21 municípios achou só mais três registros:
`PAROQUIA SAO FRANCISCO DE ASSIS DE SANTA LUZ PI` (15.065.920/0001-65),
`PAROQUIA SANTA LUZIA ACAO SOCIAL E ESCOLAS PAROQUIAIS` (Sebastião Barros, 11.078.256/0001-38) e
`OBRAS SOCIAIS DA PAROQUIA SANTO ANTONIO DE JULIO BORGES` (11.291.404/0001-06). **A maioria das
paróquias simplesmente não tem CNPJ** — o que mostra que a prova de completude por Receita não é
universal e precisa ser checada antes de ser usada como critério.

O lado bom: as duas filiais de Corrente deram **o ano de criação real** de duas paróquias novas
(2022 e 2024), e Santa Filomena o de 1993.

## Horários — 15 registros em 5 paróquias

**Do site oficial** (`media` — fonte oficial, site ativo, mas sem sinal de atualidade por ficha):

| Paróquia | Grade |
|---|---|
| Catedral Nossa Senhora das Mercês (Bom Jesus) | dom 9h e 19h30 |
| Santuário Bom Jesus da Boa Sentença (Bom Jesus) | dom 6h30; seg 19h30; qui 19h30 |
| N. Sra. Aparecida (Alvorada do Gurguéia) | dom 9h e 19h30 |
| N. Sra. das Mercês (Avelino Lopes) | dom 19h30 |

**Do horariodemissa.com.br** (`baixa` — ficha de **09/09/2013**, anterior à pandemia):

| Paróquia | Grade |
|---|---|
| Divina Pastora (Gilbués) | missas dom 8h30 e 19h30 **no Santuário de São Raimundo Nonato**; confissões ter a sáb às 9h |

As outras **21 paróquias entram sem nenhum horário**. Verificados sem resultado: 13 municípios no
`horariodemissa.com.br` (só Gilbués tem grade), o `buscamissa.com.br` (não cobre a diocese) e o
`liriocatolico.com.br` (2 fichas, e a de Corrente é uma "Igreja Nossa Senhora da Conceição" sem
grade e com telefone de DDD 61).

## Divergências e observações

1. **Endereço da catedral** — a ficha oficial diz Praça 07 de Setembro; o `liriocatolico` diz
   "Av. Getúlio Vargas, 621" (a cúria é o nº 600 da mesma avenida) e dá o telefone (89) 3562-1355.
   Gravado o da ficha oficial.
2. **Missa de 6h30 em Bom Jesus** — o `liriocatolico` a atribui à catedral; a ficha oficial a
   atribui ao Santuário Bom Jesus da Boa Sentença. Seguida a ficha oficial.
3. **Telefone do pároco de Alvorada do Gurguéia** — a ficha da paróquia diz (89) 98134-5543 e a
   ficha do clero diz "(86) 9 81134-5543": DDD e dígitos diferentes. Gravado o da ficha da paróquia.
4. **Telefone do pároco da nova Paróquia São José** — "(89) 81316-332" tem só 8 dígitos; foi para
   `phoneHistoric`.
5. **Corrente** — o gcatholic grafa "Nossa Senhora Imaculada Conceição"; a Receita e a ficha do
   clero dizem "Nossa Senhora da Conceição". Gravado o segundo.
6. **Morro Cabeça no Tempo** — a ficha do clero grafa "São Braz"; o gcatholic, "São Brás". Gravado
   "São Brás".
7. **Ficha duplicada** — Avelino Lopes tem as ids 17 (completa) e 44 (vazia, fora da listagem).
8. **Ficha da id 10** (Paróquia Santo Antônio) não publica nem o município; o endereço (Rua Santa
   Luzia, 55, CEP 64.968-000, Júlio Borges) veio da ficha do clero.

## Precisa de validação humana

1. **Horários de 21 das 26 paróquias** — não existem em nenhuma fonte.
2. **Endereço de 13 paróquias** — o site só publica ficha de 10 unidades e várias delas estão
   vazias. Não há endereço para Menino Jesus de Praga, São Pedro Apóstolo e São José (Bom Jesus),
   Barreiras do Piauí, Cristalândia do Piauí, Curimatá, Monte Alegre do Piauí, Morro Cabeça no
   Tempo, Palmeira do Piauí, Parnaguá, Redenção do Gurguéia, Riacho Frio, Santa Luz, São Gonçalo do
   Gurguéia e Sebastião Barros.
3. **Data de criação da Paróquia São José** — a notícia da CNBB NE4 diz "1º de maio" sem o ano
   explícito no trecho recuperado. Gravado `null`.
4. **Ano de criação das demais** — o site usa o placeholder `00/00/0000`; só Alvorada do Gurguéia
   (17/08/1997) tem data real, e Corrente e Santa Filomena vieram da Receita.
5. **As duas comunidades não paroquiais** (Santuário São Raimundo Nonato em Gilbués e Capela São
   Benedito da Palmeira em Riacho Frio) foram atribuídas à **única paróquia do município** — é
   inferência, e ficaram `media`.
6. **Nenhuma capela rural** publicada, numa diocese de 51.544 km².
7. **A diocese está em litígio com o TJ-PI** por causa do Centro Pastoral (notícias de agosto de
   2026 no site) — sem efeito no dataset, mas explica parte da desatualização do portal.

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

- `phone`: está "(89) 3562-2496". O site publica **(89) 99984-6349** (com link de WhatsApp) em
  todas as páginas; o (89) 3562-1355 aparece na ficha do `liriocatolico` da catedral. Vale trocar
  pelo número do site.
- `address`: está "Curia Diocesana, Av. Getulio Vargas 600"; o site confirma o número e acrescenta
  o bairro **Centro**.
- `foundedYear`: está **1920** — conferir. O catholic-hierarchy e o gcatholic tratam a
  circunscrição como **Diocese de Bom Jesus do Gurguéia** criada em 1920 como prelazia, mas a
  Diocese de Floresta no mesmo `dioceses.json` também está com 1920, o que sugere linha trocada na
  1ª rodada (Floresta é de **1964**).
- `email` (curia@diocesedebomjesus.org.br), `website` e `bishopName` (Dom Marcos Antônio Tavoni,
  bispo desde 15/01/2014 segundo o gcatholic) **conferem**.
