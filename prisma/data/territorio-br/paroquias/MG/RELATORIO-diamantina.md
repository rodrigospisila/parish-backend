# Relatório de pesquisa — Arquidiocese de Diamantina (MG)

**Agente:** pesquisa de território (Vale do Jequitinhonha / Alto Jequitinhonha)
**Data da pesquisa:** 2026-09-10
**Arquivo gerado:** `paroquias/MG/diamantina.json`

## Resumo numérico

| Métrica | Valor |
|---|---|
| Entradas de paróquia no arquivo | **58** |
| Paróquias e quase-paróquias de verdade | **57** |
| Registros não paroquiais (`status: "nao-paroquial"`) | 1 (Santuário de Santa Luzia, Inimutaba) |
| Paróquias esperadas (Annuario Pontificio 2024, via catholic-hierarchy) | 55 |
| Confiança das paróquias | 57 `alta` · 1 `media` (o santuário) · 0 `baixa` |
| Comunidades/capelas | **609** (504 `alta`, 105 `media`) |
| Horários fixos | **600** (590 missas + 10 confissões) |
| Confiança dos horários | 365 `alta` · 10 `media` · 225 `baixa` |
| Foranias cobertas | 6 (Curvelo 13, Diamantina 13, Itamarandiba 9, Corinto 8, Pirapora 8, Serro 7) |
| Municípios | 35 |

## Fontes principais

1. **https://arquidiamantina.org.br/paroquias/** — diretório oficial das paróquias, com nome, endereço
   completo com CEP e (nas classes CSS do card) a forania de cada uma. *Acessado em 10/09/2026.*
2. **https://arquidiamantina.org.br/paroquias/&lt;slug&gt;/** — 58 páginas individuais, uma por paróquia.
   **Esta é a fonte de quase tudo.** Cada página publica, em blocos estruturados:
   *Ano de Criação · Telefone · E-mail · Atendimento (escritório, confissões, direção espiritual) ·
   Endereço · História da Paróquia · **Comunidades Paroquiais** (lista nominal) · **CLERO** (pároco,
   vigários, diáconos) · **Horários de Missas** (dia da semana, tipo, hora e comunidade).*
   *Acessadas em 10/09/2026.*
3. **https://arquidiamantina.org.br/wp-json/wp/v2/paroquias?per_page=100** — REST API do WordPress
   (custom post type `paroquias`). `X-WP-Total: 58` confirma que 58 é o total canônico publicado, e o
   campo `modified` de cada registro dá a **data de atualização real** de cada página.
4. **https://www.catholic-hierarchy.org/diocese/ddiam.html** — 55 paróquias (AP 2024), 45.280 km²,
   436.000 católicos (81,3%), 74 presbíteros; sufragâneas Almenara, Araçuaí, Guanhães e Teófilo Otoni.

### Sinal de atualidade da fonte (é o que decide a carga)

O site está **vivo e recém-atualizado**. Das 58 páginas, **50 foram modificadas em 2026** (a mais
recente em 29/08/2026), 1 em 2025 e 7 entre dez/2023 e fev/2025 (justamente as que não têm conteúdo).
Por isso os horários semanais entraram como `alta`.

Datas de modificação das páginas **antigas** (as que não têm horário nem comunidade, para conferência):
`santo-antonio-santo-antonio-do-itambe` 31/01/2024 · `nossa-senhora-da-conceicao-buenopolis` 31/01/2024 ·
`nossa-senhora-do-carmo-lassance` 29/01/2024 · `santuario-de-santa-luzia-inimutaba` 20/12/2023 ·
`nossa-senhora-da-conceicao-augusto-de-lima` 11/02/2025 · `sao-goncalo-sao-goncalo-do-rio-preto` 11/02/2025 ·
`nossa-senhora-mae-da-igreja-tres-marias` 29/01/2024. (Nas 3 últimas, o *bloco de horários* na página
está preenchido mesmo com `modified` antigo — o bloco é um widget separado do conteúdo.)

## Cobertura: encontrado vs. esperado

- **57 paróquias/quase-paróquias encontradas** contra **55 esperadas** pelo Annuario Pontificio 2024.
  A diferença se explica:
  - **+1** Quase-Paróquia Nossa Senhora de Fátima, no Distrito de Contrato (Itamarandiba), erigida em
    **21/12/2025** — depois do fechamento do Annuario.
  - **+1/+2** as duas basílicas (São Geraldo, em Curvelo, e Sagrado Coração de Jesus, em Diamantina),
    que o Annuario pode contar de outra forma.
- Nenhuma paróquia foi encontrada fora do site oficial que não estivesse nele: o REST API fecha a lista.
- 51 das 58 páginas publicam tabela de horários. **7 não publicam nenhum horário:**
  Augusto de Lima, Buenópolis, Presidente Kubitschek, Lassance, Santo Antônio do Itambé,
  Senador Mourão e o Santuário de Santa Luzia.

## Decisões tomadas

### Nomes com prefixo
- `Catedral Santo Antônio da Sé` (Diamantina) — a fonte diz só "Santo Antônio da Sé", mas o próprio
  histórico e a tabela de horários ("CATEDRAL") confirmam que é a Catedral Metropolitana.
- `Basílica de São Geraldo` (Curvelo) e `Basílica Sagrado Coração de Jesus` (Diamantina) — títulos de
  Basílica Menor explícitos nas respectivas páginas.
- `Santuário Nossa Senhora da Piedade` (Felixlândia) — a fonte a chama de "Paróquia Santuário".
  É paróquia **e** santuário: entra normalmente na carga.
- `Quase-paróquia Nossa Senhora de Fátima` (Itamarandiba/Contrato) — a ata de ereção publicada usa
  "Quase Paróquia"; a lista do site usa "Pró-paróquia". Entra normalmente (tem administrador
  paroquial nomeado e missas fixas).

### Registro não paroquial
- **`santa-luzia-inimutaba` — Santuário de Santa Luzia (Inimutaba)** → `status: "nao-paroquial"`,
  `confidence: "media"`. Motivos: (a) é a **única** das 58 entradas do diretório que **não** recebe a
  categoria `paroquia` no CMS; (b) aparece como comunidade ("Santuário Santa Luzia – Bairro Jardim São
  Geraldo") da Paróquia Santo Antônio de Inimutaba; (c) o padre listado é "Vigário Paroquial e
  **cooperador** do Santuário". Não publica horário, então **não** levou `loadAsParish`.

### Celebração da Palavra ≠ missa
Duas paróquias publicam Celebrações da Palavra na mesma tabela das missas. **Foram excluídas**
(não existem no JSON como `MASS`):
- Santuário N. Sra. da Piedade (Felixlândia) — segunda-feira, 12h.
- Paróquia N. Sra. da Graça (Capelinha) — quinta-feira, 19h, Igreja Santo Antônio.

### Recorrência mensal → `baixa`
**225 dos 600 horários** são de recorrência mensal e ficaram `baixa`, com a regra literal da fonte em
`notes` (ex.: `Regra literal da fonte: "3ª SEXTA-FEIRA"`). Padrões encontrados: `1º/2º/3º/4º DOMINGO`,
`1ª/2ª/3ª/4ª SEXTA-FEIRA`, `1º e 3º DOMINGO`, `2ª e 4ª QUARTA-FEIRA`, `1ª, 3ª e 5ª QUINTA-FEIRA`,
`ÚLTIMA SEXTA-FEIRA DO MÊS`, `FIM DO MÊS` (Buritizeiro/Fazenda Modelo), `DIA 28` (São Judas Tadeu de
Curvelo — devoção mensal ao padroeiro) e `DOMINGO (EXCETO O 1º DOMINGO DO MÊS)` (Morro da Garça).
Este é, de longe, o maior bloco que fica fora do banco — mesmo problema já registrado no README
(decisão de produto pendente sobre `MassSchedule`).

### Confissões
10 registros `CONFESSION` (`media`), extraídos do bloco "Atendimento" das páginas de Basílica de São
Geraldo (Curvelo), N. Sra. da Graça (Capelinha), Sagrado Coração (Diamantina) e Sagrado Coração
(Carbonita). O texto original está em `notes` de cada um, porque a maioria é faixa de horário
("das 8h30 às 10h30 e das 14h30 às 16h30") e o modelo só guarda um horário de início.

### Comunidades
- Quando a página publica **"Comunidades Paroquiais"**, a lista nominal foi usada (`alta`).
- Quando **não publica**, as comunidades foram deduzidas dos locais citados na tabela de horários e
  gravadas com `media` (105 registros). Também entram com `media` as comunidades citadas só nos
  horários de paróquias que têm lista (ex.: "Igreja N. Sr.ª do Rosário", em Datas).
- Toda paróquia tem exatamente **uma** comunidade com `isMatriz: true` (verificado por asserção).

## Precisa de validação humana

1. **Basílica de São Geraldo (Curvelo)** — o site a categoriza como paróquia, mas o clero listado é só
   de redentoristas (ecônomo interino e dois irmãos), **sem pároco**. Confirmar se é paróquia com
   território ou reitoria/santuário de romaria. O campo "E-mail" da página traz na verdade o domínio do
   site próprio (`basilicasaogeraldo.org.br`), gravado em `website`; `email` ficou `null`.
2. **Paróquia Nossa Senhora dos Anjos (Angelândia)** — a lista oficial de comunidades traz **duas**
   entradas rotuladas "Matriz" ("Bela Vista – Matriz – Nossa Senhora da Saúde" e "Centro – Matriz –
   São Vicente de Paulo") e **nenhuma** com o título da paróquia. A matriz foi criada sinteticamente
   como "Matriz Nossa Senhora dos Anjos". A entrada "Vila Sena – Nossa Senhora de Fátim" está truncada
   na fonte.
3. **Paróquia Nossa Senhora Aparecida — cidade divergente.** O slug da página no site é
   `nossa-senhora-aparecida-itamarandiba`, mas o título ("Nossa Senhora Aparecida – Capelinha"), o
   endereço (Rua Tamboril, 350 – Bairro Maria Lúcia – Capelinha) e o DDD (33) dizem **Capelinha**.
   Foi gravada como Capelinha, na Forania de Itamarandiba.
4. **CEPs malformados na fonte** (gravados como estão em `address`, com `zipCode` normalizado do que dá
   para ler):
   - Santo Antônio de Inimutaba: `CEP: 396243-000` (8 dígitos; o correto provavelmente é 39243-000 —
     é o CEP do Santuário de Santa Luzia, na mesma cidade).
   - N. Sra. de Fátima de Três Marias: `CEP: 29205-000` (prefixo 29 é do ES; a outra paróquia de Três
     Marias usa 39205-000).
   - N. Sra. de Fátima de Várzea da Palma: `CEP: 39260-00` (7 dígitos).
5. **Telefones com espaçamento irregular** (gravados como publicados): `(38 )3758-1325`,
   `(38 )99942-7289`, `(38) 3722- 2244`, `38 3225-0343`, `(38) 998330338`.
6. **Paróquias sem pároco titular na fonte** (o campo `priestName` recebeu o primeiro clérigo listado):
   - São Judas Tadeu (Curvelo): só "Wiver Rogério da Silveira Rocha (Pe) – Vigário Paroquial".
   - N. Sra. da Conceição (Augusto de Lima): só "Darci Almeida Rodrigues (Pe) – Vigário Paroquial".
   - Basílica de São Geraldo: só "Edson Alves da Costa, C.SS.R (Pe) – Ecônomo Interino e Igreja".
   - Santuário de Santa Luzia: "Antônio José dos Santos (Pe) – Vigário Paroquial e cooperador".
7. **12 paróquias sem `foundedYear`** (a fonte publica "---"): Imaculada Conceição/Buritizeiro,
   N. Sra. Aparecida/Capelinha, N. Sra. da Conceição/Augusto de Lima, N. Sra. da Conceição/Buenópolis,
   N. Sra. do Carmo/Lassance, N. Sra. Mãe da Igreja/Três Marias, Sagrada Família/Curvelo,
   Santo Antônio/Santo Antônio do Itambé, Santo Hipólito, Santuário de Santa Luzia,
   São Gonçalo/São Gonçalo do Rio Preto, São Judas Tadeu/Curvelo.
   **Nota:** o "Ano de Criação" de Nossa Senhora da Conceição do Serro está publicado como **1713**,
   mas o texto histórico da própria página diz "Criada em 1913". Gravado 1713 (o que a fonte publica),
   mas é quase certamente erro de digitação — vale corrigir.
8. **Sagrado Coração de Jesus (Carbonita)** — "Ano de Criação: 1871" convive com um rodízio de
   comunidades rurais publicado em **tabela por grupos I–IV** (Monte Belo, Dois Córregos, Abadia,
   Ribeirão, Lagoa, Mercadinho, Riacho, Macaúbas, Santana, Retiro, Constantino) que não é conversível
   em horário por comunidade: os 3 horários com local genérico "COMUNIDADE RURAL" ficaram `baixa`.
9. **Paróquia São José (Distrito JK / Curvelo)** — um horário de domingo tem local
   "PONTO DE CELEBRAÇÃO", sem nome de comunidade (`baixa`).
10. **Paróquia São Sebastião (Presidente Juscelino)** — 2º domingo: "10h30 **ou** 14h — Na Com. São
    Miguel, Raiz | Na Com. São Miguel, Muquem (revesam o horário)". Gravado como dois horários `baixa`
    com a regra literal em `notes`.
11. **Paróquias com sede em distrito** (cidade = município, distrito em `neighborhood`):
    Sant'Ana/Inhaí e Santo Antônio/São João da Chapada (município de Diamantina); São Gonçalo do Rio
    das Pedras (município do Serro); São José/Distrito JK (município de Curvelo); Quase-paróquia
    N. Sra. de Fátima/Contrato (município de Itamarandiba).
12. **Erros de digitação da fonte corrigidos silenciosamente** (mantida a grafia correta nas
    comunidades): "Mateiz Nossa Senhora da Graça", "Matriz São João Barista", "Comunidade São JJosé",
    "Comunidade Nissa Senhora Rainha da Paz", "Comunidade São Vicnete", "ARRAIAL DOS FORRROS",
    "SANTA FILOMENA)". Não corrigidos (ficaram como na fonte, dentro do nome da comunidade):
    "Nossa Ssenhora do Bom Sucesso", "Santa Edwirges", "Ribeirão de Tras", "Divino espírito Santo",
    "Sagrada Familia – Extrema", "Nossa senhora do Perpétuo Socorro – Bom Jardim".
13. **E-mails**: todos vieram decodificados do ofuscador do Cloudflare (`data-cfemail`). O e-mail
    `pascom@arquidiamantina.org.br` aparece em **todas** as páginas (é do rodapé) e foi descartado; o
    e-mail gravado é sempre o específico da paróquia.

## Observações de método (úteis para as próximas rodadas)

- O site é **Elementor + custom post type**. O diretório `/paroquias/` carrega as 58 num só HTML
  (sem paginação), e cada `<article>` traz `class="... category-<forania> category-paroquia"` — foi
  daí que saiu a forania de cada paróquia **e** a detecção do Santuário de Santa Luzia (única sem
  `category-paroquia`).
- O bloco de horários **não** está no `content` do REST API: é um widget da página. Foi preciso baixar
  as 58 páginas HTML (`curl --parallel`, UA de Chrome) e extrair o texto.
- A lista de comunidades, ao contrário, **está** no `content` do REST API, o que permitiu conferir a
  data de atualização de cada lista pelo campo `modified`.
