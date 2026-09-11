# Arquidiocese de São Luís do Maranhão (MA) — relatório de pesquisa

- **Arquivo**: `paroquias/MA/sao-luis-do-maranhao.json`
- **Data da coleta**: 2026-09-11
- **Cobertura**: **57 / 57 paróquias (100%)** + 2 quase-paróquias + 4 fichas não paroquiais = 63 entradas
- **Comunidades**: **842** (63 matrizes + 779 capelas), 750 com endereço e 740 com localidade/bairro
- **Horários fixos**: **678** — 620 `media`, 58 `baixa`; 608 MASS, 66 CONFESSION, 4 ADORATION

## Fontes principais

| Fonte | Uso |
|---|---|
| `https://arquislz.org.br/foranias/` | Índice completo: 11 foranias, 63 fichas, com o id de cada uma |
| `https://arquislz.org.br/paroquia?paroquiaid=<N>` (63 páginas) | Bairro, cidade, endereço, telefone, e-mail, Instagram, expediente, **grade de missas em prosa**, governo paroquial, diáconos e a lista de capelas |
| `https://arquislz.org.br/capela?capelaid=<N>` (**779 páginas**) | Nome, paróquia-mãe, localidade, endereço e, em 141 delas, a **missa fixa da capela** |
| `https://www.catholic-hierarchy.org/diocese/dsldm.html` | Nº esperado: **57** (Anuário Pontifício 2024, dados de 2023) |

## Como a lista fechou em 57

A arquidiocese roda um sistema "Cúria Online" dentro do WordPress: **as paróquias não são posts**,
não aparecem em `/wp-json/wp/v2/types` nem no `wp-sitemap.xml` (que só lista posts, páginas e
templates Elementor). Tudo vive em duas páginas-modelo com query string — `/paroquia?paroquiaid=N`
e `/capela?capelaid=N` — e o único índice é a página `/foranias/`.

As 63 fichas se decompõem assim:

| Tipo | Nº | Tratamento |
|---|---|---|
| Paróquias plenas | **57** | entram normalmente |
| Quase-paróquias (N. Sra. da Conceição em Primeira Cruz, São João Paulo II em São José de Ribamar) | 2 | entram com o prefixo "Quase-paróquia" |
| Igrejas não paroquiais (N. Sra. do Carmo, Santo Antônio do Centro, Menino Jesus de Praga) | 3 | `status: "nao-paroquial"` + `loadAsParish: true` — todas publicam missa |
| "Comunidade Paroquial São Roque" | 1 | idem |

As 57 batem **exatamente** com o Anuário Pontifício 2024. Varri os ids fora da lista (13, 46, 47,
66 e 68–75): todos devolvem a mesma página vazia de 168.953 bytes do modelo, ou seja, não existe
ficha além das 63.

## O achado da coleta: as fichas de capela

A página da paróquia lista as capelas só pelo nome — e nomes se repetem muito (Icatu tem 6 "Santo
Antônio", Santa Rita tem 5 "Nossa Senhora da Conceição"). Cada capela, porém, tem **ficha própria**
em `/capela?capelaid=N`, com localidade, endereço e horário. Baixando as 779, o dataset ganhou:

- **750 endereços** e **740 localidades** de comunidade — o que permite distinguir as homônimas
  ("São Sebastião — Moinho", "São Sebastião — Itapera");
- **181 horários de missa em capela**, que a ficha da paróquia não mostra. É exatamente o caso das
  comunidades rurais e ribeirinhas: a missa da capela tem dia e hora próprios.

As maiores: **Icatu** (70 comunidades), **Morros do Munim** (60), **São José do Periá / Humberto de
Campos** (54), **Santa Rita** (42).

## Os horários da matriz vêm em prosa

A ficha da paróquia traz a grade como texto corrido ("Quarta a sábado, às 17h30.", "Domingo, às 10h
e 17h30.", "Terça a sábado das 15 às 17h."). Escrevi um parser em português que resolve:

- intervalos de dias ("Terça a sábado" → 2..6) e listas ("Terça, quarta e sexta");
- vários horários por linha ("às 7h, 7h30 e 17h15");
- **intervalos de hora**, que só geram o horário de início e registram o texto literal em `notes`
  ("das 15 às 17h" → 15:00 + nota). Sem isso o dataset inventaria uma missa às 17h;
- seções por rótulo (`Missa Votiva`, `Batizados`, `Confissões`, `Adoração`, `Expressões Eclesiais`),
  com `Batizados`/`Casamentos`/`Catequese` ignorados e `Expressões Eclesiais` encerrando a leitura;
- orações grudadas por ponto final ("11:50.Quinta feira: das 9H às 11:50.").

**Cotejei as 678 grades linha a linha contra o texto da fonte antes de gravar** (o `src` de cada
horário ficou no arquivo de trabalho). Uma única linha não foi parseada, e corretamente: *"Feriados
Santos às 8h."*, da Paróquia São José e São Pantaleão — não tem dia da semana.

## Por que `media` e não `alta`

O site é atual (notícias de 2026, página "Calendário 2026" atualizada em 22/01/2026), mas as fichas
de paróquia e capela não carregam data de atualização própria, e as imagens de capela são de
2024/2025. Fonte oficial sem sinal explícito de atualidade nos últimos 12 meses → `media` pela
escala do README. Os dados cadastrais das paróquias ficaram `alta`.

## Os 58 horários `baixa`

Todos são **recorrência que não cabe em `MassSchedule`**, com a regra literal em `notes`:

- **"Todo dia 13, às 12h"** (N. Sra. de Fátima) é quase universal na arquidiocese; também aparecem
  dia 7, 8, 14, 16, 18 e 29. `dayOfWeek: null` — o importador descarta entrada fora de 0–6, então
  não há risco de carga errada.
- **"1ª sexta, às 15h"**, "3º e 4º sábado", "Último domingo do mês" → `dayOfWeek` recebe o dia da
  semana e a frase inteira vai para `notes`.

## Precisa de validação humana

1. **A Catedral não está identificada como tal.** A sé metropolitana é a igreja de Nossa Senhora da
   Vitória (Catedral da Sé), mas a ficha oficial a chama de "Paróquia Nossa Senhora da Vitória" —
   o e-mail (`catedraldavitoriaslz2@outlook.com`) e o Instagram (`@catedraldase.slz`) confirmam.
   Mantive o nome da fonte; o `slug` é `nossa-senhora-da-vitoria-sao-luis`.
2. **"Santa Clara de Assis" (id 32) vem sem prefixo** no índice. O e-mail
   (`paroquiasantaclaraslz@gmail.com`) e o Instagram (`@paroquiasantaclara.slz`) dizem que é
   paróquia, então gravei **"Paróquia Santa Clara de Assis"**. É a única entrada em que alterei o
   nome publicado.
3. **16 capelas são fichas repetidas na própria fonte** — mesmo nome *e* mesmo endereço, com dois
   `capelaid`. Ficaram com `status: "duplicada"` (não carregam) e o id no nome. 14 delas são de
   Icatu (ids 561, 595–607 duplicando 138 e 181–197), 1 de Humberto de Campos (419≡418) e 1 de
   Santo Amaro (856≡270).
4. **"São Pedro - Comunidade Matriz" (Icatu)** é capela, mas o nome contém "Matriz" e bate com o
   `isMatrizName` do importador. A matriz de verdade vem antes na lista, então a carga não erra —
   mas o nome merece revisão: a paróquia é Nossa Senhora da Conceição e a matriz declarada é
   São Pedro.
5. **18 paróquias sem endereço** na fonte (o campo vem vazio), quase todas do interior: Axixá,
   Bacabeira, Cachoeira Grande, Icatu, Morros, Presidente Juscelino, Primeira Cruz, Raposa,
   Rosário, Santa Rita, Santo Amaro, 2 de Paço do Lumiar, 2 de São José de Ribamar e 3 de São Luís.
   **25 sem telefone.** Nenhuma ficha traz CEP — todas ficaram com `zipCode: null`.
6. **Quase-paróquia São João Paulo II (São José de Ribamar)** é a única das 63 sem nenhum horário —
   o bloco está vazio na fonte. Também não tem telefone, e-mail nem Instagram.
7. **`priestName` vem sem tratamento eclesiástico.** O site publica "Governo Paroquial" com o nome
   civil do padre ("Roney Rocha Carvalho"), sem "Pe.". Gravei como está. Onde há mais de um nome,
   peguei o primeiro do cartão — **não há como saber pela ficha quem é pároco e quem é vigário**.
8. **Duas paróquias "Nossa Senhora de Fátima" em São Luís** (Bairro de Fátima, id 18; Vila Luizão,
   id 28) e duas "Sagrado Coração de Jesus" (Bequimão em São Luís, id 10; Moropóia em São José de
   Ribamar, id 37). Os slugs levam o bairro.
9. **"Paróquia Nossa Senhora da Boa Viagem" (Rio Grande, São Luís)** usa o e-mail da Paróquia São
   Cristóvão (`paroquiasaocristovao.secretaria@hotmail.com`). Provável desmembramento recente com
   secretaria compartilhada — ou erro de cadastro.
10. **Confissões com intervalo**: os 66 registros CONFESSION guardam só o horário de início, com o
    intervalo completo em `notes`. Se o Parish for exibir janela de confissão, precisa de modelagem.
11. As 4 entradas `nao-paroquial` entram com `loadAsParish: true` porque publicam missa — a Igreja
    do Carmo, com 32 horários, é uma das mais movimentadas do Centro Histórico. Confirmar se a
    arquidiocese as considera capelanias, reitorias ou igrejas conventuais.
