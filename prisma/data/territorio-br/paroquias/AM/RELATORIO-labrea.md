# Relatório — Prelazia de Lábrea (AM)

Pesquisa: 2026-09-18. Arquivo: `paroquias/AM/labrea.json`.

## Resultado

| Métrica | Valor |
|---|---|
| Paróquias | **5** |
| Confiança das entradas | 5 `alta` |
| Comunidades/capelas | 33 (5 matrizes + 28 comunidades) |
| Horários fixos | 28 — todos `media`, todos MASS, todos na matriz |
| Cobertura | 5/5 (100%), com prova independente do gcatholic.org |

## Fonte principal — o site oficial, completo

`https://prelaziadelabrea.com.br` (WordPress 6.1.9 com o tema **Parresia**, o mesmo de Tefé e
Humaitá). **Aqui o Parresia NÃO expõe tipo de conteúdo `paroquia` na REST** (`/wp-json/wp/v2/types`
só devolve `post`, `page`, `jet-menu` e `ajde_events`): as paróquias e as comunidades são páginas
comuns. A navegação do menu "Paróquias" resolve tudo em três páginas:

| Página | O que traz |
|---|---|
| `/nossas-paroquias/` | as **5 paróquias**, com link para a ficha de cada uma |
| `/comunidades/` | **26 fichas de comunidade**, cada uma declarando a paróquia e a cidade |
| `/horarios-de-missa/` | **tabela oficial de missas** por dia da semana × cidade |

A ficha de cada paróquia publica história, **pároco e vigários, WhatsApp, e-mail (ofuscado pelo
Cloudflare, decodificado via `data-cfemail`) e endereço com CEP**. Datas de modificação, do JSON-LD
(`dateModified`) que o plugin SmartCrawl gera por página:

| Página | dateModified |
|---|---|
| Horários de Missa | **2024-04-22** |
| N. Sra. de Nazaré (Lábrea) | 2024-04-24 |
| Santa Rita de Cássia (Tapauá) | 2024-04-23 |
| São João Batista (Canutama) | 2024-04-24 |
| Santo Agostinho (Pauini) | 2024-05-09 |
| São Sebastião e São Francisco | 2024-06-06 |

Todas > 12 meses → **fonte oficial sem sinal de atualidade = `media` para horário** (posteriores a
2020, logo não caem para `baixa`). Os dados de paróquia continuam `alta` (estão explícitos em fonte
oficial).

Outras fontes:
- **gcatholic.org** (`labr1.htm`): "5 parishes, 1 mission", Catedral Prelatícia Nossa Senhora de
  Nazaré, 68.262 km², 75.400 católicos, bispo Santiago Sánchez Sebastián, O.A.R., desde 13/04/2016.
  É a corroboração independente da completude da lista.
- **Receita Federal (`minhareceita.org`)**: o CNPJ da Prelazia (**04.340.535/0001-62**, obtido pelo
  Mapa das OSC/IPEA) tem **um único estabelecimento** — 0002 a 0014 são 404. As paróquias têm CNPJ
  próprio, então **a varredura de filiais não serve de prova de completude aqui** (mesmo caso de
  Tefé). Confirma o endereço e o CEP da Cúria.
- `/missionarios/` — 2 bispos, 12 padres e 1 diácono, cada um com a paróquia onde atua; usada para
  completar pároco/administrador de Pauini e vigário de Canutama.
- `/secretaria-prelaticia/` — endereço, CEP, telefone e 3 e-mails da Cúria (Cloudflare).

## Horários — o que a tabela publica

A tabela oficial cobre **as 4 sedes municipais** (Lábrea, Canutama, Tapauá, Pauini) e **nenhuma
comunidade**. Não há nada em **terça** nem em **sábado** ("Sem horários para esse dia"), e a
Prelazia não publica confissão, adoração nem terço.

| Paróquia / cidade | Dom | Seg | Qua | Qui | Sex |
|---|---|---|---|---|---|
| Catedral N. Sra. de Nazaré – Lábrea | 07:00, 08:00, 19:30 | 07:00, 19:30 | 19:30 | 19:30 | 19:30 |
| São João Batista – Canutama | 07:30, 09:00, 19:30 | 19:30 | 19:30 | 19:30 | 19:30 |
| Santa Rita de Cássia – Tapauá | 07:00, 19:30 | 19:30 | 19:30 | 19:30 | 19:30 |
| Santo Agostinho – Pauini | 08:00, 18:00, 20:00 | 19:00 | 19:00 | 19:00 | 19:00 |

Correção aplicada: na quinta-feira Tapauá aparece com **19:30 duas vezes** no HTML
(`<li><span>19:30</span></li>` repetido) — gravei uma só entrada.

A **Paróquia São Sebastião e São Francisco não aparece na tabela** e entra sem nenhum horário.

## Comunidades — só o urbano

As 26 fichas de `/comunidades/` mapeiam assim:

| Paróquia | Comunidades publicadas |
|---|---|
| Catedral N. Sra. de Nazaré – Lábrea | 12 (Aparecida, Consolação, Fátima, Perpétuo do Socorro, Santa Mônica, Santa Rita de Cássia, São Francisco, São Francisco da Vila, São José, São Lázaro, São Raimundo Nonato, São Sebastião) |
| Santa Rita de Cássia – Tapauá | 6 (Jesus o Bom Pastor, Aparecida, Santo Agostinho, São João Batista, São José, **São Pedro (Flutuante)**) |
| Santo Agostinho – Pauini | 4 pela página de comunidades + a matriz = as "05 Comunidades de base na cidade" que a própria ficha declara |
| São João Batista – Canutama | 4 (Aparecida, Santa Rita de Cássia, São Frei Galvão, São Pedro) |
| São Sebastião e São Francisco | 2 (São Sebastião do Belo Monte e São Francisco da Foz de Tapauá, nomeadas no texto da ficha) |

**O que falta é o interior.** Nenhuma paróquia publica as comunidades ribeirinhas do rio Purus, que
na Prelazia são a maioria: a ficha de Pauini diz explicitamente "05 Comunidades de base **na
cidade**", e a de Canutama registra uma "**Área Missionária KM 70**" (onde atua o Diácono Metódio
Retexin) sem nomear nada dentro dela. O número real de comunidades é muito maior que 33.

## VEREDITO — a paróquia de Canutama pendurada em Ponta Grossa

**Confirma-se, e por inteiro.** A "Paróquia São João Batista – Prelazia de Lábrea", em
**Canutama/AM**, é uma paróquia real e ativa da Prelazia de Lábrea:

- Está na lista oficial `/nossas-paroquias/` e tem ficha própria com história, pároco
  (**Pe. Fábio Sejanoski**), vigário (Pe. Moacir Gomes), e-mail `psjb.canutama@hotmail.com` e
  endereço **Rua Floriano Peixoto, 10 – Centro, Canutama/AM**.
- Tem **grade de missas publicada** na tabela oficial da Prelazia (domingo 07:30, 09:00 e 19:30;
  segunda, quarta, quinta e sexta às 19:30).

As **5 comunidades do seed antigo de 2023 também se confirmam**, com uma ressalva:

| Comunidade no seed | Confirmação |
|---|---|
| Matriz São João Batista | **Sim** — a ficha registra a inauguração da nova matriz em 04/10/1962 |
| Santa Rita de Cássia | **Sim** — ficha própria em `/comunidades/` |
| Nossa Senhora Aparecida | **Sim** — ficha própria em `/comunidades/` |
| São Pedro | **Sim** — ficha própria em `/comunidades/` |
| São Francisco de Assis | **Parcial** — NÃO está na página `/comunidades/`, mas o texto histórico da própria ficha da paróquia cita a construção de cozinha e salão "na Comunidade São Francisco de Assis" em 2011. Gravada com `confidence: media` e nota |

E a fonte oficial **acrescenta uma sexta**: **Comunidade São Frei Galvão**, que o seed não tem.

**Conclusão para o Rodrigo**: pode mover a paróquia de Ponta Grossa para a Prelazia de Lábrea sem
receio — os dados batem. Ao mover, vale acrescentar a Comunidade São Frei Galvão e a grade de
missas acima.

## Precisa de validação humana

1. **Nome da paróquia sede** — o site chama de "Paróquia Nossa Senhora de Nazaré"; o gcatholic
   registra a igreja como "Catedral Prelatícia Nossa Senhora de Nazaré" e o próprio texto da ficha
   diz "a igreja, hoje catedral". Gravei como **`Catedral Nossa Senhora de Nazaré`**.
2. **Contradição do site sobre Fr. Luís Amílcar** — a página de Missionários o registra como
   "Pároco da Paróquia **Santa Rita de Cássia – Lábrea/AM**", endereço que não existe (Santa Rita de
   Cássia é em Tapauá). A ficha da paróquia de Lábrea o dá como pároco de N. Sra. de Nazaré. Adotei
   a ficha da paróquia; é erro de cadastro do site.
3. **Pauini sem pároco declarado** — a ficha da paróquia não nomeia clero; a página de Missionários
   traz Fr. Roberto Carlos, O.A.R. como **administrador paroquial**, e não como pároco. Gravei-o em
   `priestName` com a ressalva em `notes`.
4. **Paróquia São Sebastião e São Francisco é intermunicipal e declara não ter matriz** — vai de
   Belo Monte (Canutama) à Foz de Tapauá (Tapauá). Gravei `city: "Canutama"` e marquei Belo Monte
   como matriz só para o importador ter destino. Se o Parish vier a modelar paróquia sem matriz,
   esta é o caso de teste.
5. **Horários de 2024** — as 28 grades vêm de uma página cujo `dateModified` é 22/04/2024. Vale
   confirmar com a Cúria (97) 3331-2364 antes de considerá-las firmes.
6. **CEP de Canutama** — a ficha não publica; ficou `null` (o CEP do município é 69450-000, mas não
   entrei sem fonte).
7. **Comunidades ribeirinhas** — o maior buraco. Só a secretaria da Prelazia fecha, incluindo o que
   há na "Área Missionária KM 70" de Canutama.

## Correções sugeridas para `dioceses.json` (NÃO aplicadas)

Registro atual: `address: "Praca Coronel Labre 119"`, `zipCode: "69830-000"`,
`phone: "(97) 3331-2364"`, `email: null`, `website: "https://prelaziadelabrea.com.br"`,
`bishopName: "Dom Santiago Sánchez Sebastián, O.A.R."`.

- **`email`**: hoje está `null`. A página da Secretaria Prelatícia publica
  **`prelazialabrea@hotmail.com`** (ofuscado pelo Cloudflare). Contatos adicionais da Cúria:
  `leydiane565@gmail.com` (Analista Administrativo) e `beatrizamorim2708@gmail.com`.
- **`address`**: o endereço publicado hoje pela Cúria é mais preciso —
  **"Travessa Nazaré, 119, Salas 01 e 02 – Praça Cel. Labre, Centro"**. O registro atual
  ("Praça Coronel Labre 119") bate com o da Receita e com o da paróquia catedral, que ocupa a mesma
  praça.
- **`foundedYear`**: está 1925 e confere (bula *Imperscrutabili Dei consilio*, de 01/05/1925).
- Telefone, CEP, cidade, UF e bispo conferem com o site e com a Receita.
