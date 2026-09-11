# Relatório — Arquidiocese de Campo Grande (MS)

Pesquisa em 2026-09-11. Arquivo: `campo-grande.json`.

## Resumo

| Item | Valor |
|---|---|
| Paróquias no arquivo (sem marcador) | **54** — 53 paróquias + a Quase-Paróquia Santo Expedito |
| Registros totais no arquivo | 56 (+ 1 capelania militar `nao-paroquial` com `loadAsParish` e 1 entrada `duplicada`) |
| Confiança das paróquias | 56 `alta`, 0 `media`, 0 `baixa` |
| Comunidades/capelas | **329** (inclui as 56 matrizes) |
| Horários fixos | **726** — 365 `alta`, 220 `media`, 141 `baixa` |
| Cobertura | 54 × 53 esperadas (catholic-hierarchy, dado de 2023) — a 54ª é a Paróquia São José de Anchieta, criada em 31/05/2024, posterior àquela contagem |
| Municípios | 8/8 — Campo Grande, Sidrolândia, Terenos, Jaraguari, Corguinho, Rochedo, Ribas do Rio Pardo, Bandeirantes |
| Paróquias sem nenhum horário | 0 |

## Fontes principais

A arquidiocese tem **o melhor portal de MS** e foi a fonte de 100% do arquivo. É um WordPress com dois
custom post types expostos na REST API:

| Fonte | O que deu |
|---|---|
| `https://arquidiocesedecampogrande.org.br/wp-json/wp/v2/paroquias?per_page=100` | lista canônica: `X-WP-Total: 56` fichas, com slug, link e `modified` |
| Ficha de cada paróquia (`/paroquias/<slug>/`) | forania, ano de criação, e-mail(s), telefone, WhatsApp, secretária, endereço + bairro + CEP, clero com função, lista de comunidades e **grade de celebrações da matriz** — 56 páginas lidas |
| `https://arquidiocesedecampogrande.org.br/horarios-de-missas/` | **página única de 1,3 MB** que renderiza os 341 locais de celebração (matrizes *e* capelas) em `<table id='HorarioMissas'>`, cada bloco marcado com a classe `paroquia-forania-<slug>` que o liga à paróquia — 752 linhas de horário de uma vez |
| `/wp-json/wp/v2/paroquia-forania?per_page=100` | as 60 taxonomias (8 foranias + 52 paróquias) usadas para ligar capela → paróquia |
| `/curia-arquidiocesana/` | endereço, CEP, telefone e e-mail da Cúria; Dom Dimas Lara Barbosa |
| `catholic-hierarchy.org/diocese/dcmgr.html` | número esperado de paróquias (53, dado de 2023), 643.244 católicos, diocese em 15/06/1957 e arquidiocese em 27/11/1978 |

Nenhum agregador (horariodemissa.com.br, Google Maps) foi necessário.

## Achado metodológico: duas grades oficiais divergentes no mesmo site

O site publica horários em **dois lugares independentes**, e eles não batem:

1. **A ficha da paróquia** traz a grade da matriz num repeater do próprio post `paroquias`.
   Essas fichas foram editadas entre **22/07/2026 e 11/09/2026** (36 em agosto, 15 em julho, 3 em setembro).
2. **A página `/horarios-de-missas/`** renderiza o CPT `horario-missa`. Esses 341 posts foram editados
   quase todos em **março de 2024** (287 de 341); só 2 têm edição de 2026.

Exemplo da divergência — Paróquia Cristo Redentor: a ficha (ago/2026) publica sábado 18:00 e domingo
**18:00**; o CPT (mar/2024) publica terça 19:30, sábado 18:00 e domingo **19:00**. Há diferença em 36 das
56 unidades.

**Decisão adotada:** a matriz usa a grade da ficha (`alta`, fonte oficial com sinal de atualidade de
semanas atrás); as capelas usam o CPT, que é a **única** fonte para elas, com `media` (fonte oficial sem
sinal de atualidade — é de 2024, posterior à pandemia, então carrega pela regra do README). Onde as duas
divergiam para a matriz, prevaleceu a ficha. Isso explica os 365 `alta` (matrizes) vs. 220 `media` (capelas).

## Os 141 horários `baixa` — recorrência mensal

Todos são recorrência mensal que o `MassSchedule` não modela. A regra literal ficou em `notes`
(ex.: `Recorrência mensal publicada pela arquidiocese: "1º Sexta-feira do Mês"`). As formas encontradas:
`1º/2º/3º/4º <dia> do Mês` (144 linhas), `Último/Última <dia> do Mês` (10) e `Dia 8/19/22/24/28 de cada mês`
(6 — estas não têm dia da semana e ficaram **fora** do arquivo).

É a norma na Forania Rural: a Paróquia N. Sra. da Abadia de Sidrolândia tem 35 capelas em assentamentos e
fazendas, quase todas com missa mensal; idem Santo Antônio de Pádua (Terenos, 20 capelas) e N. Sra.
Imaculada Conceição (Ribas do Rio Pardo, 15 capelas, com nomes como "Assentamento Avaré",
"Fazenda Formoso", "Sitio Luana").

## Marcadores aplicados

| Registro | Marcador | Motivo |
|---|---|---|
| Capelania Militar do Comando Militar do Oeste | `status: "nao-paroquial"` + `loadAsParish: true` | capelania militar, mas a arquidiocese publica grade fixa (5 missas semanais) — é lugar de missa de verdade |
| Capela Senhor Bom Jesus | `status: "duplicada"` | publicada por engano no CPT de paróquias; é capela da Paróquia N. Sra. da Conceição Aparecida (mesmo e-mail `pnsca@terra.com.br`, mesmo telefone e mesma lista de 3 capelas). A missa de domingo 09:30 já consta como comunidade daquela paróquia |

## PRECISA DE VALIDAÇÃO HUMANA

1. **Paróquia Senhor Bom Jesus de Rochedo — orago divergente no CMS.** O título da ficha e o termo da
   taxonomia dizem "Paróquia Senhor Bom Jesus – Município de Rochedo", mas o **slug do post é
   `paroquia-sao-sebastiao-martir-rochedo`**. Adotei "Senhor Bom Jesus" (título + taxonomia, 2 contra 1).
   Confirmar com a arquidiocese qual é o orago.

2. **Duas fichas com slug trocado.** A ficha de slug `paroquia-santo-afonso-maria-de-ligorio` tem título e
   endereço da **Paróquia São Francisco de Sales** (R. Pinto Dágua, 837, Recanto dos Pássaros); a de slug
   `paroquia-santo-afonso-maria-de-ligorio-2` é a **Paróquia Santo Afonso Maria de Ligório** (R. Eduardo
   Prado, 546, Vila Serradinho). Mapeei pelo título e pela taxonomia, não pelo slug. Os `notes` das duas
   registram o problema.

3. **Divergência de horário matriz ficha × CPT (36 unidades).** Ver a seção acima. Se o Parish quiser exibir
   horário de capela, vale pedir à arquidiocese a atualização do CPT `horario-missa` — ele está parado em
   março de 2024 enquanto as fichas são de 2026.

4. **Paróquia São Mateus — ficha vazia.** A página `/paroquias/paroquia-sao-mateus/` devolve só o título e
   "No results found": sem endereço, CEP, telefone, e-mail, ano de criação e pároco. A paróquia é real (está
   no CPT, na taxonomia e no seletor da página de horários, e tem 5 capelas com missa). Os 5 horários vieram
   do CPT. Buscar endereço por outra via (Receita Federal / redes sociais).

5. **11 locais de celebração sem paróquia identificável.** O CMS não lhes atribuiu termo da taxonomia e o
   nome é ambíguo demais para resolver com segurança, então **não entraram em nenhuma paróquia**:
   Capela Nossa Senhora do Rosário (3 missas); Capela Nossa Senhora Perpetuo Socorro (3);
   Capela Santa Rita de Cássia (3); Capela São João Batista (0); Capela Nossa Senhora do Loreto – Base Aérea
   de Campo Grande (2); Comunidade Irmã Dulce (1); Comunidade São Caetano de Thiene – Campo Grande (1);
   Capela Nossa Senhora de Caacupê – Assentamento Primavera (1); Capela Nossa Senhora Auxiliadora
   (Área Rural) (0); Capela Nossa Senhora Auxiliadora – Colégio Nossa Senhora Auxiliadora (0);
   Capela Nossa Senhora Aparecida (1 — há **duas** entradas homônimas no CPT, e nove paróquias têm uma capela
   com esse nome). Ao todo são ~19 linhas de horário fora do arquivo. Outros 16 órfãos **foram** resolvidos
   cruzando o nome com a lista "Comunidades" da ficha de cada paróquia.

6. **Ano de criação.** Não é data de cadastro do CMS (os valores vão de 1912 a 2024 e não se repetem em
   massa), mas 6 paróquias repetem **19/12/1956** (Corguinho, Rochedo, Terenos, Sidrolândia) — é
   plausivelmente a data do decreto que criou várias paróquias rurais de uma vez, não um artefato. Vale
   conferir se é mesmo o ano de ereção.

7. **Campos vazios na fonte:** sem telefone — 8 paróquias (N. Sra. da Conceição Aparecida/Bandeirantes,
   Divino Espírito Santo, Divino Paráclito, N. Sra. da Guia, Pessoal N. Sra. da Saúde, Santa Catarina V. M.,
   São Mateus, Quase-Paróquia Santo Expedito); sem e-mail — Capelania Militar, São José de Anchieta,
   São Mateus; sem pároco publicado — Cristo Rei, N. Sra. das Graças, Santo Agostinho de Hipona,
   São Martinho de Lima, São Mateus, Capelania Militar; sem CEP — Santa Catarina V. M. (endereço "BR-163,
   3010 - Anhanduí") e São Mateus.

8. **Endereço da Cúria.** O rodapé do site publica dois telefones diferentes para a mesma Cúria
   ((67) 9 8156-3340 e (67) 9 8457.1091, em blocos distintos da mesma página) e a página institucional traz
   (67) 3320-2800. Usei o fixo institucional.

9. **Paróquias com o mesmo orago em cidades diferentes** (slugs distintos porque incluem a cidade, mas vale
   checar no import): N. Sra. da Abadia existe em Campo Grande (santuário na Av. Afonso Pena) **e** em
   Sidrolândia — e ainda há a Catedral N. Sra. da Abadia e Santo Antônio de Pádua; N. Sra. da Conceição
   Aparecida existe em Campo Grande e em Bandeirantes; Senhor Bom Jesus existe em Campo Grande, Corguinho e
   Rochedo; Santa Rita de Cássia em Campo Grande e Jaraguari.
