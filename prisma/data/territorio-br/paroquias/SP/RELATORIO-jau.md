# Relatório de pesquisa — Diocese de Jaú (SP)

- **Arquivo gerado:** `paroquias/SP/jau.json`
- **Data da pesquisa:** 2026-09-10
- **Agente:** enxame de pesquisa do território (`PROMPT-pesquisa.md`)

## Resumo

| Métrica | Valor |
|---|---|
| Paróquias (registros) | **51** (50 alta / 1 media / 0 baixa) |
| Comunidades / capelas | **180** |
| Horários fixos | **507** (437 alta / 0 media / 70 baixa) |
| Cobertura | **51 / 51 da lista oficial (100 %)** — esperado histórico: 47 |

Municípios cobertos (15, exatamente os declarados pela diocese): Jaú (18), Ibitinga (6),
Itápolis (5), Bariri (3), Barra Bonita (3), Brotas (3), Dois Córregos (3), Tabatinga (2),
Torrinha (2), Bocaina (1), Borborema (1), Itaju (1), Itapuí (1), Mineiros do Tietê (1),
Nova Europa (1).

Tipos de horário: 500 `MASS`, 5 `ROSARY`, 2 `ADORATION`. Não há `CONFESSION` — o site não
publica horário de confissão em nenhuma paróquia.

## Fontes principais

O site oficial (`https://diocesejau.org.br`) estava no ar e é a fonte de **100 %** dos dados.
A página `/paroquias/` monta a lista por JavaScript; a lista canônica vem da API REST do
próprio site:

| Fonte | Uso |
|---|---|
| `https://diocesejau.org.br/wp-json/paroquias/v1/cidades-paroquias` | lista canônica (51 registros, agrupados por cidade) |
| `https://diocesejau.org.br/paroquia/<slug>/` | uma página por paróquia: cidade, data de criação + bispo que criou, pároco, vigário, diáconos, forania, **celebrações eucarísticas por comunidade**, endereço, CEP, telefone, e-mail, site, expediente |
| `https://diocesejau.org.br/a-diocese/` | 15 municípios, 47 paróquias, 6.018,531 km², 67 padres, 17 diáconos, Regional Sul 1 |
| `https://diocesejau.org.br/o-bispo/` | Dom Francisco Carlos da Silva |
| `https://diocesejau.org.br/contato/` | Cúria: Rua Major Prado, 598, Centro, Jaú/SP, 17201-450; (14) 4103-7007 |
| `https://www.catholic-hierarchy.org/diocese/djaux.html` | ereção em 26/06/2024 (desmembrada de São Carlos), 47 paróquias na bula |

Nenhum agregador (horariodemissa.com.br, missas.com.br, Google Maps) foi necessário.

## Cobertura

A diocese é **nova**: foi erigida em 26/06/2024, desmembrada da Diocese de São Carlos, e a bula
registrava 47 paróquias. A lista oficial hoje traz **51 registros**. A diferença é explicada
pelo próprio site:

- **Quase-Paróquia Santa Luzia** (Dois Córregos) — criada em 07/10/2025 por Dom Francisco Carlos
  da Silva;
- **Paróquia Nossa Senhora do Desterro** (Jaú) — criada em **30/08/2026**, dez dias antes desta
  coleta (o slug da URL ainda é `quase-paroquia-nossa-senhora-do-desterro`);
- **Paróquia Santa Luzia** (Ibitinga) — também listada com slug `quase-paroquia-...`, sem data de
  criação na página;
- **Mosteiro Paraíso – Agromonges** (Torrinha) — **não é paróquia** (ver abaixo).

## Pontos para o enxame de validação

### 1. Registro que não é paróquia

**Mosteiro Paraíso – Agromonges (Torrinha)** aparece na lista oficial de "paróquias" da diocese,
mas é um mosteiro (administrador: Padre Nilton Antonio Marques, que também é vigário da Paróquia
São José de Torrinha). Foi gravado com `confidence: "media"` justamente por isso. **Decidir se
entra na carga** — pelas regras atuais (`media` entra) ele entraria como paróquia, o que
provavelmente não é o desejado.

### 2. Prefixo de nome divergente entre a lista e a página

Três registros são apresentados com prefixos diferentes na lista da API e na própria página:

| Slug da URL | Nome usado no JSON | Observação |
|---|---|---|
| `quase-paroquia-nossa-senhora-do-desterro` | Paróquia Nossa Senhora do Desterro | a página já diz "Paróquia criada em 30 de agosto de 2026" — foi elevada |
| `quase-paroquia-santa-luzia` (Ibitinga) | Paróquia Santa Luzia | a página só diz "Paróquia"; sem data de criação |
| `quase-paroquia-santa-luzia-2` (Dois Córregos) | Quase-Paróquia Santa Luzia | a página diz "Quase-Paróquia criada em 07/10/2025" |

Usei sempre o nome da própria página da paróquia (fonte mais específica), não o slug.

### 3. Setenta horários `baixa` — todos por recorrência mensal

Nenhum horário foi rebaixado por dúvida sobre a fonte. Os 70 `baixa` são o problema de modelagem
já registrado no README: missas de recorrência **mensal ou quinzenal**, que `MassSchedule` (só
dia da semana) não representa. Exemplos:

- Paróquia São Sebastião (Borborema) — 11 comunidades rurais, quase todas com "1ª/2ª/4ª
  terça-feira", "1º sábado", "4º Domingo", e ainda **"Fazenda São José — Domingo (cada dois
  meses) 15h30"**;
- Paróquia Nossa Senhora do Bom Conselho (Tabatinga) — "Comunidade Santo Antônio (Tremembé): 1ª
  sexta-feira do mês, 19h (**meses pares**)" e "Comunidade São José (Macaúba): 1ª sexta-feira do
  mês, 19h (**meses ímpares**)" — o par só faz sentido junto;
- Paróquia Santo Antônio de Pádua (Itapuí) — 7 capelas, 6 delas mensais.

O texto original está no campo `notes` de cada registro.

### 4. Horários que a modelagem não comporta (descartados)

Duas linhas não geraram nenhum registro porque não têm dia da semana:

- **Paróquia Santa Cruz (Jaú/Potunduva)** — "1 Domingo Capela Frei Galvão" (sem hora) → a
  comunidade foi criada, mas sem horário;
- **Paróquia Nossa Senhora das Dores (Bariri)** — "Capela São José – toda última terça-feira do
  mês" (sem hora) → comunidade criada, sem horário.

Comunidades com nome genérico gravadas literalmente da fonte, que precisam de desdobramento por
um validador: `Comunidades rurais` (Bariri — Nossa Senhora Aparecida; Itaju; Torrinha),
`Comunidade rural` e `Capelas rurais` (Itápolis — Santo Antônio de Pádua e São Vicente de Paulo).

### 5. Dados de contato ausentes na origem

- **Sem e-mail (19 paróquias)** — a maioria em Jaú, Ibitinga e Itápolis. O site simplesmente não
  publica.
- **Sem telefone (3):** São Sebastião e Santa Efigênia (Brotas), Nossa Senhora Aparecida
  (Itápolis/Nova América), Universitária São José (Jaú).
- **Sem CEP (2):** Quase-Paróquia Santa Luzia (Dois Córregos) e Nossa Senhora do Desterro (Jaú) —
  as duas mais recentes, com bloco de endereço em formato livre.
- **Sem ano de criação (3):** São João Batista (Bocaina — a página diz apenas "criada **antes de
  1893**" por Dom Lino Deodato Rodrigues de Carvalho), Santa Luzia (Ibitinga) e o Mosteiro
  Paraíso. Todos ficaram `null`; **nada foi inferido**.

### 6. E-mail malformado na fonte

A Paróquia São Sebastião (Jaú) publica `secretaria@saosebastiãojau.com.br` — **com "ã" no
domínio**, o que é inválido. O e-mail foi gravado como `null` e o site
(`https://www.saosebastiaojau.com.br`, sem acento) foi mantido. Mesma paróquia: o texto do site
aparece como `www.saosebastiaojau.com.br`.

Outro caso: Paróquia São Pedro e São Paulo (Jaú) publica `par _pedroepaulo@hotmail.com` (com
espaço no meio) — gravado como `null`.

E a Paróquia Imaculada Conceição (Ibitinga) publica o site quebrado
`www.paroquiaimaculadaibitinga.com.b r`; normalizei para
`https://www.paroquiaimaculadaibitinga.com.br` — **confirmar**.

### 7. Distritos tratados como bairro

Cinco paróquias ficam em distrito, não na sede do município. O município (`city`) segue a
listagem oficial da diocese e o distrito foi para `neighborhood`:

| Paróquia | city | neighborhood |
|---|---|---|
| Paróquia Bom Jesus | Itápolis | Distrito de Tapinas |
| Paróquia Nossa Senhora Aparecida | Itápolis | Distrito de Nova América |
| Paróquia Santa Cruz | Jaú | Distrito de Potunduva |
| Paróquia Nossa Senhora Aparecida | Tabatinga | Distrito de Curupá |
| Paróquia São Sebastião e Santa Efigênia | Brotas | Patrimônio São Sebastião da Serra |

### 8. Detalhes menores

- **Paróquia Senhor Bom Jesus (Mineiros do Tietê)** tem missas "na Matriz" e "no Santuário" — são
  dois templos da mesma paróquia. Gravei o segundo como comunidade `Santuário (Mineiros do
  Tietê)`; o site não dá o nome do santuário. **Vale confirmar.**
- **Paróquia São João Batista (Jaú)** publica a grade misturando quatro comunidades sem
  cabeçalhos (Desterro, Santa Rita, Nossa Senhora do Sagrado Coração, Nossa Senhora das Graças).
  A separação foi feita à mão e é o registro mais frágil desta diocese.
- A Paróquia Nossa Senhora do Desterro (criada em 30/08/2026) e a Paróquia São João Batista (Jaú)
  compartilham o **mesmo telefone** (14 3626-2684) e comunidades de nome igual — o desmembramento
  é recentíssimo e a grade das duas ainda se sobrepõe na origem.
- Nove paróquias têm apenas a matriz (sem capelas listadas) — é o que a fonte informa, não é
  omissão de coleta.
