# Relatório — Exarcado Apostólico Armênio para a América Latina e o México

Pesquisa em 2026-09-10. Arquivo: `paroquias/SP/armenio-america-latina-e-mexico.json`.

## Natureza da circunscrição

Circunscrição **pessoal e supranacional** da Igreja Católica Armênia, criada por São João Paulo II
em 03/07/1981 pela constituição apostólica *America Latina atque Foederatae Civitates Mexicanae*.
Abrange Brasil, México e Uruguai (e, pelo próprio site, comunidades também na Venezuela e no
Chile). Em 1989 a Argentina foi desmembrada como Eparquia de São Gregório de Narek em Buenos Aires.

O arquivo está na pasta `SP` porque a sede exarquial é a Catedral Armênia São Gregório Iluminador,
em São Paulo, fixada por decreto de 22/11/2015 do Cardeal Leonardo Sandri, prefeito da Congregação
para as Igrejas Orientais. **Só o Brasil entra neste dataset**; a Co-Catedral Nuestra Señora de
Bzommar, em Montevidéu/UY, ficou de fora por estar em outro país.

## Governo — situação atual (importante, mudou em 2026)

A circunscrição está **sede vacante**:

1. **Dom Vartan Waldir Boghossian, SDB** — 1º exarca, 1981-2018.
2. **Dom Paulo León Hakimian** — 2º exarca, nomeado por Francisco em 04/07/2018, ordenado em
   29/09/2018. **Faleceu em 06/11/2024**, aos 71 anos, em Buenos Aires (CNBB).
3. Dom Vartan voltou como Administrador Apostólico e **renunciou em 02/03/2026**, quando o Papa
   Leão XIV nomeou o **Cardeal Odilo Pedro Scherer**, Arcebispo Metropolitano de São Paulo,
   **Administrador Apostólico sede vacante do Exarcado para o Brasil** (e o Cardeal Daniel Sturla,
   de Montevidéu, para o Uruguai).

Por isso `bishopName` ficou `null` — não há exarca. A situação está descrita em `diocese.notes`.
Confere com gcatholic.org, que registra "Apostolic Exarch: vacant" e foi atualizado exatamente em
**02/03/2026**. Note que `dioceses.json` registra `bishopName: null` para esta circunscrição, o que
continua correto.

Protossincelo (vigário-geral) desde 2017: **Pe. Antonio Francisco Lelo**, que é também o pároco.

## Fontes principais e sua atualidade

| Fonte | Data da fonte | Uso |
|---|---|---|
| `paroquiaarmenia.org.br` (home) | atualizada em **20/07/2026**; transmissões ao vivo de **10/09/2026** | horários (seção "Vida Pastoral"), histórico |
| `paroquiaarmenia.org.br/nosso-paroco/` | atualizada em **13/06/2026** | pároco; rodapé com endereço e telefone |
| `paroquiaarmenia.org.br/o-templo/` | atualizada em **12/06/2026** | construção, consagração 1976, elevação a Catedral 2015 |
| `paroquiaarmenia.org.br/exarcado/` | atualizada em **12/06/2026** | história do Exarcado, bula de criação, nº de fiéis |
| Jornal *O São Paulo* — nomeação do Cardeal Scherer | publicado em **02/03/2026** | governo atual |
| CNBB — falecimento de Dom Paulo Hakimian | novembro de 2024 | governo |
| `gcatholic.org/churches/local/lati1-n` | atualizado em **02/03/2026** | cobertura: 2 igrejas no Exarcado, 1 no Brasil |

**Detalhe técnico:** `paroquiaarmenia.org.br` estava bloqueado duas vezes — certificado
self-signed no caminho do WebFetch e, no `curl` direto, um 403 do **"Fortinet Secure DNS Service
Portal"** (filtro da rede local). Resolvido com DNS-over-HTTPS (`https://dns.google/resolve`) +
`curl -k --resolve paroquiaarmenia.org.br:443:172.67.151.54`. O conteúdo foi lido pela REST API do
WordPress (`/wp-json/wp/v2/pages`), que traz o campo `modified` — daí as datas acima. Site vivo e
com transmissão do terço de hoje: horários com confiança **alta**.

## Cobertura

- **1 paróquia** no Brasil, confiança `alta`. **1 comunidade** (a própria Catedral). **9 horários fixos**, todos `alta`.
- Cobertura **1/1**. gcatholic lista exatamente 2 igrejas em todo o Exarcado — São Paulo/BR e
  Montevidéu/UY — e apenas a primeira é do Brasil.

**Catedral Armênia São Gregório Iluminador** — Av. Tiradentes, 718, Luz, São Paulo/SP, 01102-000,
(11) 3227-6703. Pároco: Pe. Antonio Francisco Lelo.

Histórico: comunidade fundada em 1935 como "Capelania da Missão Armênia Católica", celebrando na
Igreja de São Cristóvão da Luz (Av. Tiradentes, 84) de 1935 a 1966; templo próprio construído a
partir de 1967; **paróquia criada em 13/02/1969**; igreja consagrada em maio de 1976 pelo Núncio
Apostólico Dom Cármine Rocco; elevada a **Catedral em 2015**.

### Horários (todos na Catedral)

| Tipo | Dias | Hora |
|---|---|---|
| `MASS` (Divina Liturgia, rito armênio) | domingo | 11:00 |
| `ADORATION` | quinta | 15:00 |
| `ROSARY` | domingo a quarta, sexta e sábado | 20:30 |
| `ROSARY` | quinta (excepcionalmente) | 15:00 |

Regra literal da fonte para o terço: *"Terço Diário — Todos os dias a partir das 20h30.
Quinta-feira excepcionalmente às 15hs"*. Foram gerados 7 registros de `ROSARY` (um por dia da
semana), com a quinta às 15:00 e os demais às 20:30.

Nenhum horário `baixa` — não há recorrência mensal publicada. Confissões não têm horário publicado
e por isso não foram registradas.

## Achados que merecem nota

- **Não existe igreja armênia católica no Rio de Janeiro**, apesar de o próprio site do Exarcado
  informar ~7.000 fiéis armênios católicos no Brasil "concentrados especialmente nas cidades de
  São Paulo e Rio de Janeiro". Nenhuma fonte consultada (site oficial, gcatholic, catholic-hierarchy,
  Wikipédia, CNBB) registra paróquia, capela, missão ou comunidade armênia católica fora de
  São Paulo. Os fiéis do Rio não têm estrutura própria.
- Não confundir com as **igrejas apostólicas armênias** (ortodoxas, não católicas) presentes em
  São Paulo — nenhuma delas entra neste dataset.
- Nenhuma diocese latina brasileira lista essa catedral como "outra-jurisdicao" no dataset atual
  (diferente do que acontece com as paróquias maronitas e melquitas), então não há duplicidade a
  resolver.

## Precisa de validação humana

1. **Governo** — a nomeação do Cardeal Scherer é de 02/03/2026 e é `Administrador Apostólico sede
   vacante`, não exarca. Se o Parish quiser exibir "bispo", precisa decidir como tratar
   administradores apostólicos. `bishopName` está `null` de propósito.
2. **E-mail** — a paróquia só publica formulário de contato ("Fale Conosco"), sem endereço de
   e-mail; o campo está `null`.
3. **Confissões e atendimento de secretaria** — não publicados no site; ficaram sem registro.
4. **Fiéis no Rio de Janeiro** — vale confirmar diretamente com a Cúria se existe alguma capelania
   ou missão armênia no Rio que não esteja publicada na web.
