# Diocese de Iguatu (CE) — relatório de pesquisa

- **Agente**: pesquisa de território, 2026-09-18
- **Arquivo**: `paroquias/CE/iguatu.json`
- **Cobertura**: **34 / 34 paróquias e quase-paróquias (100%)** — 17 `alta`, 24 `media` (contando
  as unidades não paroquiais) —, mais **6 áreas pastorais/missionárias** e **1 capela de seminário**
  como unidade própria (`status: nao-paroquial` + `loadAsParish: true`, fora de `parishesFound`)
- **Comunidades**: **823** (todas nominadas pela diocese, com localidade)
- **Horários fixos**: **76 — todos `baixa`**, em 15 unidades. **A diocese não publica horário de
  missa em lugar nenhum**: as 4 ocorrências da palavra "missa" nas 121 páginas do site são nomes de
  comunidade ("Igreja (Missa nas casas)"). Tudo veio do agregador Lírio Católico, sem segunda fonte
  atual → nada entra em produção.

## Fontes principais

| Fonte | URL | O que deu |
|---|---|---|
| Índice de paróquias por cidade | `https://www.diocesedeiguatu.org.br/paroquias/paroquias-cidades/` | as **40 unidades** em 19 municípios, agrupadas por município, com o tipo de cada uma (paróquia / quase-paróquia / área pastoral / área missionária) |
| WP REST API — páginas | `/wp-json/wp/v2/pages?per_page=100` | `X-WP-Total: 121`; **47 páginas sob `/paroquias/zona-N/`**, com `modified` por ficha — é a listagem canônica e o critério de atualidade |
| Fichas de paróquia (40) | `/paroquias/zona-N/<slug>/` | ano de criação, endereço, CEP, telefone, e-mail, pároco e vigário, e **a lista nominal das comunidades com a localidade e a data do padroeiro** |
| Clero | `/clero/` (alterada em 24/08/2026) | confirmou pároco/reitor de 23 unidades; foi ela que deu o nome completo do reitor da quase-paróquia de José de Alencar, cuja ficha está parada em 2017 |
| catholic-hierarchy | `/diocese/digua.html` | erigida em 28/01/1961 (desmembrada de Crato); 29 paróquias na estatística de 2023 |
| Lírio Católico | `/horario_missa/dados/uf/CE.json` | 757 fichas do Ceará, 23 nos municípios da diocese — única fonte de horário |
| Mapa das OSC / IPEA | `api/osc/busca_avancada/...` | **não serviu** (ver abaixo) |

### Atualidade

WordPress com Elementor. Critério aplicado: ficha alterada há ≤ 12 meses (≥ 18/09/2025) → `alta`;
mais velha → `media`.

- **17 fichas** alteradas entre 15/12/2025 e 24/08/2026 → `alta`
- **24 fichas** entre 12/10/2017 e 31/10/2024 → `media`. O bloco maior (16 fichas) é de **24/07/2024**,
  claramente uma revisão em lote. Nenhuma foi rebaixada por ser anterior à pandemia, porque o que
  elas trazem é lista de comunidades e contato, não horário — e a ficha de 2017 (quase-paróquia São
  Sebastião, José de Alencar) teve o pároco reconferido na página do clero.

## Estrutura encontrada

7 zonais, 19 municípios, 40 unidades:

| Tipo | Qtde | Entra em `parishesFound`? |
|---|---|---|
| Paróquia (inclui a Sé Catedral) | 31 | sim |
| Quase-paróquia | 3 | sim |
| Área pastoral | 3 | não (`nao-paroquial` + `loadAsParish`) |
| Área missionária | 3 | não (`nao-paroquial` + `loadAsParish`) |
| Capela de seminário (com missa publicada) | 1 | não (`nao-paroquial` + `loadAsParish`) |

Municípios: Acopiara (3), Aiuaba (1), Arneiroz (1), Cariús (1), Catarina (1), Cedro (2),
Deputado Irapuan Pinheiro (1), Icó (4), Iguatu (6 + o seminário), Jucás (2), Milhã (1), Mombaça (3),
Orós (2), Pedra Branca (3), Piquet Carneiro (2), Quixeló (1), Saboeiro (2), Senador Pompeu (1),
Solonópole (3).

### Prova de completude — o que falhou

- **Mapa das OSC/IPEA**: a busca avançada por razão social no município de Iguatu (IBGE 2305506)
  devolve **uma única** organização religiosa, e é a "Igreja Católica Ortodoxa Paróquia Nossa
  Senhora dos Milagres" — que **não é** da diocese latina e ficou fora do JSON. Não há registro de
  "MITRA DIOCESANA DE IGUATU" na base. É o caso, previsto no README, de a base do IPEA falhar no
  interior.
- **Varredura de filiais do CNPJ da mitra**: não foi possível — o CNPJ raiz da mitra não aparece nem
  no rodapé do site nem nas fichas, e nenhuma paróquia publica CNPJ. Fica como pendência.
- A completude, portanto, se apoia no **cruzamento interno do próprio site**: o índice por cidade,
  as 7 páginas de zonal e a página de clero listam exatamente o mesmo conjunto de 40 unidades.

## Comunidades

Este é o ponto forte da diocese: **quase toda ficha traz a lista nominal das comunidades** com
padroeiro, localidade e dia da festa — 823 no total, contando as igrejas-matriz. O campo
`neighborhood` da comunidade recebe a localidade publicada ("Sítio Umarí", "Distrito de Lagêdo",
"Bairro Veneza"). Quando o mesmo padroeiro se repete dentro de uma paróquia, o nome foi
desambiguado com a localidade (`Igreja São José – Sítio Santa Maria`).

Onze unidades **não publicam comunidade nenhuma** (só a matriz entra): São João Batista (Cedro),
N. Sra. do Perpétuo Socorro (Mineirolândia, Pedra Branca), Sagrado Coração de Jesus e A.M. Sagrada
Família (Piquet Carneiro), Bom Jesus Aparecido e A.P. São Francisco (Solonópole), Imaculada
Conceição (Dep. Irapuan Pinheiro), N. Sra. do Patrocínio (Aiuaba), A.M. São João Batista (Saboeiro,
página em branco) e a capela do seminário.

A ficha marca explicitamente as comunidades **sem templo** ("Sem Igreja", "Em Construção",
"Missa nas casas", "Desativada por falta de moradores"); o rótulo foi preservado no nome da
comunidade, para não afirmar que existe igreja onde a própria diocese diz que não há.

## Horários

Nenhuma fonte oficial. As 76 grades vêm das 14 fichas do **Lírio Católico** com horário nos
municípios da diocese, mais a capela do seminário. Todas ficam em **`baixa`**, pela regra do README:
o `ultima_atualizacao` do agregador (2026-09-02) é a data de regeneração da base, idêntica nas 757
fichas do Ceará, e não há segunda fonte independente e atual para corroborar.

Com horário: Catedral de São José e Senhora Sant'Ana (Iguatu), N. Sra. do Perpétuo Socorro
(Acopiara), N. Sra. do Patrocínio (Aiuaba), N. Sra. da Paz (Arneiroz), N. Sra. Auxiliadora (Cariús),
São João Batista (Cedro), Imaculada Conceição (Dep. Irapuan Pinheiro), N. Sra. do Carmo (Jucás),
N. Sra. da Glória e N. Sra. do Perpétuo Socorro (Mombaça), Sagrado Coração de Jesus (Piquet
Carneiro), N. Sra. das Dores (Senador Pompeu), Bom Jesus Aparecido (Solonópole) e a capela do
seminário. **As outras 26 unidades entram sem nenhum horário.**

Um horário tem `dayOfWeek: null`: o terço do **dia 13 de cada mês**, às 12h, em N. Sra. da Glória
(Mombaça) — data fixa do mês, com a regra literal em `notes`.

## Fora do JSON

- **Santuário do Senhor do Bonfim** (R. Des. José Bastos, 24 – Tamarinas, Icó) — aparece no Lírio
  Católico **sem nenhum horário** e não é citado por nenhuma ficha da diocese. Sem missa publicada e
  sem vínculo confirmado com paróquia, ficou fora, conforme a regra do dataset.
- **Igreja Católica Ortodoxa Paróquia Nossa Senhora dos Milagres** (Sítio Canafistula, Iguatu) —
  única entrada do Mapa das OSC no município; não é da jurisdição latina.
- Três capelas de Arneiroz que o Lírio lista isoladamente (Capela de N. Sra. Sant'Ana/Planalto,
  Capela de Santo Antônio, Igreja de N. Sra. do Carmo/Cachoeira de Fora) **não** viraram entrada
  própria: as três já constam como comunidades da Paróquia N. Sra. da Paz na ficha oficial. Boa
  corroboração da lista de comunidades, mas nenhuma traz horário.

## Precisa de validação humana

1. **E-mail trocado em Milhã** — a ficha da Paróquia Imaculada Conceição (Milhã) publica
   `imaculadairapuan@gmail.com`, que aparenta ser da paróquia de **Deputado Irapuan Pinheiro**
   (cuja ficha publica `paroquiairapuanpinheiro@gmail.com`). Gravado como está na fonte, com nota.
2. **E-mails malformados na fonte**: `p.expectacao@hotmal.com` (N. Sra. da Expectação, Icó — falta o
   "i" de hotmail) e `paroquiademombaça@hotmail.com` (N. Sra. da Glória, Mombaça — acento no
   domínio). Gravados como publicados.
3. **Endereço divergente em Arneiroz** — o site diz "Rua Manoel Araújo Chavez, 90 – Centro"; o Lírio
   Católico diz "R. Leonardo Feitosa, 60 – Centro". Prevaleceu o do site.
4. **Ano de criação ilegível** — a ficha de Dep. Irapuan Pinheiro traz só "(05)". Gravado `null`.
   Também sem ano: Santo Expedito (Iguatu), as 3 quase-paróquias, São Pedro Apóstolo (Jucás),
   São Raimundo Nonato e N. Sra. do Perpétuo Socorro (Pedra Branca) e as 6 áreas.
5. **Grafia do distrito** — a ficha de Pedra Branca escreve "Minerolândia"; o distrito é
   **Mineirolândia**. Gravado o correto em `neighborhood`, com nota.
6. **Ficha congelada** — a quase-paróquia São Sebastião (Distrito de José de Alencar, Iguatu) está
   parada em **12/10/2017**: a lista de comunidades é uma linha corrida de 23 nomes sem padroeiro, e
   há "Lagoas" repetido duas vezes (gravado como "Comunidade Lagoas" e "Comunidade Lagoas (2)").
   O pároco foi reconferido na página do clero.
7. **CEP ausente em 4 unidades** (São Sebastião/José de Alencar, Imaculada Conceição/Guassussê,
   São Francisco de Assis/Acopiara, A.P. N. Sra. da Conceição/Trussu) e nas 3 unidades sem ficha
   preenchida — não são inválidos, simplesmente não são publicados.
8. **Sobreposição Flamengo** — a Capela São João Batista do Distrito de Flamengo aparece tanto como
   comunidade da Paróquia N. Sra. da Purificação (Saboeiro) quanto como sede da **Área Missionária
   São João Batista** (cuja página está em branco). Provável que a capela já tenha passado à área
   missionária; ficou nos dois lugares, com nota.
9. **Telefones de celular escritos com ponto** na fonte ("(88) 996.988.877", "(88) 999.298.321") —
   normalizados para `(88) 99698-8877` e `(88) 99929-8321`.
10. **76 horários `baixa`** — nenhum entra em produção. Se o Parish quiser horário em Iguatu, o
    caminho é o Instagram das paróquias (o Lírio publica 11 perfis: `perpetuosocorroacopiara`,
    `paroquiadeaiuaba`, `paroquiansadapaz`, `paroquiadecarius`, `paroquiaimaculadairapuan`,
    `paroquiadocarmojucas`, `paroquia_de_milha`, `paroquiansgloriambc`, `pascomoros`,
    `paroquiasaosebastiaopb`, `paroquiacoracaodejesuspiquet`, `paroquiabomjesuspiedosooficial`,
    `seminario.iguatu`) ou o site próprio da Paróquia N. Sra. das Dores
    (`paroquiadesenadorpompeu.com`), nenhum deles lido nesta rodada por orçamento.

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

- `address`: está `"Curia Diocesana, Rua Vicente Bezerra da Costa 479, Bairro Sao Sebastio"` —
  o bairro é **São Sebastião** (o registro está truncado).
- `foundedYear`: está **1961**; confere (erigida em 28/01/1961, desmembrada de Crato), sem correção.
- `email`: continua `null` — a cúria não publica e-mail próprio no site.
