# Relatório — Diocese de Cametá (PA)

Pesquisa: 18/09/2026. Arquivo: `cameta.json`.

## Resultado

| | |
|---|---|
| Entradas | **22** — 21 paróquias + 1 Catedral (todas paróquias plenas) |
| Confiança das entradas | 22 `alta` |
| Comunidades | **749**, todas `alta` |
| Horários fixos | **108** — 105 `alta` (78 missas + 27 confissões) e 3 `baixa` (missas de recorrência mensal) |
| Cobertura | 22/22 |

## Fonte principal: o Anuário e Calendário Diocesano 2025 (PDF)

`https://diocesecameta.com.br/wp-content/uploads/2025/01/ANUARIO-DIOCESANA-ANO-2025-FINAL.pdf` — **PDF oficial
de 81 páginas e 21 MB**, publicado em janeiro de 2025 e linkado na página `/anuario/` de um site ativo
(notícias de agosto de 2026). É a melhor fonte desta rodada e traz, unidade por unidade:

- data de criação e festa do padroeiro;
- **CNPJ da filial**;
- endereço, CEP e cidade;
- telefone/WhatsApp e e-mail;
- **"Dias/Horários de Missas na Matriz"** e **"Dia/Horário de Confissão"** — a grade oficial;
- pároco, vigários e diáconos permanentes, com horários de atendimento da secretaria;
- **"PADROEIROS DAS COMUNIDADES CRISTÃS / BAIRRO OU LOCALIDADE"**: a lista numerada de TODAS as comunidades,
  cada uma com o bairro, a vila, o rio ou o quilômetro em que fica — foi daí que saíram as 749 comunidades.

A página `/paroquias/` do site **não lista nada** (carrega vazia); o portal não tem REST com tipo próprio.
O Anuário resolveu a diocese inteira.

As campeãs em comunidades: Nossa Senhora Imaculada Conceição (Mocajuba) com 62, Cristo Rei (Pacajá) com 58,
Santo Antônio de Pádua (Baião) com 57, Nossa Senhora da Assunção (Oeiras do Pará) com 56 e São José das Ilhas
(Cametá) com 51.

Outras fontes: `/curia/` e `/anuario/`, `catholic-hierarchy.org` (20 paróquias em 2023), `gcatholic.org`
(30 igrejas, 20 marcadas como paróquia), o **Mapa das OSC/IPEA** (achou o CNPJ raiz) e a **Receita Federal**.

## A Receita revelou DUAS paróquias novas

CNPJ raiz **09.356.949**. Varri as ordens 0001–0032: existem **exatamente 23 estabelecimentos**, a Mitra
Diocesana (0001) e **22 filiais, todas ATIVAS** — nenhuma suspensa, nenhuma baixada, nenhuma filial-fóssil.
Todas as 22 são "PAROQUIA …". Isso significa:

- **Paróquia São Benedito, Cametá** (filial **0022**, ativa desde **08/07/2025**) — o Anuário 2025, fechado em
  janeiro, ainda a publica como **"Área Pastoral São Benedito"**, criada em 28/12/2024. A Receita já a
  registra como PARÓQUIA.
- **Paróquia Nossa Senhora do Pilar, Vila de Curuçambaba, Cametá** (filial **0023**, ativa desde
  **08/07/2025**) — o Anuário a publica como **"Área Pastoral Nossa Senhora do Pilar"**, criada em 02/01/2025.

Nem o gcatholic (atualizado em 01/01/2026) nem o catholic-hierarchy as registram. Entraram como **paróquia**,
`alta`, com a história completa em `notes`. Contando-as, a diocese tem **22 paróquias**, não 20.

O Anuário ainda anuncia um terceiro desmembramento: na Paróquia Cristo Rei (Pacajá), a comunidade **São Pedro
e São Paulo, da Vila Bom Jardim**, vem marcada como **"(nova paróquia)"**. Ainda não tem filial na Receita e
por isso ficou como comunidade.

## Pacajá é de Cametá; Rondon do Pará não é

A pista dizia que o agregador tinha paróquias em Pacajá e Rondon do Pará que ninguém reivindicava.

- **Pacajá é de Cametá**, confirmado três vezes: o Anuário abre com "A Diocese de Cametá compreende os
  Municípios de: Cametá, Oeiras do Pará, Limoeiro do Ajuru, Baião, Mocajuba, Igarapé-Miri, Tucuruí, Breu
  Branco, Novo Repartimento e **Pacajá**"; a **Paróquia Cristo Rei** tem ficha completa no Anuário (Av.
  Marechal Castelo Branco 89, Centro, Pacajá, CEP 68485-000) e é a filial **0020** do CNPJ da Mitra, com
  município PACAJA na Receita.
- **Rondon do Pará NÃO é de Cametá**: não está entre os 10 municípios, não tem filial no CNPJ e não aparece no
  gcatholic. A **Diocese de Bragança do Pará** publica a Paróquia Nossa Senhora Aparecida de Rondon do Pará em
  `novo.diocesedebragancapa.org.br/index.php/paroquias/79-nossa-senhora-aparecida2`.

## Horários: a melhor cobertura das quatro circunscrições

**21 das 22 paróquias publicam a grade da matriz** no Anuário — 81 missas e 27 horários de confissão, todos
`alta`, fonte oficial de janeiro de 2025 em site ativo.

A única sem horário é a **Paróquia São José das Ilhas (Cametá)**, paróquia inteiramente ribeirinha, cuja ficha
no Anuário simplesmente não tem a linha "Dias/Horários de Missas na Matriz" — só o atendimento do padre na
secretaria.

Três horários ficaram `baixa` por **recorrência mensal**, com a regra literal em `notes`:

| Paróquia | Regra publicada | Como ficou |
|---|---|---|
| Senhora Sant'Ana (Igarapé-Miri) | "Todo 26 de cada mês às 12h" | `dayOfWeek: null`, 12:00 |
| São José (Distrito de Maracajá, Novo Repartimento) | "Todo dia 19 do mês, 19h30" | `dayOfWeek: null`, 19:30 |
| Santo Antônio de Pádua (Baião) | "Quarta-feira 19h (última de cada mês)" | `dayOfWeek: 3`, 19:00 |

**O Anuário não publica horário das comunidades, só o da matriz** — por isso não há nenhum horário fora das
749 matrizes/comunidades senão nas 22 matrizes. Numa diocese de rio e ilha com 749 comunidades, isso é o
limite da fonte: as missas nas comunidades seguem a agenda do pároco e não são publicadas.

Os horários de confissão publicados como janela ("Terça a Sexta – 8h30 às 11h") entraram com o **início da
janela** e a frase literal em `notes`.

## Armadilhas e divergências encontradas

- **Duas paróquias homônimas** de Nossa Senhora Imaculada Conceição (Limoeiro do Ajuru e Mocajuba) e **duas
  de São José** (Tucuruí e Distrito de Maracajá/Novo Repartimento). Os slugs incluem a cidade/distrito.
- **CNPJ repetido por engano no Anuário**: a ficha da Paróquia Menino Jesus (Tucuruí) traz o CNPJ da Paróquia
  Sagrado Coração de Jesus (09.356.949/0015-07). O correto, pela Receita, é a filial **0018**
  (09.356.949/0018-41), no mesmo endereço da Avenida Sete de Setembro.
- **CNPJ com erro de digitação**: São José das Ilhas aparece como "09.356.949/00012-56" e "09.356..949/0012-56";
  São Francisco de Assis e Nossa Senhora Aparecida aparecem com ponto no lugar da barra
  ("09.356.949.0013-37", "09.356.949.0021-47"). Normalizados pela Receita.
- **DDD errado**: a Paróquia Sagrado Coração de Jesus (Tucuruí) sai com "(95) 99153-5320" — 95 é Roraima.
  Campo gravado `null`.
- **Telefones incompletos**: Nossa Senhora do Carmo (Vila do Carmo) sai como "Telefone/ WhatsApp: (91)" e
  Sant'Ana (Igarapé-Miri) não tem telefone. Campos `null`.
- **CEP malformado**: Sagrado Coração de Jesus sai como "68.455-001-001". Gravei 68455-001; a Receita registra
  68457-203 para a Rua Ceará no Getat.
- **Data de criação em texto**: Sant'Ana (Igarapé-Miri) tem "Data de Criação: **311 anos**" (apontaria para
  ~1714). `foundedYear` ficou `null`.
- **Distritos tratados como cidade pelo gcatholic**: Carapajó, Carmo do Tocantins, Cupijó, Maiuatá, Maracajá e
  Nova Conquista são **distritos** de Cametá, Igarapé-Miri e Novo Repartimento. No arquivo, `city` é o
  município e o distrito vai em `neighborhood`.
- **Numeração das comunidades com furos**: Oeiras do Pará declara 53 e lista 56 (cada um dos 8 distritos tem
  numeração própria); Mocajuba declara 61 e lista 62 (o número 15 aparece duas vezes); São Benedito declara 15
  e lista 16; Maracajá declara 25 e lista 23. Gravei o que está listado.
- **Matriz ausente da lista de comunidades** em 8 paróquias (Oeiras do Pará, Limoeiro do Ajuru, São José das
  Ilhas, Santo Antônio de Pádua, Santa Rita de Cássia, Cristo Rei, São Francisco de Assis e Santa Maria): foi
  acrescentada com `isMatriz: true`, para não repetir o defeito do importador já corrigido.
- **Ligaduras tipográficas do PDF** (`ﬁ`, `ﬂ`) colaram espaços dentro das palavras ("Conﬁ  ssão", "Bomﬁ  m"):
  normalizadas antes de gravar.
- **Nomes de comunidade duplicados dentro da mesma paróquia** foram desambiguados com a localidade entre
  parênteses (o importador usa o nome como chave).

## Precisa de validação humana

1. **Paróquia São Benedito** e **Paróquia Nossa Senhora do Pilar** (Cametá): existem como paróquia só na
   Receita (filiais 0022 e 0023, 08/07/2025). Confirmar o nome oficial, o pároco e a data do decreto de
   ereção; o Anuário 2025 ainda as trata como Área Pastoral.
2. **Vila Bom Jardim (Pacajá)**: o Anuário marca a comunidade São Pedro e São Paulo como "(nova paróquia)".
   Conferir se já foi erigida.
3. **CNPJ da Paróquia Menino Jesus** (o Anuário publica o da Sagrado Coração de Jesus).
4. **CEP da Paróquia Santa Rita de Cássia (Vila Permanente, Tucuruí)**: 68464-000 (Anuário) × 68455-756
   (Receita).
5. **CEP/endereço da Paróquia Sagrado Coração de Jesus**: Rua Ceará Qd 42 Lt 36, CEP 68455-001 (Anuário) ×
   Rua Ceará 36, CEP 68457-203 (Receita).
6. **Endereço da Paróquia São Francisco de Assis (Novo Repartimento)**: Avenida Nazaré (Anuário) × Rua da
   Bíblia (Receita).
7. **Números divergentes**: São José das Ilhas 2877 (Anuário) × 1527 (Receita); Santa Maria 2712 × 2711;
   Nossa Senhora da Assunção "s/n" × 1206.
8. **Paróquia São José (Tucuruí) é santuário?** O gcatholic a marca como "Parish, Shrine" e a diocese a elege
   lugar de peregrinação do Jubileu 2025; o Anuário só a chama de Paróquia São José. O agregador publica uma
   "Igreja Santuário São José" na mesma rua, **no número 1804** (a paróquia está no 569) — pode ser outro
   templo da mesma paróquia. **Não foi gravado como comunidade** por falta de confirmação.
9. **Grade divergente em Santa Rita de Cássia (Tucuruí)**: o Anuário publica sábado 19h30 e domingo 8h e
   19h30; o agregador Lírio Católico publica terça a sexta 18h30, sábado 19h e domingo 8h e 19h. Adotei o
   Anuário.
10. **Telefone de Sant'Ana (Igarapé-Miri)**: o agregador traz (91) 98485-8851, não confirmado pela diocese.
11. **Capela da Santíssima Trindade (Rua Xingu 48, Tucuruí)**, dos Irmãos Servos da Santíssima Trindade:
    aparece só no agregador, **sem missa publicada** e sem vínculo com paróquia. Ficou **fora do JSON**.

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

- `address`: está `"Residencia Episcopal, Estr. Con. Siqueira 1653"`. O Anuário e a Receita dizem
  **"Avenida Cônego Siqueira, 1653, Brasília, Caixa Postal 4"** (a Receita registra a Mitra no mesmo número).
- `phone`: está `"(91) 992-691-597"` — formatação quebrada. O rodapé do site publica
  **(91) 99269-1597** e **(91) 99394-5598**; o Anuário publica (91) 99269-1597 e (91) 99282-7134.
- `email`: está `null`; o Anuário publica **`secretaria@diocesecameta.com.br`**.
- `zipCode` 68400-000, `website` `https://diocesecameta.com.br` e `bishopName` "Dom Ivanildo Oliveira Almeida"
  (nomeado em 12/04/2023, posse em 08/07/2023) estão corretos.
- `foundedYear` 1952 está de acordo com a convenção (Prelazia erigida em 29/11/1952; Diocese só em
  06/02/2013). **Não mexer.**
- Observação sobre o gcatholic: ele registra o telefone da diocese como "(091) 3781-1157", que é o número
  antigo e não aparece mais em nenhuma fonte da diocese.
