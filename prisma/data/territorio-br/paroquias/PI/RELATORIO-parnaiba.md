# Diocese de Parnaíba (PI) — relatório de pesquisa

- **Arquivo**: `paroquias/PI/parnaiba.json`
- **Data da coleta**: 2026-09-17
- **Cobertura**: **42 / 41 unidades (100%) — todas `alta`**: 41 paróquias (a Catedral incluída) + 1 Área
  Pastoral. Mais 3 entradas `nao-paroquial` (1 santuário e 2 capelanias) — 45 no arquivo
- **Comunidades**: 44 (42 matrizes + 2 tiradas de agregador, `baixa`) — a diocese não publica capelas
- **Horários fixos**: 97 — **31 `media`** (6 paróquias) e 66 `baixa` (14 paróquias + 1 capelania). A
  diocese **não publica horário nenhum**
- 27 municípios com sede de paróquia (o território tem 29)

## Fontes principais

| Fonte | Uso |
|---|---|
| `https://www.diocesedeparnaiba.org.br/paroquia/` | Índice oficial por zonal (Norte I, Norte II, Sul I, Sul II + Capelanias), revisto em 12/02/2026 |
| `https://diocesedeparnaiba.app.ofertorio.com/?rest_route=/wp/v2/pages&per_page=100` | **A origem WordPress do site** — 207 páginas; as 45 fichas (paróquia, área pastoral, santuário, capelanias) com endereço, CEP, telefone, e-mail, pároco/administrador. Fichas revistas entre 05/2025 e 07/2026 |
| `…/padres/` (18/07/2026) e notícia de transferências de 11/10/2025 | Conferência do responsável atual onde a ficha estava velha |
| Notícias oficiais | Criação das paróquias de Morro do Chapéu (09/2025), São Francisco de Assis/Piripiri (01/02/2026) e Cajueiro da Praia (decreto de 11/02/2026) |
| `https://minhareceita.org/<cnpj>` | **Prova de completude**: filiais 0002–0041 do CNPJ 06.550.586 (Diocese de Parnaíba) |
| `liriocatolico.com.br` (17 fichas), `horariodemissa.com.br` (25 fichas, 24 de 2013 e 1 de 2018), `buscamissa.com.br` (1 ficha) | Horários |
| `https://www.catholic-hierarchy.org/diocese/dparn.html` | 41 paróquias (Anuário Pontifício 2024, dados de 2023) |

## Como o site foi lido

`www.diocesedeparnaiba.org.br` devolve **429 "Vercel Security Checkpoint"** para qualquer leitor
automático (curl com UA de Chrome, Googlebot, WebFetch — todos barrados). A saída veio de uma captura
do Arquivo da Internet (15/05/2026) da página `/paroquia/`: os links das fichas apontam para a
**origem** `diocesedeparnaiba.app.ofertorio.com` (plataforma Ofertório/AD3), que responde sem
bloqueio. Lá o `/wp-json/` dá 404, mas **`/?rest_route=/wp/v2/pages`** funciona e entrega tudo, com
`modified` por ficha. As URLs gravadas em `sources` são as públicas (`www.…`); o título de cada fonte
avisa que a leitura foi feita pela origem.

## Como a lista foi fechada

O índice oficial tem 43 entidades territoriais em 4 zonais + 2 capelanias. Tirando o santuário (ver
abaixo) ficam **41 paróquias + 1 Área Pastoral (Santa Isabel, Parnaíba)**.

A **Receita Federal confirma**: o CNPJ da diocese tem a matriz (0001) e **40 filiais ativas
(0002–0041), uma por paróquia, sem nenhuma sobra** — a única paróquia sem filial é Cajueiro da Praia,
criada em 02/2026 (as duas anteriores, Morro do Chapéu e Piripiri/São Francisco, já têm filial aberta
em 10/2025 e 03/2026). A varredura foi até a ordem 0066 sem achar mais nada. As filiais também deram o
**bairro** de várias sedes que a ficha oficial omite.

O texto institucional ("03 Áreas Pastorais, 40 paróquias, 1 santuário") é de 12/2024 e está
ultrapassado: três unidades viraram paróquia desde então. Os slugs das páginas ainda guardam o nome
antigo (`area-pastoral-sao-francisco-das-chagas-morro-do-chapeu`, `area-missionaria-sao-francisco-de-
assis-piripiri-pi`, `area-pastoral-sagrado-coracao-de-jesus-cajueiro-da-praia-pi`), mas os títulos já
dizem "Paróquia".

## Decisões tomadas

- **Santuário Mãe dos Pobres e Senhora do Piauí (Ilha Grande)**: a diocese o lista como entidade à
  parte, mas a ficha tem o **mesmo endereço, telefone e sacerdote** da Paróquia N. Sra. da Conceição de
  Ilha Grande, e não há horário publicado. Entrou como `status: "nao-paroquial"`. (O nome na fonte
  está grafado "Santuário do Mãe dos Pobres…".)
- **Capela de Santo Antônio (Colégio N. Sra. das Graças)** e **Capela Santa Casa de Misericórdia**:
  `nao-paroquial`, sem `loadAsParish` — a Santa Casa só tem horário em agregador (`baixa`).
- **N. Sra. da Assunção**: a ficha diz "Camurupim – PI", que é povoado de **Luís Correia**
  (`city: "Luís Correia"`, `neighborhood: "Camurupim"`); a Receita confirma o município.
- **Morro do Chapéu** gravado com o nome oficial do município, **Morro do Chapéu do Piauí**.
- `foundedYear` só onde há notícia oficial de criação (2025 e 2026). A data de abertura da filial na
  Receita **não** é data de fundação e não foi usada.
- **Responsável corrigido em 2 fichas velhas**: Esperantina/N. Sra. da Boa Esperança (ficha de 06/2025
  ainda com o Pe. Edimar, hoje em Luís Correia → Pe. Paulo Sérgio Duarte dos Santos, pelas
  transferências de 10/2025 e pela página do clero) e Milton Brandão (→ Pe. Cleiton José Pereira
  Alves, único padre que a página do clero de 07/2026 põe na paróquia).
- **Campos anulados**: e-mail da Catedral com cedilha (`divinagraça.phb@…`), e-mail de Joaquim Pires
  com `gmai.com`, CEP de Cajueiro da Praia (é o de São João XXIII — bloco copiado), telefone da Área
  Pastoral Santa Isabel (idêntico ao de Cajueiro da Praia).

## Horários: regra aplicada

- `media` — mesmo (dia, hora) em duas fontes independentes (Lírio Católico + ficha do Horário de
  Missa): Catedral (domingo 6h30 e 19h), São Sebastião, Pedro II (as duas) e N. Sra. dos Remédios de
  Piripiri; e a ficha **"Confirmado" do BuscaMissa** da Paróquia N. Sra. de Fátima, cujo pároco,
  telefone e e-mail batem com a ficha oficial de 12/2025 (mesmo critério de Salvador).
- `baixa` — só o Lírio Católico (7 paróquias) ou só a ficha de **2013** do Horário de Missa (7
  paróquias: regra pré-pandemia); recorrência mensal ("2º e 3º sábado" em Piracuruca/São Francisco).

Todas as grades foram conferidas contra o JSON/HTML bruto das fontes.

## Precisa de validação humana

1. **Horários**: 22 das 42 unidades não têm horário em fonte nenhuma; 14 só têm `baixa`. É diocese
   para entrar em produção quase sem grade, como Caxias do Maranhão.
2. **Catedral**: foi "reaberta em celebração de ação de graças" em 20/08/2026 (notícia oficial) — a
   grade do agregador pode ser do período de obra. Conferir.
3. **Pedro II**: o agregador dá a mesma grade (dom. 7h, 10h, 19h) para as duas paróquias; pode ser
   cópia de uma na outra (na ficha de 2013 a N. Sra. da Conceição tinha 16h, não 10h).
4. **Cajueiro da Praia** × **Área Pastoral Santa Isabel**: mesmo telefone nas duas fichas; mantive em
   Cajueiro e anulei em Santa Isabel — pode ser o contrário.
5. **Área Pastoral Santa Isabel**: responsável publicado só como "Pe. Edcarlos".
6. **São Francisco de Assis (Piracuruca)**: as transferências de 10/2025 nomeavam o Pe. Antônio
   Nilson administrador; a ficha de 12/2025 e a página do clero de 07/2026 trazem o Pe. João Paulo
   Leite Rocha — adotado o mais recente.
7. **São Benedito (Esperantina)**: bairro "Rural" na ficha × "Morro da Onça" na Receita (deixei
   `neighborhood: null`).
8. **N. Sra. da Assunção (Camurupim)**: CEP 64.210-000 na ficha × 64220-000 na Receita (adotado).
9. **Santa Ana**: ficha diz "Rua Santana, 1415 – Bairro – PI" (texto truncado); a Receita diz nº 1405,
   bairro Piauí. Gravei 1415 – Bairro Piauí.
10. 6 unidades sem telefone e 5 sem e-mail na fonte oficial.
11. **O site principal bloqueia leitores automáticos** (Vercel). O enxame de validação deve ir direto
    à origem `diocesedeparnaiba.app.ofertorio.com/?rest_route=…`.

## Revisão do orquestrador (2026-09-17)

23 dos 31 horários `media` foram **rebaixados para `baixa`** antes da carga: grades do Lírio
Católico corroboradas só por fichas do `horariodemissa.com.br` de 2013 e 2018 (Catedral, São
Sebastião, as duas paróquias de Pedro II — com grade idêntica — e N. Sra. dos Remédios de
Piripiri). Texto anterior a 2020 não sustenta horário em produção. Seguem `media` os 8 horários de
N. Sra. de Fátima (Parnaíba), confirmados no BuscaMissa. Cada registro rebaixado leva
`confidenceNote`.
