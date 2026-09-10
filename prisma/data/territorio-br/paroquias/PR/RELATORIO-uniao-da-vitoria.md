# Relatório — Diocese de União da Vitória (PR)

Data da pesquisa: 2026-09-10. Arquivo de dados: `uniao-da-vitoria.json`.

## Fontes principais

| Fonte | Uso | Confiança |
|---|---|---|
| https://www.dioceseunivitoria.org.br/paroquias/ | Lista oficial: 25 paróquias em 5 setores (Catedral, Sagrada Família, São Mateus, Bituruna, Rio Azul) | alta |
| https://www.dioceseunivitoria.org.br/paroquias-setores/ | Mesma lista por setor (URLs alternativas de 3 páginas) | alta |
| https://www.dioceseunivitoria.org.br/paroquias/<slug>/ (25 páginas) | Nome, endereço, CEP, telefone, clero (pároco/vigário/administrador paroquial/diáconos), data de criação, comunidades (11 paróquias), horários de missa (24 paróquias) | alta |
| https://www.dioceseunivitoria.org.br/a-diocese/ | Endereço/telefone da Mitra; administrador diocesano Pe. Antônio Carlos Rodrigues; vigário geral, chanceler, ecônomo | alta |
| https://pt.wikipedia.org/wiki/Diocese_de_União_da_Vitória | Criação 03/12/1976; 25 paróquias, ~450 comunidades, 13 municípios; sede vacante desde 2025, administrador desde 22/01/2026 | media |
| https://gcatholic.org/dioceses/diocese/unia0.htm | 25 paróquias (31/12/2022); Dom Walter Jorge Pinto 09/01/2019–07/11/2025; sede vacante | media |

Não consultados/indisponíveis: catholic-hierarchy (`dundv.html`, HTTP 429 em três tentativas);
Anuário Católico; agregadores de horários (desnecessários — as páginas oficiais trazem os horários).

## Cobertura

- **Encontradas: 25. Esperadas: 25** (site oficial, Wikipédia e GCatholic coincidem).
- Municípios cobertos (13/13): União da Vitória (9 paróquias), Porto Vitória, Cruz Machado (2: sede e
  distrito de Santana), Paula Freitas, São Mateus do Sul (3), São João do Triunfo, Mallet (2: sede e
  distrito de Rio Claro do Sul), Antônio Olinto, Bituruna (2: sede e distrito de Santo Antônio do
  Iratim), General Carneiro, Rio Azul, Rebouças, Paulo Frontin.
- Confiança das paróquias: **25 alta**, 0 media, 0 baixa (todas com página oficial ativa).
- Comunidades: **120** (10 matrizes nomeadas; 116 alta, 4 media) em 11 paróquias; **15 paróquias** sem
  lista nominal na página (São Mateus/Sant'Ana 34, Santa Bárbara 15 capelas, Rio Claro do Sul 14,
  Porto Vitória 13 — só a Capela São José nomeada — e Rebouças 22 capelas rurais).
- Horários: **119** (118 MASS, 1 ADORATION): 117 alta, 2 media; 10 com regra mensal em `notes`.
  Uma paróquia sem horários publicados: São Sebastião Mártir (União da Vitória).

## Decisões de nomenclatura e território

- `Catedral Sagrado Coração de Jesus e Nossa Senhora Aparecida` — nome do cabeçalho da página oficial
  (a lista por setores chama só "Catedral Sagrado Coração de Jesus"); slug
  `sagrado-coracao-de-jesus-uniao-da-vitoria`.
- Distritos gravados em `city` do município + `neighborhood`: Santana → Cruz Machado
  (`santana-cruz-machado`); Rio Claro do Sul → Mallet (`nossa-senhora-do-rosario-mallet`); Santo Antônio
  do Iratim → Bituruna (`santo-antonio-bituruna`).
- `Paróquia e Santuário Diocesano Nossa Senhora do Rosário` (Rio Claro do Sul) — nome da lista oficial.
- `bishopName` = "Sede vacante (administrador diocesano: Pe. Antônio Carlos Rodrigues, desde 22/01/2026)"
  — Dom Walter Jorge Pinto deixou a sede em 07/11/2025 (GCatholic).
- `priestName` traz os cargos entre parênteses como publicados (pároco, vigário, administrador
  paroquial, colaborador); diáconos permanentes não foram gravados.
- Comunidades sem orago na fonte foram nomeadas "Capela <localidade>" (São Mateus, Antônio Olinto) ou
  "Comunidade <localidade>" (Perpétuo Socorro – SMS, São Sebastião Mártir).

## Horários — regras aplicadas

- Todos vêm das páginas oficiais das paróquias no site diocesano (ativo em 2026). "Segunda a sábado" e
  "terça a sábado" foram expandidos em um registro por dia.
- **Media** (2): Cruz Machado quarta 19h ("Novena do Perpétuo Socorro" listada entre as missas) e
  Perpétuo Socorro – SMS terça 19h ("Terço dos Homens" listado entre as missas) — confirmar se há missa.
- **Gravados com nota de regra mensal** (10, todos "1ª sexta-feira do mês"): N. Sra. do Rocio 16h;
  Sant'Ana (Cruz Machado) 14h30; São Mateus 19h; São João do Triunfo 19h; Rio Claro do Sul 19h; Antônio
  Olinto 18h; Santa Bárbara 19h; Rebouças 19h; Paulo Frontin 15h (missa e adoração); Mallet 19h.
- N. Sra. do Rocio: adoração quinta 18h30 gravada como ADORATION, seguida da missa das 19h.
- **Não gravados**: batizados (2º domingo, sábados após a missa), cursos de pais e padrinhos,
  expedientes de secretaria.

## Dúvidas / validação humana

1. **E-mails**: o site ofusca todos os e-mails (proteção Cloudflare "[email protected]"); ficaram
   `null` em 24 paróquias. Só Paulo Frontin (`paroquiasaojoaquimesantana@gmail.com`) estava legível. O
   e-mail da Mitra (`mitra@dioceseunivitoria.org.br`) foi lido no trecho indexado do site oficial.
2. São Cristóvão e N. Sra. da Salette: a página só nomeia o vigário (Pe. Rafael Cosme Tessitori, MS);
   pároco não informado.
3. Antônio Olinto: "Água Amarela de Cima, do Meio, de Baixo" foi interpretado como três capelas
   (as duas últimas com confiança media); endereço da matriz sem número na fonte.
4. N. Sra. das Dores: comunidade "Bela Vista" só tem o nome do bairro (media).
5. General Carneiro: "comunidade em formação no bairro São Miguel" não foi gravada (sem nome).
6. Rio Claro do Sul: a página lista Pe. Antônio Carlos Rodrigues como pároco e Pe. Nelson José Kovalski
   como administrador paroquial — o primeiro é o administrador diocesano; conferir quem responde pela
   paróquia.
7. São Sebastião Mártir: sem horários na página; buscar no Facebook/Instagram da paróquia.
8. Nenhuma página informa horário de confissão ou terço (exceto o Terço dos Homens da nota acima).
9. Padres refletem as páginas em 10/09/2026; com a sede vacante, conferir nomeações de 2026.
