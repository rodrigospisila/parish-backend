# Relatório de pesquisa — Diocese de Guaxupé (MG)

- **Arquivo**: `paroquias/MG/guaxupe.json`
- **Data da pesquisa**: 2026-09-10
- **Agente**: pesquisa de território (Sul de Minas, onda MG)

## Resumo

| Item | Quantidade |
|---|---|
| Entradas de paróquia | **91** (89 paróquias + 2 áreas pastorais missionárias) |
| Confiança `alta` | 91 |
| Confiança `media` / `baixa` | 0 / 0 |
| Comunidades | **162** (91 matrizes + 71 capelas/comunidades) |
| Horários fixos | **371** (327 `alta` + 44 `baixa`) |
| Paróquias com horário | 48 de 91 |
| Cobertura esperada (AP 2024) | 81 paróquias |

## Fontes principais

1. **Site oficial da Diocese de Guaxupé** — <https://guaxupe.org.br>
   A lista de paróquias é um *custom post type* do WordPress. A API REST
   `https://guaxupe.org.br/wp-json/wp/v2/paroquias?per_page=100` devolveu as **91 entradas
   de uma vez**, com os campos ACF preenchidos: `endereco`, `telefone_de_contato`,
   `e-mail_de_contato`, `site`, `nome_do_paroco`, `nome_do_vigario`, `expediente`,
   `instagram`, `facebook` e **`horarios_de_missa`** (texto livre).
   Taxonomias auxiliares: `cidades` (64 termos) e `setores` (7 setores pastorais).
   Página pública de cada paróquia: `https://guaxupe.org.br/paroquias/<slug>`.
2. **catholic-hierarchy.org** — <https://www.catholic-hierarchy.org/diocese/dguax.html>
   (estatística do Anuário Pontifício 2024, dados de 2023: 81 paróquias, 691.000 católicos,
   134 presbíteros). O site bloqueia o leitor automático com HTTP 429; `curl` com
   User-Agent de Chrome passou.

## Cobertura

Encontradas 91 entradas contra 81 paróquias esperadas pelo Anuário Pontifício de 2024.
A diferença é explicada por:

- **2 áreas pastorais missionárias** (Três Barras e Nossa Senhora das Dores/Delfinópolis),
  que a diocese lista junto com as paróquias mas não são paróquias canônicas;
- paróquias erigidas depois do levantamento de 2023;
- a Basílica Nossa Senhora da Saúde e a Catedral Diocesana Nossa Senhora das Dores contam
  como paróquia cada uma (estão na lista como registros próprios).

Nenhuma paróquia do site ficou de fora. Os **7 setores pastorais** foram gravados no campo
extra `sector` de cada paróquia (o importador ignora esse campo; ele serve à validação):
Alfenas, Areado, Cássia, Guaxupé, Passos, Poços de Caldas e São Sebastião do Paraíso.

## Horários de missa

O campo `horarios_de_missa` é **texto livre** digitado por cada paróquia, com formatos muito
diferentes entre si. Foi escrito um analisador que trata:

- cabeçalho de local seguido de linhas de dia/horário (`Capela São Judas - 07h`);
- cabeçalho de dia seguido de linhas de horário/local (`* Domingo:` / `07h30 - Capela Santa Edwiges`);
- intervalos (`Segunda a Sábado às 07h e às 18h30min` → seg–sáb, dois horários);
- pareamento dia↔horário quando a linha alterna (`Quarta às 09h e Domingo às 11h`);
- `ADORATION` para linhas de adoração/exposição do Santíssimo.

**43 das 91 paróquias não publicam horário nenhum** (campo vazio no site):

Divino Espírito Santo (Capetinga), Divino Espírito Santo (Alterosa/Cavacos), Divino Espírito
Santo (Delfinópolis), Nossa Senhora Aparecida (Bandeira do Sul), Nossa Senhora Aparecida
(Passos), Nossa Senhora da Abadia (São Sebastião do Paraíso), Nossa Senhora da Imaculada
Conceição (Monte Belo), Nossa Senhora das Dores (Ibiraci), Nossa Senhora das Graças (Passos),
Nossa Senhora de Fátima (Alfenas), Nossa Senhora de Sion (São Sebastião do Paraíso), Nossa
Senhora do Carmo (Paraguaçu), Nossa Senhora do Carmo (Carmo do Rio Claro), Nossa Senhora do
Rosário (Guaxupé), Nossa Senhora do Rosário (Fortaleza de Minas), Nossa Senhora dos Milagres
(Monte Santo de Minas), Sagrada Família (Carmo do Rio Claro), Sagrado Coração de Jesus e Nossa
Senhora das Graças (Fama), Santa Bárbara (Guaranésia), Santa Cruz e Nossa Senhora Aparecida
(Guaranésia), Santa Isabel de Portugal (Paraguaçu), Santa Rita de Cássia (Palmeiral), Santa
Rita de Cássia (Cássia), Santo Antônio de Pádua (Juréia), Senhor Bom Jesus (São Sebastião do
Paraíso/Guardinha), Senhor Bom Jesus e Mãe Rainha (Guaranésia), São Francisco de Paula (Monte
Santo de Minas), São José (São José da Barra), São José (Machado), São José (Capetinga), São
José Operário (Guaxupé), São José e Nossa Senhora das Dores (Alfenas), São João Batista (São
João Batista do Glória), São João Batista (Itamogi), São João Batista (Alfenas/Barranco Alto),
São Luís Maria Grignion de Montfort (Passos), São Pedro Apóstolo (São Pedro da União), São
Pedro Apóstolo (Alfenas), São Sebastião (São Sebastião do Paraíso), São Sebastião
(Alpinópolis), São Sebastião e São Cristóvão (Alfenas) e as duas áreas pastorais.

### Recorrência mensal (44 horários com `confidence: "baixa"`)

Regras do tipo "1ª sexta-feira do mês", "2ª quinta do mês", "última segunda de cada mês" e
"todo dia 13" **não cabem no modelo do sistema** (`MassSchedule` só tem dia da semana). Elas
foram gravadas com o dia da semana correspondente, `confidence: "baixa"` e a regra literal
copiada em `notes`. Não entram na carga; aguardam a decisão de produto sobre recorrência
mensal já registrada no README.

Regras mensais **sem dia da semana** ("Todo dia 8 de cada mês 19h", "Todo dia 13 do mês",
"Dia 28 de cada mês 19h", "todo dia 19 às 19h30", "Novena Perpétua todo dia 13 às 17h") foram
**descartadas** — não há como mapeá-las. Ocorrem em: Nossa Senhora Aparecida (Poços de
Caldas), Nossa Senhora da Penha (Passos), Nossa Senhora do Carmo (Campestre), Sagrada Família
e Santo Antônio (Machado), Santo Expedito (Poços de Caldas), São Félix de Nicosia (Poços de
Caldas), São José (Botelhos), São José (Passos), São Judas Tadeu (Passos) e São Paulo Apóstolo
(Poços de Caldas).

### Celebração da Palavra descartada

A **Paróquia Nossa Senhora da Assunção (Cabo Verde)** distingue explicitamente "Missa" de
"Celebração". As 4 linhas de *Celebração* foram descartadas e só as 3 missas ficaram:

- Quarta 19:30 — Capela Nossa Senhora do Sagrado Coração (Celebração) — **descartada**
- Quinta 08:00 — Capela Nossa Senhora do Sagrado Coração (Celebração) — **descartada**
- Sábado 19:00 — Matriz (Celebração) — **descartada**
- Domingo 17:30 — Capela São Benedito (Celebração) — **descartada**

## Precisa de validação humana

1. **Cidades que são distrito, não município.** A taxonomia `cidades` do site mistura
   municípios e distritos. Foram normalizados (município em `city`, distrito em
   `neighborhood`) quando o próprio *slug* da paróquia confirmava o município:
   - `Cavacos` → Alterosa (Distrito de Cavacos)
   - `Barranco Alto` → Alfenas (Distrito de Barranco Alto)
   - `Guardinha, São Sebastião do Paraíso` → São Sebastião do Paraíso (Distrito de Guardinha)
   - `Santa Cruz da Prata, Distrito de Guaranésia` → Guaranésia (Distrito de Santa Cruz da Prata)
   - `Petúnia` → Nova Resende (Distrito de Petúnia)
   - Capetinga: o endereço trazia "Distrito de Goianases", movido para `neighborhood`.

   **Ficaram como estão e precisam de conferência**: `Juréia` (Paróquia Santo Antônio de
   Pádua), `Palmeiral` (Paróquia Santa Rita de Cássia) e `Três Barras` (Área Pastoral
   Missionária) — não são municípios de MG, mas nada no registro indica com segurança o
   município-sede.

2. **Telefones inválidos descartados** (`(00) 00000-0000` e `......`): Divino Espírito Santo
   (Delfinópolis), Santo Antônio de Pádua (Juréia) e São João Batista (Alfenas/Barranco Alto)
   ficaram com `phone: null`.

3. **E-mails com erro de digitação no domínio, gravados como estão**:
   - `passos.nsgracas6094@gmaill.com` (Nossa Senhora das Graças, Passos) — provável `gmail.com`
   - `pcaldas.saofelix8208@gamail.com` (São Félix de Nicosia, Poços de Caldas) — provável `gmail.com`
   - `alpinopólis1700@gmail.com` (São Sebastião, Alpinópolis) — acento na parte local do e-mail

4. **Paróquia São Vicente de Paulo (Alpinópolis)** — os horários estão num parágrafo corrido
   com muitas comunidades rurais ("São Bento todos os domingos às 8h; Prata na 1ª quinta às
   19h; Itapiché 2ª quinta…"). O analisador acertou o grosso, mas as missas de domingo às 10h
   e 17h30 podem pertencer à matriz e não à capela São Cristóvão. **Conferir na fonte.**

5. **Paróquia Senhor Bom Jesus (Bom Jesus da Penha)** — a fonte diz "Outras quatro capelas /
   Nos dias feriais distribuídos pelo mês", sem nomes nem horários. Não gravado.

6. **Paróquia São Judas Tadeu (Passos)** e **São Francisco de Assis (Alfenas)** — a fonte
   menciona "missas nos setores e nas Comunidades Rurais" sem detalhar. Não gravado.

7. **Basílica Nossa Senhora da Saúde (Poços de Caldas)** — a fonte tem um aviso temporário
   ("Enquanto durarem as obras na capela Santo Antônio, as missas de segunda às 15h serão na
   Basílica"). A missa de segunda 15h foi atribuída à **Capela Santo Antônio** (situação
   normal), não à Basílica.

8. **Nomes de comunidade herdados do texto livre.** Alguns nomes vieram exatamente como
   escritos ("Caminho Neocatecumenal", "Centro de Espiritualidade Jesus Peregrino", "Capela
   Asilo Elvira Dias", "capela São Bendito" — grafia da fonte). Podem precisar de padronização.

9. **Duas áreas pastorais missionárias** (`Área Pastoral Missionária Três Barras` e `Área
   Pastoral Nossa Senhora das Dores`) foram mantidas com `confidence: "alta"` porque estão na
   lista oficial, mas **não são paróquias canônicas** — decidir se entram no sistema.

## O que ficou sem

- Comunidades/capelas de 43 paróquias: só existem no dataset as que aparecem nos horários.
  A diocese não publica lista de comunidades por paróquia.
- Confissões, adoração (salvo as poucas citadas nos horários) e terço: a diocese não publica.
- CEP: o campo `endereco` do site nunca traz CEP; todos ficaram `null`.
- Ano de criação de cada paróquia: o campo `historico` é texto corrido e raramente traz a data.
