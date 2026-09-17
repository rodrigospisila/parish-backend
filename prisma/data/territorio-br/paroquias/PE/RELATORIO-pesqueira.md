# Diocese de Pesqueira (PE) — relatório de pesquisa

- **Agente**: pesquisa de território, 2026-09-17
- **Arquivo**: `paroquias/PE/pesqueira.json`
- **Cobertura**: **27 / 27 paróquias (100%)**, todas `alta`, + 8 entradas não paroquiais que não
  contam (5 áreas pastorais/missionária, 1 reitoria, 2 santuários)
- **Comunidades**: 38 (35 igrejas-sede + 3) — a diocese **não publica capelas**
- **Horários fixos**: 151 — **113 `alta`, 15 `media`, 23 `baixa`** (146 missas, 5 adorações).
  Nas 27 paróquias: 137 horários (105 `alta`, 13 `media`, 19 `baixa`). **25 das 27 paróquias têm
  grade oficial**; Bom Conselho/Belo Jardim só tem grade de agregador (`baixa`) e São José do
  Cruzeiro do Nordeste não tem nenhuma.

## Fontes principais

| Fonte | URL | O que deu |
|---|---|---|
| Fichas de paróquia (35) | `https://diocesedepesqueira.com.br/paroquia/<slug>/` | ano de criação, telefone(s), e-mail, expediente, endereço, clero, redes sociais e **grade de missas em tabela** (dia · tipo · hora · observação) |
| WP REST API | `/wp-json/wp/v2/paroquia?per_page=100` | listagem canônica (`X-WP-Total: 35`), **`modified` de cada ficha** e taxonomia `local_paroquia` (4 regiões pastorais) |
| Fichas do clero (57) | `/wp-json/wp/v2/clero` + `https://diocesedepesqueira.com.br/clero/<slug>/` | **paróquia e função** de cada padre (pároco, administrador, vigário) |
| Receita Federal | `https://minhareceita.org/<cnpj>` (raiz **10.714.251**) | varredura das filiais 0001–0080: **prova de completude**, CEPs e o município de São Manoel da Paciência |
| Wikipédia / catholic-hierarchy | — | 25 paróquias em 13 municípios (defasado) |

### Atualidade — a melhor fonte das três dioceses

O site é WordPress (tema Parresia + Elementor). **33 das 35 fichas foram alteradas entre 14/07 e
14/09/2026**; só duas estão paradas desde 02/08/2024 (Área Pastoral Nossa Senhora do Carmo e
Paróquia Nossa Senhora da Conceição de Fazenda Nova). Critério: ficha alterada há ≤ 12 meses →
horário `alta`; as duas de 2024 → `media`. As 57 fichas do clero também são de julho–setembro/2026.

### Truques de coleta

- O `content.rendered` da REST API vem **vazio**: os dados estão em campos ACF renderizados pelo
  plugin *Dynamic Content for Elementor*. A grade de missas é um **repeater**
  (`div.dce-acf-repeater-item`) com quatro colunas identificadas pelo id do contêiner Elementor:
  `4fcfdc98` = dia, `5579d60d` = tipo, `5efefe33` = hora, `3e960c2e` = **observação**. Ler o texto
  corrido perde a ligação entre a observação e a linha (é ali que a fonte diz "1ª sexta do mês",
  "Oratório de São Pedro", "Exposição do Santíssimo") — só o parser por coluna resolve.
- Todos os e-mails vêm ofuscados pelo Cloudflare (`data-cfemail`) e foram decodificados.
- **A ficha da paróquia lista o clero sem dizer a função** e nem sempre na ordem certa: em Sertânia
  o primeiro nome é o *vigário*. O pároco veio das fichas individuais do clero (campo "Função").

### Prova de completude (CNPJ)

Raiz **10.714.251**, última ordem ocupada 0058. Filiais **ativas**: 26 com nome de paróquia + o
"Convento dos Franciscanos" (0003, Av. Carlos de Brito, 194 — o endereço da Paróquia da Imaculada
Conceição, franciscana) = **27 paróquias**, exatamente as do site. Além delas: cúria, CEDAPP, Centro
Diocesano de Pastoral, 4 áreas pastorais + 1 área missionária e a Reitoria de São Miguel. As
filiais 0002–0024 são as inscrições antigas (1969–1992), todas **baixadas** e substituídas pelas de
1999/2000. **Wikipédia (25) e catholic-hierarchy (25 em 2021, "22" em 2023) estão defasados** — não
contam Nossa Senhora Mãe da Santa Esperança (Arcoverde, 2022) nem São Manoel da Paciência
(Xucuru/Belo Jardim, 17/06/2024). `parishesExpected` foi fixado em 27.

## Agregadores

- **horariodemissa.com.br**: os 13 municípios existem no agregador (22 fichas), mas **todas são de
  23/05/2013 a 04/11/2016** e 19 delas nem têm horário. Nada aproveitado.
- **buscamissa.com.br**: nenhum município da diocese no sitemap.
- **liriocatolico.com.br** (carga de 2026-09): 7 registros. Confirmou a grade de Pedra (3/3) e parte
  de Nossa Senhora da Saúde e São Pedro e São Paulo (Belo Jardim); deu a **única grade disponível
  de Nossa Senhora do Bom Conselho** (qui 19h, dom 19h → `baixa`). A ficha da Catedral no
  agregador (19h todos os dias, endereço "R. Duque de Caxias, 42") é implausível e foi ignorada.

## Decisões de modelagem

- **Catedral**: a fonte a chama de "Paróquia de Santa Águeda – Pesqueira"; gravada como
  `Catedral Santa Águeda` (e-mail `catedralsantaagueda7@…`, Instagram `@catedraldepesqueira`).
- **Sufixo de cidade/distrito** saiu do nome: "– Belo Jardim", "– Cimbres", "– Mutuca" etc. viraram
  `city`/`neighborhood`. Distritos com paróquia própria: **Cimbres e Mutuca** (Pesqueira),
  **Xucuru e Serra dos Ventos** (Belo Jardim), **Fazenda Nova e São Domingos** (Brejo da Madre de
  Deus), **Cruzeiro do Nordeste** (Sertânia). Slugs de Fazenda Nova e Cruzeiro do Nordeste levam o
  distrito para não colidir com a paróquia homônima da sede.
- **Paróquia São Manoel da Paciência**: a ficha não diz o município; **Xucuru/Belo Jardim** veio
  da filial 0057 da Receita. A URL e o e-mail ainda dizem "área pastoral" — foi elevada em 2024.
- **Áreas pastorais/missionária (5)**: `status: "nao-paroquial"` + `loadAsParish: true`, como em
  Caruaru e Nazaré — têm administrador, secretaria e (três delas) grade própria.
- **Santuário Nossa Senhora das Graças** (Aldeia Guarda, Cimbres; sáb e dom 11h): não paroquial com
  horário publicado → `loadAsParish: true`.
- **Reitoria São Miguel e Santuário da Divina Misericórdia** (Arcoverde): a fonte **não publica
  horário** → `nao-paroquial` **sem** `loadAsParish` (regra do README). Ver item 3 abaixo.
- **Recorrência mensal** ("1ª sexta do mês", "última terça", "3º sábado", "terceira quinta") →
  dia da semana + `baixa` + frase em `notes` (23 horários no arquivo). A 1ª sexta-feira é praxe
  em quase todas as paróquias da diocese.
- **Sanharó**: a linha "Segunda a Sexta · Missa · 08h às 12h · Exposição do Santíssimo Sacramento"
  é adoração, não missa → 5 horários `ADORATION` `media`, com nota.
- **São Pedro e São Paulo (Belo Jardim)**: a coluna de observação separa **Oratório de São Pedro**
  (seg–sex 19h, sáb 7h) da **Matriz** (sáb 19h; dom 7h, 9h, 19h) → duas comunidades.
- **`foundedYear`**: campo "Ano de Criação" da ficha (1692 a 2024, sem repetição em massa) —
  confiável. "05/01/1992" e "17/06/2024" viraram o ano; na Área do Carmo usei 2010 (ano em que
  virou área pastoral; a capela é de 1992).
- **CEP**: o site não publica. Usei o da filial da Receita **só quando o logradouro bate ou o CEP é
  o geral do município/distrito**. Ficaram `null`: as quatro paróquias urbanas de Belo Jardim (a
  Receita traz "55150-001", que não é CEP de logradouro) e São Geraldo Majella (a Receita registra
  outra rua).

## Pontos que precisam de validação humana

1. **Nossa Senhora da Conceição de Belo Jardim — local das missas de fim de semana.** A ficha
   publica "Sábado · 17h e 19h · *Comunidade Eclesial Missionária Nossa Senhora das Dores*" e
   "Domingo · 07h, 17h e 19h · *Comunidade Eclesial Missionária São José Operário*". Não dá para
   saber se a observação indica **onde** é uma das missas (provavelmente a das 17h) ou só a
   comunidade que anima a liturgia. Pela regra do dataset ficou tudo na Matriz, mas rebaixado para
   `media`; as duas comunidades entraram sem horário. **Confirmar no Instagram
   `@paroquiadaconceicaobj`.**
2. **Duas paróquias sem grade oficial**: Nossa Senhora do Bom Conselho (Belo Jardim — só os dois
   horários `baixa` do agregador) e São José do Cruzeiro do Nordeste (Sertânia — nada). Também sem
   grade: Área Missionária São Bartolomeu e Santa Rita e Área Pastoral Santo Antônio (Serra das
   Varas), cuja ficha só tem o nome do padre.
3. **Reitoria São Miguel (Arcoverde)** tem administrador, secretaria com expediente, e-mail e CNPJ
   desde 2017 — é lugar de missa de verdade, mas sem grade publicada ficou **fora da carga**. Se o
   Parish quiser mostrá-la mesmo assim, basta acrescentar `loadAsParish: true`. Idem para o
   Santuário da Divina Misericórdia (Serra das Varas).
4. **Telefones com 8 dígitos** (formato antigo, provavelmente falta o 9): São Domingos —
   `81 9282-6295`; São José do Cruzeiro do Nordeste — `(87) 8849-1377`. Gravados como publicados.
   Conferir também `81 93500-5938` (São José, Brejo da Madre de Deus) — prefixo incomum.
5. **Taxonomia provavelmente errada no site**: a Paróquia Sagrado Coração de Jesus de **Sertânia**
   está marcada como "Região Pastoral Belo Jardim", enquanto a outra paróquia da mesma cidade
   (Nossa Senhora da Conceição, mesmo pároco) está em "Arcoverde". Sanharó também aparece em "Belo
   Jardim", embora seu administrador seja o "coordenador da Região Pastoral Pesqueira" — pode ser
   legítimo. Não afeta o dataset (a região só foi para `notes`).
6. **Endereços divergentes site × Receita** (ficou o do site): Alagoinha (Praça Barão do Rio Branco
   × Av. Rio Branco), Sanharó (Rua Dr. José Mariano × Praça Coração de Jesus), Conceição de Belo
   Jardim (Rua Marechal Deodoro × Praça da Conceição), São Pedro e São Paulo (Rua Benjamin
   Constant, 16 × Vila Dr. Fernando Dias de Abreu), Jataúba (Rua São Sebastião, 86 × Rua José
   Rodrigues de Siqueira), São Geraldo (Rua Félix Amaro, 10 × Rua São Geraldo, 23), Mutuca (Rua
   Igreja Matriz, 58 × Rua Airton Sena, 48), Fazenda Nova (Av. Soares da Costa × Praça da
   Conceição). Em geral um é a secretaria e o outro a igreja.
7. **Nossa Senhora da Saúde (Belo Jardim)**: a ficha escreve o domingo como "19h e 17h30"; o
   agregador traz 7h e 17h30. Gravado 17h30 e 19h (`alta`, fonte oficial de 11/08/2026).
8. **Comunidades**: só 3 além das sedes. Não há lista de capelas em lugar nenhum do site; é o maior
   buraco deste arquivo (a diocese cobre 10 mil km² de agreste e sertão).
9. **Pista não gravada**: Lírio Católico — "Capela de Santa Rita de Cássia" (R. Francisco Solom de
   Lima, 57, Água Fria, Belo Jardim; dom 8h), possivelmente ligada à Área Missionária São
   Bartolomeu e Santa Rita.
10. **`dioceses.json`**: dados de Pesqueira corretos; falta só o e-mail da cúria,
    `secpastoralpesqueira@gmail.com` (decodificado do rodapé do site).
