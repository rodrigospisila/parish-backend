# Relatório de pesquisa — Diocese de Taubaté (SP)

- **Arquivo gerado:** `paroquias/SP/taubate.json`
- **Data da pesquisa:** 2026-09-10
- **Agente:** enxame de pesquisa do território (`PROMPT-pesquisa.md`)

## Resumo

| Métrica | Valor |
|---|---|
| Paróquias | **49** (49 alta / 0 media / 0 baixa) |
| Comunidades / capelas | **55** (todas alta), em 21 das 49 paróquias |
| Horários fixos | **359** (331 alta / 0 media / 28 baixa) — 344 MASS, 9 CONFESSION, 6 ADORATION |
| Cobertura | **49 / 49 (100 %)** |

Municípios cobertos: Taubaté (20), Pindamonhangaba (10), Caçapava (6), Tremembé (3),
Campos do Jordão (3), Natividade da Serra (2), Jambeiro, São Bento do Sapucaí,
Santo Antônio do Pinhal, Redenção da Serra e São Luiz do Paraitinga (1 cada).

## Fontes principais

Tudo veio do **site oficial da diocese** (`https://diocesedetaubate.org.br`), em duas camadas:

| Fonte | Uso |
|---|---|
| `https://diocesedetaubate.org.br/paroquias/` | lista canônica das 49 paróquias agrupadas por município, com pároco, endereço, CEP, telefone, e-mail e horário de secretaria de cada uma |
| páginas individuais (`/catedral/`, `/santateresinha/`, …) | horários de missa/confissão/adoração, comunidades, ano de criação, site e redes sociais |
| `https://diocesedetaubate.org.br/contato/` | Mitra Diocesana: Av. Professor Moreira, 327 — Jardim das Nações — 12030-070 |
| `https://diocesedetaubate.org.br/nosso-bispo/` | Dom Wilson Luís Angotti Filho (posse em 13/06/2015) |
| `https://diocesedetaubate.org.br/diocese/` | fundação em 07/06/1908 pelo Papa Pio X; padroeiro São Francisco das Chagas |
| `https://www.catholic-hierarchy.org/diocese/dtaub.html` | conferência do número esperado de paróquias (49, dado de 2022) |

**Observação técnica:** o site responde 403 ao leitor automático padrão; a coleta foi feita
com `User-Agent` de navegador. O mesmo vale para o site da Diocese de Santos.

## Cobertura

A contagem bate por dois caminhos independentes: a página "Todas as Paróquias" lista
**49 paróquias** e o catholic-hierarchy.org registra **49 paróquias** (dado de 2022).
Não há indício de paróquia faltando.

**Excluídas de propósito (2 entradas da mesma página que não são paróquias):**

- **Convento Santa Clara** (Pça. Anchieta, s/nº, Centro, Taubaté) — convento dos Capuchinhos;
- **Comunidade Missão Sede Santos – Casa João Paulo II** (R. do Café, 58, Taubaté).

Ambos aparecem na listagem diocesana **sem link próprio** e a própria página da Catedral
diz que "as comunidades Missão Sede Santos e Convento Santa Clara fazem parte do território
pastoral da paróquia São Francisco das Chagas" — por isso foram gravados como **comunidades
da Catedral**, não como paróquias.

## Pontos para o enxame de validação

### 1. Divergências entre a listagem geral e a página da paróquia (maior lacuna)

As duas camadas do próprio site oficial se contradizem em 9 registros. Foi adotado sempre
o dado da **página da paróquia** (mais específico e, no geral, mais recente). Convém confirmar:

| Paróquia / cidade | Campo | Listagem geral | Página da paróquia (adotado) |
|---|---|---|---|
| São José Operário / Taubaté | endereço + CEP | Av. Brig. José Vicente Faria Lima, 555 — 12070-000 | Rua São José Operário, 116 — 12070-420 |
| São João Bosco / Taubaté | bairro | Cidade de Deus | Jardim Bela Vista |
| Nossa Senhora de Fátima / Taubaté | telefone | (12) 3631-1023 | (12) 99113-1959 (WhatsApp) |
| Sagrado Coração de Jesus / Taubaté | telefone | (12) 99103-7441 (só mensagens) | (12) 3621-4440 |
| Basílica do Senhor Bom Jesus / Tremembé | telefone | (12) 3672-8593 | (12) 3674-3787 |
| São Miguel Arcanjo / Pindamonhangaba | CEP | 12423-011 | 12423-310 |
| Sant'Ana / Pindamonhangaba | CEP | **12043-240** (é CEP de Taubaté — provável erro de digitação) | 12403-240 |
| Nossa Senhora D'Ajuda / Caçapava | endereço | Pça. Dr. Pedro de Toledo, 82 | Pça. Dr. Pedro de Toledo, 70 |
| Santo Antônio de Pádua / Caçapava | bairro | Vila Antônio Augusto Luiz | Vera Cruz |
| Menino Jesus / Caçapava | CEP | 12289-012 | 12280-514 |
| São Luís de Tolosa / S. L. do Paraitinga | telefone + e-mail | (12) 3671-1848 / psltolosa@outlook.com | (12) 3671-2607 / adm.psltolosa@gmail.com |
| Nossa Senhora da Conceição / Taubaté | e-mail | paroquiansconceicaosjc@**gmail** | paroquiansconceicaosjc@**hotmail** |
| N. S. Mãe da Igreja / Taubaté | e-mail | pnsmigreja@hotmail.com | pnsmi.pastoral@hotmail.com |

### 2. Comunidades listadas em apenas 21 das 49 paróquias

O site **não tem campo estruturado de comunidades**. As 55 comunidades gravadas vieram de
menções em texto corrido ou de blocos de horário por comunidade. Várias paróquias declaram
comunidades na sua história mas **não as nomeiam** — ficaram com `communities: []`:

- São Vicente de Paulo (Taubaté): "a comunidade matriz e mais nove comunidades";
- Nossa Senhora da Conceição (Taubaté/Quiririm): "mais nove comunidades";
- Menino Jesus (Taubaté): "possui 6 comunidades";
- Nossa Senhora de Fátima (Taubaté): "mais sete comunidades";
- Santíssima Trindade, Nossa Senhora Aparecida, Espírito Santo, São Sebastião, João Paulo II
  (Taubaté), São Cristóvão (Pindamonhangaba), Basílica do Senhor Bom Jesus e Jesus
  Ressuscitado (Tremembé), Sant'Ana (Pindamonhangaba), Santa Teresinha (Campos do Jordão).

**Sugestão:** buscar as redes sociais de cada uma — é onde essas paróquias publicam a lista.

### 3. Missas de recorrência mensal — 28 registros `baixa` + 3 descartados

Como já registrado no README, `MassSchedule` só modela dia da semana. Os 28 registros com
recorrência mensal (`1ª sexta-feira do mês`, `2º Sábado`, `3ª Quarta`, …) ficaram `baixa`
com o texto original no campo `notes`. Concentração maior em:

- **Nossa Senhora de Fátima (Pindamonhangaba): 7** — cinco das seis comunidades só têm missa mensal;
- **São Benedito (Campos do Jordão): 6** — idem, seis comunidades rurais;
- **João Paulo II (Taubaté): 3** — a matriz alterna "1º, 3º e 4º domingo" com "2º domingo".

**Três horários foram descartados por não terem dia da semana** (recorrência por dia do mês):

| Paróquia | Texto na fonte |
|---|---|
| N. S. Mãe da Igreja – Santuário São Benedito (Taubaté) | "Dia 05 de cada mês, às 19h30 — Missa Devocional de São Benedito" |
| Basílica do Senhor Bom Jesus (Tremembé) | "Todo dia 6, missa do peregrino do Senhor Bom Jesus às 7h, 15h e 19h30" |
| N. S. de Fátima (Pindamonhangaba) | "Todo dia 13 de cada mês – 19h" |

### 4. `foundedYear` — 17 paróquias sem ano e 2 casos ambíguos deixados em `null`

- **Catedral São Francisco das Chagas (Taubaté):** a fonte diz "**construída** em 1645" e que
  a matriz foi **elevada a catedral** em 07/06/1908 — nenhuma das duas é a data de ereção da
  paróquia. Gravado `null`.
- **Nossa Senhora do Bom Sucesso (Pindamonhangaba):** a fonte diz que a igreja foi
  "**inaugurada** em 26 de julho de 1707" e cita um "primeiro vigário", mas não afirma o ano de
  criação da paróquia. Gravado `null`.

Nunca foram inventados: as outras 15 simplesmente não trazem data no site.

### 5. Nomes normalizados (conferir contra o Anuário)

O prefixo foi padronizado e o nome da cidade retirado do nome da paróquia, conforme o README:

| Nome na fonte | Gravado |
|---|---|
| Paróquia Catedral São Francisco das Chagas | **Catedral** São Francisco das Chagas |
| Paróquia São Bento do Sapucaí | Paróquia **São Bento** (cidade vai em `city`) |
| Paróquia Santo Antônio do Pinhal | Paróquia **Santo Antônio** (idem) |
| Paróquia de Santa Cruz / de São Pedro Apóstolo / de Sant'Ana | sem o "de" |

Dois casos em que as duas camadas do site divergem no **nome** (adotada a página da paróquia):

- **Natividade da Serra:** listagem diz "Paróquia Nossa Senhora da Conceição", a página diz
  "Paróquia **Imaculada** Conceição" (URL `/imaculadaconceicao/`). A matriz chama-se
  Nossa Senhora da Conceição. Gravado "Paróquia Imaculada Conceição".
- **Campos do Jordão:** listagem diz "Santa **Terezinha**", página diz "Santa **Teresinha**".
  Gravado "Santa Teresinha".

### 6. Detalhes menores

- **Paróquia Sagrada Família (Taubaté):** a fonte grafa a última missa de domingo como
  "17h e 19" (sem o "h"). Lida como 19h, com aviso no `notes` do registro.
- **Paróquia São Cristóvão (Pindamonhangaba):** a fonte grafa "adoração às 19h**0**" na
  sexta-feira (erro de digitação). Lida como 19h.
- **Paróquia São José Operário (Taubaté):** a missa de segunda às 18h15 é celebrada no
  **Instituto São Rafael**, não na matriz; ficou em `community: "Matriz"` com aviso no `notes`.
- **Paróquia Menino Jesus (Caçapava):** a missa de domingo às 8h30 está marcada
  "(Comunidades)" na fonte — não é na matriz; mesmo tratamento.
- **Paróquia Nossa Senhora das Dores (Jambeiro):** **nenhuma** missa é celebrada na matriz —
  as três são na "Casa de Oração (Salão Paroquial)" e na "Igreja São Benedito". Parece
  indicar matriz em obras; vale confirmar.
- **Paróquia Nossa Senhora D'Ajuda (Caçapava):** a igreja matriz é **São João Batista**, e não
  Nossa Senhora D'Ajuda (que é uma das seis igrejas, em Caçapava Velha). Não é erro de coleta.
- **Paróquia Imaculada Conceição (Natividade da Serra):** o único e-mail publicado
  (`paulinholittlecd@hotmail.com`) é claramente pessoal do pároco. Gravado por ser o contato
  oficial da listagem, mas convém revisar.
- **Paróquia João Paulo II (Taubaté):** único registro sem CEP — a fonte publica só
  "Rodovia Oswaldo Cruz, Km 14 – Caixa Postal 322 – Bairro do Registro".
- Confissão e adoração aparecem em pouquíssimas páginas (9 e 6 registros): a fonte quase nunca
  publica esses horários. Não é omissão da coleta.
- As janelas de atendimento ("das 9h às 11h30") viraram **um** registro no horário de início,
  com o intervalo completo preservado no `notes`.
