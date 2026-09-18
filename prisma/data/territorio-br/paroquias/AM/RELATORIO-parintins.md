# Relatório — Diocese de Parintins (AM)

Pesquisa: 2026-09-17 · Arquivo: `parintins.json` · Regional Norte 1 da CNBB
Municípios: Parintins, Barreirinha, Boa Vista do Ramos, Maués e Nhamundá.

## Resultado

| Métrica | Valor |
|---|---|
| Entradas | **12** — 11 paróquias (`alta`) + 1 área missionária (`media`) |
| Comunidades/capelas | **39** (12 matrizes/sede + 27 comunidades: 4 `alta`, 23 `media`) |
| Horários fixos | **14**, todos `baixa` (só a Catedral, de fonte única e não oficial) |
| Cobertura | 11 paróquias encontradas / 11 esperadas (+ 1 área missionária) |

**A diocese não tem site.** O canal oficial é o Instagram `@diocesedeparintins`, que exige login e
não pôde ser lido; o Facebook devolve erro 400 a leitores automáticos. Nenhum domínio
`diocesedeparintins.*` resolve. É a circunscrição mais fraca desta rodada.

## Fontes principais

1. **Receita Federal via `minhareceita.org`** — filiais do CNPJ **04.594.537**, varridas de 0001 a
   0050. Além da mitra e de sete estabelecimentos já baixados (olaria, gráfica, hospital Padre
   Colombo, livraria…), há **exatamente 11 paróquias ativas (0009–0019), todas registradas em
   02/01/2024** — a diocese regularizou o cadastro de uma vez, com endereço e CEP de cada matriz. É a
   fonte de todos os endereços do arquivo.
2. **Rádio Alvorada** (`alvoradaparintins.com.br`, editoria "Diocese de Parintins") — a emissora é
   da própria diocese. Li os títulos das 280 notícias (2019 a fevereiro de 2025) e abri as que
   tratam de paróquias: criação da Paróquia São Pedro Apóstolo em Maués (instalação em 18/05/2024,
   com o decreto, o primeiro pároco e as cinco comunidades urbanas), elevação da Área Missionária
   São Francisco Xavier a paróquia (21/11/2021, 48 comunidades), posses em Nhamundá (16/01/2024) e
   Barreirinha (17/02/2024), e a programação de Natal de 2020, que cita comunidades de sete
   paróquias. **A editoria parou em 17/02/2025.**
3. gcatholic.org (11 paróquias em 31/12/2022; lista de 14 igrejas atualizada em 01/01/2026) e
   Wikipédia (11 paróquias).
4. Pontifícias Obras Missionárias (13/01/2021) e Arquidiocese de Goiânia (08/07/2025), para a Área
   Missionária N. Sra. do Rosário.
5. `horariodemissa.com.br`: 7 fichas nos cinco municípios, **todas de maio de 2013 e todas com
   "Nenhum horário de Missa informado"**. `buscamissa.com.br` não tem Parintins nem Maués.

## Prova de completude

Receita (11 filiais de paróquia) = gcatholic 2022 (11) = Wikipédia (11). A notícia de 20/05/2024 diz
que Maués, "após 191 anos, ganha a sua segunda circunscrição eclesial" — ou seja, as duas paróquias
de Maués deste arquivo são as únicas.

**Divergência com o gcatholic**: a lista de igrejas dele marca 14 como "Parish". Falta nela a
Sagrado Coração de Jesus (que a Receita, o Facebook e a emissora diocesana confirmam) e sobram
quatro que nenhuma outra fonte confirma: **N. Sra. de Fátima e Santa Luzia (Maués)** e **N. Sra. de
Lourdes e Santo Antônio (Mocambo)**. Não entraram. As de Maués devem ser igrejas de comunidade; as
de Mocambo/Caburi devem pertencer à área missionária abaixo.

## Área Missionária Nossa Senhora do Rosário (Mocambo) — `media`

Não tem CNPJ próprio nem entra na conta das 11 paróquias, mas duas fontes independentes a
descrevem: as POM (2021: "Área Missionária N. Sra. do Rosário (Comunidade de Caburi e Mocambo)") e a
Arquidiocese de Goiânia (07/2025: distrito de Mocambo, "20 comunidades — a maioria ribeirinhas",
estrada de 36 km até a Agrovila do Caburi, com "padre responsável pela missão"). Entrou como unidade
equivalente a paróquia, no mesmo critério das áreas missionárias de Manaus. A fonte não diz qual é
o templo-sede — a comunidade principal ficou como "Sede da Área Missionária…". **Validar nome do
responsável, sede e se já foi elevada a paróquia.**

## Comunidades (27, lista parcial)

- **Paróquia São Pedro Apóstolo (Maués)**: as quatro comunidades urbanas além da matriz, citadas no
  decreto de criação lido na instalação (N. Sra. Rainha da Paz/Mário Fonseca, São Francisco de
  Assis/Mirante do Éden, São Sebastião/Donga Michiles, Sagrado Coração de Jesus/Ramalho Júnior) —
  `alta`. As 63 comunidades rurais em 6 setores não têm lista publicada.
- **Outras 23** vêm da programação de Natal de 24/12/2020 da emissora diocesana, que cita só as
  comunidades que tiveram missa — `media`, com a nota de que a lista é parcial. São José Operário
  (6), São Francisco Xavier (5 de 48), São Sebastião (4), N. Sra. de Lourdes (3), N. Sra. Aparecida
  de Boa Vista do Ramos (3), Catedral (1) e Sagrado Coração (1).
- Barreirinha, Nhamundá e N. Sra. da Conceição de Maués ficaram só com a matriz.

## Horários

Só a **Catedral**, e `baixa`: o Portal Edilene Mafra (22/05/2022) publicou "Segunda-feira: 19h /
Terça a sábado: 6h e 19h / Domingo: 6h, 9h e 19h". É fonte única, não oficial e com mais de quatro
anos. Um resultado de busca atribuiu à catedral outra grade (ter–sex 17h, sáb 19h30, dom 7h/9h/18h),
mas ela vem do Instagram de uma paróquia homônima do Rio Grande do Norte — **descartada**.
A matéria "Horários das missas nas paróquias" da emissora diocesana é a programação de Natal e Ano
Novo de 2020, não grade fixa.

## Párocos (4)

| Paróquia | Pároco | Fonte |
|---|---|---|
| N. Sra. da Conceição (Maués) | Pe. Jânio Negreiros | Rádio Alvorada, 17/02/2025 |
| São Pedro Apóstolo (Maués) | Pe. Ozéias Pontes Cativo (1º pároco) | Rádio Alvorada, 20/05/2024 |
| N. Sra. do Bom Socorro (Barreirinha) | Pe. Marcílio Moutinho | posse em 17/02/2024 |
| N. Sra. da Assunção (Nhamundá) | Pe. Benedito Teixeira | posse em 16/01/2024 |

Todos com mais de 12 meses — conferir. O primeiro pároco de São Francisco Xavier (Pe. Alexander de
Brito Silva, 2021) **não** foi gravado: a fonte tem quase cinco anos.

## Precisa de validação humana

1. **Horários: nenhum confiável.** Buscar nas páginas oficiais — Catedral
   (`facebook.com/CatedraldePIN`), São Sebastião (`facebook.com/Paroquiasaosebastiaopin`), Sagrado
   Coração de Jesus (página no Facebook gravada em `website`) — e no Instagram da diocese.
2. **Telefones e e-mails: todos `null`.** A Receita repete o mesmo celular da mitra em todas as
   filiais; os telefones fixos do `horariodemissa` são de 2013 (Catedral (92) 3533-2965, Sagrado
   Coração 3533-1788, Lourdes 3533-2064, São José 3533-2066, Maués 3542-1373, Barreirinha 3531-7135,
   Nhamundá 3534-7118) — ficam aqui como pista, não no JSON.
3. **Bairro da Paróquia São José Operário**: a Receita diz "Centro" e o agregador diz "São José"
   para o mesmo endereço (Av. Nações Unidas) → `neighborhood: null`.
4. **Endereço da Catedral**: gravei o da Receita (Rua Clarindo Chaves, 330); o agregador diz "Praça
   da Catedral".
5. **Quatro igrejas do gcatholic** em Maués e Mocambo (ver acima) e a situação canônica da área
   missionária de Mocambo/Caburi.
6. **Dados da cúria**: mantive os do `dioceses.json` (Av. Amazonas, 2139; (92) 3533-5555). O site *A
   Missa no Brasil* dá (92) 3533-2965 / 3533-3459 e Caixa Postal 01, CEP 69151-970. Gravei o
   Instagram como `website` da diocese, por ser o único canal oficial.
7. `foundedYear`: só N. Sra. da Conceição de Maués (1798, "a primeira paróquia de Maués"), São
   Francisco Xavier (2021) e São Pedro Apóstolo (2024). **A data da Receita (02/01/2024) é a do
   cadastro fiscal, não a fundação**, e não foi usada.
