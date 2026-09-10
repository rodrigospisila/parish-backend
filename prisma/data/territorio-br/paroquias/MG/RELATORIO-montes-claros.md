# Arquidiocese de Montes Claros (MG) — relatório de pesquisa

- **Arquivo**: `paroquias/MG/montes-claros.json`
- **Slug**: `montes-claros` · **Sede**: Montes Claros/MG · **Pesquisa**: 2026-09-10
- **Arcebispo**: Dom José Carlos de Souza Campos (nomeado em 14/12/2022, empossado em 2023)
- **Criação**: Diocese em 10/12/1910 (bula *Postulat Sane*, São Pio X); elevada a Arquidiocese e Sede Metropolitana em 25/04/2001 (bula *Maiori Christifidelium*, São João Paulo II)
- **Sufragâneas**: Janaúba, Januária e Paracatu

## Números

| Item | Quantidade |
|---|---|
| Registros no arquivo | **76** |
| — paróquias | 68 |
| — quase-paróquia (curato) | 1 (São João do Pacuí) |
| — capelanias (não entram na carga) | 7 |
| Confiança dos registros | 76 `alta`, 0 `media`, 0 `baixa` |
| Comunidades/capelas | **1.096** |
| Horários fixos | **492** (353 missas, 128 confissões, 10 adorações, 1 terço) |
| — confiança dos horários | 302 `alta`, 149 `media`, 41 `baixa` |
| Paróquias com ao menos um horário | 53 de 76 |
| Cidades distintas | 42 |
| Foranias | 12 (+ o agrupamento "Capelanias") |

## Fontes principais

Praticamente todo o dataset saiu de **uma única fonte oficial e viva**: o site da Arquidiocese,
`https://arquimoc.org`.

1. **`https://arquimoc.org/wp-json/wp/v2/paroquias?per_page=100`** — o site é WordPress e expõe as
   paróquias como *custom post type*. O endpoint devolveu a listagem canônica inteira
   (`X-WP-Total: 76`) em uma requisição, com id, slug, link, data de modificação e as categorias
   (que são as foranias). Foi a economia de tempo decisiva.
2. **`https://arquimoc.org/wp-json/wp/v2/categories?per_page=100`** — nomes das 12 foranias,
   mapeadas por id para o campo `forania` de cada paróquia.
3. **As 76 páginas individuais** (`https://arquimoc.org/paroquias/<slug>/`) — cada uma traz, em
   estrutura muito regular: telefone, e-mail, horário da secretaria, endereço com CEP, **horários de
   missa**, **atendimento de confissão**, **lista nominal das comunidades paroquiais** (com bairro
   ou povoado) e o clero (pároco, vigários, diáconos). Foram baixadas com `curl` enviando
   User-Agent de navegador e convertidas em texto.
4. **`https://arquimoc.org/arquidiocese-de-montes-claros/`** — dados institucionais: 45.520 km²,
   860.299 habitantes (IBGE 2022), 40 municípios, 12 foranias, "68 paróquias, 1 curato e mais de
   mil comunidades de fé", histórico e sucessão dos bispos/arcebispos.
5. **`https://arquimoc.org/foranias-e-paroquias/`** — conferência da listagem por forania.
6. **`https://www.catholic-hierarchy.org/diocese/dmocl.html`** — corroboração: 68 paróquias, 129
   presbíteros (93 diocesanos e 36 religiosos), 698.000 católicos em 885.000 habitantes (2023),
   45.521 km².

O endpoint `wp/v2/horarios` existe no site mas devolve `X-WP-Total: 0` (não é público); os horários
foram extraídos do HTML renderizado de cada página.

## Cobertura

**76/76 (100 % da listagem oficial).** Os 68 registros de paróquia batem exatamente com o número
declarado pelo próprio site ("68 paróquias, 1 curato") e com o catholic-hierarchy.org (68 paróquias
em 2023). Não há indício de paróquia faltando.

As 7 capelanias (4 hospitalares — Santa Casa, Aroldo Tourinho, Dilson Godinho e Hospital
Universitário Clemente Farias —, a Capelania Militar Santa Efigênia do 10º BPM, a capelania do
Colégio Imaculada Conceição e a do Carmelo Maria Mãe da Igreja e São Paulo VI) foram gravadas para
não perder o dado, mas **o importador as ignora**: `isNonParishUnit` do `import-territorio.ts`
descarta nomes que começam por `Capelania`. O mesmo vale para o Carmelo (casa religiosa).

## O que ficou de fora / precisa de validação humana

### 1. 23 registros sem nenhum horário publicado (19 paróquias + 4 capelanias)

A página oficial simplesmente não tem a seção "Horários de Missa" para:

Menino Jesus de Praga (Montes Claros), Santa Rita de Cássia (Montes Claros), São Judas Tadeu
(Montes Claros), Nossa Senhora Aparecida (Brasília de Minas), Nossa Senhora Aparecida
(Glaucilândia), Nossa Senhora da Conceição (Jequitaí), Nossa Senhora da Conceição (Cristália),
Nossa Senhora do Perpétuo Socorro (Lontra), Sant'Ana (Ponto Chique), Santa Rita de Cássia (Ubaí),
Santo Antônio (Grão Mogol), São Francisco de Assis (Botumirim), São João Batista (Guaraciama),
São João Batista (Terra Branca), São Sebastião (Berizal), São Sebastião (Mirabela), São Sebastião e
Nossa Senhora de Fátima (Campo Azul), Senhor Bom Jesus (Rubelita), Senhor Bom Jesus (Lagoa dos
Patos) — mais as capelanias dos 4 hospitais.

Quase todas têm Facebook/Instagram oficial linkado na própria página (os links estão no HTML de
origem); é o caminho natural para uma segunda rodada.

### 2. 41 horários de recorrência MENSAL (`confidence: "baixa"`)

Não cabem no `MassSchedule` (que só tem dia da semana). A regra literal da fonte foi copiada em
`notes`. Concentração:

- **Paróquia Nossa Senhora Imaculada Conceição (Novorizonte) — 17 horários**: a paróquia publica
  *só* missas mensais nas 16 comunidades rurais ("Caixão: 1º sábado do mês – 14:00", "Campo Verde:
  1º domingo – 08:00 e 3º domingo – 17:00" etc.). Nenhuma missa semanal.
- Nossa Senhora Aparecida e São José (Montes Claros) — 4; São José Carpinteiro e Maria de Nazaré
  (Montes Claros) — 3; Mãe Rainha (MOC), Santíssimo Coração de Jesus (Coração de Jesus), Santo
  Antônio (Salinas), São João Batista (São João da Lagoa), São José (Josenópolis) — 2 cada;
  Nossa Senhora da Esperança (Nova Esperança), Santo Antônio (Luislândia), São Gonçalo (Francisco
  Sá), São José Operário (MOC), Senhor Bom Jesus (Santa Cruz de Salinas), Senhora Sant'Ana
  (Brasília de Minas), Quase-paróquia São João Batista (São João do Pacuí) — 1 cada.

Há ainda regras **puramente devocionais por dia do mês**, que não têm dia da semana nenhum e por
isso foram **descartadas** (não estão no JSON): "Dia 13 de cada mês – 12:00 (Hora da Graça com Rosa
Mística)" na Paróquia Nossa Senhora Rosa Mística; "Dia 14 de cada mês – 06:30, 15:00 e 19:00" no
Santuário Senhor do Bonfim (Bocaiúva); "Todo dia 13 – 19:00" na Paróquia Santo Antônio (Grão
Mogol). São missas reais e frequentadas — se o Parish passar a modelar recorrência mensal, vale
voltar nessas três.

### 3. 149 horários com `confidence: "media"` por falta de sinal de atualidade

Regra aplicada: página oficial modificada **antes de 10/09/2025** (campo `modified` da REST API) →
`media`; a partir daí → `alta`. 35 das 76 páginas estão nessa faixa; 18 delas publicam horário, o
que gerou os 149 registros `media`. Os maiores blocos: São Sebastião/Taiobeiras (20), Matriz de
Montes Claros (14), São José Carpinteiro e Maria de Nazaré/MOC (13), Perpétuo Socorro e Todos os
Santos/MOC (12) e Sagrado Coração de Jesus/Bocaiúva (12). O conteúdo é oficial; só não há sinal de
atualização recente.

### 4. Celebração da Palavra não virou missa

Casos identificados e **descartados** do JSON:

- Paróquia Nossa Senhora do Perpétuo Socorro e Todos os Santos (Montes Claros): "Segunda-feira:
  Celebração da Palavra – 18:30".
- Paróquia São Sebastião (Taiobeiras): as comunidades Santa Rita de Cássia, São Judas Tadeu,
  Nossa Senhora da Piedade, Santa Clara e São José publicam "Missa **ou** Celebração da Palavra" —
  esses horários **foram mantidos** como `MASS`, porque a fonte admite missa, mas são incertos por
  natureza. Também na Comunidade Todos os Santos ("Missas: 1ª e 3ª terça-feira do mês; Celebração:
  2ª e 4ª terça") só a parte de missa entrou, como mensal/`baixa`.
- Paróquia São João Paulo II (Montes Claros): a seção chama-se "Celebração nas Comunidades" mas
  lista as quatro comunidades com horário único de domingo — tratadas como missa.

### 5. Itens menores para conferência humana

- **Adoração x missa no mesmo horário**: em várias paróquias a linha "Quinta-feira – 18:30
  (Adoração ao Santíssimo) e 19:00 (Missa)" foi separada corretamente em `ADORATION` + `MASS`, mas
  linhas em que a adoração aparece só como observação ("Quinta-feira – 19:00 Missa e adoração")
  ficaram como uma única entrada `MASS`. São 10 `ADORATION` no total — número certamente inferior
  ao real.
- **Nome do arcebispo**: `arquimoc.org` não tem página de contato do arcebispo com nome padronizado;
  o nome veio do texto institucional e do catholic-hierarchy.
- **Endereço da cúria divergente**: o arquivo grava "Rua Januária, 371 – Centro, CEP 39400-077",
  que é o da Secretaria Arquiepiscopal e da Assessoria de Comunicação no rodapé de `arquimoc.org`.
  O catholic-hierarchy registra "Praça Dr. Chaves 52" e telefone (38) 3221-8728; o site ainda cita
  um terceiro endereço, o Centro Administrativo Arquidiocesano (Rua Afonso Celso Guimarães, 392 –
  Jardim São Luiz, 39401-058, tel. (38) 2211-9434). São três endereços institucionais diferentes.
- **"Paróquia Nossa Senhora Imaculada Conceição / Novorizonte"** e **"Paróquia São Sebastião /
  Berizal"**: o *slug* da URL de origem é `quase-paroquia-...`, mas o título atual da página já diz
  "Paróquia". Foi adotado "Paróquia" (o título vigente). Confirmar se houve elevação.
- **"Paróquia Santuário Senhor do Bonfim | Bocaiuva"**: nome oficial no site mistura os dois
  prefixos. Mantido como está; `slug` gerado é `senhor-do-bonfim-bocaiuva`.
- **Grafia de Bocaiúva**: o site escreve "Bocaiuva" (sem acento) no título; no arquivo foi
  normalizado para **Bocaiúva**.
- **Endereços de secretaria x endereço da igreja**: algumas páginas têm dois endereços (o da
  secretaria aparece antes do campo "Endereço:"). O arquivo usa sempre o campo "Endereço:". Em
  Santo Antônio (Salinas), São Gonçalo (Francisco Sá), São João Paulo II e Santo Antônio
  (Luislândia) os dois divergem.
- **Paróquia Senhor Bom Jesus (Santa Cruz de Salinas)**: o campo "Endereço:" traz só
  "Santa Cruz de Salinas – MG", sem logradouro; `zipCode` ficou `null`.
- **Paróquia São João Batista (Terra Branca)**: a página não lista clero — `priestName` é `null`. É
  a única paróquia sem pároco identificado.
- **Telefones**: gravados exatamente como publicados, inclusive formatos irregulares
  ("38 9881-9310", "(038) 99838-8254", "3221-1148" sem DDD em São Francisco de Assis/MOC,
  "(33) 9 98022451" com DDD 33 em Santa Cruz de Salinas). Precisam de normalização.
- **E-mails**: 9 paróquias não publicam e-mail. Um deles tem erro de digitação evidente na fonte —
  `paroguiasaojudastadeu2017@gmail.com` (São Judas Tadeu/MOC, "paroguia" com G).
  Em Nossa Senhora de Montes Claros e São José de Anchieta o e-mail publicado é o genérico
  `Secparoquia@gmail.com`.
- **`foundedYear` ficou `null` em todas as 76**: o site não publica ano de fundação de paróquia
  (só o histórico da arquidiocese). Nenhum dado foi inferido.
- **Comunidades sem padroeiro**: algumas entradas da lista oficial de comunidades trazem só o nome
  do povoado, sem santo ("Bonito/Gangorrinha", "Jardim", "Bateeiro", "Chácara/Santa Rosa" em
  Cristália; "Rancharia" em Japonvar; "Pintado" em Josenópolis; "Novo Ar" em Capitão Enéas;
  "Ilha", "Cabeceira do Atanásio" em Taiobeiras; "Rancho Alegre", "Cristo Redentor" em Mirabela;
  "Pedro Noronha" em Guaraciama; "Alegre – Quilombola" em São João da Lagoa). Foram mantidas como
  publicadas.
- **Comunidades criadas a partir do bloco de horários**: quando a fonte marcava missa em um local
  ausente da lista "Comunidades paroquiais", o local virou comunidade (ex.: Igreja Nossa Senhora de
  Fátima na Paróquia Nossa Senhora da Paz/Padre Carvalho; Capela Nossa Senhora do Rosário em São
  Gonçalo/Francisco Sá; Nossa Senhora da Piedade, Cristo Rei e São Judas Tadeu em São
  Sebastião/Taiobeiras; Lagoinha e Cutica em Novorizonte). Mesma fonte oficial, mesma confiança.

### 6. Desambiguação de comunidades homônimas (decisão técnica importante)

Na zona rural do Norte de Minas é comuníssimo uma paróquia ter várias comunidades com o mesmo
padroeiro — a Paróquia Nossa Senhora Aparecida de Brasília de Minas tem **oito** "Nossa Senhora
Aparecida" em povoados diferentes. O site publica "Nossa Senhora Aparecida – Pipocas", "Nossa
Senhora Aparecida – Tabuas" etc.

O `import-territorio.ts` distingue comunidades por **(paróquia + nome + endereço)**, então elas não
se fundem na carga — mas o casamento de *horário* com comunidade é feito só pelo **nome**, com
`includes` nos dois sentidos. Um horário apontando para "Nossa Senhora Aparecida" cairia na
primeira da lista.

Por isso, **406 das 1.096 comunidades ficaram com o rótulo completo no campo `name`**
("Nossa Senhora Aparecida – Pipocas"), com o povoado repetido em `neighborhood`. A regra aplicada:
o nome curto vira rótulo completo sempre que ele se repete na paróquia **ou** é substring do nome
de outra comunidade da mesma paróquia (era o caso de "Nossa Senhora da Imaculada Conceição" x
"Matriz Nossa Senhora da Imaculada Conceição" em Novorizonte). Conferido: **0 horários órfãos e 0
casamentos ambíguos** no arquivo final.

Um caso ficou com nome menos preciso do que poderia: em Novorizonte, o rótulo "Indaiá fixo" da
lista de horários foi resolvido para a comunidade "Nossa Senhora da Imaculada Conceição – Indaiá",
e os locais "Lagoinha" e "Cutica", que só aparecem nos horários, viraram comunidades com esse nome
seco.

## Observação de método (reaproveitável)

`arquimoc.org` é o melhor caso de site diocesano encontrado até agora em MG: REST API aberta para
`paroquias`, categorias = foranias, e páginas de paróquia com marcação regular
(`Telefone: / E-mail: / Endereço: / Horários de Missa / Atendimento de Confissão / Comunidades
paroquiais / Clero`). Um extrator de ~150 linhas resolveu 76 páginas. Vale testar o mesmo padrão
(`/wp-json/wp/v2/types` para descobrir os *custom post types*) em toda diocese WordPress.
