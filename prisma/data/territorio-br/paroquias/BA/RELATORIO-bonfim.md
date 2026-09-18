# Diocese de Bonfim — relatório de pesquisa

- **Slug**: `bonfim` · **UF**: BA · **Sede**: Senhor do Bonfim · **Província**: Feira de Santana · **Regional**: Nordeste 3
- **Pesquisa**: 18/09/2026
- **Bispo**: Dom Hernaldo Pinto Farias, S.S.S. (desde 17/07/2019)
- **Cúria**: Rua Cônego Hugo, 96, Centro · CEP 48970-000 · (74) 9 8846-3215 · curia@diocesedebonfim.org.br
- **Site oficial**: <https://diocesedebonfim.org.br> — **vivo, WordPress, atualizado em 2026**

## Resultado

| Métrica | Valor |
|---|---|
| Paróquias | **27** — todas `alta` |
| Foranias | 7, no campo `forania` (I Senhor do Bonfim 6 · II Senhora Santana 4 · III São Sebastião 3 · IV N. Sra. do Perpétuo Socorro 3 · V São José Operário 5 · VI Santa Cruz 3 · VII Sagrado Coração de Jesus 3) |
| Comunidades | 30 = 27 matrizes (`alta`) + 3 capelas (`baixa`, vindas do Lírio Católico) |
| Horários fixos | **26** (24 MASS · 1 CONFESSION · 1 ADORATION) — **todos `baixa`** |
| Paróquias com algum horário | 6 de 27 |
| Horários carregáveis (`alta`/`media`) | **0** |

**Cobertura: 27 de 27.**

## Fontes principais

1. **`diocesedebonfim.org.br/paroquias/`** — índice oficial com 27 links `/paroquia?paroquiaid=1..27`,
   agrupados nas 7 foranias. É a espinha dorsal da lista.
2. **Fichas `/paroquia?paroquiaid=N`** — o CMS ("Cúria Online do Brasil") tem campos para forania,
   fundação, endereço, bairro, cidade, padroeiro, telefone, WhatsApp, Facebook, Instagram e padres,
   **mas só 3 das 27 fichas estão preenchidas** (Senhor do Bonfim, Santo Antônio de Jacobina e
   Senhor Bom Jesus de Pindobaçu). A ficha `id=11` (São Sebastião/Filadélfia) devolve página vazia.
3. **Receita Federal via `minhareceita.org`** — as paróquias são **filiais do CNPJ 13.833.801**.
   Varredura de `/0001` a `/0040`: **30 filiais ATIVAS**, nada de `/0031` em diante. Foi daqui que
   saiu endereço, bairro e CEP de 24 das 27 paróquias.
4. `diocesedebonfim.org.br/clero/` — 31 presbíteros incardinados residentes + 2 não incardinados +
   religiosos e diáconos (a página **não** diz quem é pároco de quê).
5. `catholic-hierarchy.org/diocese/dbonf.html` e `gcatholic.org/dioceses/diocese/bonf0.htm`.
6. `liriocatolico.com.br` — 8 fichas no território, 6 com grade.

## Prova de completude — três contagens que fecham

| Fonte | Total |
|---|---|
| Índice `/paroquias` do site oficial | 27 unidades em 7 foranias |
| Filiais ATIVAS do CNPJ 13.833.801 | 30 = sede + **27 paroquiais** + Instituto Superior de Teologia e Pastoral (`/0023`) + Seminário Diocesano Bom Pastor (`/0028`) |
| catholic-hierarchy (2022 e 2023) | 27 paróquias |

As três casam **uma a uma**, por município e por título. O instituto de teologia e o seminário não
são paróquias e ficaram fora do arquivo. O `gcatholic` registra "27 parishes, **1 mission**" — a
missão é, quase certamente, Nossa Senhora do Pilar (ver dúvidas).

## Horários — a diocese não publica nenhum

O site **não tem página de horários** e nenhuma das 27 fichas tem campo de missa. Os 26 horários
gravados vêm todos do **`liriocatolico.com.br`**, fonte única não oficial: pela regra do README
(agregador cuja data `2026-09-02` é de **carga da base**, não de conferência) ficam `baixa` e
**nenhum entra em produção**. As 6 paróquias com grade são:

| Paróquia | Cidade | Grade do Lírio |
|---|---|---|
| Catedral Senhor do Bonfim | Senhor do Bonfim | dom 07:00, 09:00, 19:00 |
| Paróquia Santo Antônio | Jacobina | dom 08:00 e 19:00 · sáb 19:00 · qui 19:00 |
| Paróquia São José Operário | Jacobina | dom 08:00, 10:00, 18:00 · sáb 18:00 · ter–sex 19:30 |
| Paróquia Sagrado Coração de Jesus | Monte Santo | dom 08:30 e 19:30 · ter/qua 06:30 · qui 19:30 (+ confissão e adoração qui 18:30) |
| Paróquia N. Sra. do Perpétuo Socorro | Umburanas | dom 09:00 e 19:30 |
| (capelas do centro de Jacobina) | Jacobina | N. Sra. da Conceição sáb 07:00 · Igreja da Missão qua 19:00 |

Sinal a favor da identificação (não da grade): o telefone da ficha do Lírio para Santo Antônio de
Jacobina, **(74) 99195-2867**, é exatamente o publicado pelo site da diocese.

O que **não** existe para esta diocese:
- `horariodemissa.com.br` — a busca por cidade é AJAX e não devolveu ficha nenhuma nas cidades do
  território; pela contagem do README (148 de 151 fichas da Bahia são de 2013–2018) não valeria `media`.
- `buscamissa.com.br` — não cobre o interior do norte baiano.
- Instagram — só dois perfis paroquiais estão linkados no site (`@pascom_de_bonfim_ba` e
  `@paroquiabomjesuspindobacu`); o leitor automático devolveu o shell do Instagram sem bio em
  `@pascom_de_bonfim_ba`, e nenhum dos dois publica grade na bio.

## Precisa de validação humana

1. **Nossa Senhora do Pilar (Jaguarari)** — o site diocesano chama de "Paróquia", a Receita
   (filial `/0029`, aberta em 11/04/2016) chama de **"QUASE PAROQUIA"** e o gcatholic conta
   "27 parishes, **1 mission**". Gravei como `Paróquia Nossa Senhora do Pilar` com nota; se for
   quase-paróquia, o nome muda.
2. **Paróquia São Cristóvão (Capim Grosso)** — a Receita ainda registra a filial no município de
   **Jacobina**, bairro Capim Grosso, porque a inscrição é de **1976**, anterior à emancipação de
   Capim Grosso (1985). Gravei `city: "Capim Grosso"` e **deixei o CEP nulo** (o 44700-000 da
   Receita é de Jacobina). O site diz que o território é "Capim Grosso e São José do Jacuípe".
3. **Paróquia N. Sra. da Saúde** — território "Saúde e Caldeirão Grande"; gravei a sede em Saúde.
4. **Duas igrejas do centro de Jacobina** (N. Sra. da Conceição, na Praça Sen. Filinto Müller, e
   Igreja da Missão, na Praça da Missão) entraram como capelas de **Santo Antônio de Jacobina**
   por localização. O vínculo é **inferido** e está marcado `baixa` com nota.
5. **Pároco por paróquia** — o site publica a lista do clero e a lista de paróquias, mas **não
   liga uma à outra**. Só 3 paróquias têm padre gravado (as 3 fichas preenchidas). A Catedral traz
   três padres sem dizer qual é o pároco: `priestName` ficou com o primeiro
   (Pe. Eduardo César Silva Oliveira) e os três estão em `priestNames`.
6. **Telefones** — só 3 (Catedral, Santo Antônio de Jacobina, Pindobaçu). Os telefones das filiais
   na Receita são antigos e quase todos malformados (`0745414681`, `000000000000`) — **não foram
   gravados**.

## Correção sugerida para `dioceses.json` (NÃO aplicada)

- `phone`: está `(74) 3541-3562`; o site oficial publica hoje **`(74) 9 8846-3215`** (WhatsApp da
  cúria, `https://wa.link/jra3a1`). O fixo pode ter caído — vale conferir antes de trocar.
- `address`: está `Rua Conego Hugo 96`; a grafia do site é **"Rua Cônego Hugo, 96 — Centro"**.
- Os demais campos (`website`, `email`, `zipCode`, `bishopName`, `foundedYear`) **conferem**.
