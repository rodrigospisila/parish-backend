# Relatório de pesquisa — Diocese de Piracicaba (SP)

- **Arquivo**: `paroquias/SP/piracicaba.json`
- **Data da coleta**: 2026-09-10
- **Circunscrição**: Diocese de Piracicaba, sede em Piracicaba/SP, sufragânea da Arquidiocese de Campinas
- **Bispo**: Dom Devair Araújo da Fonseca
- **Cúria**: Avenida Independência, 1146, Bairro Higienópolis, CEP 13419-155, Piracicaba-SP — (19) 2106-7575 — contato@diocesedepiracicaba.org.br

## Resumo

| Métrica | Valor |
|---|---|
| Entradas de paróquia no arquivo | **70** (68 paróquias + 2 quase-paróquias) |
| Confiança das paróquias | 68 `alta`, 0 `media`, **2 `baixa`** (as quase-paróquias) |
| Comunidades / capelas | **378** (373 `alta`, 5 `baixa`) |
| Horários fixos | **816** |
| — por tipo | 788 `MASS`, 21 `CONFESSION`, 5 `ADORATION`, 2 `ROSARY` |
| — por confiança | 20 `alta`, 657 `media`, 139 `baixa` |
| Municípios cobertos | **15 / 15** |
| Regiões pastorais | **7 / 7** |
| Cobertura | **68 / 68** paróquias (100 %) |

Completude por campo (nas 70 entradas): pároco/administrador 70, e-mail 70, ano de criação 70,
telefone 69, CEP 69, endereço 70, bairro 69, site próprio 10.

## Fontes

### Principal — site oficial da diocese (`https://diocesedepiracicaba.org.br`)

Site ASP clássico, HTML em latin-1/windows-1252, servido por IIS. Foi a fonte de **quase tudo**:
cada paróquia tem uma página própria (`capa.asp?paroquia=<id>`) com endereço completo, CEP,
telefone/WhatsApp, e-mail(s), redes sociais, data de criação/instalação/dedicação, região pastoral,
pároco, vigários e diáconos, lista de capelas/comunidades **com endereço** e o quadro completo de
horários de missas por local. Páginas percorridas:

| Página | Uso |
|---|---|
| `capa.asp?p=318` | índice de paróquias por cidade (15 cidades) |
| `capa.asp?paroquia=<id>` (15 cidades) | listagem das paróquias de cada cidade |
| `capa.asp?paroquia=<id>` (70 páginas) | ficha completa de cada paróquia / quase-paróquia |
| `capa.asp?p=354` | Regiões pastorais — **confirma 68 paróquias em 7 regiões e 15 municípios** |
| `capa.asp?p=352` | Cúria diocesana — endereço, telefone, bispo, ofícios |
| `capa.asp?p=349` | Santuários marianos (Nossa Senhora dos Prazeres e Nossa Senhora da Boa Morte) |
| `capa.asp?p=314`, `capa.asp?p=388`, `capa.asp?p=346`, `/contato` | contexto (a diocese, catedral, novas comunidades, contato) |

Método: varredura em lote com `curl` + User-Agent de navegador, decodificação `latin-1`, extração
por script (HTML → texto → campos), com revisão manual de todos os blocos e curadoria dos nomes.

### Corroboração

- **`catholic-hierarchy.org/diocese/dpira.html`** — 68 paróquias (dado de 2023, fonte `ap2024`);
  ereção da diocese em 26/02/1944, desmembrada de Campinas. Usado em `coverage.parishesExpected`.
- **`catedraldepiracicaba.org.br`** (site próprio da Sé Catedral, ativo — calendário de setembro/2026)
  — páginas `/horarios-de-missas` e `/confissoes`. Corrobora os horários da Catedral, que por isso
  são os únicos gravados com confiança `alta` (15 missas + 5 confissões).

## Critério de confiança adotado

- **Paróquias e comunidades → `alta`**: todos os dados vêm explicitamente da fonte oficial da
  diocese, com página própria por paróquia.
- **Horários → `media`** (regra do README: "fonte oficial **sem sinal de atualidade**"). As páginas
  de paróquia do site **não trazem carimbo de data**; o único conteúdo datável encontrado (o
  calendário de batismos da Paróquia São José, em Santa Bárbara d'Oeste) corresponde ao ano de
  **2024**, ou seja, fora da janela de 12 meses exigida para `alta`. O site em si está ativo e
  curado (lista a paróquia criada em 2016 e o bispo nomeado em 2020).
- **Horários → `alta`** apenas na Catedral, onde há **duas** fontes oficiais concordantes e a
  segunda tem sinal de atualidade.
- **Horários → `baixa`**: recorrência mensal, "celebração da Palavra" ambígua, divergência entre
  fontes, ou pertencentes às duas quase-paróquias de confiança `baixa`.

## Pontos que precisam de validação humana

### 1. Duas quase-paróquias fora da lista oficial (gravadas com `baixa`)

O site mantém páginas de duas quase-paróquias que **não constam** das 68 paróquias listadas em
`capa.asp?p=354`. Ambas entraram no arquivo com `confidence: "baixa"` (e todos os seus horários
também), com `notes` explicando:

- **`imaculada-conceicao-e-santana-piracicaba`** ("Q-P Imac. Conceição e Sant'Ana", Santa Olímpia).
  Mesmo endereço (Rua Santa Olímpia, 10) e telefone ((19) 3425-0338) da **Paróquia Maria Estrela da
  Evangelização** (criada em 20/08/2015, essa sim listada na Região Piracicaba 3), que
  aparentemente a sucedeu. As duas listam a capela Sant'Ana. Provável página órfã no CMS.
- **`santa-cruz-de-anhumas-piracicaba`** ("Q-P Santa Cruz de Anhumas", distrito de Anhumas). O
  próprio site diz que a secretaria funciona na **Paróquia Imaculada Conceição de Nova Suíça**, que
  por sua vez lista "Santa Cruz (Anhumas)" como capela sua — com horário **divergente** (sábado 18h
  na paróquia; quinta 19h30 e domingo 8h na quase-paróquia). Não tem telefone publicado.

**Decidir**: manter como registros próprios, fundir com as paróquias que as absorveram, ou excluir.

### 2. Recorrência mensal — 122 horários (`baixa`)

O maior bloco fora do banco. Missas do tipo "1º, 3º e 5º sábado do mês", "Primeira 6ª feira do mês",
"Segunda e quarta 5ª feira do mês", "Todo dia 13 de cada mês", "Último domingo do mês" não cabem em
`MassSchedule` (que só tem dia da semana). Cada uma foi gravada com o dia da semana correto,
`confidence: "baixa"` e a regra literal em `notes` começando por `Recorrência mensal:`.

Concentrações: **Paróquia São Francisco Xavier** (Piracicaba, 17 das 24 missas são quinzenais/mensais
— toda a rede de 14 capelas roda em 1º/3º e 2º/4º), **Paróquia Nossa Senhora do Rosário**
(Charqueada, 8 de 14), **Paróquia Nossa Senhora Aparecida** (Rio das Pedras), **Paróquia Santa Rosa
de Lima** e **Paróquia São José** (Piracicaba). Mesma decisão de produto já registrada no README.

### 3. Celebração da Palavra — 4 registros descartados, 4 mantidos com `baixa`

Descartados (a fonte **não** diz missa):

| Paróquia | Texto da fonte |
|---|---|
| Imaculado Coração de Maria — Rio Claro | Comunidade Santa Teresa de Calcutá — "Domingo: 9h - Celebração da Palavra" |
| Imaculado Coração de Maria — Piracicaba | Matriz — "Segunda-feira: 7h (Celebração)" |
| Santa Rosa de Lima — Piracicaba | Capela Santa Luzia — "Sábado: 18h30 (Celebração da Palavra)" |
| Bom Jesus — Rio Claro | Matriz — "Terça-feira: 7h (Celebração da Palavra - Capela do Santíssimo)" |

Mantidos com `confidence: "baixa"` e nota, porque a fonte diz **"missa ou celebração da Palavra"**
(4 registros): Catedral (Capela Nossa Senhora Aparecida, sexta 19h30), São José de Tupi (Capela
Santa Isabel, sábado 15h) e Imaculado Coração de Maria — Piracicaba (matriz, sexta 7h e 19h30).

### 4. Divergência na Catedral

O site diocesano publica "Quinta-feira: 19h30 (Missa de Louvor e Adoração)"; o site próprio da
Catedral publica "Missa de Adoração — Quinta-feira: 18h30". Gravado 19h30 com `confidence: "baixa"`
e a divergência em `notes`.

### 5. Paróquia São Paulo Apóstolo (Santa Bárbara d'Oeste) — missas fora da matriz

O site lista **apenas** "1ª sexta-feira do mês: 19h30" na matriz; todas as demais missas dominicais
e de sábado acontecem na **"Casa de Maria"**, que foi criada como comunidade a partir do quadro de
horários (não consta da lista de capelas). Conferir se a "Casa de Maria" é a igreja em uso enquanto
a matriz não está pronta.

### 6. Paróquia Nossa Senhora de Lourdes (Rafard) — matriz em reforma

O quadro diz literalmente "Matriz: *** Em reforma ***" — a matriz ficou **sem nenhum horário** e as
missas estão distribuídas entre as capelas Nossa Senhora Aparecida e Santo Antônio (mais um bloco
"Comunidades Rurais: Segunda-feira 19h30", gravado como comunidade própria). Revisitar quando a
reforma terminar.

### 7. Datas de criação

As datas de "Criação" **não** são datas de cadastro no CMS: variam de 1774 a 2016 e são coerentes
com a história de cada paróquia (Catedral 1774, São João Batista de Capivari 1826, São João Batista
de Rio Claro 1832, Santa Bárbara 1842…). Foram usadas como `foundedYear`. Exceções anotadas:

- **Santuário Nossa Senhora dos Prazeres** (Piracicaba): o site informa "Paróquia criada em
  19/06/1974, mas não instalada. Foi recriada em 31/05/1996 e instalada em 15/06/1996". Gravado
  `foundedYear: 1974`, com a história completa em `notes`. Confirmar qual data o Parish deve exibir.
- **Paróquia São João Batista Precursor** (Piracicaba): o site só publica "Instalação: 26/10/2014",
  sem data de criação. Gravado 2014, com nota.
- Paróquias elevadas a partir de quase-paróquia (Santo Antônio de Ajapi, Imaculada Conceição de Nova
  Suíça, São João Batista de Ártemis, Divino Pai Eterno) receberam o **ano da criação da
  quase-paróquia**, não o da elevação, porque é a data mais antiga publicada. Revisar se o critério
  desejado for o da elevação.

### 8. Nome da Paróquia São Joaquim e Santa Gertrudes (Santa Gertrudes)

Único nome que repete o topônimo da cidade. Não é erro de extração: a página própria escreve
"Paróquia São Joaquim e Santa Gertrudes" três vezes (invocação dupla), enquanto a página das regiões
pastorais escreve "São Joaquim - Santa Gertrudes" (aí sim como cidade). Mantido o nome da página
própria; slug `sao-joaquim-e-santa-gertrudes-santa-gertrudes`. Confirmar com a diocese.

### 9. CEPs de caixa postal

Três paróquias publicam o CEP da **caixa postal** em vez do CEP do logradouro — foi o que entrou em
`zipCode`: Santa Maria (Santa Maria da Serra) `17370-970`, São João Batista (Rio Claro)
`13500-970`, Santa Bárbara (Santa Bárbara d'Oeste) `13450-970`. O `17370-970` é ainda mais atípico
por ficar fora da faixa 13xxx da região (Santa Maria da Serra pertence à faixa de Botucatu) — está
correto conforme a fonte, mas convém validar.

### 10. Comunidades que não são igrejas públicas

Preservadas com o rótulo da fonte, para o importador ou a validação decidirem:

- **Casas religiosas** (o importador ignora pelo nome): "Convento Carmelitas Missionários do
  Espírito Santo" (Águas de São Pedro) e "Nossa Senhora do Carmo (Mosteiro Imaculado Coração de
  Maria e São José)" — o Carmelo de Piracicaba, na Paróquia Santa Cruz e São Dimas, com missa
  diária às 17h.
- **8 capelas marcadas "particular"** pela própria fonte (capelas de fazenda, de condomínio e de
  usina) — em São Pedro (4), Capivari, Santa Gertrudes, Santa Bárbara d'Oeste e Anhumas.
- **Capelas de instituição**: hospitais (Santa Casa de Rio Claro, Hospital de Santa Bárbara), asilos
  e lares de idosos (São Vicente de Paulo, Lar dos Velhinhos de Piracicaba e de Rio das Pedras),
  cemitérios (São Miguel Arcanjo, Capela da Ressurreição) e escolas.
- **Capela desativada**: "Santa Teresinha do Menino Jesus (Fazenda Fonte Nova)", na Paróquia Santo
  Antônio de Santa Bárbara d'Oeste — o site diz "A capela está desativada desde o fechamento da
  Usina". Entrou como comunidade e **não tem horário**; candidata a exclusão.
- **Comunidades domésticas** ("nas casas"): "Nas casas (Santa Fé)" (São Francisco Xavier), "Breda -
  casa" e "Belém - casa" (Maria Estrela da Evangelização), "Missas nas casas" (Imaculado Coração de
  Maria, Rio Claro).

### 11. Contato

- **Sem telefone**: apenas a Quase-paróquia Santa Cruz de Anhumas (o site não publica).
- **18 das 70 paróquias** têm como e-mail principal um endereço de provedor comum (gmail, hotmail,
  bol, yahoo, uol, terra, ig) em vez do institucional `@diocesedepiracicaba.org.br`. Quando havia
  os dois, foi gravado o **primeiro** publicado. **69 das 70** publicam também um e-mail
  institucional (a exceção é a Paróquia São José, de Santa Bárbara d'Oeste, que só publica
  `paroquiasaojosesbo@gmail.com`); se o Parish preferir o institucional, dá para trocar em bloco.
- Nenhum e-mail estava ofuscado por Cloudflare — o site é ASP puro.

## O que ficou de fora

- **Adoração e terço**: só 5 `ADORATION` e 2 `ROSARY`. O site raramente destaca essas celebrações em
  seção própria; na maioria das paróquias elas aparecem embutidas na descrição da missa ("missa com
  adoração e bênção do Santíssimo", "19h30 com Bênção do Santíssimo"), e nesses casos o registro foi
  gravado como `MASS` com a observação em `notes` — não foi duplicado como `ADORATION`. Um segundo
  passe poderia extrair esses eventos.
- **Confissões**: 21 registros. Foram gravadas apenas as seções que dizem explicitamente
  "confissão"; as seções "Atendimento do pároco / sacerdotal", muito mais numerosas, foram
  **ignoradas** por não afirmarem que se trata de confissão. Onde a fonte publica intervalo
  ("9h às 11h"), gravou-se o horário de início com o texto integral em `notes`, `confidence: "media"`,
  conforme a regra.
- **Endereço das comunidades**: o campo `address` das comunidades ficou `null`. O site publica o
  endereço de boa parte das capelas, mas o pareamento nome↔endereço é ambíguo em várias listas (a
  fonte alterna nome e localidade sem marcação), e preferiu-se não arriscar dado errado. O
  `neighborhood` foi preenchido quando o bairro vinha entre parênteses no próprio nome.
- **Expediente de secretaria** e datas de batismo/catequese: fora do modelo, não coletados.
- **Não pesquisado**: gcatholic.org e Wikipédia não foram consultados — a contagem oficial da própria
  diocese (68 em 7 regiões) e o catholic-hierarchy já fecham a cobertura em 100 %.

## Distribuição

| Região pastoral | Paróquias no arquivo | Municípios |
|---|---|---|
| Capivari | 7 | Capivari (3), Rio das Pedras (2), Mombuca, Rafard |
| Piracicaba 1 | 9 (8 + 1 quase-paróquia) | Piracicaba |
| Piracicaba 2 | 10 | Piracicaba (9), Saltinho |
| Piracicaba 3 | 12 (11 + 1 quase-paróquia) | Piracicaba |
| Rio Claro | 15 | Rio Claro (12), Corumbataí, Santa Gertrudes, Ipeúna |
| Santa Bárbara | 12 | Santa Bárbara d'Oeste |
| São Pedro | 5 | São Pedro (2), Águas de São Pedro, Charqueada, Santa Maria da Serra |

Por município: Piracicaba 30 (28 paróquias + 2 quase-paróquias), Rio Claro 12,
Santa Bárbara d'Oeste 12, Capivari 3, Rio das Pedras 2, São Pedro 2, e 1 cada em Águas de São Pedro,
Charqueada, Corumbataí, Ipeúna, Mombuca, Rafard, Saltinho, Santa Gertrudes e Santa Maria da Serra.

As duas paróquias com **uma única comunidade** (só a matriz, sem capelas) são Santa Maria
(Santa Maria da Serra) e Santo Antônio (distrito de Ajapi, Rio Claro) — é o que a fonte publica.
