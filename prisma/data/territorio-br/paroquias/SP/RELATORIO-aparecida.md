# Relatório de pesquisa — Arquidiocese de Aparecida (SP)

- **Arquivo gerado:** `paroquias/SP/aparecida.json`
- **Data da pesquisa:** 2026-09-10
- **Agente:** enxame de pesquisa do território (`PROMPT-pesquisa.md`)

## Resumo

| Métrica | Valor |
|---|---|
| Paróquias | **19** (19 alta / 0 media / 0 baixa) |
| Comunidades / capelas | **122** (todas alta) |
| Horários fixos | **107** (93 alta / 0 media / 14 baixa) |
| Cobertura | **19 / 19 (100 %)** |

Municípios cobertos: Guaratinguetá (13), Aparecida (3), Lagoinha (1), Potim (1), Roseira (1) —
exatamente os cinco municípios que a arquidiocese declara na sua apresentação institucional.

## Fontes principais

Todas as paróquias, comunidades e horários vieram do **site oficial da arquidiocese**
(`https://arqaparecida.org.br`), que publica uma página por paróquia com quatro abas úteis:

| Fonte | Uso |
|---|---|
| `https://arqaparecida.org.br/paroquias` | lista canônica das 19 paróquias |
| `…/paroquia/<id>-<slug>` | endereço, CEP, telefone, e-mail, data de criação |
| `…/paroquia/<id>-<slug>/comunidades` | comunidades/capelas (paginado, 1 por página, com bairro, endereço e horários próprios) |
| `…/paroquia/<id>-<slug>/paroco` | nome do pároco |
| `…/paroquia/<id>-<slug>/missas` | horários da matriz |
| `https://arqaparecida.org.br/apresentacao` | criação (bula *Sacrorum antistitum*, 19/04/1958), 4 foranias, 19 paróquias, 1 capelania militar |
| `https://arqaparecida.org.br/arcebispo` | Dom Mário Antônio da Silva (nomeado em 02/03/2026 pelo Papa Leão XIV) |
| `https://www.catholic-hierarchy.org/diocese/dapar.html` | conferência do número esperado de paróquias (19, dado de 2024) |
| `https://www.horariodemissa.com.br` | fallback de horários (só Guaratinguetá; dados de 2013 — ver ressalvas) |

## Cobertura

A contagem bate por três caminhos independentes: a listagem oficial traz **19 paróquias**, a
apresentação institucional afirma "quatro foranias, dezenove paróquias e uma capelania militar" e o
catholic-hierarchy.org registra **19 paróquias** no levantamento de 2024. Não há indício de paróquia
faltando.

**Não incluída de propósito:** a *Capelania Militar da Aeronáutica Nossa Senhora de Loreto*
(Pedregulho, Guaratinguetá), que aparece em agregadores. Não é paróquia e pertence ao **Ordinariado
Militar do Brasil**, jurisdição distinta da arquidiocese.

## Pontos para o enxame de validação

### 1. Oito paróquias sem nenhum horário publicado (maior lacuna)

O site oficial responde literalmente *"Não existe horário cadastrado!"* na aba `/missas` **e** não
traz bloco `Missas:` em nenhuma das comunidades destas paróquias:

| Paróquia | Cidade |
|---|---|
| Paróquia São Roque | Aparecida |
| Paróquia Nossa Senhora das Graças | Guaratinguetá |
| Paróquia São Dimas | Guaratinguetá |
| Paróquia Nossa Senhora de Lourdes | Guaratinguetá |
| Paróquia Nossa Senhora do Rosário | Guaratinguetá |
| Paróquia Puríssimo Coração de Maria | Guaratinguetá |
| Paróquia Senhor Bom Jesus | Potim |
| Paróquia Sant'Ana | Roseira |

São paróquias com cadastro completo no resto (endereço, CEP, telefone, e-mail, pároco, comunidades)
— só o horário está vazio na origem. **Sugestão:** buscar redes sociais oficiais de cada uma, que é
onde essas paróquias parecem publicar a grade.

### 2. Horários `baixa` da Paróquia Santo Antônio (Guaratinguetá) — 14 registros

Único caso em que o agregador tinha grade. Gravados como `baixa` porque:

- a ficha do `horariodemissa.com.br` (`igreja.php?k=UdwyA`) declara **última atualização em
  09/05/2013** — 13 anos de defasagem;
- **conflitam com reportagem de 2026** (PortalR3, festa de Santo Antônio 2026), que descreve
  "durante a semana 7h, 12h e 19h; domingos 7h, 9h, 15h e 18h", enquanto o agregador registra
  domingo 08:00/10:00/19:00 e semana 07:00/19:00.

O campo `notes` de cada um desses 14 horários já carrega esse aviso. **Não devem entrar em produção
sem checagem.** As outras cinco fichas de Guaratinguetá no mesmo agregador (Nossa Senhora das
Graças, São Dimas, Nossa Senhora de Lourdes, Nossa Senhora do Rosário, Puríssimo Coração de Maria)
estão com "Nenhum horário de Missa informado" e também datam de 25/02/2013 — nada foi aproveitado
delas, nem horários nem párocos/telefones.

### 3. Dois párocos sem nome

A aba `/paroco` está vazia para:

- Paróquia Nossa Senhora da Glória (Guaratinguetá)
- Paróquia Nossa Senhora do Rosário (Guaratinguetá)

Gravados como `null` (nunca inventados).

### 4. Dados da Cúria em branco

`address`, `zipCode`, `phone` e `email` da arquidiocese ficaram `null`: o site não publica os dados
da Cúria/Mitra em nenhuma página acessível (`/contato/fale-conosco` retorna 404 e a apresentação não
traz endereço). O `bishopName` e o `website` estão preenchidos e conferidos.

### 5. Ano de criação fora do padrão

- **Paróquia Santo Antônio (Guaratinguetá): `foundedYear` 1651.** É plausível (Guaratinguetá foi
  fundada em 1651 e a matriz de Santo Antônio é a igreja original da vila), mas convém confirmar se
  a data no site é a da paróquia ou a da povoação.
- **Paróquia São Miguel Arcanjo (Guaratinguetá):** sem data de criação no site → `null`.

### 6. Detalhes menores

- **Paróquia Santa Luzia (Guaratinguetá)** é a única com uma comunidade só (a matriz) e ainda assim
  16 horários — é uma paróquia urbana sem capelas, não um erro de coleta.
- Uma comunidade tem nome muito longo, transcrito literalmente da fonte: *"Nossa Senhora das Graças
  - Convento das Franciscanas da Terceira Ordem Seráfica"* (Paróquia Santo Antônio). Pode valer um
  encurtamento na carga.
- Os horários do site não distinguem tipo: **todos foram gravados como `MASS`**. Não há
  `CONFESSION`, `ADORATION` nem `ROSARY` nesta arquidiocese — a fonte simplesmente não publica esses
  dados, não é omissão da coleta.
- Nenhuma missa de recorrência mensal apareceu nesta arquidiocese (o site usa só dia da semana), o
  que evita aqui o problema de modelagem registrado no README para outras dioceses.
