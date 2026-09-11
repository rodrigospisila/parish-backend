# Relatório — Diocese de Primavera do Leste-Paranatinga (MT)

Pesquisa em 2026-09-11. Arquivo: `primavera-do-leste-paranatinga.json`.

## Resumo

| Métrica | Valor |
|---|---|
| Paróquias no arquivo | 22 (todas `alta`) |
| Paróquias esperadas | 17 (número de 2014, na criação da diocese) — ver "Cobertura" |
| Comunidades | 11 (1 `alta`, 10 `baixa`) |
| Horários fixos | 133 (21 `alta`, 6 `media`, 106 `baixa`) |
| Paróquias sem nenhum horário | 6 |
| Paróquias sem comunidade listada | 17 |

Tipos: 112 MASS, 19 CONFESSION, 2 ADORATION.
Municípios: Primavera do Leste 6, Paranatinga 4, Campo Verde 2, Poxoréu 2, e um cada em
Campinápolis, Chapada dos Guimarães, Gaúcha do Norte, Nova Brasilândia, Nova Xavantina,
Novo São Joaquim, Planalto da Serra e Santo Antônio do Leste.

## Fontes principais

- **Site oficial** — <https://dioceseprimaveraptga.com.br>. **É a fonte mais atual das quatro
  circunscrições desta rodada**: o portal foi reconstruído em agosto de 2026 e as fichas têm
  `modified` entre **30/08/2026 e 10/09/2026**.
  O caminho foi a REST API do custom post type **`local`**
  (`/wp-json/wp/v2/local?per_page=100`, `X-WP-Total: 28`), filtrado pela taxonomia
  `tipo-de-local`: **Paróquia 22, Forania 4, Cúria 1, Seminário 1**.
- Cada ficha `/local/<slug>/` publica: tipo, forania (badge com link), **data de criação**,
  município, **CNPJ da filial da mitra**, descrição histórica, clero com função, telefones,
  e-mail `@dioceseprimaveraptga.org.br`, link do Google Maps (de onde saiu o endereço) e, quando há,
  a grade de missas e o bloco de atendimento/confissões.
- As **4 páginas de forania** listam suas paróquias: Pe. Onesto Costa 8, Pe. João Henning 5,
  Pe. José Cont 5, Diác. Wilton Alves 4 — soma 22, igual ao total do CPT. Serviu de prova de
  completude.
- <https://cnbbo2.org.br/diocese-de-primavera-do-leste-paranatinga/> e a Wikipédia — dados de
  criação da diocese (25/06/2014, Papa Francisco), 98.056 km², sé e concatedral.
- **Agregadores** para os horários: <https://www.liriocatolico.com.br> (12 paróquias e 8 capelas em
  6 municípios; **o melhor da rodada**, com comunidade separada da matriz) e
  <https://www.horariodemissa.com.br> (7 municípios).

## Cobertura

**22 paróquias**, com dupla confirmação interna ao site (CPT + soma das foranias).
O número "17 paróquias" que circula (Wikipédia, notas da criação da diocese) é de **2014** e está
superado: entre as 22 há paróquias criadas depois — São Miguel Arcanjo/Campo Verde (2015),
Nossa Senhora Aparecida/Primavera do Leste (2016), Nossa Senhora de Caravaggio (2019) — além da
Área Pastoral São Pedro e São Patrício (2022) e da Paróquia Missionária Itinerante São Domingos
Sávio. O catholic-hierarchy.org ficou inacessível (HTTP 300 na URL `dprpa`/`dpdlp`).

## Decisões tomadas

- **Regra de confiança dos horários** (a diocese só publica a grade da Catedral):
  `alta` = grade do site diocesano; `media` = mesmo (tipo, dia, hora) em **dois** agregadores
  independentes; `baixa` = um só agregador, ou recorrência mensal.
  **O Lírio Católico reproduz a grade da Catedral exatamente igual à do site diocesano** (domingo
  7h/17h/19h e segunda a sábado 6h e 19h) — um bom sinal de que a base dele está atualizada para
  esta diocese, mas isso não muda a regra.
- **Área Pastoral São Pedro e São Patrício** foi mantida no arquivo com o nome que a diocese usa
  ("Área Pastoral …", não "Paróquia"), porque está dentro do tipo "Paróquia" do CPT e tem missa
  publicada na Comunidade São Pedro (Nova Poxoréu).
- **Concatedral São Francisco Xavier**: o site chama de "Co-Catedral"; gravada como
  `Concatedral São Francisco Xavier`, forma usada no resto do dataset.
- **Homônimos**: há 4 "Paróquia Nossa Senhora Aparecida" (Primavera do Leste, Paranatinga/Salto da
  Alegria, Planalto da Serra e Gaúcha do Norte). O `name` ficou sem cidade e a desambiguação foi
  para o `slug`.
- **Endereços vieram do link do Google Maps** de cada ficha (a diocese não publica o endereço como
  texto). Não há CEP em nenhuma ficha → `zipCode: null` nas 22.
- **Recorrências mensais → `baixa`**, com a regra literal em `notes`: Comunidade Santa Luzia da
  Salete ("2º domingo de cada mês, 9h30"), Imaculado Coração de Maria ("1ª sexta-feira do mês, 6h e
  19h"), São Miguel Arcanjo e Santuário de Sant'Ana ("1ª sexta-feira, 19h").
- **Fora do arquivo**: a "Paróquia São José – Colônia Indígena São José, Sangradouro", que o
  horariodemissa.com.br lista sob Primavera do Leste. É a missão salesiana de Sangradouro e **não
  consta** do diretório da diocese; sem horário publicado.

## Precisa de validação humana

1. **Só 3 das 22 paróquias têm pároco publicado** (Catedral São Cristóvão — Pe. Lidiomar Gonçalves
   dos Santos; São Francisco de Assis/Primavera — Pe. Divino Aparecido Lopes; São João Batista/
   Poxoréu — Pe. Antônio Soares de Araújo). O site novo ainda não vinculou o clero às demais fichas.
2. **Só a Catedral publica horário no site diocesano.** As outras 21 grades vêm de agregadores.
   **6 paróquias entram sem nenhum horário**: Missionária Itinerante São Domingos Sávio
   (Nova Xavantina), São Joaquim e Sant'Ana (Novo São Joaquim), Nossa Senhora Aparecida
   (Planalto da Serra), Nossa Senhora Aparecida (Paranatinga/Salto da Alegria), Nossa Senhora das
   Dores (Nova Brasilândia) e Nossa Senhora da Glória (Jarudore/Poxoréu).
3. **Paróquia Missionária Itinerante São Domingos Sávio** tem sede em **Nova Xavantina**, município
   do território da **Diocese de Barra do Garças**, mas a página da Forania Diác. Wilton Alves a
   coloca nesta diocese. Risco de duplicata com o arquivo `barra-do-garcas.json` — conferir.
4. **Paróquia São Cristóvão (Campo Verde)**: o Lírio Católico registra a igreja-matriz como
   "Matriz Nossa Senhora de Fátima" (R. João Pessoa, 511, Centro) e trata a "Igreja São Cristóvão"
   (Rua Paulo Roberto Cesar) como outra igreja, ambas com o mesmo telefone. Foi gravado assim,
   com `isMatriz` em Nossa Senhora de Fátima — confirmar qual é a matriz.
   O endereço desta paróquia ficou `null` (o link do Maps traz só o nome da igreja).
5. **Santuário de Sant'Ana (Chapada dos Guimarães)**: o site diocesano diz "Rua Cipriano Curvo" e o
   horariodemissa.com.br "Praça Dom Wunibaldo, s/n"; e os horários divergem
   (domingo 7h30 × 8h; sábado 19h30 × 19h). Tudo `baixa`. Criação registrada como **1779** — a mais
   antiga da diocese, vale conferir a data.
6. **Divergências entre agregadores** (tudo `baixa`): Nossa Senhora Aparecida/Primavera do Leste
   (domingo 7h+18h no Lírio × 7h30 no Horário de Missa) e Nossa Senhora de Caravaggio
   (domingo 8h30/17h/19h × 19h; quinta 18h30 × 19h).
7. **E-mails com domínio digitado errado nas fichas oficiais**:
   `pnsdagloriajde@dicoceseprimaveraptga.org.br` ("dicocese") em Nossa Senhora da Glória e
   `paroquiasaomiguel@dioceseprimaveraptga.or.br` (".or.br") em São Miguel Arcanjo.
   Foram gravados como publicados.
8. **Datas de criação genéricas**: 17 das 22 fichas trazem a criação como `01/01/<ano>` — é
   claramente só o ano, com dia/mês de preenchimento. O `foundedYear` guardou só o ano;
   o texto literal ficou em `notes`.
9. **Comunidades**: apenas 11 registradas, 10 delas vindas do Lírio Católico (`baixa`). A diocese
   não publica lista de comunidades. Ficaram **fora** do arquivo, por não ser possível atribuí-las a
   uma paróquia, estas capelas com missa que o Lírio Católico lista:
   - Primavera do Leste: Comunidade Nossa Senhora Auxiliadora (Poncho Verde 2, qua 19h e sáb 19h,
     Instagram @paroquia.nsauxiliadora — pode ser paróquia nova), Comunidade Santa Terezinha do
     Menino Jesus (Cond. Res. Tuiuiú, qua e sáb 19h30) e Igreja da Comunidade Sagrada Família
     (Parque das Águas, sáb 18h);
   - Campo Verde: Comunidade Rainha dos Apóstolos (Av. Dep. Ulisses Guimarães, Jd. Campo Verde,
     sáb 19h).
10. **Cúria**: a ficha `/local/curia-diocesana/` dá só o endereço aproximado (Avenida Cuiabá,
    Primavera I) via Google Maps, sem CEP, telefone nem e-mail — por isso `phone`/`email`/`zipCode`
    da diocese ficaram `null`.
