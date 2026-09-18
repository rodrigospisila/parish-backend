# Relatório — Diocese de Ji-Paraná (RO)

Pesquisa: 2026-09-18. Agente de pesquisa do território (enxame Parish).

## Resumo

| Item | Valor |
|---|---|
| Paróquias gravadas | **24** (23 em RO + 1 em MT) |
| Confiança das paróquias | 24 `alta` |
| Comunidades nomeadas | **96** |
| Horários fixos | **74** (12 `alta`, 2 `media`, 60 `baixa`) |
| Cobertura | **24/24** — fechada por três fontes independentes |
| Bispo | **Dom Norbert Hans Christoph Foerster, S.V.D.** (nomeado 02/12/2020) — confirmado |

## Fontes principais

1. **Site oficial — <http://www.diocesedejiparana.org.br>**. Portal antigo (PHP, XHTML 1.0,
   ISO-8859-1, rodapé "©2014"), mas **ativo**: notícias de 03, 05, 10 e 13/09/2026.
   A lista está em **`/paroquias.php`**, paginada (`?pg=2`): **16 + 8 = 24**.
   Cada item leva a uma ficha `/noticias-det.php?cod=N` com **Paróquia, Município, Data de Criação,
   Endereço, Telefone** e um histórico. Li as 24 fichas.
2. **gcatholic.org** (`jipa0.htm`) — **24 paróquias**, 75.788 km², bispo Dom Norbert Foerster.
3. **Receita Federal via Mapa das OSC/IPEA** — CNPJ raiz **04.128.765** (publicado pela própria
   ficha de Pimenta Bueno), **31 estabelecimentos**.
4. **<https://santuarioopo.com>** — site próprio do Santuário de Ouro Preto do Oeste, ativo
   (notícia de 14/09/2026): **70 comunidades em 13 setores, 68 nomeadas**, e o **cronograma mensal
   de missas em PDF**.
5. **liriocatolico.com.br** — `/horario_missa/dados/uf/RO.json`, 49 fichas do estado. **Agregador.**

## Cobertura — três provas convergentes

- Site: 24. gcatholic: 24. Receita: dos 31 estabelecimentos do CNPJ 04.128.765, **24 casam
  um a um com as 24 fichas**, 1 é a sede (Av. Marechal Rondon 400), 1 é outra obra em Vilhena
  (Av. Liberdade 4175) e **5 são estabelecimentos históricos em Mato Grosso** — Juína, Aripuanã,
  Comodoro, Cotriguaçu e Juruena —, território que deixou Ji-Paraná quando a **Diocese de Juína**
  foi criada em 1997. Nenhum endereço de paróquia da Receita falta no site.
- **Uma paróquia fora de Rondônia**: **Nossa Senhora Auxiliadora, de RONDOLÂNDIA/MT**
  (`state: "MT"`). A ficha registra "Data de criação: 24 de maio de 1999, **Diocese de Juína** —
  Dom Franco Dalla Valle" e explica a transferência: "os municípios vizinhos são do estado de
  Rondônia... o deslocamento para as reuniões e formações era muito distante". A Receita confirma
  o estabelecimento 0034-20 do CNPJ de Ji-Paraná em Rondolândia. É o caso que o README prevê —
  filial que mudou de diocese.

## Horários — o ponto fraco desta diocese

- **Só 2 das 24 fichas publicam horário de missa**: a **Catedral São João Bosco** (grade completa,
  sob o título "Horário de Missa na comunidade matriz São João Bosco") e **Cristo Ressuscitado**
  de Alvorada d'Oeste. Estes 12 horários entram com `alta`.
- **Santuário de Ouro Preto do Oeste**: tem site próprio ativo, mas **não publica grade semanal** —
  publica um **cronograma mensal em PDF** ("Missas nas comunidades Cidade em Setembro DE 2026",
  46 missas data a data, com comunidade e celebrante), e a página avisa que "a escala dos padres e
  os horários estão sujeitos a alterações eventuais". Extraí apenas o que se repete nas quatro
  semanas na sede — **domingo 7h30 e 19h30** (`media`) — e a quinta-feira 19h30 (`baixa`, porque em
  10/09 foi às 19h). As missas das comunidades são **rodiziadas pelo mês** e não cabem no modelo
  semanal: ficam fora, com a explicação em `notes`.
- **As outras 21 paróquias**: a única fonte de horário encontrada foi o **liriocatolico.com.br**.
  O campo `ultima_atualizacao` vale **2026-09-02 em todas as 49 fichas de Rondônia** — é a data de
  regeneração da base, **não** de conferência da paróquia. Pela regra do README, agregador isolado
  = **`baixa`**: são **60 horários que ficam no dataset e não carregam**.
- Onde as duas fontes se encontram, elas batem: em Alvorada d'Oeste o liriocatolico repete
  exatamente domingo 7h30 e 19h30 da diocese. **Divergem** na Catedral: a diocese publica
  **segunda-feira 18h10** e o agregador **06h00** — prevaleceu a diocese.
- **Não entraram como missa**: as duas orações do Santo Terço de Alvorada (gravadas como `ROSARY`)
  e "Toda Primeira Sexta-feira do mês **Celebração** em Honra ao Sagrado Coração de Jesus - 07h00"
  (a fonte diz *celebração*, não missa, e é mensal).

## Comunidades

- **96 nomeadas**: 68 do Santuário de Ouro Preto do Oeste (a página declara 70 e nomeia 68),
  6 urbanas de Alta Floresta d'Oeste (legendas do bloco "Fotos das comunidades na zona urbana") e
  as 22 matrizes.
- **Mais de 350 comunidades ficam sem nome público** porque as fichas só declaram o total:
  Jaru **115** (9 setores), Nova Brasilândia d'Oeste **57**, Pimenta Bueno **50** (15 urbanas +
  35 rurais), Vale do Paraíso **37**, Ji-Paraná/N. Sra. de Fátima **33** (13 urbanas + 20 rurais,
  7 setores), Ministro Andreazza **25**, Vilhena/N. Sra. das Graças **14 urbanas + 12 rurais**,
  Rolim de Moura **15 urbanas**, Gov. Jorge Teixeira **40** (segundo a ficha de Jaru).

## Pontos que precisam de validação humana

1. **Endereços que divergem entre a ficha e a Receita** (gravei o da ficha, sempre com nota):
   | Paróquia | Ficha | Receita |
   |---|---|---|
   | São José (Ji-Paraná) | Av. Maringá, **49** | Rua Maringá, **749** |
   | Santa Rita de Cássia (Gov. Jorge Teixeira) | Rua Sumaúma, 2319 | **Av. Pedras Brancas, 1620** |
   | N. Sra. dos Migrantes (Mirante da Serra) | Rua 28 de Novembro, 2293 | **Rua dos Seringueiros, s/n** |
   | Santíssima Trindade (Urupá) | Rua Cerejeiras, **3836** | Rua Cerejeiras, **3** |
   | N. Sra. da Guia (Vale do Paraíso) | Rua Alecrim, **4561** | Rua Alecrim, **2434** |
   | Divino Espírito Santo (N. Brasilândia) | Rua José Carlos Bueno, **3411** | **3405** |
2. **CEPs não gravados ou recuperados de outra fonte**: São José de Ji-Paraná publica "76 900-000"
   (CEP genérico do município) → `null`; N. Sra. das Graças de Vilhena não publica CEP e a Receita
   dá 76980-002 com número divergente → `null`; Ministro Andreazza e Alta Floresta d'Oeste vieram
   do ViaCEP porque a Receita ainda registra CEPs antigos de 8 dígitos (78981000 e 78994000).
3. **Campo "E-mail" usado para telefone**: a ficha de Pimenta Bueno traz
   `E-mail: 3451-2365| 98120-9141`. Nenhuma ficha da diocese publica e-mail de paróquia.
4. **Telefone com 8 dígitos**: Vale do Paraíso publica "9939-4079" como segundo número — não gravado.
5. **Pároco indeterminado em Rolim de Moura**: a ficha traz a lista histórica de padres e freis;
   os últimos marcados "– Pároco" são Frei Silvio Didier Mourão e Frei Cleidimar Vilela Roquim da
   Silva, seguidos de Frei Marcos Antonio da Silva Alencar **sem título**. `priestName: null`.
6. **Nome da catedral**: a ficha diocesana diz apenas "Paróquia São João Bosco". Gravei
   **"Catedral São João Bosco"**, confirmado pelo gcatholic (`churches/brazil/2765.htm`,
   "Catedral São João Bosco, Ji-Paraná") e pela ficha do liriocatolico. Funciona no mesmo endereço
   da Cúria (Av. Marechal Rondon, 400).
7. **Matriz com orago diferente do da paróquia**: Divino Espírito Santo de Nova Brasilândia d'Oeste —
   "Em 28 de fevereiro de 2015, Dom Bruno Pedron decreta a capela **Nossa Senhora Aparecida** como
   Igreja Matriz da Paróquia". Gravei a matriz como "Comunidade Matriz Nossa Senhora da Conceição
   Aparecida", nome da legenda da foto na própria ficha.
8. **Horários de comunidade do liriocatolico que NÃO consegui atribuir a uma paróquia** (ficam só
   aqui, fora do JSON, porque a cidade tem mais de uma paróquia ou a comunidade não é nomeada por
   nenhuma fonte oficial):
   - Cacoal — "Capela Nossa Senhora Aparecida" (terça 17h) e "Comunidade Nossa Senhora de Fátima"
     (domingo 18h): Cacoal tem duas paróquias.
   - Vilhena — "Comunidade Nossa Senhora Aparecida" (terça 6h30, sábado 19h, domingo 19h),
     "Comunidade Rainha dos Apóstolos" (sábado 19h30) e "Comunidade São Francisco de Assis"
     (quarta 6h30, domingo 9h): Vilhena tem duas paróquias.
   - Nova União — "Comunidade São Roque" (domingo 19h): território da paróquia de Mirante da Serra,
     mas a ficha não a nomeia.
   - Presidente Médici — "Comunidade Nossa Senhora da Saúde" (domingo 18h).
   - Rolim de Moura — "Igreja Bom Jesus" (domingo 7h30).
9. **Datas das fichas**: 23 das 24 foram publicadas/atualizadas em **26/03/2025**; só Pimenta Bueno
   é de **19/02/2026**. Os dados cadastrais (endereço, telefone, data de criação) são estáveis, mas
   os nomes de párocos citados nos históricos podem estar velhos — só gravei `priestName` onde a
   ficha diz explicitamente "pároco atual" (Pimenta Bueno, Mirante da Serra, Cacoal/Sagrada Família,
   Vilhena/N. Sra. das Graças).

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

- **`email`**: hoje `null`. O único e-mail publicado pelo site (ofuscado pelo Cloudflare, decodificado
  de `data-cfemail`) é **`informatica@diocesedejiparana.org.br`**. Gravei-o no JSON da diocese, mas
  como é o endereço da informática e não um "contato" institucional, fica a sugestão para decisão humana.
- **`phone`**: o registro é `(69) 3416-4203/5`; o rodapé do site publica **(69) 3416-4203 / 3416-4204**.
  Sugiro `(69) 3416-4203` (gravei assim no JSON da diocese).
- **`website`**: `http://www.diocesedejiparana.org.br` está correto e responde também em HTTPS.
- **`bishopName`**: Dom Norbert Hans Christoph Foerster, S.V.D. — **confere**. (A página `/bispo.html`
  do site está praticamente vazia, só com a legenda "Padre Norbert"; a confirmação veio do gcatholic.)
- `foundedYear: 1978` é o ano da **erecção da Prelazia de Vila Rondônia** (03/01/1978; diocese só em
  19/02/1983) — está certo pela convenção do dataset, **não corrigir**.
