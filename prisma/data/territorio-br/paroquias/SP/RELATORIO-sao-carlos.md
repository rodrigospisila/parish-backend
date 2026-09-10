# Relatório de pesquisa — Diocese de São Carlos (SP)

**Data da pesquisa:** 2026-09-10 · **Arquivo gerado:** `sao-carlos.json`

## Resumo

| Item | Total |
|---|---|
| Paróquias | **79** (81 fichas no site − 2 duplicatas do CMS) — todas `alta` |
| Comunidades | **115** (79 matrizes + 36 capelas/comunidades) |
| Horários fixos | **385** (379 `alta`, 6 `baixa`) — de **37** paróquias |
| Cobertura | **79** encontradas / **75** esperadas (Catholic-Hierarchy, 2024) |

## Fontes principais

1. **Portal diocesano — https://www.diocesesaocarlos.org.br** (WordPress + plugin
   `wp-parresia-register`).
   - **Índice `/paroquias/`**: a lista é paginada e o parâmetro **não** é `?page=`. O nome real
     está no JS do plugin
     (`/wp-content/plugins/wp-parresia-register/dist/scripts/public/elementor/widgets/institution-list.js`):
     o link é **`/paroquias/page/N/`**. São **9 páginas × 9 registros = 81 fichas**, sem repetição
     de URL. (O post type `paroquia` **não** é exposto na REST API nem no sitemap — o
     `/wp-sitemap.xml` só cobre post, page, agenda, artigo, chancelaria, requerimento, tribunal e
     eventos.)
   - **Ficha `/paroquia/<slug>/`** de cada paróquia, com nome, telefone, endereço (rua, número,
     bairro, cidade e às vezes CEP), **e-mail ofuscado pelo Cloudflare** (decodificado a partir do
     atributo `data-cfemail`), **clero** (pároco e vigários, com link para `/clerigo/<slug>`) e a
     **tabela de horários de missa**.
   - **A tabela de horários vem em JSON**, dentro do atributo `data-item` de cada linha, com os
     campos `type` (sempre `mass`), `recurrence` (`daily` / `weekly` / `monthly`), `weekDays`
     (`monday`…`sunday`), `schedules[].hour` e `description`. **Foi daí que saíram os 385
     horários** — dado estruturado, não texto livre.
2. **catholic-hierarchy.org/diocese/dsaca.html** — ver a seção de cobertura.

## Cobertura — atenção ao desmembramento de 2024

**Em 26/06/2024 foi erigida a Diocese de Jaú**, desmembrada de São Carlos, que perdeu 15
municípios: Jaú, Bariri, Barra Bonita, Bocaina, Borborema, Brotas, Dois Córregos, Ibitinga, Itaju,
Itápolis, Itapuí, Mineiros do Tietê, Nova Europa, Tabatinga e Torrinha. A estatística caiu de
**132 paróquias (2023)** para **75 (2024, fonte: a própria bula)** e de 843.000 para 485.000
católicos.

O site lista **79** paróquias (depois de fundir as duplicatas), 4 a mais que as 75 da bula. A
diferença se explica por:
- **2 entradas não paroquiais**, marcadas com `"status": "nao-paroquial"`:
  - **Igreja Santa Cruz – Missionários Redentoristas** (Araraquara) — cadastrada sem o prefixo
    "Paróquia" e sem clero; é a igreja dos Redentoristas. Como a diocese publica **18 horários
    fixos** dela, recebeu também `"loadAsParish": true`;
  - **Santuário da Mãe Rainha** (Araraquara) — sem prefixo "Paróquia", sem clero e sem horário.
- paróquias criadas depois de junho de 2024.

O **Santuário Nossa Senhora Aparecida da Babilônia** (São Carlos) também não tem o prefixo
"Paróquia", mas a diocese lhe atribui **pároco** (Pe. Everton Luis Luchesi) — foi mantido como
paróquia.

**14 municípios cobertos:** São Carlos 31 · Araraquara 22 · Matão 11 · Ibaté 4 ·
Américo Brasiliense 3 · e 1 cada em Santa Lúcia, Trabiju, Itirapina, Gavião Peixoto, Dourado,
Rincão, Motuca, Boa Esperança do Sul e Ribeirão Bonito.

## ⚠ Duas fichas duplicadas no CMS da diocese (fundidas)

O site cadastra **duas vezes** a mesma paróquia, com endereço idêntico:

| Paróquia | URLs |
|---|---|
| **Paróquia Santa Eudóxia** (São Carlos, Rua Santa Eudóxia, 43) | `/paroquia/paroquia-santa-eudoxia/` e `/paroquia/paroquia-santa-eudoxia-1/` |
| **Paróquia Santa Rita de Cássia** (São Carlos, Rua Alberto Lanzoni, 474) | `/paroquia/paroquia-santa-rita-de-cassia/` e `/paroquia/paroquia-santa-rita-de-cassia-1/` |

Cada par virou **um** registro, com a união dos campos (só um dos registros de Santa Rita traz o
pároco, Pe. Valdir do Carmo André). As duas URLs ficaram em `sources`.

## ⚠ "Fundada em" do site é data de cadastro, não de fundação

O site mostra "Fundada em …" em 16 fichas, mas as datas **se repetem em massa**:
**27/01/2026 em 7 fichas**, **09/12/2025 em 4**, além de 01/12/2025, 02/01/2026 e 18/06/2026.
Nas outras 65 fichas o mesmo campo aparece apenas no JSON-LD, sempre como **18/05/2025** — a data
em que o site foi para o ar. **Todas foram gravadas como `null`.**

A única exceção é a **Paróquia São Bento – Basílica Menor** (Araraquara), com
"Fundada em **22 de agosto de 1817**" — data plausível e coerente com a história da basílica;
foi a única gravada (`foundedYear: 1817`).

## Horários

**37 das 79 paróquias publicam horário**, somando **385 registros** — a maior densidade das quatro
dioceses desta rodada. Como o dado vem estruturado (`weekDays` + `schedules[].hour`), a conversão
para `dayOfWeek`/`time` é direta e sem ambiguidade.

**6 horários `baixa`** — todos por **recorrência mensal** (`recurrence: "monthly"` na própria
fonte), a "Missa de 1ª sexta-feira do mês":
Divino Espírito Santo (Matão), N. Sra. da Rosa Mística (São Carlos), N. Sra. do Carmo (São Carlos),
N. Sra. do Perpétuo Socorro (Matão) e São Sebastião (Matão, 2 horários). A regra literal está em
`notes`.

**42 paróquias sem nenhum horário publicado**, entre elas paróquias grandes:
Santuário Santo Antônio e São Dimas (Araraquara), Santuário São Pio X, São Benedito, São José,
São Judas Tadeu e São Francisco de Assis (São Carlos), Senhor Bom Jesus e São Lourenço (Matão).
Só 3 delas têm rede social oficial no site (ver abaixo).

**Nenhuma confissão, adoração ou terço** — o campo `type` do site é sempre `mass`. A única entrada
não-missa encontrada, **"Novena – Nossa Senhora do Perpétuo Socorro"**, foi **descartada** (novena
não é missa), embora o site a marque como `type: "mass"`.

## Qualidade dos campos

| Campo | Preenchidos |
|---|---|
| Endereço | 78/79 (falta só o Santuário da Babilônia, que traz apenas "São Carlos – SP") |
| Cidade | 79/79 |
| Telefone | **30/79** — o site não publica telefone em 49 fichas |
| E-mail | 53/79 (todos vieram do `data-cfemail`) |
| Pároco | 75/79 |
| CEP | **3/79** — o site só traz CEP embutido no texto do endereço em 3 fichas |
| Site/rede social | **3/79** (o bloco `institution-social-links` está vazio em 76 fichas): Paróquia Santa Luzia (São Carlos), Paróquia Santo Antônio de Pádua (Itirapina) e Paróquia São Domingos Sávio (São Carlos) |
| Ano de fundação | 1/79 (ver acima) |

## Precisa de validação humana

1. **Duplicatas do CMS** (Santa Eudóxia e Santa Rita de Cássia, ambas em São Carlos) — foram
   fundidas aqui, mas o erro continua no site da diocese.
2. **49 paróquias sem telefone e 76 sem CEP** — o site simplesmente não publica.
3. **42 paróquias sem horário de missa.**
4. **Nomes de comunidade genéricos**, extraídos do campo `name` do horário: a Paróquia Nossa
   Senhora de Guadalupe (São Carlos) tem uma comunidade chamada só **"Capela"** e a Paróquia Nossa
   Senhora Aparecida (Américo Brasiliense) uma chamada só **"Santuário"** — é o que a fonte
   escreve ("Missa – Capela", "Missa – Santuário").
5. **Possível comunidade contada em dobro**: a Paróquia Nossa Senhora da Rosa Mística (São Carlos)
   tem "Comunidade Jesus Bom Pastor" e "Comunidade Jesus Bom Pastor – Zavaglia" — provavelmente a
   mesma, com e sem o nome do bairro.
6. **Comunidades escondidas no campo `description`**: em algumas paróquias o nome do horário é só o
   dia da semana e a comunidade de cada horário está na descrição. É o caso da **Paróquia São
   Sebastião (Matão)**, cuja descrição diz, por exemplo, "08h – Matriz São Sebastião / 10h – Capela
   São João Batista (Silvânia) / 19h – Matriz São Sebastião" e "17h – Capela Santa Teresinha e São
   Francisco de Sales (Nova Cidade)". Nesses casos **todos os horários foram atribuídos à matriz**
   e a descrição integral ficou em `notes` — a distribuição por capela precisa de revisão manual.
   As capelas São João Batista (Silvânia) e Santa Teresinha e São Francisco de Sales (Nova Cidade),
   de Matão, **não** entraram como comunidades por isso.
7. **Santuário Nossa Senhora Aparecida da Babilônia (São Carlos)** — sem endereço de rua (a ficha
   traz só a cidade) e com telefone grafado "(16) 9 3618-1528".
8. **Igreja Santa Cruz – Missionários Redentoristas (Araraquara)** — marcada `nao-paroquial` +
   `loadAsParish: true`. Confirmar o regime canônico (paróquia confiada aos Redentoristas ou igreja
   não paroquial?). O endereço publicado é só "São Bento, Centro" (falta "Rua").
9. **Santuário da Mãe Rainha (Araraquara)** — marcado `nao-paroquial`; sem clero e sem horário.
   Confirmar se deve entrar no sistema.
10. **Bairro ausente em várias fichas** — quando o endereço publicado não separa o bairro
    (ex.: "Rua Doutor João Sabino, 1514, São Carlos – SP"), `neighborhood` ficou `null`.
