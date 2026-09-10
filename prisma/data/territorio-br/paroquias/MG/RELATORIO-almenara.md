# Relatório de pesquisa — Diocese de Almenara (MG)

**Agente:** pesquisa de território BR — Vale do Rio Doce e Mucuri
**Data da coleta:** 2026-09-10
**Arquivo gerado:** `almenara.json`

## Resumo

| Métrica | Valor |
|---|---|
| Paróquias | **18** (todas `alta`) |
| Comunidades/capelas | 18 (só as matrizes — a diocese não publica comunidades) |
| Horários fixos | 62 (todos `baixa` — fonte única não oficial) |
| Cobertura | 18 encontradas / 18 publicadas pela diocese (19 no Catholic-Hierarchy e no GCatholic) |

## Fontes principais

1. **https://www.diocesedealmenara.org.br/paroquias/** — diretório oficial completo, agrupado por
   município, com **endereço, CEP, telefone, e-mail, pároco** e, em alguns casos, data de criação.
   Página com `modified` **2024-04-30** (API REST de páginas do WordPress).
2. **https://www.diocesedealmenara.org.br/foranias/** — as 5 foranias e seus vigários forâneos
   (também `modified` 2024-04-30).
3. **https://www.catholic-hierarchy.org/diocese/dalme.html** — erigida em 28/03/1981; 15.618 km²;
   176.808 hab., 143.224 católicos (81%, dados de 2023); **19 paróquias**; Dom José Hamilton de
   Castro desde 12/04/2023; Cúria na Praça João Pessoa 187, 39900-000.
4. **https://gcatholic.org/dioceses/diocese/alme0.htm** e `/churches/local/alme0` — desmembrada de
   Araçuaí e Teófilo Otoni; **19 paróquias e 2 missões**; lista de 22 igrejas por cidade
   (atualizada em 01/01/2026).
5. **Notícia oficial** — "Diocese de Almenara celebra a instalação de nova Paróquia em Palmópolis e
   posse do primeiro pároco" (08/12/2019), que a apresenta como **a 18ª paróquia da diocese**.
6. **https://www.horariodemissa.com.br** — agregador, consultado município a município (18 buscas),
   **única fonte de horários de missa encontrada**.

Observação técnica: o certificado do domínio faz o `WebFetch` falhar ("unable to verify the first
certificate"); a coleta foi feita com `curl -k` + UA de Chrome. O site é WordPress (tema ColorMag),
sem custom post type de paróquias — o diretório é uma página única.

## Foranias (5)

| Forania | Municípios | Vigário forâneo |
|---|---|---|
| Centro | Almenara, Bandeira, Jordânia | Pe. Fabrício Ferreira Rosa |
| Norte | Mata Verde, Divisópolis | Pe. Sebastião dos Santos Neto |
| Sul | Rubim, Rio do Prado, Palmópolis, Felisburgo | Pe. Gabriel Caetano Gondim Duarte |
| Leste | Salto da Divisa, Santa Maria do Salto, Santo Antônio do Jacinto, Jacinto | Pe. Gilberto Ângelo da Silva |
| Oeste | Jequitinhonha, Joaíma, Monte Formoso, Fronteira dos Vales | Pe. Vicente Rosa Corrêa, MSC |

17 municípios; Almenara tem 2 paróquias (Catedral e São Pedro Apóstolo) → 18 paróquias.

## Lacuna principal: horários de missa

A página **"Horários de Missas"** existe no site (`/horarios-de-missas-2/`, `modified` 2023-03-14) mas
está **vazia** — não tem nenhum conteúdo. Nenhuma paróquia tem página própria no site diocesano.

Por isso os horários vieram do **agregador horariodemissa.com.br** (18 consultas, uma por município),
que cobre **todas as 18 paróquias**. Como é fonte única e não oficial, **todos os 62 horários foram
gravados como `baixa`** — não entram na carga; ficam para o enxame de validação. Onde a recorrência é
mensal ("1º Domingo", "3º Sábado", "último sábado", "1º e 3º Domingo", "exceto no último sábado"), a
regra literal está em `notes`.

## Divergências encontradas (site diocesano × agregador)

| Paróquia | Divergência |
|---|---|
| Catedral São João Batista (Almenara) | Endereço: "Praça Alvimar dos Santos Lopes, 14" (oficial) × "Praça Benedito Valadares" (agregador) |
| São Pedro Apóstolo (Almenara) | "Rua Hélio Ferreira, 475" (oficial) × "Praça Dr. José Ponciano de Sena, 410" (agregador) |
| Nossa Senhora do Rosário (Felisburgo) | "Rua Dionízio Figueiredo, 35" × "Praça São Sebastião" |
| São José (Fronteira dos Vales) | Telefone (33) 3623-1434 × (33) 3623-1223 |
| Nosso Senhor Bom Jesus (Joaíma) | Telefone (33) 3745-1397 × (33) 3745-1752 |
| Nossa Senhora de Fátima (Mata Verde) | Só celular no site × telefone fixo (33) 3722-1298 no agregador |
| Senhor Bom Jesus (Rubim) | Telefone (33) 3746-1768 × (33) 3746-1340 |
| São Sebastião (Salto da Divisa) | Praça "Coronel Orozino" × "Orozimbo Peixoto" |
| Nossa Senhora da Conceição (Santa Maria do Salto) | Telefone (33) 3727-1130 × (33) 3727-1224 |
| Imaculada Conceição e Santo Antônio (Palmópolis) | O agregador a chama de "Comunidade Imaculada Conceição" e repete o telefone de Rio do Prado |

Em todos os casos foi gravado o dado **do site diocesano**, com a divergência registrada em `notes`.

## Pontos que precisam de validação humana

- **A 19ª paróquia**: Catholic-Hierarchy e GCatholic dizem **19 paróquias** (+2 missões), mas o site
  diocesano lista 18 e a notícia oficial de 2019 confirma Palmópolis como a **18ª**. O agregador
  registra, além da Paróquia São Miguel e Almas, uma **"Paróquia São Pedro" na Praça da Matriz, 22,
  distrito de São Pedro do Jequitinhonha** — candidata a 19ª paróquia (ou quase-paróquia/missão).
  **Não foi gravada.** O GCatholic ainda lista quatro igrejas que não são paróquias no diretório
  diocesano: Nossa Senhora da Ajuda e Santo Antônio (Almenara) e Santo Antônio e São José
  (Jequitinhonha).
- **CEP de Jacinto**: o site publica **39300-000** para a Paróquia Santo Antônio de Pádua, mas o CEP
  do município de Jacinto/MG é 39930-000. Gravado como publicado; corrigir na validação.
- **Erros de digitação da fonte**: "Fronteiras dos Vales" (por Fronteira dos Vales), "Santo Maria do
  Salto" (por Santa Maria do Salto), data de criação de Monte Formoso publicada como "00/01/2005"
  (gravado só o ano).
- **E-mail do vigário forâneo da Forania Leste** publicado na página de foranias
  (`claudioec@yahoo.com.br`) é o do pároco de São Pedro Apóstolo (Almenara) — provável erro da fonte.
- **Sem e-mail publicado** (7): Jacinto, Jequitinhonha, Joaíma, Jordânia, Palmópolis, Rio do Prado,
  Santa Maria do Salto.
- **Sem data de criação** (12 de 18): a fonte deixa o campo "Data de criação:" em branco.
- **Comunidades/capelas**: a diocese **não publica** nenhuma lista de comunidades. Todas as paróquias
  ficaram apenas com a matriz. É a maior lacuna do arquivo.
- **Administradores paroquiais** (2): Mata Verde (Pe. Sebastião dos Santos Neto, que é pároco em
  Divisópolis) e Palmópolis (Pe. Gabriel Caetano Gondim Duarte, que é pároco em Rubim). Outros três
  pares de paróquias dividem o mesmo pároco: Felisburgo/Rio do Prado (Pe. Alexandre Pereira Gomes) e
  Salto da Divisa/Santa Maria do Salto (Pe. Paulo Roberto de Oliveira).
- **Religiosos**: Capuchinhos (OFMCap) em Jacinto, Franciscanos (OFM) em Jequitinhonha e
  Missionários do Sagrado Coração (MSC) em Joaíma e Monte Formoso.
