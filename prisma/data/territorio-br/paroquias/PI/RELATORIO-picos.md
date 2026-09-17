# Diocese de Picos (PI) — relatório de pesquisa

- **Arquivo**: `paroquias/PI/picos.json`
- **Data da coleta**: 2026-09-17
- **Cobertura**: **31 / 27 — todas `alta`**: 28 paróquias (a Catedral incluída) + 3 áreas pastorais
  (Geminiano, Caridade do Piauí, Alagoinha do Piauí). O Anuário Pontifício 2024 dá 27; a 28ª é Nossa
  Senhora do Carmo (Picos), elevada em 2025
- **Comunidades**: **678** (31 matrizes + **647 comunidades** tiradas das fichas oficiais) — 30 das 31
  fichas publicam a lista; só São José do Piauí não tem
- **Horários fixos**: 53 — 9 `alta`, 5 `media`, 39 `baixa`. **Só 4 das 31 fichas publicam horário**
  (Catedral, São Francisco de Assis/Picos, Acauã e Alagoinha); o resto veio de agregador
- 28 municípios com sede de unidade

## Fontes principais

| Fonte | Uso |
|---|---|
| `https://dp15.com/wp-json/wp/v2/paroquia?per_page=100` | Lista canônica: 31 posts `paroquia`, com `modified` e o zonal (taxonomia `local_paroquia`, 8 zonais) |
| Ficha HTML de cada paróquia (`https://dp15.com/paroquia/<slug>/`) | Zonal, ano de criação, festa do padroeiro, telefone, e-mail, secretário(a), atendimento, endereço com CEP, **"Horários de Missa"** (quando há) e **"Comunidades"** |
| `…/wp-json/wp/v2/clero` + 43 fichas HTML do clero | "Pároco da Paróquia" / "Função na Diocese" — as fichas de paróquia **não** mostram o pároco |
| `https://minhareceita.org/<cnpj>` | **Prova de completude**: filiais 0002–0029 do CNPJ 06.782.957 (Diocese de Picos) |
| `liriocatolico.com.br` (12 fichas), `horariodemissa.com.br` (19 fichas, todas de 05–06/2013) | Horários `baixa` |
| `https://www.catholic-hierarchy.org/diocese/dpico.html` | 27 paróquias (AP 2024, dados de 2023) |

Mesma plataforma de Campo Maior (Parresia): a REST só dá a lista; os dados estão em campos
personalizados renderizados no HTML, então as 31 fichas e as 43 do clero foram baixadas e lidas.

## Como a lista foi fechada

31 fichas no site. Três têm título "Área Pastoral"; outras três guardam o slug antigo
(`area-pastoral-nossa-senhora-do-carmo`, `area-pastoral-sao-joao-batista`,
`area-pastoral-nossa-senhora-de-fatima`) mas já são paróquia no título e no ano de criação.

A **Receita Federal confirma 28 paróquias**: a matriz do CNPJ (0001, Rua Padre Madeira, 380) e
**28 filiais ativas (0002–0029), uma por paróquia, sem sobra** — a última é N. Sra. do Carmo, aberta em
03/09/2025. A varredura foi até a ordem 0054 sem achar mais nada. As três áreas pastorais não têm
CNPJ, como esperado. A filial também consertou o CEP de São Julião, que a ficha traz malformado
("6470-000" → 64670-000).

**Áreas pastorais sem ficha própria**, só citadas dentro de outra paróquia — ficaram como comunidades
e estão listadas aqui para o enxame: **São José (Caldeirão Grande do Piauí)**, com 16 comunidades,
dentro da Paróquia São Cristóvão de Marcolândia (é atendida pelo vigário Pe. Fernando Amando de
Sousa); **Wall Ferraz** e **Paquetá**, marcadas "(ÁREA PASTORAL)" na lista de Santa Cruz do Piauí; e a
"Área Pastoral São Pedro" de **Santana do Piauí**, que só aparece numa ficha de 2013 do Horário de Missa.

## Comunidades: como as 647 foram lidas

Cada paróquia escreve a lista de um jeito — foram 7 formatos: `Localidade (Padroeiro – Dia da
Festa…)`, `Padroeiro (Localidade)`, `Localidade – Padroeiro: festa`, `Padroeiro – Localidade`,
`Localidade: Padroeira X, festa…`, lista corrida separada por vírgulas e lista simples. Convenção
adotada: **`name` = "Comunidade <Localidade>"**, `neighborhood` = a localidade, e o padroeiro, o
setor/município do cabeçalho e outras marcas vão em `notes`. O que saiu da lista:

- a sede ("(sede)", "(Matriz)", o próprio nome do município) — já é a igreja-matriz;
- 3 comunidades marcadas "(INATIVA)" em Santa Cruz do Piauí;
- duplicatas literais (Lagoa Grande em Bocaina; Ponta do Morro em Santa Cruz);
- em São Francisco de Assis (Picos), o **Setor III inteiro (Geminiano)** e mais duas comunidades
  (Assentamento Bem-te-vi e Samambaia dos Marques): a ficha é de 09/2024 e todas já estão na ficha da
  Área Pastoral de Geminiano, de 08/2025.

Homônimas dentro da mesma paróquia foram separadas pelo qualificador da própria fonte ("Maria Preta
(data Serra Vermelha)" × "(data Serra Branca)" em Paulistana; "Serra dos Pereiros" com padroeiros
diferentes em Marcolândia). Sedes de outro município atendido pela paróquia vêm marcadas "(cidade)" na
fonte e ganharam nota: Belém do Piauí, Francisco Macedo, Sussuapara, Jacobina, Massapê.

## Horários: regra aplicada

- `alta` — ficha oficial atualizada há menos de 12 meses: **Catedral** (14/09/2026): segunda a sábado
  19h, domingo 9h, 17h e 19h. O agregador e até a ficha de 2013 dão a mesma grade.
- `media` — ficha oficial de 09–10/2024: São Francisco de Assis/Picos (quarta e domingo 19h na
  matriz; o agregador confirma), Acauã (quarta e domingo 19h30) e Alagoinha (domingo 17h).
- `baixa` — (a) as 12 missas **mensais** das capelas da São Francisco de Assis ("1º domingo", "3ª
  terça-feira", "todo dia 16"…) e "dias 13 de cada mês" na Catedral; (b) só o Lírio Católico: São José
  Operário, N. Sra. do Carmo, Santo Antônio de Lisboa, Simões, Itainópolis, as confissões da Catedral
  e duas capelas (Igrejinha/Picos e Vera Mendes); (c) só a ficha de 2013 do Horário de Missa: Ipiranga
  e Betânia; (d) a missa de sábado 19h em Geminiano, que só está na ficha velha da São Francisco.

Todas as grades foram conferidas contra o HTML/JSON bruto.

## Decisões tomadas

- **`priestName` vem das fichas do clero** (campo de relação "Pároco da Paróquia" e o texto "Função
  na Diocese"), atualizadas entre 01/2025 e 06/2026. 29 de 31 resolvidos.
- **E-mail pessoal anulado** em Santa Teresinha (Queimada Nova): é o de um padre hoje "em ano
  sabático". Espaço sobrando corrigido em `padremarcos@ dp15.com` e `l: marcolandia@dp15.com`.
- **Telefone anulado** em Francisco Santos (`(89) 9 98100.9276`, dígito a mais).
- "Paróquia Senhora Sant'Ana" e "Paróquia Nossa Senhora Imaculada Conceição" mantidas como a diocese
  grafa.

## Precisa de validação humana

1. **Horários**: 19 das 31 unidades não têm horário nenhum e 8 só têm `baixa`. A diocese publica
   comunidades, não missas.
2. **São Sebastião (Patos do Piauí) sem responsável**: a ficha do Pe. Francisco Pereira Borges
   (06/2026) o dá como pároco e a do Pe. Francidilso Silva do Nascimento (04/2026) como
   "Administrador da Paróquia São Sebastião". Uma das duas está velha.
3. **Curral Novo × Bocaina**: o Pe. Allef Antonio aparece no texto como pároco de Curral Novo e no
   campo de relação como pároco de Bocaina; o Pe. Fernando Pereira dos Santos (ficha de 05/2026) tem
   Curral Novo no campo de relação. Adotei o campo de relação (Bocaina ← Pe. Allef; Curral Novo ← Pe.
   Fernando), que parece o mais novo.
4. **São José Operário (Picos)**: gravado o Pe. João Pereira de Sousa, que a ficha (03/2026) dá como
   "Administrador: Paróquia São José Operário" e também como vigário da Catedral e chanceler.
5. **Área Pastoral de Alagoinha**: nenhum padre associado; o e-mail publicado é pessoal
   (`jaraujochaves@…`) — mantido, mas suspeito.
6. **N. Sra. do Carmo (Picos)**: a lista de comunidades começa no item "2." — falta o primeiro do
   Setor 01. O agregador põe a matriz na "R. Santa Rita, 1199"; a ficha diz Rua Santa Filomena, 1199.
7. **Áreas pastorais sem ficha** (Caldeirão Grande, Wall Ferraz, Paquetá, Santana do Piauí): decidir
   se viram unidades próprias.
8. **Grafias da fonte mantidas**: "Barra dt Arroz", "Vereda Extencia", "Atras da Serra", "Mearim l",
   "Br. São José", "Serrinha – Nossa de Fatima".
9. Quatro datas de criação em 11–12/2022 (Acauã, Curral Novo, Santo Antônio de Lisboa, São José do
   Piauí) são dias diferentes e batem com o salto de 21 → 27 paróquias no Anuário; foram aceitas.
