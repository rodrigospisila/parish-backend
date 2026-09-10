# Relatório — Diocese de Lorena (SP)

Pesquisa: 2026-09-10 · Arquivo: `lorena.json`

## Fontes principais

| Fonte | Uso |
|---|---|
| https://diocesedelorena.com/paroquias/ | Lista canônica agrupada em 4 setores (Vale Histórico e Climático, Lorena, Cruzeiro, Cachoeira Paulista) |
| https://diocesedelorena.com/wp-json/wp/v2/paroquias?per_page=100 | **REST API do WordPress** — `X-WP-Total: 30`, com o conteúdo completo de cada ficha e o campo `modified` (usado para calibrar a confiança dos horários) |
| https://diocesedelorena.com/paroquia/&lt;slug&gt;/ | Ficha de cada paróquia: pároco, diáconos, endereço, CEP, festas, secretaria, telefone, e-mail, redes, missas na matriz, confissões e missas nas comunidades/capelas |
| https://diocesedelorena.com/santuarios/ | 5 santuários da diocese com reitor, endereço, contato e horários |
| https://santuario.cancaonova.com/missas/ | Horários do Santuário do Pai das Misericórdias (a página diocesana só remete ao link) |
| https://www.catholic-hierarchy.org/diocese/dlore.html | Nº esperado (30 paróquias, Anuário Pontifício 2023), bispo, endereço da cúria |

## Números

- **34 entradas** gravadas: **30 paróquias** (1 delas a Catedral) + **4 santuários** não paroquiais.
  - 3 santuários publicam missas fixas → gravados com `"loadAsParish": true`
    (Nossa Senhora de Santa Cabeça e Pai das Misericórdias, em Cachoeira Paulista; São Benedito, em Lorena).
  - 1 santuário sem horário → `"status": "nao-paroquial"` (Dom Bosco, Lorena).
  - O **Santuário de São Miguel Arcanjo (Piquete)** é a própria matriz da Paróquia São Miguel
    Arcanjo (mesmo endereço, reitor e contato) — **não foi duplicado**, apenas anotado.
- **Confiança das entradas**: 34 `alta` (todas de fonte oficial diocesana).
- **Comunidades**: 140 (34 matrizes + 106 capelas/comunidades).
- **Horários**: 321 — 289 `MASS`, 27 `CONFESSION`, 5 `ADORATION`.
  Por confiança: 58 `alta`, 151 `media`, **112 `baixa`**.
- **Cobertura**: **30/30 paróquias (100 %)** — o total da REST API bate exatamente com o
  Anuário Pontifício 2023.
- Municípios cobertos: Arapeí, Areias, Bananal, Cachoeira Paulista, Canas, Cruzeiro, Cunha,
  Lavrinhas, Lorena, Piquete, Queluz, São José do Barreiro e Silveiras.

## Por que tantos horários `media` (e não `alta`)

O README exige "publicação oficial com sinal de atualidade (página ativa, post ≤ 12 meses)" para
`alta`. O campo `modified` da REST API mostra que **a maioria das fichas não é tocada desde
2022–2024**: só `lorena-nossa-senhora-da-piedade` (01/10/2025) está dentro de 12 meses — por isso
apenas a Catedral e o Santuário do Pai das Misericórdias (horários lidos hoje no site da Canção
Nova) ficaram `alta`. A data de cada ficha foi gravada em `sourceLastModified` de cada paróquia.
Reforça o diagnóstico o rodapé do site, que ainda avisa que o horário da cúria está reduzido
"em vista da pandemia da Covid-19".

## Registros com problema — precisam de validação humana

1. **Paróquia Santo Antônio de Pádua (Arapeí) — ficha trocada.** O conteúdo publicado é o da
   **Paróquia Sant'Ana (Areias)**: mesmo endereço (Praça Nove de Julho, 10, Areias), mesma
   padroeira nas festas ("Padroeira Senhora Sant'Ana") e mesmo secretário. Endereço, telefone e
   e-mail **não foram gravados**; os 17 horários e as 10 capelas ficaram com `baixa` e nota
   explicando o conflito. Curiosamente a ficha de Areias tem a seção "Missas" **vazia**, o que
   sugere que o conteúdo pertence mesmo a Areias.
2. **Paróquia Santo Antônio de Pádua (Piquete) — ficha contaminada pela Catedral.** O telefone
   publicado, `(012) 3153-1987`, é o da Catedral de Lorena; o Facebook linkado é
   `catedraldenossasenhoradapiedade`; e o bloco "Missas na Matriz" (segunda a sexta 06h30/09h30/
   12h/19h; sábado 06h30/16h/19h; domingo 06h15/08h/10h/18h/20h) é **idêntico** ao da Catedral.
   Telefone não gravado; os 13 horários desse bloco ficaram `baixa`. Os horários das comunidades
   (Senhor Bom Jesus, N. Sra. de Fátima, São Benedito, Santa Mônica, São Francisco) conferem com
   a lista de festas da própria paróquia e ficaram `media`.
3. **Pároco repetido em duas paróquias** (pode ser acúmulo real ou dado velho):
   Pe. Joaquim Lopes da Silva aparece em N. Sra. Aparecida (Cachoeira Paulista) **e** em
   N. Sra. de Fátima (Lorena); Pe. Amauri Gaioso, em N. Sra. dos Remédios (Campos de Cunha)
   **e** em Cristo Rei (Lorena); Pe. Valdecy Ferraz / Pe. Valdecy Alves da Silva Ferraz, em
   Queluz **e** em São José do Barreiro (parece a mesma pessoa, com nome grafado de dois jeitos).
4. **Telefone malformado**: São Pedro e São Paulo (Cruzeiro) publica "WhatsApp: (12) 93500-0778"
   — 9 dígitos com prefixo estranho; provavelmente `(12) 99350-0778`. Gravado como `null`.
   Essa paróquia também **não publica endereço**.
5. **Santuário do Pai das Misericórdias**: a página diocesana ainda dá como reitor
   **Mons. Jonas Abib, falecido em 2022**. `priestName` gravado como `null`.
6. **"Campos Novos de Cunha"**: a diocese trata como cidade; é distrito do município de **Cunha**.
   Gravado `city: "Cunha"`, `neighborhood: "Campos de Cunha"`.
7. **Missas mensais** — 112 horários `baixa`, quase todos de comunidades rurais atendidas uma vez
   por mês ("1ª quarta-feira do mês", "2º e 4º sábado", "1º, 2º e 4º domingo"). A regra literal foi
   copiada em `notes`. Casos especiais: em N. Sra. dos Remédios a fonte diz "cada mês a missa é em
   duas das três capelas"; em Santa Rita e São Sebastião (Cruzeiro) o esquema é "toda terça na
   Capela Cristo Rei, **ou** na 1ª terça na Capela N. Sra. do Carmo" — foram gravadas as duas
   pernas, a semanal com `media` e a exceção mensal com `baixa`.
8. **Celebração da Palavra descartada**: Silveiras publica "Segunda-feira: (Celebração da Palavra)"
   — não é missa, não foi gravada.
9. **Horários sem hora**: São José do Barreiro publica "Sexta-feira: 1ª Missa – Formoso" e
   "Sábado … 3ª Zona Rural (Onça)" sem horário — não gravados (as comunidades sim).
10. **Faixas de confissão**: a fonte publica intervalos ("09h às 11h e 14h às 16h"). Foi gravada
    uma entrada `CONFESSION` no início de cada intervalo, com a faixa literal em `notes`.

## O que ficou sem cobertura

- **12 paróquias sem nenhum horário publicado** na fonte oficial (não foram buscados agregadores,
  por prioridade de orçamento): São João Batista (Queluz); N. Sra. Aparecida, N. Sra. da Conceição
  (Embaú), Santo Antônio de Pádua e São Sebastião (todas em Cachoeira Paulista); Imaculada
  Conceição (Cruzeiro); Cristo Rei, N. Sra. Aparecida, N. Sra. das Graças, N. Sra. de Fátima,
  Santo Antônio de Pádua e São Pedro Apóstolo (todas em Lorena). Chama a atenção que **6 das 8
  paróquias da cidade-sede** estejam nessa lista.
- `foundedYear` — o site não publica ano de criação de nenhuma paróquia; todos ficaram `null`.
- Terços (`ROSARY`) — nenhuma fonte oficial publica.
