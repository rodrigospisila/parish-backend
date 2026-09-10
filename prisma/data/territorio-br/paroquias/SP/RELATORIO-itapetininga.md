# Relatório de pesquisa — Diocese de Itapetininga (SP)

- **Arquivo gerado:** `paroquias/SP/itapetininga.json`
- **Data da pesquisa:** 2026-09-10
- **Agente:** enxame de pesquisa do território (`PROMPT-pesquisa.md`)

## Resumo

| Métrica | Valor |
|---|---|
| Paróquias | **40** (40 alta / 0 media / 0 baixa) |
| Comunidades / capelas | **374** (todas alta) |
| Horários fixos | **168** (145 alta / 0 media / 23 baixa) |
| Cobertura | **40 / 42 (95 %)** |

Todos os 168 horários são `MASS` — o site não publica confissão, adoração nem terço.

Municípios cobertos (15): Itapetininga (12), Tatuí (9), Angatuba (3), São Miguel Arcanjo (3),
Paranapanema (2), Pilar do Sul (2), Alambari, Campina do Monte Alegre, Capela do Alto,
Cesário Lange, Guareí, Porangaba, Quadra, Sarapuí e Torre de Pedra (1 cada).

Preenchimento: telefone 40/40, e-mail 40/40, endereço 40/40, bairro 40/40, CEP 39/40,
pároco 34/40, ano de criação 6/40 (ver ressalva 4).

## Fontes principais

Tudo veio do **site oficial da diocese** (`https://diocesedeitapetininga.org.br`), que usa o
plugin *Parresia* para publicar uma ficha por paróquia com campos identificados
(`institution-name-field`, `institution-foundation-field`, `institution-phone-field`,
`institution-address-field`), seção de clero com função, seção de comunidades e uma tabela
de horários cujo `data-item` traz JSON estruturado (`type`, `recurrence`, `weekDays`,
`schedules[].hour`).

| Fonte | Uso |
|---|---|
| `https://diocesedeitapetininga.org.br/paroquias/` | listagem canônica |
| `…/paroquias/?region=1..5` | percorridas as 5 regiões pastorais (Itapetininga, Norte, Sul, Oeste, Tatuí) para garantir a lista completa |
| `…/paroquia/<slug>` | endereço, CEP, telefone, e-mail, redes, clero, comunidades e horários |
| `…/contato/` | Cúria: Rua General Carneiro, 409, Centro, CEP 18200-024, Itapetininga-SP; (15) 3272-8557; comunicacao@diocesedeitapetininga.org.br |
| `…/paroquia/catedral-nossa-senhora-dos-prazeres` | Dom Luiz Antonio Lopes Ricci consta como Bispo Diocesano no clero da Catedral |
| `https://www.catholic-hierarchy.org/diocese/ditpt.html` | esperado: 42 paróquias (2023); erigida em 15/04/1998; sufragânea de Sorocaba |
| `https://gcatholic.org/dioceses/diocese/itap0` | corroboração (42 paróquias; 2 basílicas menores) |

**Nota de acesso:** o domínio devolve **HTTP 403 a leitores automáticos**. A coleta usou
`curl` com User-Agent de navegador. E-mails ofuscados pelo Cloudflare foram decodificados.

## Cobertura

**40 encontradas contra 42 esperadas.** As 40 são exatamente o que o site publica: a
listagem geral e as cinco páginas regionais devolvem o mesmo conjunto de 40 links
`/paroquia/<slug>`, sem paginação escondida. Não há como identificar quais seriam as 2
faltantes sem outra fonte — o dado do catholic-hierarchy é de **2023** e pode estar à
frente (paróquia criada e ainda não publicada) ou atrás (fusão de paróquias). Fica para o
enxame de validação.

Indício de que falta pelo menos uma: existe `paroquia-sao-roque-1` sem o `paroquia-sao-roque`
correspondente na listagem, o que sugere um registro despublicado no CMS.

As 2 basílicas menores que o GCatholic registra estão as duas presentes: **Basílica e
Santuário Nossa Senhora da Conceição** (Tatuí) e **Basílica São Miguel Arcanjo** (São Miguel
Arcanjo).

## Pontos para o enxame de validação

### 1. Campo "Fundada em" é a data de cadastro, não a de criação da paróquia (grave)

O rótulo "Fundada em" das fichas traz, em **34 das 40 paróquias**, uma data de 2025 ou 2026
— e 22 delas repetem exatamente **"23 de outubro de 2025"** (mais 12 em "1 de junho de 2026"
ou "13 de agosto de 2026"). É claramente a data de migração/cadastro no CMS, não a fundação.

Por isso só foram aceitos os **6 anos anteriores a 2020**, que são plausíveis:

| Paróquia | Cidade | foundedYear |
|---|---|---|
| Basílica e Santuário Nossa Senhora da Conceição | Tatuí | 1599 |
| Paróquia Nossa Senhora das Estrelas | Itapetininga | 1966 |
| Santuário Nossa Senhora Aparecida do Sul | Itapetininga | 1966 |
| Paróquia Santa Cruz | Cesário Lange | 1971 |
| Paróquia São João Batista | Itapetininga | 1993 |
| Paróquia São Pedro | Tatuí | 1998 |

Os outros 34 ficaram `null`. Mesmo o 1599 de Tatuí merece checagem (pode ser a data da
capela original, não da paróquia).

### 2. Quinze horários que não cabem no modelo

Não foram gravados porque a origem não dá dia da semana. Dois grupos:

**(a) Missas de dia fixo do mês (8):** Basílica São Miguel Arcanjo ("todo dia 29 às 9h,
12h30 e 19h30"), Paróquia Nossa Senhora Aparecida/Itapetininga ("todo dia 12 às 19h30"),
Paróquia Nossa Senhora das Dores ("dia 15 de cada mês - 19h30"), Paróquia Santa Teresinha do
Menino Jesus ("Todo dia 1º - 19h30"), Paróquia São Judas Tadeu ("todo dia 28 - 19h30"),
Paróquia São Lázaro ("todo dia 29 - 19h30"), Santuário Nossa Senhora de Fátima ("todo dia 13
- Segunda à Sexta às 19h30 | Sábado às 19h").

**(b) Registros marcados "Semanal" mas com `weekDays` vazio na origem (7)** — lacuna de
cadastro do site, não da coleta:

| Paróquia | Horário órfão |
|---|---|
| Catedral Nossa Senhora dos Prazeres | 19:00, 19:00, 08:30, 17:00 (4 registros) |
| Paróquia Bom Jesus e São Roque (Angatuba) | 19:30 |
| Paróquia Nossa Senhora das Dores (Itapetininga) | 17:00 |
| Paróquia Santa Rita de Cássia (Itapetininga) | "[Frei Galvão] Missa na comunidade Frei Galvão" 19:30 |
| Paróquia Sant’Ana (Itapetininga) | "[Madre Teresa] Missa na comunidade Madre Teresa" 19:30 |

A Catedral é o caso mais visível: publica 7 linhas de missa e 4 delas estão sem dia.

### 3. Missas mensais recuperadas — 23 registros `baixa`

Quando o dia da semana estava no **nome** do registro ("1ª Sexta-Feira: 19h30", "1º Sábado:
12h", "1º domingo: 10h - Missa da Catequese"), o horário foi gravado com o `dayOfWeek`
correto, `confidence: baixa` e o texto original em `notes`. Não devem entrar como missa
semanal — mesmo bloco de decisão de produto pendente descrito no README.

### 4. Seis paróquias sem pároco

Bom Jesus e São Roque (Angatuba), Santa Cruz (Itapetininga), Santa Rita de Cássia
(Itapetininga), Sant’Ana (Itapetininga), Santuário Nossa Senhora Rainha da Paz
(Itapetininga) e Bom Jesus do Bom Fim (Pilar do Sul). A seção de clero existe mas nenhum
nome está marcado como "Pároco". Gravado `null`.

### 5. Quatro paróquias sem nenhum horário

Santa Cruz (Itapetininga), Santa Rita de Cássia (Itapetininga), Santuário Nossa Senhora
Rainha da Paz (Itapetininga) e Bom Jesus do Bom Fim (Pilar do Sul) — as mesmas que estão sem
pároco. A tabela "Horários de Missas" está vazia na origem.

### 6. Nome de comunidade quebrado em dois cartões na origem (corrigido)

Na Catedral, o site publica dois cartões separados — `"Nossa Senhora do Perpétuo Socorro ("`
e `"Vila Barth)"` — que são um único nome partido no meio. Foram **reunidos** em
`"Nossa Senhora do Perpétuo Socorro (Vila Barth)"`. Vale confirmar se não há caso análogo
não detectado em outras paróquias.

Na Paróquia Bom Jesus do Bom Fim havia ainda uma comunidade chamada só `"– Asilo"`; o traço
inicial foi removido, restando `"Asilo"`. É provavelmente o sufixo de outro nome — checar.

### 7. Capitalização das cidades vinha errada na origem

O campo de endereço traz "TatuÍ" e "SÃo Miguel Arcanjo". Foram normalizados para "Tatuí" e
"São Miguel Arcanjo" no campo `city`; o `address` preserva o texto do logradouro como
publicado.

### 8. Site próprio das paróquias

Nenhuma paróquia tem `website` — o site da diocese só publica links de Facebook/Instagram,
que não entram neste campo. Gravado `null` nas 40.
