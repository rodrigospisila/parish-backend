# Relatório — Eparquia de Nossa Senhora do Líbano em São Paulo dos Maronitas

Pesquisa em 2026-09-10. Arquivo: `paroquias/SP/maronita-nossa-senhora-do-libano-sao-paulo.json`.

## Natureza da circunscrição

Eparquia **de âmbito nacional** da Igreja Maronita (rito siríaco-antioqueno), erigida em
29/11/1971 pela constituição apostólica *Quod providente*, de Paulo VI, com jurisdição sobre todo o
território brasileiro. O arquivo está na pasta `SP` porque a Cúria e a Catedral ficam em São Paulo,
mas o campo `state` de cada paróquia é a **UF onde ela fica**: SP (7), MG (1), RS (1), RJ (1) e
DF (1).

- Sede: Cúria Eparquial, Rua Tamandaré, 355 — Liberdade, São Paulo/SP, 01525-001, (11) 3208-2904,
  fax (11) 3208-6536.
- Bispo eparquial: **Dom Edgar Amine Madi** (desde 14/10/2006).

## O site oficial saiu do ar — como a lista foi obtida

`igrejamaronita.org.br` **não resolve mais**: em 10/09/2026 o domínio tem *delegação de DNS
quebrada* (os servidores `ns1`/`ns2.pleskw0004.inetweb.com.br` respondem `REFUSED`). A captura do
Arquivo da Internet de **26/11/2025** já mostra a página de "site em construção" da hospedagem
(Inetweb). A última captura **com conteúdo** é de **02/10/2025**, e foi dela que veio o menu
"Paróquias Maronitas no Brasil" com as 11 paróquias e as páginas individuais de cada uma
(endereço, telefone, e-mail, pároco, histórico e horários). O rodapé do site diz "Eparquia Maronita
do Brasil - 2012-2024".

Por isso `diocese.website` ficou `null` — não faz sentido publicar um domínio morto — e nenhuma
informação vinda só do site próprio recebeu confiança `alta` em horários.

Detalhe técnico: as páginas de conteúdo do site usavam IDs em base64 no *query string*
(`/conteudos/?eFh4fDExMA==` = `xXx|110`); os IDs foram gerados programaticamente para varrer todas
as páginas de paróquia.

## Fontes principais e sua atualidade

| Fonte | Data da fonte | Uso |
|---|---|---|
| Site oficial da Eparquia, via Arquivo da Internet | captura de **02/10/2025** (conteúdo de 2012-2024) | lista das 11 paróquias, endereços, párocos, histórico |
| `gcatholic.org/churches/local/noss0-n` | atualizado em **01/01/2026** | 11 igrejas — confere com a lista da Eparquia |
| `catholic-hierarchy.org/diocese/dsama.html` | estatísticas de **2023** | 12 paróquias, 528.000 católicos, 14 sacerdotes |
| Diocese de **Mogi das Cruzes** (ficha oficial) | consultada em 10/09/2026 | endereço, datas, pároco e horários |
| Arquidiocese de **Campinas** (ficha oficial) | consultada em 10/09/2026 | endereço, pároco e horários |
| Diocese de **Guarulhos** (ficha oficial) | consultada em 10/09/2026 | endereço, pároco e horários |
| Diocese de **Bauru** (ficha oficial) | consultada em 10/09/2026 | endereço, pároco e horários |
| Arquidiocese de **Porto Alegre**, via Arquivo da Internet | site em HTTP 500 em 10/09/2026 | endereço, e-mail, pároco, vigário e horários |
| Arquidiocese de **BH** — Catálogo 2026 (PDF) | **jan/2026** | paróquia pessoal 7.13 B, código 238 |
| `missadiariabh.com/listacompletademissas` | site atualizado em **27/08/2026** | horários atuais em BH |
| `horariodemissa.com.br` | por igreja: SP **29/12/2012**, BH **05/05/2013**, RJ **10/05/2025** | horários |
| `horariosmissa.com.br` | consultado em 10/09/2026; Brasília com "última atualização 22/08/2026" | horários |
| Canção Nova — inauguração em Brasília | **09/09/2019** | ano de fundação |
| Diário de Suzano | histórico | mudança Suzano → Mogi das Cruzes |

## Cobertura

- **11 paróquias** — 9 `alta`, 2 `media` (Piracicaba e São José do Rio Preto).
- **12 comunidades** (11 matrizes + a Comunidade São Martinho de Lima, em Campinas).
- **66 horários fixos**: 22 `alta`, 24 `media`, 20 `baixa`.

**Cobertura 11 de 12 esperadas.** A lista do site oficial e a de gcatholic.org batem exatamente
(11), com uma só diferença de rótulo (ver abaixo); catholic-hierarchy registra **12 paróquias** nas
estatísticas de 2023 e **nenhuma fonte diz qual seria a décima segunda**.

### As paróquias

| # | Paróquia | Cidade/UF | Conf. | Horários |
|---|---|---|---|---|
| 1 | Catedral Nossa Senhora do Líbano | São Paulo/SP | alta | 15 |
| 2 | Paróquia Nossa Senhora do Líbano | Bauru/SP | alta | 2 |
| 3 | Paróquia Nossa Senhora do Líbano | Belo Horizonte/MG | alta | 9 |
| 4 | Paróquia Nossa Senhora do Líbano | Piracicaba/SP | media | 0 |
| 5 | Paróquia Nossa Senhora do Líbano | Porto Alegre/RS | alta | 7 |
| 6 | Paróquia Nossa Senhora do Líbano | São José do Rio Preto/SP | media | 0 |
| 7 | Paróquia Nossa Senhora do Líbano | Rio de Janeiro/RJ | alta | 10 |
| 8 | Paróquia São Charbel | Brasília/DF | alta | 6 |
| 9 | Paróquia São Charbel | Campinas/SP | alta | 6 |
| 10 | Paróquia São Charbel | Guarulhos/SP | alta | 5 |
| 11 | Paróquia São Charbel e São Frei Galvão | Mogi das Cruzes/SP | alta | 6 |

## Achados que mudam o dado anterior

**1. Suzano ≠ nova paróquia — é Mogi das Cruzes.** O menu da Eparquia listava "Paróquia São Charbel
em Suzano", e o conteúdo da página descrevia a *Paróquia São Sebastião*, na Praça João Pessoa, 158,
Centro, Suzano/SP, com o Pe. Carmine Mosca. É a **mesma paróquia** hoje registrada em Mogi das
Cruzes: criada em 29/09/2015, instalada em 12/02/2016, ela nasceu usando a igreja emprestada em
Suzano e depois ergueu templo próprio em Jundiapeba (Av. Guilherme Georges, 1026). gcatholic
(01/01/2026) já a registra em Mogi das Cruzes, e a Diocese de Mogi publica a ficha completa com
Pe. Elias Karam. **Não são duas paróquias.**

**2. Brasília mudou de endereço.** A Eparquia registrava a Igreja São Pedro de Alcântara, SHIS QI 7
Conj. 15, Lago Sul (espaço emprestado). Hoje a paróquia tem templo próprio no **Setor Noroeste**,
EQNW 704/705, Lote A, CEP 70684-685. O site da paróquia (`paroquiasaocharbel.com`) também saiu do
ar (NXDOMAIN, sem captura de conteúdo no Arquivo da Internet). Ela **não consta** da lista de
paróquias da Arquidiocese latina de Brasília, por ser paróquia pessoal de rito maronita.

**3. Quatro paróquias não têm templo próprio** e celebram em igrejas cedidas pelas dioceses latinas:

- **Bauru** — Capela da Imaculada Conceição, da Santa Casa de Misericórdia (antes, Matriz de Santa
  Terezinha e Catedral do Divino Espírito Santo).
- **Belo Horizonte** — Capela do Colégio Santa Maria, em comodato desde 1993.
- **Piracicaba** — Catedral Santo Antônio (Praça da Catedral, s/nº).
- **São José do Rio Preto** — Igreja Matriz São Benedito. O pároco, Pe. Benedito Mazeti, é
  **biritualista** (autorizado pela Santa Sé a celebrar nos ritos latino e maronita).

**4. Belo Horizonte parece ter perdido as missas de semana.** A Eparquia (2025) e
horariodemissa.com.br (2013) registram, ambos, "Segunda à Sexta 19h, Sábado 18h, Domingo 10h e 19h".
A lista de BH atualizada em **27/08/2026** registra a Capela Nossa Senhora do Líbano (Floresta)
**apenas no bloco de domingo**, às 08h ("Rito Romano Antigo") e 10h ("Rito Maronita"). Só o domingo
10h é confirmado pelas três fontes (`media`); todo o resto ficou `baixa`.

## Horários — resumo por confiança

- **`alta` (22)** — Porto Alegre (7), Campinas (5 missas), Mogi das Cruzes (6), Bauru (2),
  Guarulhos (2). Todos publicados por site oficial de diocese/arquidiocese em 2026 e, na maioria
  dos casos, idênticos ao que a Eparquia publicava.
- **`media` (24)** — Catedral de São Paulo (9), Rio de Janeiro (10), Belo Horizonte (1) e a
  adoração de sábado em Campinas (1). São horários em que **dois agregadores idôneos concordam**,
  ou em que agregador e página oficial (sem atualidade) coincidem.
- **`baixa` (20)** — três motivos:
  1. **Fontes contraditórias** — Brasília inteira (6): horariosmissa.com.br (22/08/2026) diz terça
     e sexta 19h, sábado 18h30, domingo 09h30/11h15/18h30; a descrição indexada do site da própria
     paróquia (hoje fora do ar) dizia segunda/terça/quarta/sexta 8h e 19h, quinta 12h15 (Hospital de
     Apoio) e 19h, sábado 8h e 19h, domingo 9h/11h/19h. Foi registrado o quadro do agregador, mais
     recente, e o outro está descrito em `notes`. Belo Horizonte (8) e São Paulo (3), pelo conflito
     descrito acima. Guarulhos, missa e adoração de sexta às 15h (2), que só a Eparquia registra.
  2. **Recorrência mensal**, que não cabe no `MassSchedule` (só dia da semana) — **1 caso**:
     Guarulhos, *"Terceiro Domingo do mês às 17:00h"*. A regra literal está em `notes`.
  3. **Fonte única não oficial** — BH domingo 08h ("Rito Romano Antigo"), só em missadiariabh.com.

## Divergências de cadastro registradas em `notes`

| Paróquia | Campo | Eparquia (2025) | Fonte adotada (2026) |
|---|---|---|---|
| Bauru | endereço/telefone | Rua Gustavo Maciel, 13-17, 17015-321, (14) 3222-3166 | Diocese de Bauru: Rua Monsenhor Claro, 6-88, 17015-130, (14) 3227-6711 |
| Campinas | CEP | 13093-240 | Arquidiocese de Campinas: 13091-140 |
| Campinas | missa de domingo | 11h (catequese 10h50) | Arquidiocese: 10h30 |
| Guarulhos | CEP/telefone/e-mail | 07951-090, (11) 2440-7374, antonioboscod@yahoo.com.br | Diocese: 07051-090, (11) 2688-0136 |
| Belo Horizonte | CEP | 30015-030 | mantido o da Eparquia (Catálogo BH diz 31110-010) |
| Rio de Janeiro | CEP/telefone | 20520-055, (21) 98059-2837 | mantido; horariosmissa diz 20520-053 e (21) 2208-4846 |
| São Paulo | pároco | Pe. Charbel Khoury Hanna | mantido (horariodemissa, de 2012, diz "Padre Elias Karam", que hoje é o pároco de Mogi) |

## Precisa de validação humana

1. **A 12ª paróquia.** catholic-hierarchy conta 12 em 2023; a Eparquia e gcatholic listam 11. Falta
   descobrir qual é (ou se o número de 2023 está desatualizado).
2. **Brasília — horários.** Duas fontes se contradizem por completo. Confirmar com a paróquia.
   Também falta CEP/telefone confirmados por fonte eclesiástica: o (61) 2194-8088 vem só do
   agregador.
3. **Belo Horizonte — ainda há missa de semana?** Confirmar com a paróquia se o quadro
   "segunda a sexta 19h, sábado 18h" continua valendo ou se hoje só há missa aos domingos.
4. **Catedral de São Paulo — horários de semana.** Os dois agregadores concordam em quase tudo, mas
   o mais completo é de 2012. Vale conferir diretamente (Facebook/Instagram @catedralnslibano).
   Também confirmar o pároco atual.
5. **Piracicaba e São José do Rio Preto** — nenhum horário de missa em rito maronita publicado em
   lugar nenhum. As duas paróquias entraram sem horários e com confiança `media`. Confirmar se
   ainda funcionam e em que horários usam as igrejas latinas cedidas.
6. **CEP de São José do Rio Preto** — a única fonte traz "cep1503-110", malformado; ficou `null`.
7. **WhatsApp de Guarulhos** — a Diocese publica "11 9995-7123", que tem um dígito a menos que o
   padrão de celular; validar.
8. **Duplicidade com dioceses latinas.** As mesmas paróquias já constam, marcadas
   `"status": "outra-jurisdicao"`, em `paroquias/SP/bauru.json`, `campinas.json`, `guarulhos.json`,
   `mogi-das-cruzes.json`, `piracicaba.json` e `paroquias/MG/belo-horizonte.json`,
   `paroquias/RS/porto-alegre.json`. Na carga, a versão canônica é a deste arquivo.
9. **Slug da Catedral.** Ficou `nossa-senhora-do-libano-sao-paulo-maronita` (com sufixo) porque já
   existe no dataset uma paróquia **latina** homônima em São Paulo — Paróquia Nossa Senhora do
   Líbano, Jardim Líbano, Região Lapa (`paroquias/SP/sao-paulo.json`), sem relação com esta.
