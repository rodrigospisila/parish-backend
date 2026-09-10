# Relatório de pesquisa — Arquidiocese de Botucatu (SP)

- **Arquivo gerado:** `paroquias/SP/botucatu.json`
- **Data da pesquisa:** 2026-09-10
- **Agente:** enxame de pesquisa do território (`PROMPT-pesquisa.md`)

## Resumo

| Métrica | Valor |
|---|---|
| Paróquias (registros) | **48** (0 alta / 48 media / 0 baixa) |
| Comunidades / capelas | **119** |
| Horários fixos | **271** (0 alta / 235 media / 36 baixa) |
| Cobertura | **48 / 48 (100 %)** — 47 paróquias + 1 santuário não paroquial |

Municípios cobertos (20, exatamente os declarados pela arquidiocese): Botucatu (13), Avaré (7),
Lençóis Paulista (6), Laranjal Paulista (3), São Manuel (3), Anhembi (2), Águas de Santa Bárbara,
Arandu, Areiópolis, Bofete, Borebi, Cerqueira César, Conchas, Iaras, Igaraçu do Tietê, Itatinga,
Macatuba, Pardinho, Pereiras e Pratânia (1 cada).

Tipos de horário: 261 `MASS`, 6 `CONFESSION`, 4 `ADORATION`.

## ⚠️ Aviso crítico: o site oficial está fora do ar

Em **10/09/2026** o domínio `arquidiocesebotucatu.org.br` responde **HTTP 403** na raiz e
**HTTP 404** em todas as páginas internas (`/paroquias/`, `/local/...`, `/robots.txt`,
`/sitemap.xml`, `/wp-json/`). Testado por WebFetch e por `curl` com User-Agent de navegador,
com e sem `www`, em HTTP e HTTPS — o resultado é o mesmo.

Pior: a **captura mais recente do Arquivo da Internet, de 23/01/2026**, mostra o domínio
**tomado por spam** (páginas de apostas em indonésio no lugar do conteúdo católico), e a página
`/atendimento` capturada em 08/10/2025 já traz a linha `hacklink satın al` injetada no rodapé.
O domínio parece comprometido ou abandonado.

**Consequência para o dataset:** toda a coleta veio de **capturas legítimas do Arquivo da
Internet entre 03/07/2025 e 13/10/2025** do próprio site oficial. Pelo critério do README
("fonte oficial **sem sinal de atualidade**"), **todas as paróquias, comunidades e horários
foram classificados como `media`** — não `alta`. Só o registro da própria arquidiocese ficou
`alta`, porque é corroborado pelo catholic-hierarchy.org.

Isso é uma decisão deliberada e conservadora: os dados entram na carga (`media` entra), mas o
enxame de validação deve tratar Botucatu como **prioridade máxima de reconferência**, de
preferência por outro canal (redes sociais das paróquias, Anuário Católico, telefone).

## Fontes principais

| Fonte | Uso |
|---|---|
| `web.archive.org/web/20250909130615/…/paroquias/` | Guia de Paróquias — lista canônica das 48 entradas, agrupadas em RP1–RP4 |
| `web.archive.org/web/2025…/…/local/<slug>` | uma página por paróquia: endereço, CEP, telefone, e-mail, site, data de criação, festa do padroeiro, pároco/vigários/diáconos e **grade de missas por capela** |
| `web.archive.org/web/20250806044315/…/territorio-arquidiocesano` | 47 paróquias em 20 municípios; composição das 4 regiões pastorais |
| `web.archive.org/web/20251013015941/…/historico` | criação em 07/06/1908 (bula *Diocesium Nimian Amplitudinem*, Pio X); elevação a arquidiocese em 19/04/1958 (bula *Sacrorum Antistitum*, Pio XII) |
| `web.archive.org/web/20251008221222/…/atendimento` | Cúria: Rua Dr. Costa Leite, 668, Centro; (14) 3811-5900; e-mails por setor |
| `web.archive.org/web/20251013031351/…/biografia` | Dom Maurício Grotto de Camargo (8º bispo e 5º arcebispo) |
| `https://www.catholic-hierarchy.org/diocese/dbotu.html` | 48 paróquias (2023); endereço e telefone da Cúria; 7 dioceses sufragâneas |

A página `/horarios-de-missas` do site **não** tem grade nenhuma — é um texto catequético sobre
a Missa. Os horários vêm todos das páginas `/local/...`.

## Cobertura

Três caminhos independentes:

- o Guia de Paróquias lista **48 entradas**;
- as páginas *Histórico* e *Território Arquidiocesano* afirmam **"47 paróquias"** em 20
  municípios;
- o catholic-hierarchy.org registra **48 paróquias** (dado de 2023).

A diferença de 1 é o **Santuário Nossa Senhora de Lourdes (Botucatu)**, convento dos Frades
Capuchinhos que a própria página descreve como estando *"no território paroquial da Catedral
Metropolitana Sant'Ana"* — **não é paróquia**. Fica no dataset apenas como registro (guardião:
Frei Ismael Martignago). **Decidir se entra na carga.**

Observação: a página *Território Arquidiocesano* está **desatualizada** — lista só 45 paróquias
nas quatro RPs, faltando a Paróquia São Joaquim e Sant'Ana (Lençóis Paulista, criada em
25/03/2017), a Paróquia Santo Expedito (Avaré, criada em 14/10/2018) e o Santuário Nossa Senhora
de Lourdes. O Guia de Paróquias é a lista mais atual e foi a usada.

## Pontos para o enxame de validação

### 1. Quinze paróquias sem nenhum horário publicado (a maior lacuna)

Nestas, a página `/local/...` **não tem a aba "Missas"** — só "Informações" (e às vezes
"História"/"Fotos"). Não é omissão da coleta:

| Paróquia | Cidade |
|---|---|
| Paróquia Santa Teresinha | Botucatu |
| Paróquia Sagrada Família | Botucatu |
| Santuário Nossa Senhora de Lourdes | Botucatu |
| Paróquia São Benedito | Avaré |
| Santuário São Judas Tadeu | Avaré |
| Santuário Santa Teresinha | Cerqueira César |
| Santuário Senhor Bom Jesus | Conchas |
| Paróquia Nossa Senhora da Piedade | Bofete |
| Paróquia Nossa Senhora dos Remédios | Anhembi |
| Paróquia Nossa Senhora das Graças (Pirambóia) | Anhembi |
| Paróquia Nossa Senhora da Conceição | Pereiras |
| Paróquia São José | Lençóis Paulista |
| Paróquia São Joaquim e Sant'Ana | Lençóis Paulista |
| Paróquia São Manuel | São Manuel |
| Paróquia Santa Cruz | Areiópolis |

Chama atenção que **quatro delas são santuários** (São Judas Tadeu, Santa Teresinha, Senhor Bom
Jesus e N. S. de Lourdes), justamente os templos com maior fluxo de romeiros.

### 2. Vinte e cinco paróquias sem capelas listadas

Metade dos registros ficou só com a matriz. Em alguns casos é real (paróquia urbana pequena),
mas em outros a fonte claramente omitiu — por exemplo, a Paróquia São Pio X publica na aba
*História* a frase *"A Paróquia de São Pio X hoje é formada por sete Comunidades"* e lista as
seis capelas, **que foram aproveitadas**, mas a aba *Missas* só traz a grade da matriz.

### 3. Trinta e seis horários `baixa` — recorrência mensal e casos por dia do mês

Todos os `baixa` são o problema de modelagem já registrado no README. Casos notáveis:

- **Paróquia Santíssimo Sacramento (Botucatu)** — as três capelas da Serra se revezam nos sábados
  às 17h ("1º Sábado: Santa Cruz da Serra; 2º e 4º: N. S. Aparecida e São José; 3º: Santo
  Antônio de Sorocaba"). No banco elas viram três missas de sábado 17h no mesmo horário.
- **Paróquia Senhor Bom Jesus e Santa Marcelina (Pratânia)** — mesmo padrão nos domingos às 10h
  com três capelas.
- **Paróquia Santa Luzia (Iaras)** — cinco capelas, quase todas mensais, três delas no
  Assentamento Zumbi dos Palmares; a Capela Sagrada Família está descrita como *"comunidade em
  processo de organização"*.

**Horários descartados por não terem dia da semana** (recorrência por dia do mês, que o modelo
não comporta):

- Paróquia Cristo Ressuscitado (Lençóis Paulista): *"Todo dia 10 de cada mês Missa às 15h"*;
- Paróquia Nossa Senhora da Boa Morte (Arandu): *"Todo dia 19: Missa de São José"* (sem hora);
- Paróquia Nossa Senhora do Rosário de Fátima (Botucatu), Capela Santo Expedito: *"Todo dia 19
  Missa Votiva às 19h30"*;
- Paróquia Santo Antônio (Rubião Júnior): *"Matriz: Dia 13 de cada mês às 19h30"*;
- Paróquia Senhor Bom Jesus e Santa Marcelina (Pratânia): *"Todo dia 06: 19h30 – Matriz (Dia
  Mensal do Padroeiro)"*.

### 4. Duas comunidades com missa suspensa desde a pandemia

A Paróquia Santo Antônio (Rubião Júnior) marca duas comunidades como *"ainda suspensa devido a
Pandemia"* — **Bairro Capão Bonito** (1º domingo às 11h) e **Bairro Chaparral** (4ª terça às
19h30). Os horários foram gravados como `baixa` com o aviso em `notes`, mas provavelmente
**não devem entrar em produção** sem confirmação: a página é de 2025 e o texto é de 2020/2021.

### 5. Pároco de outra diocese

**Paróquia Nossa Senhora da Conceição (Pereiras)** — o site informa *"Pároco: Pe. Donizette
Camilo Junior – **Diocese de Mogi das Cruzes**"*. A paróquia é de Botucatu; o presbítero é
emprestado. Gravei só o nome (sem a diocese de origem) em `priestName`.

### 6. Duas paróquias compartilham o mesmo telefone

**Paróquia Nossa Senhora das Graças (Pirambóia/Anhembi)** e **Paróquia Nossa Senhora dos
Remédios (Anhembi)** — ambas publicam **(14) 3884-1200**. Plausível (mesmo município, secretaria
compartilhada), mas convém checar.

### 7. Campos ausentes na origem

- **Sem CEP (5):** Santuário N. S. das Dores (Avaré), Paróquia Santo Expedito (Avaré), Paróquia
  Santa Bárbara (Águas de Santa Bárbara), Paróquia N. S. dos Remédios (Anhembi), Paróquia N. S.
  Consolata (São Manuel).
- **Sem telefone (2):** Paróquia Sagrada Família (Botucatu), Paróquia N. S. dos Remédios
  (Anhembi).
- **Sem e-mail (4):** Paróquia Santo Antônio (Rubião Júnior), Santuário N. S. de Lourdes
  (Botucatu), Santuário Santa Teresinha (Cerqueira César), Paróquia N. S. das Graças (Pirambóia).
- **Sem ano de criação (3):** Paróquia Santo Antônio (Rubião Júnior — a página só dá a festa do
  padroeiro e a inauguração do templo em 1932), Santuário N. S. de Lourdes (Botucatu), Paróquia
  São Pedro e São Paulo (Lençóis Paulista). Nada foi inferido.

### 8. Endereço divergente na Paróquia Sagrada Família (Botucatu)

A página traz **dois endereços** no mesmo bloco: *"Rua Carlos Bauer Filho, S/Nº – Jd. Brasil –
CEP: 18611-080"* (cabeçalho) e *"Endereço: Rua Coronel Fonseca, 108 – CEP: 18600-020"* (corpo).
Gravei o primeiro (o do cabeçalho, padrão das demais páginas). **Confirmar qual é a matriz e
qual é a secretaria.**

### 9. Detalhes menores

- Missas na **Catedral**: a grade separa "7h" (nave) de "18h30 na Capela Santíssima Trindade" de
  segunda a sexta; ambas foram gravadas, a segunda na comunidade correta.
- A Paróquia São João Batista (Laranjal Paulista) publica a grade truncada — *"domingo (Matriz):
  09h30 e 19h00 / 19h30"* — a terceira linha não tem contexto. Gravei 09h30 e 19h00 no domingo e
  **descartei o "19h30" solto**.
- A **Paróquia Nossa Senhora de Fátima (Avaré)** é a única de toda a arquidiocese que publica
  horário de confissão (6 registros `CONFESSION`).
- Grafias corrigidas silenciosamente no endereço, por erro evidente de digitação da fonte:
  "14) 3846-1958" → "(14) 3846-1958" (Areiópolis), "14) 3764-1233" → "(14) 3764-1233" (Iaras),
  "(14) 37311700" → "(14) 3731-1700" (São José/Avaré), "Cep: 18 708 670" → "18708-670".
