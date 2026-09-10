# Diocese de Janaúba (MG) — relatório de pesquisa

- **Arquivo**: `paroquias/MG/janauba.json`
- **Slug**: `janauba` · **Sede**: Janaúba/MG · **Pesquisa**: 2026-09-10
- **Bispo**: Dom Roberto José da Silva (nomeado em 12/06/2019)
- **Criação**: 05/07/2000, pela bula *Maiori Bono Christifidelium* de São João Paulo II,
  desmembrada das Dioceses de Montes Claros e de Januária. Sufragânea de Diamantina até 25/04/2001,
  depois da Arquidiocese de Montes Claros.
- **Território**: 29.296 km², 24 municípios; 357.000 católicos em 377.298 habitantes (2023).

## Números

| Item | Quantidade |
|---|---|
| Registros no arquivo | **33** |
| — paróquias | 26 |
| — quase-paróquias | 7 |
| Confiança dos registros | 30 `alta`, 3 `media`, 0 `baixa` |
| Comunidades gravadas | **9** (mas 855 declaradas pela diocese — ver abaixo) |
| Horários fixos | **73** (59 missas, 6 confissões, 6 adorações, 2 terços) |
| — confiança dos horários | 19 `alta`, 8 `media`, 46 `baixa` |
| Paróquias com ao menos um horário | 12 de 33 |
| Cidades distintas | 22 |
| Foranias | 6 |

## Fontes principais

1. **`https://diocesedejanauba.com.br/paroquias/`** — a fonte principal. Uma única página com as
   **33 paróquias/quase-paróquias**, cada uma com: ano de criação, **número de comunidades**,
   endereço, CEP, telefone, e-mail, pároco e vigários. É a melhor página de contato encontrada
   nesta rodada de MG depois do arquimoc.org.
2. **`https://diocesedejanauba.com.br/foranias/`** — as **6 foranias** e o vigário forâneo de cada
   uma, com a distribuição exata das mesmas 33 unidades. Serviu de conferência cruzada.
3. **`https://diocesedejanauba.com.br/historico/`** — criação da diocese, bula, desmembramento e a
   lista dos 24 municípios.
4. **`https://diocesedejanauba.com.br/bispo/`** — Dom Roberto José da Silva (a página traz o
   sobrenome com erro de digitação: "Siva").
5. **`https://www.catholic-hierarchy.org/diocese/djana.html`** — corroboração: 33 paróquias no
   Anuário Pontifício 2024 (dados de 2023), 48 presbíteros, 29.296 km², sucessão episcopal e a
   composição territorial na criação.

6. **Para os horários** (nenhum vem do site diocesano): bios e posts oficiais de Instagram das
   paróquias — `@pascomnsajanauba`, `@paroquiasantoafonsoml`, `@paroquiadoespiritosanto`,
   `@paroquiamatoverde`, `@paroquiameninojesus_`, `@paroquiasantoantonio_ibiracatu` — e os
   agregadores `liriocatolico.com.br` (páginas de Janaúba, Porteirinha, Monte Azul, São João do
   Paraíso e Gameleiras) e `horariodemissa.com.br`.

O site é WordPress mas **não expõe *custom post type*** de paróquia (`/wp-json/wp/v2/types` só tem
posts, páginas, portfolio e os tipos do The Events Calendar) — as duas listagens são páginas
estáticas, lidas com `curl` enviando User-Agent de navegador.

## Cobertura

**33/33 (100 %).** As duas páginas oficiais listam exatamente o mesmo conjunto, e o
catholic-hierarchy.org registra 33 paróquias em 2023. Distribuição por forania:

| Forania | Unidades |
|---|---|
| Sagrado Coração de Jesus (vig. forâneo Pe. Edson Terra da Silva) | 6 |
| São Joaquim (Pe. José Iranildo Ferreira) | 5 |
| Nossa Senhora da Conceição (Pe. Marcelo Tibo Aires) | 8 |
| São Sebastião (Pe. Juliano do Nascimento Lino) | 7 |
| Nossa Senhora da Glória (Pe. Valdemir Nunes) | 4 |
| Bom Jesus (Pe. Rafael Alves) | 3 |

## O que ficou de fora / precisa de validação humana

### 1. 855 comunidades declaradas, mas nenhum nome publicado

A página oficial informa **quantas** comunidades cada paróquia tem, nunca **quais**. O total
declarado é de **855 comunidades**, de 6 (Catedral) a **101** (Nossa Senhora da Conceição, Rio
Pardo de Minas). As dez maiores redes:

| Paróquia | Cidade | Comunidades declaradas |
|---|---|---|
| Nossa Senhora da Conceição | Rio Pardo de Minas | 101 |
| Nossa Senhora da Assunção | Porteirinha | 63 |
| São Joaquim | Porteirinha | 37 |
| São Sebastião | Espinosa | 37 |
| Espírito Santo | Espinosa | 35 |
| Nossa Senhora das Graças | Monte Azul | 35 |
| Santo Antônio | Riacho dos Machados | 34 |
| Nossa Senhora Aparecida | Ninheira | 34 |
| São João Batista | São João do Paraíso | 32 |
| Nossa Senhora das Graças (quase-paróquia) | São João do Paraíso | 30 |

Como não há lista nominal confiável, `communities` ficou `[]` em todas as 33 — o importador cria a
igreja-matriz. O número declarado foi preservado no campo `declaredCommunityCount` de cada
paróquia, para servir de meta na próxima rodada. **Este é o maior volume de dado ainda por
levantar nesta diocese.**

### 2. Horários: 12 de 33 paróquias, e a maior parte com confiança baixa

**O site da diocese não publica horário nenhum** — confirmado pela API do WordPress: os 85
*portfolio-items* só têm endereço, telefone e pároco, e os 7 posts de notícia que citam "horário"
(o mais recente de 2023) não trazem grade. A página `/missas/` só menciona a Catedral, sem horários.

Os 73 horários vieram de fora do site diocesano:

| Origem | Paróquias | Horários | Confiança |
|---|---|---|---|
| Bio/post oficial de Instagram da paróquia | N. Sra. Aparecida (Janaúba), Santo Afonso Maria de Ligório (Janaúba), Espírito Santo (Espinosa), Santo Antônio (Mato Verde), Menino Jesus (Gameleiras) | 22 | 19 `alta` + 3 `media` |
| Instagram oficial, mas com conteúdo de 2024 | Santo Antônio (Ibiracatu) | 6 | `media` |
| Agregador liriocatolico.com.br (sem data de atualização) | Catedral (Janaúba), São Joaquim e N. Sra. da Assunção (Porteirinha), Q.-P. N. Sra. das Graças (São João do Paraíso), N. Sra. das Graças (Monte Azul), Menino Jesus (Gameleiras) | 43 | `baixa` |
| horariodemissa.com.br atualizado em **15/07/2014** | N. Sra. das Graças (Nova Porteirinha) | 3 | `baixa` |

As **21 paróquias restantes ficaram sem nenhum horário**: Santa Cruz e N. Sra. das Dores (Janaúba),
Q.-P. N. Sra. do Perpétuo Socorro (Janaúba), Santo Antônio (Riacho dos Machados), Q.-P. São Pedro
(Pai Pedro), Q.-P. N. Sra. da Imaculada Conceição (Serranópolis de Minas), N. Sra. da Conceição
(Rio Pardo de Minas), São João Batista (São João do Paraíso), N. Sra. de Fátima (Indaiabira),
N. Sra. do Desterro (Vargem Grande do Rio Pardo), Senhora Sant'Ana e São Joaquim (Montezuma),
N. Sra. Aparecida (Ninheira), Santo Antônio (Santo Antônio do Retiro), São Sebastião (Espinosa),
Santo Antônio (Mamonas), Bom Jesus (Catuti), Senhor Bom Jesus (Varzelândia), Q.-P. São Geraldo
(Varzelândia), N. Sra. da Glória (Jaíba), Q.-P. Sagrada Família (Jaíba/Bandeirantes), Q.-P. Senhora
Sant'Ana (Verdelândia) e N. Sra. da Conceição (Matias Cardoso).

**As 9 comunidades gravadas** vieram junto com os horários: 4 capelas urbanas da Paróquia São
Joaquim de Porteirinha (Senhor Bom Jesus/Vila Guará, Santa Luzia/Vila Kennedy, São João Paulo II e
São Sebastião — `baixa`, do agregador), 4 comunidades rurais da Paróquia Menino Jesus de Gameleiras
(Riachinho, Engenho, Brejo dos Mártires e Boa Vista — `alta`, do Instagram oficial) e a Comunidade
Vicentinos de Ibiracatu (`media`).

### 2.1. Descartados de propósito (não estão no JSON)

- **N. Sra. do Desterro (Vargem Grande do Rio Pardo)**: o Lírio Católico tem horários, mas o
  registro está nomeado "Paróquia Santo Antônio", com endereço divergente (Praça Nahum Matias
  Fharat, não Rua Miguel Soares, 225) e telefone com DDD 11 (São Paulo). Cadastro poluído.
- **Bom Jesus (Catuti)**: o Instagram oficial publica a escala **semana a semana**, e ela oscila
  (sábado na Capela N. Sra. de Fátima 16h→16h30; domingo na Matriz 19h30→19h45, em posts de 29/08,
  30/08, 05/09 e 06/09 de 2026). Não é grade fixa. Padrão indicativo, se ajudar na validação:
  sábado ~16h na Capela N. Sra. de Fátima e domingo ~19h30 na Matriz.
- **Ibiracatu**: "primeira sexta-feira" em honra ao Sagrado Coração — recorrência mensal **e sem
  horário publicado**, então nem como `baixa` daria. Também descartados por não serem missa: Grupo
  de Oração (quarta 19:30) e Ofício da Imaculada (sábado 05:00).
- **Nova Porteirinha**: o agregador derivado `acervocatolico.com` acrescenta "quinta 07:00–18:00",
  que não é missa (provável adoração ou horário de secretaria).
- **Riacho dos Machados**: a única menção a missas é a novena do padroeiro (31/05 a 13/06) — não é
  grade fixa.

### 2.2. ⚠️ Homônimas de outras dioceses — armadilhas confirmadas

Vários perfis e fichas aparecem nos buscadores como se fossem da Diocese de Janaúba e **não são**.
Ficam registrados aqui para que a validação não caia neles:

| Aparece como | É de verdade |
|---|---|
| `@santacruznsdores` ("Santa Cruz e N. Sra. das Dores") | Guarapuava/PR — a bio traz "R. Salvatore Renna, 961 – Santa Cruz", CEP 85015-430 |
| "Perpétuo Socorro" com Dom 07h/10h/18h e Sáb 19h30 | Diocese de Bragança (PA), paróquia homônima |
| `@paroquia_santannaesaojoaquim` (Montezuma) | Arquidiocese da Paraíba |
| `@pnsra.conceicaomb` / tel. (32) 3273-1338 (Matias Cardoso) | Matias **Barbosa**/MG |
| Ficha de Santo Antônio do Retiro no horariodemissa.com.br | Nova Lima/MG, bairro Retiro (2013) |

### 2.3. Onde estão os horários que faltam

Várias paróquias publicam a grade em **destaques/stories do Instagram**, que nenhuma ferramenta de
texto consegue ler (exigiria navegador com sessão): `@imaculadaconceicaorpm` (Rio Pardo de Minas)
tem um destaque "HORÁRIOS"; `@paroquiasaosebastiaoesp` (Espinosa) tem "Missas";
`@paroquiasaojoaquim.port` tem "Missas/Adoração/Confissão"; `@paroquia.senhorbomjesuscatuti` diz
"Horário da Santa Missa nos destaques!". O padrão de handle da diocese é
`paroquia<santo>_<cidade>`. O Facebook das paróquias é ilegível por leitor automático em 100 % dos
casos testados, e o Arquivo da Internet respondeu HTTP 429 nas tentativas sobre páginas do Facebook
— vale retentar.

Cobertura dos agregadores nesta diocese: o liriocatolico.com.br só tem Janaúba, Porteirinha, Monte
Azul, São João do Paraíso, Gameleiras e Vargem Grande (as outras 15 cidades dão 404); o
horariodemissa.com.br só tem Janaúba (ficha vazia, de 2013) e Nova Porteirinha (2014);
missahora.com.br e horariosmissa.com.br têm fichas com todos os dias em branco.

### 3. Divergências entre as duas páginas oficiais (3 registros com `confidence: "media"`)

| Paróquia | Página "Paróquias" | Página "Foranias" | Gravado |
|---|---|---|---|
| N. Sra. do Perpétuo Socorro (Janaúba) | **QUASE PARÓQUIA**, com "Administrador Paroquial" | **Paróquia** | Quase-paróquia |
| N. Sra. das Graças (São João do Paraíso / São Joãozinho) | **PARÓQUIA**, campo "Pároco" vazio | **Quase Paróquia** | Quase-paróquia |
| Bom Jesus (Catuti) | **PARÓQUIA**, criada em 16/10/2021, com pároco | **Quase Paróquia** | Paróquia |

Em cada caso foi adotada a designação mais bem sustentada pelo conteúdo (administrador paroquial x
pároco, data de criação), mas as três precisam de confirmação da cúria.

### 4. Divergências de **nome** entre as duas páginas (gravadas com `confidence: "alta"`)

- **Janaúba**: "Paróquia Santa Cruz e Nossa Senhora das Dores" (página Paróquias) x "Paróquia Nossa
  Senhora das Dores" (Foranias). Gravado o nome mais específico.
- **Montezuma**: "Paróquia Sant'Ana e São Joaquim" x "Paróquia Senhora Sant'Ana e São Joaquim".
  Gravada a segunda forma.
- **Varzelândia**: "PARÓQUIA BOM JESUS" x "Paróquia Senhor Bom Jesus". Gravada a segunda forma.
- **Janaúba (Catedral)**: "CATEDRAL SAGRADO CORAÇÃO DE JESUS" x "Paróquia Catedral do Sagrado
  Coração de Jesus". Gravado "Catedral Sagrado Coração de Jesus", pela convenção de prefixo do
  dataset.

### 5. Telefones malformados na fonte (precisam de normalização)

Gravados como publicados, com a observação em `notes`:

| Paróquia | Cidade | Publicado |
|---|---|---|
| Nossa Senhora de Fátima | Indaiabira | `(38) 99924696` — falta um dígito |
| Santo Antônio | Santo Antônio do Retiro | `38- 98598140 ou 99815320` — o segundo tem 8 dígitos |
| Santo Antônio | Ibiracatu | `(38) 91214121 ou 98910240` |
| Senhora Sant'Ana e São Joaquim | Montezuma | `(38) 9921-8496` — 8 dígitos |
| Santo Antônio | Mato Verde | `38 98090006` |
| Quase-paróquia São Geraldo | Varzelândia | telefone não publicado |

### 6. Outros pontos para validação

- **CEP de Santo Antônio do Retiro publicado como "39538-00"** (7 dígitos). Gravado como
  `39538-000`, que é o CEP do município — confirmar.
- **CEP genérico**: as quatro paróquias de Janaúba e a quase-paróquia do Perpétuo Socorro usam
  `39440-000` (CEP único da cidade), enquanto a cúria informa `39442-048`. Não é erro, mas o
  endereçamento fino está faltando.
- **Anos de criação antigos**: Matias Cardoso **1670** e Rio Pardo de Minas **1770** — muito
  anteriores à criação da diocese (2000) e mesmo do bispado de Diamantina (1854). São plausíveis
  como data da capela/freguesia original (Matias Cardoso é um dos povoamentos mais antigos do norte
  de Minas), mas merecem checagem. Os demais anos publicados variam bastante (1860, 1868, 1916,
  1954, 1976, 1988, 1999, 2004, 2010, 2016, 2021), o que indica **datas reais de fundação, não data
  de cadastro no CMS** — ao contrário do que aconteceu em Itapetininga/SP. 13 paróquias não têm ano
  publicado (`foundedYear: null`).
- **Erros de digitação da fonte, corrigidos no arquivo** (registrados aqui): "Pácoro" por "Pároco";
  "Vitorio Evangelista" → Vitório; "QUASE PAROQUIA DE SÃO GERALDO" → Quase-paróquia São Geraldo;
  "Pe Paulo **Macos** Vieira" → gravado "Pe. Paulo Marcos Vieira" com a ressalva em `notes`;
  "Serranopolis de Minas" → Serranópolis de Minas; "igrejadevazelandia@hotmail.com" (grafia da
  fonte, mantida — é o endereço real).
- **Município "Gameleira" x "Gameleiras"**: a página "Histórico" escreve *Gameleira* e o
  catholic-hierarchy também; o município mineiro é **Gameleiras** (CEP 39505-000, o mesmo publicado
  na paróquia). Gravado "Gameleiras".
- **Pároco sem prefixo**: em Nova Porteirinha a fonte publica "Pároco: Henrique Alves de Oliveira
  Filho" sem "Pe."; normalizado para "Pe. Henrique Alves de Oliveira Filho".
- **Paróquia Nossa Senhora das Graças (São João do Paraíso)**: o campo "Pároco" está vazio na fonte
  → `priestName: null`. É o único registro sem padre identificado.
- **9 paróquias não publicam e-mail** e 2 não publicam endereço (Serranópolis de Minas e Santo
  Antônio do Retiro).
- **Nome do bispo**: a página `/bispo/` grafa "Dom Roberto José da **Siva**"; gravado "da Silva",
  conforme o catholic-hierarchy.
