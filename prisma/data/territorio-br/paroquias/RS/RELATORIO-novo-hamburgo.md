# Relatório — Diocese de Novo Hamburgo (RS)

Pesquisa de **2026-09-10**. Arquivo de dados: `novo-hamburgo.json`. Todas as estatísticas abaixo
foram computadas do próprio JSON.

## Resumo

| Item | Quantidade |
|---|---|
| Paróquias | **49** (32 alta / 17 media / 0 baixa) |
| Comunidades/capelas | **259** (257 ativas + 1 desativada + 1 em construção) |
| Horários fixos | **440** (233 alta / 84 media / 123 baixa) |
| Cobertura | 49 / 49 esperadas (catholic-hierarchy, dado de 2023) — **100 %** |
| Cidades cobertas | 21 municípios |

> **Fonte única e suficiente:** cada paróquia tem ficha própria no site diocesano, com área pastoral,
> data de criação, pároco/vigários/diáconos, **tabela nominal de comunidades (nome, endereço e
> missas)**, horários da matriz, horários da secretaria, endereço e telefone. Não foi preciso
> recorrer a agregadores — **nenhum registro veio de horariodemissa.com.br, missas.com.br ou Google
> Maps**.

## Fontes principais

**53 URLs distintas**, todas acessadas em **2026-09-10**: as 49 fichas de paróquia mais 4 páginas
institucionais.

1. **`https://diocesenh.org.br/paroquias/<slug>/`** — 49 fichas, uma por paróquia. É a fonte de
   praticamente todo o arquivo; cada `sources` de paróquia, comunidade e horário aponta para a ficha
   correspondente e registra no título a **data da última revisão da página** (campo `modified` da
   API do WordPress).
2. `https://diocesenh.org.br/lista-de-paroquias/` — a lista, agrupada por área pastoral. O total foi
   confirmado pelo cabeçalho `X-WP-Total: 49` do endpoint `/wp-json/wp/v2/paroquias?per_page=100`.
3. `https://diocesenh.org.br/fale-conosco/` — Cúria: Rua Bela Vista, 151, **93344-240**, Bairro
   Primavera; (51) 3593-1755.
4. `https://diocesenh.org.br/governo/` — bispo, vigário-geral (Mons. Valnei Armesto), chanceler
   (Pe. Adilson José Selch) e o e-mail da diocese `diocese@diocesenh.org.br` (ofuscado por
   Cloudflare, decodificado do atributo `data-cfemail`).
5. `https://diocesenh.org.br/bispos/` — **Dom João Francisco Salm**, 5º bispo, nascido em 11/10/1952,
   nomeado em **19/01/2022**.
6. `https://www.catholic-hierarchy.org/diocese/dnoha.html` — ereção 02/02/1980, sufragânea de Porto
   Alegre, **49 paróquias** e 1 missão, 753.000 católicos (2023, Annuario Pontificio 2024).

### Critério de confiança

- **`alta`** — 32 paróquias cuja ficha foi revisada nos últimos 12 meses (`modified` ≥ 2025-09-10;
  30 delas em 2026).
- **`media`** — 17 paróquias cuja ficha só tem revisão de **2024**: Santa Terezinha (Campo Bom),
  São Miguel (Dois Irmãos), Imaculada Conceição (Igrejinha), São Pedro Apóstolo (Ivoti), Imaculada
  Conceição (Morro Reuter), N. Sra. de Lourdes (Nova Hartz), N. Sra. do Rosário (Novo Hamburgo),
  Santa Cristina e São João Batista (Parobé), Santa Joana Francisca de Chantal (Picada Café),
  N. Sra. da Imaculada Conceição (Rolante), N. Sra. Aparecida, N. Sra. Medianeira, Santo Inácio,
  São João Batista e São Jorge (São Leopoldo) e Senhor Bom Jesus (Taquara). É fonte oficial, mas
  **sem sinal de atualidade** — cabe no `media` do README, e os horários dessas 17 páginas herdaram
  a mesma nota (os 84 `media`).
- **`baixa`** — 123 horários, **todos de recorrência mensal ou quinzenal** (ver adiante).

## Cobertura

`coverage`: `parishesFound` 49, `parishesExpected` 49. Bate exatamente.

### Preenchimento por campo (de 49 paróquias)

| Campo | Preenchido | Nulo |
|---|---|---|
| `address` | 49 (100 %) | 0 |
| `zipCode` | 48 (98 %) | 1 |
| `phone` | 48 (98 %) | 1 |
| `neighborhood` | 47 (96 %) | 2 |
| `priestName` | 44 (90 %) | 5 |
| `foundedYear` | **21 (43 %)** | 28 |
| `email` | **0** | **49** |
| `website` | **0** | **49** |

Fundações de **1846** (N. Sra. da Conceição, São Leopoldo) a **2010**.

## Comunidades

- **259 comunidades nominais**, com endereço em 253 delas — o ponto forte deste arquivo. Média de
  **5,3 comunidades por paróquia**; as maiores: N. Sra. de Lourdes (Canela, 19), São Pedro Apóstolo
  (Ivoti, 17), São Pedro (Gramado, 17), N. Sra. do Rosário (Riozinho, 15), N. Sra. da Imaculada
  Conceição (Rolante, 15), N. Sra. Auxiliadora (Santa Maria do Herval, 12), São Miguel (Dois Irmãos,
  11) e Sagrada Família (Três Coroas, 11).
- **11 paróquias sem comunidade listada** (`communities: []`) — a ficha do site não traz a tabela.
- **2 comunidades entram com `status` que as mantém fora da carga** (ambas da Paróquia Sagrado
  Coração de Jesus): "Comunidade Nossa Senhora Medianeira" (`desativada` — a fonte diz "Capela
  desativada por tempo indeterminado", Novo Hamburgo) e "N. Sra. de Fátima" (`em construção`,
  Sapiranga).
- **19 comunidades receberam o bairro/localidade entre parênteses** para não colidirem com uma
  homônima da mesma paróquia — ou com um nome do qual seriam substring (o importador casa horário
  com comunidade por inclusão de texto). Ex.: "Santo Antônio (Linha 07/09)" / "(Palmito)" /
  "(Km 50)" em Riozinho; "São José (km 17)" vs. "São José Operário (Rio Branco)" em Rolante;
  "São João Batista (São João)" vs. "(Travessão BR116)" em Dois Irmãos; "Nossa Senhora Aparecida
  (Canudos)" vs. "(Vila Integração)" em Novo Hamburgo; "Sagrada Família (Presidente Lucena)" vs.
  "(Lindolfo Collor)" em Ivoti; "São José (Linha Nova)" em Gramado; "Nossa Senhora Aparecida
  (Ulisses de Abreu)" vs. "(Eugênio Ferreira)" em Canela.
- **Nenhuma comunidade foi marcada `isMatriz`** — o site separa "Horários de Missas Matriz" da
  tabela de comunidades, então o importador cria a matriz automaticamente.

## Horários

| Tipo | Total | alta | media | baixa |
|---|---|---|---|---|
| MASS | 431 | 229 | 81 | 121 |
| ADORATION | 4 | 3 | 0 | 1 |
| CONFESSION | 4 | 1 | 3 | 0 |
| ROSARY | 1 | 0 | 0 | 1 |
| **Total** | **440** | **233** | **84** | **123** |

- Por dia da semana: domingo 166, sábado 141, sexta 38, quarta 35, quinta 31, terça 21, segunda 8.
- Faixa: **05:30 às 20:00** (a mais cedo é a de sexta-feira em Sagrada Família, Três Coroas).
  Nenhum `time`/`dayOfWeek` malformado, nenhum duplicado, nenhum sem `sources`, nenhum `community`
  órfão.
- **Os 123 `baixa` são todos de recorrência mensal/quinzenal** ("1º e 3º sábados", "2º e 4º
  domingos", "1ª sexta-feira do mês", "a cada 15 dias", "domingos revezados") — o schema só guarda
  dia da semana, então ficam fora da carga. O texto original está no campo `notes`.
- **133 horários têm `notes`.**
- **10 paróquias sem nenhum horário** (a ficha não publica): Imaculada Conceição (Igrejinha),
  Imaculada Conceição (Morro Reuter), N. Sra. da Piedade (Novo Hamburgo), Santa Cristina e São João
  Batista (Parobé), Santa Joana Francisca de Chantal (Picada Café), N. Sra. Medianeira, Santo Inácio,
  São João Batista e São Jorge (São Leopoldo).
- **50 comunidades ativas ficam sem horário próprio** porque a coluna "Missas" da tabela vem vazia
  ou diz "Sem horários definidos": as 17 de Ivoti, as 15 de Riozinho, as 5 de São Lourenço Mártir
  (Nova Petrópolis), 9 das 12 de Santa Maria do Herval, 2 das 6 de Senhor Bom Jesus (Taquara),
  1 de São Pedro (Gramado) e 1 de São João Batista (Sapiranga).

## Pontos para o enxame de validação

1. **`email` e `website` nulos em 100 % das paróquias.** As fichas têm os rótulos "E-Mail" e as
   redes sociais, mas o campo de e-mail vem vazio em todas as 49 — o único endereço no HTML é o da
   diocese. **A página `/governo/` publica `catedral@diocesenh.org.br`**, o que sugere que existem
   e-mails `@diocesenh.org.br` por paróquia: vale pedir a lista à Cúria.
   Também não gravei as redes sociais: **43 paróquias têm Facebook próprio e 35 têm Instagram
   próprio** publicados na ficha (as demais apontam para os perfis da diocese). Se o schema vier a
   ter um campo de rede social, os links estão nas fichas.
2. **`foundedYear` só em 21 de 49** — o campo "Data de Criação" existe em apenas 21 fichas.
3. **5 paróquias sem sacerdote publicado ou com papel diferente de pároco:**
   - sem nenhum sacerdote: N. Sra. das Graças (São Leopoldo), N. Sra. de Fátima (Novo Hamburgo),
     Santa Teresinha (Taquara), São João Batista (Sapiranga), Senhor Bom Jesus (Taquara);
   - **N. Sra. da Imaculada Conceição (Rolante)** — gravei o *auxiliar* Pe. João Batista Blanke, o
     único sacerdote listado;
   - **São João Batista (São Leopoldo)** — gravei o *administrador* Mons. Valnei Armesto (que é
     também o vigário-geral da diocese).
4. **CEP com erro de digitação na fonte:** N. Sra. da Imaculada Conceição (Rolante) publica
   "CEP: 955690-000" (6+3 dígitos). Deixei `zipCode: null`; o correto para o centro de Rolante é
   provavelmente **95690-000** — confirmar antes de gravar.
5. **Telefone colado no endereço:** a ficha de N. Sra. Aparecida (São Leopoldo) traz "Avenida Barão
   do Rio Branco, 118.99579-7029 Scharlau" — o "99579-7029" é um celular grudado no número do
   imóvel. Removi do endereço; **não** foi gravado como telefone (a paróquia já tem o fixo
   (51) 3568-2760). Verificar se é um WhatsApp válido da paróquia.
6. **1 paróquia sem telefone:** N. Sra. de Caravaggio (Rolante).
7. **Erros de digitação nos nomes de comunidade, mantidos como a fonte publica:** "Noss Senhora de
   Lourdes" (Ivoti), "N. Sra de Caravaggrio" (Gramado, N. Sra. de Lourdes), "São Cristovão" (sem
   acento, Dois Irmãos), "Mãe do divino amor" (caixa baixa, Santa Maria do Herval), "São Valentin"
   (Gramado). Endereços truncados: "ua Vereador Alcides Pandolfo" (falta o R) e "Estrada Alto
   Rolando, 55 - at .R Rual" (ambos em Rolante), "Rural 5351 - Altura N 14150 da rua" (Rolante).
8. **Linha duplicada na fonte:** a ficha de São Pedro Apóstolo (Ivoti) lista "Sagrada Família – Rua
   Rudolfo Behne, 301. Centro - Lindolfo Collor" **duas vezes**; gravei uma só.
9. **Comunidades que não são capelas:** São José Operário (São Leopoldo) lista como "comunidades" o
   "Lar São Francisco", o "CCEI – Irmãs do Sim" e as "Irmãs Ministras dos Enfermos" — são casas
   religiosas/instituições com missa semanal, e entraram como comunidades porque é assim que a
   diocese as publica. Em São José Operário (Nova Petrópolis), "Linha Pirajá" tem endereço "Ponto de
   missa"; em Sagrada Família (Três Coroas), há "São José - ponto de missa". Decidir se pontos de
   missa devem virar comunidade no app.
10. **Duas paróquias homônimas na mesma cidade:** "Paróquia São José" em Novo Hamburgo — uma no
    distrito de **Lomba Grande** (Pe. Leandro Froehlich) e outra no bairro **Primavera** (Pe. José
    Francisco da Rosa Júnior). São paróquias distintas; os slugs saíram
    `sao-jose-lomba-grande-novo-hamburgo` e `sao-jose-primavera-novo-hamburgo`, e o importador
    acrescenta o bairro ao nome na carga.
11. **Cidade corrigida:** a ficha "Nossa Senhora Auxiliadora – Herval" fica em **Santa Maria do
    Herval** (é o que diz o endereço da própria ficha); gravei a cidade completa. "Herval" isolado
    corresponderia a outro município do RS, na diocese de Pelotas.
12. **Comunidades em outro município que o da paróquia** (normal na divisa, mas confirmar): as
    capelas de Sagrada Família (Novo Hamburgo) e de N. Sra. de Fátima (Novo Hamburgo) ficam em
    **Estância Velha**; várias de São Pedro Apóstolo (Ivoti) ficam em **Presidente Lucena** e
    **Lindolfo Collor**; uma de São José Operário (Novo Hamburgo) fica em **Campo Bom**. O
    importador grava a comunidade na cidade da paróquia.
13. **Tipos inferidos do texto corrido — reconferir:** as 4 CONFESSION vêm de Santa Terezinha (Campo
    Bom, "ATENDIMENTO DE CONFISSÕES – Terças, quintas e sextas: 18h30", 3 registros `media`) e de
    Sagrado Coração de Jesus (Estância Velha, "Confissões aos domingos, das 18h às 19h" → gravei
    18:00). As 4 ADORATION: quinta 07:00 em Estância Velha e em N. Sra. de Fátima (Novo Hamburgo)
    — nos dois casos o texto diz "das 7h às 19h"/"das 7hs à 18:30hs" e **gravei só o início da
    faixa**, com o texto completo em `notes` — mais Três Coroas (quinta 17:00) e São José Operário
    (São Leopoldo, 1ª sexta 15:00). O único ROSARY é o "9h oração do terço" do 1º sábado do mês em
    São José Operário (Nova Petrópolis).
14. **Horários da matriz que na verdade descrevem comunidades:** a ficha de N. Sra. de Fátima (Novo
    Hamburgo) não usa a tabela de comunidades — as três capelas (Bom Jesus, N. Sra. do Rosário e
    Santo Antônio, com endereço e missa) vêm dentro do texto de horários. Extraí as três à mão; se a
    paróquia tiver mais capelas, elas não aparecem.
15. **Homônimos entre cidades diferentes (sem conflito):** duas "Imaculada Conceição", duas "N. Sra.
    Aparecida", duas "N. Sra. da Conceição", duas "N. Sra. das Graças", duas "N. Sra. de Lourdes",
    duas "N. Sra. do Rosário", duas "Sagrada Família", três "Sagrado Coração de Jesus", três "São
    José Operário", três "São João Batista" e as duas "São José" já citadas.
16. **Duas paróquias entram sem missa de domingo:** N. Sra. de Caravaggio (Rolante, só sábado 18h —
    é o único horário que a ficha publica) e Sagrada Família (Três Coroas, cuja ficha só lista as
    missas de terça a sexta; as de fim de semana estão nas comunidades).
17. Nada a corrigir em: prefixos de nome (48 "Paróquia" + 1 "Catedral"), slugs (kebab-case ASCII,
    49 únicos), `state` (49 × "RS"), formato dos 48 telefones e dos 48 CEPs.
