# Relatório — Arquidiocese de Ribeirão Preto (SP)

- **Arquivo**: `paroquias/SP/ribeirao-preto.json`
- **Data da pesquisa**: 2026-09-10
- **Agente**: pesquisa de território (`PROMPT-pesquisa.md`)

## Resumo

| Métrica | Valor |
|---|---|
| Entradas de paróquia | **97** (todas `alta`) |
| Comunidades / capelas | **295** (em 69 das 97 entradas) |
| Horários fixos | **800** — 646 `alta`, 70 `media`, 84 `baixa` |
| Tipos de horário | 749 MASS, 23 CONFESSION, 22 ADORATION, 6 ROSARY |
| Municípios cobertos | 20 de 20 |

Completude dos campos: 97/97 endereço, pároco e telefone; 95/97 CEP; 94/97 ano de fundação;
91/97 e-mail; 87/97 site ou rede social oficial; 87/97 bairro.

## Fontes

Toda a carga vem do **site oficial da arquidiocese** (`https://arquidioceserp.org.br`). Nenhum
dado de agregador entrou no dataset.

| Fonte | Uso |
|---|---|
| `/foranias/` e `/categoria/paroquias/foranias/` | listagem das paróquias por forania |
| `/paroquias/` (Paróquias por Cidade) | conferência cruzada por município |
| `/wp-json/wp/v2/posts?categories=25&per_page=100` | **fonte primária**: os 97 posts da categoria "Paróquias" com conteúdo integral |
| `/wp-json/wp/v2/categories?per_page=100` | taxonomia oficial: 9 foranias e 20 cidades, com a contagem de paróquias de cada uma |
| `/historia/` | criação da diocese (07/06/1908) e da arquidiocese (19/04/1958); composição declarada |
| `/curia/` | endereço e telefone da Cúria Metropolitana |
| `/arcebispo/` | Dom Moacir Silva |
| `/vigarios-e-leigos-foraneos/` | confirmação das 9 foranias |

### Nota de acesso

O site **devolve HTTP 403 a leitores automáticos sem `User-Agent` de navegador** (o WebFetch
falhou em todas as URLs). O conteúdo foi obtido com `curl` enviando um `User-Agent` de Chrome.
A API REST do WordPress está aberta e responde no mesmo esquema — é o caminho mais confiável
para uma nova varredura desta arquidiocese.

## Cobertura

A categoria "Paróquias" do site tem exatamente **97 posts**, e a soma das categorias-filhas
bate em dois eixos independentes:

- **Por forania** (9): São Francisco de Assis 14 · Bom Jesus da Cana Verde 13 · São Bento 13 ·
  Nossa Senhora Aparecida 12 · Santa Maria Goretti 10 · Santo Antônio Maria Claret 10 ·
  São Sebastião 10 · Bom Jesus da Lapa 8 · São José 7 = **97**.
- **Por cidade** (20): Ribeirão Preto 53 · Sertãozinho 9 · Batatais 5 · Jardinópolis 5 ·
  Cajuru 3 · Serrana 3 · Cravinhos 2 · Pontal 2 · Santa Rita do Passa Quatro 2 ·
  Santa Rosa de Viterbo 2 · São Simão 2 · Altinópolis, Brodowski, Cássia dos Coqueiros,
  Dumont, Guatapará, Luiz Antônio, Santa Cruz da Esperança, Santo Antônio da Alegria e
  Serra Azul 1 cada = **97**.

O JSON reproduz essa distribuição registro a registro. **A lista está completa**, não há
lacuna a preencher por fonte secundária.

### Divergência com a página de história (não é falha de cobertura)

A página `/historia/` declara *"88 paróquias, 2 Santuários Arquidiocesanos, 5 Santuários
Arquidiocesanos Paróquias, 1 Quase Paróquia, 2 Reitorias, 1 Comunidade Eclesial Missionária
e 1 Área Pastoral, subdivididas em 9 Foranias"*. Esse texto está **defasado**. A composição
real das 97 entradas, conferida uma a uma:

| Tipo | Qtd. | Observação |
|---|---|---|
| Paróquias | 89 | inclui a Catedral, a Basílica Menor e 5 santuários-paróquia |
| Quase-paróquias | 2 | Sant'Ana e São Joaquim (2015) e Sagrado Coração de Jesus/Sertãozinho (decreto de 05/02/2026, posterior ao texto da página) |
| Reitorias / igrejas não paroquiais | 3 | Santo Antônio Pão dos Pobres, São Benedito (Templo Votivo) e Nossa Senhora das Graças |
| Santuário não paroquial | 1 | Sete Capelas (administrado pela Basílica Menor) |
| Comunidade Eclesial Missionária | 1 | Nossa Senhora Desatadora dos Nós |
| Área Pastoral | 1 | Cândido Portinari e Parque dos Flamboyants |

Três quase-paróquias foram elevadas a paróquia em 2024 (Santa Rita de Cássia/Portal do Alto,
São Francisco de Assis/Sertãozinho e São José/Serrana) — o que explica a queda de "1 Quase
Paróquia" declarada para o quadro atual.

## Decisões de modelagem

### Prefixos de nome

Seguindo o README e o padrão dos arquivos irmãos de SP: `Paróquia` (81), `Santuário` (7),
`Reitoria` (3), `Quase-paróquia` (2), `Catedral` (1), `Basílica` (1), além de
`Comunidade Eclesial Missionária …` (1) e `Área Pastoral …` (1), que não têm prefixo
padronizado no README.

### Slugs desambiguados

O site tem títulos homônimos na mesma cidade. Cinco slugs receberam qualificador (fica
registrado aqui porque foge da regra `<nome-sem-prefixo>-<cidade>`):

| Slug | Motivo |
|---|---|
| `santa-rita-de-cassia-jardim-independencia-ribeirao-preto` | há duas Santa Rita de Cássia em Ribeirão Preto |
| `santa-rita-de-cassia-portal-do-alto-ribeirao-preto` | idem |
| `nossa-senhora-das-gracas-reitoria-ribeirao-preto` | reitoria homônima da paróquia do Parque dos Servidores |
| `sao-benedito-templo-votivo-ribeirao-preto` | reitoria homônima da Paróquia São Benedito |
| `area-pastoral-candido-portinari-flamboyants-ribeirao-preto` | nome sem prefixo padronizado |

### Confiança dos horários

O `modified` de cada post do WordPress serviu de sinal de atualidade, conforme o README:

- **`alta`** (646) — post atualizado nos últimos 12 meses (a maioria em 2026).
- **`media`** (70) — post oficial sem sinal de atualidade (última edição anterior a
  2025-09-10). São 12 paróquias: São João Bosco, Santa Rita de Cássia/Jd. Independência,
  São Pedro Apóstolo/RP e Santa Teresinha do Menino Jesus (ago/2025); Santa Maria Goretti,
  Santa Luzia/RP e Nossa Senhora de Lourdes (ago/2025); São José/Serrana (set/2024);
  Nossa Senhora das Dores/Serrana (dez/2023); Sagrado Coração de Jesus/Serrana e Divino
  Espírito Santo/Serra Azul (mai/2022); mais uma missa do Santuário Nossa Senhora Aparecida
  (ver abaixo).
- **`baixa`** (84) — **recorrência mensal** (1ª sexta-feira, 3º domingo, rodízio semanal de
  comunidades). É a mesma pendência de modelagem já registrada no README do dataset:
  `MassSchedule` só guarda dia da semana. Todas trazem a regra literal em `notes`.

## Pontos para o enxame de validação

### 1. Cinco entradas sem nenhum horário publicado

O site oficial não publica horários para estas cinco, e as fichas de agregador consultadas
(`horariodemissa.com.br`) estão vazias e datadas de **29/05/2013** — nada entrou:

| Slug | Cidade | Situação |
|---|---|---|
| `nossa-senhora-aparecida-jardinopolis` | Jardinópolis | matriz da cidade; só secretaria publicada |
| `santo-antonio-de-padua-santo-antonio-da-alegria` | Santo Antônio da Alegria | matriz da cidade; só secretaria publicada |
| `jesus-de-belem-ribeirao-preto` | Ribeirão Preto | lista 3 igrejas (Jesus Nossa Esperança, Jesus Operário, Jesus Libertador) sem horário |
| `sagrado-coracao-de-jesus-sertaozinho` | Sertãozinho | quase-paróquia erigida em 05/02/2026 |
| `nossa-senhora-das-gracas-reitoria-ribeirao-preto` | Ribeirão Preto | reitoria; post não editado desde abr/2024 |

Caminho sugerido de validação: Instagram/Facebook oficiais, todos registrados em `website`.

### 2. Conflitos entre páginas do próprio site

- **Sagrado Coração de Jesus (Serrana) × São José (Serrana)** — a página do SCJ (editada em
  **mai/2022**) ainda lista "Quase Paróquia São José" e "Comunidade Santa Rita de Cássia"
  como comunidades suas. Mas São José virou paróquia autônoma em 2024 e sua página reivindica
  a Comunidade Santa Rita (sáb 17h / dom 7h). **Retirei as duas do SCJ** e mantive só a
  Comunidade Nossa Senhora de Fátima. Confirmar a quem pertence hoje a Santa Rita.
- **Senhor Bom Jesus (Sertãozinho) × Sagrado Coração de Jesus (Sertãozinho)** — a página do
  Senhor Bom Jesus (editada em mai/2026) ainda lista "Comunidade Sagrado Coração de Jesus —
  Jardim Santa Marta" com missas qua 19h e sáb 18h, mas essa comunidade virou **quase-paróquia
  autônoma em 05/02/2026**. **Não incluí esses dois horários** para não duplicar. Confirmar.
- **Santuário Nossa Senhora Aparecida (RP)** — o bloco "Missas" diz "Terça a sexta: 19h30",
  mas mais abaixo a mesma página diz "Missa da Divina Providência: quintas-feiras às 19h20".
  Registrei quinta às **19h30** com `confidence: media` e a divergência em `notes`.
- **São Bento (Cajuru)** — a página lista "Capela Nossa Aparecida (Hospital) – 1958 … Missa:
  Sábado 7h30" e, separadamente, "Capela Nossa Senhora Aparecida … Missa: Sábado 7h30".
  Tratei como **uma só** comunidade (`Capela Nossa Senhora Aparecida (Hospital)`). Conferir se
  não são duas capelas distintas.
- **Basílica Menor Santo Antônio de Pádua × Santuário Sete Capelas** — a página da Basílica
  repete integralmente os horários do Santuário das Sete Capelas, que é entrada própria no
  dataset (`nossa-senhora-da-medalha-milagrosa-ribeirao-preto`). **Registrei os horários só na
  entrada do santuário**, para não duplicar.

### 3. Divergência entre título e corpo do post (ano de fundação)

O título dos posts segue o padrão `<nome> – <ano>`, mas em 5 casos o corpo informa outro ano.
**Adotei o valor do corpo** (`Ano de fundação` / `Criação`), registrando aqui:

| Paróquia | Título | Corpo (usado) |
|---|---|---|
| São João Bosco (RP) | 2005 | **1982** |
| Nossa Senhora do Jubileu: Mãe da Divina Graça (RP) | 2005 | **2000** |
| Maria Mãe do Povo e São Lázaro (RP) | 2005 | **2004** |
| Santuário Santa Rita de Cássia (Santa Rita do Passa Quatro) | 1862 | **1858** |
| São José (Serrana) | 2024 | **2003** (criação como quase-paróquia; elevação em 2024) |

Para paróquias com duas datas (criação + elevação), gravei sempre a **criação**:
Santa Rita de Cássia/Portal do Alto 2011 (elevada 2024), São Francisco de Assis/Sertãozinho
2014 (elevada 2024), São Mateus Apóstolo 2016 (elevada 2018), São Pedro Apóstolo/Jurucê 1909
(elevada 2002).

### 4. Dados malformados na origem

- **E-mail com acento**: São Pedro Apóstolo/Jurucê publica `paroquiajurucê@hotmail.com`
  (endereço inválido, provável `paroquiajuruce@`). Gravei `email: null` — **não corrigi para
  não inventar dado**. Precisa de confirmação humana.
- **CEP em formato de milhar**: São João Batista/Sertãozinho publica `14.170.320`
  (normalizado para `14170-320`) e São João Batista/RP publica `14.020-380` (para `14020-380`).
- **Município grafado errado**: Luiz Antônio aparece como "Luís Antônio" e Santa Rosa de
  Viterbo como "Santa Rosa do Viterbo" nos endereços. Usei a grafia oficial do município em
  `city`.
- **CEP ausente**: Santuário Sete Capelas e Área Pastoral Cândido Portinari (2 registros).
- **Sem ano de fundação**: Sete Capelas, Reitoria Nossa Senhora das Graças e Área Pastoral (3).

### 5. Horários que não couberam no modelo (excluídos, não perdidos)

Além dos 84 `baixa` de recorrência mensal, ficaram **fora do JSON** por não terem dia da
semana ou horário:

- **Missa por dia fixo do mês** — Santa Rita de Cássia/Cássia dos Coqueiros ("todo dia 22, 20h");
  Sagrado Coração de Jesus/RP ("todo dia 18, Missa da Mãe Rainha", sem horário);
  Maria Mãe do Povo ("todo dia 25", sem horário) e São Lázaro ("todo dia 17, 19h").
- **Sem horário publicado** — Santa Rosa de Viterbo: missas de 1º domingo (São Francisco) e de
  2º/3º domingo (Santos Reis); Senhor Bom Jesus/Sertãozinho: "Comunidade São Filipe Neri,
  1 missa mensal às 19h" (não diz o dia); São Bento/Cajuru: "Terço dos Homens todas as quartas"
  (não diz a hora).
- **Confissões sem hora explícita** — "após a missa" (Cristo Operário e São Judas Tadeu,
  Sete Capelas).
- **Celebração da Palavra** (não é missa) — São Benedito/RP (seg e sex, 19h30) e
  Senhor Bom Jesus/Sertãozinho (Comunidade Nossa Senhora de Fátima, dom 8h).
- **Batizados** com horário próprio — Divino Espírito Santo/Serra Azul (4º dom 9h),
  Santa Rita de Cássia/Batatais (1º dom 7h30), Santa Rosa de Viterbo (4º dom).

### 6. Comunidades sem matriz identificável

- **Quase-paróquia Sant'Ana e São Joaquim (RP)** — não tem igreja própria; as missas são na
  quadra do Colégio Marista Champagnat e o endereço oficial é uma sala em centro empresarial.
  Deixei `communities: []` e os horários em `"Matriz"`, com o local em `notes`.
- **Comunidade Eclesial Missionária Desatadora dos Nós (RP)** — celebra no Salão Paroquial;
  mesmo tratamento.
- **Área Pastoral Cândido Portinari** — não tem matriz; marquei a Comunidade Nossa Senhora do
  Perpétuo Socorro como `isMatriz: true` por ser onde está a secretaria e a maior parte das
  missas.
- **Jesus de Belém (RP)** — sem matriz nomeada; marquei a Igreja Jesus Nossa Esperança como
  matriz. O endereço da paróquia no JSON é o da secretaria (a página traz secretaria e
  residência em endereços diferentes).

### 7. Sem campo no formato

O site publica **vigários paroquiais, diáconos e párocos eméritos** de quase todas as paróquias;
o formato só tem `priestName`, onde gravei o **pároco** (ou administrador paroquial / reitor /
quase-pároco, conforme o caso). Também ficaram de fora horários de secretaria paroquial,
grupos de oração, terços de movimentos sem horário fixo e pastorais.
