# Diocese de Limoeiro do Norte (CE) — relatório de pesquisa

Pesquisa em 11/09/2026. Arquivo gerado: `limoeiro-do-norte.json`.

## ⚠️ O domínio oficial não existe mais

`diocesedelimoeiro.org` (e `www.`) devolve **NXDOMAIN** — não é site fora do ar, é domínio expirado.
Testado por DNS-over-HTTPS (`dns.google/resolve`): `Status 3`, sem registro A. Também não há
`.com.br`, `.org.br` nem `diocesedelimoeirodonorte.org.br`. A única presença ativa da diocese é a
página de Facebook `facebook.com/diocesedelimoeiro`, que não é raspável.

O site era um **Wix mantido pela Pascom local**, e as capturas úteis do Arquivo da Internet são de
**2019** (as páginas dos 6 zonais, a Cúria e os Dados Gerais). É daí que vem quase tudo.

## Resultado

| | |
|---|---|
| Entradas | **27** — 26 paróquias + 1 área pastoral |
| Confiança das paróquias | **`media` em todas as 27** (fonte oficial sem sinal de atualidade) |
| Comunidades/capelas | 42 (27 matrizes + 15 capelas/igrejas/santuários) |
| Horários fixos | 67 — 64 MASS, 2 CONFESSION, 1 ADORATION |
| Horários `media` / `baixa` | **3 / 64** |
| Paróquias com horário | 27 de 27 (mas 26 delas **só com horário `baixa`**, que não carrega) |
| Endereço: 20 · telefone: 27 · e-mail: 22 · pároco: 22 | |
| Municípios cobertos | 21 |

## Fontes

1. **Capturas de 2019 do site oficial** (`web.archive.org/web/2019/https://www.diocesedelimoeiro.org/…`):
   - `copia-zonal-do-banabuiu`, `…-do-castanhao`, `…-do-figueiredo`, `…-da-praia`, `…-da-varzea`,
     `…-do-vale` — cada uma lista as paróquias do zonal com **pároco, telefone, e-mail e horário de
     missas**. É a fonte mais rica da diocese.
   - `curia` — endereço, telefone, e-mail e bispo; `dados-gerais` — territórios e o total
     “26 paróquias e uma área pastoral”.
2. **Wikipédia pt** (`Diocese_de_Limoeiro_do_Norte`) — lista as 27 entradas por zonal, **citando as
   mesmas páginas do site** (acesso 22/04/2019). Serve de corroboração e dá os distritos
   (Roldão/Uiraponga, Feiticeiro, Majorlândia, Flores, Limoeiro Alto).
3. **`horariodemissa.com.br`** — varredura das 20 cidades da diocese. Deu **endereço e telefone atuais**
   de 16 paróquias e **a única grade recente**: Paróquia N. Sra. do Rosário de **Aracati**, com nome de
   capela por missa.
4. `catholic-hierarchy.org/diocese/dlidn.html` — 27 paróquias + 1 missão (atualizado 03/08/2026);
   bispo Dom André Vital Félix da Silva, SCI, desde 2017.

## Cobertura

- **27 entradas encontradas × 27 paróquias + 1 missão esperadas.** Mas o recorte não bate: as minhas
  27 são **26 paróquias + 1 área pastoral** (número de 2019). O catholic-hierarchy conta 27 paróquias
  hoje — ou a **Área Pastoral Santa Cruz (Jaguaribe)** foi elevada a paróquia, ou existe **uma paróquia
  criada depois de 2019 que não consegui identificar**. Não há fonte para decidir.
- **Horários: 64 dos 67 são `baixa` e não carregam.** Motivo: a regra do README — “texto anterior a
  2020 é rebaixado para `baixa`; toda paróquia reorganizou missa depois da pandemia”. As grades dos
  zonais são de 2019. Entram em produção **3 horários** (a Paróquia N. Sra. do Rosário de Aracati:
  domingo 7h na Igreja do Rosário, domingo 19h na Matriz e sábado 19h na Igreja dos Prazeres), porque
  o agregador atual confirma exatamente esses três.
- **Morada Nova é território partilhado**: o distrito de **Aruaru** pertence à **Arquidiocese de
  Fortaleza** (a Paróquia São João Batista de Aruaru está no `fortaleza.json`), e o resto do município
  a Limoeiro do Norte. Os Dados Gerais da diocese dizem “Morada Nova (parcial)”. Não há duplicata
  entre os dois arquivos.

## Comunidades

As páginas dos zonais nomeiam o lugar de cada missa, e foi daí que saíram as 15 comunidades:

- **Aracati / N. Sra. do Rosário** — 6: Igreja de N. Sra. do Rosário, Igreja de N. Sra. dos Prazeres,
  Igreja de Nosso Senhor do Bonfim, Capela da Medalha Milagrosa, Capela do Colégio Salesianas,
  Capela do Colégio Marista (as três últimas só no agregador).
- **Área Pastoral Santa Cruz / Jaguaribe** — 3: N. Sra. da Conceição, N. Sra. Aparecida, Santa Paulina.
- **Riacho Santa Rosa / Morada Nova** — 2: Roldão e Uiraponga (a paróquia não tem sede única).
- **Catedral / Limoeiro do Norte** — Santuário de Nossa Senhora de Fátima (missa de domingo às 6h).
- **N. Sra. das Brotas / Tabuleiro do Norte** — “Santuário” (domingo 16h30), sem nome publicado.
- **Santa Terezinha / Feiticeiro** — Nova Floresta. **N. Sra. dos Remédios / Ibicuitinga** — Açude dos
  Pinheiros.

## Precisa de validação humana — **é a diocese com o dado mais velho das quatro**

1. **Domínio morto.** Descobrir se a diocese tem novo site (ou se só usa Facebook/Instagram) e refazer
   a coleta. Enquanto isso, **nenhum dado desta diocese tem menos de 7 anos**, exceto endereços e
   telefones do agregador.
2. **A paróquia que falta.** catholic-hierarchy conta 27 paróquias; tenho 26 + 1 área pastoral.
   Identificar a criada depois de 2019 (ou confirmar a elevação da Área Pastoral Santa Cruz).
3. **64 horários `baixa` que não carregam.** Se o Parish precisar de missa nesta diocese, o caminho é
   ligar para as 27 paróquias — todas com telefone no dataset — ou raspar os Facebooks paroquiais.
4. **Párocos de 2019.** Os 22 nomes gravados são do quadro de 2019; em 7 anos a maioria mudou. O
   `priestName` desta diocese deve ser tratado como **suspeito por padrão**.
5. **Telefone divergente**: N. Sra. dos Remédios (Ibicuitinga) aparece como `(88) 3425-1125` no site da
   diocese e `(88) 3422-1486` no agregador; Santa Rosa de Lima (Jaguaribara) como `(88) 3568-0286` e
   `(88) 3711-0198`; Santos Cosme e Damião (Pereiro) como `(88) 3527-1114` e `(88) 3771-0188`.
   Gravei o número do site da diocese; o do agregador está no relatório.
6. **`foundedYear` e `zipCode` vazios em todas as 27** — nunca foram publicados.
7. **“Paróquia Riacho Santa Rosa”** é o nome oficial na fonte (é uma paróquia de território rural, com
   celebrações em Roldão e Uiraponga, sem invocação de padroeiro no nome). Confirmar se o nome canônico
   tem padroeiro.
8. **Iracema**: a página do zonal grava domingo às **18h e 19h** — duas missas com 1h de intervalo é
   plausível, mas pode ser erro de digitação da Pascom. Conferir.
