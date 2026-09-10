# Arquidiocese de Uberaba (MG) — relatório de pesquisa

- **Arquivo**: `paroquias/MG/uberaba.json`
- **Data da pesquisa**: 2026-09-10
- **Agente**: pesquisa do território — Triângulo Mineiro (Uberaba / Uberlândia / Ituiutaba)

## Resumo

| | |
|---|---|
| Paróquias no arquivo | **69** (58 paróquias, 5 quase-paróquias, 5 santuários/basílicas, 1 catedral) |
| Confiança das paróquias | 69 alta, 0 media, 0 baixa |
| Cidades/localidades | 22 |
| Foranias | 9 |
| Comunidades/capelas | **322** (todas `alta`) |
| Horários fixos | **668** — 498 alta, 25 media, 145 baixa |
| Tipos de horário | 586 MASS, 33 ADORATION, 29 ROSARY, 20 CONFESSION |
| Paróquias sem nenhum horário | 0 |

Cobertura: **69 encontradas / 61 esperadas** pelo Anuário Pontifício 2023 (dado de 2022) no
catholic-hierarchy.org. O excedente são as 5 quase-paróquias e os santuários que o site
arquidiocesano lista junto das paróquias, mais erecções posteriores a 2022. Não há indício de
paróquia faltando: as 4 páginas da listagem oficial foram percorridas até o fim (20+20+20+9).

## Fontes principais

| Fonte | Uso |
|---|---|
| https://arquidiocesedeuberaba.com.br/paroquias (+ `/paroquias/2`, `/3`, `/4`) | lista completa, paginada de 20 em 20 |
| https://arquidiocesedeuberaba.com.br/paroquia/&lt;slug&gt; (69 páginas) | nome, ano de criação, cidade, forania, e-mail, telefone, endereço, expediente da secretaria, clero e o bloco **Expediente** com os horários |
| https://www.catholic-hierarchy.org/diocese/duber.html | nº esperado de paróquias, endereço/CEP da Cúria, arcebispo |
| https://cnbbleste2.org/arquidiocese-de-uberaba/ | corroboração institucional |

**Nota de método**: o domínio `arquidiocesedeuberaba.org.br` (o que aparece no rodapé e no
Google) **não resolve DNS**; o site vivo é `arquidiocesedeuberaba.com.br`. Requisições `HEAD`
são redirecionadas para `/404` — só `GET` com User-Agent de navegador funciona. A listagem é
renderizada no servidor, sem API JSON; a paginação é por caminho (`/paroquias/2`), não por
query string. A notícia mais recente da home é de 25/08/2026, o que sustenta o sinal de
atualidade exigido para `alta` nos horários.

## Como os horários foram lidos

Cada página tem um bloco `Expediente` em texto livre com seções em caixa alta:
`MISSAS NA MATRIZ`, `ADORAÇÃO AO SANTÍSSIMO`, `CONFISSÕES`, `TERÇO …`,
`CAPELA(S) URBANA(S)/RURAL(IS)`, `COMUNIDADE(S) URBANA(S)/RURAL(IS)/RELIGIOSA(S)`, `SETORES`.
Seções de `BATIZADOS`, `CASAMENTOS`, `CURSO DE NOIVOS`, `CATEQUESE`, `PREPARAÇÃO…`,
`ATENDIMENTO`, `LOJA` e `OBRA SOCIAL` foram **ignoradas** (não são horário litúrgico fixo).

Regras aplicadas:

- Linhas com dois pares dia+hora (`Missas: Domingo 11h e Quinta-feira 19h`) são divididas por
  dia — não viram produto cartesiano.
- Intervalos (`Terça à sexta-feira, de 14h30 às 17h`) gravam **só o horário de início**, com a
  regra literal em `notes` e confiança `media` (25 registros, quase todos CONFESSION/ADORATION).
- Recorrência **mensal** (`1ª Sexta-feira do mês`, `último sábado do mês`, `todo dia 22`) →
  `confidence: "baixa"` com o texto original em `notes` (**145 registros**). Este é o maior
  bloco que não entra em produção — o modelo `MassSchedule` só tem dia da semana.
- Missas mensais **sem dia da semana** (`Missas: dia 22 de cada mês às 19h`,
  `Todo dia 27: 19h30 (Terço)`) não geram registro nenhum: não há `dayOfWeek` possível.
  São poucas dezenas e ficam perdidas — anotado aqui para a decisão de produto pendente.
- Quando uma seção `COMUNIDADES RURAIS` traz um horário comum antes da lista numerada
  (ex.: Prata — "Missas às terças e quartas-feiras às 19h30m"), ele é replicado para todas as
  comunidades daquela seção.

## Regras de nome aplicadas

- `Quase Paróquia …` → `Quase-paróquia …` (forma que o `import-territorio.ts` reconhece).
- Sufixo de cidade entre parênteses removido quando igual a `city`
  (`Paróquia São José (Araxá)` → `Paróquia São José`, city `Araxá`).
- Sufixo de **bairro** mantido, porque desambigua homônimas na mesma cidade:
  `Paróquia São José (Gameleira)` e `Paróquia São José (Tutunas)`, ambas em Uberaba.
- `Paróquia do Sagrado Coração de Jesus e de Santo Antônio e São Sebastião – Catedral
  Metropolitana de Uberaba` → **`Catedral Metropolitana do Sagrado Coração de Jesus e de Santo
  Antônio e São Sebastião`** (prefixo padronizado, cidade fora do nome).
- Mantidos verbatim: `Basílica Santuário do Santíssimo Sacramento Apresentado Pelo Patrocínio de
  Maria` (Sacramento), `Santuário Basílica de Nossa Senhora D'Abadia` (Uberaba),
  `Santuário Basílica de Nossa Senhora da Abadia Água Suja` (Romaria),
  `Santuário São Domingos de Gusmão` (Araxá), `Santuário da Medalha Milagrosa` (Uberaba).

## Distribuição por forania

| Forania | Paróquias |
|---|---|
| Araxá | 10 |
| Frutal | 10 |
| Catedral | 9 |
| Nossa Senhora das Graças | 9 |
| Ressurreição | 8 |
| Nossa Senhora da Abadia | 7 |
| Conceição das Alagoas | 6 |
| Sacramento | 6 |
| Romaria | 4 |

(A forania não é campo do formato do dataset; fica registrada só aqui.)

## Precisa de validação humana

1. **Duas "cidades" que são distritos.** O site trata como município:
   - `Aparecida de Minas` (1 paróquia) — é **distrito de Frutal**;
   - `Ponte Alta` (1 paróquia) — é **distrito de Uberaba**.
   Mantive o rótulo oficial em `city` para não inventar; se o Parish precisa de município IBGE,
   corrigir para `Frutal` / `Uberaba` com o distrito em `neighborhood`.
2. **Nenhum CEP** foi publicado — os 69 registros têm `zipCode: null`.
3. **Telefone malformado** (1): Paróquia Nossa Senhora de Lourdes (Conquista) —
   `"Pastoral (34) 98407-6294 Simone / (34) 98447-1686"` (texto livre com nome de pessoa).
   Outros trazem dois números separados por `/`, normalizados para `(DD) NNNNN-NNNN`.
4. **Sem e-mail** (2): Paróquia São Sebastião (Tapira) e Paróquia São Miguel (Veríssimo).
5. **Sem ano de criação** (1): Quase-paróquia São Miguel Arcanjo (Uberaba).
6. **`website` sempre `null`.** O site arquidiocesano não publica site próprio de paróquia, só
   Facebook/Instagram — que existem para quase todas e podem ser colhidos numa 2ª passada.
7. **Comunidades que não são capelas de território** — entraram porque o Expediente as lista com
   missa pública, mas convêm revisão: `Colégio São Domingos` e `Congregação das Irmãs Dominicanas`
   (Santuário São Domingos de Gusmão/Araxá), `Congregação das Irmãs Ursulinas de São Jerônimo de
   Somasca` e `Congregação dos Religiosos Somascos` (Nossa Senhora das Graças/Uberaba),
   `Congregação dos Sagrados Corações de Jesus e Maria` (Santa Cruz e N. Sra. das Dores/Uberaba),
   `Irmãs Franciscanas de Nossa Senhora do Amparo` e `Centro de Assistência Social Pe. Antônio
   Borges` (Basílica de Sacramento), `Casa de Nazaré` (Santo Antônio de Pádua/Araxá),
   `Casa do Pão "Imaculada Conceição"` (Conceição das Alagoas), `Casa de Acolhimento São Pio`
   (Santa Bárbara/Uberaba), `Hospital da Beneficência Portuguesa` (São Domingos/Uberaba).
   Como são **comunidades** e não paróquias, o `isNonParishUnit` do importador não as filtra —
   se o Parish não quiser casas religiosas e hospitais na lista de comunidades, precisam ser
   removidas à mão.
8. **Referência cruzada gravada como endereço**: na Basílica de Sacramento, a comunidade rural
   `Desemboque` ficou com `address: "Paróquia Nossa Senhora do Desterro"` — é um ponteiro para a
   paróquia vizinha, não um endereço.
9. **8 paróquias só com a matriz** (nenhuma capela/comunidade publicada): N. Sra. do Desterro
   (Sacramento), Catedral Metropolitana, Santa Edwiges, São Mateus, da Ressurreição, de São João
   Batista, do Santíssimo Sacramento e Quase-paróquia São Miguel Arcanjo (todas em Uberaba).
   Pode ser real (paróquias urbanas centrais) ou apenas ausência de publicação.
10. **Paróquia Nossa Senhora do Desterro (Sacramento)** tem 1 único horário, mensal
    (`3ª Quinta-feira do mês, às 19h`) — na prática fica **sem horário em produção**. O próprio
    site diz que a secretaria é a da Basílica do Santíssimo Sacramento.
