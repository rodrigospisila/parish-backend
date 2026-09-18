# Diocese de Tianguá (CE) — relatório de pesquisa

- **Agente**: pesquisa de território, 2026-09-18
- **Arquivo**: `paroquias/CE/tiangua.json`
- **Cobertura**: **22 / 22 paróquias (100%)**, todas `alta`, + **3 áreas missionárias**
  (`status: nao-paroquial` + `loadAsParish: true`, fora de `parishesFound`)
- **Comunidades**: **407**, tiradas da lista de **setores** de cada ficha
- **Horários fixos**: **157 — 140 `alta` e 17 `baixa`** (146 missas, 6 adorações + os 17 mensais),
  em **21 das 25 unidades**. Tudo de **fonte oficial da diocese**, com o site ativo.

É, de longe, a melhor fonte das seis dioceses desta rodada: a diocese publica grade de missas
própria **e** a lista de comunidades por setor.

## Fontes principais

| Fonte | URL | O que deu |
|---|---|---|
| Vicariato Norte / Centro / Sul | `/regiao-episcopal-norte`, `-centro`, `-sul` | as **25 unidades** (8 + 10 + 7), com cidade e telefone, e o link para cada ficha |
| Fichas de paróquia (25) | `/paroquia/<nome-com-acento>` | ano de criação, pároco e vigários, endereço, cidade, CEP, e-mail, site, expediente da secretaria, **grade de missas** e a **lista de setores com as comunidades** |
| Horários de Missas | `/horarios-de-missas` | grade agregada das 22 unidades que publicam missa — **confere linha a linha** com as fichas individuais (a grade gravada veio da ficha) |
| Notícias | `/noticias` | última publicação em **08/09/2026** — sinal de atualidade do portal |
| catholic-hierarchy | `/diocese/dtian.html` | erigida em 13/03/1971, desmembrada de Sobral; **21 paróquias** na estatística de 2022 |
| ViaCEP | `https://viacep.com.br/ws/<cep>/json/` | validação dos 16 CEPs publicados — 3 malformados corrigidos, 1 inexistente |

### Truques de coleta

- Site **Drupal 7** (o `/wp-json/...` devolve o HTML do tema, com o `THEME DEBUG` no topo — é fácil
  confundir com um WordPress). Não há `sitemap.xml`; a listagem canônica são as três páginas de
  vicariato.
- As URLs das fichas **têm acento e travessão no caminho** (`/paroquia/paróquia-de-santa-luzia-–-oiticicas`).
  Com `curl` no Git Bash do Windows a URL sai em cp1252 e o servidor devolve **400 ou 500**; foi
  preciso baixar por `urllib` com `urllib.parse.quote`, em Python. Quem só olhar o código HTTP vai
  concluir, errado, que as fichas não existem.
- Três das 25 unidades **não estão linkadas** na página do vicariato pelo texto que a listagem
  mostra (Sé Catedral, Paróquia Santo Antônio de Tianguá e Santo Antônio de Pádua de Chaval): os
  links existem, mas com o texto do rótulo diferente. Extrair todas as âncoras `<a>` cujo texto
  contenha "Paróquia", "Catedral" ou "Área" resolve.

### Atualidade

O rodapé diz "© 2018-2022", o que sugeriria site congelado — **mas não é**: a última notícia é de
**08/09/2026** e a lista inclui a Paróquia São Vicente de Paulo (Araticum, Ubajara), criada em
**2024**. Por isso todas as fichas ficaram `alta`.

## Estrutura encontrada

| Vicariato | Unidades |
|---|---|
| **Norte** (8) | N. Sra. do Livramento (Parazinho/Granja), Santa Luzia (Timonha/Granja), São José (Granja), A.M. Santa Terezinha (Granja), Bom Jesus dos Navegantes e São Francisco das Chagas (Camocim), N. Sra. dos Navegantes (Barroquinha), Santo Antônio de Pádua (Chaval) |
| **Centro** (10) | Sé Catedral Senhora Sant'Ana, Santo Antônio e São Pedro (Tianguá), São Pedro e A.M. N. Sra. das Graças (Ibiapina), São José e São Vicente de Paulo (Ubajara), N. Sra. da Assunção, Santa Luzia–Oiticicas e A.M. São Sebastião–Juá dos Vieiras (Viçosa do Ceará) |
| **Sul** (7) | N. Sra. das Dores (Croatá), N. Sra. das Graças (Graça), N. Sra. dos Prazeres (Guaraciaba do Norte), N. Sra. Auxiliadora (Carnaubal), São Benedito, Imaculada Conceição (Inhuçu) e São João Paulo II (Mons. Otálicio), estas três em São Benedito |

13 municípios. A mais antiga é **N. Sra. da Assunção, de Viçosa do Ceará** (a ficha diz 1654; o
histórico na mesma página diz que a paróquia foi criada em 07/07/1759 — ver pendências); a mais
nova é **São Vicente de Paulo, de Araticum/Ubajara (2024)**, que explica a diferença para o
catholic-hierarchy (21 paróquias em 2022).

Sem nenhum horário publicado: **N. Sra. da Assunção** (Viçosa do Ceará), **Imaculada Conceição**
(Inhuçu, São Benedito), **A.M. N. Sra. das Graças** (Alto Lindo, Ibiapina) e **A.M. Santa Terezinha**
(Granja).

## Comunidades

Cada ficha traz "Setores:", com os nomes das comunidades e marcadores: `(+)` igreja ou capela,
`(^)` salão paroquial, `(+*)` igreja em construção, "(tem Capela)". As 407 comunidades saíram daí, com
o setor gravado em `neighborhood`. As maiores: N. Sra. da Assunção/Viçosa (71), N. Sra. das
Graças/Graça (46), São José/Ubajara (42), São João Paulo II (36), Bom Jesus dos Navegantes (31),
São Pedro/Ibiapina (30), N. Sra. das Dores/Croatá (29), Santo Antônio/Tianguá (23).

Nove unidades publicam **só os nomes dos setores**, sem as comunidades (Sé Catedral, N. Sra. do
Livramento, N. Sra. dos Prazeres, Santo Antônio de Pádua, São Francisco das Chagas, São Benedito e
as áreas): nesses casos entra apenas a matriz.

Quatro comunidades foram acrescentadas a partir do bloco "Missas:" da própria ficha, que nomeia o
lugar da celebração sem repetir na lista de setores: **Capela de Santo Antônio** (São José/Granja),
**Igreja São Francisco** (São Benedito), **Comunidade São Francisco** (São Pedro/Ibiapina) e as
quatro capelas de São Francisco das Chagas (São José, N. Sra. de Fátima, Santa Bernadete, Santa
Terezinha).

## Horários

140 `alta` (grade fixa semanal) e **17 `baixa`**, todos por recorrência mensal ou data fixa do mês,
com a regra literal em `notes`:

- **Data fixa do mês** (`dayOfWeek: null`): "todo dia 13 às 12h" em Santo Antônio/Tianguá e Santo
  Antônio de Pádua/Chaval; "todo dia 02 às 8h e às 19h", "todo dia 13 às 12h" e "todo dia 18 às 19h"
  em N. Sra. do Livramento (Parazinho).
- **Recorrência mensal**: "1ª sexta-feira" (A.M. São Sebastião/Juá dos Vieiras, Santo Antônio de
  Pádua, N. Sra. das Dores/Croatá, São João Paulo II), "1º sábado" (São Francisco das Chagas — missa
  do Imaculado Coração de Maria; Santo Antônio de Pádua — missa na gruta; N. Sra. das Dores — Movimento
  Sacerdotal Mariano), "2º sábado" (Comunidade Santa Bernadete), "3º sábado" (Capela Santa
  Terezinha), "1º e 4º domingo às 8h" (N. Sra. do Livramento).
- Um horário `baixa` por **local indefinido**: "Sexta – Comunidades – 19h", na Paróquia São José de
  Granja — a fonte não diz em qual comunidade.

**Não viraram horário** (a fonte publica sem hora): "Adoração ao Santíssimo durante o dia" na quinta
em Santa Luzia/Timonha; "Dias 13 e 18 de cada mês" em N. Sra. Auxiliadora/Carnaubal; "terças, sextas
e sábados: Comunidades e setores da zona rural" em N. Sra. das Dores/Croatá; "sexta, sábado e
domingo: Comunidades e setores da zona rural" em N. Sra. das Graças/Graça. Todos registrados em
`notes` da paróquia.

## Precisa de validação humana

1. **Ano de criação contraditório dentro da própria ficha**, em duas paróquias:
   - **N. Sra. da Assunção (Viçosa do Ceará)** — campo diz **1654**; o histórico diz que a paróquia
     foi criada em **07/07/1759** (1654/1656 é a missão jesuítica). Gravado 1654, como no campo.
   - **Bom Jesus dos Navegantes (Camocim)** — campo diz **1938**; o histórico diz Lei Provincial
     nº 2007 de **05/09/1882**, instituída canonicamente em **19/01/1883**. Gravado 1938.
2. **CEP inexistente na Sé Catedral** — a ficha publica **62320-000**, que o ViaCEP não reconhece.
   Gravado `null`. É o único CEP da diocese sem substituto.
3. **Três CEPs truncados/malformados**, corrigidos com o ViaCEP e anotados: `62430-00` → **62430-000**
   (N. Sra. do Livramento, Granja), `6.440-000` → **62440-000** (Santa Luzia, distrito de Timonha,
   Granja), `62360-00` → **62360-000** (São Pedro, Ibiapina).
4. **Duas informações de governo na mesma ficha** — a de N. Sra. da Assunção (Viçosa do Ceará) traz
   "Pároco: Pe. Michael Johnny da Silva Souza" e, no fim, "Administrador Paroquial: Pe. José Olívio
   Oliveira", que é o pároco de Santa Luzia–Oiticicas, no mesmo município. Gravado o pároco.
5. **E-mail malformado** — N. Sra. das Dores (Croatá) publica `paroquianossa@1602gmail.com`
   (o "1602" é o telefone colado no domínio). Não foi gravado.
6. **Setores repetidos entre duas paróquias de Camocim** — São Francisco das Chagas (criada em 2016)
   publica os setores Tamboril, Flamengas, Amarelas, Timbaúba e Tapuio, nomes que também aparecem
   como setores de Bom Jesus dos Navegantes. Provável partilha de território na criação; a lista de
   comunidades de Bom Jesus dos Navegantes pode estar desatualizada.
7. **Área Missionária São Sebastião – Juá dos Vieiras sem município na fonte** — foi atribuída a
   **Viçosa do Ceará** porque "Juá dos Vieiras" consta como comunidade do Setor Buriti Grande na
   ficha de N. Sra. da Assunção, de Viçosa do Ceará. Conferir.
8. **Área Missionária Santa Terezinha (Granja)** — a ficha traz **só** "Ano de criação: 2017".
   Nenhum endereço, clero, contato ou horário.
9. **Site da Paróquia N. Sra. dos Prazeres** — a ficha publica `www.paroquiadeguaraciaba.com.br/`;
   foi gravado `http://www.paroquiadeguaraciabadonorte.com.br`, que é o domínio correspondente ao
   e-mail oficial. **Conferir qual dos dois responde** (nenhum foi aberto nesta rodada).
10. **Nomes de comunidade herdados do layout** — em Santo Antônio/Tianguá e N. Sra. Auxiliadora/
    Carnaubal a lista de setores vem em texto corrido quebrado por linha, e algumas entradas
    juntaram duas comunidades numa só ("N. Sra do Carmo (Ceasa) e N. Sra. das Graças (Cipó)",
    "Santa Luzia (Araticum) e N. Sra. da Saúde (Palmeiras)", "N. Sra. Aparecida (Covão) e N. Sra. das
    Dores (Remissão)"); uma ficou partida em duas ("Imaculada" / "Conceição (Bom Jesus I)"). São ~6
    registros; o texto é fiel à fonte, mas precisa de separação manual.
11. **Adoração e missa na mesma hora** — São João Paulo II publica "Quinta: Adoração ao Santíssimo e
    missa: 18:30hs". Gravados os dois às 18:30, com nota. Provavelmente a adoração é antes.

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

- `email`: está `null`; o rodapé do site publica **ascomdiocesedetiangua@gmail.com**.
- `address`: está "Av. Prefeito Jacques Nunes 1739, Bairro Seminario" — confere (a grafia do site é
  "Av. Pref. Jacques Nunes, 1739 - Bairro Seminário"); a cúria também publica Caixa Postal 51.
- `phone`: o site apresenta o **(88) 3671-1180 como WhatsApp** da cúria — é o mesmo número já
  registrado.
- `foundedYear` (1971), `website`, `bishopName`: **conferem**.
