# Relatório de pesquisa — Diocese de Marília (SP)

- **Arquivo**: `paroquias/SP/marilia.json`
- **Data da pesquisa**: 2026-09-10
- **Agente**: pesquisa de território BR — oeste paulista (onda SP)

## Resumo

| Métrica | Valor |
|---|---|
| Paróquias | **67** (todas `alta`) |
| Confiança das paróquias | 67 alta / 0 media / 0 baixa |
| Comunidades/capelas | 280 |
| Horários fixos | 642 (456 `alta`/`media` semanais, **186 `baixa`** de recorrência mensal) |
| Paróquias esperadas (Catholic-Hierarchy, anuário 2024) | 65 |
| Regiões pastorais | 3 (I: 29 paróquias, II: 21, III: 17) |

Cobertura estimada: **100%+** (67 fichas oficiais contra 65 esperadas — a diferença são duas
paróquias recentes: São João Bosco e Nossa Senhora Auxiliadora, criada em 31/01/2026, e Santo
Antônio de Sant'Anna Galvão, criada em 31/10/2023).

Campos preenchidos em todas as 67 paróquias: nome, cidade, endereço, CEP, telefone, e-mail, pároco.
Ano de fundação em 66 das 67 (falta a de Paulicéia). 2 paróquias têm site próprio.

## Fontes principais

1. **Site oficial** — https://diocesedemarilia.com.br
   - `/paroquias/` e as três páginas de região (`/paroquias/regiao-i|ii|iii/`).
   - **67 fichas** em `/paroquias/regiao-<n>/<slug>/`. Cada ficha traz: data de criação, pároco e
     vigários, endereço + CEP + cidade, telefone(s), e-mail, **"Horário das celebrações na Matriz"** e,
     na sequência, uma seção por capela/comunidade com endereço e horário próprios.
   - Coleta via `\/wp-json\/wp\/v2\/pages?per_page=100` (134 páginas, 67 de paróquia) — o
     `content.rendered` vem completo (o tema Uncode deixa os shortcodes visíveis mas o texto está lá).
2. **Catholic-Hierarchy** — https://www.catholic-hierarchy.org/diocese/dmarl.html (65 paróquias,
   ap2024; diocese erigida em 16/02/1952; cúria na Av. Nelson Spielmann 521, tel. (14) 3401-2360).
3. **Site oficial, página do bispo** — Dom Luiz Antonio Cipolini (nomeado em 08/05/2013).

## Decisões de confiança

- **Horários semanais**: `alta` quando a ficha foi modificada nos últimos 12 meses (data em
  `modified` da REST API) e `media` para as fichas mais antigas — 20 das 67 estão desatualizadas
  (as mais antigas são de janeiro/2024: Santuário São Judas Tadeu/Marília, Nossa Senhora Aparecida/
  Nova Guataporanga, Nossa Senhora das Mercês/Santa Mercedes e Santo Antônio de Sant'Anna Galvão/
  Dracena).
- **186 horários `baixa`**: recorrência **mensal** ("1ª sexta do mês", "2º e 4º domingo", "3ª quinta"),
  que não cabe no modelo `MassSchedule` (só dia da semana). A regra literal está em `notes` de cada
  horário. É o maior bloco desta diocese: praticamente **todas as capelas rurais** são atendidas
  1×/mês. Casos extremos:
  - **Santuário São José (Osvaldo Cruz)**: 17 comunidades, quase todas mensais ou quinzenais.
  - **Paróquia Nossa Senhora da Glória (Tupi Paulista)**: 12 capelas, 12 horários — **todos** mensais.
  - **Paróquia Santo Antônio (Junqueirópolis)**: 10 capelas, todas mensais.

## O que ficou faltando / foi descartado

- **Celebração da Palavra não foi gravada como missa.** Vários sábados/domingos em que a fonte diz
  explicitamente "nos outros sábados Celebração da Palavra" ficaram fora, e a observação foi copiada
  para `notes` do horário mensal correspondente. Casos: Paróquia São Pedro Apóstolo (Garça — 4
  capelas), Santuário São José (Osvaldo Cruz — 8 capelas) e Paróquia Nossa Senhora Aparecida
  (Flórida Paulista — Capela São João Batista).
  - **Capela Santo Antônio (Bairro Canguçu), Santuário São José de Osvaldo Cruz**: a fonte lista
    **apenas** Celebração da Palavra (1º domingo às 15h; 2º, 3º e 4º domingo às 8h). A comunidade foi
    registrada, mas **nenhum horário** — não há missa publicada.
- **Missas por dia do mês** (dia 19, 22, 25, 27, 28) não cabem nem no modelo semanal nem na
  recorrência mensal por ordinal; ficaram só em `notes` da paróquia. Ocorrem em: Santa Rita de
  Cássia/Marília (dias 19 e 22), Santuário São Judas Tadeu/Marília (dia 28), Santa Antonieta/Marília
  (dia 28), Nossa Senhora Aparecida/Dracena (dia 19) e Santo Antônio de Sant'Anna Galvão/Dracena
  (dias 25 e 27).
- **Bairro das comunidades**: gravei o endereço completo em `address` e deixei `neighborhood: null`,
  porque a ficha mistura rua e bairro numa linha só.
- **Vigários e diáconos**: as fichas os listam, mas o modelo tem um campo só — gravei apenas o pároco
  (ou administrador paroquial).
- **Horários de confissão/adoração**: só o Santuário Nossa Senhora da Glória (Marília) e a Paróquia
  São Francisco de Assis (Adamantina) publicam adoração/Hora Santa, e apenas o primeiro publica
  confissão — ambos mensais, gravados como `ADORATION`/`CONFESSION` com `baixa`.

## Pontos que precisam de validação humana

1. **Paróquia Nossa Senhora Aparecida – Paulópolis**: o site a lista como "Paulópolis", mas o endereço
   diz "Paulópolis (Pompéia)-SP". Paulópolis é **distrito do município de Pompéia**, então gravei
   `city: "Pompéia"` e `neighborhood: "Distrito de Paulópolis"`, com slug
   `nossa-senhora-aparecida-pompeia`. Precisa de confirmação — Pompéia também tem a Paróquia Nossa
   Senhora do Rosário (matriz da sede).
2. **Paróquia Nossa Senhora Auxiliadora – Avencas**: Avencas é **distrito de Marília**; gravei
   `city: "Marília"`, `neighborhood: "Distrito de Avencas"`.
3. **Nome da catedral**: o site a chama "São Bento (Catedral Basílica Menor) – Marília". Padronizei
   para **"Catedral Basílica Menor São Bento"** (slug `sao-bento-marilia`).
4. **Duas paróquias com o mesmo orago na mesma cidade** foram diferenciadas pelo próprio nome oficial:
   Paróquia Nossa Senhora de Fátima **(Bairro Jóquei Clube)** e **(Bairro Fragata)**, ambas em Marília.
5. **Capelas homônimas dentro da mesma paróquia** receberam sufixo entre parênteses para não colidir:
   duas "Capela São Vicente de Paulo" e duas "Capela Santo Antônio" no Santuário São José (Osvaldo
   Cruz); duas "Capela Nossa Senhora Aparecida" em Santa Cecília (Monte Castelo), Nossa Senhora da
   Glória (Tupi Paulista) e Santo Antônio (Junqueirópolis).
6. **Paróquia São Pedro (Paulicéia)**: a ficha **não** traz "Criada em"; `foundedYear: null`.
7. **Fichas desatualizadas** (`modified` anterior a set/2025) — horários gravados como `media`:
   Nossa Senhora Auxiliadora/Marília-Avencas, Nossa Senhora do Rosário/Pompéia, Nossa Senhora Rosa
   Mística/Marília, São Pedro Apóstolo/Garça, São Sebastião/Marília, Santuário Nossa Senhora de
   Lourdes/Garça, Santuário Sagrado Coração de Jesus/Vera Cruz, Santuário São Judas Tadeu/Marília,
   Catedral São Bento/Marília, São Miguel Arcanjo/Marília, Imaculada Conceição/Mariápolis, Nossa
   Senhora Aparecida/Queiroz, Nossa Senhora Aparecida/Rinópolis, Sagrada Família/Lucélia, Santo
   Antônio de Pádua/Adamantina, São Luíz Gonzaga/Iacri, Nossa Senhora Aparecida/Flórida Paulista,
   Nossa Senhora Aparecida/Nova Guataporanga, Nossa Senhora da Glória/Tupi Paulista, Santo Antônio de
   Sant'Anna Galvão/Dracena, Santo Antônio/Junqueirópolis, São Francisco de Assis/Dracena.
8. **Comunidades sem horário publicado** (registradas sem `schedules`): Comunidade São Pedro (Nossa
   Senhora de Guadalupe/Marília — só "4ª terça-feira", sem hora); Capela Santa Isabel/Dirceu (Santa
   Isabel/Marília — "2ª e 4ª sexta", sem hora); Capela Terra Nova (Nossa Senhora do Rosário/Pompéia —
   "uma vez por mês, dia a definir"); Capelas São João Batista e São Bento (Nossa Senhora Aparecida/
   Queiroz — "cada 2 meses"); as 5 comunidades urbanas de São Luíz Gonzaga/Iacri (a fonte diz
   "celebração nas casas", sem dizer se é missa).
9. **E-mails secundários** não gravados (o modelo tem um campo só): `paroquiasjosvaldocruz@gmail.com`
   (Santuário São José/Osvaldo Cruz) e `paroquiaguata22@outlook.com` (Nova Guataporanga) — estão em
   `notes`.
10. **Paróquia São José (Flora Rica)** usa a secretaria e o e-mail da Paróquia Santa Genoveva de
    Irapuru (mesmo pároco, Pe. Angelo José Biffi) — telefone e e-mail idênticos aos de Irapuru.
